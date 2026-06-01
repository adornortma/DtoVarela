const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkInserted() {
  const { data: districts } = await supabase.from('distritos').select('*').eq('slug', 'lanus');
  if (!districts || districts.length === 0) return;
  const lanusId = districts[0].id;

  const { data: mm, error } = await supabase
    .from('metricas_mensuales')
    .select('*, tecnicos(*)')
    .eq('distrito_id', lanusId)
    .not('tecnico_id', 'is', null);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${mm.length} technician monthly metrics:`);
    mm.forEach(r => {
      console.log(`ID: ${r.id}, Celula: ${r.celula}, Mes: ${r.mes}, TechName: ${r.tecnicos ? (r.tecnicos.apellido + ', ' + r.tecnicos.nombre) : 'None'}, Resol: ${r.resolucion}, Reit: ${r.reiteros}`);
    });
  }
}

checkInserted();
