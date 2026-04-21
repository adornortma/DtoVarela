
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findTechs() {
  const names = ['SEGOVIA JAVIER ANDRES', 'GARCIA, CARLOS FACUNDO', 'GARCIA CARLOS FACUNDO'];
  const { data, error } = await supabase
    .from('tecnicos')
    .select('id, nombre, apellido, dni')
    .or(`nombre_normalizado.ilike.%segovia%,nombre_normalizado.ilike.%garcia%`);
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

findTechs();
