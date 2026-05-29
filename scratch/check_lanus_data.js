const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCargas() {
  const { data: districts } = await supabase.from('distritos').select('*').eq('slug', 'lanus');
  if (!districts || districts.length === 0) return;
  const lanusId = districts[0].id;

  const { data: cargas, error } = await supabase
    .from('ocr_cargas')
    .select('*')
    .eq('distrito_id', lanusId);

  if (error) {
    console.error('Error fetching ocr_cargas:', error);
  } else {
    console.log(`Found ${cargas.length} entries in ocr_cargas for Lanus:`);
    cargas.forEach(c => {
      console.log(`ID: ${c.id}, Celula: ${c.celula}, Mes: ${c.mes}, Anio: ${c.anio}, Status: ${c.processing_status}, Replaced: ${c.replaced_previous}`);
      console.log(`Raw text length: ${c.ocr_raw?.length}`);
      console.log(`Data interpretada row count: ${c.datos_interpretados?.length}`);
      if (c.datos_interpretados) {
        console.log('Sample parsed rows:', c.datos_interpretados.slice(0, 3));
      }
      console.log('------------------------------');
    });
  }
}

checkCargas();
