const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const lanusId = 'ad787214-2118-4c45-97fa-c15698d77e99';

const loadsToProcess = [
  { id: '8269c807-4d84-4e9d-93b1-9675248432dc', cell: 'GM_ LANUS', type: 'detail' },
  { id: 'be15f913-407b-47ad-a802-32c0c8985b02', cell: 'GM_ LOMAS', type: 'detail' },
  { id: 'dfd5a2cf-1164-4b2c-b871-d7779c30c6bd', cell: 'GM_MONTE_GRANDE', type: 'detail' },
  { id: 'b350940a-95bd-4199-aca3-f43fcd67267d', cell: 'GM_QUILMES_ VARELA', type: 'detail' },
  { id: '122945a6-bcbb-4874-b762-79c5cfee5cf9', cell: 'LANUS', type: 'detail' },
  { id: '5490ca86-bf47-49dc-84e3-9a4d67998e7b', cell: 'MONTE_ CHINGOLO', type: 'detail' },
  { id: '6b516a3b-c02c-474a-9453-169c8107abbb', cell: 'MS. LANUS ', type: 'detail' },
  { id: '44a2e29f-9bdb-48ce-b1e9-c5c5e7a9c8b5', cell: 'PIÑEYRO', type: 'detail' },
  { id: '39f19b9c-9d50-4e70-8077-5e0eee9fcf74', cell: 'SARANDI', type: 'summary' } // This is cell summary!
];

async function run() {
  console.log('Restoring May metrics for Lanus...');

  const { data: allTechs } = await supabase
    .from('tecnicos')
    .select('id, nombre, apellido, nombre_normalizado, dni')
    .eq('distrito_id', lanusId);

  const cleanAndNormalize = (str) => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9\s]/gi, '')
      .toUpperCase()
      .trim();
  };

  for (const config of loadsToProcess) {
    const { data: load } = await supabase.from('ocr_cargas').select('*').eq('id', config.id).single();
    if (!load) {
      console.log(`Load ${config.id} not found.`);
      continue;
    }

    console.log(`Processing load ${load.id} (${load.celula}) as ${config.type}...`);
    const parsedData = load.datos_interpretados || [];

    if (config.type === 'summary') {
      // Process as cell totals
      for (const row of parsedData) {
        const isDistSummary = row.name.toUpperCase() === 'DISTRITO';
        const cellName = isDistSummary ? 'DISTRITO_LANUS' : row.name.toUpperCase();

        const updatePayload = {
          resolucion: row.resolucion,
          reiteros: row.reiteros,
          productividad: row.productividad,
          tiempo_operativo: row.tiempo_operativo,
          distrito_id: lanusId
        };

        const { data: existingMetric } = await supabase
          .from('metricas_mensuales')
          .select('id')
          .eq('celula', cellName)
          .eq('mes', 'Mayo')
          .eq('distrito_id', lanusId)
          .is('tecnico_id', null)
          .maybeSingle();

        if (existingMetric) {
          console.log(`  Summary: Updating cell metric ${cellName}`);
          await supabase.from('metricas_mensuales').update(updatePayload).eq('id', existingMetric.id);
        } else {
          console.log(`  Summary: Inserting cell metric ${cellName}`);
          await supabase.from('metricas_mensuales').insert({
            celula: cellName,
            mes: 'Mayo',
            ...updatePayload
          });
        }
      }
    } else {
      // Process as technician metrics
      for (const row of parsedData) {
        const targetClean = cleanAndNormalize(row.name);
        const targetWords = targetClean.split(/\s+/).filter(Boolean);
        
        let bestMatch = null;
        let maxOverlap = 0;

        if (allTechs) {
          for (const t of allTechs) {
            const techClean = cleanAndNormalize((t.apellido || '') + ' ' + (t.nombre || ''));
            const techWords = techClean.split(/\s+/).filter(Boolean);
            
            // Calculate overlap
            const intersection = targetWords.filter(w => techWords.includes(w));
            if (intersection.length > 0) {
              const overlapScore = intersection.length / Math.max(targetWords.length, techWords.length);
              if (overlapScore > maxOverlap && overlapScore >= 0.5) {
                maxOverlap = overlapScore;
                bestMatch = t;
              }
            }
          }
        }

        let tecnicoId = null;
        if (bestMatch) {
          tecnicoId = bestMatch.id;
        } else {
          // Create temp tech
          const cleanTechName = row.name.trim();
          let apellido = '';
          let nombre = '';
          if (cleanTechName.includes(',')) {
            const parts = cleanTechName.split(',').map(s => s.trim());
            apellido = parts[0] || '';
            nombre = parts.slice(1).join(', ') || '';
          } else {
            const parts = cleanTechName.split(/\s+/).map(s => s.trim());
            apellido = parts[0] || '';
            nombre = parts.slice(1).join(' ') || '';
          }
          
          const normalName = cleanAndNormalize(cleanTechName).replace(/\s+/g, '');
          const mockDni = 'TEMP-' + Math.floor(10000000 + Math.random() * 90000000);
          
          const { data: newTech } = await supabase
            .from('tecnicos')
            .insert({
              nombre: nombre || 'TECNICO',
              apellido: apellido || 'TECNICO',
              nombre_normalizado: normalName || 'TECNICO',
              dni: mockDni,
              distrito_id: lanusId
            })
            .select('id')
            .single();
          if (newTech) tecnicoId = newTech.id;
          console.log(`  Tech: Created temp tech for ${row.name} -> ID: ${tecnicoId}`);
        }

        if (tecnicoId) {
          const updatePayload = {
            resolucion: row.resolucion,
            reiteros: row.reiteros,
            productividad: row.productividad,
            tiempo_operativo: row.tiempo_operativo,
            distrito_id: lanusId,
            celula: config.cell
          };

          const { data: existingMetric } = await supabase
            .from('metricas_mensuales')
            .select('id')
            .eq('tecnico_id', tecnicoId)
            .eq('mes', 'Mayo')
            .eq('distrito_id', lanusId)
            .maybeSingle();

          if (existingMetric) {
            console.log(`  Tech: Updating metric for ${row.name}`);
            await supabase.from('metricas_mensuales').update(updatePayload).eq('id', existingMetric.id);
          } else {
            console.log(`  Tech: Inserting metric for ${row.name}`);
            await supabase.from('metricas_mensuales').insert({
              tecnico_id: tecnicoId,
              mes: 'Mayo',
              ...updatePayload
            });
          }
        }
      }
    }
  }

  console.log('Restoration completed successfully!');
}
run();
