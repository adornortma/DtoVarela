const { createClient } = require('@supabase/supabase-js');

const USERS = [
  { usuario: 'LOPEZF', pass: 'Lanus', rol: 'FULL', distrito: 'LANUS', celula: null },
  { usuario: 'SUCURL', pass: 'Varela', rol: 'FULL', distrito: 'VARELA', celula: null },
  { usuario: 'LAZARTEM', pass: 'Montegrande', rol: 'FULL', distrito: 'MONTE GRANDE', celula: null },
  { usuario: 'ADORNO', pass: 'Bera', rol: 'FULL', distrito: 'VARELA', celula: null },
  { usuario: 'SALDIASP', pass: '32342705', rol: 'LIDER', distrito: 'MONTE GRANDE', celula: 'MS MONTE GRANDE' },
  { usuario: 'MAZEKAITEG', pass: '18350381', rol: 'LIDER', distrito: 'MONTE GRANDE', celula: 'BURZACO Y LONGCHAMPS' },
  { usuario: 'ARMIGNACCO', pass: '22922757', rol: 'LIDER', distrito: 'VARELA', celula: 'MS QUILMES' },
  { usuario: 'MEREP', pass: '31907707', rol: 'LIDER', distrito: 'VARELA', celula: 'RANELAGH' },
  { usuario: 'MARCHATJ', pass: '32526140', rol: 'LIDER', distrito: 'LANUS', celula: 'GM LOMAS' },
  { usuario: 'DADAMOL', pass: '31674593', rol: 'LIDER', distrito: 'LANUS', celula: 'GM LANUS' },
  { usuario: 'DISANTON', pass: '26435013', rol: 'LIDER', distrito: 'LANUS', celula: 'PIÑEYRO' },
  { usuario: 'ALBANESEJ', pass: '21800591', rol: 'LIDER', distrito: 'LANUS', celula: 'MS LANUS' },
  { usuario: 'LIGUORID', pass: '29946020', rol: 'LIDER', distrito: 'LANUS', celula: 'SARANDI' },
];

const supabase = createClient(
  'https://phvothtgvpquzwpyuilz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U'
);

async function syncUsers() {
  console.log('Checking usuarios table...');
  const { error: selectError } = await supabase.from('usuarios').select('usuario').limit(1);
  
  if (selectError) {
    console.log('Table might not exist, creating it requires SQL. Trying to insert directly...');
  }

  console.log('Syncing users...');
  for (const user of USERS) {
    const { error } = await supabase
      .from('usuarios')
      .upsert(user, { onConflict: 'usuario' });
      
    if (error) {
       console.error(`Error syncing ${user.usuario}:`, error.message);
    } else {
       console.log(`Synced ${user.usuario}`);
    }
  }
}

syncUsers();
