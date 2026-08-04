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
    .select('id, celula, tecnico_id')
    .eq('distrito_id', lanusId)
    .eq('mes', 'Mayo')
    .not('tecnico_id', 'is', null);

  if (error) {
    console.error(error);
    return;
  }

  const cells = [...new Set(metrics.map(m => m.celula))];
  console.log('May tech cells in database:', cells);
}
run();
