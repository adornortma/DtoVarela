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

const districtId = 'b6df6103-299a-46b1-a2de-420b200d8422'; // Monte Grande

// Target metrics to insert for Adrogue in April 2026
const correctAdrogueMetrics = [
  { name: 'ACOSTA FACUNDO', prod: 7.02, resol: 94.29, reit: 6.25, to: 63.45, dni: 'DNI-29779298' },
  { name: 'ANTUÑA ERNESTO', prod: 0.00, resol: 0.00, reit: null, to: 0.00, dni: 'TEMP-56767310' },
  { name: 'ENCINA ROBERTO', prod: 6.26, resol: 69.27, reit: 10.53, to: 75.66, dni: 'DNI-24468880' },
  { name: 'FERREIRA FAVIO', prod: 6.51, resol: 89.58, reit: 4.55, to: 68.28, dni: 'DNI-93094101' },
  { name: 'NAVARRO DANIEL JULIO', prod: 6.45, resol: 76.92, reit: 6.67, to: 74.18, dni: 'DNI-17288050' },
  { name: 'PIOL GABRIEL EDUARDO', prod: 7.81, resol: 87.88, reit: 1.72, to: 62.84, dni: 'DNI-26879163' },
  { name: 'QUIROZ ANDRÉS SEBASTIÁN', prod: 6.67, resol: 77.66, reit: 2.63, to: 63.57, dni: 'DNI-31101031' },
  { name: 'ROMERO MARCOS RODOLFO', prod: 5.07, resol: 78.95, reit: 0.00, to: 52.79, dni: 'DNI-29272492' },
  { name: 'SIDERO RUBEN OSCAR', prod: 6.47, resol: 85.94, reit: 2.08, to: 64.70, dni: 'DNI-21110108' }
];

async function run() {
  console.log('Starting cleanup...');

  // 1. Fix ANTUÑA ERNESTO technician profile (remove 'TÉCNICO' name, separate names properly)
  console.log('Fixing Antuña Ernesto profile...');
  await supabase.from('tecnicos')
    .update({
      nombre: 'ERNESTO',
      apellido: 'ANTUÑA',
      nombre_normalizado: 'ANTUNAERNESTO'
    })
    .eq('id', '874d6291-dc4d-4d70-8385-43cf0179398d');

  // 2. Identify the temp technicians to delete (all starting with TEMP-, except ANTUÑA's ID)
  const { data: tempTechs } = await supabase.from('tecnicos')
    .select('id, nombre, apellido, dni')
    .eq('distrito_id', districtId)
    .like('dni', 'TEMP-%');

  const techsToDel = tempTechs.filter(t => t.id !== '874d6291-dc4d-4d70-8385-43cf0179398d');
  console.log(`Found ${techsToDel.length} temp duplicate technicians to remove.`);

  for (const t of techsToDel) {
    console.log(`Deleting metrics and profile for duplicate tech: ${t.apellido}, ${t.nombre} (${t.dni})`);
    
    // Delete metrics
    const { error: errM } = await supabase.from('metricas_mensuales')
      .delete()
      .eq('tecnico_id', t.id);
    if (errM) console.error('Error deleting metrics for ' + t.id, errM);

    // Delete tech
    const { error: errT } = await supabase.from('tecnicos')
      .delete()
      .eq('id', t.id);
    if (errT) console.error('Error deleting technician ' + t.id, errT);
  }

  // 3. Clear existing April metrics under ADROGUE cell for the real techs as well to start fresh
  const realTechDnis = correctAdrogueMetrics.map(x => x.dni);
  const { data: realTechs } = await supabase.from('tecnicos')
    .select('id, dni')
    .in('dni', realTechDnis);
  
  const realTechIds = realTechs.map(t => t.id);
  console.log(`Clearing existing April metrics for the ${realTechIds.length} real techs of Adrogue...`);
  const { error: clearErr } = await supabase.from('metricas_mensuales')
    .delete()
    .eq('mes', 'Abril')
    .eq('distrito_id', districtId)
    .in('tecnico_id', realTechIds);
  if (clearErr) console.error('Error clearing metrics:', clearErr);

  // 4. Insert correct metrics for real techs
  console.log('Inserting correct metrics for Adrogue in April 2026...');
  for (const item of correctAdrogueMetrics) {
    const tech = realTechs.find(t => t.dni === item.dni);
    if (!tech) {
      console.error(`Could not find technician with DNI ${item.dni} in DB!`);
      continue;
    }

    const payload = {
      tecnico_id: tech.id,
      mes: 'Abril',
      celula: 'ADROGUE',
      distrito_id: districtId,
      resolucion: item.resol,
      reiteros: item.reit,
      productividad: item.prod,
      tiempo_operativo: item.to
    };

    console.log(`Inserting metric for DNI: ${item.dni} (${item.name})`);
    const { error: insErr } = await supabase.from('metricas_mensuales').insert(payload);
    if (insErr) {
      console.error(`Error inserting metric for ${item.name}:`, insErr);
    }
  }

  console.log('Cleanup and correct load completed successfully!');
}

run();
