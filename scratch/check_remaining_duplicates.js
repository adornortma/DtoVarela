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
  const { data: techs } = await supabase.from('tecnicos')
    .select('*')
    .eq('distrito_id', lanusId)
    .or('apellido.ilike.%pavolis%,apellido.ilike.%arrouge%,apellido.ilike.%torres%,apellido.ilike.%rocha%');
  
  console.log('Matching technicians in Lanus:');
  techs.forEach(t => {
    console.log(`ID: ${t.id} | DNI: ${t.dni} | Name: ${t.apellido}, ${t.nombre}`);
  });
}
run();
