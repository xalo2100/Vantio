import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PipedriveActivity {
    id: number
    add_time: string
    type: string
}

interface PipedriveDeal {
    id: number
    title: string
    value: number
    currency: string
    status: string
    won_time: string
    person_id: number
    products_count: number
}

interface PipedrivePerson {
    id: number
    name: string
    email: Array<{ value: string }>
    phone: Array<{ value: string }>
    org_name: string
    owner_id: number
    last_activity_date: string
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                ...corsHeaders,
                'Access-Control-Max-Age': '86400',
            }
        })
    }

    try {
        // Safe JSON parsing
        let body = {}
        try {
            body = await req.json()
        } catch (e) {
            console.error('Error parsing JSON body:', e)
        }

        const { organizationId } = body
        if (!organizationId) {
            return new Response(
                JSON.stringify({ error: 'Falta organizationId en la solicitud' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Syncing organization: ${organizationId}`)

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get Pipedrive Settings from Multi-CRM or Organization Settings
        let apiToken = null
        let companyDomain = null
        let followupIncludeQuotes = false

        // 1. Try new Multi-CRM table
        const { data: crmConfig } = await supabaseAdmin
            .from('crm_configurations')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('crm_type', 'pipedrive')
            .eq('is_enabled', true)
            .single()

        if (crmConfig?.credentials) {
            apiToken = crmConfig.credentials.api_token
            companyDomain = crmConfig.credentials.company_domain
            followupIncludeQuotes = crmConfig.settings?.followup_include_quotes || false
        }

        // 2. Fallback to legacy Organization Settings if needed
        if (!apiToken) {
            const { data: settings } = await supabaseAdmin
                .from('organization_settings')
                .select('pipedrive_api_token, pipedrive_company_domain, followup_include_quotes')
                .eq('organization_id', organizationId)
                .single()

            if (settings?.pipedrive_api_token) {
                apiToken = settings.pipedrive_api_token
                companyDomain = settings.pipedrive_company_domain
                followupIncludeQuotes = settings.followup_include_quotes || false
            }
        }

        if (!apiToken) {
            return new Response(
                JSON.stringify({ error: 'Pipedrive no está configurado o activado. Verifica el API Token en Ajustes > CRM.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const baseUrl = `https://${companyDomain || 'api'}.pipedrive.com/api/v1`

        // Get organization users to map Pipedrive owners to our users
        const { data: orgUsers } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('organization_id', organizationId)

        const userEmailMap = new Map(orgUsers?.map(u => [u.email, u.id]) || [])

        // Fetch Persons from Pipedrive
        const personsResponse = await fetch(`${baseUrl}/persons?limit=500&api_token=${apiToken}`)
        const personsData = await personsResponse.json()

        if (!personsData.success) {
            throw new Error('Failed to fetch persons from Pipedrive')
        }

        let syncedCount = 0
        let updatedCount = 0

        // Process each person
        for (const person of personsData.data || []) {
            const personData: PipedrivePerson = person

            // Get person's deals
            const dealsResponse = await fetch(
                `${baseUrl}/persons/${personData.id}/deals?status=won&api_token=${apiToken}`
            )
            const dealsData = await dealsResponse.json()
            const wonDeals = dealsData.data || []

            // Calculate totals
            const totalPurchases = wonDeals.reduce((sum: number, deal: PipedriveDeal) => sum + deal.value, 0)
            const purchaseCount = wonDeals.length
            const lastPurchaseDate = wonDeals.length > 0
                ? wonDeals.sort((a: PipedriveDeal, b: PipedriveDeal) =>
                    new Date(b.won_time).getTime() - new Date(a.won_time).getTime()
                )[0].won_time
                : null

            // Get last activity date
            const activitiesResponse = await fetch(
                `${baseUrl}/persons/${personData.id}/activities?limit=1&api_token=${apiToken}`
            )
            const activitiesData = await activitiesResponse.json()
            const lastActivity = activitiesData.data?.[0]
            const lastContactDate = lastActivity?.add_time || personData.last_activity_date

            // Get Pipedrive user and map to our user
            const pipedriveOwnerId = personData.owner_id
            let assignedTo = null

            if (pipedriveOwnerId) {
                const userResponse = await fetch(`${baseUrl}/users/${pipedriveOwnerId}?api_token=${apiToken}`)
                const userData = await userResponse.json()
                if (userData.success && userData.data?.email) {
                    assignedTo = userEmailMap.get(userData.data.email) || null
                }
            }

            // Upsert client
            const { data: client, error: clientError } = await supabaseAdmin
                .from('clients')
                .upsert({
                    organization_id: organizationId,
                    pipedrive_person_id: personData.id,
                    name: personData.name,
                    email: personData.email?.[0]?.value || null,
                    phone: personData.phone?.[0]?.value || null,
                    company: personData.org_name || null,
                    assigned_to: assignedTo,
                    last_contact_date: lastContactDate,
                    last_purchase_date: lastPurchaseDate,
                    total_purchases: totalPurchases,
                    purchase_count: purchaseCount,
                    status: 'active' // Will be updated by the status function
                }, {
                    onConflict: 'pipedrive_person_id',
                    ignoreDuplicates: false
                })
                .select()
                .single()

            if (clientError) {
                console.error('Error upserting client:', clientError)
                continue
            }

            syncedCount++

            // Sync purchases from won deals
            for (const deal of wonDeals) {
                const dealData: PipedriveDeal = deal

                // Get deal products
                const productsResponse = await fetch(
                    `${baseUrl}/deals/${dealData.id}/products?api_token=${apiToken}`
                )
                const productsData = await productsResponse.json()

                if (productsData.success && productsData.data) {
                    for (const product of productsData.data) {
                        await supabaseAdmin
                            .from('client_purchases')
                            .upsert({
                                client_id: client.id,
                                organization_id: organizationId,
                                pipedrive_deal_id: dealData.id,
                                product_name: product.name,
                                amount: product.sum,
                                currency: dealData.currency,
                                purchase_date: dealData.won_time,
                                status: 'completed'
                            }, {
                                onConflict: 'pipedrive_deal_id,product_name',
                                ignoreDuplicates: true
                            })
                    }
                } else {
                    // If no products, create a generic purchase entry
                    await supabaseAdmin
                        .from('client_purchases')
                        .upsert({
                            client_id: client.id,
                            organization_id: organizationId,
                            pipedrive_deal_id: dealData.id,
                            product_name: dealData.title,
                            amount: dealData.value,
                            currency: dealData.currency,
                            purchase_date: dealData.won_time,
                            status: 'completed'
                        }, {
                            onConflict: 'pipedrive_deal_id',
                            ignoreDuplicates: true
                        })
                }
            }
        }

        // If configured, also sync from AlfaQuote quotes
        if (followupIncludeQuotes) {
            const { data: quotes } = await supabaseAdmin
                .from('quotes')
                .select('id, client_name, client_email, user_id, total, created_at, status')
                .eq('organization_id', organizationId)
                .eq('status', 'accepted')

            for (const quote of quotes || []) {
                // Find or create client from quote
                const { data: existingClient } = await supabaseAdmin
                    .from('clients')
                    .select('id')
                    .eq('organization_id', organizationId)
                    .eq('email', quote.client_email)
                    .single()

                let clientId = existingClient?.id

                if (!clientId) {
                    const { data: newClient } = await supabaseAdmin
                        .from('clients')
                        .insert({
                            organization_id: organizationId,
                            name: quote.client_name,
                            email: quote.client_email,
                            assigned_to: quote.user_id,
                            last_contact_date: quote.created_at,
                            last_purchase_date: quote.created_at,
                            total_purchases: quote.total,
                            purchase_count: 1,
                            status: 'active'
                        })
                        .select()
                        .single()

                    clientId = newClient?.id
                }

                if (clientId) {
                    // Create purchase record from quote
                    await supabaseAdmin
                        .from('client_purchases')
                        .upsert({
                            client_id: clientId,
                            organization_id: organizationId,
                            quote_id: quote.id,
                            product_name: 'Cotización AlfaQuote',
                            amount: quote.total,
                            currency: 'CLP',
                            purchase_date: quote.created_at,
                            status: 'completed'
                        }, {
                            onConflict: 'quote_id',
                            ignoreDuplicates: true
                        })

                    // Update client totals
                    const { data: purchases } = await supabaseAdmin
                        .from('client_purchases')
                        .select('amount')
                        .eq('client_id', clientId)

                    const total = purchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

                    await supabaseAdmin
                        .from('clients')
                        .update({
                            total_purchases: total,
                            purchase_count: purchases?.length || 0
                        })
                        .eq('id', clientId)
                }
            }
        }

        // Update client statuses based on followup threshold
        await supabaseAdmin.rpc('update_client_followup_status')

        // Update last sync time
        await supabaseAdmin
            .from('organization_settings')
            .update({ followup_last_sync: new Date().toISOString() })
            .eq('organization_id', organizationId)

        return new Response(
            JSON.stringify({
                success: true,
                synced: syncedCount,
                message: `Synced ${syncedCount} clients from Pipedrive`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )

    } catch (error) {
        console.error('Sync error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
