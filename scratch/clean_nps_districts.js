
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phvothtgvpquzwpyuilz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodm90aHRndnBxdXp3cHl1aWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTU5NjgsImV4cCI6MjA5MDE5MTk2OH0.oGrU2OHf_VHtwWTMMuVhqTtSi1dz6ifBf8doSzL2w2U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanNpsData() {
  const keepCells = [
    'BERAZATEGUI',
    'BERNAL',
    'QUILMES',
    'RANELAGH',
    'VARELA 1',
    'VARELA 2'
  ];

  console.log('Cleaning nps_agregado...');
  
  const { data: cells } = await supabase
    .from('nps_agregado')
    .select('celula')
    .not('celula', 'is', null);

  if (cells) {
    const uniqueCells = Array.from(new Set(cells.map(c => c.celula)));
    console.log('Current cells in nps_agregado:', uniqueCells);
    
    const toDelete = uniqueCells.filter(c => !keepCells.includes(c));
    console.log('Cells to delete:', toDelete);

    if (toDelete.length > 0) {
      const { error: delError } = await supabase
        .from('nps_agregado')
        .delete()
        .in('celula', toDelete);

      if (delError) {
        console.error('Error deleting from nps_agregado:', delError);
      } else {
        console.log('Successfully deleted unwanted cells from nps_agregado');
      }
    } else {
      console.log('No unwanted cells found in nps_agregado');
    }
  }

  console.log('Cleaning nps_detalles...');
  const { data: detailCells } = await supabase
    .from('nps_detalles')
    .select('tx_celula');

  if (detailCells) {
    const uniqueDetailCells = Array.from(new Set(detailCells.map(c => c.tx_celula)));
    console.log('Current cells in nps_detalles:', uniqueDetailCells);

    const toDeleteDetails = uniqueDetailCells.filter(c => !keepCells.includes(c));
    console.log('Cells to delete from nps_detalles:', toDeleteDetails);

    if (toDeleteDetails.length > 0) {
      const { error: delDetailError } = await supabase
        .from('nps_detalles')
        .delete()
        .in('tx_celula', toDeleteDetails);

      if (delDetailError) {
        console.error('Error deleting from nps_detalles:', delDetailError);
      } else {
        console.log('Successfully deleted unwanted cells from nps_detalles');
      }
    } else {
        console.log('No unwanted cells found in nps_detalles');
    }
  }
}

cleanNpsData();
