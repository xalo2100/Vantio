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
        const { email, inviteLink, organizationName, organizationId, invitedByName } = await req.json()

        if (!email || !inviteLink || !organizationId) {
            throw new Error('Missing required fields')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get Resend API Key from organization_settings
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('resend_api_key')
            .eq('organization_id', organizationId)
            .single()

        const resendKey = settings?.resend_api_key || Deno.env.get('RESEND_API_KEY')

        if (!resendKey) {
            console.error('RESEND_API_KEY not found')
            throw new Error('Email service not configured. Please add Resend API Key in Settings.')
        }

        const subject = `Invitación para unirte a ${organizationName || 'el equipo'}`

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
                from: `${organizationName || 'Alfapack'} <onboarding@resend.dev>`,
                to: [email],
                subject: subject,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
                        <h2 style="color: #111827; margin-bottom: 24px;">¡Hola!</h2>
                        <p style="color: #374151; line-height: 1.6; font-size: 16px;">
                            <strong>${invitedByName || 'Un administrador'}</strong> te ha invitado a unirte al equipo de <strong>${organizationName || 'su organización'}</strong> en la plataforma de Cotizaciones.
                        </p>
                        <div style="margin: 32px 0; text-align: center;">
                            <a href="${inviteLink}" style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                Aceptar Invitación
                            </a>
                        </div>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
                            Si no esperabas esta invitación, puedes ignorar este correo sin problemas.
                        </p>
                        <p style="color: #6b7280; font-size: 14px;">
                            Este enlace expirará en 7 días por seguridad.
                        </p>
                        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;">
                        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                            Enviado por Alfapack para ${organizationName || 'nuestros clientes'}
                        </p>
                    </div>
                `,
            }),
        })

        const result = await res.json()

        if (!res.ok) {
            throw new Error(`Resend Error: ${JSON.stringify(result)}`)
        }

        return new Response(JSON.stringify({ success: true, result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        console.error('Error sending invitation:', error)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
