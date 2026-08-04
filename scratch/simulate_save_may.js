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

async function run() {
  // Load the OCR carga
  const { data: load, error } = await supabase.from('ocr_cargas')
    .select('*')
    .eq('id', '122945a6-bcbb-4874-b762-79c5cfee5cf9')
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const selectedDistrictId = load.distrito_id;
  const monthName = 'Mayo';
  const selectedCelula = load.celula;
  const parsedData = load.datos_interpretados;

  console.log('Running real save simulation for:', load.id);

  try {
    // Fetch all technicians of the district to do in-memory matching
    const { data: allTechs } = await supabase
      .from('tecnicos')
      .select('id, nombre, apellido, nombre_normalizado, dni')
      .eq('distrito_id', selectedDistrictId);

    const cleanAndNormalize = (str) => {
      return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9\s]/gi, '')
        .toUpperCase()
        .trim();
    };

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
        console.log(`Found match: ${row.name} -> ${bestMatch.apellido}, ${bestMatch.nombre} (${bestMatch.id})`);
      } else {
        console.log(`No match: ${row.name}`);
      }

      if (tecnicoId) {
        const updatePayload = {
          resolucion: row.resolucion,
          reiteros: row.reiteros,
          productividad: row.productividad,
          tiempo_operativo: row.tiempo_operativo,
          distrito_id: selectedDistrictId,
          celula: selectedCelula
        };

        const { data: existingMetric, error: fetchErr } = await supabase
          .from('metricas_mensuales')
          .select('id')
          .eq('tecnico_id', tecnicoId)
          .eq('mes', monthName)
          .eq('distrito_id', selectedDistrictId)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (existingMetric) {
          console.log(`Updating metric for ${row.name}`);
          const { error: updErr } = await supabase
            .from('metricas_mensuales')
            .update(updatePayload)
            .eq('id', existingMetric.id);
          if (updErr) throw updErr;
        } else {
          console.log(`Inserting metric for ${row.name}`);
          const { error: insErr } = await supabase
            .from('metricas_mensuales')
            .insert({
              tecnico_id: tecnicoId,
              mes: monthName,
              ...updatePayload
            });
          if (insErr) throw insErr;
        }
      }
    }
    console.log('All metrics saved successfully!');
  } catch (e) {
    console.error('Error during execution:', e);
  }
}
run();
