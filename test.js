const data = `Técnico	Reitero	Resolución	Función	Celula	Productividad
BOFFELLI, LEONARDO DAMIAN (DNI-25878565)	0	71,79	REVISADOR	BERAZATEGUI	5,76
DIAZ, JUAN (DNI-25706685)	0	85,71	REVISADOR	BERAZATEGUI	7,10`;
const rows = data.split('\n');
const headers = rows[0].split('\t');
const tecnicoIdx = headers.findIndex(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('tecnico'));
const celulaIdx = headers.findIndex(h => ['celula', 'sector'].some(v => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(v)));
console.log('tecnicoIdx', tecnicoIdx, 'celulaIdx', celulaIdx);
const KPI_CONFIG = [
  { key: 'resolucion', names: ['resolucion', 'resoluciones', 'res'] },
  { key: 'reiteros', names: ['reitero', 'reiteros', 'rtr'] },
  { key: 'productividad', names: ['productividad', 'prod'] }
];
const kpiIndices = {};
KPI_CONFIG.forEach(c => {
  const idx = headers.findIndex(h => c.names.includes(h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()));
  if (idx !== -1) kpiIndices[c.key] = idx;
});
console.log('kpiIndices', kpiIndices);
