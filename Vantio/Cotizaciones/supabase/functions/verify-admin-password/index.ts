import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        // CORS headers
        if (req.method === 'OPTIONS') {
            return new Response('ok', {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST',
                    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                }
            })
        }

        const { userId, password } = await req.json()

        if (!userId || !password) {
            throw new Error('User ID and password are required')
        }

        // Create Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Verify user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()

        if (profileError || !profile) {
            throw new Error('User not found')
        }

        if (profile.role !== 'admin' && profile.role !== 'super_admin') {
            return new Response(
                JSON.stringify({ valid: false, error: 'User is not an admin' }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    }
                }
            )
        }

        // Verify password using Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: userId, // Assuming userId is email
            password: password
        })

        if (authError || !authData.user) {
            return new Response(
                JSON.stringify({ valid: false, error: 'Invalid password' }),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    }
                }
            )
        }

        return new Response(
            JSON.stringify({ valid: true }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ valid: false, error: error.message }),
            {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                }
            }
        )
    }
})
