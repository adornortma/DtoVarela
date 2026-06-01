const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const parsedData = [
  { name: 'ARROUGE JUAN FRANCISCO', productividad: 0, resolucion: 0, reiteros: 0, tiempo_operativo: 0, utilizacion: 0 },
  { name: 'BACIGALUPO NICOLAS OSCAR', productividad: 2.83, resolucion: 61.54, reiteros: 16.67, tiempo_operativo: 55.54, utilizacion: 0.96 },
  { name: 'COLLICH COSTRE CRISTIAN ARIEL', productividad: 4.29, resolucion: 75.00, reiteros: 0, tiempo_operativo: 57.24, utilizacion: 0.82 },
  { name: 'CUENCA LEONARDO XAVIER', productividad: 4.81, resolucion: 60.98, reiteros: 5, tiempo_operativo: 55.86, utilizacion: 0.74 },
  { name: 'DANERI JUAN MANUEL', productividad: 5.35, resolucion: 75.86, reiteros: 0, tiempo_operativo: 45.97, utilizacion: 0.54 },
  { name: 'HERBAS ANDRES ALEJANDRO', productividad: 5.42, resolucion: 67.09, reiteros: 4.35, tiempo_operativo: 51.89, utilizacion: 0.62 },
  { name: 'MARTINEZ LEONARDO MIGUEL', productividad: 8.12, resolucion: 80.61, reiteros: 4.08, tiempo_operativo: 57.68, utilizacion: 0.61 },
  { name: 'MONTOYA ARIEL MIGUEL', productividad: 3.86, resolucion: 69.09, reiteros: 18.75, tiempo_operativo: 57.95, utilizacion: 0.88 },
  { name: 'ORDOÑEZ SEBASTIAN', productividad: 5.68, resolucion: 76.92, reiteros: 0, tiempo_operativo: 54.22, utilizacion: 0.65 },
  { name: 'SETTEMBRI DIEGO DANIEL', productividad: 3.02, resolucion: 68.42, reiteros: 0, tiempo_operativo: 55.87, utilizacion: 0.55 }
];

async function simulate() {
  const { data: districts } = await supabase.from('distritos').select('*').eq('slug', 'lanus');
  const selectedDistrictId = districts[0].id;
  const selectedCelula = 'LANUS';
  const monthName = 'Abril'; // period

  console.log('Simulating save with schema tolerance...');

  const saveAll = async (includeUtil) => {
    for (const row of parsedData) {
      const cleanTechName = row.name.trim().toUpperCase();
      const normalName = cleanTechName.replace(/[^A-Z]/g, '');
      
      const { data: tech } = await supabase
        .from('tecnicos')
        .select('id')
        .ilike('nombre_normalizado', `%${normalName}%`)
        .limit(1)
        .single();

      const tecnicoId = tech.id;

      const updatePayload = {
        resolucion: row.resolucion,
        reiteros: row.reiteros,
        productividad: row.productividad,
        tiempo_operativo: row.tiempo_operativo,
        distrito_id: selectedDistrictId,
        celula: selectedCelula
      };

      if (includeUtil) {
        updatePayload.utilizacion = row.utilizacion;
      }

      const { data: existingMetric } = await supabase
        .from('metricas_mensuales')
        .select('id')
        .eq('tecnico_id', tecnicoId)
        .eq('mes', monthName)
        .eq('distrito_id', selectedDistrictId)
        .maybeSingle();

      if (existingMetric) {
        const { error } = await supabase
          .from('metricas_mensuales')
          .update(updatePayload)
          .eq('id', existingMetric.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('metricas_mensuales')
          .insert({
            tecnico_id: tecnicoId,
            mes: monthName,
            ...updatePayload
          });
        if (error) throw error;
      }
    }
  };

  try {
    try {
      await saveAll(true);
      console.log('Saved successfully with Utilizacion!');
    } catch (err) {
      if (err.message && err.message.includes('utilizacion')) {
        console.warn('Utilizacion column not found in schema cache. Retrying without it...');
        await saveAll(false);
        console.log('Saved successfully WITHOUT Utilizacion (fallback)!');
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error('Final Save Error:', err);
  }
}

simulate();
