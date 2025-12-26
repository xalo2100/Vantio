import { supabase } from '../lib/supabase';
import { generateQuoteEmailHTML, generateQuoteEmailText } from './emailTemplate';

/**
 * Send quote email to client via Supabase Edge Function
 * @param {Object} quote - Quote object
 * @param {string} customMessage - Optional custom message to include in email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendQuoteEmail = async (quote, customMessage = '') => {
    try {
        // Generate microsite URL
        const micrositeUrl = `${window.location.origin}/microsite/${quote.id}`;

        // Generate email content
        const htmlContent = generateQuoteEmailHTML(quote, micrositeUrl, customMessage);
        const textContent = generateQuoteEmailText(quote, micrositeUrl, customMessage);

        // Call Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('send-quote-email', {
            body: {
                to: quote.clientEmail,
                subject: `Cotización ${quote.quoteNumber} - ${quote.projectName}`,
                html: htmlContent,
                text: textContent,
                quoteId: quote.id,
                quoteNumber: quote.quoteNumber,
                replyTo: quote.salesEmail,
                fromName: quote.salesPerson
            }
        });

        if (error) {
            console.error('Error sending email:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error in sendQuoteEmail:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Validate email configuration
 * @returns {boolean}
 */
export const isEmailConfigured = () => {
    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    return Boolean(supabaseUrl && supabaseKey);
};
