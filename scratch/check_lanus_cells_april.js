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
    .select('celula')
    .eq('distrito_id', lanusId)
    .eq('mes', 'Abril')
    .is('tecnico_id', null);

  if (error) {
    console.error(error);
    return;
  }

  console.log('April cells in metricas_mensuales:', [...new Set(metrics.map(m => m.celula))]);
}
run();
