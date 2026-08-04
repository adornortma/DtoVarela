const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: tech } = await supabase.from('tecnicos').select('*').eq('dni', '20766814').single();
  console.log('Technician details:', tech);

  if (tech) {
    const { data: tracking } = await supabase
      .from('seguimiento_bp')
      .select('*')
      .eq('tecnico_id', tech.id)
      .order('fecha_inicio', { ascending: false });
    
    console.log('Tracking records for Pernargig:');
    tracking.forEach(r => {
      console.log(`ID: ${r.id}, Fecha Inicio: ${r.fecha_inicio}, Es Mensual: ${r.es_mensual}, Confirmado: ${r.confirmado}`);
    });
  }
}

main();
