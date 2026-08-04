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
    .eq('mes', 'Mayo');
  
  if (error) {
    console.error('Error fetching metrics:', error);
    return;
  }

  console.log(`Found ${metrics.length} metrics in Mayo for all districts:`);
  
  const countsByDistrict = {};
  metrics.forEach(m => {
    countsByDistrict[m.distrito_id] = (countsByDistrict[m.distrito_id] || 0) + 1;
  });
  console.log('Counts by district:', countsByDistrict);

  // Let's print a sample of 10 metrics
  metrics.slice(0, 10).forEach(m => {
    console.log(`ID: ${m.id} | Celula: ${m.celula} | Mes: ${m.mes} | Dist: ${m.distrito_id} | Tech: ${m.tecnicos ? m.tecnicos.apellido + ', ' + m.tecnicos.nombre : 'CELL/DISTRICT'} | Prod: ${m.productividad} | Resol: ${m.resolucion}`);
  });
}
run();
