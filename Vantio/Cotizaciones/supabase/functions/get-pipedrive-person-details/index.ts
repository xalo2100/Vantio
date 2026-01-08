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
        const { entityId, personId, organizationId, type = 'person' } = await req.json()
        const id = entityId || personId

        if (!id || !organizationId) {
            throw new Error('Missing required fields: entityId/personId, organizationId')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // 1. Get Pipedrive credentials
        let apiToken = null
        let companyDomain = null

        const { data: crmConfig } = await supabaseAdmin
            .from('crm_configurations')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('crm_type', 'pipedrive')
            .single()

        if (crmConfig) {
            apiToken = crmConfig.credentials?.api_token || crmConfig.credentials?.apiToken
            companyDomain = crmConfig.credentials?.company_domain || crmConfig.credentials?.companyDomain
        }

        if (!apiToken || !companyDomain) {
            const { data: orgSettings } = await supabaseAdmin
                .from('organization_settings')
                .select('pipedrive_api_token, pipedrive_company_domain')
                .eq('organization_id', organizationId)
                .single()

            if (orgSettings) {
                apiToken = apiToken || orgSettings.pipedrive_api_token
                companyDomain = companyDomain || orgSettings.pipedrive_company_domain
            }
        }

        if (!apiToken || !companyDomain) {
            throw new Error('Pipedrive not configured')
        }

        const baseUrl = `https://${companyDomain}.pipedrive.com/api/v1`

        let person = null
        let organization = null
        const personFieldsRes = await fetch(`${baseUrl}/personFields?api_token=${apiToken}`)
        const personFieldsData = await personFieldsRes.json()
        const personFields = personFieldsData.data || []

        const orgFieldsRes = await fetch(`${baseUrl}/organizationFields?api_token=${apiToken}`)
        const orgFieldsData = await orgFieldsRes.json()
        const orgFields = orgFieldsData.data || []

        if (type === 'organization' || type === 'company') {
            // Fetch Organization first
            const orgRes = await fetch(`${baseUrl}/organizations/${id}?api_token=${apiToken}`)
            const orgData = await orgRes.json()
            if (!orgData.success) throw new Error('Failed to fetch organization from Pipedrive')
            organization = orgData.data

            // Try to fetch related persons to find a contact
            const personsRes = await fetch(`${baseUrl}/organizations/${id}/persons?limit=1&api_token=${apiToken}`)
            const personsData = await personsRes.json()
            if (personsData.success && personsData.data && personsData.data.length > 0) {
                // Fetch full details for the first person found
                const fullPersonRes = await fetch(`${baseUrl}/persons/${personsData.data[0].id}?api_token=${apiToken}`)
                const fullPersonData = await fullPersonRes.json()
                if (fullPersonData.success) {
                    person = fullPersonData.data
                }
            }
        } else {
            // Original Person logic
            const personRes = await fetch(`${baseUrl}/persons/${id}?api_token=${apiToken}`)
            const personData = await personRes.json()
            if (!personData.success) throw new Error('Failed to fetch person from Pipedrive')
            person = personData.data

            let pipedriveOrgId = null
            if (person.org_id) {
                pipedriveOrgId = typeof person.org_id === 'object' ? person.org_id.value : person.org_id
            }

            if (pipedriveOrgId) {
                const orgRes = await fetch(`${baseUrl}/organizations/${pipedriveOrgId}?api_token=${apiToken}`)
                const orgData = await orgRes.json()
                if (orgData.success) {
                    organization = orgData.data
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                person: person,
                organization: organization,
                personFields: personFields,
                organizationFields: orgFields
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
