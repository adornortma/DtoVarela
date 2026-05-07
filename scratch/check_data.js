const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  try {
    // Check alarmas_toa for week 1 of May
    const { data: alarmas, error: aError } = await supabase
      .from('alarmas_toa')
      .select('nombre_tecnico, cierres, no_encontrados, semana, mes')
      .eq('semana', 'Semana 1')
      .eq('mes', 'Mayo');

    if (aError) {
      console.error('Error fetching alarmas_toa:', aError);
      return;
    }

    console.log(`Found ${alarmas.length} records in alarmas_toa for Semana 1 Mayo`);
    if (alarmas.length > 0) {
      console.log('Sample record:', alarmas[0]);
    }

    // Check if we need to update metricas_mensuales for Abril
    const { data: metrics, error: mError } = await supabase
      .from('metricas_mensuales')
      .select('tecnico_id, mes, cierres, no_encontrados')
      .eq('mes', 'Abril')
      .limit(5);

    if (mError) {
      console.error('Error fetching metricas_mensuales:', mError);
      return;
    }

    console.log('Sample Abril metrics:', metrics);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkData();
