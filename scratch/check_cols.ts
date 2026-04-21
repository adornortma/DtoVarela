
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function checkCols() {
  const { data, error } = await supabase
    .from('seguimiento_bp')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching seguimiento_bp:', error);
  } else {
    console.log('Columns in seguimiento_bp:', data[0] ? Object.keys(data[0]) : 'Empty table');
  }
}

checkCols();
