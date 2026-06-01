const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const cells = [
  "BANFIELD",
  "CALZADA",
  "LLAVALLOL",
  "LOMAS",
  "MS_LOMAS",
  "SOLANO"
];

async function insertLomasCells() {
  const { data: districts } = await supabase.from('distritos').select('id').eq('slug', 'lomas').maybeSingle();
  if (!districts) {
    console.log('Lomas district not found');
    return;
  }
  const lomasId = districts.id;

  console.log('Inserting cells for Lomas...');

  for (const cellName of cells) {
    // Check if cell already exists
    const { data: existing } = await supabase
      .from('celulas')
      .select('id')
      .eq('nombre', cellName)
      .eq('distrito_id', lomasId)
      .maybeSingle();

    if (!existing) {
      console.log(`Inserting cell: ${cellName}`);
      const { error } = await supabase
        .from('celulas')
        .insert({
          nombre: cellName,
          distrito_id: lomasId,
          operativa: true
        });
      if (error) {
        console.error(`Error inserting ${cellName}:`, error);
      }
    } else {
      console.log(`Cell ${cellName} already exists`);
    }
  }

  console.log('Finished inserting Lomas cells!');
}

insertLomasCells();
