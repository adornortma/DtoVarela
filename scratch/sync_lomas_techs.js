const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const dnis = [
  "DNI-31096411", "DNI-22089487", "DNI-28435267", "DNI-35127688", "DNI-24680331",
  "DNI-24846303", "DNI-23969659", "DNI-24128385", "DNI-32336963", "DNI-27262649",
  "DNI-20348786", "DNI-17971173", "DNI-27634707", "DNI-30465982", "DNI-22173421",
  "DNI-23618647", "DNI-29150069", "DNI-35855403", "DNI-28369099", "DNI-32022334",
  "DNI-33221491", "DNI-23414027", "DNI-27152923", "DNI-21549866", "DNI-26879950",
  "DNI-32122381", "DNI-23499356", "DNI-32843460", "DNI-26424864", "DNI-31898708",
  "DNI-18424046", "DNI-29891684", "DNI-34415007", "DNI-21071882", "DNI-20344532",
  "DNI-28573750", "DNI-34035195", "DNI-30839092", "DNI-20939284", "DNI-28032373",
  "DNI-33363203", "DNI-31780770", "DNI-22057179", "DNI-35424726", "DNI-20468671",
  "DNI-33606318", "DNI-21652788", "DNI-37782139", "DNI-26047716", "DNI-27534618",
  "DNI-35861934", "DNI-30086487"
];

async function reassignTechs() {
  // Get Lomas ID
  const { data: lomasDist } = await supabase.from('distritos').select('id').eq('slug', 'lomas').maybeSingle();
  if (!lomasDist) {
    console.log('Lomas district not found');
    return;
  }
  const lomasId = lomasDist.id;

  console.log(`Reassigning ${dnis.length} techs to Lomas...`);

  let count = 0;
  for (const dni of dnis) {
    const { data: updated, error } = await supabase
      .from('tecnicos')
      .update({ distrito_id: lomasId })
      .eq('dni', dni)
      .select('nombre, apellido');

    if (error) {
      console.error(`Error updating tech with DNI ${dni}:`, error);
    } else if (updated && updated.length > 0) {
      console.log(`Successfully moved ${updated[0].apellido}, ${updated[0].nombre} (${dni}) to Lomas`);
      count++;
    } else {
      console.log(`No tech found with DNI ${dni}`);
    }
  }

  console.log(`Reassignment finished. Total updated: ${count}`);
}

reassignTechs();
