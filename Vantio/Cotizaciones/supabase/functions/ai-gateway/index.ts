import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callGemini, callOpenRouter, callZai, callQwen } from '../_shared/ai-providers.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { prompt, taskType, provider: requestedProvider, orgId } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Fetch AI settings for the organization
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('*')
            .eq('organization_id', orgId)
            .single()

        if (!settings) throw new Error('Settings not found for organization')

        // Determine provider (Router logic)
        let provider = requestedProvider
        if (!provider || provider === 'auto') {
            provider = settings.ai_task_routing?.[taskType] || settings.ai_provider_priority?.[0] || 'gemini'
        }

        let result
        if (provider === 'gemini') {
            if (!settings.gemini_api_key) throw new Error('Gemini API key not configured')
            // Using gemini-1.5-flash as preference, fallback logic in callGemini will handle 404s
            result = await callGemini(prompt, settings.gemini_api_key, 'gemini-1.5-flash')
        }
        else if (provider === 'xiaomi' || provider === 'openrouter') {
            if (!settings.openrouter_api_key) throw new Error('OpenRouter API key not configured')
            const model = provider === 'xiaomi' ? 'xiaomi/mimo-v2-flash:free' : 'google/gemini-2.0-flash-lite-preview-02-05:free'
            result = await callOpenRouter(prompt, settings.openrouter_api_key, model)
        }
        else if (provider === 'qwen') {
            if (!settings.qwen_api_key) throw new Error('Qwen API key not configured')
            result = await callQwen(prompt, settings.qwen_api_key)
        }
        else if (provider === 'zai') {
            if (!settings.zai_api_key) throw new Error('Z.ai API key not configured')
            result = await callZai(prompt, settings.zai_api_key)
        }
        else {
            throw new Error(`Unsupported provider: ${provider}`)
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('AI Gateway Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
