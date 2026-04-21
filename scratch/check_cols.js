
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCols() {
  try {
    const { data, error } = await supabase
      .from('seguimiento_bp')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching seguimiento_bp:', error);
    } else {
      console.log('Columns found:', data[0] ? Object.keys(data[0]) : 'Empty table');
      
      const { error: colError } = await supabase
        .from('seguimiento_bp')
        .select('kpi_pdi, es_mensual')
        .limit(1);
      
      if (colError) {
        console.log('MISSING COLUMNS DETECTED:', colError.message);
      } else {
        console.log('All required columns exist.');
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkCols();
