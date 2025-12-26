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

    try {
        const { quoteId, clientName, clientEmail, sellerEmail, organizationId } = await req.json()

        if (!quoteId || !clientEmail || !organizationId) {
            throw new Error('Missing required fields: quoteId, clientEmail, organizationId')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get Pipedrive credentials
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('pipedrive_api_token, pipedrive_company_domain, pipedrive_sync_enabled')
            .eq('organization_id', organizationId)
            .single()

        if (!settings?.pipedrive_sync_enabled) {
            return new Response(
                JSON.stringify({ success: false, message: 'Pipedrive sync is disabled' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        if (!settings?.pipedrive_api_token) {
            throw new Error('Pipedrive not configured')
        }

        const apiToken = settings.pipedrive_api_token
        const baseUrl = `https://${settings.pipedrive_company_domain}.pipedrive.com/api/v1`

        // Step 1: Find seller in Pipedrive by email
        let ownerId = null
        if (sellerEmail) {
            try {
                const userSearch = await fetch(
                    `${baseUrl}/users/find?term=${encodeURIComponent(sellerEmail)}&api_token=${apiToken}`
                )
                const userData = await userSearch.json()

                if (userData.success && userData.data && userData.data.length > 0) {
                    // Find exact email match
                    const exactMatch = userData.data.find((u: any) =>
                        u.email?.toLowerCase() === sellerEmail.toLowerCase()
                    )
                    ownerId = exactMatch?.id || userData.data[0]?.id
                    console.log(`Found seller in Pipedrive: ${sellerEmail} -> user_id: ${ownerId}`)
                } else {
                    console.warn(`Seller not found in Pipedrive: ${sellerEmail}`)
                }
            } catch (error) {
                console.error('Error searching for seller:', error)
            }
        }

        // Step 2: Search for existing person by email
        const personSearch = await fetch(
            `${baseUrl}/persons/search?term=${encodeURIComponent(clientEmail)}&fields=email&api_token=${apiToken}`
        )
        const personData = await personSearch.json()

        let person = null
        if (personData.success && personData.data?.items && personData.data.items.length > 0) {
            // Find exact email match
            person = personData.data.items.find((item: any) => {
                const emails = item.item.emails || []
                return emails.some((e: any) => e.value?.toLowerCase() === clientEmail.toLowerCase())
            })?.item
        }

        let personId = null
        let action = 'none'

        if (person) {
            // Person exists - update owner if needed
            personId = person.id
            action = 'found'

            if (ownerId && person.owner_id !== ownerId) {
                // Update owner
                const updateResponse = await fetch(
                    `${baseUrl}/persons/${personId}?api_token=${apiToken}`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            owner_id: ownerId
                        })
                    }
                )
                const updateResult = await updateResponse.json()

                if (updateResult.success) {
                    action = 'updated_owner'
                    console.log(`Updated owner for person ${personId} to ${ownerId}`)
                }
            }
        } else {
            // Person doesn't exist - create new
            const createPersonData: any = {
                name: clientName || clientEmail.split('@')[0],
                email: [{ value: clientEmail, primary: true, label: 'work' }]
            }

            if (ownerId) {
                createPersonData.owner_id = ownerId
            }

            const createPerson = await fetch(
                `${baseUrl}/persons?api_token=${apiToken}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(createPersonData)
                }
            )
            const personResult = await createPerson.json()

            if (!personResult.success) {
                throw new Error(`Failed to create person in Pipedrive: ${personResult.error}`)
            }

            person = personResult.data
            personId = person.id
            action = 'created'
            console.log(`Created new person in Pipedrive: ${clientEmail} -> person_id: ${personId}`)
        }

        // Step 3: Update quote with Pipedrive person ID
        await supabaseAdmin
            .from('quotes')
            .update({ pipedrive_person_id: personId })
            .eq('id', quoteId)

        // Step 4: Log sync
        await supabaseAdmin
            .from('pipedrive_sync_log')
            .insert([{
                organization_id: organizationId,
                entity_type: 'person',
                entity_id: quoteId,
                pipedrive_id: personId,
                action: action,
                status: 'success',
                metadata: {
                    client_email: clientEmail,
                    seller_email: sellerEmail,
                    owner_id: ownerId
                }
            }])

        return new Response(
            JSON.stringify({
                success: true,
                personId: personId,
                action: action,
                ownerId: ownerId,
                message: `Client ${action === 'created' ? 'created' : action === 'updated_owner' ? 'updated' : 'found'} in Pipedrive`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
