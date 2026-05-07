const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkMayDates() {
  try {
    const { data, error } = await supabase
      .from('metricas')
      .select('fecha')
      .gte('fecha', '2026-05-01')
      .lte('fecha', '2026-05-15')
      .order('fecha', { ascending: true });
    
    if (error) {
      console.error(error);
    } else {
      const uniqueDates = [...new Set(data.map(d => d.fecha))];
      console.log('Unique dates found in May:', uniqueDates);
    }
  } catch (err) {
    console.error(err);
  }
}

checkMayDates();
