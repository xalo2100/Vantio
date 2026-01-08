import { supabase } from './lib/supabase';

export const runDiagnostic = async () => {
    console.log('🚀 Starting Schema Diagnostic...');

    const tables = ['organization_settings', 'clients'];

    for (const table of tables) {
        console.log(`\n📊 Checking table: ${table}`);
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.error(`❌ Error reading ${table}:`, error);
                if (error.message.includes('column')) {
                    console.error(`💡 Hint: Likely a missing column. Error: ${error.message}`);
                }
            } else {
                console.log(`✅ Table ${table} is accessible.`);
                if (data && data.length > 0) {
                    console.log(`📝 Sample columns found:`, Object.keys(data[0]).join(', '));
                } else {
                    console.log(`ℹ️ Table ${table} is empty, but schema exists.`);
                    // Try to insert a dummy row and rollback or just check error specifically
                }
            }
        } catch (e) {
            console.error(`💥 Unexpected error checking ${table}:`, e);
        }
    }

    console.log('\n🏁 Diagnostic finished.');
};
