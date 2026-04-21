
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTechs() {
  const { data, error } = await supabase.from('tecnicos').select('nombre, apellido, dni').limit(100);
  if (error) {
    console.error('Error:', error);
  } else {
    const nulls = data.filter(t => !t.nombre || !t.apellido);
    console.log(`Found ${data.length} techs. Null names/surnames: ${nulls.length}`);
    if (nulls.length > 0) {
      console.log('Sample null:', nulls[0]);
    }
  }
}

checkTechs();
