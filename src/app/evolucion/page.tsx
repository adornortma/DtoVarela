'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight, Clock, Zap, CheckCircle2 } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

// --- Types ---
type KpiType = 'reiteros' | 'resolucion' | 'puntualidad' | 'productividad';

interface MetricData {
  s1: number | null;
  s2: number | null;
  s3: number | null;
  s4: number | null;
}

interface ItemRow {
  name: string;
  metrics: Record<KpiType, MetricData>;
  isCell: boolean;
  technicians?: ItemRow[];
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface KpiConfigItem {
    label: string;
    unit: string;
    targets: { green: number; yellow: number; reverse?: boolean };
}

// Default config (updated from DB later)
const DEFAULT_KPI_CONFIG: Record<KpiType, KpiConfigItem> = {
  reiteros: { label: 'Reiteros', unit: '%', targets: { green: 4.5, yellow: 5, reverse: true } },
  resolucion: { label: 'Resolución', unit: '%', targets: { green: 75, yellow: 70 } },
  puntualidad: { label: 'Puntualidad', unit: '%', targets: { green: 80, yellow: 70 } },
  productividad: { label: 'Productividad', unit: '', targets: { green: 6, yellow: 5 } },
};

// --- Helper Functions ---
const getWeekOfDate = (date: Date): 's1' | 's2' | 's3' | 's4' => {
  const day = date.getUTCDate();
  if (day <= 7) return 's1';
  if (day <= 14) return 's2';
  if (day <= 21) return 's3';
  return 's4';
};

const getMondayOfNextWeek = (year: number, monthIndex: number, weekIndex: number) => {
    // Find the first Monday of the month
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    let firstMonday = new Date(year, monthIndex, 1);
    const dayOfWeek = firstMonday.getDay();
    const diff = (dayOfWeek === 1 ? 0 : (dayOfWeek === 0 ? 1 : 8 - dayOfWeek));
    firstMonday.setDate(firstMonday.getDate() + diff);
    
    const result = new Date(firstMonday);
    result.setDate(firstMonday.getDate() + (weekIndex * 7));
    return result;
};

const getStatusColors = (value: number | null, kpi: KpiType, config: Record<KpiType, KpiConfigItem>) => {
  if (value === null) return { bg: '#f1f5f9', text: '#666' };
  const { targets } = config[kpi];
  
  const TEXT_DARK = '#1a1a1a';

  if (targets.reverse) {
    if (value <= targets.green) return { bg: '#86efac', text: TEXT_DARK }; 
    if (value <= targets.yellow) return { bg: '#fde047', text: TEXT_DARK }; 
    return { bg: '#fca5a5', text: TEXT_DARK }; 
  } else {
    if (value >= targets.green) return { bg: '#86efac', text: TEXT_DARK };
    if (value >= targets.yellow) return { bg: '#fde047', text: TEXT_DARK };
    return { bg: '#fca5a5', text: TEXT_DARK };
  }
};

const calculateAverage = (metrics: MetricData): number | null => {
  if (!metrics) return null;
  const values = [metrics.s1, metrics.s2, metrics.s3, metrics.s4].filter(v => v !== null) as number[];
  if (values.length === 0) return null;
  return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
};

// --- UI Components ---

const DistrictOverview = ({ config }: { config: Record<KpiType, KpiConfigItem> }) => {
  const stats = [
    { kpi: 'resolucion' as KpiType, value: 76.21, icon: CheckCircle2, color: '#86efac' },
    { kpi: 'reiteros' as KpiType, value: 5.21, icon: BarChart3, color: '#fca5a5' },
    { kpi: 'puntualidad' as KpiType, value: 84.4, icon: Clock, color: '#86efac' },
    { kpi: 'productividad' as KpiType, value: 5.51, icon: Zap, color: '#fde047' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
      {stats.map((stat) => {
        const colors = getStatusColors(stat.value, stat.kpi, config);
        const { label, unit, targets } = config[stat.kpi];
        return (
          <div key={stat.kpi} style={{
            backgroundColor: 'white',
            padding: '28px 32px',
            borderRadius: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: '900', color: '#334155', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{label}</p>
                <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569' }}>Objetivo: {targets.green}{unit}</p>
              </div>
              <div style={{ 
                backgroundColor: `${colors.bg}44`, 
                padding: '8px', 
                borderRadius: '12px',
                color: colors.bg === '#f1f5f9' ? '#64748b' : colors.bg === '#86efac' ? '#059669' : colors.bg === '#fde047' ? '#d97706' : '#dc2626'
              }}>
                <stat.icon size={20} />
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h3 style={{ fontSize: '32px', fontWeight: '950', color: '#003366', letterSpacing: '-1px' }}>{stat.value}{unit}</h3>
            </div>

            <div style={{ 
                width: '100%', 
                height: '4px', 
                backgroundColor: '#f1f5f9', 
                borderRadius: '2px', 
                marginTop: '16px',
                overflow: 'hidden'
            }}>
                <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    backgroundColor: colors.bg === '#f1f5f9' ? '#e2e8f0' : colors.bg,
                    borderRadius: '2px'
                }} />
            </div>
          </div>
        )
      })}
    </div>
  );
};


const MetricCard = ({ value, prevValue, kpi, unit, config }: { value: number | null, prevValue?: number | null, kpi: KpiType, unit: string, config: Record<KpiType, KpiConfigItem> }) => {
  const colors = getStatusColors(value, kpi, config);
  
  let trend = null;
  if (value !== null && prevValue != null) {
      const diff = value - prevValue;
      const isBetter = config[kpi].targets.reverse ? diff < 0 : diff > 0;
      const Icon = isBetter ? ArrowUpRight : ArrowDownRight;
      if (Math.abs(diff) > 0.05) {
        trend = {
            icon: Icon,
            diff: Math.abs(diff).toFixed(1),
            color: 'rgba(0,0,0,0.3)'
        }
      }
  }

  return (
    <td style={{ padding: '4px' }}>
      <div style={{
        backgroundColor: colors.bg,
        borderRadius: '8px',
        height: '52px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0px',
        transition: 'all 0.2s',
        position: 'relative',
        boxShadow: value !== null ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <span style={{ 
            fontSize: '17px', 
            fontWeight: '800', 
            color: colors.text,
            letterSpacing: '-0.3px',
            lineHeight: '1'
        }}>
          {value !== null ? `${value}${unit}` : '-'}
        </span>
        
        {trend && (
            <div style={{ 
                fontSize: '10px', 
                fontWeight: '700', 
                color: trend.color,
                display: 'flex',
                alignItems: 'center',
                gap: '1px',
                marginTop: '1px'
            }}>
                <trend.icon size={10} strokeWidth={2.5} />
                {trend.diff}
            </div>
        )}
      </div>
    </td>
  );
};

const CellGroup = ({ row, kpi, config }: { row: ItemRow, kpi: KpiType, config: Record<KpiType, KpiConfigItem> }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const metrics = row.metrics[kpi];
  const unit = config[kpi].unit;
  const average = calculateAverage(metrics);

  const borderColor = isExpanded ? 'var(--movistar-blue)' : 'rgba(1, 157, 244, 0.15)';

  return (
    <div style={{
        border: `2px solid ${borderColor}`,
        borderRadius: '16px',
        marginBottom: '16px',
        overflow: 'hidden',
        backgroundColor: 'white',
        transition: 'all 0.3s ease',
        boxShadow: isExpanded ? '0 8px 30px rgba(1, 157, 244, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
        padding: '2px'
    }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', textAlign: 'left', tableLayout: 'fixed' }}>
            <colgroup>
                <col style={{ width: '280px' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '10%' }} />
            </colgroup>
            <tbody>
                <tr 
                    onClick={() => row.isCell && setIsExpanded(!isExpanded)}
                    style={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: isExpanded ? '#f8fafc' : 'transparent',
                    }}
                >
                    <td style={{ 
                        padding: '12px 20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            backgroundColor: isExpanded ? 'var(--movistar-blue)' : 'rgba(1, 157, 244, 0.08)',
                            padding: '6px',
                            borderRadius: '8px',
                            color: isExpanded ? 'white' : 'var(--movistar-blue)',
                        }}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ 
                                fontWeight: '900',
                                fontSize: '15px',
                                color: '#1a1a1a',
                                lineHeight: '1.2'
                            }}>
                                {row.name}
                            </span>
                            <span style={{ fontSize: '10px', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Célula Operativa</span>
                        </div>
                    </td>
                    <MetricCard value={metrics.s1} kpi={kpi} unit={unit} config={config} />
                    <MetricCard value={metrics.s2} prevValue={metrics.s1} kpi={kpi} unit={unit} config={config} />
                    <MetricCard value={metrics.s3} prevValue={metrics.s2} kpi={kpi} unit={unit} config={config} />
                    <MetricCard value={metrics.s4} prevValue={metrics.s3} kpi={kpi} unit={unit} config={config} />
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '52px' }}>
                            <span style={{ fontSize: '18px', fontWeight: '950', color: '#1a1a1a' }}>{average !== null ? `${average}${unit}` : '-'}</span>
                        </div>
                    </td>
                </tr>

                {isExpanded && row.technicians && row.technicians.map((tech) => (
                    <tr key={tech.name} style={{ backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ 
                            padding: '8px 20px 8px 68px', 
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '2px', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '2px' }} />
                                <span style={{ fontSize: '13px', color: '#333', fontWeight: '700' }}>{tech.name}</span>
                            </div>
                        </td>
                        <MetricCard value={tech.metrics[kpi].s1} kpi={kpi} unit={unit} config={config} />
                        <MetricCard value={tech.metrics[kpi].s2} prevValue={tech.metrics[kpi].s1} kpi={kpi} unit={unit} config={config} />
                        <MetricCard value={tech.metrics[kpi].s3} prevValue={tech.metrics[kpi].s2} kpi={kpi} unit={unit} config={config} />
                        <MetricCard value={tech.metrics[kpi].s4} prevValue={tech.metrics[kpi].s3} kpi={kpi} unit={unit} config={config} />
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '52px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '800', color: '#666' }}>{calculateAverage(tech.metrics[kpi]) !== null ? `${calculateAverage(tech.metrics[kpi])}${unit}` : '-'}</span>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
};

export default function EvolucionPage() {
  const [selectedMonth, setSelectedMonth] = useState('Marzo');
  const [selectedKpi, setSelectedKpi] = useState<KpiType>('reiteros');
  const [data, setData] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpiConfig, setKpiConfig] = useState<Record<KpiType, KpiConfigItem>>(DEFAULT_KPI_CONFIG);

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = MONTHS.indexOf(selectedMonth);

  useEffect(() => {
    const fetchConfig = async () => {
        const { data: dbConfig } = await supabase.from('kpi_thresholds').select('*');
        if (dbConfig) {
          const newConfig = { ...DEFAULT_KPI_CONFIG };
          dbConfig.forEach((row: any) => {
            if (newConfig[row.kpi as KpiType]) {
              newConfig[row.kpi as KpiType].targets = {
                green: Number(row.verde),
                yellow: Number(row.amarillo),
                reverse: row.kpi === 'reiteros'
              };
            }
          });
          
          // Force 4.5 if DB has 4 (fix for user request)
          if (newConfig.reiteros.targets.green === 4) {
             newConfig.reiteros.targets.green = 4.5;
          }

          setKpiConfig(newConfig);
        }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const monthIndex = MONTHS.indexOf(selectedMonth);
      const year = new Date().getFullYear();
      const startDate = new Date(year, monthIndex, 1).toISOString();
      const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59).toISOString();

      let metrics: any[] = [];
      let cellTotals: any[] = [];

      const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (isSupabaseConfigured) {
        // 1. Fetch Technician Metrics
        const { data: dbMetrics, error } = await supabase
          .from('metricas')
          .select(`
            *,
            tecnicos (
              nombre,
              apellido
            )
          `)
          .gte('fecha', startDate)
          .lte('fecha', endDate);

        metrics = dbMetrics || [];

        // 2. Fetch Official Cell Totals (Overrides)
        const { data: dbCellTotals } = await supabase
          .from('metricas_celula')
          .select('*')
          .gte('fecha', startDate)
          .lte('fecha', endDate);

        cellTotals = dbCellTotals || [];

        if (error) {
          console.error('Error fetching data:', error);
          setLoading(false);
          return;
        }
      } else {
        // MOCK DATA FALLBACK
        // Simulate weekly data for the selected month using our static mock data
        if (selectedMonth === 'Marzo') {
          import('@/lib/data').then(({ mockWeeklyStats }) => {
            const simulatedMetrics = mockWeeklyStats.map(s => ({
              ...s,
              fecha: `2026-03-${(mockWeeklyStats.indexOf(s) % 4) * 7 + 1}`, // spread over weeks
              reitero: s.reiteros,
              resolucion: s.resolucion,
              puntualidad: s.puntualidad,
              productividad: s.productividad,
              tecnicos: { 
                apellido: s.tecnico.split(',')[0], 
                nombre: s.tecnico.split(',')[1]?.trim() || s.tecnico 
              }
            }));
            setData(processData(simulatedMetrics, []));
            setLoading(false);
          });
          return;
        } else {
            setData([]);
            setLoading(false);
            return;
        }
      }

      setData(processData(metrics, cellTotals));
      setLoading(false);
    };

    const processData = (metrics: any[], cellTotals: any[]) => {
      const cellMap: Record<string, ItemRow> = {};

      // Process Technicians
      metrics.forEach(m => {
        const cellName = m.celula;
        const techName = m.tecnico || `${m.tecnicos.apellido}, ${m.tecnicos.nombre}`;
        const week = getWeekOfDate(new Date(m.fecha));

        if (!cellMap[cellName]) {
          cellMap[cellName] = {
            name: cellName,
            isCell: true,
            metrics: {
              reiteros: { s1: null, s2: null, s3: null, s4: null },
              resolucion: { s1: null, s2: null, s3: null, s4: null },
              puntualidad: { s1: null, s2: null, s3: null, s4: null },
              productividad: { s1: null, s2: null, s3: null, s4: null },
            },
            technicians: []
          };
        }

        const cell = cellMap[cellName];
        let tech = cell.technicians?.find(t => t.name === techName);

        if (!tech) {
          tech = {
            name: techName,
            isCell: false,
            metrics: {
              reiteros: { s1: null, s2: null, s3: null, s4: null },
              resolucion: { s1: null, s2: null, s3: null, s4: null },
              puntualidad: { s1: null, s2: null, s3: null, s4: null },
              productividad: { s1: null, s2: null, s3: null, s4: null },
            }
          };
          cell.technicians?.push(tech);
        }

        tech.metrics.reiteros[week] = m.reitero;
        tech.metrics.resolucion[week] = m.resolucion;
        tech.metrics.puntualidad[week] = m.puntualidad;
        tech.metrics.productividad[week] = m.productividad;
      });

      // Process Official Cell Overrides
      cellTotals.forEach(ct => {
        const week = getWeekOfDate(new Date(ct.fecha));
        if (!cellMap[ct.celula]) {
          cellMap[ct.celula] = {
            name: ct.celula,
            isCell: true,
            metrics: {
              reiteros: { s1: null, s2: null, s3: null, s4: null },
              resolucion: { s1: null, s2: null, s3: null, s4: null },
              puntualidad: { s1: null, s2: null, s3: null, s4: null },
              productividad: { s1: null, s2: null, s3: null, s4: null },
            },
            technicians: []
          };
        }
        
        const cell = cellMap[ct.celula];
        cell.metrics.reiteros[week] = ct.reitero;
        cell.metrics.resolucion[week] = ct.resolucion;
        cell.metrics.puntualidad[week] = ct.puntualidad;
        cell.metrics.productividad[week] = ct.productividad;
      });

      // Fill gaps
      Object.values(cellMap).forEach(cell => {
          (['reiteros', 'resolucion', 'puntualidad', 'productividad'] as KpiType[]).forEach(kpi => {
              ['s1', 's2', 's3', 's4'].forEach(w => {
                  const week = w as keyof MetricData;
                  if (cell.metrics[kpi][week] === null) {
                    const techValues = cell.technicians?.map(t => t.metrics[kpi][week]).filter(v => v !== null) as number[];
                    if (techValues.length > 0) {
                        cell.metrics[kpi][week] = parseFloat((techValues.reduce((a, b) => a + b, 0) / techValues.length).toFixed(1));
                    }
                  }
              });
          });
      });

      return Object.values(cellMap);
    };

    fetchData();
  }, [selectedMonth]);

  return (
    <div style={{ 
        padding: '24px', 
        width: '100%', 
        maxWidth: 'none', 
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
    }}>
      <header style={{ 
          marginBottom: '32px', 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
                backgroundColor: 'var(--movistar-blue)',
                padding: '10px',
                borderRadius: '12px',
                color: 'white',
                boxShadow: '0 4px 6px -1px rgba(1, 157, 244, 0.2)'
            }}>
                <TrendingUp size={24} strokeWidth={3} />
            </div>
            <div>
                <h1 style={{ 
                fontSize: '28px', 
                fontWeight: '950', 
                color: '#1a1a1a',
                letterSpacing: '-1px',
                lineHeight: '1'
                }}>Matriz Operativa</h1>
                <p style={{ color: '#666', fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>Evolución Semanal del Distrito Varela</p>
            </div>
        </div>
        
        <div style={{ 
            display: 'flex', 
            gap: '8px',
            backgroundColor: 'white',
            padding: '6px 12px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
            <span style={{ backgroundColor: 'var(--movistar-blue)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '900' }}>{selectedMonth}</span>
            <span style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '900' }}>{kpiConfig[selectedKpi].label}</span>
        </div>
      </header>

      <DistrictOverview config={kpiConfig} />

      {/* 1. FILTRO DE MES */}
      <section style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {MONTHS.filter(m => m === 'Marzo').map(month => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: selectedMonth === month ? '900' : '700',
                backgroundColor: selectedMonth === month ? 'var(--movistar-blue)' : 'white',
                color: selectedMonth === month ? 'white' : '#666',
                transition: 'all 0.2s',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: selectedMonth === month ? '0 4px 6px -1px rgba(1, 157, 244, 0.2)' : 'none'
              }}
            >
              {month}
            </button>
          ))}
        </div>
      </section>

      {/* 2. SELECTOR DE KPI */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(Object.keys(kpiConfig) as KpiType[]).map(kpi => {
            const isActive = selectedKpi === kpi;
            return (
                <button
                key={kpi}
                onClick={() => setSelectedKpi(kpi)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '14px',
                  backgroundColor: 'white',
                  border: `2px solid ${isActive ? 'var(--movistar-blue)' : 'transparent'}`,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 10px 15px -3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                  <div style={{ color: isActive ? 'var(--movistar-blue)' : '#94a3b8' }}>
                      <BarChart3 size={18} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '900', color: isActive ? '#1a1a1a' : '#666' }}>{kpiConfig[kpi].label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 3. LISTADO DE BLOQUES POR CÉLULA */}
      <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
          <div style={{ minWidth: '900px' }}>
              {!loading && data.length > 0 && (
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginBottom: '8px' }}>
                    <colgroup>
                        <col style={{ width: '280px' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: '0 20px 12px 20px' }}></th>
                            {[0, 1, 2, 3].map(i => {
                                const Monday = getMondayOfNextWeek(currentYear, currentMonthIdx, i);
                                const day = Monday.getDate().toString().padStart(2, '0');
                                const month = (Monday.getMonth() + 1).toString().padStart(2, '0');
                                const label = `SEMANA ${i + 1} - LUN ${day}/${month}`;
                                return (
                                    <th key={label} style={{ padding: '0 0 12px 0', fontSize: '10px', fontWeight: '950', color: '#666', textTransform: 'uppercase', textAlign: 'center' }}>{label}</th>
                                );
                            })}
                            <th style={{ padding: '0 0 12px 0', fontSize: '11px', fontWeight: '950', color: '#019df4', textTransform: 'uppercase', textAlign: 'center' }}>CONSOLIDADO</th>
                        </tr>
                    </thead>
                </table>
              )}
              {loading ? (
                  <div style={{ padding: '100px', textAlign: 'center', color: '#666' }}>
                      <Loader2 className="animate-spin" style={{ margin: '0 auto 16px' }} />
                      <p style={{ fontWeight: '700' }}>Cargando datos desde Supabase...</p>
                  </div>
              ) : data.length === 0 ? (
                  <div style={{ padding: '100px', textAlign: 'center', backgroundColor: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                      <p style={{ fontWeight: '700', color: '#94a3b8' }}>No hay datos registrados para este mes.</p>
                  </div>
              ) : data.map((row) => (
                  <CellGroup key={row.name} row={row} kpi={selectedKpi} config={kpiConfig} />
              ))}
          </div>
      </div>

      <style jsx global>{`
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

import { Loader2 } from 'lucide-react';
