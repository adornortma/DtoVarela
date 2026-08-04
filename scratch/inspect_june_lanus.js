const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const lanusId = 'ad787214-2118-4c45-97fa-c15698d77e99';

async function run() {
  const { data: metrics, error } = await supabase.from('metricas_mensuales')
    .select('*, tecnicos(id, nombre, apellido, dni)')
    .eq('distrito_id', lanusId)
    .eq('mes', 'Junio');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${metrics.length} metrics for June in Lanus.`);
  
  const tempTechsInJune = metrics.filter(m => m.tecnicos && m.tecnicos.dni.startsWith('TEMP-'));
  console.log(`Of those, ${tempTechsInJune.length} are associated with temporary/duplicate technicians.`);
  
  tempTechsInJune.slice(0, 10).forEach(m => {
    console.log(`Metric ID: ${m.id} | Celula in June: ${m.celula} | Tech Name: ${m.tecnicos.apellido}, ${m.tecnicos.nombre} (${m.tecnicos.dni})`);
  });

  const uniqueCellsJune = [...new Set(metrics.map(m => m.celula))];
  console.log('Unique cells in June metrics:', uniqueCellsJune);
}
run();
