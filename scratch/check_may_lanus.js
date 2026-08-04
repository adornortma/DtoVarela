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
  const { data: ocrCargas, error } = await supabase.from('ocr_cargas')
    .select('*')
    .eq('distrito_id', lanusId);
  
  if (error) {
    console.error('Error fetching ocr_cargas:', error);
    return;
  }

  console.log(`Found ${ocrCargas.length} OCR loads for Lanus:`);
  ocrCargas.forEach(c => {
    console.log(`ID: ${c.id} | Mes: ${c.mes} | Anio: ${c.anio} | Celula: ${c.celula} | Status: ${c.processing_status} | Uploaded: ${c.uploaded_at}`);
  });
}
run();
