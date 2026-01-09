const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwtzsszcltcxxmgkoepq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dHpzc3pjbHRjeHhtZ2tvZXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTg4NjUsImV4cCI6MjA3OTYzNDg2NX0.k9rueEJ0LDdyJGLOPUMH92tJP65b-b3EgygyAEDFsLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function dump() {
    const { data, error } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', 'd394466d-bfa9-407b-af0a-edb39b14a467')
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Full Settings:', JSON.stringify(data, null, 2));
}

dump();
