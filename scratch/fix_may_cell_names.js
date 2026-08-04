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

const cellMapping = {
  'GM_LANUS': 'GM_ LANUS',
  'GM_LOMAS': 'GM_ LOMAS',
  'GM_QUILMES_VARELA': 'GM_QUILMES_ VARELA',
  'MONTE_CHINGOLO': 'MONTE_ CHINGOLO',
  'MS_LANUS': 'MS. LANUS',
  'MS. LANUS ': 'MS. LANUS',
  'GM_MONTE_GRANDE': 'GM_MONTE_GRANDE'
};

async function run() {
  console.log('Aligning cell names for Lanus in May 2026...');

  // Fetch all metrics for May in Lanus
  const { data: metrics, error } = await supabase.from('metricas_mensuales')
    .select('*')
    .eq('distrito_id', lanusId)
    .eq('mes', 'Mayo');

  if (error) {
    console.error(error);
    return;
  }

  for (const m of metrics) {
    const cleanCel = m.celula ? m.celula.trim() : '';
    if (cellMapping[cleanCel]) {
      const correctName = cellMapping[cleanCel];
      console.log(`Updating metric ${m.id}: "${m.celula}" -> "${correctName}"`);
      await supabase.from('metricas_mensuales')
        .update({ celula: correctName })
        .eq('id', m.id);
    }
  }

  console.log('Cell name alignment completed!');
}
run();
