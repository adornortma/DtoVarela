const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUnique() {
  const { data: districts } = await supabase.from('distritos').select('*').eq('slug', 'lanus');
  if (!districts || districts.length === 0) return;
  const lanusId = districts[0].id;

  const res1 = await supabase
    .from('tecnicos')
    .insert({
      nombre: 'JUAN FRANCISCO',
      apellido: 'ARROUGE',
      nombre_normalizado: 'ARROUGEJUANFRANCISCO',
      dni: 'TEMP-12345678',
      distrito_id: lanusId
    })
    .select('id');

  console.log('Insert 1 Result:', res1);

  const res2 = await supabase
    .from('tecnicos')
    .insert({
      nombre: 'JUAN FRANCISCO 2',
      apellido: 'ARROUGE 2',
      nombre_normalizado: 'ARROUGEJUANFRANCISCO2',
      dni: 'TEMP-12345678',
      distrito_id: lanusId
    })
    .select('id');

  console.log('Insert 2 Result:', res2);
}

testUnique();
