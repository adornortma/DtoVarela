const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColsMM() {
  try {
    const { data, error } = await supabase
      .from('metricas_mensuales')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Columns in metricas_mensuales:', data[0] ? Object.keys(data[0]) : 'Empty');
    }
  } catch (err) {
    console.error(err);
  }
}

checkColsMM();
