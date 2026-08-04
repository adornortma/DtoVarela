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

const adrogueData = [
  { name: 'ACOSTA FACUNDO', prod: 7.02, resol: 94.29, reit: 6.25, to: 63.45 },
  { name: 'ANTUÑA ERNESTO', prod: 0.00, resol: 0.00, reit: null, to: 0.00 },
  { name: 'ENCINA ROBERTO', prod: 6.26, resol: 69.27, reit: 10.53, to: 75.66 },
  { name: 'FERREIRA FAVIO', prod: 6.51, resol: 89.58, reit: 4.55, to: 68.28 },
  { name: 'NAVARRO DANIEL JULIO', prod: 6.45, resol: 76.92, reit: 6.67, to: 74.18 },
  { name: 'PIOL GABRIEL EDUARDO', prod: 7.81, resol: 87.88, reit: 1.72, to: 62.84 },
  { name: 'QUIROZ ANDRÉS SEBASTIÁN', prod: 6.67, resol: 77.66, reit: 2.63, to: 63.57 },
  { name: 'ROMERO MARCOS RODOLFO', prod: 5.07, resol: 78.95, reit: 0.00, to: 52.79 },
  { name: 'SIDERO RUBEN OSCAR', prod: 6.47, resol: 85.94, reit: 2.08, to: 64.70 }
];

async function inspect() {
  // Get all technicians for Monte Grande
  const { data: techs, error } = await supabase
    .from('tecnicos')
    .select('*')
    .eq('distrito_id', districtId);
  
  if (error) {
    console.error('Error fetching techs:', error);
    return;
  }

  console.log('--- ALL MONTE GRANDE TECHS ---');
  techs.forEach(t => {
    console.log(`ID: ${t.id} | DNI: ${t.dni} | Nombre: ${t.nombre} | Apellido: ${t.apellido} | Norm: ${t.nombre_normalizado}`);
  });

  console.log('\n--- MATCHING ADROGUE TECHS ---');
  adrogueData.forEach(target => {
    const normTarget = target.name.replace(/[^A-Z]/gi, '').toUpperCase();
    
    // Try to find matching non-temp technician
    const matches = techs.filter(t => {
      if (t.dni.startsWith('TEMP-')) return false;
      const combined = (t.apellido + ' ' + t.nombre).replace(/[^A-Z]/gi, '').toUpperCase();
      const combinedRev = (t.nombre + ' ' + t.apellido).replace(/[^A-Z]/gi, '').toUpperCase();
      return combined.includes(normTarget) || normTarget.includes(combined) || combinedRev.includes(normTarget) || normTarget.includes(combinedRev);
    });

    console.log(`Target: ${target.name}`);
    if (matches.length > 0) {
      matches.forEach(m => {
        console.log(`  -> MATCH: ID: ${m.id} | DNI: ${m.dni} | Name: ${m.apellido}, ${m.nombre}`);
      });
    } else {
      console.log(`  -> NO MATCH FOUND!`);
    }
  });
}

inspect();
