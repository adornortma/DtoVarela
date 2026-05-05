import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { count: aggCount, data: aggSample } = await supabase.from('nps_agregado').select('*', { count: 'exact', head: false }).limit(5);
  const { count: detCount, data: detSample } = await supabase.from('nps_detalles').select('*', { count: 'exact', head: false }).limit(5);

  console.log('--- DB Check ---');
  console.log('nps_agregado count:', aggCount);
  console.log('nps_agregado sample:', JSON.stringify(aggSample, null, 2));
  console.log('nps_detalles count:', detCount);
  console.log('nps_detalles sample:', JSON.stringify(detSample, null, 2));
}

checkData();
