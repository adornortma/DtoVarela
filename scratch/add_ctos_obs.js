const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

try {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
        if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
      }
    });
  }
} catch (e) {}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addCtosObs() {
  console.log('Verificando columna observaciones en ctos...');
  
  // Since we cannot run raw DDL easily, we try to update/select from 'ctos' to check if 'observaciones' column exists.
  // Wait, let's execute a check query.
  const { data, error } = await supabase
    .from('ctos')
    .select('id, codigo')
    .limit(1);

  if (error) {
    console.error('Error querying ctos:', error);
    return;
  }
  
  console.log('Para agregar columnas DDL, el usuario debe ejecutar esto en el editor SQL de Supabase:');
  console.log('ALTER TABLE public.ctos ADD COLUMN IF NOT EXISTS observaciones text;');
}

addCtosObs();
