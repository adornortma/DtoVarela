const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function markRainy() {
  const { data, error } = await supabase
    .from('dias_operativos')
    .upsert([
      { fecha: '2026-04-06', lluvia: true },
      { fecha: '2026-04-07', lluvia: true },
      { fecha: '2026-04-15', lluvia: true }
    ]);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  console.log('Success:', data);
  process.exit(0);
}

markRainy();
