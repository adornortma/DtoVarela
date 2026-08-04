const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

try {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
        if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
      }
    });
  }
} catch (e) {}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function completeSigests(numbers) {
  console.log('Buscando estado "Completado"...');
  const { data: estado, error: estError } = await supabase
    .from('despliegues_estados')
    .select('id, nombre')
    .eq('nombre', 'Completado')
    .single();

  if (estError || !estado) {
    console.error('Error buscando el estado Completado:', estError);
    return;
  }
  console.log(`Estado Completado encontrado con ID: ${estado.id}`);

  for (const number of numbers) {
    console.log(`\nProcesando SIGEST: ${number}...`);
    
    // 1. Get SIGEST ID
    const { data: sigest, error: sigestError } = await supabase
      .from('sigests')
      .select('id')
      .eq('numero_sigest', number)
      .maybeSingle();

    if (sigestError || !sigest) {
      console.log(`No se encontró o hubo un error con el SIGEST ${number}`);
      continue;
    }

    // 2. Get CTO IDs belonging to this SIGEST
    const { data: ctos, error: ctosError } = await supabase
      .from('ctos')
      .select('id')
      .eq('sigest_id', sigest.id);

    if (ctosError || !ctos || ctos.length === 0) {
      console.log(`No hay CTOs asociados al SIGEST ${number}`);
      continue;
    }

    const ctoIds = ctos.map(c => c.id);
    console.log(`Encontrados ${ctoIds.length} CTOs. Actualizando actividades a Completado...`);

    // 3. Update all activities for these CTOs to Completado
    const { data: updatedActs, error: updateError } = await supabase
      .from('actividades')
      .update({
        estado_id: estado.id,
        tecnico_nombre: 'Automático',
        observaciones: 'Completado masivo por relevamiento',
        updated_at: new Date().toISOString()
      })
      .in('cto_id', ctoIds)
      .select('id');

    if (updateError) {
      console.error(`Error actualizando actividades para SIGEST ${number}:`, updateError);
    } else {
      console.log(`Actualizadas con éxito ${updatedActs ? updatedActs.length : 0} actividades.`);
    }
  }
  console.log('\nProceso de completado masivo finalizado.');
}

completeSigests(['6103800761']);
