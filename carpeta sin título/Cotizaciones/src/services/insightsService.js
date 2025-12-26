import { supabase } from '../lib/supabase';

/**
 * Servicio para gestionar insights Kaizen
 * Todos los datos sensibles se manejan de forma segura
 */

export const insightsService = {
    /**
     * Obtener insights del usuario actual
     */
    getUserInsights: async (limit = 10, unreadOnly = false) => {
        try {
            let query = supabase
                .from('insights')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (unreadOnly) {
                query = query.eq('is_read', false);
            }

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, insights: data || [] };
        } catch (error) {
            console.error('Error fetching insights:', error);
            return { success: false, error: error.message, insights: [] };
        }
    },

    /**
     * Obtener count de insights no leídos
     */
    getUnreadCount: async () => {
        try {
            const { count, error } = await supabase
                .from('insights')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false);

            if (error) throw error;
            return { success: true, count: count || 0 };
        } catch (error) {
            console.error('Error fetching unread count:', error);
            return { success: false, count: 0 };
        }
    },

    /**
     * Marcar insight como leído
     */
    markAsRead: async (insightId) => {
        try {
            const { error } = await supabase
                .from('insights')
                .update({ is_read: true, updated_at: new Date().toISOString() })
                .eq('id', insightId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error marking insight as read:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Marcar todos los insights como leídos
     */
    markAllAsRead: async () => {
        try {
            const { error } = await supabase
                .from('insights')
                .update({ is_read: true, updated_at: new Date().toISOString() })
                .eq('is_read', false);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error marking all insights as read:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Crear insight manualmente (solo admins)
     * La creación se valida con RLS policies
     */
    createInsight: async (insight) => {
        try {
            const { data, error } = await supabase
                .from('insights')
                .insert([{
                    ...insight,
                    generated_by: 'admin'
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, insight: data };
        } catch (error) {
            console.error('Error creating insight:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Obtener insights de un vendedor específico (solo admins)
     */
    getSellerInsights: async (userId, limit = 20) => {
        try {
            const { data, error } = await supabase
                .from('insights')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { success: true, insights: data || [] };
        } catch (error) {
            console.error('Error fetching seller insights:', error);
            return { success: false, error: error.message, insights: [] };
        }
    },

    /**
     * Generar insights automáticos usando IA
     * Llama a Edge Function que maneja la API key de Gemini de forma segura
     */
    generateWeeklyInsights: async (userId) => {
        try {
            const { data, error } = await supabase.functions.invoke('generate-kaizen-insights', {
                body: {
                    userId,
                    period: 'weekly'
                }
            });

            if (error) throw error;
            return { success: true, insights: data.insights };
        } catch (error) {
            console.error('Error generating weekly insights:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Generar reporte mensual Kaizen usando IA
     */
    generateMonthlyKaizen: async (userId) => {
        try {
            const { data, error } = await supabase.functions.invoke('generate-kaizen-insights', {
                body: {
                    userId,
                    period: 'monthly'
                }
            });

            if (error) throw error;
            return { success: true, report: data.report, insights: data.insights };
        } catch (error) {
            console.error('Error generating monthly kaizen:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Generar reporte personalizado (solo admins)
     */
    generateAdminReport: async (userId, startDate, endDate, focusAreas = []) => {
        try {
            const { data, error } = await supabase.functions.invoke('generate-admin-report', {
                body: {
                    userId,
                    startDate,
                    endDate,
                    focusAreas // ['performance', 'improvement', 'coaching']
                }
            });

            if (error) throw error;
            return { success: true, report: data.report };
        } catch (error) {
            console.error('Error generating admin report:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Suscribirse a cambios en tiempo real de insights
     */
    subscribeToInsights: (userId, callback) => {
        const subscription = supabase
            .channel('insights_channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'insights',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    callback(payload);
                }
            )
            .subscribe();

        return subscription;
    },

    /**
     * Cancelar suscripción
     */
    unsubscribeFromInsights: (subscription) => {
        if (subscription) {
            supabase.removeChannel(subscription);
        }
    }
};
