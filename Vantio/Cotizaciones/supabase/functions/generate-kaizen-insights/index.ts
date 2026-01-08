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
        const { userId, period } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get user's organization
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('organization_id, full_name, email')
            .eq('id', userId)
            .single()

        if (!profile) {
            throw new Error('User profile not found')
        }

        // Get Gemini API key and check quota
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('gemini_api_key, gemini_daily_requests, gemini_last_reset, gemini_model_preference')
            .eq('organization_id', profile.organization_id)
            .single()

        if (!settings?.gemini_api_key) {
            throw new Error('Gemini API key not configured')
        }

        // Check and reset daily quota if needed
        const lastReset = new Date(settings.gemini_last_reset || 0)
        const now = new Date()
        const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60)

        let currentRequests = settings.gemini_daily_requests || 0

        if (hoursSinceReset >= 24) {
            // Reset counter
            await supabaseAdmin
                .from('organization_settings')
                .update({ gemini_daily_requests: 0, gemini_last_reset: now.toISOString() })
                .eq('organization_id', profile.organization_id)
            currentRequests = 0
        }

        // Count active users in the organization
        const { count: activeUsersCount } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id)
            .eq('is_active', true)

        const totalActiveUsers = activeUsersCount || 1 // Minimum 1 user
        const DAILY_QUOTA_TOTAL = 1400 // Safety margin (real limit is 1500)
        const quotaPerUser = Math.floor(DAILY_QUOTA_TOTAL / totalActiveUsers)

        console.log(`Active users: ${totalActiveUsers}, Quota per user: ${quotaPerUser}, Total used today: ${currentRequests}/${DAILY_QUOTA_TOTAL}`)

        // Check if organization has exceeded total quota
        if (currentRequests >= DAILY_QUOTA_TOTAL) {
            throw new Error(`Daily Gemini API quota exceeded for organization (${DAILY_QUOTA_TOTAL}/${DAILY_QUOTA_TOTAL}). Resets in ${24 - Math.floor(hoursSinceReset)} hours.`)
        }

        // Get user's individual usage today
        const { data: userInsights } = await supabaseAdmin
            .from('insights')
            .select('id')
            .eq('user_id', userId)
            .eq('generated_by', 'ai')
            .gte('created_at', lastReset.toISOString())

        const userRequestsToday = userInsights?.length || 0

        // Check if user has exceeded their personal quota
        if (userRequestsToday >= quotaPerUser) {
            throw new Error(`Your daily Gemini quota exceeded (${userRequestsToday}/${quotaPerUser}). With ${totalActiveUsers} active users, each gets ${quotaPerUser} requests/day. Resets in ${24 - Math.floor(hoursSinceReset)} hours.`)
        }

        console.log(`User ${profile.email} has used ${userRequestsToday}/${quotaPerUser} requests today`)

        // Calculate seller metrics
        const endDate = new Date()
        const startDate = new Date()
        if (period === 'weekly') {
            startDate.setDate(startDate.getDate() - 7)
        } else {
            startDate.setMonth(startDate.getMonth() - 1)
        }

        // Fetch quotes for period
        const { data: quotes } = await supabaseAdmin
            .from('quotes')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())

        // Calculate metrics
        const totalQuotes = quotes?.length || 0
        const acceptedQuotes = quotes?.filter(q => q.status === 'accepted').length || 0
        const conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes * 100).toFixed(1) : 0
        const totalRevenue = quotes?.filter(q => q.status === 'accepted')
            .reduce((sum, q) => sum + (q.total || 0), 0) || 0
        const avgTicket = acceptedQuotes > 0 ? totalRevenue / acceptedQuotes : 0

        // Get team benchmarks
        const { data: teamQuotes } = await supabaseAdmin
            .from('quotes')
            .select('user_id, status, total')
            .eq('organization_id', profile.organization_id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())

        const teamConversion = teamQuotes && teamQuotes.length > 0
            ? (teamQuotes.filter(q => q.status === 'accepted').length / teamQuotes.length * 100).toFixed(1)
            : 0

        // Call Gemini API
        const prompt = `Analiza el rendimiento ${period === 'weekly' ? 'semanal' : 'mensual'} del vendedor ${profile.full_name}:

MÉTRICAS:
- Cotizaciones enviadas: ${totalQuotes}
- Tasa de conversión: ${conversionRate}%
- Ingresos generados: $${totalRevenue.toFixed(2)}
- Ticket promedio: $${avgTicket.toFixed(2)}

CONTEXTO:
- Promedio del equipo: ${teamConversion}% conversión

INSTRUCCIONES:
Genera 2-3 insights Kaizen específicos y accionables.
Usa un tono motivador y constructivo.
Incluye métricas concretas y acciones específicas.
Enfócate en mejora continua (Kaizen).

Responde SOLO en formato JSON válido:
{
  "insights": [
    {
      "type": "improvement|recognition|alert|pattern|benchmark",
      "title": "Título corto y directo",
      "message": "Mensaje detallado con contexto",
      "actions": ["Acción específica 1", "Acción específica 2"],
      "expectedImpact": "Descripción del impacto esperado",
      "priority": "high|medium|low"
    }
  ]
}`

        // 3. Call AI using Hybrid Architecture
        // We can import the logic or use the local ai-gateway pattern
        const { callGemini, callOpenRouter } = await import('../_shared/ai-providers.ts')

        const preferredProvider = settings.ai_task_routing?.insights || 'gemini'
        let aiResult

        try {
            if (preferredProvider === 'gemini') {
                aiResult = await callGemini(prompt, settings.gemini_api_key, settings.gemini_model_preference)
            } else {
                const model = preferredProvider === 'xiaomi' ? 'xiaomi/mimo-v2-flash:free' : 'google/gemini-2.0-flash-lite-preview-02-05:free'
                aiResult = await callOpenRouter(prompt, settings.openrouter_api_key, model)
            }
        } catch (aiErr) {
            console.error('Initial AI provider failed, trying fallback...', aiErr)
            // Hard fallback to Gemini since we know we have it
            aiResult = await callGemini(prompt, settings.gemini_api_key, 'gemini-2.0-flash')
        }

        const responseText = aiResult.text || '{}'

        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        const parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: [] }

        // Create insights in database
        const insightsToCreate = parsedResponse.insights.map((insight: any) => ({
            organization_id: profile.organization_id,
            user_id: userId,
            type: insight.type,
            title: insight.title,
            message: insight.message,
            actions: insight.actions || [],
            expected_impact: insight.expectedImpact,
            priority: insight.priority,
            generated_by: 'ai',
            period_start: startDate.toISOString().split('T')[0],
            period_end: endDate.toISOString().split('T')[0]
        }))

        const { data: createdInsights, error: insertError } = await supabaseAdmin
            .from('insights')
            .insert(insightsToCreate)
            .select()

        if (insertError) {
            console.error('Error inserting insights:', insertError)
        }

        return new Response(
            JSON.stringify({
                insights: createdInsights || [],
                metrics: { totalQuotes, conversionRate, totalRevenue, avgTicket }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
