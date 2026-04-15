const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data: acts, error: actsErr } = await supabase.from('actuaciones').select('id').limit(1);
  console.log('Actuaciones exists:', !actsErr);
  if (actsErr) console.log('Actuaciones error:', actsErr.message);

  const { data: days, error: daysErr } = await supabase.from('dias_operativos').select('fecha').limit(1);
  console.log('Dias Operativos exists:', !daysErr);
  if (daysErr) console.log('Dias Operativos error:', daysErr.message);
  
  process.exit(0);
}

checkTables();
