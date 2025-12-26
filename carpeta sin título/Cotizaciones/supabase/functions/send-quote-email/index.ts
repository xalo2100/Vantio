import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

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
    replyTo?: string
    fromName?: string
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const { to, subject, html, text, quoteId, quoteNumber, replyTo, fromName }: EmailRequest = await req.json()

        // Validate required fields
        if (!to || !subject || !html) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
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

        // Check if Resend API key is configured
        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY is not configured')
            return new Response(
                JSON.stringify({ error: 'Email service not configured' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Send email via Resend
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: `${fromName || 'Cotizaciones'} <onboarding@resend.dev>`,
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
                JSON.stringify({ error: 'Failed to send email', details: data }),
                {
                    status: res.status,
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
        console.error('Error in send-quote-email function:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
