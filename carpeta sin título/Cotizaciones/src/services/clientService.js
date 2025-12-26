import { supabase } from '../lib/supabase';

/**
 * Servicio para gestión de clientes y seguimiento
 */
export const clientService = {
    /**
     * Obtener clientes asignados al usuario actual
     */
    getMyClients: async (userId, filters = {}) => {
        try {
            let query = supabase
                .from('clients')
                .select('*')
                .eq('assigned_to', userId)
                .order('last_contact_date', { ascending: true, nullsFirst: true });

            // Apply filters
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, clients: data || [] };
        } catch (error) {
            console.error('Error fetching clients:', error);
            return { success: false, error: error.message, clients: [] };
        }
    },

    /**
     * Obtener todos los clientes (solo admins)
     */
    getAllClients: async (organizationId, filters = {}) => {
        try {
            let query = supabase
                .from('clients')
                .select(`
                    *,
                    assigned_user:profiles!clients_assigned_to_fkey(id, full_name, email)
                `)
                .eq('organization_id', organizationId)
                .order('last_contact_date', { ascending: true, nullsFirst: true });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            if (filters.assignedTo) {
                query = query.eq('assigned_to', filters.assignedTo);
            }

            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, clients: data || [] };
        } catch (error) {
            console.error('Error fetching all clients:', error);
            return { success: false, error: error.message, clients: [] };
        }
    },

    /**
     * Obtener clientes que necesitan seguimiento
     */
    getClientsNeedingFollowup: async (userId, isAdmin = false, organizationId = null) => {
        try {
            let query = supabase
                .from('clients')
                .select(`
                    *,
                    assigned_user:profiles!clients_assigned_to_fkey(id, full_name, email)
                `)
                .eq('status', 'needs_followup');

            if (!isAdmin) {
                query = query.eq('assigned_to', userId);
            } else if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }

            query = query.order('last_contact_date', { ascending: true, nullsFirst: true });

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, clients: data || [] };
        } catch (error) {
            console.error('Error fetching clients needing followup:', error);
            return { success: false, error: error.message, clients: [] };
        }
    },

    /**
     * Obtener detalle de un cliente
     */
    getClientDetail: async (clientId) => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select(`
                    *,
                    assigned_user:profiles!clients_assigned_to_fkey(id, full_name, email)
                `)
                .eq('id', clientId)
                .single();

            if (error) throw error;
            return { success: true, client: data };
        } catch (error) {
            console.error('Error fetching client detail:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Obtener historial de compras de un cliente
     */
    getClientPurchases: async (clientId) => {
        try {
            const { data, error } = await supabase
                .from('client_purchases')
                .select('*')
                .eq('client_id', clientId)
                .order('purchase_date', { ascending: false });

            if (error) throw error;
            return { success: true, purchases: data || [] };
        } catch (error) {
            console.error('Error fetching client purchases:', error);
            return { success: false, error: error.message, purchases: [] };
        }
    },

    /**
     * Obtener historial de interacciones de un cliente
     */
    getClientInteractions: async (clientId) => {
        try {
            const { data, error } = await supabase
                .from('client_interactions')
                .select(`
                    *,
                    user:profiles!client_interactions_user_id_fkey(id, full_name, email)
                `)
                .eq('client_id', clientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, interactions: data || [] };
        } catch (error) {
            console.error('Error fetching client interactions:', error);
            return { success: false, error: error.message, interactions: [] };
        }
    },

    /**
     * Registrar interacción con cliente
     * Automáticamente sincroniza con Pipedrive como nota
     */
    recordInteraction: async (clientId, interactionData, userId, organizationId) => {
        try {
            const { data, error } = await supabase.functions.invoke('record-client-interaction', {
                body: {
                    clientId,
                    interactionType: interactionData.type,
                    notes: interactionData.notes,
                    userId,
                    organizationId
                }
            });

            if (error) throw error;
            return {
                success: true,
                interaction: data.interaction,
                pipedriveSynced: data.pipedrive_synced,
                message: data.message
            };
        } catch (error) {
            console.error('Error recording interaction:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Sincronizar clientes desde Pipedrive
     */
    syncClientsFromPipedrive: async (organizationId) => {
        try {
            const { data, error } = await supabase.functions.invoke('pipedrive-sync-clients', {
                body: { organizationId }
            });

            if (error) throw error;
            return {
                success: true,
                synced: data.synced,
                message: data.message
            };
        } catch (error) {
            console.error('Error syncing clients:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Actualizar cliente
     */
    updateClient: async (clientId, updates) => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .update(updates)
                .eq('id', clientId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, client: data };
        } catch (error) {
            console.error('Error updating client:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Obtener estadísticas de seguimiento
     */
    getFollowupStats: async (userId, isAdmin = false, organizationId = null) => {
        try {
            let query = supabase
                .from('clients')
                .select('status, total_purchases, purchase_count');

            if (!isAdmin) {
                query = query.eq('assigned_to', userId);
            } else if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }

            const { data, error } = await query;

            if (error) throw error;

            const stats = {
                total: data.length,
                needsFollowup: data.filter(c => c.status === 'needs_followup').length,
                active: data.filter(c => c.status === 'active').length,
                inactive: data.filter(c => c.status === 'inactive').length,
                totalRevenue: data.reduce((sum, c) => sum + (Number(c.total_purchases) || 0), 0),
                avgPurchases: data.length > 0
                    ? data.reduce((sum, c) => sum + (Number(c.total_purchases) || 0), 0) / data.length
                    : 0
            };

            return { success: true, stats };
        } catch (error) {
            console.error('Error fetching followup stats:', error);
            return { success: false, error: error.message, stats: null };
        }
    }
};
