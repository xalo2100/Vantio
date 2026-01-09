import { supabase } from '../lib/supabase';

/**
 * Servicio de integración con Pipedrive CRM
 * IMPORTANTE: Todas las llamadas a Pipedrive API se hacen a través de Edge Functions
 * para mantener el API token seguro y nunca exponerlo al frontend
 */

export const pipedriveService = {
    /**
     * Verificar si Pipedrive está configurado
     */
    checkConfiguration: async (organizationId) => {
        try {
            const { data, error } = await supabase
                .from('organization_settings')
                .select('pipedrive_sync_enabled, pipedrive_company_domain')
                .eq('organization_id', organizationId)
                .single();

            if (error) throw error;

            return {
                success: true,
                configured: !!(data?.pipedrive_sync_enabled && data?.pipedrive_company_domain)
            };
        } catch (error) {
            console.error('Error checking Pipedrive configuration:', error);
            return { success: false, configured: false };
        }
    },

    /**
     * Guardar configuración de Pipedrive (solo admins)
     * El API token se encripta automáticamente en Supabase
     */
    saveConfiguration: async (organizationId, config) => {
        try {
            const { error } = await supabase
                .from('organization_settings')
                .update({
                    pipedrive_api_token: config.apiToken, // Supabase lo encripta
                    pipedrive_company_domain: config.companyDomain,
                    pipedrive_sync_enabled: config.syncEnabled
                })
                .eq('organization_id', organizationId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error saving Pipedrive configuration:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Probar conexión con Pipedrive
     * Se hace a través de Edge Function que maneja el token de forma segura
     */
    testConnection: async (organizationId) => {
        try {
            const { data, error } = await supabase.functions.invoke('pipedrive-test-connection', {
                body: { organizationId }
            });

            if (error) throw error;
            return { success: true, connected: data.connected, user: data.user };
        } catch (error) {
            console.error('Error testing Pipedrive connection:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Sincronizar cliente y cotización a Pipedrive
     * Crea Person y Deal en Pipedrive, asignado al vendedor que creó la cotización
     * SEGURO: Todo se maneja server-side
     */
    syncQuoteToPipedrive: async (quoteId, sellerEmail) => {
        try {
            const { data, error } = await supabase.functions.invoke('pipedrive-sync-quote', {
                body: {
                    quoteId,
                    sellerEmail
                }
            });

            if (error) throw error;

            return {
                success: true,
                personId: data.personId,
                dealId: data.dealId,
                message: data.message
            };
        } catch (error) {
            console.error('Error syncing quote to Pipedrive:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Sincronizar cliente a Pipedrive
     * Crea Person en Pipedrive asignado al vendedor correcto
     * SEGURO: Todo se maneja server-side
     */
    syncClientToPipedrive: async (quoteId, clientData, sellerEmail, organizationId) => {
        try {
            const { data, error } = await supabase.functions.invoke('sync-client-to-pipedrive', {
                body: {
                    quoteId,
                    clientName: clientData.name,
                    clientEmail: clientData.email,
                    companyName: clientData.company,
                    clientPhone: clientData.phone,
                    clientRut: clientData.rut,
                    clientCity: clientData.city,
                    clientAddress: clientData.address,
                    sellerEmail,
                    organizationId
                }
            });

            if (error) throw error;

            return {
                success: true,
                personId: data.personId,
                action: data.action,
                message: data.message
            };
        } catch (error) {
            console.error('Error syncing client to Pipedrive:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Importar contactos desde Pipedrive
     * SEGURO: Edge Function maneja el API token
     */
    importContacts: async (organizationId, limit = 500) => {
        try {
            const { data, error } = await supabase.functions.invoke('pipedrive-import-contacts', {
                body: {
                    organizationId,
                    limit
                }
            });

            if (error) throw error;

            return {
                success: true,
                contacts: data.contacts,
                count: data.count
            };
        } catch (error) {
            console.error('Error importing contacts from Pipedrive:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Buscar clientes en Pipedrive en tiempo real
     */
    searchClients: async (searchTerm, organizationId, limit = 10) => {
        try {
            const { data, error } = await supabase.functions.invoke('search-crm-clients', {
                body: {
                    searchTerm,
                    organizationId,
                    limit
                }
            });

            if (error) throw error;

            return {
                success: true,
                clients: data.clients || [],
                count: data.count || 0
            };
        } catch (error) {
            console.error('Error searching clients in Pipedrive:', error);
            return { success: false, error: error.message, clients: [] };
        }
    },

    /**
     * Obtener detalles completos de una persona en Pipedrive
     */
    getPersonDetails: async (personId, organizationId, type = 'person') => {
        try {
            const { data, error } = await supabase.functions.invoke('get-pipedrive-person-details', {
                body: {
                    entityId: personId,
                    organizationId,
                    type
                }
            });

            if (error) throw error;

            return {
                success: true,
                ...data
            };
        } catch (error) {
            console.error('Error fetching Pipedrive person details:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Subir un archivo a Pipedrive y asociarlo a un Deal o Persona
     */
    uploadFile: async ({ fileUrl, fileName, dealId, personId, quoteId, organizationId }) => {
        try {
            const { data, error } = await supabase.functions.invoke('pipedrive-upload-file', {
                body: {
                    fileUrl,
                    fileName,
                    dealId,
                    personId,
                    quoteId,
                    organizationId
                }
            });

            if (error) throw error;

            return {
                success: true,
                fileId: data.fileId,
                message: data.message
            };
        } catch (error) {
            console.error('Error uploading file to Pipedrive:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Obtener historial de sincronización
     */
    getSyncLog: async (organizationId, limit = 50) => {
        try {
            const { data, error } = await supabase
                .from('pipedrive_sync_log')
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { success: true, logs: data || [] };
        } catch (error) {
            console.error('Error fetching sync log:', error);
            return { success: false, error: error.message, logs: [] };
        }
    },

    /**
     * Obtener estadísticas de sincronización
     */
    getSyncStats: async (organizationId) => {
        try {
            const { data, error } = await supabase
                .from('pipedrive_sync_log')
                .select('status, entity_type')
                .eq('organization_id', organizationId);

            if (error) throw error;

            const stats = {
                total: data.length,
                success: data.filter(l => l.status === 'success').length,
                failed: data.filter(l => l.status === 'failed').length,
                pending: data.filter(l => l.status === 'pending').length,
                byType: {
                    person: data.filter(l => l.entity_type === 'person').length,
                    deal: data.filter(l => l.entity_type === 'deal').length
                }
            };

            return { success: true, stats };
        } catch (error) {
            console.error('Error fetching sync stats:', error);
            return { success: false, stats: null };
        }
    },

    /**
     * Reintentar sincronización fallida
     */
    retrySyncItem: async (logId) => {
        try {
            // Obtener el item del log
            const { data: logItem, error: logError } = await supabase
                .from('pipedrive_sync_log')
                .select('*')
                .eq('id', logId)
                .single();

            if (logError) throw logError;

            // Reintentar según el tipo
            if (logItem.entity_type === 'deal') {
                // Llamar a Edge Function para reintentar
                const { data, error } = await supabase.functions.invoke('pipedrive-retry-sync', {
                    body: {
                        logId,
                        entityId: logItem.entity_id
                    }
                });

                if (error) throw error;
                return { success: true, result: data };
            }

            return { success: false, error: 'Tipo de entidad no soportado para reintento' };
        } catch (error) {
            console.error('Error retrying sync:', error);
            return { success: false, error: error.message };
        }
    }
};

/**
 * NOTA DE SEGURIDAD:
 * 
 * Este servicio NUNCA maneja directamente el API token de Pipedrive.
 * Todas las operaciones que requieren el token se hacen a través de Edge Functions:
 * 
 * - pipedrive-test-connection: Verifica conectividad
 * - pipedrive-sync-quote: Sincroniza cotización como deal
 * - pipedrive-import-contacts: Importa contactos
 * - pipedrive-retry-sync: Reintenta sincronización
 * 
 * El API token se almacena encriptado en organization_settings y solo
 * es accesible por las Edge Functions con privilegios de service_role.
 */
