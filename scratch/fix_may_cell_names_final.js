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
    .select('id, celula')
    .eq('distrito_id', lanusId)
    .eq('mes', 'Mayo');

  if (error) {
    console.error(error);
    return;
  }

  for (const m of metrics) {
    if (m.celula && m.celula !== m.celula.trim()) {
      const trimmed = m.celula.trim();
      console.log(`Trimming metric ${m.id}: "${m.celula}" -> "${trimmed}"`);
      await supabase.from('metricas_mensuales')
        .update({ celula: trimmed })
        .eq('id', m.id);
    }
  }
  console.log('Finished trimming!');
}
run();
