import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAdapter } from '../_shared/crm-adapters.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
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
        const { searchTerm, organizationId, limit = 10 } = await req.json()

        if (!searchTerm || !organizationId) {
            throw new Error('Missing required fields: searchTerm, organizationId')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get all enabled CRM configurations for this organization
        const { data: crmConfigs, error: configError } = await supabaseAdmin
            .from('crm_configurations')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_enabled', true)

        if (configError) {
            throw configError
        }

        // --- INTERNAL SEARCH ---
        // Always search local clients even if use_internal_crm is disabled in settings,
        // because the user might have created them manually in the app.
        const { data: localClients, error: localError } = await supabaseAdmin
            .from('clients')
            .select('*')
            .eq('organization_id', organizationId)
            .or(`name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,rut.ilike.%${searchTerm}%`)
            .limit(limit)

        let internalResults = []
        if (!localError && localClients) {
            internalResults = localClients.map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                company: c.company,
                source: 'interno',
                // Map local fields to consistent CRM format
                rut: c.rut,
                city: c.city,
                address: c.address,
                notes: c.internal_notes
            }))
        }

        if ((!crmConfigs || crmConfigs.length === 0) && internalResults.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    clients: [],
                    message: 'No CRMs configured or enabled and no internal clients found'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        // Search across all enabled CRMs
        const searchPromises = crmConfigs.map(async (config) => {
            try {
                const adapter = getAdapter(config.crm_type)
                const results = await adapter.searchClients(
                    searchTerm,
                    config.credentials,
                    limit
                )
                return results
            } catch (error) {
                console.error(`Error searching ${config.crm_type}:`, error)
                return []
            }
        })

        const allResultsRaw = await Promise.all(searchPromises)

        // Flatten external results and combine with internal
        const clients = [
            ...internalResults,
            ...allResultsRaw.flat()
        ]

        // Simple deduplication by email (if available)
        const uniqueClients = clients.reduce((acc, client) => {
            const key = client.email || `${client.name}-${client.source}`
            if (!acc.has(key)) {
                acc.set(key, client)
            }
            return acc
        }, new Map())

        const finalClients = Array.from(uniqueClients.values())

        return new Response(
            JSON.stringify({
                success: true,
                clients: finalClients,
                count: finalClients.length,
                sources: [
                    'interno',
                    ...crmConfigs.map(c => c.crm_type)
                ]
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
