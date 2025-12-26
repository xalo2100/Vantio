import { createClient } from '@supabase/supabase-js';

// Estas variables deben ser reemplazadas con tus credenciales de Supabase
// Puedes obtenerlas en: https://app.supabase.com/project/_/settings/api
// Check for custom credentials in localStorage
// TEMPORARILY DISABLED - Using only .env variables
// const customUrl = localStorage.getItem('custom_supabase_url');
// const customKey = localStorage.getItem('custom_supabase_key');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate credentials before creating client
const isValidUrl = supabaseUrl &&
    supabaseUrl !== 'your_supabase_project_url' &&
    supabaseUrl.startsWith('https://');

const isValidKey = supabaseAnonKey &&
    supabaseAnonKey !== 'your_supabase_anon_key' &&
    supabaseAnonKey.length > 20;

if (!isValidUrl || !isValidKey) {
    console.error('❌ CRITICAL: Supabase credentials not configured!');
    console.error('📝 Current URL:', supabaseUrl);
    console.error('🔑 Key configured:', isValidKey ? 'Yes' : 'No');
    console.error('');
    console.error('Please update your .env file with actual Supabase credentials:');
    console.error('VITE_SUPABASE_URL=https://your-project.supabase.co');
    console.error('VITE_SUPABASE_ANON_KEY=your-actual-anon-key');
    console.error('');
    console.error('See SUPABASE_SETUP.md for detailed instructions');
}

export const supabase = isValidUrl && isValidKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            debug: import.meta.env.DEV
        }
    })
    : null; // Return null if credentials are invalid

// Helper para verificar si Supabase está configurado
export const isSupabaseConfigured = () => {
    return Boolean(isValidUrl && isValidKey);
};
