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
        const { searchTerm, organizationId, limit = 10 } = await req.json()

        if (!searchTerm || !organizationId) {
            throw new Error('Missing required fields: searchTerm, organizationId')
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
                JSON.stringify({ success: false, clients: [], message: 'Pipedrive sync is disabled' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        if (!settings?.pipedrive_api_token) {
            throw new Error('Pipedrive not configured')
        }

        const apiToken = settings.pipedrive_api_token
        const baseUrl = `https://${settings.pipedrive_company_domain}.pipedrive.com/api/v1`

        // Search for persons in Pipedrive
        // The search endpoint searches across name, email, phone, and organization
        const searchUrl = `${baseUrl}/persons/search?term=${encodeURIComponent(searchTerm)}&fields=name,email,phone,org_name&limit=${limit}&api_token=${apiToken}`

        const response = await fetch(searchUrl)
        const data = await response.json()

        if (!data.success) {
            throw new Error('Failed to search Pipedrive')
        }

        // Format results
        const clients = (data.data?.items || []).map((item: any) => {
            const person = item.item
            return {
                id: person.id,
                name: person.name,
                email: person.emails?.[0]?.value || '',
                phone: person.phones?.[0]?.value || '',
                company: person.org_name || '',
                pipedriveId: person.id,
                ownerId: person.owner_id
            }
        })

        return new Response(
            JSON.stringify({
                success: true,
                clients: clients,
                count: clients.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message, clients: [] }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
