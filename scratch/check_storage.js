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

async function checkStorage() {
  console.log('Inspeccionando buckets de almacenamiento...');
  
  // 1. List buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('Error listando buckets:', bucketsError);
    return;
  }
  
  console.log('Buckets existentes:', buckets);
  
  const hasDespliegues = buckets.some(b => b.name === 'despliegues');
  if (!hasDespliegues) {
    console.log('\n¡ADVERTENCIA! El bucket "despliegues" no existe en Supabase.');
    console.log('Intentando crear el bucket "despliegues" desde el script...');
    
    const { data: createData, error: createError } = await supabase.storage.createBucket('despliegues', {
      public: true
    });
    
    if (createError) {
      console.error('Error creando el bucket:', createError);
      console.log('Es posible que no tengas permisos de administrador con la anon key para crear buckets.');
      console.log('Deberás crear manualmente el bucket llamado "despliegues" desde el panel de Supabase y configurarlo como PUBLIC.');
    } else {
      console.log('Bucket "despliegues" creado exitosamente como público:', createData);
    }
  } else {
    console.log('\nEl bucket "despliegues" ya existe.');
    const desplieguesBucket = buckets.find(b => b.name === 'despliegues');
    console.log('Detalles del bucket:', desplieguesBucket);
    
    if (!desplieguesBucket.public) {
      console.log('¡ADVERTENCIA! El bucket "despliegues" existe pero no está configurado como PÚBLICO. Debes hacerlo público en el panel de Supabase.');
    }
  }
}

checkStorage();
