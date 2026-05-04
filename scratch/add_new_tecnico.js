const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addTecnico() {
  const dni = '35976255';
  const nombre = 'DAVID';
  const apellido = 'FERREIRA QUIÑONEZ';
  const nombreNormalizado = `${apellido}, ${nombre}`; // Usually APELLIDO, Nombre
  
  console.log(`Buscando técnico con DNI: ${dni}`);
  const { data: existing, error: errExist } = await supabase
    .from('tecnicos')
    .select('*')
    .eq('dni', dni)
    .single();
    
  if (existing) {
    console.log('El técnico ya existe:', existing);
    return;
  }

  console.log(`Insertando: ${nombreNormalizado}`);
  const { data, error } = await supabase
    .from('tecnicos')
    .insert({
      dni: dni,
      nombre: nombre,
      apellido: apellido,
      nombre_normalizado: nombreNormalizado
    })
    .select();

  if (error) {
    console.error('Error insertando técnico:', error);
  } else {
    console.log('Técnico insertado correctamente:', data);
  }
}

addTecnico();
