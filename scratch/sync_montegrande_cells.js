const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const cells = [
  "ADROGUE",
  "BURZACO",
  "EZEIZA",
  "LONGCHAMPS",
  "MONTE GRANDE",
  "MS MONTE GRANDE"
];

async function insertCells() {
  const { data: districts } = await supabase.from('distritos').select('id').eq('slug', 'montegrande');
  if (!districts || districts.length === 0) {
    console.log('Montegrande district not found');
    return;
  }
  const montegrandeId = districts[0].id;

  console.log('Inserting cells for Montegrande...');

  for (const cellName of cells) {
    // Check if cell already exists
    const { data: existing } = await supabase
      .from('celulas')
      .select('id')
      .eq('nombre', cellName)
      .eq('distrito_id', montegrandeId)
      .maybeSingle();

    if (!existing) {
      console.log(`Inserting cell: ${cellName}`);
      const { error } = await supabase
        .from('celulas')
        .insert({
          nombre: cellName,
          distrito_id: montegrandeId,
          operativa: true
        });
      if (error) {
        console.error(`Error inserting ${cellName}:`, error);
      }
    } else {
      console.log(`Cell ${cellName} already exists`);
    }
  }

  console.log('Finished inserting cells!');
}

insertCells();
