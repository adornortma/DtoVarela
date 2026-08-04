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
  const { data: load, error } = await supabase.from('ocr_cargas')
    .select('*')
    .eq('id', '122945a6-bcbb-4874-b762-79c5cfee5cf9')
    .single();

  if (error) {
    console.error(error);
    return;
  }

  console.log(`ID: ${load.id} | Mes: ${load.mes} | Celula: ${load.celula} | Status: ${load.processing_status}`);
  console.log('Datos Interpretados:', load.datos_interpretados);
}
run();
