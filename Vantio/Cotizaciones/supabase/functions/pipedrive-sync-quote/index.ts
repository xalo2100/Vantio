import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    let quoteIdForLog: string | null = null;
    try {
        const { quoteId, sellerEmail } = await req.json()
        quoteIdForLog = quoteId;

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get quote
        const { data: quote } = await supabaseAdmin
            .from('quotes')
            .select('*, organization:organizations(*)')
            .eq('id', quoteId)
            .single()

        if (!quote) {
            throw new Error('Quote not found')
        }

        // Get Pipedrive credentials
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('pipedrive_api_token, pipedrive_company_domain')
            .eq('organization_id', quote.organization_id)
            .single()

        if (!settings?.pipedrive_api_token) {
            throw new Error('Pipedrive not configured')
        }

        const apiToken = settings.pipedrive_api_token
        const baseUrl = `https://${settings.pipedrive_company_domain}.pipedrive.com/api/v1`

        // Get Pipedrive user ID for seller
        let ownerId = null
        if (sellerEmail) {
            const userSearch = await fetch(
                `${baseUrl}/users/find?term=${sellerEmail}&api_token=${apiToken}`
            )
            const userData = await userSearch.json()
            ownerId = userData.data?.[0]?.id
        }

        // Search for existing person
        const personSearch = await fetch(
            `${baseUrl}/persons/search?term=${quote.client_email}&fields=email&api_token=${apiToken}`
        )
        const personData = await personSearch.json()
        let person = personData.data?.items?.[0]?.item

        // Create person if doesn't exist
        if (!person) {
            const createPerson = await fetch(
                `${baseUrl}/persons?api_token=${apiToken}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: quote.client_name,
                        email: [{ value: quote.client_email, primary: true }],
                        owner_id: ownerId
                    })
                }
            )
            const personResult = await createPerson.json()
            person = personResult.data

            // Log sync
            await supabaseAdmin
                .from('pipedrive_sync_log')
                .insert([{
                    organization_id: quote.organization_id,
                    entity_type: 'person',
                    entity_id: quoteId,
                    pipedrive_id: person.id,
                    action: 'create',
                    status: 'success'
                }])
        }

        // Create deal
        const createDeal = await fetch(
            `${baseUrl}/deals?api_token=${apiToken}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `${quote.project_name} - ${quote.client_name}`,
                    value: quote.total,
                    currency: 'CLP',
                    person_id: person.id,
                    user_id: ownerId
                })
            }
        )
        const dealResult = await createDeal.json()
        const deal = dealResult.data

        // 3. Create Note with historical snapshot (as requested by user)
        // This avoids overwriting master contact data while keeping a record of what was sent
        try {
            const noteContent = `
                <b>Cotización Enviada</b><br>
                <b>Contacto:</b> ${quote.client_name}<br>
                <b>Email:</b> ${quote.client_email}<br>
                <b>Monto:</b> ${formatCurrency(quote.total, quote.currency)}<br>
                <b>Proyecto:</b> ${quote.project_name || 'N/A'}<br>
                <br>
                <i>Nota: Se usaron estos datos específicos para esta cotización, independientemente de los datos en la ficha principal.</i>
            `.trim();

            await fetch(
                `${baseUrl}/notes?api_token=${apiToken}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: noteContent,
                        deal_id: deal.id,
                        person_id: person.id
                    })
                }
            );
        } catch (noteError) {
            console.error('Failed to create historical note:', noteError);
        }

        // Helper function for note formatting
        function formatCurrency(amount: number, currency = 'CLP') {
            return new Intl.NumberFormat('es-CL', {
                style: 'currency',
                currency: currency,
                maximumFractionDigits: 0
            }).format(amount);
        }

        // Update quote with Pipedrive IDs
        await supabaseAdmin
            .from('quotes')
            .update({
                pipedrive_person_id: person.id,
                pipedrive_deal_id: deal.id
            })
            .eq('id', quoteId)

        // Log deal sync
        await supabaseAdmin
            .from('pipedrive_sync_log')
            .insert([{
                organization_id: quote.organization_id,
                entity_type: 'deal',
                entity_id: quoteId,
                pipedrive_id: deal.id,
                action: 'create',
                status: 'success'
            }])

        return new Response(
            JSON.stringify({
                personId: person.id,
                dealId: deal.id,
                message: 'Quote synced successfully to Pipedrive'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        console.error('Sync error:', error)

        // Log failed sync
        try {
            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            )
            // quoteId is already available from the top of the function
            const { data: quote } = await supabaseAdmin
                .from('quotes')
                .select('organization_id')
                .eq('id', quoteIdForLog)
                .single()

            if (quote) {
                await supabaseAdmin
                    .from('pipedrive_sync_log')
                    .insert([{
                        organization_id: quote.organization_id,
                        entity_type: 'deal',
                        entity_id: quoteIdForLog,
                        action: 'create',
                        status: 'failed',
                        error_message: (error as any).message
                    }])
            }
        } catch (logError) {
            console.error('Failed to log error:', logError)
        }

        return new Response(
            JSON.stringify({ error: (error as any).message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
