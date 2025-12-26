import { supabase } from '../lib/supabase';

/**
 * Generic CRM Service
 * Handles all CRM-related operations for the frontend
 */

export const crmService = {
    /**
     * Get all CRM configurations for an organization
     */
    async getCRMConfigurations(organizationId) {
        try {
            const { data, error } = await supabase
                .from('crm_configurations')
                .select(`
          *,
          crm_field_mappings (*)
        `)
                .eq('organization_id', organizationId)
                .order('crm_type');

            if (error) throw error;
            return { success: true, configurations: data || [] };
        } catch (error) {
            console.error('Error fetching CRM configurations:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get a specific CRM configuration
     */
    async getCRMConfiguration(organizationId, crmType) {
        try {
            const { data, error } = await supabase
                .from('crm_configurations')
                .select(`
          *,
          crm_field_mappings (*)
        `)
                .eq('organization_id', organizationId)
                .eq('crm_type', crmType)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
            return { success: true, configuration: data };
        } catch (error) {
            console.error('Error fetching CRM configuration:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Save or update a CRM configuration
     */
    async saveCRMConfiguration(organizationId, crmType, credentials, settings = {}, isEnabled = false) {
        try {
            const { data, error } = await supabase
                .from('crm_configurations')
                .upsert({
                    organization_id: organizationId,
                    crm_type: crmType,
                    credentials: credentials,
                    settings: settings,
                    is_enabled: isEnabled
                }, {
                    onConflict: 'organization_id,crm_type'
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, configuration: data };
        } catch (error) {
            console.error('Error saving CRM configuration:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Toggle CRM enabled status
     */
    async toggleCRM(configId, isEnabled) {
        try {
            const { data, error } = await supabase
                .from('crm_configurations')
                .update({ is_enabled: isEnabled })
                .eq('id', configId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, configuration: data };
        } catch (error) {
            console.error('Error toggling CRM:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete a CRM configuration
     */
    async deleteCRMConfiguration(configId) {
        try {
            const { error } = await supabase
                .from('crm_configurations')
                .delete()
                .eq('id', configId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting CRM configuration:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Test CRM connection
     */
    async testConnection(crmType, credentials) {
        try {
            const { data, error } = await supabase.functions.invoke('test-crm-connection', {
                body: {
                    crmType,
                    credentials
                }
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error testing CRM connection:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Search clients across all enabled CRMs
     */
    async searchClients(organizationId, searchTerm) {
        try {
            const { data, error } = await supabase.functions.invoke('search-crm-clients', {
                body: {
                    organizationId,
                    searchTerm,
                    limit: 20
                }
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error searching clients:', error);
            return { success: false, error: error.message, clients: [] };
        }
    },

    /**
     * Sync a deal/quote to CRM
     */
    async syncDeal(crmType, organizationId, dealData) {
        try {
            const { data, error } = await supabase.functions.invoke('sync-crm-deal', {
                body: {
                    crmType,
                    organizationId,
                    dealData
                }
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error syncing deal:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Save field mappings for a CRM configuration
     */
    async saveFieldMappings(crmConfigId, mappings) {
        try {
            // Delete existing mappings
            await supabase
                .from('crm_field_mappings')
                .delete()
                .eq('crm_config_id', crmConfigId);

            // Insert new mappings
            const mappingsToInsert = mappings.map(m => ({
                crm_config_id: crmConfigId,
                crm_field_name: m.crmField,
                internal_field_name: m.internalField,
                field_type: m.fieldType || 'string',
                is_required: m.isRequired || false,
                transform_function: m.transformFunction || null
            }));

            const { data, error } = await supabase
                .from('crm_field_mappings')
                .insert(mappingsToInsert)
                .select();

            if (error) throw error;
            return { success: true, mappings: data };
        } catch (error) {
            console.error('Error saving field mappings:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get CRM metadata (name, icon, required fields, etc.)
     */
    getCRMMetadata(crmType) {
        const metadata = {
            pipedrive: {
                name: 'Pipedrive',
                icon: '🔵',
                color: 'green',
                requiredFields: ['api_token', 'company_domain'],
                fields: [
                    { name: 'api_token', label: 'API Token', type: 'password', required: true },
                    { name: 'company_domain', label: 'Company Domain', type: 'text', required: true, placeholder: 'mycompany' }
                ]
            },
            goldmine: {
                name: 'GoldMine',
                icon: '🟡',
                color: 'yellow',
                requiredFields: ['server_url', 'username', 'password'],
                fields: [
                    { name: 'server_url', label: 'Server URL', type: 'url', required: true },
                    { name: 'database_name', label: 'Database Name', type: 'text', required: true },
                    { name: 'username', label: 'Username', type: 'text', required: true },
                    { name: 'password', label: 'Password', type: 'password', required: true },
                    { name: 'api_key', label: 'API Key', type: 'password', required: false }
                ]
            },
            hubspot: {
                name: 'HubSpot',
                icon: '🟠',
                color: 'orange',
                requiredFields: ['access_token'],
                fields: [
                    { name: 'access_token', label: 'Access Token', type: 'password', required: true },
                    { name: 'portal_id', label: 'Portal ID', type: 'text', required: false }
                ]
            },
            defontana: {
                name: 'Defontana',
                icon: '🔴',
                color: 'red',
                requiredFields: ['api_key', 'company_id'],
                fields: [
                    { name: 'api_key', label: 'API Key', type: 'password', required: true },
                    { name: 'company_id', label: 'Company ID', type: 'text', required: true }
                ]
            },
            odoo: {
                name: 'Odoo CRM',
                icon: '🟣',
                color: 'purple',
                requiredFields: ['url', 'database', 'username', 'api_key'],
                fields: [
                    { name: 'url', label: 'Odoo URL', type: 'url', required: true },
                    { name: 'database', label: 'Database Name', type: 'text', required: true },
                    { name: 'username', label: 'Username', type: 'text', required: true },
                    { name: 'api_key', label: 'API Key', type: 'password', required: true }
                ]
            },
            upnify: {
                name: 'Upnify',
                icon: '🔵',
                color: 'blue',
                requiredFields: ['api_key', 'account_id'],
                fields: [
                    { name: 'api_key', label: 'API Key', type: 'password', required: true },
                    { name: 'account_id', label: 'Account ID', type: 'text', required: true }
                ]
            },
            crmchile: {
                name: 'CRMChile',
                icon: '🇨🇱',
                color: 'red',
                requiredFields: ['api_key', 'company_id'],
                fields: [
                    { name: 'api_key', label: 'API Key', type: 'password', required: true },
                    { name: 'company_id', label: 'Company ID', type: 'text', required: true }
                ]
            },
            simply: {
                name: 'Simply CRM',
                icon: '⚪',
                color: 'gray',
                requiredFields: ['api_token', 'subdomain'],
                fields: [
                    { name: 'api_token', label: 'API Token', type: 'password', required: true },
                    { name: 'subdomain', label: 'Subdomain', type: 'text', required: true }
                ]
            },
            sap: {
                name: 'SAP CRM',
                icon: '🔷',
                color: 'blue',
                requiredFields: ['tenant_url', 'client_id', 'client_secret'],
                fields: [
                    { name: 'tenant_url', label: 'Tenant URL', type: 'url', required: true },
                    { name: 'client_id', label: 'Client ID', type: 'text', required: true },
                    { name: 'client_secret', label: 'Client Secret', type: 'password', required: true }
                ]
            },
            datacrm: {
                name: 'DataCRM',
                icon: '📊',
                color: 'indigo',
                requiredFields: ['api_key', 'account_id'],
                fields: [
                    { name: 'api_key', label: 'API Key', type: 'password', required: true },
                    { name: 'account_id', label: 'Account ID', type: 'text', required: true }
                ]
            },
            netsuite: {
                name: 'NetSuite CRM',
                icon: '🟦',
                color: 'blue',
                requiredFields: ['account_id', 'consumer_key', 'consumer_secret', 'token_id', 'token_secret'],
                fields: [
                    { name: 'account_id', label: 'Account ID', type: 'text', required: true },
                    { name: 'consumer_key', label: 'Consumer Key', type: 'text', required: true },
                    { name: 'consumer_secret', label: 'Consumer Secret', type: 'password', required: true },
                    { name: 'token_id', label: 'Token ID', type: 'text', required: true },
                    { name: 'token_secret', label: 'Token Secret', type: 'password', required: true }
                ]
            },
            siebel: {
                name: 'Oracle Siebel',
                icon: '🔶',
                color: 'orange',
                requiredFields: ['url', 'username', 'password'],
                fields: [
                    { name: 'url', label: 'Siebel Server URL', type: 'url', required: true },
                    { name: 'username', label: 'Username', type: 'text', required: true },
                    { name: 'password', label: 'Password', type: 'password', required: true },
                    { name: 'language', label: 'Language Code', type: 'text', required: false, placeholder: 'ENU' }
                ]
            },
            salesforce: {
                name: 'Salesforce',
                icon: '☁️',
                color: 'blue',
                requiredFields: ['instance_url', 'access_token'],
                fields: [
                    { name: 'instance_url', label: 'Instance URL', type: 'url', required: true, placeholder: 'https://yourcompany.salesforce.com' },
                    { name: 'access_token', label: 'Access Token (OAuth 2.0)', type: 'password', required: true },
                    { name: 'refresh_token', label: 'Refresh Token', type: 'password', required: false }
                ]
            },
            zoho: {
                name: 'Zoho CRM',
                icon: '🟣',
                color: 'purple',
                requiredFields: ['api_domain', 'access_token'],
                fields: [
                    { name: 'api_domain', label: 'API Domain', type: 'url', required: true, placeholder: 'https://www.zohoapis.com' },
                    { name: 'access_token', label: 'Access Token (OAuth 2.0)', type: 'password', required: true },
                    { name: 'refresh_token', label: 'Refresh Token', type: 'password', required: false }
                ]
            },
            bitrix24: {
                name: 'Bitrix24',
                icon: '🔵',
                color: 'blue',
                requiredFields: ['domain', 'webhook_url'],
                fields: [
                    { name: 'domain', label: 'Bitrix24 Domain', type: 'text', required: true, placeholder: 'yourcompany.bitrix24.com' },
                    { name: 'webhook_url', label: 'Webhook URL', type: 'url', required: true }
                ]
            },
            freshsales: {
                name: 'Freshsales',
                icon: '🟢',
                color: 'green',
                requiredFields: ['domain', 'api_key'],
                fields: [
                    { name: 'domain', label: 'Freshsales Domain', type: 'text', required: true, placeholder: 'yourcompany.freshsales.io' },
                    { name: 'api_key', label: 'API Key', type: 'password', required: true }
                ]
            },
            dynamics365: {
                name: 'Microsoft Dynamics 365',
                icon: '🔷',
                color: 'blue',
                requiredFields: ['organization_url', 'client_id', 'client_secret'],
                fields: [
                    { name: 'organization_url', label: 'Organization URL', type: 'url', required: true, placeholder: 'https://yourorg.crm.dynamics.com' },
                    { name: 'client_id', label: 'Client ID', type: 'text', required: true },
                    { name: 'client_secret', label: 'Client Secret', type: 'password', required: true },
                    { name: 'tenant_id', label: 'Tenant ID', type: 'text', required: true }
                ]
            },
            sugarcrm: {
                name: 'SugarCRM',
                icon: '🍬',
                color: 'pink',
                requiredFields: ['url', 'username', 'password'],
                fields: [
                    { name: 'url', label: 'SugarCRM URL', type: 'url', required: true },
                    { name: 'username', label: 'Username', type: 'text', required: true },
                    { name: 'password', label: 'Password', type: 'password', required: true }
                ]
            },
            insightly: {
                name: 'Insightly',
                icon: '👁️',
                color: 'indigo',
                requiredFields: ['api_key'],
                fields: [
                    { name: 'api_key', label: 'API Key', type: 'password', required: true }
                ]
            }
        };

        return metadata[crmType] || {
            name: crmType,
            icon: '❓',
            color: 'gray',
            requiredFields: [],
            fields: []
        };
    }
};

export default crmService;
