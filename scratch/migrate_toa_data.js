const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateData() {
  try {
    console.log('--- Iniciando Migración de Datos TOA (Semana 1 Mayo -> Abril Mensual) ---');

    const startDate = '2026-05-01';
    const endDate = '2026-05-07';
    
    const { data: metrics, error: mError } = await supabase
      .from('metricas')
      .select('tecnico_id, cierres, no_encontrados')
      .gte('fecha', startDate)
      .lte('fecha', endDate);

    if (mError) {
      console.error('Error al obtener métricas de Mayo:', mError);
      return;
    }

    const techData = {};
    metrics.forEach(m => {
      if (!m.tecnico_id) return;
      if (!techData[m.tecnico_id]) {
        techData[m.tecnico_id] = { cierres: 0, noEncSum: 0, count: 0 };
      }
      techData[m.tecnico_id].cierres += (Number(m.cierres) || 0);
      techData[m.tecnico_id].noEncSum += (Number(m.no_encontrados) || 0);
      techData[m.tecnico_id].count++;
    });

    const updates = Object.keys(techData).map(id => ({
      tecnico_id: id,
      cierres: techData[id].cierres,
      no_encontrados: Math.round((techData[id].noEncSum / techData[id].count) * 100) / 100
    }));

    let successCount = 0;
    let errorCount = 0;
    let firstError = null;

    for (const update of updates) {
      const { data, error: uError, count } = await supabase
        .from('metricas_mensuales')
        .update({
          cierres: update.cierres,
          no_encontrados: update.no_encontrados
        })
        .eq('mes', 'Abril')
        .eq('tecnico_id', update.tecnico_id)
        .select();

      if (uError) {
        if (!firstError) firstError = uError;
        errorCount++;
      } else if (data && data.length > 0) {
        successCount++;
      } else {
        // No record found for this tech in April
        errorCount++;
      }
    }

    if (firstError) {
      console.log('Primer error detectado:', firstError.message);
    }

    console.log(`Migración completada: ${successCount} éxitos, ${errorCount} fallos (no encontrados o error de columnas).`);

  } catch (err) {
    console.error('Error inesperado:', err);
  }
}

migrateData();
