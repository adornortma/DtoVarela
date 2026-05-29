const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rawTechs = [
  "DNI-33368419 - PEREZ GUIDO SEBASTIAN",
  "DNI-22818063 - CERDA CHRISTIAN",
  "DNI-24715791 - ALCARAZ ANTONIO RUBEN",
  "DNI-36167004 - GARCIA CARLOS FACUNDO",
  "DNI-23251502 - ESPINDOLA ROBERTO LEONARDO",
  "DNI-30599348 - FIGUEREDO  RODRIGO",
  "DNI-36296997 - BUSTOS BRIAN ARIEL",
  "DNI-39458898 - JUAREZ CARLOS NICOLAS",
  "DNI-33530332 - GENISSO LUCAS GABRIEL",
  "DNI-18607314 - MORALES ALEJANDRO ARMANDO",
  "DNI-31391837 - CONTRERAS JOSE",
  "DNI-33082227 - DOMINGUEZ CRISTIAN",
  "DNI-29077489 - LOPEZ MARTIN",
  "DNI-23981013 - CASTRO MIGUEL",
  "DNI-35375661 - RUIZ JONATHAN",
  "DNI-31504694 - ORDOÑEZ SEBASTIAN EZEQUIEL",
  "DNI-31617457 - FUSCO GUILLERMO",
  "DNI-39587196 - FERNANDEZ DAVID",
  "DNI-34530328 - KEREKES JONATAN",
  "DNI-35235200 - DIEGUEZ MAXIMILIANO NESTOR",
  "DNI-28985682 - MORALES MARIANO ALFREDO",
  "DNI-34390828 - MARTINEZ LEONARDO",
  "DNI-27338334 - ARIAS HECTOR",
  "DNI-36375916 - CIBEYRA ELOY",
  "DNI-38961471 - SOSA IVAN EDGAR",
  "DNI-26312764 - RAMENZONI GUSTAVO LUIS",
  "DNI-32191827 - SALORIO MARTIN DANIEL",
  "DNI-32311827 - DIAZ ROBERTO DAMIAN",
  "DNI-28830597 - SCORZIELLO MONICA LORENA",
  "DNI-35976255 - FERREIRA QUIÑONEZ DAVID",
  "DNI-37387955 - OJEDA DANIEL",
  "DNI-27935898 - PEREYRA LEON PABLO",
  "DNI-37843734 - ESCOBAR FEDERICO",
  "DNI-34078813 - DE LA IGLESIA ELIAN FEDERICO",
  "DNI-21675119 - BENITEZ GUILLERMO",
  "DNI-20599609 - LOCCIZANO GABRIEL",
  "DNI-29246270 - RUBIANES RUBEN DARIO",
  "DNI-29038732 - CONTRERA FERNANDO",
  "DNI-23091138 - MALAKIAN JUAN ALBERTO",
  "DNI-33575333 - CUENCA LEONARDO",
  "DNI-36594873 - ZARATE SEBASTIAN",
  "DNI-27949249 - RUIZ LUIS",
  "DNI-33874802 - ROJAS MAXIMILIANO",
  "DNI-22813448 - JAIME MARCELO RAUL",
  "DNI-29636321 - BARBIERI OMAR",
  "DNI-22346581 - CHAZARRETA CARLOS GUSTAVO",
  "DNI-23154960 - PONCE FERNANDO",
  "DNI-25969726 - TAIBO GABRIEL ALEJANDRO",
  "DNI-35755390 - ORTIGOZA EMMANUEL JAVIER",
  "DNI-26801614 - OLIVA JORGE AUGUSTO",
  "DNI-36843089 - LUNA MATIAS",
  "DNI-28962987 - ORO ARIEL",
  "DNI-29947004 - ROJAS ARIEL ALEJANDRO",
  "DNI-35863621 - FIGUEROA ALAN",
  "DNI-17294249 - LOPEZ OSVALDO HECTOR",
  "DNI-23126782 - FALCON AGUSTIN ALEJANDRO",
  "DNI-23178716 - CORBALAN ADRIAN DAVID",
  "DNI-32949974 - DENINOTTI LUCIANO",
  "DNI-27688282 - BACIGALUPO NICOLAS",
  "DNI-18291116 - RODRIGUEZ RAMON",
  "DNI-20420036 - JURI ROGELIO",
  "DNI-38611104 - CARBONE GABRIEL",
  "DNI-24183024 - RAMAGNANO DIEGO MARTIN",
  "DNI-28282593 - COLLICH COSTRE CRISTIAN",
  "DNI-23846052 - HERBAS ANDRES ALEJANDRO",
  "DNI-35855232 - LORENZO EZEQUIEL",
  "DNI-30505569 - SETTEMBRI DIEGO",
  "DNI-25164156 - DANERI JUAN MANUEL",
  "DNI-31822092 - ARGUELLES VICTOR MANUEL",
  "DNI-17212242 - VAZQUEZ DANIEL ALEJANDRO",
  "DNI-35370213 - MASTROPASQUA PABLO LEONEL",
  "DNI-29668078 - MONTOYA ARIEL",
  "DNI-37937436 - BARRETO GONZALO ARIEL",
  "DNI-93800377 - CASSANI ANTONIO",
  "DNI-20618121 - MARINO DAMIAN ALBERTO",
  "DNI-18457387 - GONZALEZ JUAN JOSE",
  "DNI-36754266 - JOEL AMIR GÓMEZ PASILIO",
  "DNI-33782371 - TORRES FACUNDO NAHUEL",
  "DNI-39056298 - RODRIGUEZ HEREDIA IVAN",
  "DNI-28941465 - GOMEZ SERGIO DARIO",
  "DNI-33419741 - REIMONDEZ HERNAN GABRIEL",
  "DNI-20252565 - GONZALEZ DAMIAN",
  "DNI-17824304 - CAÑETE MIGUEL ANGEL",
  "DNI-21626640 - PARED JUAN MANUEL"
];

async function syncTechs() {
  const { data: districts } = await supabase.from('distritos').select('*').eq('slug', 'lanus');
  if (!districts || districts.length === 0) {
    console.log('Lanus district not found');
    return;
  }
  const lanusId = districts[0].id;

  console.log('Syncing techs for Lanus...');

  for (const raw of rawTechs) {
    const parts = raw.split(' - ').map(s => s.trim());
    if (parts.length < 2) continue;

    const dni = parts[0];
    const fullName = parts[1].toUpperCase();

    // Split name
    const nameParts = fullName.split(' ');
    const apellido = nameParts[0];
    const nombre = nameParts.slice(1).join(' ') || 'TÉCNICO';
    const normalName = fullName.replace(/[^A-Z]/g, '');

    // Check if tech already exists by name_normalizado
    const { data: existingTech } = await supabase
      .from('tecnicos')
      .select('*')
      .eq('distrito_id', lanusId)
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
        console.log(`DNI ${dni} already registered for ${existingDni.apellido}, ${existingDni.nombre}. Updating name to ${fullName}`);
        await supabase
          .from('tecnicos')
          .update({
            nombre,
            apellido,
            nombre_normalizado: normalName,
            distrito_id: lanusId
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
            distrito_id: lanusId
          });
      }
    }
  }
  console.log('Sync completed successfully!');
}

syncTechs();
