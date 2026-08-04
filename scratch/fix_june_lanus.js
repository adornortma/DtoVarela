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
  console.log('--- STARTING JUNE LANUS CLEANUP AND SYNC ---');

  // 1. Fetch all cells of Lanus to know the correct names
  const { data: lanusCells } = await supabase.from('celulas').select('nombre').eq('distrito_id', lanusId);
  const correctCellNames = new Set(lanusCells.map(c => c.nombre.trim().toUpperCase()));
  console.log('Correct cells in Lanus:', Array.from(correctCellNames));

  // 2. Fetch all technicians of Lanus
  const { data: allTechs } = await supabase.from('tecnicos').select('*').eq('distrito_id', lanusId);
  const tempTechs = allTechs.filter(t => t.dni.startsWith('TEMP-'));
  const realTechs = allTechs.filter(t => !t.dni.startsWith('TEMP-'));
  console.log(`Found ${tempTechs.length} temp techs and ${realTechs.length} real techs in Lanus.`);

  // 3. Fetch all May metrics in Lanus to use as reference for technician cells
  const { data: mayMetrics } = await supabase.from('metricas_mensuales')
    .select('tecnico_id, celula')
    .eq('distrito_id', lanusId)
    .eq('mes', 'Mayo')
    .not('tecnico_id', 'is', null);

  const techMayCellMap = {};
  mayMetrics.forEach(m => {
    techMayCellMap[m.tecnico_id] = m.celula;
  });
  console.log(`Loaded cell mappings for ${Object.keys(techMayCellMap).length} technicians from May.`);

  // 4. Fetch June metrics for Lanus
  const { data: juneMetrics, error: errJ } = await supabase.from('metricas_mensuales')
    .select('*, tecnicos(*)')
    .eq('distrito_id', lanusId)
    .eq('mes', 'Junio');

  if (errJ) {
    console.error(errJ);
    return;
  }

  const cleanAndNormalize = (str) => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9\s]/gi, '')
      .toUpperCase()
      .trim();
  };

  // Helper mapping to clean up cell names
  const cellNameMapping = {
    'GM_LANUS': 'GM_ LANUS',
    'GM_LOMAS': 'GM_ LOMAS',
    'GM_QUILMES_VARELA': 'GM_QUILMES_ VARELA',
    'MONTE_CHINGOLO': 'MONTE_ CHINGOLO',
    'MS_LANUS': 'MS. LANUS',
    'MS. LANUS ': 'MS. LANUS'
  };

  for (const m of juneMetrics) {
    const rawCell = m.celula ? m.celula.trim() : '';
    let targetCellName = m.celula;

    // Clean cell name if mapped
    if (cellNameMapping[rawCell]) {
      targetCellName = cellNameMapping[rawCell];
    } else if (m.celula) {
      targetCellName = m.celula.trim();
    }

    if (m.tecnico_id === null) {
      // Cell-level metric
      console.log(`Cell metric [${m.id}]: "${m.celula}" -> "${targetCellName}"`);
      await supabase.from('metricas_mensuales')
        .update({ celula: targetCellName })
        .eq('id', m.id);
      continue;
    }

    // Technician metric
    const tech = m.tecnicos;
    if (!tech) continue;

    // Detect if this is a fake technician representing cell totals loaded into GM_ LOMAS or similar
    const isFakeTech = /GM_LANUS|GM_LOMAS|GM_MONTE_GRANDE|GM_QUILMES_VARELA|ACCESO|ACCSO|LANUS|LOMAS|MONTE_CHINGOLO|MS_LANUS|PIÑEYRO|SARANDI/i.test(tech.apellido || '') && tech.dni.startsWith('TEMP-');
    if (isFakeTech) {
      console.log(`Deleting fake technician metric and profile: ${tech.apellido} (${tech.id})`);
      await supabase.from('metricas_mensuales').delete().eq('id', m.id);
      await supabase.from('tecnicos').delete().eq('id', tech.id);
      continue;
    }

    let finalTechId = m.tecnico_id;

    if (tech.dni.startsWith('TEMP-')) {
      // Temporary duplicate technician: search for a real technician match
      const targetName = tech.apellido || '';
      const targetClean = cleanAndNormalize(targetName);
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
        console.log(`Merging Temp Tech [${tech.id}] "${targetName}" into Real Tech [${bestMatch.id}] "${bestMatch.apellido}, ${bestMatch.nombre}"`);
        finalTechId = bestMatch.id;
        
        // Update metric
        await supabase.from('metricas_mensuales')
          .update({ tecnico_id: bestMatch.id })
          .eq('id', m.id);

        // Delete temp tech profile
        await supabase.from('tecnicos').delete().eq('id', tech.id);
      } else {
        // Fix temp tech name format
        const nameParts = targetName.trim().split(/\s+/);
        const newApellido = nameParts[0] || 'TECNICO';
        const newNombre = nameParts.slice(1).join(' ') || '';
        const normName = cleanAndNormalize(targetName).replace(/\s+/g, '');

        console.log(`No match for temp tech "${targetName}". Fixing name format in database to: "${newApellido}, ${newNombre}"`);
        await supabase.from('tecnicos')
          .update({
            nombre: newNombre,
            apellido: newApellido,
            nombre_normalizado: normName
          })
          .eq('id', tech.id);
      }
    }

    // Now, sync cell name using May reference if available
    let finalCellName = targetCellName;
    if (techMayCellMap[finalTechId]) {
      finalCellName = techMayCellMap[finalTechId];
      if (finalCellName !== m.celula) {
        console.log(`  Syncing cell for tech [${finalTechId}]: "${m.celula}" -> "${finalCellName}" (using May reference)`);
      }
    }

    await supabase.from('metricas_mensuales')
      .update({ celula: finalCellName })
      .eq('id', m.id);
  }

  console.log('--- JUNE LANUS CLEANUP AND SYNC COMPLETED SUCCESSFULLY ---');
}
run();
