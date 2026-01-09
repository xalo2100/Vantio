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

        // Get Pipedrive credentials (try new crm_configurations first, then fallback to organization_settings)
        let apiToken = null
        let companyDomain = null
        let syncEnabled = false

        // Try new multi-CRM table
        const { data: crmConfig } = await supabaseAdmin
            .from('crm_configurations')
            .select('*')
            .eq('organization_id', quote.organization_id)
            .eq('crm_type', 'pipedrive')
            .single()

        if (crmConfig) {
            apiToken = crmConfig.credentials?.api_token || crmConfig.credentials?.apiToken
            companyDomain = crmConfig.credentials?.company_domain || crmConfig.credentials?.companyDomain
            syncEnabled = crmConfig.is_enabled
        }

        // Fallback to legacy organization_settings if not found or incomplete
        if (!apiToken || !companyDomain) {
            const { data: orgSettings } = await supabaseAdmin
                .from('organization_settings')
                .select('pipedrive_api_token, pipedrive_company_domain, pipedrive_sync_enabled')
                .eq('organization_id', quote.organization_id)
                .single()

            if (orgSettings) {
                apiToken = apiToken || orgSettings.pipedrive_api_token
                companyDomain = companyDomain || orgSettings.pipedrive_company_domain
                syncEnabled = syncEnabled || orgSettings.pipedrive_sync_enabled
            }
        }

        if (!syncEnabled) {
            return new Response(
                JSON.stringify({ success: false, message: 'Pipedrive sync is disabled' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        if (!apiToken || !companyDomain) {
            throw new Error('Pipedrive not configured')
        }

        const baseUrl = `https://${companyDomain}.pipedrive.com/api/v1`

        // Get Pipedrive user ID for seller (Robust: fetch all and filter)
        let ownerId = null
        if (sellerEmail) {
            try {
                const usersRes = await fetch(`${baseUrl}/users?api_token=${apiToken}`)
                const usersData = await usersRes.json()

                if (usersData.success && usersData.data) {
                    const cleanEmail = sellerEmail.toLowerCase().trim()
                    const seller = usersData.data.find((u: any) =>
                        u.email?.toLowerCase().trim() === cleanEmail ||
                        u.email?.toLowerCase().trim().split('@')[0] === cleanEmail.split('@')[0]
                    ) || usersData.data.find((u: any) =>
                        u.name?.toLowerCase().includes(cleanEmail.split('@')[0])
                    )

                    if (seller) {
                        ownerId = seller.id
                        console.log(`👤 Found Pipedrive owner: ${seller.name} (ID: ${ownerId}) for email ${sellerEmail}`)
                    } else {
                        console.log(`⚠️ Seller email ${sellerEmail} not found in Pipedrive users list.`)
                    }
                }
            } catch (error) {
                console.error('❌ Error fetching Pipedrive users:', error)
            }
        }

        // Step 1.5: Search or Create Organization
        let orgId = null
        if (quote.company_name) {
            const orgSearch = await fetch(
                `${baseUrl}/organizations/search?term=${encodeURIComponent(quote.company_name)}&api_token=${apiToken}`
            )
            const orgData = await orgSearch.json()

            if (orgData.success && orgData.data?.items && orgData.data.items.length > 0) {
                orgId = orgData.data.items[0].item.id
                console.log(`🏢 Found existing organization: ${quote.company_name} (ID: ${orgId})`)
            } else {
                console.log(`➕ Creating new organization: ${quote.company_name}`)
                const createOrg = await fetch(
                    `${baseUrl}/organizations?api_token=${apiToken}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: quote.company_name,
                            owner_id: ownerId
                        })
                    }
                )
                const orgResult = await createOrg.json()
                if (orgResult.success) {
                    orgId = orgResult.data.id
                }
            }
        }

        // Search for existing person
        const personSearch = await fetch(
            `${baseUrl}/persons/search?term=${encodeURIComponent(quote.client_email)}&fields=email&api_token=${apiToken}`
        )
        const personData = await personSearch.json()
        let person = null
        if (personData.success && personData.data?.items && personData.data.items.length > 0) {
            // Find exact email match among search results
            person = personData.data.items.find((item: any) => {
                const emails = item.item.emails || []
                return emails.some((e: any) => e.value?.toLowerCase() === quote.client_email?.toLowerCase())
            })?.item
        }

        // Create or Update person
        if (!person) {
            console.log(`➕ Creating new Pipedrive person for ${quote.client_email}`)
            const createPerson = await fetch(
                `${baseUrl}/persons?api_token=${apiToken}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: quote.client_name || quote.client_email?.split('@')[0] || 'Cliente Sin Nombre',
                        email: [{ value: quote.client_email, primary: true, label: 'work' }],
                        owner_id: ownerId,
                        org_id: orgId
                    })
                }
            )
            const personResult = await createPerson.json()
            if (!personResult.success) {
                throw new Error(`Failed to create person: ${JSON.stringify(personResult.error)}`)
            }
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
        } else {
            console.log(`✅ Found person: ${person.id}. Updating owner and org if needed.`)
            // Update owner_id and org_id if they are currently different
            const personUpdate: any = {}
            if (ownerId && person.owner_id !== ownerId) personUpdate.owner_id = ownerId
            // In Pipedrive search results, org_id might be different object structure
            if (orgId && (!person.org_id || (typeof person.org_id === 'object' ? person.org_id.value !== orgId : person.org_id !== orgId))) {
                personUpdate.org_id = orgId
            }

            if (Object.keys(personUpdate).length > 0) {
                console.log(`🔄 Updating person ${person.id} with:`, personUpdate)
                await fetch(
                    `${baseUrl}/persons/${person.id}?api_token=${apiToken}`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(personUpdate)
                    }
                )
            }
        }

        // Create deal
        const displayName = quote.company_name || quote.client_name || 'Cliente';
        const projectSuffix = quote.project_name ? ` - ${quote.project_name}` : '';

        console.log(`💰 Creating Pipedrive deal for ${quoteId} (Owner: ${ownerId})`)
        const createDeal = await fetch(
            `${baseUrl}/deals?api_token=${apiToken}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `${displayName}${projectSuffix}`,
                    value: quote.total,
                    currency: quote.currency || 'CLP',
                    person_id: person.id,
                    org_id: orgId,
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
