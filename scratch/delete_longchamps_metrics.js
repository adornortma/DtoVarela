const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteLongchampsMetrics() {
  const { data: dists } = await supabase.from('distritos').select('id').eq('slug', 'montegrande').maybeSingle();
  if (!dists) {
    console.log('Montegrande district not found');
    return;
  }
  const montegrandeId = dists.id;

  console.log('Deleting metrics for cell LONGCHAMPS in Montegrande...');

  // 1. Delete from metricas_mensuales (monthly summaries for cells)
  const { data: delMm, error: errMm } = await supabase
    .from('metricas_mensuales')
    .delete()
    .eq('celula', 'LONGCHAMPS')
    .eq('distrito_id', montegrandeId)
    .select('*');

  if (errMm) {
    console.error('Error deleting from metricas_mensuales:', errMm);
  } else {
    console.log(`Deleted ${delMm?.length || 0} row(s) from metricas_mensuales`);
  }

  // 2. Delete from metricas (weekly metrics)
  const { data: delM, error: errM } = await supabase
    .from('metricas')
    .delete()
    .eq('celula', 'LONGCHAMPS')
    .eq('distrito_id', montegrandeId)
    .select('*');

  if (errM) {
    console.error('Error deleting from metricas:', errM);
  } else {
    console.log(`Deleted ${delM?.length || 0} row(s) from metricas`);
  }

  // 3. Delete from metricas_celula
  const { data: delMc, error: errMc } = await supabase
    .from('metricas_celula')
    .delete()
    .eq('celula', 'LONGCHAMPS')
    .eq('distrito_id', montegrandeId)
    .select('*');

  if (errMc) {
    console.error('Error deleting from metricas_celula:', errMc);
  } else {
    console.log(`Deleted ${delMc?.length || 0} row(s) from metricas_celula`);
  }

  console.log('Finished deleting LONGCHAMPS metrics!');
}

deleteLongchampsMetrics();
