const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('nps_detalles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
  } else {
    console.log('No data found to check columns via select *');
  }

  // Try to insert a dummy row with evidencia to see if it fails (confirms column existence)
  console.log('Testing column "evidencia" existence...');
  const { error: insertError } = await supabase
    .from('nps_detalles')
    .insert([{ 
      access_id: 'test_col_diag', 
      fecha: new Date().toISOString(), 
      tx_celula: 'DIAGNOSTIC', 
      evidencia: ['https://example.com/test.jpg'] 
    }]);
  
  if (insertError) {
    console.log('FAILED: Column "evidencia" likely missing. Error:', insertError.message);
  } else {
    console.log('SUCCESS: Column "evidencia" exists and is writable.');
    await supabase.from('nps_detalles').delete().eq('access_id', 'test_col_diag');
  }
}

checkColumns();
