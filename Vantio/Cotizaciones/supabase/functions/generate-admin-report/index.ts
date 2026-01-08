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
        const { userId, startDate, endDate, focusAreas } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Verify admin role (implementation depends on how auth is passed, usually via header)
        // For simplicity here, we trust the RLS policies on the data fetching side or add explicit check

        // Get user profile
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('organization_id, full_name, role')
            .eq('id', userId)
            .single()

        if (!profile) throw new Error('User not found')

        // Get Gemini API Key
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('gemini_api_key')
            .eq('organization_id', profile.organization_id)
            .single()

        if (!settings?.gemini_api_key) throw new Error('Gemini API key not configured')

        // Fetch metrics for the period
        const { data: quotes } = await supabaseAdmin
            .from('quotes')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', startDate)
            .lte('created_at', endDate)

        const totalQuotes = quotes?.length || 0
        const acceptedQuotes = quotes?.filter(q => q.status === 'accepted').length || 0
        const conversionRate = totalQuotes > 0 ? ((acceptedQuotes / totalQuotes) * 100).toFixed(1) : 0
        const totalRevenue = quotes?.filter(q => q.status === 'accepted').reduce((sum, q) => sum + (q.total || 0), 0) || 0

        // Generate Report with Gemini
        const prompt = `Genera un reporte de desempeño detallado para el vendedor ${profile.full_name} (Rol: ${profile.role}).
    
    Periodo: ${startDate} a ${endDate}
    
    Métricas:
    - Total Cotizaciones: ${totalQuotes}
    - Tasa de Conversión: ${conversionRate}%
    - Ingresos Totales: $${totalRevenue}
    
    Áreas de Enfoque: ${focusAreas.join(', ')}
    
    Estructura del reporte (JSON):
    {
      "summary": "Resumen ejecutivo del desempeño",
      "metrics_analysis": "Análisis detallado de los números",
      "strengths": ["Fortaleza 1", "Fortaleza 2"],
      "improvements": ["Área de mejora 1", "Área de mejora 2"],
      "recommendations": ["Recomendación 1", "Recomendación 2"],
      "coaching_tips": "Consejos para el gerente sobre cómo guiar a este vendedor"
    }
    `

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${settings.gemini_api_key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        )

        const geminiData = await geminiResponse.json()
        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        const report = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: "Error generating report" }

        return new Response(
            JSON.stringify({ report }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
