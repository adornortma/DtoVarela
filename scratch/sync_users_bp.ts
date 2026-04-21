import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const users = [
  { usuario: 'LOPEZF', pass: 'Lanus', rol: 'FULL', distrito: 'LANUS', celula: null },
  { usuario: 'SUCURL', pass: 'Varela', rol: 'FULL', distrito: 'VARELA', celula: null },
  { usuario: 'LAZARTEM', pass: 'Montegrande', rol: 'FULL', distrito: 'MONTE GRANDE', celula: null },
  { usuario: 'ADORNO', pass: 'Bera', rol: 'FULL', distrito: 'VARELA', celula: null },
  { usuario: 'SALDIASP', pass: '32342705', rol: 'LIDER', distrito: 'MONTE GRANDE', celula: 'MS MONTE GRANDE' },
  { usuario: 'MAZEKAITEG', pass: '18350381', rol: 'LIDER', distrito: 'MONTE GRANDE', celula: 'BURZACO,LONGCHAMPS' },
  { usuario: 'ARMIGNACCO', pass: '22922757', rol: 'LIDER', distrito: 'VARELA', celula: 'MS QUILMES' },
  { usuario: 'MEREP', pass: '31907707', rol: 'LIDER', distrito: 'VARELA', celula: 'RANELAGH' },
  { usuario: 'marchatj', pass: '32526140', rol: 'LIDER', distrito: 'LANUS', celula: 'GM LOMAS' },
  { usuario: 'DADAMOL', pass: '31674593', rol: 'LIDER', distrito: 'LANUS', celula: 'GM LANUS' },
  { usuario: 'disanton', pass: '26435013', rol: 'LIDER', distrito: 'LANUS', celula: 'PIÑEYRO' },
  { usuario: 'albanesej', pass: '21800591', rol: 'LIDER', distrito: 'LANUS', celula: 'MS LANUS' },
  { usuario: 'liguorid', pass: '29946020', rol: 'LIDER', distrito: 'LANUS', celula: 'SARANDI' }
];

async function syncUsers() {
  console.log("Syncing users...");
  for (const u of users) {
    const { error } = await supabase
      .from('usuarios')
      .upsert(u, { onConflict: 'usuario' });
    
    if (error) {
      console.error(`Error syncing user ${u.usuario}:`, error);
    } else {
      console.log(`Synced user ${u.usuario}`);
    }
  }
}

syncUsers();
