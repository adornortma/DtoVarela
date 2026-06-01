const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanCells() {
  const { data: dists } = await supabase.from('distritos').select('id').eq('slug', 'montegrande').maybeSingle();
  if (!dists) {
    console.log('Montegrande district not found');
    return;
  }
  const montegrandeId = dists.id;

  console.log('Cleaning up cells for Montegrande...');

  // 1. Delete LONGCHAMPS cell
  const { data: delLong, error: errLong } = await supabase
    .from('celulas')
    .delete()
    .eq('nombre', 'LONGCHAMPS')
    .eq('distrito_id', montegrandeId)
    .select('*');

  if (errLong) {
    console.error('Error deleting LONGCHAMPS:', errLong);
  } else {
    console.log(`Deleted ${delLong?.length || 0} cell(s) named LONGCHAMPS`);
  }

  // 2. Delete MONTE_GRANDE and MS_MONTE_GRANDE (with underscores)
  const underscoredNames = ['MONTE_GRANDE', 'MS_MONTE_GRANDE'];
  for (const name of underscoredNames) {
    const { data: delUnderscore, error: errUnderscore } = await supabase
      .from('celulas')
      .delete()
      .eq('nombre', name)
      .eq('distrito_id', montegrandeId)
      .select('*');

    if (errUnderscore) {
      console.error(`Error deleting ${name}:`, errUnderscore);
    } else {
      console.log(`Deleted ${delUnderscore?.length || 0} cell(s) named ${name}`);
    }
  }

  console.log('Cell cleanup completed!');
}

cleanCells();
