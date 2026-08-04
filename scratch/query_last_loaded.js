const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: varela } = await supabase
    .from('distritos')
    .select('*')
    .eq('slug', 'varela')
    .single();

  const { data: monthly } = await supabase
    .from('metricas_mensuales')
    .select('mes')
    .eq('distrito_id', varela.id);
  
  console.log('Unique months in metricas_mensuales for Varela:', Array.from(new Set(monthly.map(m => m.mes))));
}

main().catch(console.error);
