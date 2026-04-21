import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const names = [
  "GARCIA, CARLOS FACUNDO",
  "ORTIGOZA, EMMANUEL JAVIER",
  "FALCON, AGUSTIN ALEJANDRO",
  "TORRES, CHRISTIAN NICOLAS",
  "JAIME, MARCELO RAUL",
  "PARED, JUAN MANUEL",
  "RIOS RADO, EMILIO",
  "ESCOBAR FEDERICO",
  "ARIAS BERNARDO",
  "SALINAS LUCIANO",
  "DIANA PABLO",
  "FIGUEREDO CARLOS",
  "FERNANDEZ FACUNDO",
  "MUÑOZ DIEGO ANGEL",
  "PERNARGIG JULIO",
  "SEGOVIA JAVIER ANDRES",
  "STELLA SERGIO LIONEL"
];

async function checkNames() {
  console.log("Searching for technicians...");
  for (const name of names) {
    let query = supabase.from('tecnicos').select('nombre, apellido, dni');
    
    if (name.includes(',')) {
      const [last, first] = name.split(',').map(s => s.trim());
      query = query.ilike('apellido', `%${last}%`).ilike('nombre', `%${first}%`);
    } else {
      const parts = name.split(' ');
      const last = parts[0];
      const first = parts.slice(1).join(' ');
      query = query.ilike('apellido', `%${last}%`).ilike('nombre', `%${first}%`);
    }

    const { data, error } = await query;
    if (data && data.length > 0) {
      console.log(`FOUND: ${name} -> ${data[0].nombre} ${data[0].apellido} (${data[0].dni})`);
    } else {
      console.log(`NOT FOUND: ${name}`);
    }
  }
}

checkNames();
