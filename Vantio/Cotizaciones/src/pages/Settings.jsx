import React, { useState, useEffect } from 'react';
import { useRole } from '../hooks/useRole';
import RoleGuard from '../components/RoleGuard';
import { Building2, User, Save, Upload, CheckCircle, Settings as SettingsIcon, Key, Link as LinkIcon, XCircle, Database, PlusCircle, Shield, Mail, RotateCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { pipedriveService } from '../services/pipedriveService';
import RichTextEditor from '../components/RichTextEditor';
import CRMConfigurationPanel from '../components/CRMConfigurationPanel';

const Settings = () => {
    const { user } = useAuth();
    const { profile, isSuperAdmin } = useRole();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [success, setSuccess] = useState(false);

    // CRM State
    const [activeCRM, setActiveCRM] = useState('none'); // 'none', 'pipedrive', 'hubspot', etc.

    // Pipedrive State
    const [pipedriveApiToken, setPipedriveApiToken] = useState('');
    const [pipedriveCompanyDomain, setPipedriveCompanyDomain] = useState('');
    const [pipedriveSyncEnabled, setPipedriveSyncEnabled] = useState(false);
    const [pipedriveFileSyncEnabled, setPipedriveFileSyncEnabled] = useState(true);
    const [pipedriveConnectionStatus, setPipedriveConnectionStatus] = useState(null); // 'success', 'error', 'testing', null

    // Defontana State
    const [defontanaApiKey, setDefontanaApiKey] = useState('');
    const [defontanaCompanyId, setDefontanaCompanyId] = useState('');
    const [defontanaSyncEnabled, setDefontanaSyncEnabled] = useState(false);

    // HubSpot State  
    const [hubspotApiKey, setHubspotApiKey] = useState('');
    const [hubspotPortalId, setHubspotPortalId] = useState('');
    const [hubspotSyncEnabled, setHubspotSyncEnabled] = useState(false);

    // Organization settings
    const [orgName, setOrgName] = useState('');
    const [orgLogo, setOrgLogo] = useState(null);
    const [quoteLogo, setQuoteLogo] = useState(null);
    const [logoFile, setLogoFile] = useState(null);

    // User settings
    const [fullName, setFullName] = useState('');
    const [userPhone, setUserPhone] = useState('');

    // Advanced settings (Admin only)
    const [defaultConditions, setDefaultConditions] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [openrouterApiKey, setOpenrouterApiKey] = useState('');
    const [qwenApiKey, setQwenApiKey] = useState('');
    const [zaiApiKey, setZaiApiKey] = useState('');
    const [defaultPaymentTerms, setDefaultPaymentTerms] = useState('');
    const [defaultDeliveryTime, setDefaultDeliveryTime] = useState('');
    const [useInternalCrm, setUseInternalCrm] = useState(false);
    const [aiProviderPriority, setAiProviderPriority] = useState(['gemini', 'xiaomi', 'zai', 'qwen']);
    const [aiTaskRouting, setAiTaskRouting] = useState({
        insights: 'gemini',
        followup: 'xiaomi',
        marketing: 'qwen',
        data_extraction: 'xiaomi'
    });
    const [showSkuInQuotes, setShowSkuInQuotes] = useState(true);
    const [resendApiKey, setResendApiKey] = useState('');
    const [resendFromEmail, setResendFromEmail] = useState('onboarding@resend.dev');
    const [cloudflareDatabaseId, setCloudflareDatabaseId] = useState('');
    const [cloudflareApiToken, setCloudflareApiToken] = useState('');

    // Appwrite State
    const [appwriteEndpoint, setAppwriteEndpoint] = useState('');
    const [appwriteProjectId, setAppwriteProjectId] = useState('');
    const [appwriteDatabaseId, setAppwriteDatabaseId] = useState('');
    const [appwriteApiKey, setAppwriteApiKey] = useState('');

    const [showKeys, setShowKeys] = useState({
        gemini: false,
        openrouter: false,
        qwen: false,
        zai: false,
        resend: false,
        cloudflare: false,
        supabase: false,
        appwrite: false,
    });

    const toggleKeyVisibility = (keyName) => {
        setShowKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }));
    };

    const [quoteHeaderBorderColor, setQuoteHeaderBorderColor] = useState('#6B7280');
    const [quoteLogoBgColor, setQuoteLogoBgColor] = useState('#FFFFFF');
    const [quoteLogoBgTransparent, setQuoteLogoBgTransparent] = useState(false);
    const [sidebarBgColor, setSidebarBgColor] = useState('#0f3242');
    const [sidebarAccentColor, setSidebarAccentColor] = useState('#f97316');
    const [sidebarActiveItemColor, setSidebarActiveItemColor] = useState('#f97316');
    const [sidebarTextColor, setSidebarTextColor] = useState('#ffffff');
    const [appBgColor, setAppBgColor] = useState('#fdfbf7');

    // AI & Email Test Statuses
    const [testStatuses, setTestStatuses] = useState({}); // { provider: 'loading' | 'success' | 'error' | null }
    const [testMessages, setTestMessages] = useState({}); // { provider: string }

    // Database Connection Settings (Super Admin only)
    const [customSupabaseUrl, setCustomSupabaseUrl] = useState('');
    const [customSupabaseKey, setCustomSupabaseKey] = useState('');

    // Multi-org state
    const [userOrgs, setUserOrgs] = useState([]);
    const [showNewOrgModal, setShowNewOrgModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [switchingOrg, setSwitchingOrg] = useState(false);

    // Superadmin creation state
    const [showCreateSuperadminModal, setShowCreateSuperadminModal] = useState(false);
    const [newSuperadminEmail, setNewSuperadminEmail] = useState('');
    const [newSuperadminName, setNewSuperadminName] = useState('');

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setUserPhone(profile.phone || '');
            fetchOrganization();
            fetchOrganizationSettings();
            fetchUserOrganizations();
        }

        // Load custom database settings
        const storedUrl = localStorage.getItem('custom_supabase_url');
        const storedKey = localStorage.getItem('custom_supabase_key');
        if (storedUrl) setCustomSupabaseUrl(storedUrl);
        if (storedKey) setCustomSupabaseKey(storedKey);
    }, [profile]);

    const fetchOrganization = async () => {
        if (!profile?.organization_id) return;

        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', profile.organization_id)
                .single();

            if (error) throw error;

            setOrgName(data.name || '');
            // TODO: Fetch logo from Supabase Storage when implemented
        } catch (error) {
            console.error('Error fetching organization:', error);
        }
    };

    const fetchOrganizationSettings = async () => {
        if (!profile?.organization_id) return;

        try {
            const { data, error } = await supabase
                .from('organization_settings')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching settings:', error);
                return;
            }

            if (data) {
                setDefaultConditions(data.default_sales_conditions || '');
                setGeminiApiKey(data.gemini_api_key || '');
                setOpenrouterApiKey(data.openrouter_api_key || '');
                setQwenApiKey(data.qwen_api_key || '');
                setZaiApiKey(data.zai_api_key || '');
                setDefaultPaymentTerms(data.default_payment_terms || '');
                setDefaultDeliveryTime(data.default_delivery_time || '');
                setUseInternalCrm(data.use_internal_crm || false);

                if (data.ai_provider_priority) {
                    setAiProviderPriority(data.ai_provider_priority);
                }
                if (data.ai_task_routing) {
                    setAiTaskRouting(data.ai_task_routing);
                }

                setQuoteHeaderBorderColor(data.quote_header_border_color || '#e5e7eb');
                setQuoteLogoBgColor(data.quote_logo_bg_color || '#FFFFFF');
                setQuoteLogoBgTransparent(data.quote_logo_bg_transparent || false);
                setShowSkuInQuotes(data.show_sku_in_quotes !== undefined ? data.show_sku_in_quotes : true);
                setResendApiKey(data.resend_api_key || '');
                setResendFromEmail(data.resend_from_email || 'onboarding@resend.dev');
                if (data.quote_logo_url) {
                    setQuoteLogo(data.quote_logo_url);
                }
                setSidebarBgColor(data.sidebar_bg_color || '#0f3242');
                setSidebarAccentColor(data.sidebar_accent_color || '#f97316');
                setSidebarActiveItemColor(data.sidebar_active_item_color || '#f97316');
                setSidebarTextColor(data.sidebar_text_color || '#ffffff');
                setAppBgColor(data.app_bg_color || '#fdfbf7');
                setPipedriveFileSyncEnabled(data.pipedrive_file_sync_enabled !== undefined ? data.pipedrive_file_sync_enabled : true);
                setCloudflareDatabaseId(data.cloudflare_database_id || '');
                setCloudflareApiToken(data.cloudflare_api_token || '');
                setAppwriteEndpoint(data.appwrite_endpoint || '');
                setAppwriteProjectId(data.appwrite_project_id || '');
                setAppwriteDatabaseId(data.appwrite_database_id || '');
                setAppwriteApiKey(data.appwrite_api_key || '');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchUserOrganizations = async () => {
        try {
            const { data, error } = await supabase
                .from('user_organizations')
                .select('*, organizations(name, logo_url)')
                .eq('user_id', user.id);

            if (error) {
                // Si la tabla no existe, simplemente no mostrar la sección
                console.warn('user_organizations table not found, skipping multi-org feature');
                setUserOrgs([]);
                return;
            }
            setUserOrgs(data || []);
        } catch (error) {
            console.error('Error fetching user organizations:', error);
            setUserOrgs([]); // Set empty array to prevent crashes
        }
    };

    const handleCreateOrganization = async () => {
        if (!newOrgName.trim()) return;
        setLoading(true);
        try {
            // 1. Create Organization
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert([{ name: newOrgName, super_admin_id: user.id }])
                .select()
                .single();

            if (orgError) throw orgError;

            // 2. Create Membership
            const { error: memberError } = await supabase
                .from('user_organizations')
                .insert([{
                    user_id: user.id,
                    organization_id: org.id,
                    role: 'admin' // Creator is admin
                }]);

            if (memberError) throw memberError;

            // 3. Switch to new org
            await handleSwitchOrganization(org.id);

            setShowNewOrgModal(false);
            setNewOrgName('');
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error creating organization:', error);
            alert('Error al crear la empresa: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchOrganization = async (orgId) => {
        setSwitchingOrg(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ organization_id: orgId })
                .eq('id', user.id);

            if (error) throw error;

            // Reload to refresh all context
            window.location.reload();
        } catch (error) {
            console.error('Error switching organization:', error);
            alert('Error al cambiar de empresa');
            setSwitchingOrg(false);
        }
    };

    const handleCreateSuperadmin = async () => {
        if (!newSuperadminEmail || !newSuperadminName) {
            alert('Por favor completa todos los campos');
            return;
        }

        if (!isSuperAdmin) {
            alert('Solo los Super Administradores pueden crear otros Super Administradores');
            return;
        }

        if (!window.confirm(`¿Estás seguro de crear un nuevo Super Administrador para ${newSuperadminEmail}?`)) {
            return;
        }

        setLoading(true);
        try {
            // Generate unique token
            const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

            // Set expiration (7 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const { error } = await supabase
                .from('invitations')
                .insert([{
                    email: newSuperadminEmail,
                    role: 'super_admin',
                    organization_id: profile.organization_id,
                    invited_by: user.id,
                    token: token,
                    expires_at: expiresAt.toISOString()
                }]);

            if (error) throw error;

            const inviteLink = `${window.location.origin}/invite/${token}`;
            alert(`Super Administrador creado! Comparte este link:\n\n${inviteLink}`);

            setShowCreateSuperadminModal(false);
            setNewSuperadminEmail('');
            setNewSuperadminName('');
            setSuccess(true);
            setMessage('Super Administrador creado exitosamente');
            setTimeout(() => {
                setSuccess(false);
                setMessage(null);
            }, 3000);
        } catch (error) {
            console.error('Error creating superadmin:', error);
            alert('Error al crear Super Administrador: ' + error.message);
        } finally {
            setLoading(false);
        }
    };


    const handleSaveDatabaseSettings = () => {
        if (!customSupabaseUrl || !customSupabaseKey) {
            alert('Debes ingresar tanto la URL como la Key');
            return;
        }

        if (window.confirm('¿Estás seguro? Esto cambiará la conexión a la base de datos y recargará la página.')) {
            localStorage.setItem('custom_supabase_url', customSupabaseUrl);
            localStorage.setItem('custom_supabase_key', customSupabaseKey);
            window.location.reload();
        }
    };

    const handleResetDatabaseSettings = () => {
        if (window.confirm('¿Estás seguro? Esto restaurará la conexión por defecto y recargará la página.')) {
            localStorage.removeItem('custom_supabase_url');
            localStorage.removeItem('custom_supabase_key');
            setCustomSupabaseUrl('');
            setCustomSupabaseKey('');
            window.location.reload();
        }
    };

    const handleSaveAdvancedSettings = async () => {
        if (!profile?.organization_id) return;

        setLoading(true);
        try {
            const updates = {
                organization_id: profile.organization_id,
                default_sales_conditions: defaultConditions
            };

            // Solo actualizar API key si no es la máscara
            if (geminiApiKey && geminiApiKey !== '********') {
                updates.gemini_api_key = geminiApiKey;
            }
            if (openrouterApiKey && openrouterApiKey !== '********') {
                updates.openrouter_api_key = openrouterApiKey;
            }
            if (qwenApiKey && qwenApiKey !== '********') {
                updates.qwen_api_key = qwenApiKey;
            }
            if (zaiApiKey && zaiApiKey !== '********') {
                updates.zai_api_key = zaiApiKey;
            }
            if (resendApiKey && resendApiKey !== '********') {
                updates.resend_api_key = resendApiKey;
            }
            updates.use_internal_crm = useInternalCrm;

            updates.ai_provider_priority = aiProviderPriority;
            updates.ai_task_routing = aiTaskRouting;

            // Add quote header border color
            updates.quote_header_border_color = quoteHeaderBorderColor;

            // Add quote logo bg settings
            updates.quote_logo_bg_color = quoteLogoBgColor;
            updates.quote_logo_bg_transparent = quoteLogoBgTransparent;
            updates.show_sku_in_quotes = showSkuInQuotes;
            updates.default_payment_terms = defaultPaymentTerms;
            updates.default_delivery_time = defaultDeliveryTime;
            updates.sidebar_bg_color = sidebarBgColor;
            updates.sidebar_accent_color = sidebarAccentColor;
            updates.sidebar_active_item_color = sidebarActiveItemColor;
            updates.sidebar_text_color = sidebarTextColor;
            updates.app_bg_color = appBgColor;
            updates.pipedrive_file_sync_enabled = pipedriveFileSyncEnabled;
            updates.resend_api_key = resendApiKey;
            updates.resend_from_email = resendFromEmail;
            updates.cloudflare_database_id = cloudflareDatabaseId;
            if (cloudflareApiToken && cloudflareApiToken !== '********') {
                updates.cloudflare_api_token = cloudflareApiToken;
            }

            // Appwrite Settings
            updates.appwrite_endpoint = appwriteEndpoint;
            updates.appwrite_project_id = appwriteProjectId;
            updates.appwrite_database_id = appwriteDatabaseId;
            if (appwriteApiKey && appwriteApiKey !== '********') {
                updates.appwrite_api_key = appwriteApiKey;
            }

            const { error } = await supabase
                .from('organization_settings')
                .upsert(updates, { onConflict: 'organization_id' });

            if (error) throw error;

            setSuccess(true);
            setMessage('Configuración guardada correctamente');
            setTimeout(() => {
                setSuccess(false);
                setMessage(null);
            }, 3000);

            // Reload to show masked key
            fetchOrganizationSettings();
        } catch (error) {
            console.error('Error saving advanced settings:', error);
            setMessage('Error al guardar: ' + error.message);
            setSuccess(false);
            // No cleanup timeout for error so user can read it
        } finally {
            setLoading(false);
        }
    };

    const handleTestPipedriveConnection = async () => {
        setPipedriveConnectionStatus('testing');
        try {
            const success = await pipedriveService.testConnection();
            setPipedriveConnectionStatus(success ? 'success' : 'error');
            setTimeout(() => setPipedriveConnectionStatus(null), 3000);
        } catch (error) {
            console.error('Connection test failed:', error);
            setPipedriveConnectionStatus('error');
            setTimeout(() => setPipedriveConnectionStatus(null), 3000);
        }
    };

    const handleTestAI = async (provider) => {
        if (!profile?.organization_id) return;

        setTestStatuses(prev => ({ ...prev, [provider]: 'loading' }));
        setTestMessages(prev => ({ ...prev, [provider]: '' }));

        try {
            const { data, error } = await supabase.functions.invoke('ai-gateway', {
                body: {
                    prompt: "Responde solo con la palabra 'CONECTADO'.",
                    provider,
                    orgId: profile.organization_id,
                    taskType: 'test'
                }
            });

            if (error) {
                console.error("Supabase Invoke Error:", error);

                let errorDetails = error.message;

                // Inspect the error context (Response object)
                if (error && typeof error === 'object' && 'context' in error) {
                    const response = error.context;
                    if (response && typeof response.text === 'function') {
                        const status = response.status;
                        let bodyText = '';
                        try {
                            bodyText = await response.text();
                            // Try to parse JSON for cleaner error display
                            try {
                                const json = JSON.parse(bodyText);
                                if (json.error) bodyText = json.error;
                            } catch { }
                        } catch (e) {
                            console.error("Failed to read error body", e);
                        }
                        errorDetails = `Status ${status}: ${bodyText || error.message}`;
                    }
                }
                throw new Error(errorDetails);
            }

            if (data?.error) throw new Error(data.error);

            setTestStatuses(prev => ({ ...prev, [provider]: 'success' }));
            setTestMessages(prev => ({ ...prev, [provider]: 'Conexión exitosa: ' + (data?.text || 'OK') }));
        } catch (error) {
            console.error(`Error testing ${provider}:`, error);

            let userMessage = error.message;
            if (userMessage.includes('Failed to send a request') || userMessage.includes('fetch failed')) {
                userMessage = 'Error de conexión. Verifica tu internet o desactiva bloqueadores de publicidad (AdBlock).';
            }

            setTestStatuses(prev => ({ ...prev, [provider]: 'error' }));
            setTestMessages(prev => ({ ...prev, [provider]: userMessage }));
        }
        setTimeout(() => {
            setTestStatuses(prev => ({ ...prev, [provider]: null }));
            setTestMessages(prev => ({ ...prev, [provider]: '' }));
        }, 5000);
    };

    const handleTestConnection = async (provider) => {
        if (!profile?.organization_id) return;

        setTestStatuses(prev => ({ ...prev, [provider]: 'testing' }));
        setTestMessages(prev => ({ ...prev, [provider]: '' }));

        try {
            if (provider === 'resend') {
                const { data, error } = await supabase.functions.invoke('send-quote-email', {
                    body: {
                        to: user.email,
                        subject: "Prueba de Conexión Alfapack",
                        html: "<p>Esta es una prueba de conexión exitosa desde tu configuración de Alfapack.</p>",
                        text: "Esta es una prueba de conexión exitosa desde tu configuración de Alfapack.",
                        organizationId: profile.organization_id,
                        quoteId: 'test',
                        quoteNumber: 'TEST-001',
                        resendApiKey: resendApiKey,
                        resendFromEmail: resendFromEmail
                    }
                });

                if (error) {
                    let errorDetails = error.message;
                    try {
                        if (error.context && typeof error.context.json === 'function') {
                            const json = await error.context.json();
                            errorDetails = json.error || json.message || errorDetails;
                            if (json.details) errorDetails += `: ${JSON.stringify(json.details)}`;
                        }
                    } catch (e) { }
                    throw new Error(errorDetails);
                }

                if (data?.error) throw new Error(data.error + (data.details ? `: ${JSON.stringify(data.details)}` : ''));

                setTestStatuses(prev => ({ ...prev, [provider]: 'success' }));
                setTestMessages(prev => ({ ...prev, [provider]: 'Correo de prueba enviado a ' + user.email }));
            }
        } catch (error) {
            console.error(`Error testing ${provider}:`, error);

            let userMessage = error.message;
            if (error.name === 'TypeError' && (userMessage.includes('Failed to fetch') || userMessage.includes('fetch failed'))) {
                userMessage = `El navegador bloqueó la conexión (posible AdBlock) o no hay conexión a internet. Error original: ${error.message}`;
            }

            setTestStatuses(prev => ({ ...prev, [provider]: 'error' }));
            setTestMessages(prev => ({ ...prev, [provider]: userMessage }));
        }
        setTimeout(() => {
            setTestStatuses(prev => ({ ...prev, [provider]: null }));
            setTestMessages(prev => ({ ...prev, [provider]: '' }));
        }, 5000);
    };

    const handleTestNetwork = async () => {
        const provider = 'network';
        setTestStatuses(prev => ({ ...prev, [provider]: 'loading' }));
        setTestMessages(prev => ({ ...prev, [provider]: '' }));

        try {
            // 1. Check General Internet
            const googleResponse = await fetch('https://jsonplaceholder.typicode.com/todos/1');
            if (!googleResponse.ok) throw new Error('Internet general falló.');

            // 2. Check Supabase Functions Domain specifically
            // We get the URL from the supabase client internal config
            const supabaseUrl = supabase.supabaseUrl;
            const funcUrl = `${supabaseUrl}/functions/v1/ai-gateway`;

            try {
                // Try a simple OPTIONS request (CORS check)
                const funcResponse = await fetch(funcUrl, { method: 'OPTIONS' });
                if (!funcResponse.ok && funcResponse.status !== 200 && funcResponse.status !== 204) {
                    throw new Error(`Supabase respondió ${funcResponse.status}`);
                }
            } catch (sbError) {
                console.error('Supabase Reachability Error:', sbError);
                throw new Error('Internet OK, pero SUPABASE está bloqueado o caído. ' + sbError.message);
            }

            setTestStatuses(prev => ({ ...prev, [provider]: 'success' }));
            setTestMessages(prev => ({ ...prev, [provider]: 'Conexión Total Exitosa (Internet + Supabase).' }));
        } catch (error) {
            console.error('Network Test Failed:', error);
            setTestStatuses(prev => ({ ...prev, [provider]: 'error' }));
            setTestMessages(prev => ({ ...prev, [provider]: error.message }));
        }
        setTimeout(() => {
            setTestStatuses(prev => ({ ...prev, [provider]: null }));
            setTestMessages(prev => ({ ...prev, [provider]: '' }));
        }, 8000);
    };

    const handleLogoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
            if (!validTypes.includes(file.type)) {
                alert('Formato inválido. Solo se permiten PNG, JPG o SVG');
                return;
            }

            // Validate file size (2MB max)
            if (file.size > 2 * 1024 * 1024) {
                alert('El archivo es demasiado grande. Máximo 2MB');
                return;
            }

            // Show preview
            setLogoFile(file); // Keep for main logo save if needed, but we upload directly now for assets
            const reader = new FileReader();
            reader.onloadend = () => {
                setOrgLogo(reader.result);
            };
            reader.readAsDataURL(file);

            // Upload to server
            await handleUploadAsset(file, 'logo');
        }
    };

    const handleQuoteLogoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
            if (!validTypes.includes(file.type)) {
                alert('Formato inválido. Solo se permiten PNG, JPG o SVG');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                alert('El archivo es demasiado grande. Máximo 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setQuoteLogo(reader.result);
            };
            reader.readAsDataURL(file);

            await handleUploadAsset(file, 'quote_logo');
        }
    };

    const handleFaviconChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['image/x-icon', 'image/png'];
            if (!validTypes.includes(file.type)) {
                alert('Formato inválido. Solo se permiten ICO o PNG');
                return;
            }

            // Validate file size (500KB max)
            if (file.size > 500 * 1024) {
                alert('El archivo es demasiado grande. Máximo 500KB');
                return;
            }

            // Upload to server
            await handleUploadAsset(file, 'favicon');
        }
    };

    const handleUploadAsset = async (file, type) => {
        if (!profile?.organization_id) {
            alert('No se pudo obtener el ID de la organización');
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);
            formData.append('organizationId', profile.organization_id);

            const { data, error } = await supabase.functions.invoke('upload-org-asset', {
                body: formData
            });

            if (error) throw error;

            setSuccess(true);
            setSuccess(true);
            const typeLabel = type === 'logo' ? 'Logo' : type === 'quote_logo' ? 'Logo de Cotización' : 'Favicon';
            setMessage(`${typeLabel} actualizado correctamente`);
            setTimeout(() => {
                setSuccess(false);
                setMessage(null);
            }, 3000);

            // Reload organization data
            if (type === 'quote_logo') {
                fetchOrganizationSettings();
            } else {
                fetchOrganization();
            }
        } catch (error) {
            console.error('Error uploading asset:', error);
            setMessage(`Error al subir ${type === 'logo' ? 'logo' : 'favicon'}: ${error.message}`);
            setSuccess(false);
        } finally {
            setSaving(false);
        }
    };


    const handleSaveOrganization = async () => {
        if (!isSuperAdmin || !profile?.organization_id) {
            alert('Solo el Super Administrador puede modificar la configuración de la organización');
            return;
        }

        setLoading(true);
        try {
            let logoUrl = null;

            // Upload logo if file is selected
            if (logoFile) {
                const fileExt = logoFile.name.split('.').pop();
                const fileName = `${profile.organization_id}-${Date.now()}.${fileExt}`;
                const filePath = `logos/${fileName}`;

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('organization-assets')
                    .upload(filePath, logoFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('organization-assets')
                    .getPublicUrl(filePath);

                logoUrl = publicUrl;
            }

            // Update organization
            const updates = { name: orgName };
            if (logoUrl) {
                updates.logo_url = logoUrl;
            }

            const { error } = await supabase
                .from('organizations')
                .update(updates)
                .eq('id', profile.organization_id);

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);

            // Refresh to show new logo
            if (logoUrl) {
                setOrgLogo(logoUrl);
                setLogoFile(null);
            }
        } catch (error) {
            console.error('Error saving organization:', error);
            alert('Error al guardar los cambios: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    phone: userPhone
                })
                .eq('id', user.id);

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Error al guardar los cambios: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const TestButton = ({ provider, onTest, status, message }) => (
        <div className="flex flex-col gap-2 mt-2">
            <button
                type="button"
                onClick={() => onTest(provider)}
                disabled={status === 'loading'}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${status === 'success' ? 'bg-green-100 text-green-700' :
                    status === 'error' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
            >
                {status === 'loading' ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : status === 'success' ? (
                    <CheckCircle size={16} />
                ) : status === 'error' ? (
                    <XCircle size={16} />
                ) : (
                    <SettingsIcon size={16} />
                )}
                <span>{status === 'loading' ? 'Probando...' : status === 'success' ? 'Conectado' : status === 'error' ? 'Error' : 'Probar Conexión'}</span>
            </button>
            {message && (
                <p className={`text-[10px] ${status === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                    {message}
                </p>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
                <p className="text-gray-400">Gestiona la configuración de tu cuenta y organización</p>
            </div>

            {/* DEBUG PANEL - TEMPORAL */}
            <div className="glass-panel p-4 rounded-xl border-2 border-yellow-500 bg-yellow-50">
                <h3 className="text-sm font-bold text-yellow-800 mb-2">🔍 DEBUG - Detección de Rol</h3>
                <div className="text-xs space-y-1">
                    <p><strong>Email:</strong> {user?.email || 'No disponible'}</p>
                    <p><strong>User ID:</strong> {user?.id || 'No disponible'}</p>
                    <p><strong>Rol Detectado:</strong> <span className="font-mono bg-yellow-200 px-2 py-1 rounded">{profile?.role || 'No cargado'}</span></p>
                    <p><strong>isSuperAdmin:</strong> <span className={isSuperAdmin ? 'text-green-600' : 'text-red-600'}>{isSuperAdmin ? '✅ TRUE' : '❌ FALSE'}</span></p>
                    <p><strong>Organization ID:</strong> {profile?.organization_id || 'No disponible'}</p>
                    <p><strong>Profile completo:</strong> <code className="text-xs">{JSON.stringify(profile, null, 2)}</code></p>
                </div>
            </div>

            {/* Organization Settings - Super Admin Only */}
            <RoleGuard allowedRoles={['super_admin']}>
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                            <Building2 className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-petrol-800">Organización</h2>
                            <p className="text-sm text-gray-600">Configuración de tu empresa</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nombre de la Organización
                            </label>
                            <input
                                type="text"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                placeholder="Mi Empresa"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Logo de la Empresa
                            </label>
                            <div className="flex items-center gap-4">
                                {orgLogo && (
                                    <img
                                        src={orgLogo}
                                        alt="Logo preview"
                                        className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300"
                                    />
                                )}
                                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                    <Upload size={18} />
                                    <span className="text-sm font-medium">Subir Logo</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Recomendado: 200x200px, formato PNG o JPG
                            </p>
                        </div>

                        {/* Quote Logo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Logo para Cotizaciones (PDF y Web)
                            </label>
                            <div className="flex items-center gap-4">
                                {quoteLogo && (
                                    <img
                                        src={quoteLogo}
                                        alt="Quote Logo preview"
                                        className="w-20 h-20 object-contain rounded-lg border-2 border-gray-300 bg-white"
                                    />
                                )}
                                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                    <Upload size={18} />
                                    <span className="text-sm font-medium">Subir Logo Color</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleQuoteLogoChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Este logo se usará exclusivamente en los documentos PDF y vistas previas.
                                <br />Recomendado: Fondo transparente, colores oscuros para fondo blanco.
                            </p>
                        </div>

                        {/* Favicon Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Favicon (Ícono del Navegador)
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                    <Upload size={18} />
                                    <span className="text-sm font-medium">Subir Favicon</span>
                                    <input
                                        type="file"
                                        accept=".ico,image/x-icon,image/png"
                                        onChange={handleFaviconChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Recomendado: 32x32px o 64x64px, formato ICO o PNG
                            </p>
                        </div>

                        {/* Create Superadmin Button (Super Admin only) */}
                        {isSuperAdmin && (
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <button
                                    onClick={() => setShowCreateSuperadminModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                                >
                                    <Shield size={18} />
                                    <span className="font-medium">Crear Nuevo Super Administrador</span>
                                </button>
                                <p className="text-xs text-gray-500 mt-2">
                                    Solo Super Administradores pueden crear otros Super Administradores
                                </p>
                            </div>
                        )}

                        {/* Organization Switcher */}
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-petrol-800">Mis Empresas</h3>
                                <button
                                    onClick={() => setShowNewOrgModal(true)}
                                    className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                                >
                                    <PlusCircle size={16} />
                                    Nueva Empresa
                                </button>
                            </div>

                            <div className="space-y-3">
                                {userOrgs.map((orgRel) => (
                                    <div
                                        key={orgRel.organization_id}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${profile?.organization_id === orgRel.organization_id
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-200 hover:border-orange-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded flex items-center justify-center ${profile?.organization_id === orgRel.organization_id ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                <Building2 size={16} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-petrol-800">{orgRel.organizations?.name}</p>
                                                <p className="text-xs text-gray-500 capitalize">{orgRel.role}</p>
                                            </div>
                                        </div>

                                        {profile?.organization_id === orgRel.organization_id ? (
                                            <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full flex items-center gap-1">
                                                <CheckCircle size={12} /> Activa
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleSwitchOrganization(orgRel.organization_id)}
                                                disabled={switchingOrg}
                                                className="text-sm text-gray-600 hover:text-petrol-600 font-medium"
                                            >
                                                Cambiar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* New Org Modal */}
                        {showNewOrgModal && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-xl p-6 w-full max-w-md m-4">
                                    <h3 className="text-xl font-bold text-petrol-800 mb-4">Crear Nueva Empresa</h3>
                                    <input
                                        type="text"
                                        value={newOrgName}
                                        onChange={(e) => setNewOrgName(e.target.value)}
                                        placeholder="Nombre de la empresa"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 mb-4 focus:ring-2 focus:ring-orange-500"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowNewOrgModal(false)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleCreateOrganization}
                                            disabled={!newOrgName.trim() || loading}
                                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                                        >
                                            {loading ? 'Creando...' : 'Crear'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Create Superadmin Modal */}
                        {showCreateSuperadminModal && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-xl p-6 w-full max-w-md m-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Shield className="text-purple-500" size={24} />
                                        <h3 className="text-xl font-bold text-petrol-800">Crear Super Administrador</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={newSuperadminEmail}
                                                onChange={(e) => setNewSuperadminEmail(e.target.value)}
                                                placeholder="superadmin@ejemplo.com"
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nombre Completo
                                            </label>
                                            <input
                                                type="text"
                                                value={newSuperadminName}
                                                onChange={(e) => setNewSuperadminName(e.target.value)}
                                                placeholder="Juan Pérez"
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                            <p className="text-xs text-purple-700">
                                                ⚠️ El nuevo Super Administrador tendrá acceso completo a la organización y podrá crear más Super Administradores.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            onClick={() => {
                                                setShowCreateSuperadminModal(false);
                                                setNewSuperadminEmail('');
                                                setNewSuperadminName('');
                                            }}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleCreateSuperadmin}
                                            disabled={!newSuperadminEmail.trim() || !newSuperadminName.trim() || loading}
                                            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                                        >
                                            {loading ? 'Creando...' : 'Crear Super Admin'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}


                        <button
                            onClick={handleSaveOrganization}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Guardando...</span>
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle size={18} />
                                    <span>Guardado!</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Guardar Cambios</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </RoleGuard>



            {/* Database Connection Settings - Super Admin Only */}
            <RoleGuard allowedRoles={['super_admin']}>
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                            <Database className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-petrol-800">Conexión a Base de Datos</h2>
                            <p className="text-sm text-gray-600">Configuración avanzada de conexión Supabase</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        ⚠️ <strong>Zona de Peligro:</strong> Cambiar estos valores desconectará la aplicación de la base de datos actual.
                                        Asegúrate de tener las credenciales correctas.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Supabase URL
                            </label>
                            <input
                                type="text"
                                value={customSupabaseUrl}
                                onChange={(e) => setCustomSupabaseUrl(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="https://xyz.supabase.co"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Supabase Anon Key
                            </label>
                            <div className="relative">
                                <input
                                    type={showKeys.supabase ? 'text' : 'password'}
                                    value={customSupabaseKey}
                                    onChange={(e) => setCustomSupabaseKey(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent pr-20"
                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility('supabase')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                                >
                                    {showKeys.supabase ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 pt-2">
                            <button
                                onClick={handleSaveDatabaseSettings}
                                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                            >
                                <Save size={18} />
                                <span>Guardar y Reiniciar</span>
                            </button>

                            {(localStorage.getItem('custom_supabase_url') || localStorage.getItem('custom_supabase_key')) && (
                                <button
                                    onClick={handleResetDatabaseSettings}
                                    className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                                >
                                    <XCircle size={18} />
                                    <span>Restaurar Valores por Defecto</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </RoleGuard>

            {/* Advanced Configuration - Admin Only */}
            <RoleGuard allowedRoles={['admin', 'super_admin']}>
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                            <SettingsIcon className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-petrol-800">Configuración Avanzada</h2>
                            <p className="text-sm text-gray-600">Plantillas y servicios de IA</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Condiciones de Venta por Defecto
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Este texto se cargará automáticamente al crear nuevos productos
                            </p>
                            <RichTextEditor
                                value={defaultConditions}
                                onChange={setDefaultConditions}
                                placeholder="Garantía, plazos de entrega, formas de pago..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Forma de Pago por Defecto
                                </label>
                                <input
                                    type="text"
                                    value={defaultPaymentTerms}
                                    onChange={(e) => setDefaultPaymentTerms(e.target.value)}
                                    placeholder="Ej: 50% anticipo, 50% contra entrega"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Plazo de Entrega por Defecto
                                </label>
                                <input
                                    type="text"
                                    value={defaultDeliveryTime}
                                    onChange={(e) => setDefaultDeliveryTime(e.target.value)}
                                    placeholder="Ej: 15 a 20 días hábiles"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        {/* Gemini Key */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <div className="flex items-center gap-2">
                                    <Key size={16} />
                                    <span>API Key de Gemini AI (Google)</span>
                                </div>
                            </label>
                            <div className="relative">
                                <input
                                    type={showKeys.gemini ? 'text' : 'password'}
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-20"
                                    placeholder="AIza..."
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility('gemini')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                                >
                                    {showKeys.gemini ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <TestButton
                                    provider="gemini"
                                    onTest={() => handleTestAI('gemini')}
                                    status={testStatuses.gemini}
                                    message={testMessages.gemini}
                                />

                                {/* Botón de Diagnóstico General */}
                                <TestButton
                                    provider="network"
                                    onTest={handleTestNetwork}
                                    status={testStatuses['network']}
                                    message={testMessages['network']}
                                />
                            </div>
                        </div>

                        {/* OpenRouter - Xiaomi Key */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <div className="flex items-center gap-2">
                                    <Key size={16} />
                                    <span>API Key de Xiaomi MiMo (via OpenRouter)</span>
                                </div>
                            </label>
                            <div className="relative">
                                <input
                                    type={showKeys.openrouter ? 'text' : 'password'}
                                    value={openrouterApiKey}
                                    onChange={(e) => setOpenrouterApiKey(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-20"
                                    placeholder="sk-or-v1-..."
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility('openrouter')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                                >
                                    {showKeys.openrouter ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>
                            <TestButton
                                provider="xiaomi"
                                onTest={handleTestAI}
                                status={testStatuses.xiaomi}
                                message={testMessages.xiaomi}
                            />
                        </div>

                        {/* Qwen Key */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <div className="flex items-center gap-2">
                                    <Key size={16} />
                                    <span>API Key de Qwen (DashScope / Directo)</span>
                                </div>
                            </label>
                            <div className="relative">
                                <input
                                    type={showKeys.qwen ? 'text' : 'password'}
                                    value={qwenApiKey}
                                    onChange={(e) => setQwenApiKey(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-20"
                                    placeholder="sk-..."
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility('qwen')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                                >
                                    {showKeys.qwen ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>
                            <TestButton
                                provider="qwen"
                                onTest={handleTestAI}
                                status={testStatuses.qwen}
                                message={testMessages.qwen}
                            />
                        </div>

                        {/* Z.ai Key */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <div className="flex items-center gap-2">
                                    <Key size={16} />
                                    <span>API Key de Z.ai (GLM Models)</span>
                                </div>
                            </label>
                            <div className="relative">
                                <input
                                    type={showKeys.zai ? 'text' : 'password'}
                                    value={zaiApiKey}
                                    onChange={(e) => setZaiApiKey(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-20"
                                    placeholder="Key de Z.ai..."
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility('zai')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                                >
                                    {showKeys.zai ? 'Ocultar' : 'Mostrar'}
                                </button>
                            </div>
                            <TestButton
                                provider="zai"
                                onTest={handleTestAI}
                                status={testStatuses.zai}
                                message={testMessages.zai}
                            />
                        </div>

                        {/* Resend API Key and From Email */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Mail size={16} className="text-orange-500" />
                                <span>Configuración de Email (Resend)</span>
                            </h4>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                                            <Mail size={16} className="text-orange-500" />
                                            API Key de Resend (Email Service)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showKeys.resend ? "text" : "password"}
                                                value={resendApiKey}
                                                onChange={(e) => setResendApiKey(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-20"
                                                placeholder="re_..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => toggleKeyVisibility('resend')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500 hover:text-gray-700"
                                            >
                                                {showKeys.resend ? 'Ocultar' : 'Mostrar'}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                                            <Mail size={16} className="text-blue-500" />
                                            Email Remitente (Verificado en Resend)
                                        </label>
                                        <input
                                            type="email"
                                            value={resendFromEmail}
                                            onChange={(e) => setResendFromEmail(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="ej: cotizaciones@alfapack.cl"
                                        />
                                        {(!resendFromEmail || resendFromEmail === 'onboarding@resend.dev') && (
                                            <p className="text-[10px] text-orange-600 font-bold mt-1">
                                                ⚠️ DEBES cambiar esto por un correo de tu dominio (ej: cotizaciones@alfapack.cl) para enviar a externos.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleTestConnection('resend')}
                                    disabled={testStatuses.resend === 'testing' || !resendApiKey}
                                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {testStatuses.resend === 'testing' ? (
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <RotateCw size={14} className={testStatuses.resend === 'success' ? 'text-green-500' : ''} />
                                    )}
                                    Probar Envío (Email a {user.email})
                                </button>

                                {testMessages.resend && (
                                    <div className={`p-3 rounded-lg text-xs font-medium ${testStatuses.resend === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {testMessages.resend}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Cloudflare DB Configuration */}
                        <div className="pt-4 border-t border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Database size={16} className="text-blue-500" />
                                <span>Cloudflare D1 (Secondary Database)</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Database ID
                                    </label>
                                    <input
                                        type="text"
                                        value={cloudflareDatabaseId}
                                        onChange={(e) => setCloudflareDatabaseId(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        API Token
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showKeys.cloudflare ? 'text' : 'password'}
                                            value={cloudflareApiToken}
                                            onChange={(e) => setCloudflareApiToken(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20"
                                            placeholder="Token de Cloudflare..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => toggleKeyVisibility('cloudflare')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                                        >
                                            {showKeys.cloudflare ? 'Ocultar' : 'Mostrar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Routing Configuration */}
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mt-4">
                            <h3 className="text-md font-bold text-purple-800 mb-4 flex items-center gap-2">
                                <SettingsIcon size={18} />
                                Enrutamiento de Tareas AI (Arquitectura Híbrida)
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.keys(aiTaskRouting).map(task => (
                                    <div key={task}>
                                        <label className="block text-xs font-bold text-purple-700 uppercase mb-1">
                                            Tarea: {task === 'insights' ? 'Análisis de Ventas (Kaizen)' :
                                                task === 'followup' ? 'Estrategia de Seguimiento' :
                                                    task === 'marketing' ? 'Redacción de Emails/Mensajes' :
                                                        task === 'data_extraction' ? 'Extracción de Datos Técnicos' : task}
                                        </label>
                                        <select
                                            value={aiTaskRouting[task]}
                                            onChange={(e) => setAiTaskRouting({ ...aiTaskRouting, [task]: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-500 text-sm"
                                        >
                                            <option value="gemini">Gemini 2.0 (Analista Pro)</option>
                                            <option value="xiaomi">Xiaomi MiMo (Asistente Rápido - Gratis)</option>
                                            <option value="qwen">Qwen 2.5 (Especialista en Datos)</option>
                                            <option value="zai">Z.ai GLM (Razonamiento Complejo)</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sidebar Customization */}
                        <div className="pt-6 border-t border-gray-100">
                            <h3 className="text-md font-semibold text-petrol-800 mb-4 flex items-center gap-2">
                                <Building2 size={18} className="text-purple-500" />
                                Personalización de Marca (Sidebar)
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Sidebar Background Color */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fondo de la Barra Lateral
                                    </label>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Color de fondo de la barra de navegación izquierda
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            value={sidebarBgColor}
                                            onChange={(e) => setSidebarBgColor(e.target.value)}
                                            className="h-10 w-20 rounded border border-gray-300 cursor-pointer shadow-sm"
                                        />
                                        <input
                                            type="text"
                                            value={sidebarBgColor}
                                            onChange={(e) => setSidebarBgColor(e.target.value)}
                                            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 font-mono text-sm w-32"
                                            placeholder="#0f3242"
                                        />
                                        <div
                                            className="w-10 h-10 rounded-lg shadow-inner"
                                            style={{ backgroundColor: sidebarBgColor }}
                                        />
                                    </div>
                                </div>

                                {/* Sidebar Accent Color (Logo Square) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Color de Fondo Logo (Cuadrado)
                                    </label>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Color de fondo para el recuadro del logo en el sidebar
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            value={sidebarAccentColor}
                                            onChange={(e) => setSidebarAccentColor(e.target.value)}
                                            className="h-10 w-20 rounded border border-gray-300 cursor-pointer shadow-sm"
                                        />
                                        <input
                                            type="text"
                                            value={sidebarAccentColor}
                                            onChange={(e) => setSidebarAccentColor(e.target.value)}
                                            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 font-mono text-sm w-32"
                                            placeholder="#f97316"
                                        />
                                        <div
                                            className="w-10 h-10 rounded-lg shadow-inner"
                                            style={{ backgroundColor: sidebarAccentColor }}
                                        />
                                    </div>
                                </div>

                                {/* Sidebar Active Item Color */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Color de Menú Activo (Botón)
                                    </label>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Color de fondo para la opción seleccionada en el menú
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            value={sidebarActiveItemColor}
                                            onChange={(e) => setSidebarActiveItemColor(e.target.value)}
                                            className="h-10 w-20 rounded border border-gray-300 cursor-pointer shadow-sm"
                                        />
                                        <input
                                            type="text"
                                            value={sidebarActiveItemColor}
                                            onChange={(e) => setSidebarActiveItemColor(e.target.value)}
                                            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 font-mono text-sm w-32"
                                            placeholder="#f97316"
                                        />
                                        <div
                                            className="w-10 h-10 rounded-lg shadow-inner"
                                            style={{ backgroundColor: sidebarActiveItemColor }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                                {/* Sidebar Text Color */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Color de Texto en Sidebar
                                    </label>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Color de los nombres y correos en el menú
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            value={sidebarTextColor}
                                            onChange={(e) => setSidebarTextColor(e.target.value)}
                                            className="h-10 w-20 rounded border border-gray-300 cursor-pointer shadow-sm"
                                        />
                                        <input
                                            type="text"
                                            value={sidebarTextColor}
                                            onChange={(e) => setSidebarTextColor(e.target.value)}
                                            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 font-mono text-sm w-32"
                                            placeholder="#ffffff"
                                        />
                                        <div
                                            className="w-10 h-10 rounded-lg shadow-inner flex items-center justify-center font-bold"
                                            style={{ backgroundColor: sidebarBgColor, color: sidebarTextColor }}
                                        >
                                            Abc
                                        </div>
                                    </div>
                                </div>

                                {/* App Background Color */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Color de Fondo de la App
                                    </label>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Color de fondo general de toda la aplicación
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            value={appBgColor}
                                            onChange={(e) => setAppBgColor(e.target.value)}
                                            className="h-10 w-20 rounded border border-gray-300 cursor-pointer shadow-sm"
                                        />
                                        <input
                                            type="text"
                                            value={appBgColor}
                                            onChange={(e) => setAppBgColor(e.target.value)}
                                            className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 font-mono text-sm w-32"
                                            placeholder="#fdfbf7"
                                        />
                                        <div
                                            className="w-10 h-10 rounded-lg shadow-inner border border-gray-200"
                                            style={{ backgroundColor: appBgColor }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Appwrite Configuration (Híbrida) */}
                            <div className="space-y-6 pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                                        <Database size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-petrol-800">Appwrite (Arquitectura Híbrida)</h3>
                                        <p className="text-sm text-gray-500">Configura Appwrite como base de datos para alta velocidad.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-11">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Appwrite Endpoint</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-pink-500 outline-none transition-all font-medium"
                                            placeholder="https://cloud.appwrite.io/v1"
                                            value={appwriteEndpoint}
                                            onChange={(e) => setAppwriteEndpoint(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Appwrite Project ID</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-pink-500 outline-none transition-all font-medium"
                                            placeholder="project_id_..."
                                            value={appwriteProjectId}
                                            onChange={(e) => setAppwriteProjectId(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Appwrite Database ID</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-pink-500 outline-none transition-all font-medium"
                                            placeholder="database_id_..."
                                            value={appwriteDatabaseId}
                                            onChange={(e) => setAppwriteDatabaseId(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Appwrite API Key</label>
                                        <div className="relative">
                                            <input
                                                type={showKeys.appwrite ? "text" : "password"}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-pink-500 outline-none transition-all font-medium pr-10"
                                                placeholder="sk_..."
                                                value={appwriteApiKey}
                                                onChange={(e) => setAppwriteApiKey(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => toggleKeyVisibility('appwrite')}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showKeys.appwrite ? <XCircle size={18} /> : <RotateCw size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quote Header Border Color */}
                            <div className="pt-6 border-t border-gray-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Color del Borde de Cotizaciones (PDF/Vista Previa)
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Personaliza el color del borde en las cotizaciones
                                </p>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="color"
                                        value={quoteHeaderBorderColor}
                                        onChange={(e) => setQuoteHeaderBorderColor(e.target.value)}
                                        className="h-10 w-20 rounded border border-gray-300 cursor-pointer shadow-sm"
                                    />
                                    <input
                                        type="text"
                                        value={quoteHeaderBorderColor}
                                        onChange={(e) => setQuoteHeaderBorderColor(e.target.value)}
                                        className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 font-mono text-sm w-32"
                                        placeholder="#6B7280"
                                    />
                                    <div
                                        className="w-10 h-10 rounded-lg border-2"
                                        style={{ borderColor: quoteHeaderBorderColor }}
                                    />
                                </div>
                            </div>

                            {/* Quote Logo Background Color */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fondo del Logo en Cotización
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Personaliza el fondo del recuadro del logo en el PDF.
                                </p>
                                <div className="flex items-center gap-4 mb-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={quoteLogoBgTransparent}
                                            onChange={(e) => setQuoteLogoBgTransparent(e.target.checked)}
                                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                        />
                                        <span className="text-sm text-gray-700">Fondo Transparente / Ocultar Recuadro</span>
                                    </label>
                                </div>

                                {
                                    !quoteLogoBgTransparent && (
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="color"
                                                value={quoteLogoBgColor}
                                                onChange={(e) => setQuoteLogoBgColor(e.target.value)}
                                                className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={quoteLogoBgColor}
                                                onChange={(e) => setQuoteLogoBgColor(e.target.value)}
                                                className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                                                placeholder="#FFFFFF"
                                                pattern="^#[0-9A-Fa-f]{6}$"
                                            />
                                            <div
                                                className="w-10 h-10 rounded border-2 border-gray-300"
                                                style={{ backgroundColor: quoteLogoBgColor }}
                                                title="Vista previa del color"
                                            />
                                        </div>
                                    )
                                }
                            </div>

                            {/* SKU Visibility setting */}
                            <div className="pt-4 border-t border-purple-100">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Visibilidad de SKU
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                    Decide si el código de producto (SKU) se muestra en las cotizaciones PDF y web.
                                </p>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showSkuInQuotes}
                                            onChange={(e) => setShowSkuInQuotes(e.target.checked)}
                                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                        />
                                        <span className="text-sm text-gray-700">Mostrar SKU en cotizaciones</span>
                                    </label>
                                </div>
                            </div>

                        </div>

                        {
                            message && (
                                <div className={`p-4 mb-4 rounded-lg ${success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {message}
                                </div>
                            )
                        }

                        <button
                            onClick={handleSaveAdvancedSettings}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Guardando...</span>
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle size={18} />
                                    <span>Guardado!</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Guardar Cambios</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </RoleGuard>

            {/* Multi-CRM Integration - Super Admin Only */}
            <RoleGuard allowedRoles={['super_admin']}>
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <LinkIcon className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-petrol-800">Integraciones CRM</h2>
                            <p className="text-sm text-gray-600">Configura conexiones con tus sistemas CRM</p>
                        </div>
                    </div>

                    {/* PIPEDRIVE SPECIFIC SETTINGS SEPARATION */}
                    <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
                        <h3 className="text-sm font-bold text-orange-900 uppercase mb-3 flex items-center gap-2">
                            <LinkIcon size={14} /> Configuración Pipedrive
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100 shadow-sm">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Sincronizar Datos</p>
                                    <p className="text-[10px] text-gray-500">Personas, Organizaciones y Tratos/Deals</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <div className="text-xs mr-2 text-gray-400 font-mono">EN CRM PANEL</div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100 shadow-sm">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Sincronizar Archivos (PDF)</p>
                                    <p className="text-[10px] text-gray-500">Subir PDFs automáticamente al historial</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={pipedriveFileSyncEnabled}
                                        onChange={(e) => setPipedriveFileSyncEnabled(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                </label>
                            </div>
                        </div>
                        <p className="mt-3 text-[10px] text-orange-700 italic">
                            * Nota: Para que el historial de archivos funcione, el CRM Pipedrive debe estar activo en el panel de abajo.
                        </p>
                    </div>

                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                            💡 <strong>Gestión Multi-CRM:</strong> Puedes activar múltiples CRMs simultáneamente.
                            La búsqueda de clientes buscará en todos los CRMs activos automáticamente.
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100 mb-6">
                        <div>
                            <h4 className="font-bold text-purple-900">CRM Interno (Propio de la App)</h4>
                            <p className="text-sm text-purple-700">Activa esta opción para gestionar tus clientes directamente en Alfapack.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={useInternalCrm}
                                onChange={(e) => setUseInternalCrm(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Pipedrive */}
                        <CRMConfigurationPanel
                            crmType="pipedrive"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Pipedrive saved')}
                        />
                        {/* HubSpot */}
                        <CRMConfigurationPanel
                            crmType="hubspot"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('HubSpot saved')}
                        />
                        {/* Odoo CRM */}
                        <CRMConfigurationPanel
                            crmType="odoo"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Odoo saved')}
                        />
                        {/* Defontana */}
                        <CRMConfigurationPanel
                            crmType="defontana"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Defontana saved')}
                        />
                        {/* GoldMine */}
                        <CRMConfigurationPanel
                            crmType="goldmine"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('GoldMine saved')}
                        />
                        {/* Upnify */}
                        <CRMConfigurationPanel
                            crmType="upnify"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Upnify saved')}
                        />
                        {/* CRMChile */}
                        <CRMConfigurationPanel
                            crmType="crmchile"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('CRMChile saved')}
                        />
                        {/* Simply */}
                        <CRMConfigurationPanel
                            crmType="simply"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Simply saved')}
                        />
                        {/* SAP CRM */}
                        <CRMConfigurationPanel
                            crmType="sap"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('SAP saved')}
                        />
                        {/* DataCRM */}
                        <CRMConfigurationPanel
                            crmType="datacrm"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('DataCRM saved')}
                        />
                        {/* NetSuite CRM */}
                        <CRMConfigurationPanel
                            crmType="netsuite"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('NetSuite saved')}
                        />
                        {/* Oracle Siebel */}
                        <CRMConfigurationPanel
                            crmType="siebel"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Siebel saved')}
                        />
                        {/* Salesforce */}
                        <CRMConfigurationPanel
                            crmType="salesforce"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Salesforce saved')}
                        />
                        {/* Zoho CRM */}
                        <CRMConfigurationPanel
                            crmType="zoho"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Zoho saved')}
                        />
                        {/* Bitrix24 */}
                        <CRMConfigurationPanel
                            crmType="bitrix24"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Bitrix24 saved')}
                        />
                        {/* Freshsales */}
                        <CRMConfigurationPanel
                            crmType="freshsales"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Freshsales saved')}
                        />
                        {/* Microsoft Dynamics 365 */}
                        <CRMConfigurationPanel
                            crmType="dynamics365"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Dynamics 365 saved')}
                        />
                        {/* SugarCRM */}
                        <CRMConfigurationPanel
                            crmType="sugarcrm"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('SugarCRM saved')}
                        />
                        {/* Insightly */}
                        <CRMConfigurationPanel
                            crmType="insightly"
                            organizationId={profile?.organization_id}
                            onSave={() => console.log('Insightly saved')}
                        />
                    </div>
                </div>
            </RoleGuard>

            {/* User Profile Settings - All Users */}
            <div className="glass-panel p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <User className="text-white" size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-petrol-800">Mi Perfil</h2>
                        <p className="text-sm text-gray-600">Información personal</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre Completo
                        </label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Tu nombre completo"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            El email no puede ser modificado
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Teléfono / Celular
                        </label>
                        <input
                            type="tel"
                            value={userPhone}
                            onChange={(e) => setUserPhone(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="+56 9 1234 5678"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Este teléfono aparecerá en las cotizaciones que crees
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rol
                        </label>
                        <div className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-50">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-petrol-100 text-petrol-800">
                                {profile?.role === 'super_admin' ? 'Super Administrador' :
                                    profile?.role === 'admin' ? 'Administrador' : 'Vendedor'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveProfile}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Guardando...</span>
                            </>
                        ) : success ? (
                            <>
                                <CheckCircle size={18} />
                                <span>Guardado!</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Guardar Cambios</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
