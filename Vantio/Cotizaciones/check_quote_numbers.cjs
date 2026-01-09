const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fwtzsszcltcxxmgkoepq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dHpzc3pjbHRjeHhtZ2tvZXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTg4NjUsImV4cCI6MjA3OTYzNDg2NX0.k9rueEJ0LDdyJGLOPUMH92tJP65b-b3EgygyAEDFsLw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuotes() {
    const { data, error } = await supabase
        .from('quotes')
        .select('quote_number, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching quotes:', error);
        return;
    }

    console.log('Last 10 quotes:');
    data.forEach(q => console.log(`${q.quote_number} (Created: ${q.created_at})`));
}

checkQuotes();
