const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwtzsszcltcxxmgkoepq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dHpzc3pjbHRjeHhtZ2tvZXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTg4NjUsImV4cCI6MjA3OTYzNDg2NX0.k9rueEJ0LDdyJGLOPUMH92tJP65b-b3EgygyAEDFsLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSettings() {
    const { data, error } = await supabase
        .from('organization_settings')
        .select('organization_id, resend_from_email, resend_api_key');

    if (error) {
        console.error('Error fetching settings:', error);
        return;
    }

    console.log('Organization Settings:');
    data.forEach(s => {
        console.log(`Org ID: ${s.organization_id}`);
        console.log(`From Email: "${s.resend_from_email}"`);
        console.log(`API Key: ${s.resend_api_key ? 'Present (' + s.resend_api_key.substring(0, 5) + '...)' : 'Missing'}`);
        console.log('---');
    });
}

inspectSettings();
