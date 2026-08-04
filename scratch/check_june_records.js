const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  // Let's get all records for June 1st 2026
  const { data: records } = await supabase
    .from('seguimiento_bp')
    .select('id, tecnico_id, fecha_inicio, es_mensual, confirmado, tecnicos(nombre, apellido)')
    .eq('fecha_inicio', '2026-06-01');

  console.log('Records starting on 2026-06-01:');
  console.log(JSON.stringify(records, null, 2));
}

main();
