
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findTech() {
  const { data, error } = await supabase
    .from('metricas')
    .select('celula, fecha')
    .eq('tecnico_id', '66a310ee-a8c6-4025-abc1-32f508d2e4d7')
    .limit(5);
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

findTech();
