const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rawTechs = [
  "DNI-31096411 - SZOSTAK DARIO",
  "DNI-22089487 - SANCHEZ PINTOS RAFAEL V",
  "DNI-28435267 - ROBLEDO RICARDO ANDRES",
  "DNI-35127688 - SUAREZ JONATAN EMANUEL",
  "DNI-24680331 - JORGE ADRIAN MARCELO",
  "DNI-24846303 - AGUILERA LUIS ALBERTO",
  "DNI-23969659 - FARIAS SEBASTIAN",
  "DNI-24128385 - TELLO VICTOR LEONARDO",
  "DNI-32336963 - OJEDA JORGE MARCELO",
  "DNI-27262649 - CABRERA GUSTAVO",
  "DNI-20348786 - DOMINGUEZ MARCELO JAVIER",
  "DNI-17971173 - SEIVA FERNANDO",
  "DNI-27634707 - LANDI DAMIAN",
  "DNI-30465982 - RIOS MARCELO GERMAN",
  "DNI-22173421 - FRESCO MARCELO",
  "DNI-23618647 - GUTIERREZ LUIS OMAR",
  "DNI-29150069 - TOLOZA RUBEN ORLANDO",
  "DNI-35855403 - OSINAGA SEBASTIAN",
  "DNI-28369099 - RUIZ JORGE EZEQUIEL",
  "DNI-32022334 - RUEDA MATIAS EZEQUIEL",
  "DNI-33221491 - ECHECURY FEDERICO OSCAR",
  "DNI-23414027 - GOMEZ GUZMAN GUSTAVO",
  "DNI-27152923 - GATTI AUGUSTO SALVADOR",
  "DNI-21549866 - PAEZ ROBERTO",
  "DNI-26879950 - GUAGLIANO GABRIEL ALBERTO",
  "DNI-32122381 - SCORZIELLO FERNANDO",
  "DNI-23499356 - LAMBERTINI DARIO",
  "DNI-32843460 - FERNANDEZ RICARDO ANIBAL",
  "DNI-26424864 - CORBALAN CLAUDIO DANIEL",
  "DNI-31898708 - CARABAJAL DANIEL",
  "DNI-18424046 - VIDELA CESAR",
  "DNI-29891684 - MATIAS JURJO",
  "DNI-34415007 - OSINAGA CRISTIAN",
  "DNI-21071882 - CUFRE ROBERTO HERNAN",
  "DNI-20344532 - RIVERO OSCAR MARCELO",
  "DNI-28573750 - CISNEROS CLAUDIO CESAR",
  "DNI-34035195 - RAMIREZ SERGIO DANIEL",
  "DNI-30839092 - CAMBIAGNO CRISTIAN EZEQUIEL",
  "DNI-20939284 - SOSA LUIS ALBERTO",
  "DNI-28032373 - GONZALEZ ALDO ANDRES",
  "DNI-33363203 - FERREIRA RODRIGO ARIEL",
  "DNI-31780770 - BARONE JUAN MANUEL",
  "DNI-22057179 - FERNANDEZ HECTOR",
  "DNI-35424726 - FARIÑAS GASTON ALEJANDRO",
  "DNI-20468671 - SIEMSEN PEDRO",
  "DNI-33606318 - FERRADA GUILLEN JONATAN",
  "DNI-21652788 - ESTECHE PATRICIO DANIEL",
  "DNI-37782139 - FIORENTINO NICOLAS",
  "DNI-26047716 - GARCIA MARIANO MARTIN",
  "DNI-27534618 - ROMERO HERNAN RAUL",
  "DNI-35861934 - FIGUEREDO GUSTAVO EZEQUIEL",
  "DNI-30086487 - RUIZ DAVID"
];

async function syncTechs() {
  const { data: districts } = await supabase.from('distritos').select('*').eq('slug', 'montegrande');
  if (!districts || districts.length === 0) {
    console.log('Montegrande district not found');
    return;
  }
  const montegrandeId = districts[0].id;

  console.log('Syncing techs for Montegrande...');

  for (const raw of rawTechs) {
    const parts = raw.split(' - ').map(s => s.trim());
    if (parts.length < 2) continue;

    const dni = parts[0];
    const fullName = parts[1].toUpperCase();

    // Split name: Apellido + Nombres
    const nameParts = fullName.split(' ');
    const apellido = nameParts[0];
    const nombre = nameParts.slice(1).join(' ') || 'TÉCNICO';
    const normalName = fullName.replace(/[^A-Z]/g, '');

    // Check if tech already exists by name_normalizado
    const { data: existingTech } = await supabase
      .from('tecnicos')
      .select('*')
      .eq('distrito_id', montegrandeId)
      .ilike('nombre_normalizado', `%${normalName}%`)
      .limit(1)
      .maybeSingle();

    if (existingTech) {
      if (existingTech.dni !== dni) {
        console.log(`Updating DNI for existing tech ${fullName}: ${existingTech.dni} -> ${dni}`);
        await supabase
          .from('tecnicos')
          .update({ dni })
          .eq('id', existingTech.id);
      }
    } else {
      // Check if DNI already exists for another record (just to be safe)
      const { data: existingDni } = await supabase
        .from('tecnicos')
        .select('*')
        .eq('dni', dni)
        .maybeSingle();

      if (existingDni) {
        console.log(`DNI ${dni} already registered for ${existingDni.apellido}, ${existingDni.nombre}. Updating name and setting district Montegrande`);
        await supabase
          .from('tecnicos')
          .update({
            nombre,
            apellido,
            nombre_normalizado: normalName,
            distrito_id: montegrandeId
          })
          .eq('id', existingDni.id);
      } else {
        console.log(`Inserting new tech: ${fullName} (${dni})`);
        await supabase
          .from('tecnicos')
          .insert({
            nombre,
            apellido,
            nombre_normalizado: normalName,
            dni,
            distrito_id: montegrandeId
          });
      }
    }
  }
  console.log('Sync completed successfully!');
}

syncTechs();
