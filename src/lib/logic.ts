export interface KPIThresholds {
  resolucion: { green: number; yellow: number };
  reiteros: { green: number; yellow: number }; // Nota: para reiteros, menor es mejor
  puntualidad: { green: number; yellow: number };
  productividad: { green: number; yellow: number };
}

export const defaultThresholds: KPIThresholds = {
  resolucion: { green: 90, yellow: 85 },
  reiteros: { green: 10, yellow: 15 },
  puntualidad: { green: 95, yellow: 90 },
  productividad: { green: 8.5, yellow: 7.5 },
};

export type Status = 'success' | 'warning' | 'error';

export const getKPIStatus = (kpi: string, value: number, thresholds: KPIThresholds = defaultThresholds): Status => {
  const t = thresholds[kpi as keyof KPIThresholds];
  if (!t) return 'success';

  if (kpi === 'reiteros') {
    if (value <= t.green) return 'success';
    if (value <= t.yellow) return 'warning';
    return 'error';
  }

  if (value >= t.green) return 'success';
  if (value >= t.yellow) return 'warning';
  return 'error';
};

export interface TechnicianStats {
  tecnico: string;
  celula: string;
  semana: string;
  resolucion: number;
  reiteros: number;
  puntualidad: number;
  productividad: number;
  
  // KPIs Operativos (TOA) - Opcionales
  inicio?: number;
  ok1?: number;
  cierres?: number;
  completadas?: number;
  no_encontrados?: number;
  deriva_bajadas?: number;
}

export const classifyTechnician = (stats: TechnicianStats, thresholds: KPIThresholds = defaultThresholds) => {
  const resStatus = getKPIStatus('resolucion', stats.resolucion, thresholds);
  const reitStatus = getKPIStatus('reiteros', stats.reiteros, thresholds);
  const puntStatus = getKPIStatus('puntualidad', stats.puntualidad, thresholds);
  const prodStatus = getKPIStatus('productividad', stats.productividad, thresholds);

  const errors = [resStatus, reitStatus, puntStatus, prodStatus].filter(s => s === 'error').length;
  
  if (reitStatus === 'error' || errors >= 2) return { label: 'Crítico', color: '#f87171' };
  if (reitStatus === 'warning' || errors === 1) return { label: 'En Riesgo', color: '#b45309' };
  
  if (stats.reiteros < 8 && stats.productividad < 7.5) return { label: 'Lento pero prolijo', color: '#019df4' };
  if (stats.reiteros > 12 && stats.productividad > 8.5) return { label: 'Rápido pero con fallas', color: '#f87171' };
  
  return { label: 'Equilibrado', color: '#5bc500' };
};

export const generateInsights = (allStats: TechnicianStats[], thresholds: KPIThresholds = defaultThresholds) => {
  const insights: string[] = [];
  
  const avgReiteros = allStats.reduce((acc, s) => acc + s.reiteros, 0) / allStats.length;
  if (avgReiteros > thresholds.reiteros.yellow) {
    insights.push("🚨 El principal problema del distrito son los reiteros (promedio por encima del límite).");
  }

  const criticalTechs = allStats.filter(s => classifyTechnician(s, thresholds).label === 'Crítico');
  if (criticalTechs.length > 0) {
    insights.push(`⚠️ Se detectaron ${criticalTechs.length} técnicos en estado crítico que requieren intervención inmediata.`);
  }

  // Encontrar la célula con más desvío en reiteros
  const cellStats: Record<string, { total: number, count: number }> = {};
  allStats.forEach(s => {
    if (!cellStats[s.celula]) cellStats[s.celula] = { total: 0, count: 0 };
    cellStats[s.celula].total += s.reiteros;
    cellStats[s.celula].count += 1;
  });

  let worstCell = "";
  let maxReit = 0;
  Object.entries(cellStats).forEach(([cell, data]) => {
    const avg = data.total / data.count;
    if (avg > maxReit) {
      maxReit = avg;
      worstCell = cell;
    }
  });

  if (maxReit > thresholds.reiteros.yellow) {
    insights.push(`📉 La célula ${worstCell} presenta reiteros muy por encima del objetivo (${maxReit.toFixed(1)}%).`);
  }

  return insights;
};

export const getCellSummaries = (allStats: TechnicianStats[], thresholds: KPIThresholds = defaultThresholds) => {
  const cellMap: Record<string, { 
    name: string; 
    reitTotal: number; 
    resTotal: number; 
    puntTotal: number; 
    count: number; 
    criticals: number 
  }> = {};

  allStats.forEach(s => {
    if (!cellMap[s.celula]) {
      cellMap[s.celula] = { 
        name: s.celula, 
        reitTotal: 0, 
        resTotal: 0, 
        puntTotal: 0, 
        count: 0, 
        criticals: 0 
      };
    }
    const cell = cellMap[s.celula];
    cell.reitTotal += s.reiteros;
    cell.resTotal += s.resolucion;
    cell.puntTotal += s.puntualidad;
    cell.count += 1;
    
    if (classifyTechnician(s, thresholds).label === 'Crítico') {
      cell.criticals += 1;
    }
  });

  return Object.values(cellMap).map(cell => {
    const avgReit = cell.reitTotal / cell.count;
    const avgRes = cell.resTotal / cell.count;
    const avgPunt = cell.puntTotal / cell.count;
    
    return {
      name: cell.name,
      reit: parseFloat(avgReit.toFixed(1)),
      res: Math.round(avgRes),
      punt: Math.round(avgPunt),
      criticals: cell.criticals,
      status: getKPIStatus('reiteros', avgReit, thresholds)
    };
  }).sort((a, b) => b.reit - a.reit);
};
