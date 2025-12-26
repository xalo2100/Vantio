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
        const { logId, entityId } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get the log entry to understand what failed
        const { data: logEntry } = await supabaseAdmin
            .from('pipedrive_sync_log')
            .select('*')
            .eq('id', logId)
            .single()

        if (!logEntry) throw new Error('Log entry not found')

        // Logic to retry based on entity_type and action
        // For now, we'll implement a simple retry for 'deal' creation which is the most common
        if (logEntry.entity_type === 'deal' && logEntry.action === 'create') {
            // We need to re-trigger the sync logic. 
            // Ideally, we would refactor the sync logic into a shared function or call the sync-quote function again.
            // For this implementation, we will call the pipedrive-sync-quote function internally or simulate it.
            // Calling the other function via fetch is the cleanest way to reuse logic.

            // We need to fetch the quote to get the seller email again if needed, or store it in metadata.
            // Assuming we can get the quote and seller info.
            const { data: quote } = await supabaseAdmin
                .from('quotes')
                .select('*, seller:profiles(email)')
                .eq('id', entityId)
                .single()

            if (!quote) throw new Error("Quote not found for retry")

            const syncResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/pipedrive-sync-quote`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, // Use service key for internal call
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quoteId: entityId,
                    sellerEmail: quote.seller?.email
                })
            })

            const syncResult = await syncResponse.json()

            if (!syncResponse.ok) {
                throw new Error(syncResult.error || 'Retry failed')
            }

            // Update log status
            await supabaseAdmin
                .from('pipedrive_sync_log')
                .update({ status: 'success', error_message: null, updated_at: new Date() })
                .eq('id', logId)

            return new Response(
                JSON.stringify({ success: true, message: 'Retry successful' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        throw new Error('Retry logic not implemented for this entity type/action')

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
