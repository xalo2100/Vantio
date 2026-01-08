// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), '');

  console.log('--- VITE BUILD DEBUG ---');
  console.log('Mode:', mode);
  console.log('VITE_SUPABASE_URL (process.env):', process.env.VITE_SUPABASE_URL ? '✅ Found' : '❌ Missing');
  console.log('VITE_SUPABASE_URL (loadEnv):', env.VITE_SUPABASE_URL ? '✅ Found' : '❌ Missing');
  console.log('------------------------');

  return {
    plugins: [react()],
    base: '/',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY),
    },
    optimizeDeps: {
      include: ['pdfjs-dist']
    },
    worker: {
      format: 'es'
    }
  };
});