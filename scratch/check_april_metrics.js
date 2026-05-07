const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkApril() {
  try {
    const startDate = '2026-04-01';
    const endDate = '2026-04-30';
    
    const { data, error } = await supabase
      .from('metricas')
      .select('tecnico_id, cierres, no_encontrados, resolucion, reitero, productividad, fecha')
      .gte('fecha', startDate)
      .lte('fecha', endDate);
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log(`Found ${data.length} records in April.`);
      if (data.length > 0) {
        console.log('Sample:', data[0]);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

checkApril();
