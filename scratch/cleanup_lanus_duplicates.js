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

async function run() {
  console.log('Starting Lanus duplicate technician cleanup...');

  // Fetch all technicians of Lanus
  const { data: allTechs, error } = await supabase.from('tecnicos')
    .select('*')
    .eq('distrito_id', lanusId);

  if (error) {
    console.error(error);
    return;
  }

  const tempTechs = allTechs.filter(t => t.dni.startsWith('TEMP-'));
  const realTechs = allTechs.filter(t => !t.dni.startsWith('TEMP-'));

  console.log(`Found ${tempTechs.length} temporary technicians and ${realTechs.length} real technicians in Lanus.`);

  const cleanAndNormalize = (str) => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9\s]/gi, '')
      .toUpperCase()
      .trim();
  };

  for (const temp of tempTechs) {
    // The temp name looks like: apellido = 'ARIAS HECTOR EDGARDO', nombre = 'TÉCNICO'
    // We clean and normalize the target name
    const rawTargetName = temp.apellido || '';
    const targetClean = cleanAndNormalize(rawTargetName);
    const targetWords = targetClean.split(/\s+/).filter(Boolean);

    let bestMatch = null;
    let maxOverlap = 0;

    for (const real of realTechs) {
      const techClean = cleanAndNormalize((real.apellido || '') + ' ' + (real.nombre || ''));
      const techWords = techClean.split(/\s+/).filter(Boolean);

      const intersection = targetWords.filter(w => techWords.includes(w));
      if (intersection.length > 0) {
        const overlapScore = intersection.length / Math.max(targetWords.length, techWords.length);
        if (overlapScore > maxOverlap && overlapScore >= 0.5) {
          maxOverlap = overlapScore;
          bestMatch = real;
        }
      }
    }

    if (bestMatch) {
      console.log(`Mapping Temp Tech [${temp.id}] "${rawTargetName}" -> Real Tech [${bestMatch.id}] "${bestMatch.apellido}, ${bestMatch.nombre}"`);
      
      // Update metricas_mensuales to point to the real technician
      const { data: updatedMetrics, error: errM } = await supabase.from('metricas_mensuales')
        .update({ tecnico_id: bestMatch.id })
        .eq('tecnico_id', temp.id);

      if (errM) {
        console.error(`  Error updating metrics for temp tech ${temp.id}:`, errM);
        continue;
      }

      // Delete the temp technician profile
      const { error: errT } = await supabase.from('tecnicos')
        .delete()
        .eq('id', temp.id);

      if (errT) {
        console.error(`  Error deleting temp tech ${temp.id}:`, errT);
      } else {
        console.log(`  Successfully merged and deleted temp tech ${temp.id}`);
      }
    } else {
      // No match found in real technicians. Let's just fix the temp technician's name
      // Split the surname/name correctly
      const nameParts = rawTargetName.trim().split(/\s+/);
      const newApellido = nameParts[0] || 'TECNICO';
      const newNombre = nameParts.slice(1).join(' ') || '';
      const normName = cleanAndNormalize(rawTargetName).replace(/\s+/g, '');

      console.log(`No match for "${rawTargetName}". Fixing name format in database to: "${newApellido}, ${newNombre}"`);
      await supabase.from('tecnicos')
        .update({
          nombre: newNombre,
          apellido: newApellido,
          nombre_normalizado: normName
        })
        .eq('id', temp.id);
    }
  }

  console.log('Lanus duplicate technician cleanup finished!');
}
run();
