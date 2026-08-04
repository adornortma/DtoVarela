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
  const { data: techs } = await supabase.from('tecnicos')
    .select('*')
    .eq('distrito_id', 'b6df6103-299a-46b1-a2de-420b200d8422');
  console.log('Monte Grande technicians:', techs.map(t => ({ id: t.id, nombre: t.nombre, apellido: t.apellido, dni: t.dni })));
}
run();
