const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load env from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTable() {
  console.log('Verificando tabla seguimiento_bp_log...');
  const { data, error } = await supabase
    .from('seguimiento_bp_log')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error al acceder a seguimiento_bp_log:', error.message);
    if (error.code === '42P01') {
      console.log('La tabla NO existe.');
    }
  } else {
    console.log('Conexión exitosa. La tabla existe.');
    console.log('Datos (primer registro):', data);
  }
}

testTable();
