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
        const formData = await req.formData()
        const file = formData.get('file') as File
        const assetType = formData.get('type') as string // 'logo' or 'favicon'
        const organizationId = formData.get('organizationId') as string

        if (!file || !assetType || !organizationId) {
            throw new Error('Missing required fields: file, type, organizationId')
        }

        // Validate asset type
        if (!['logo', 'favicon', 'quote_logo'].includes(assetType)) {
            throw new Error('Invalid asset type. Must be "logo", "favicon" or "quote_logo"')
        }

        // Validate file type
        const validLogoTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
        const validFaviconTypes = ['image/x-icon', 'image/png']
        const validTypes = assetType === 'favicon' ? validFaviconTypes : validLogoTypes

        if (!validTypes.includes(file.type)) {
            throw new Error(`Invalid file type for ${assetType}. Allowed: ${validTypes.join(', ')}`)
        }

        // Validate file size
        const maxSize = assetType === 'favicon' ? 500 * 1024 : 2 * 1024 * 1024 // 2MB for logos, 500KB for favicon
        if (file.size > maxSize) {
            throw new Error(`File too large. Maximum size for ${assetType}: ${maxSize / 1024}KB`)
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Get authorization header
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing authorization header')
        }

        // Verify user is superadmin
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) {
            throw new Error('Unauthorized')
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, organization_id')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'super_admin') {
            throw new Error('Only superadmins can upload organization assets')
        }

        if (profile.organization_id !== organizationId) {
            throw new Error('Cannot upload assets for other organizations')
        }

        // Get current asset URL to delete old file
        let oldAssetUrl = null;
        if (assetType === 'quote_logo') {
             const { data: settings } = await supabaseAdmin
                .from('organization_settings')
                .select('quote_logo_url')
                .eq('organization_id', organizationId)
                .single()
             oldAssetUrl = settings?.quote_logo_url
        } else {
            const { data: org } = await supabaseAdmin
                .from('organizations')
                .select(assetType === 'logo' ? 'logo_url' : 'favicon_url')
                .eq('id', organizationId)
                .single()
            oldAssetUrl = assetType === 'logo' ? org?.logo_url : org?.favicon_url
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${organizationId}/${assetType}-${Date.now()}.${fileExt}`

        // Upload file to Supabase Storage
        const fileBuffer = await file.arrayBuffer()
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('organization-assets')
            .upload(fileName, fileBuffer, {
                contentType: file.type,
                upsert: false
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            throw new Error(`Failed to upload file: ${uploadError.message}`)
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('organization-assets')
            .getPublicUrl(fileName)

        // Update record
        let updateError = null;

        if (assetType === 'quote_logo') {
             // Upsert into organization_settings
             const { error } = await supabaseAdmin
                .from('organization_settings')
                .upsert({ 
                    organization_id: organizationId,
                    quote_logo_url: publicUrl,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'organization_id' })
             updateError = error
        } else {
            // Update organizations
            const updateData = assetType === 'logo'
                ? { logo_url: publicUrl }
                : { favicon_url: publicUrl }

            const { error } = await supabaseAdmin
                .from('organizations')
                .update(updateData)
                .eq('id', organizationId)
            updateError = error
        }

        if (updateError) {
            // Rollback: delete uploaded file
            await supabaseAdmin.storage
                .from('organization-assets')
                .remove([fileName])
            throw new Error(`Failed to update organization: ${updateError.message}`)
        }

        // Delete old asset if exists
        if (oldAssetUrl) {
            try {
                const oldFileName = oldAssetUrl.split('/organization-assets/')[1]
                if (oldFileName) {
                    await supabaseAdmin.storage
                        .from('organization-assets')
                        .remove([oldFileName])
                }
            } catch (error) {
                console.error('Error deleting old asset:', error)
                // Don't fail the request if old file deletion fails
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                url: publicUrl,
                type: assetType,
                message: `${assetType === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`
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
