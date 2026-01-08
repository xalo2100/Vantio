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
        const { quoteId, clientName, clientEmail, companyName, clientPhone, clientRut, clientCity, clientAddress, sellerEmail, organizationId } = await req.json()

        if (!clientEmail || !organizationId) {
            throw new Error('Missing required fields: clientEmail, organizationId')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // 1. Get Pipedrive credentials (try new crm_configurations first, then fallback to organization_settings)
        let apiToken = null
        let companyDomain = null
        let syncEnabled = false

        // Try new multi-CRM table
        const { data: crmConfig } = await supabaseAdmin
            .from('crm_configurations')
            .select('*')
            .eq('organization_id', organizationId)
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
                .eq('organization_id', organizationId)
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

        // Step 1: Find seller in Pipedrive by email
        let ownerId = null
        if (sellerEmail) {
            try {
                const userSearch = await fetch(
                    `${baseUrl}/users/find?term=${encodeURIComponent(sellerEmail)}&api_token=${apiToken}`
                )
                const userData = await userSearch.json()

                if (userData.success && userData.data && userData.data.length > 0) {
                    const exactMatch = userData.data.find((u: any) =>
                        u.email?.toLowerCase() === sellerEmail.toLowerCase()
                    )
                    ownerId = exactMatch?.id || userData.data[0]?.id
                }
            } catch (error) {
                console.error('Error searching for seller:', error)
            }
        }

        // Step 2: Search or Create Organization
        let orgId = null
        if (companyName) {
            const orgSearch = await fetch(
                `${baseUrl}/organizations/search?term=${encodeURIComponent(companyName)}&api_token=${apiToken}`
            )
            const orgData = await orgSearch.json()

            if (orgData.success && orgData.data?.items && orgData.data.items.length > 0) {
                orgId = orgData.data.items[0].item.id
                console.log(`Found existing organization: ${companyName} -> id: ${orgId}`)
            } else {
                // Create Organization
                const createOrg = await fetch(
                    `${baseUrl}/organizations?api_token=${apiToken}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: companyName,
                            owner_id: ownerId,
                            address: clientAddress || clientCity || ''
                        })
                    }
                )
                const orgResult = await createOrg.json()
                if (orgResult.success) {
                    orgId = orgResult.data.id
                    console.log(`Created new organization: ${companyName} -> id: ${orgId}`)
                }
            }
        }

        // Step 3: Search or Create Person
        const personSearch = await fetch(
            `${baseUrl}/persons/search?term=${encodeURIComponent(clientEmail)}&fields=email&api_token=${apiToken}`
        )
        const personData = await personSearch.json()

        let person = null
        if (personData.success && personData.data?.items && personData.data.items.length > 0) {
            person = personData.data.items.find((item: any) => {
                const emails = item.item.emails || []
                return emails.some((e: any) => e.value?.toLowerCase() === clientEmail.toLowerCase())
            })?.item
        }

        let personId = null
        let action = 'none'

        // Step 2.5: Find Custom Field Keys for Person
        let rutFieldKey = null
        try {
            const fieldsRes = await fetch(`${baseUrl}/personFields?api_token=${apiToken}`)
            const fieldsData = await fieldsRes.json()
            if (fieldsData.success) {
                const rutField = fieldsData.data.find((f: any) =>
                    f.name.toLowerCase() === 'rut' ||
                    f.name.toLowerCase().includes('tax id') ||
                    f.name.toLowerCase().includes('identificación')
                )
                if (rutField) {
                    rutFieldKey = rutField.key
                    console.log(`🔑 Found custom RUT field key: ${rutFieldKey}`)
                }
            }
        } catch (error) {
            console.error('Error fetching person fields:', error)
        }

        if (person) {
            personId = person.id
            action = 'found'

            // Update person if owner or org changed
            const updatePayload: any = {}
            if (ownerId && person.owner_id !== ownerId) updatePayload.owner_id = ownerId
            if (orgId && person.org_id !== orgId) updatePayload.org_id = orgId
            if (clientPhone && (!person.phone || person.phone.length === 0)) {
                updatePayload.phone = [{ value: clientPhone, primary: true, label: 'work' }]
            }
            if (clientRut && rutFieldKey) {
                updatePayload[rutFieldKey] = clientRut
            }

            if (Object.keys(updatePayload).length > 0) {
                await fetch(
                    `${baseUrl}/persons/${personId}?api_token=${apiToken}`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatePayload)
                    }
                )
                action = 'updated'
            }
        } else {
            const createPersonData: any = {
                name: clientName || clientEmail.split('@')[0],
                email: [{ value: clientEmail, primary: true, label: 'work' }],
                org_id: orgId,
                owner_id: ownerId
            }
            if (clientPhone) {
                createPersonData.phone = [{ value: clientPhone, primary: true, label: 'work' }]
            }
            if (clientRut && rutFieldKey) {
                createPersonData[rutFieldKey] = clientRut
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

            if (personResult.success) {
                personId = personResult.data.id
                action = 'created'
            }
        }

        // Step 4: Update quote if quoteId is provided and NOT 'NEW_CLIENT'
        if (quoteId && quoteId !== 'NEW_CLIENT') {
            await supabaseAdmin
                .from('quotes')
                .update({ pipedrive_person_id: personId })
                .eq('id', quoteId)
        }

        // Step 5: Log sync
        await supabaseAdmin
            .from('pipedrive_sync_log')
            .insert([{
                organization_id: organizationId,
                entity_type: 'person',
                entity_id: quoteId === 'NEW_CLIENT' ? 'CLIENT_CREATION' : quoteId,
                pipedrive_id: personId,
                action: action,
                status: 'success',
                metadata: {
                    client_email: clientEmail,
                    company_name: companyName,
                    org_id: orgId,
                    owner_id: ownerId
                }
            }])

        return new Response(
            JSON.stringify({
                success: true,
                personId: personId,
                orgId: orgId,
                action: action,
                message: `Sync completed: ${action}`
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
