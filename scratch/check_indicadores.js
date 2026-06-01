const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: distData, error } = await supabase
    .from('indicadores_distrito')
    .select('*, distritos(slug, nombre)')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching indicators:', error);
  } else {
    console.log(`Found ${distData.length} records in indicadores_distrito:`);
    distData.forEach(r => {
      console.log(`ID: ${r.id}, Distrito: ${r.distritos ? r.distritos.nombre : 'Unknown'} (${r.distrito_id}), Resol: ${r.resolucion}, Reit: ${r.reiteros}, Punt: ${r.puntualidad}, Prod: ${r.productividad}, TO: ${r.tiempo_operativo}, Updated: ${r.updated_at}`);
    });
  }
}

check();
