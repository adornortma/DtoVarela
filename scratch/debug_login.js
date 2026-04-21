
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://phvothtgvpquzwpyuilz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U'
);

async function debugLogin() {
  console.log('--- DEBBUGEANDO LOGIN ---');
  
  // 1. Verificar si la tabla existe y cuántos hay
  const { data: allUsers, error: listError } = await supabase
    .from('usuarios')
    .select('usuario, rol');
  
  if (listError) {
    console.error('ERROR AL LISTAR USUARIOS:', listError.message);
    console.log('Si el error dice "relation public.usuarios does not exist", es que la tabla NO existe en Supabase.');
    console.log('Si el error dice "new row violates row-level security policy", es un tema de RLS.');
    return;
  }

  console.log(`Usuarios encontrados en la DB: ${allUsers.length}`);
  console.log('Lista de usuarios:', allUsers.map(u => u.usuario).join(', '));

  // 2. Probar el query específico que usa el login
  const username = 'LOPEZF';
  const { data: user, error: loginError } = await supabase
    .from('usuarios')
    .select('*')
    .ilike('usuario', username)
    .single();

  if (loginError) {
    console.error(`ERROR AL BUSCAR "${username}":`, loginError.message);
  } else {
    console.log(`USUARIO "${username}" ENCONTRADO OK:`, user);
  }
}

debugLogin();
