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
        const { organizationId } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get Pipedrive credentials (encrypted)
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('pipedrive_api_token, pipedrive_company_domain')
            .eq('organization_id', organizationId)
            .single()

        if (!settings?.pipedrive_api_token || !settings?.pipedrive_company_domain) {
            throw new Error('Pipedrive not configured')
        }

        // Test connection
        const response = await fetch(
            `https://${settings.pipedrive_company_domain}.pipedrive.com/api/v1/users/me?api_token=${settings.pipedrive_api_token}`
        )

        if (!response.ok) {
            throw new Error('Failed to connect to Pipedrive')
        }

        const data = await response.json()

        return new Response(
            JSON.stringify({
                connected: true,
                user: {
                    name: data.data?.name,
                    email: data.data?.email,
                    id: data.data?.id
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ connected: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
