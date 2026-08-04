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

async function run() {
  const { data: metrics, error } = await supabase.from('metricas_mensuales')
    .select('*, tecnicos(nombre, apellido)')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Last 30 metrics inserted/updated in metricas_mensuales:`);
  metrics.forEach(m => {
    console.log(`ID: ${m.id} | Celula: ${m.celula} | Mes: ${m.mes} | Dist: ${m.distrito_id} | Tech: ${m.tecnicos ? m.tecnicos.apellido + ', ' + m.tecnicos.nombre : 'CELL/DISTRICT'} | Created: ${m.created_at}`);
  });
}
run();
