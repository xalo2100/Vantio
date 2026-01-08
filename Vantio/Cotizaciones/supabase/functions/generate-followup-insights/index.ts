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
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get all organizations with followup enabled
        const { data: orgs } = await supabaseAdmin
            .from('organization_settings')
            .select('organization_id, followup_days_threshold, followup_dashboard_notifications')
            .eq('followup_dashboard_notifications', true)

        if (!orgs || orgs.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No organizations with followup enabled' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        let totalInsights = 0

        for (const org of orgs) {
            // Get clients needing followup for this organization
            const { data: clients } = await supabaseAdmin
                .from('clients')
                .select(`
                    id,
                    name,
                    email,
                    company,
                    assigned_to,
                    last_contact_date,
                    last_purchase_date,
                    total_purchases,
                    purchase_count
                `)
                .eq('organization_id', org.organization_id)
                .eq('status', 'needs_followup')

            if (!clients || clients.length === 0) continue

            // Group clients by assigned user
            const clientsByUser = new Map<string, typeof clients>()

            for (const client of clients) {
                if (!client.assigned_to) continue

                if (!clientsByUser.has(client.assigned_to)) {
                    clientsByUser.set(client.assigned_to, [])
                }
                clientsByUser.get(client.assigned_to)!.push(client)
            }

            // Create insights for each user
            for (const [userId, userClients] of clientsByUser) {
                // Check if insight already exists for today
                const today = new Date().toISOString().split('T')[0]
                const { data: existingInsight } = await supabaseAdmin
                    .from('insights')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('type', 'alert')
                    .gte('created_at', today)
                    .like('title', '%Seguimiento de Clientes%')
                    .single()

                if (existingInsight) {
                    // Update existing insight
                    await supabaseAdmin
                        .from('insights')
                        .update({
                            message: generateInsightMessage(userClients, org.followup_days_threshold),
                            metrics: generateMetrics(userClients),
                            actions: generateActions(userClients),
                            is_read: false,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingInsight.id)
                } else {
                    // Create new insight
                    await supabaseAdmin
                        .from('insights')
                        .insert({
                            organization_id: org.organization_id,
                            user_id: userId,
                            type: 'alert',
                            title: `🔔 Seguimiento de Clientes Pendiente`,
                            message: generateInsightMessage(userClients, org.followup_days_threshold),
                            metrics: generateMetrics(userClients),
                            actions: generateActions(userClients),
                            expected_impact: 'Mejorar la retención y fidelización de clientes',
                            priority: userClients.length > 5 ? 'high' : 'medium',
                            generated_by: 'ai',
                            is_read: false
                        })

                    totalInsights++
                }

                // Get purchase history for each client
                for (const client of userClients.slice(0, 10)) { // Limit to top 10
                    const { data: purchases } = await supabaseAdmin
                        .from('client_purchases')
                        .select('product_name, amount, currency, purchase_date')
                        .eq('client_id', client.id)
                        .order('purchase_date', { ascending: false })
                        .limit(5)

                    // Store purchase history in client metadata (could be used in UI)
                    client['purchase_history'] = purchases || []
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                insights_created: totalInsights,
                message: `Generated ${totalInsights} followup insights`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )

    } catch (error) {
        console.error('Error generating insights:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})

function generateInsightMessage(clients: any[], thresholdDays: number): string {
    const count = clients.length
    const clientNames = clients.slice(0, 3).map(c => c.name).join(', ')
    const others = count > 3 ? ` y ${count - 3} más` : ''

    const daysSinceContact = clients.map(c => {
        if (!c.last_contact_date) return 999
        const diff = Date.now() - new Date(c.last_contact_date).getTime()
        return Math.floor(diff / (1000 * 60 * 60 * 24))
    })

    const maxDays = Math.max(...daysSinceContact)

    return `Tienes ${count} cliente${count > 1 ? 's' : ''} sin contacto en más de ${thresholdDays} días.

**Clientes prioritarios:** ${clientNames}${others}

El cliente con más tiempo sin contacto lleva **${maxDays} días**. Es importante retomar la comunicación para mantener la relación comercial y explorar nuevas oportunidades.

**Recomendaciones:**
• Revisar el historial de compras de cada cliente
• Preparar una propuesta de valor personalizada
• Agendar llamadas o reuniones en los próximos días
• Enviar un email de seguimiento con novedades de productos`
}

function generateMetrics(clients: any[]): any {
    const totalValue = clients.reduce((sum, c) => sum + (Number(c.total_purchases) || 0), 0)
    const avgPurchases = totalValue / clients.length

    return {
        total_clients: clients.length,
        total_value: totalValue,
        avg_purchase_value: avgPurchases,
        clients_with_purchases: clients.filter(c => c.purchase_count > 0).length,
        clients_never_contacted: clients.filter(c => !c.last_contact_date).length
    }
}

function generateActions(clients: any[]): any[] {
    return clients.slice(0, 5).map(client => {
        const daysSinceContact = client.last_contact_date
            ? Math.floor((Date.now() - new Date(client.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
            : 999

        return {
            client_id: client.id,
            client_name: client.name,
            company: client.company,
            email: client.email,
            days_since_contact: daysSinceContact,
            total_purchases: client.total_purchases,
            purchase_count: client.purchase_count,
            last_purchase_date: client.last_purchase_date,
            suggested_action: daysSinceContact > 60 ? 'Llamada urgente' : 'Email de seguimiento',
            priority: daysSinceContact > 60 ? 'high' : 'medium'
        }
    })
}
