const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMetrics() {
  try {
    const startDate = '2026-05-01';
    const endDate = '2026-05-07';
    
    const { data: metrics, error } = await supabase
      .from('metricas')
      .select('tecnico_id, cierres, no_encontrados, fecha')
      .gte('fecha', startDate)
      .lte('fecha', endDate);

    if (error) {
      console.error('Error fetching metrics:', error);
      return;
    }

    console.log(`Found ${metrics.length} records in metrics for 01-05 to 07-05`);
    if (metrics.length > 0) {
      console.log('Sample record:', metrics[0]);
    }

    const { data: monthly, error: mError } = await supabase
      .from('metricas_mensuales')
      .select('tecnico_id, mes, cierres, no_encontrados, tecnicos(nombre, apellido)')
      .eq('mes', 'Abril')
      .limit(10);
      
    if (mError) {
      console.error('Error fetching monthly metrics:', mError);
      return;
    }

    console.log('Current April Monthly Metrics (Sample):');
    monthly.forEach(m => {
      console.log(`${m.tecnicos?.nombre} ${m.tecnicos?.apellido}: Cierres=${m.cierres}, NoEnc=${m.no_encontrados}`);
    });

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkMetrics();
