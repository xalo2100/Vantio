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
        const { quoteId, clientName, clientEmail, companyName, clientPhone, companyPhone, clientRut, clientCity, clientRegion, clientAddress, sellerEmail, organizationId } = await req.json()

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
                .select('*') // Select all to avoid column name errors if missing
                .eq('organization_id', organizationId)
                .single()

            if (orgSettings) {
                apiToken = apiToken || orgSettings.pipedrive_api_token || orgSettings.pipedrive_api_key

                // Extract domain from domain field or URL field
                let domain = orgSettings.pipedrive_company_domain
                if (!domain && orgSettings.pipedrive_url) {
                    const match = orgSettings.pipedrive_url.match(/https?:\/\/([^.]+)\.pipedrive\.com/)
                    domain = match ? match[1] : null
                }
                companyDomain = companyDomain || domain
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

        // --- Helper Function for Field Mapping ---
        const getFieldMap = async (endpoint: string) => {
            const fieldMap: any = {}
            const patterns = {
                rut: ['rut', 'rut empresa', 'tax id', 'id fiscal'],
                comuna: ['comuna', 'ciudad', 'city', 'localidad', 'municipio', 'distrito'],
                region: ['región', 'region', 'estado', 'provincia', 'sector', 'departamento'],
                email: ['email', 'correo', 'e-mail', 'mail'],
                phone: ['telefono', 'teléfono', 'phone', 'celular', 'móvil', 'movil', 'tel', 'whatsapp'],
                address: ['dirección', 'direccion', 'address', 'postal address', 'dirección postal']
            }

            try {
                const res = await fetch(`${baseUrl}/${endpoint}?api_token=${apiToken}`)
                const data = await res.json()
                if (data.success && data.data) {
                    data.data.forEach((f: any) => {
                        const name = f.name.toLowerCase().trim()
                        for (const [key, searchTerms] of Object.entries(patterns)) {
                            // PRIORIDAD 1: Coincidencia EXACTA (para evitar falsos positivos)
                            if (searchTerms.some(term => name === term)) {
                                fieldMap[key] = f.key
                                break
                            }
                        }
                    })

                    // PRIORIDAD 2: Coincidencia PARCIAL (solo si no hubo exacta)
                    data.data.forEach((f: any) => {
                        const name = f.name.toLowerCase().trim()
                        for (const [key, searchTerms] of Object.entries(patterns)) {
                            if (!fieldMap[key] && searchTerms.some(term => name.includes(term))) {
                                fieldMap[key] = f.key
                            }
                        }
                    })
                }
            } catch (error) {
                console.error(`Error fetching ${endpoint}:`, error)
            }
            return fieldMap
        }

        // 2. Fetch Field Maps
        const orgFieldsMap = await getFieldMap('organizationFields')
        const personFieldsMap = await getFieldMap('personFields')

        console.log('🔑 Org fields map:', orgFieldsMap)
        console.log('🔑 Person fields map:', personFieldsMap)

        // Step 1: Find seller in Pipedrive
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
                    )
                    if (seller) ownerId = seller.id
                }
            } catch (e) { console.error('Error fetching users:', e) }
        }

        // Step 2: Search or Create Organization
        let orgId = null
        const orgPayload: any = {
            owner_id: ownerId,
            address: clientAddress || ''
        }
        if (clientRut && orgFieldsMap.rut) orgPayload[orgFieldsMap.rut] = clientRut
        if (clientCity && orgFieldsMap.comuna) orgPayload[orgFieldsMap.comuna] = clientCity
        if (clientRegion && orgFieldsMap.region) orgPayload[orgFieldsMap.region] = clientRegion
        if (clientEmail && orgFieldsMap.email) orgPayload[orgFieldsMap.email] = clientEmail
        if (companyPhone && orgFieldsMap.phone) orgPayload[orgFieldsMap.phone] = companyPhone

        if (companyName && companyName.trim()) {
            console.log(`🔍 Searching for organization: "${companyName.trim()}"`)
            const orgSearch = await fetch(`${baseUrl}/organizations/search?term=${encodeURIComponent(companyName.trim())}&api_token=${apiToken}`)
            const orgData = await orgSearch.json()

            if (orgData.success && orgData.data?.items?.length > 0) {
                orgId = orgData.data.items[0].item.id
                console.log(`✅ Found existing organization: ${orgId}`)
                orgPayload.name = companyName.trim()
                const updateRes = await fetch(`${baseUrl}/organizations/${orgId}?api_token=${apiToken}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orgPayload)
                })
                const updateData = await updateRes.json()
                if (updateData.success && updateData.data?.id) {
                    orgId = updateData.data.id
                }
                console.log(`📝 Organization update result:`, updateData.success ? 'Success' : 'Failed')
            } else {
                console.log(`➕ Creating new organization: "${companyName.trim()}"`)
                orgPayload.name = companyName.trim()
                const createRes = await fetch(`${baseUrl}/organizations?api_token=${apiToken}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orgPayload)
                })
                const resData = await createRes.json()
                if (resData.success) {
                    orgId = resData.data.id
                    console.log(`✅ Organization created: ${orgId}`)
                } else {
                    console.error(`❌ Organization creation failed:`, resData)
                }
            }
        } else {
            console.log('⚠️ No companyName provided, skipping Organization sync.')
        }

        // Step 3: Search or Create Person
        console.log(`🔍 Searching for person: "${clientEmail}"`)
        const personSearch = await fetch(`${baseUrl}/persons/search?term=${encodeURIComponent(clientEmail)}&fields=email&api_token=${apiToken}`)
        const personSearchData = await personSearch.json()
        let person = null
        if (personSearchData.success && personSearchData.data?.items?.length > 0) {
            person = personSearchData.data.items[0].item
        }

        const personPayload: any = {
            name: clientName || clientEmail.split('@')[0],
            org_id: orgId,
            owner_id: ownerId,
            email: [{ value: clientEmail, primary: true, label: 'work' }],
            phone: clientPhone ? [{ value: clientPhone, primary: true, label: 'work' }] : undefined
        }
        console.log(`📝 Person Payload with org_id ${orgId}:`, personPayload)

        // Map custom fields for Person too
        if (clientRut && personFieldsMap.rut) personPayload[personFieldsMap.rut] = clientRut
        if (clientCity && personFieldsMap.comuna) personPayload[personFieldsMap.comuna] = clientCity
        if (clientRegion && personFieldsMap.region) personPayload[personFieldsMap.region] = clientRegion
        if (clientAddress && personFieldsMap.address) personPayload[personFieldsMap.address] = clientAddress

        let personId = null
        let action = 'none'

        if (person) {
            personId = person.id
            await fetch(`${baseUrl}/persons/${personId}?api_token=${apiToken}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personPayload)
            })
            action = 'updated'
        } else {
            const createRes = await fetch(`${baseUrl}/persons?api_token=${apiToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(personPayload)
            })
            const resData = await createRes.json()
            if (resData.success) {
                personId = resData.data.id
                action = 'created'
            }
        }

        // Step 4: Final update and log
        if (quoteId && quoteId !== 'NEW_CLIENT') {
            await supabaseAdmin.from('quotes').update({ pipedrive_person_id: personId }).eq('id', quoteId)
        }

        await supabaseAdmin.from('pipedrive_sync_log').insert([{
            organization_id: organizationId,
            entity_type: 'person',
            entity_id: quoteId === 'NEW_CLIENT' ? 'CLIENT_CREATION' : quoteId,
            pipedrive_id: personId,
            action: action,
            status: 'success',
            metadata: {
                client_email: clientEmail,
                company_name: companyName,
                org_payload: orgPayload,
                person_payload: personPayload
            }
        }])

        return new Response(JSON.stringify({
            success: true,
            personId,
            orgId,
            action,
            message: `Sync ${action}`,
            debug: {
                orgPayload,
                personPayload
            }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (error: any) {
        console.error('Error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
