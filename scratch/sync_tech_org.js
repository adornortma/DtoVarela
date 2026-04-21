const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';
const supabase = createClient(supabaseUrl, supabaseKey);

const techData = [
  { dni: "36167004", name: "GARCIA, CARLOS FACUNDO", distrito: "LANUS", celula: "GM LOMAS", role: "GM" },
  { dni: "35755390", name: "ORTIGOZA, EMMANUEL JAVIER", distrito: "LANUS", celula: "PIÑEYRO", role: "REVISOR" },
  { dni: "23126782", name: "FALCON, AGUSTIN ALEJANDRO", distrito: "LANUS", celula: "SARANDI", role: "REVISOR" },
  { dni: "40422966", name: "TORRES, CHRISTIAN NICOLAS", distrito: "LANUS", celula: "SARANDI", role: "REVISOR" },
  { dni: "22813448", name: "JAIME, MARCELO RAUL", distrito: "LANUS", celula: "MS LANUS", role: "EMPALMADOR" },
  { dni: "21626640", name: "PARED, JUAN MANUEL", distrito: "LANUS", celula: "MS LANUS", role: "EMPALMADOR" },
  { dni: "26299844", name: "RIOS RADO, EMILIO", distrito: "LANUS", celula: "MS LANUS", role: "EMPALMADOR" },
  { dni: "37843734", name: "ESCOBAR, FEDERICO", distrito: "LANUS", celula: "GM LANUS", role: "GM" },
  { dni: "34078906", name: "ARIAS, BERNARDO", distrito: "MONTE GRANDE", celula: "BURZACO", role: "REVISOR" },
  { dni: "30642633", name: "SALINAS, LUCIANO", distrito: "MONTE GRANDE", celula: "BURZACO", role: "REVISOR" },
  { dni: "22780774", name: "DIANA, PABLO", distrito: "MONTE GRANDE", celula: "LONGCHAMPS", role: "REVISOR" },
  { dni: "24259514", name: "FIGUEREDO, CARLOS", distrito: "MONTE GRANDE", celula: "MS MONTE GRANDE", role: "EMPALMADOR" },
  { dni: "38690884", name: "FERNANDEZ, FACUNDO", distrito: "MONTE GRANDE", celula: "MS MONTE GRANDE", role: "EMPALMADOR" },
  { dni: "37653458", name: "STELLA, SERGIO LEONEL", distrito: "VARELA", celula: "RANELAGH", role: "REVISOR" }
];

async function sync() {
  console.log('Iniciando sincronización de datos organizativos...');
  
  for (const tech of techData) {
    const { data, error } = await supabase
      .from('tecnicos')
      .update({
        distrito: tech.distrito,
        celula: tech.celula,
        role: tech.role
      })
      .eq('dni', tech.dni);
      
    if (error) {
      console.error(`Error actualizando DNI ${tech.dni}:`, error.message);
    } else {
      console.log(`DNI ${tech.dni} (${tech.name}) actualizado: ${tech.distrito} -> ${tech.celula} -> ${tech.role}`);
    }
  }
  
  console.log('Sincronización completa.');
}

sync();
