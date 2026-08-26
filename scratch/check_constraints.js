const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase.rpc('get_constraints_info');
  
  if (error) {
    // If RPC doesn't exist, we can query it using a mock sql/query if possible, 
    // or just run a query using postgrest or check schema.
    // Let's run a raw sql query via supabase if we have a way.
    // Wait, does the project have a function to execute SQL?
    console.error('RPC Error:', error);
  } else {
    console.log('Constraints:', data);
  }

  // Let's also check if we can query pg_catalog tables via postgrest.
  // Sometimes supabase allows querying pg_class/pg_constraint if permissions are granted.
  const { data: constData, error: constErr } = await supabase
    .from('pg_constraint')
    .select('*')
    .limit(5);
  console.log('pg_constraint direct:', constData, constErr);
}

main();
