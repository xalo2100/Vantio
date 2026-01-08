import { supabase } from '../lib/supabase';

/**
 * Servicio para interactuar con Gemini AI
 * Las llamadas se hacen de forma segura a través de Edge Functions
 */

export const geminiService = {
    /**
     * Generar resumen inteligente de una cotización
     */
    generateQuoteSummary: async (quoteData) => {
        try {
            const { data, error } = await supabase.functions.invoke('generate-quote-summary', {
                body: { quoteData }
            });

            if (error) throw error;
            return { success: true, summary: data.summary };
        } catch (error) {
            console.error('Error generating quote summary:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Generar descripción de producto con IA
     */
    generateProductDescription: async (productName, category, specs) => {
        try {
            const { data, error } = await supabase.functions.invoke('generate-product-description', {
                body: { productName, category, specs }
            });

            if (error) throw error;
            return { success: true, description: data.description };
        } catch (error) {
            console.error('Error generating product description:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Analizar precios y sugerir mejoras
     */
    analyzePricing: async (products, costs) => {
        try {
            const { data, error } = await supabase.functions.invoke('analyze-pricing', {
                body: { products, costs }
            });

            if (error) throw error;
            return { success: true, analysis: data.analysis };
        } catch (error) {
            console.error('Error analyzing pricing:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Verificar si la API key está configurada
     */
    checkApiKeyConfigured: async (organizationId) => {
        try {
            const { data, error } = await supabase
                .from('organization_settings')
                .select('gemini_api_key')
                .eq('organization_id', organizationId)
                .single();

            if (error) return false;
            return !!data?.gemini_api_key;
        } catch (error) {
            return false;
        }
    }
};
