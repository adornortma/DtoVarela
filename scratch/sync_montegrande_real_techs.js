const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rawTechs = [
  "DNI-29779298 - ACOSTA FACUNDO",
  "DNI-31101031 - QUIROZ ANDRES SEBASTIAN",
  "DNI-22278091 - SIDERO SERGIO EDUARDO",
  "DNI-34521304 - BRODA PABLO",
  "DNI-30991585 - LOPEZ LUCAS GUSTAVO",
  "DNI-33575437 - JIMENEZ JUAN",
  "DNI-26920898 - GAMBOA JULIO CESAR",
  "DNI-32952508 - ROMERO PABLO",
  "DNI-21549396 - GIRIC ALEJANDRO",
  "DNI-21110108 - SIDERO RUBEN OSCAR",
  "DNI-17746564 - ZACARIAS RAMON",
  "DNI-24295396 - DOMINGUEZ JORGE",
  "DNI-26879163 - PIOL GABRIEL",
  "DNI-38678579 - FERRI BRIAN EZEQUIEL",
  "DNI-35836555 - VERA FERNANDO LUIS",
  "DNI-24468880 - ENCINA ROBERTO",
  "DNI-33080952 - GALEANO ALFREDO EZEQUIEL",
  "DNI-32385626 - LOPEZ CESAR",
  "DNI-35352437 - SORIA FERNANDO",
  "DNI-17288050 - NAVARRO DANIEL JULIO",
  "DNI-32478436 - CASTRO MAURO NICOLAS",
  "DNI-31914233 - ESCOBAR MAXIMILIANO",
  "DNI-36087071 - CARNELLI DAMIAN",
  "DNI-31679336 - BRUN LEANDRO ANDRES",
  "DNI-28057801 - JOHNSTONE SANTIAGO",
  "DNI-33782231 - JUAREZ MATIAS LUCAS",
  "DNI-40233586 - GARCIA MARIANO",
  "DNI-38635062 - NICOLAS EXEQUIEL VAN SCHAIK",
  "DNI-29199824 - CRISTIAN DAMIAN GIL",
  "DNI-31790980 - PAZ MARIO LEONARDO",
  "DNI-30415089 - MACIEL GASTON RICARDO",
  "DNI-28494772 - LOPEZ HERNAN",
  "DNI-30642633 - SALINAS LUCIANO",
  "DNI-32868724 - FIORENTINO DAMIAN",
  "DNI-24259514 - FIGUEREDO CARLOS",
  "DNI-34078906 - ARIAS BERNARDO RICARDO",
  "DNI-24922222 - PITA MARIA ALEJANDRO",
  "DNI-22780774 - DIANA PABLO",
  "DNI-27555451 - SALINAS CRISTIAN",
  "DNI-18501418 - MORA JOSE ANDRES",
  "DNI-29139912 - VALLEJOS FEDERICO SEBASTIAN",
  "DNI-16902034 - AGUIRRE LEONARDO LUIS",
  "DNI-20020439 - FRALLICIARDI SERGIO",
  "DNI-27584695 - GONZALEZ ANIBAL DAMIAN",
  "DNI-35423954 - SOSA FRANCISCO",
  "DNI-93094101 - FERREIRA QUIÑONES FAVIO JOSE",
  "DNI-29272492 - ROMERO MARCOS RODOLFO",
  "DNI-29823561 - ALBORNOZ ERNESTO DAMIAN",
  "DNI-18798071 - CARBAJAL PABLO ENRIQUE",
  "DNI-35861934 - FIGUEREDO GUSTAVO EZEQUIEL",
  "DNI-38690884 - FERNANDEZ FACUNDO",
  "DNI-94283639 - RAZURI RAMON",
  "DNI-21652788 - ESTECHE PATRICIO DANIEL"
];

async function syncTechs() {
  const { data: districts } = await supabase.from('distritos').select('*').eq('slug', 'montegrande');
  if (!districts || districts.length === 0) {
    console.log('Montegrande district not found');
    return;
  }
  const montegrandeId = districts[0].id;

  console.log('Syncing real techs for Montegrande...');

  for (const raw of rawTechs) {
    const parts = raw.split(' - ').map(s => s.trim());
    if (parts.length < 2) continue;

    const dni = parts[0];
    const fullName = parts[1].toUpperCase();

    const nameParts = fullName.split(' ');
    const apellido = nameParts[0];
    const nombre = nameParts.slice(1).join(' ') || 'TÉCNICO';
    const normalName = fullName.replace(/[^A-Z]/g, '');

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
      const { data: existingDni } = await supabase
        .from('tecnicos')
        .select('*')
        .eq('dni', dni)
        .maybeSingle();

      if (existingDni) {
        console.log(`DNI ${dni} registered for ${existingDni.apellido}, ${existingDni.nombre}. Updating name and setting district Montegrande`);
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
