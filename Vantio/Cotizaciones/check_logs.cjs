const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwtzsszcltcxxmgkoepq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dHpzc3pjbHRjeHhtZ2tvZXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTg4NjUsImV4cCI6MjA3OTYzNDg2NX0.k9rueEJ0LDdyJGLOPUMH92tJP65b-b3EgygyAEDFsLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
    const { data, error } = await supabase
        .from('pipedrive_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching logs:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('--- LATEST SYNC LOG ---');
        console.log('Created at:', data[0].created_at);
        console.log('Status:', data[0].status);
        console.log('Action:', data[0].action);
        console.log('Metadata:', JSON.stringify(data[0].metadata, null, 2));
    } else {
        console.log('No logs found.');
    }
}

checkLogs();
