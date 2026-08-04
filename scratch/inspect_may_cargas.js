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
  const { data: ocrCargas, error } = await supabase.from('ocr_cargas')
    .select('*')
    .eq('mes', 5)
    .eq('anio', 2026);
  
  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${ocrCargas.length} May OCR loads:`);
  ocrCargas.forEach(c => {
    console.log(`ID: ${c.id} | District: ${c.distrito_id} | Celula: ${c.celula} | TechRows: ${c.datos_interpretados ? c.datos_interpretados.length : 0} | Status: ${c.processing_status}`);
  });
}
run();
