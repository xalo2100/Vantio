import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Edge Function para registrar interacciones con clientes
 * Registra en la base de datos local Y en Pipedrive como nota
 */
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { clientId, interactionType, notes, userId, organizationId } = await req.json()

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get client information
        const { data: client } = await supabaseAdmin
            .from('clients')
            .select('id, name, pipedrive_person_id, status')
            .eq('id', clientId)
            .single()

        if (!client) {
            throw new Error('Client not found')
        }

        const wasNeedingFollowup = client.status === 'needs_followup'

        // Record interaction in our database
        const { data: interaction, error: interactionError } = await supabaseAdmin
            .from('client_interactions')
            .insert({
                client_id: clientId,
                user_id: userId,
                organization_id: organizationId,
                interaction_type: interactionType,
                notes: notes
            })
            .select()
            .single()

        if (interactionError) throw interactionError

        // Update client's last contact date and status
        await supabaseAdmin
            .from('clients')
            .update({
                last_contact_date: new Date().toISOString(),
                status: 'active'
            })
            .eq('id', clientId)

        // If client has Pipedrive ID, create a note in Pipedrive
        let pipedriveNoteCreated = false
        if (client.pipedrive_person_id) {
            try {
                // Get Pipedrive settings
                const { data: settings } = await supabaseAdmin
                    .from('organization_settings')
                    .select('pipedrive_api_token, pipedrive_company_domain')
                    .eq('organization_id', organizationId)
                    .single()

                if (settings?.pipedrive_api_token) {
                    const apiToken = settings.pipedrive_api_token
                    const companyDomain = settings.pipedrive_company_domain
                    const baseUrl = `https://${companyDomain}.pipedrive.com/api/v1`

                    // Get user info for the note
                    const { data: user } = await supabaseAdmin
                        .from('profiles')
                        .select('full_name, email')
                        .eq('id', userId)
                        .single()

                    // Create note content
                    let noteContent = `📞 Contacto registrado por ${user?.full_name || 'vendedor'}\n\n`

                    if (wasNeedingFollowup) {
                        noteContent += `🔔 Sistema detectó que el cliente necesitaba seguimiento\n\n`
                    }

                    noteContent += `Tipo: ${getInteractionTypeLabel(interactionType)}\n`

                    if (notes) {
                        noteContent += `\nNotas:\n${notes}`
                    }

                    noteContent += `\n\n---\nRegistrado automáticamente desde AlfaQuote`

                    // Create note in Pipedrive
                    const noteResponse = await fetch(`${baseUrl}/notes?api_token=${apiToken}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            content: noteContent,
                            person_id: client.pipedrive_person_id,
                            pinned_to_person_flag: 1
                        })
                    })

                    const noteData = await noteResponse.json()

                    if (noteData.success) {
                        pipedriveNoteCreated = true

                        // Update interaction with Pipedrive reference
                        await supabaseAdmin
                            .from('client_interactions')
                            .update({ pipedrive_activity_id: noteData.data.id })
                            .eq('id', interaction.id)
                    }
                }
            } catch (pipedriveError) {
                console.error('Error creating Pipedrive note:', pipedriveError)
                // Don't fail the whole operation if Pipedrive sync fails
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                interaction: interaction,
                pipedrive_synced: pipedriveNoteCreated,
                message: pipedriveNoteCreated
                    ? 'Interacción registrada y sincronizada con Pipedrive'
                    : 'Interacción registrada localmente'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )

    } catch (error) {
        console.error('Error recording interaction:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})

function getInteractionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        'call': 'Llamada telefónica',
        'email': 'Correo electrónico',
        'meeting': 'Reunión',
        'quote_sent': 'Cotización enviada',
        'deal_won': 'Venta cerrada',
        'other': 'Otro'
    }
    return labels[type] || type
}
