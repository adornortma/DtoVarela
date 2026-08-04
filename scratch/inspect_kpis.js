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
  // Let's find cells matching ADROGUE
  const { data: cells } = await supabase.from('celulas').select('*').ilike('nombre', '%adrogue%');
  console.log('Cells matching ADROGUE:', cells);

  // Let's find technicians in Montegrande or Lomas with "TECNICO" or cell names in their names
  const { data: techs } = await supabase.from('tecnicos').select('*').or('nombre.ilike.%tecnico%,apellido.ilike.%tecnico%,apellido.ilike.%adrogue%,apellido.ilike.%burzaco%,apellido.ilike.%ezeiza%,apellido.ilike.%monte_grande%');
  console.log('Suspicious technicians:', techs);

  // Let's look at metricas_mensuales loaded in April for Monte Grande / Lomas
  const { data: metrics } = await supabase.from('metricas_mensuales')
    .select('*, tecnicos(nombre, apellido)')
    .eq('mes', 'Abril')
    .is('tecnico_id', null);
  console.log('April Cell/District metrics:', metrics.map(m => ({ celula: m.celula, mes: m.mes, distrito_id: m.distrito_id, resolucion: m.resolucion, reiteros: m.reiteros, puntualidad: m.puntualidad, productividad: m.productividad })));
}
run();
