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

const fakeTechIds = [
  'd31486e6-3315-448f-9ca8-03199640fa2b', // GM_LANUS
  '5a119b0f-8176-4c33-ac9f-e8fcfd476485', // GM_LOMAS
  'b2d8f73d-be63-4d57-afe3-33ba6ba68bcf', // GM_MONTE_GRANDE
  '9ac47e0d-4210-46e7-b35c-64244c373f0c', // GM_QUILMES_VARELA
  '0195260f-3104-4b62-9697-3cdb2dd4cef9', // LANUS
  'defb0e7e-a038-4065-8220-49c824011d0e', // MONTE_CHINGOLO
  '68ca2445-ea14-4923-85da-942045bfabb3', // MS_LANUS
  'ed0b6153-fc47-4c8c-91d0-f187d99c4d90', // PIÑEYRO
  'e9954de0-9a71-4ad1-88de-5f44d253b989'  // SARANDI
];

async function run() {
  console.log('Cleaning up fake technicians loaded in GM LANUS cell...');

  // 1. Delete metrics for these technician IDs
  const { error: errM } = await supabase.from('metricas_mensuales')
    .delete()
    .in('tecnico_id', fakeTechIds);

  if (errM) {
    console.error('Error deleting metrics:', errM);
    return;
  }
  console.log('Deleted metrics for fake technicians.');

  // 2. Delete technician profiles
  const { error: errT } = await supabase.from('tecnicos')
    .delete()
    .in('id', fakeTechIds);

  if (errT) {
    console.error('Error deleting technicians:', errT);
    return;
  }
  console.log('Deleted fake technician profiles.');

  console.log('Cleanup completed successfully!');
}
run();
