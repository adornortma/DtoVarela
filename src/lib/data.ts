import { TechnicianStats } from './logic';

export const mockWeeklyStats: TechnicianStats[] = [
  { tecnico: 'Gomez, J.', celula: 'Berazategui', semana: '2026-W12', resolucion: 94, reiteros: 8.2, puntualidad: 99, productividad: 8.5 },
  { tecnico: 'Rodriguez, M.', celula: 'Varela 1', semana: '2026-W12', resolucion: 88, reiteros: 15.4, puntualidad: 94, productividad: 7.8 },
  { tecnico: 'Lopez, A.', celula: 'Varela 1', semana: '2026-W12', resolucion: 85, reiteros: 16.2, puntualidad: 92, productividad: 7.2 },
  { tecnico: 'Fernandez, P.', celula: 'Varela 1', semana: '2026-W12', resolucion: 90, reiteros: 14.8, puntualidad: 95, productividad: 8.1 },
  { tecnico: 'Martinez, R.', celula: 'Varela 2', semana: '2026-W12', resolucion: 92, reiteros: 11.1, puntualidad: 97, productividad: 8.1 },
  { tecnico: 'Perez, E.', celula: 'Bernal', semana: '2026-W12', resolucion: 91, reiteros: 11.2, puntualidad: 98, productividad: 7.9 },
  { tecnico: 'Diaz, S.', celula: 'Quilmes', semana: '2026-W12', resolucion: 93, reiteros: 10.5, puntualidad: 98, productividad: 8.3 },
  { tecnico: 'Sanchez, F.', celula: 'Ranelagh', semana: '2026-W12', resolucion: 95, reiteros: 9.8, puntualidad: 96, productividad: 8.4 },
];

export const mockPreviousWeek: TechnicianStats[] = [
  { tecnico: 'Gomez, J.', celula: 'Berazategui', semana: '2026-W11', resolucion: 92, reiteros: 9.1, puntualidad: 98, productividad: 8.3 },
  { tecnico: 'Rodriguez, M.', celula: 'Varela 1', semana: '2026-W11', resolucion: 89, reiteros: 13.5, puntualidad: 95, productividad: 7.9 },
  // ... more
];
