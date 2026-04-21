
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';
const supabase = createClient(supabaseUrl, supabaseKey);

const TECH_IDS = [
  '66a310ee-a8c6-4025-abc1-32f508d2e4d7', // STELLA SERGIO LEONEL
  '37cf4d48-282d-4d62-bf1b-e7a4f643d794', // SEGOVIA JAVIER ANDRES
  'ec9356a6-f5d6-4bd2-8040-adacf0652ab2'  // GARCIA CARLOS FACUNDO
];

async function clearData() {
  console.log('Starting data cleanup for 3 technicians...');

  // 1. Clear seguimiento_bp
  const { data: delTracking, error: errTracking } = await supabase
    .from('seguimiento_bp')
    .delete()
    .in('tecnico_id', TECH_IDS);
  
  if (errTracking) console.error('Error deleting tracking:', errTracking);
  else console.log('Successfully cleared seguimiento_bp data.');

  // 2. Clear antecedentes_bp
  const { data: delAnt, error: errAnt } = await supabase
    .from('antecedentes_bp')
    .delete()
    .in('tecnico_id', TECH_IDS);

  if (errAnt) console.error('Error deleting antecedents:', errAnt);
  else console.log('Successfully cleared antecedentes_bp data.');

  console.log('Cleanup finished.');
}

clearData();
