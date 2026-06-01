const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkVarela() {
  // Find Varela district ID
  const { data: districts } = await supabase.from('distritos').select('*').eq('slug', 'varela');
  if (!districts || districts.length === 0) {
    console.log('Varela district not found');
    return;
  }
  const varelaId = districts[0].id;
  console.log('Varela ID:', varelaId);

  // Fetch count of metricas for Varela
  const { count, error } = await supabase
    .from('metricas')
    .select('*', { count: 'exact', head: true })
    .eq('distrito_id', varelaId);

  console.log(`Count of metricas for Varela: ${count}, Error:`, error);

  // Fetch sample metricas for Varela
  const { data: sample } = await supabase
    .from('metricas')
    .select('*, tecnicos(*)')
    .eq('distrito_id', varelaId)
    .limit(5);

  console.log('Sample Varela metricas:', sample);
}

checkVarela();
