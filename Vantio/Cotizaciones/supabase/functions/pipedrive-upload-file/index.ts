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
        const { fileUrl, fileName, dealId, personId, quoteId, organizationId } = await req.json()

        if (!fileUrl || !organizationId) {
            throw new Error('Missing required fields: fileUrl, organizationId')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        let finalDealId = dealId

        // If quoteId is provided but no dealId, try to find the dealId in the database
        // We might need to wait a few seconds as the background sync might still be running
        if (!finalDealId && quoteId) {
            console.log(`🔍 Looking for Pipedrive Deal ID for Quote ${quoteId}...`)

            // Try up to 3 times with 2s delay
            for (let i = 0; i < 3; i++) {
                const { data: quote } = await supabaseAdmin
                    .from('quotes')
                    .select('pipedrive_deal_id')
                    .eq('id', quoteId)
                    .single()

                if (quote?.pipedrive_deal_id) {
                    finalDealId = quote.pipedrive_deal_id
                    console.log(`✅ Found Deal ID: ${finalDealId}`)
                    break
                }

                if (i < 2) {
                    console.log('⏳ Deal ID not found yet, waiting 2s...')
                    await new Promise(resolve => setTimeout(resolve, 2000))
                }
            }
        }

        if (!finalDealId) {
            throw new Error('No Pipedrive Deal ID found for this document')
        }

        // 1. Get Pipedrive credentials
        let apiToken = null
        let companyDomain = null

        const { data: crmConfig } = await supabaseAdmin
            .from('crm_configurations')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('crm_type', 'pipedrive')
            .single()

        if (crmConfig) {
            apiToken = crmConfig.credentials?.api_token || crmConfig.credentials?.apiToken
            companyDomain = crmConfig.credentials?.company_domain || crmConfig.credentials?.companyDomain
        }

        if (!apiToken || !companyDomain) {
            const { data: orgSettings } = await supabaseAdmin
                .from('organization_settings')
                .select('pipedrive_api_token, pipedrive_company_domain')
                .eq('organization_id', organizationId)
                .single()

            if (orgSettings) {
                apiToken = apiToken || orgSettings.pipedrive_api_token
                companyDomain = companyDomain || orgSettings.pipedrive_company_domain
            }
        }

        if (!apiToken || !companyDomain) {
            throw new Error('Pipedrive not configured')
        }

        // 2. Download file
        console.log(`📥 Downloading file from: ${fileUrl}`)
        const fileRes = await fetch(fileUrl)
        if (!fileRes.ok) throw new Error(`Failed to download file: ${fileRes.statusText}`)
        const fileBlob = await fileRes.blob()

        // 3. Upload to Pipedrive
        const formData = new FormData()
        formData.append('file', fileBlob, fileName || 'document.pdf')
        formData.append('deal_id', finalDealId)
        if (personId) formData.append('person_id', personId)

        const pipedriveRes = await fetch(
            `https://${companyDomain}.pipedrive.com/api/v1/files?api_token=${apiToken}`,
            {
                method: 'POST',
                body: formData
            }
        )

        const pipedriveData = await pipedriveRes.json()

        if (!pipedriveData.success) {
            throw new Error(pipedriveData.error || 'Failed to upload to Pipedrive')
        }

        return new Response(
            JSON.stringify({ success: true, fileId: pipedriveData.data.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }
})
