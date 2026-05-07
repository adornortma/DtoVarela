const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addColumns() {
  try {
    // We can't run ALTER TABLE directly through the JS client select/insert/etc.
    // But we can use the 'rpc' method if there's a custom function, or we can use the REST API if permitted.
    // However, usually the best way is to ask the user to run it in the SQL Editor or try a sneaky way.
    // Wait, the JS client doesn't support raw SQL.
    
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log(`
      ALTER TABLE metricas_mensuales 
      ADD COLUMN IF NOT EXISTS cierres NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS no_encontrados NUMERIC DEFAULT 0;
    `);
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

addColumns();
