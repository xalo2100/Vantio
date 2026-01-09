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
        const { email, inviteLink, organizationName, organizationId, invitedByName, invitedByEmail, resendApiKey, resendFromEmail } = await req.json()

        if (!email || !inviteLink || !organizationId) {
            throw new Error('Missing required fields')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get Resend API Key and From Email from organization_settings
        let apiToken = resendApiKey?.trim()
        let fromEmail = resendFromEmail?.trim()

        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('resend_api_key, resend_from_email')
            .eq('organization_id', organizationId)
            .single()

        console.log(`[DEBUG] Request check - apiToken from body: ${apiToken ? 'PRESENT' : 'EMPTY'}, fromEmail from body: ${fromEmail}`)

        if (!apiToken || apiToken === '********') {
            apiToken = settings?.resend_api_key?.trim()
            console.log(`[DEBUG] API Key source: Database`)
        } else {
            console.log(`[DEBUG] API Key source: Request Body`)
        }

        if (!fromEmail || fromEmail === 'onboarding@resend.dev') {
            fromEmail = settings?.resend_from_email || 'onboarding@resend.dev'
            console.log(`[DEBUG] fromEmail source: Database/Default (${fromEmail})`)
        } else {
            console.log(`[DEBUG] fromEmail source: Request Body (${fromEmail})`)
        }

        // Smart fallback: If using default onboarding domain but we have an inviter email, use it.
        // Resend requires a verified domain to send to external recipients.
        if (fromEmail === 'onboarding@resend.dev' && invitedByEmail && invitedByEmail.includes('@')) {
            fromEmail = invitedByEmail
            console.log(`[DEBUG] Using smart fallback (Inviter Email): ${fromEmail}`)
        }

        const resendKey = apiToken || Deno.env.get('RESEND_API_KEY')?.trim()

        if (!resendKey) {
            console.error('[DEBUG] FATAL: Resend Key not found anywhere')
            throw new Error('Email service not configured. Please add Resend API Key in Settings.')
        }

        console.log(`[DEBUG] Final configuration - from: ${fromEmail}, to: ${email}, hasKey: ${!!resendKey}`)

        // Normalize fromEmail domain to lowercase to match Resend's verification
        if (fromEmail && fromEmail.includes('@')) {
            const [local, domain] = fromEmail.split('@')
            fromEmail = `${local}@${domain.toLowerCase()}`
            console.log(`[DEBUG] Normalized fromEmail: ${fromEmail}`)
        }

        const subject = `Invitación para unirte a ${organizationName || 'el equipo'}`

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
                from: `${organizationName || 'Alfapack'} <${fromEmail}>`,
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

        const data = await res.json()

        if (!res.ok) {
            console.error('[DEBUG] Resend API error response:', data)
            return new Response(
                JSON.stringify({
                    success: false,
                    error: data.message || 'Failed to send email',
                    details: data
                }),
                {
                    status: res.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        return new Response(JSON.stringify({ success: true, data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('[DEBUG] Catch error sending invitation:', error)
        return new Response(JSON.stringify({ success: false, error: message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
