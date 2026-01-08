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
        const { organizationId, limit = 100 } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get Pipedrive Settings
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('pipedrive_api_token, pipedrive_company_domain')
            .eq('organization_id', organizationId)
            .single()

        if (!settings?.pipedrive_api_token) throw new Error('Pipedrive not configured')

        const apiToken = settings.pipedrive_api_token
        const companyDomain = settings.pipedrive_company_domain
        const baseUrl = `https://${companyDomain}.pipedrive.com/api/v1`

        // Fetch Persons from Pipedrive
        const response = await fetch(`${baseUrl}/persons?limit=${limit}&api_token=${apiToken}`)
        const data = await response.json()

        if (!data.success) throw new Error('Failed to fetch from Pipedrive')

        const contacts = data.data.map((person: any) => ({
            name: person.name,
            email: person.email?.[0]?.value || '',
            phone: person.phone?.[0]?.value || '',
            pipedriveId: person.id,
            organization_name: person.org_name
        }))

        return new Response(
            JSON.stringify({ contacts, count: contacts.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
