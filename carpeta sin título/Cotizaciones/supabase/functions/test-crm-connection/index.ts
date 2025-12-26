import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAdapter } from '../_shared/crm-adapters.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { crmType, credentials } = await req.json()

        if (!crmType || !credentials) {
            throw new Error('Missing required fields: crmType, credentials')
        }

        const adapter = getAdapter(crmType)
        const isConnected = await adapter.testConnection(credentials)

        return new Response(
            JSON.stringify({
                success: isConnected,
                message: isConnected
                    ? `Successfully connected to ${crmType}`
                    : `Failed to connect to ${crmType}`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        console.error('Connection test error:', error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
