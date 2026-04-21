
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkUsers() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*');
  
  if (error) {
    console.error('Error al consultar usuarios:', error.message);
    console.log('--- SUGERENCIA: Es posible que necesites crear la tabla en el SQL Editor de Supabase ---');
  } else {
    console.log('Tabla "usuarios" detectada.');
    console.log(`Cantidad de usuarios: ${data.length}`);
  }
}

checkUsers();
