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
    .select('*, tecnicos(nombre, apellido)')
    .eq('distrito_id', lanusId);

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${metrics.length} metrics in total for Lanus.`);
  
  const months = {};
  metrics.forEach(m => {
    months[m.mes] = (months[m.mes] || 0) + 1;
  });
  console.log('Months distribution:', months);

  const sample = metrics.filter(m => m.mes !== 'Abril');
  console.log(`Non-April sample size: ${sample.length}`);
  sample.forEach(m => {
    console.log(`ID: ${m.id} | Mes: ${m.mes} | Celula: ${m.celula} | Tech: ${m.tecnicos ? m.tecnicos.apellido + ', ' + m.tecnicos.nombre : 'CELL/DISTRICT'}`);
  });
}
run();
