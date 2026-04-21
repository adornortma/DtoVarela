
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://phvothtgvpquzwpyuilz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U'
);

const users = [
    { usuario: 'LOPEZF', pass: 'Lanus', rol: 'FULL', distrito: 'LANUS', celula: null },
    { usuario: 'SUCURL', pass: 'Varela', rol: 'FULL', distrito: 'VARELA', celula: null },
    { usuario: 'LAZARTEM', pass: 'Montegrande', rol: 'FULL', distrito: 'MONTE GRANDE', celula: null },
    { usuario: 'ADORNO', pass: 'Bera', rol: 'FULL', distrito: 'VARELA', celula: null },
    { usuario: 'SALDIASP', pass: '32342705', rol: 'LIDER', distrito: 'MONTE GRANDE', celula: 'MS MONTE GRANDE' },
    { usuario: 'MAZEKAITEG', pass: '18350381', rol: 'LIDER', distrito: 'MONTE GRANDE', celula: 'BURZACO Y LO' },
    { usuario: 'GONZALEZA', pass: '29199320', rol: 'LIDER', distrito: 'VARELA', celula: 'QUILMES' },
    { usuario: 'CABRERAM', pass: '25881472', rol: 'LIDER', distrito: 'VARELA', celula: 'BERAZATEGUI' },
    { usuario: 'SOTOE', pass: '32342710', rol: 'LIDER', distrito: 'LANUS', celula: 'LANUS 1 Y 2' },
    { usuario: 'LIRAM', pass: '32342715', rol: 'LIDER', distrito: 'LANUS', celula: 'BANFIELD' },
    { usuario: 'ARMOAS', pass: '32342720', rol: 'LIDER', distrito: 'LANUS', celula: 'ADROGUE' },
    { usuario: 'SUAREZM', pass: '25333111', rol: 'LIDER', distrito: 'VARELA', celula: 'VARELA' },
    { usuario: 'LOPEZA', pass: '32342730', rol: 'LIDER', distrito: 'VARELA', celula: 'FLORENCIO VARELA' }
];

async function sync() {
    console.log('--- INICIANDO CARGA DE USUARIOS ---');
    
    // Primero limpiar por si hay duplicados o basura
    const { error: delError } = await supabase.from('usuarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delError) console.error('Error al limpiar:', delError.message);

    const { data, error } = await supabase.from('usuarios').insert(users).select();

    if (error) {
        console.error('ERROR AL INSERTAR:', error.message);
    } else {
        console.log(`EXITO: Se cargaron ${data.length} usuarios.`);
    }
}

sync();
