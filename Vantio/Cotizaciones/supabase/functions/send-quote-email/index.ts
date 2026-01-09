import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
    to: string
    subject: string
    html: string
    text: string
    quoteId: string
    quoteNumber: string
    organizationId: string
    replyTo?: string
    fromName?: string
    resendApiKey?: string
    resendFromEmail?: string
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { to, subject, html, text, organizationId, quoteId, quoteNumber, resendApiKey, resendFromEmail, fromName, replyTo }: EmailRequest = await req.json()

        // Validate required fields
        if (!to || !subject || !html || !organizationId) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: to, subject, html, organizationId' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(to)) {
            return new Response(
                JSON.stringify({ error: 'Invalid email address' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
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

        if (!apiToken || apiToken === '********') {
            apiToken = settings?.resend_api_key?.trim()
        }

        // Logic for "From" email:
        // 1. If resendFromEmail is provided and it's NOT the generic one, check if it's from a verified domain.
        // 2. Otherwise use the organization's default.
        const defaultFromEmail = settings?.resend_from_email || 'onboarding@resend.dev'

        // If the caller explicitly passed a fromEmail (like the salesperson's email)
        if (!fromEmail || fromEmail === 'onboarding@resend.dev') {
            fromEmail = defaultFromEmail
        }

        // --- NEW: Domain Verification Check ---
        // If we have a verified domain in settings (e.g. alfapack.cl), 
        // and the current user's email belongs to it, we can use it as 'from'.
        if (defaultFromEmail.includes('@')) {
            const verifiedDomain = defaultFromEmail.split('@')[1].toLowerCase()
            // If the provided fromEmail (e.g. from the salesperson) belongs to this domain
            if (fromEmail.toLowerCase().endsWith(`@${verifiedDomain}`)) {
                console.log(`✅ Using verified salesperson email: ${fromEmail}`)
            } else {
                console.log(`⚠️ Email ${fromEmail} does not belong to verified domain ${verifiedDomain}. Falling back to ${defaultFromEmail}`)
                fromEmail = defaultFromEmail
            }
        }

        const resendKey = apiToken || Deno.env.get('RESEND_API_KEY')?.trim()

        // Normalize fromEmail domain to lowercase to match Resend's verification
        if (fromEmail && fromEmail.includes('@')) {
            const [local, domain] = fromEmail.split('@')
            fromEmail = `${local}@${domain.toLowerCase()}`
        }

        // Check if Resend API key is configured
        if (!resendKey) {
            console.error('RESEND_API_KEY is not configured for organization:', organizationId)
            return new Response(
                JSON.stringify({ error: 'Email service not configured. Please add your Resend API Key in Settings.' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        if (!fromEmail) {
            throw new Error('From email could not be determined.')
        }

        // Send email via Resend
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
                from: `${fromName || 'Cotizaciones'} <${fromEmail}>`,
                reply_to: replyTo,
                to: [to],
                subject: subject,
                html: html,
                text: text,
                tags: [
                    {
                        name: 'category',
                        value: 'quote'
                    },
                    {
                        name: 'quote_id',
                        value: quoteId
                    },
                    {
                        name: 'quote_number',
                        value: quoteNumber
                    }
                ]
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('Resend API error:', data)
            return new Response(
                JSON.stringify({
                    error: 'Failed to send email via Resend',
                    resendError: data,
                    status: res.status
                }),
                {
                    status: res.status === 422 ? 400 : 500, // Map 422 to 400 for better client handling
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        console.log('Email sent successfully:', data)

        return new Response(
            JSON.stringify({
                success: true,
                messageId: data.id,
                message: 'Email sent successfully'
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('Error in send-quote-email function:', error)
        return new Response(
            JSON.stringify({ error: message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
