const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse env file
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
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
  } catch (e) {
    console.error('Error reading env file:', e);
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteSigestByNumber(numero) {
  console.log(`Buscando SIGEST número: ${numero}...`);
  
  // 1. Find SIGEST
  const { data: sigest, error: findError } = await supabase
    .from('sigests')
    .select('id, numero_sigest, central')
    .eq('numero_sigest', numero)
    .maybeSingle();

  if (findError) {
    console.error('Error buscando el SIGEST:', findError);
    return;
  }

  if (!sigest) {
    console.log(`No se encontró ningún SIGEST con el número ${numero}.`);
    return;
  }

  console.log(`SIGEST encontrado: ID = ${sigest.id}, Central = ${sigest.central}. Procediendo a eliminar...`);

  // 2. Delete SIGEST (ON DELETE CASCADE handles related CTOs, activities, photos, materials, history)
  const { error: deleteError } = await supabase
    .from('sigests')
    .delete()
    .eq('id', sigest.id);

  if (deleteError) {
    console.error('Error al eliminar el SIGEST:', deleteError);
  } else {
    console.log(`SIGEST ${numero} y toda su información relacionada fueron eliminados exitosamente.`);
  }
}

deleteSigestByNumber('6103371251');
