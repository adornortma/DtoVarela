
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkSchema() {
  const { data, error } = await supabase.from('seguimiento_bp').select('*').limit(1);
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in seguimiento_bp:', Object.keys(data[0]));
  } else {
      // If empty, try to get column names via RPC or just assume
      console.log('Table is empty, cannot infer columns from data.');
  }
}

checkSchema();
