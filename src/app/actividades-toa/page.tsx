'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Zap, 
  CheckCircle2, 
  Loader2,
  ClipboardCheck,
  Activity,
  ListChecks,
  Search,
  ArrowRightLeft
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import TechnicianDetailsSheet from '@/components/TechnicianDetailsSheet';

// --- Types ---
type ToaKpiType = 'inicio' | 'ok1' | 'cierres' | 'completadas' | 'no_encontrados' | 'deriva_bajadas';
type ViewMode = 'semanal' | 'indicador';
type WeekKey = 's1' | 's2' | 's3' | 's4' | 's5';

interface MetricEntry {
  value: number | null;
  id?: string;
  date: string;
}

interface MetricData {
  s1: MetricEntry;
  s2: MetricEntry;
  s3: MetricEntry;
  s4: MetricEntry;
  s5: MetricEntry;
}

interface ItemRow {
  id?: string;
  name: string;
  metrics: Record<ToaKpiType, MetricData>;
  isCell: boolean;
  celula?: string;
  technicians?: ItemRow[];
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface KpiConfigItem {
    label: string;
    unit: string;
    targets: { green: number; yellow: number; reverse?: boolean };
    icon: any;
}

// --- Constants ---
const TOA_KPI_CONFIG: Record<ToaKpiType, KpiConfigItem> = {
  inicio: { label: 'Inicio', unit: '%', targets: { green: 80, yellow: 71 }, icon: Activity },
  ok1: { label: '1er OK', unit: '%', targets: { green: 80, yellow: 71 }, icon: CheckCircle2 },
  cierres: { label: 'Cant. Cierres', unit: '', targets: { green: 0, yellow: 0 }, icon: ClipboardCheck },
  completadas: { label: 'Completadas', unit: '%', targets: { green: 75, yellow: 70 }, icon: ListChecks },
  no_encontrados: { label: 'No encontrados', unit: '%', targets: { green: 4.9, yellow: 6.9, reverse: true }, icon: Search },
  deriva_bajadas: { label: 'Deriva Bajadas', unit: '%', targets: { green: 4.9, yellow: 6.9, reverse: true }, icon: ArrowRightLeft },
};

// --- Helper Functions ---
const getWeekOfDate = (date: Date): WeekKey => {
  const day = date.getUTCDate();
  if (day <= 7) return 's1';
  if (day <= 14) return 's2';
  if (day <= 21) return 's3';
  if (day <= 28) return 's4';
  return 's5';
};

const getStatusColors = (value: number | null, kpi: ToaKpiType, config: Record<ToaKpiType, KpiConfigItem>) => {
  if (value === null) return { bg: '#F3F4F6', text: '#6B7280' };
  const { targets } = config[kpi];
  
  // New standardized semaforización with low saturation background and strong text
  const COLORS = {
    green: { bg: 'rgba(34, 197, 94, 0.15)', text: '#059669' },
    yellow: { bg: 'rgba(217, 119, 6, 0.15)', text: '#D97706' },
    red: { bg: 'rgba(220, 38, 38, 0.15)', text: '#DC2626' }
  };

  if (targets.reverse) {
    if (value <= targets.green) return COLORS.green;
    if (value <= targets.yellow) return COLORS.yellow;
    return COLORS.red;
  } else {
    if (value >= targets.green) return COLORS.green;
    if (value >= targets.yellow) return COLORS.yellow;
    return COLORS.red;
  }
};

const getMondayOfNextWeek = (year: number, monthIndex: number, weekIndex: number) => {
    const firstMonday = new Date(year, monthIndex, 1);
    const dayOfWeek = firstMonday.getDay();
    const diff = (dayOfWeek === 1 ? 0 : (dayOfWeek === 0 ? 1 : 8 - dayOfWeek));
    firstMonday.setDate(firstMonday.getDate() + diff);
    const result = new Date(firstMonday);
    result.setDate(firstMonday.getDate() + (weekIndex * 7));
    return result;
};

const calculateAverage = (metrics: MetricData): number | null => {
  if (!metrics) return null;
  const values = [metrics.s1.value, metrics.s2.value, metrics.s3.value, metrics.s4.value].filter(v => v !== null) as number[];
  if (values.length === 0) return null;
  return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
};

// --- UI Components ---
const DistrictOverview = ({ config, districtData }: { config: Record<ToaKpiType, KpiConfigItem>, districtData: Record<ToaKpiType, number> | null }) => {
  const getStatusColor = (value: number, kpi: ToaKpiType, config: Record<ToaKpiType, KpiConfigItem>) => {
    const { targets } = config[kpi];
    if (targets.reverse) {
      if (value <= targets.green) return '#10b981';
      if (value <= targets.yellow) return '#f59e0b';
      return '#ef4444';
    }
    if (value >= targets.green) return '#10b981';
    if (value >= targets.yellow) return '#f59e0b';
    return '#ef4444';
  };

  const safeData = districtData || { inicio: 0, ok1: 0, cierres: 0, completadas: 0, no_encontrados: 0, deriva_bajadas: 0 };
  const stats: { kpi: ToaKpiType, value: number }[] = [
    { kpi: 'inicio', value: safeData.inicio || 0 },
    { kpi: 'ok1', value: safeData.ok1 || 0 },
    { kpi: 'cierres', value: safeData.cierres || 0 },
    { kpi: 'completadas', value: safeData.completadas || 0 },
  ];

  return (
    <div style={{ marginBottom: '40px' }}>
      <p style={{ fontSize: '12px', fontWeight: '900', color: '#6B7280', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Consolidado de Actividad TOA - Distrito Varela
      </p>
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {stats.map((stat) => {
          const colors = getStatusColors(stat.value, stat.kpi, config);
          const { label, unit, targets } = config[stat.kpi];

          return (
            <div key={stat.kpi} className="kpi-card" style={{
              backgroundColor: colors.bg,
              padding: '24px',
              borderRadius: '24px',
              border: '1px solid #E5E7EB',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</h3>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', marginTop: '4px' }}>Objetivo: {targets.green}{unit}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '42px', fontWeight: '950', color: colors.text, letterSpacing: '-1.5px' }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#94a3b8' }}>{unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MetricCard = ({ 
  entry, 
  prevValue, 
  kpi, 
  unit, 
  config,
  showActivityBadge = false
}: { 
  entry: MetricEntry, 
  prevValue?: number | null, 
  kpi: ToaKpiType, 
  unit: string, 
  config: Record<ToaKpiType, KpiConfigItem>,
  showActivityBadge?: boolean
}) => {
  const colors = getStatusColors(entry.value, kpi, config);

  return (
    <td style={{ padding: '4px' }}>
      <div style={{
        backgroundColor: colors.bg,
        borderRadius: '8px',
        height: '48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: 'none',
        border: '1px solid #E5E7EB',
        transition: 'all 0.2s',
      }}>
        <span style={{ 
            fontSize: '18px', 
            fontWeight: '900', 
            color: colors.text,
            letterSpacing: '-0.5px',
            lineHeight: '1'
        }}>
          {entry.value !== null ? `${entry.value}${unit}` : '-'}
        </span>
      </div>
    </td>
  );
};

const CellGroup = ({ 
  row, 
  kpi, 
  viewMode,
  selectedWeek,
  config,
  onTechnicianClick
}: { 
  row: ItemRow, 
  kpi: ToaKpiType, 
  viewMode: ViewMode,
  selectedWeek: WeekKey,
  config: Record<ToaKpiType, KpiConfigItem>,
  onTechnicianClick: (tech: ItemRow) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const metrics = row.metrics[kpi];
  const unit = config[kpi].unit;
  
  const sortedTechnicians = [...(row.technicians || [])].sort((a, b) => {
    if (viewMode === 'semanal') {
      const valA = calculateAverage(a.metrics[kpi]) ?? -Infinity;
      const valB = calculateAverage(b.metrics[kpi]) ?? -Infinity;
      if (config[kpi].targets.reverse) {
          return (valA === -Infinity ? 1 : (valB === -Infinity ? -1 : valA - valB));
      }
      return valB - valA;
    }
    return a.name.localeCompare(b.name);
  });

  const borderColor = isExpanded ? '#334155' : 'rgba(51, 65, 85, 0.1)';

  return (
    <div style={{
        border: '1px solid #E5E7EB',
        borderRadius: '24px',
        marginBottom: '16px',
        overflow: 'hidden',
        backgroundColor: 'white',
        transition: 'all 0.3s ease',
        boxShadow: isExpanded ? '0 20px 25px -5px rgba(0, 0, 0, 0.05)' : 'none',
    }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', textAlign: 'left', tableLayout: 'fixed' }}>
            <colgroup>
                <col style={{ width: '280px' }} />
                {viewMode === 'semanal' ? (
                  [1, 2, 3, 4, 5].map(i => <col key={i} style={{ width: '14%' }} />)
                ) : (
                  [1, 2, 3, 4, 5, 6].map(i => <col key={i} style={{ width: '11%' }} />)
                )}
            </colgroup>
            <tbody>
                <tr 
                    onClick={() => row.isCell && setIsExpanded(!isExpanded)}
                    style={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: isExpanded ? '#F3F4F6' : 'transparent',
                    }}
                >
                    <td style={{ 
                        padding: '16px 24px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            backgroundColor: isExpanded ? '#1F2937' : '#F3F4F6',
                            padding: '8px',
                            borderRadius: '10px',
                            color: isExpanded ? 'white' : '#1F2937',
                        }}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ 
                                fontWeight: '900',
                                fontSize: '15px',
                                color: '#1F2937',
                                lineHeight: '1.2'
                            }}>
                                {row.name}
                            </span>
                        </div>
                    </td>
                    {viewMode === 'semanal' ? (
                      <>
                        <MetricCard entry={metrics.s1} kpi={kpi} unit={unit} config={config} />
                        <MetricCard entry={metrics.s2} prevValue={metrics.s1.value} kpi={kpi} unit={unit} config={config} />
                        <MetricCard entry={metrics.s3} prevValue={metrics.s2.value} kpi={kpi} unit={unit} config={config} />
                        <MetricCard entry={metrics.s4} prevValue={metrics.s3.value} kpi={kpi} unit={unit} config={config} />
                        <MetricCard entry={metrics.s5} prevValue={metrics.s4.value} kpi={kpi} unit={unit} config={config} />
                      </>
                    ) : (
                      (Object.keys(config) as ToaKpiType[]).map(k => (
                        <MetricCard key={k} entry={row.metrics[k][selectedWeek]} kpi={k} unit={config[k].unit} config={config} />
                      ))
                    )}
                </tr>

                {isExpanded && sortedTechnicians.map((tech, idx) => (
                    <tr key={tech.name} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
                        <td 
                          onClick={() => onTechnicianClick({ ...tech, celula: row.name })}
                          style={{ 
                            padding: '12px 24px 12px 72px', 
                            cursor: 'pointer'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '4px', height: '4px', backgroundColor: '#94a3b8', borderRadius: '50%' }} />
                                <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: '700' }}>{tech.name}</span>
                            </div>
                        </td>
                        {viewMode === 'semanal' ? (
                          (['s1', 's2', 's3', 's4', 's5'] as const).map((s, idx) => {
                             const prevS = idx > 0 ? (['s1', 's2', 's3', 's4', 's5'] as const)[idx-1] : null;
                             return (
                               <MetricCard 
                                 key={s}
                                 entry={tech.metrics[kpi][s]} 
                                 prevValue={prevS ? tech.metrics[kpi][prevS].value : null} 
                                 kpi={kpi} 
                                 unit={unit} 
                                 config={config} 
                               />
                             );
                          })
                        ) : (
                          (Object.keys(config) as ToaKpiType[]).map((k) => (
                             <MetricCard 
                               key={k}
                               entry={tech.metrics[k][selectedWeek]} 
                               kpi={k} 
                               unit={config[k].unit} 
                               config={config} 
                             />
                          ))
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
};

export default function ActividadesToaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('semanal');
  const [selectedWeek, setSelectedWeek] = useState<WeekKey>('s1');
  const [selectedMonth, setSelectedMonth] = useState('Abril');
  const [visibleMonths, setVisibleMonths] = useState(['Marzo', 'Abril', 'Mayo', 'Junio']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<ToaKpiType>('inicio');
  const [data, setData] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [districtKPIs, setDistrictKPIs] = useState<any>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<ItemRow | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setIsDropdownOpen(false);
    if (!visibleMonths.includes(month)) {
      const newVisible = [...visibleMonths];
      newVisible[3] = month;
      setVisibleMonths(newVisible);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    const monthIndex = MONTHS.indexOf(selectedMonth);
    const year = new Date().getFullYear();
    const startDate = new Date(year, monthIndex, 1).toISOString();
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59).toISOString();

    const [metricsRes, cellTotalsRes] = await Promise.all([
      supabase.from('metricas').select('*, tecnicos(id, nombre, apellido)').gte('fecha', startDate).lte('fecha', endDate),
      supabase.from('metricas_celula').select('*').gte('fecha', startDate).lte('fecha', endDate)
    ]);

    if (metricsRes.error) console.error('Error metrics:', metricsRes.error);
    if (cellTotalsRes.error) console.error('Error cell totals:', cellTotalsRes.error);
    
    // Calcular promedios del distrito (basado en tecnicos individuales)
    const districtStats: any = {};
    (Object.keys(TOA_KPI_CONFIG) as ToaKpiType[]).forEach(k => {
      const allValues = metricsRes.data?.map((m: any) => m[k]).filter((v: any) => v != null) || [];
      if (allValues.length > 0) {
          districtStats[k] = Math.round(allValues.reduce((a: any, b: any) => a + b, 0) / allValues.length);
      }
    });
    setDistrictKPIs(districtStats);

    setData(processToaData(metricsRes.data || [], cellTotalsRes.data || [], monthIndex, year));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const processToaData = (metrics: any[], cellTotals: any[], month: number, year: number) => {
    const cellMap: Record<string, ItemRow> = {};

    const createEmptyMetricData = (m: number, y: number): MetricData => ({
      s1: { value: null, date: new Date(Date.UTC(y, m, 1)).toISOString().split('T')[0] },
      s2: { value: null, date: new Date(Date.UTC(y, m, 8)).toISOString().split('T')[0] },
      s3: { value: null, date: new Date(Date.UTC(y, m, 15)).toISOString().split('T')[0] },
      s4: { value: null, date: new Date(Date.UTC(y, m, 22)).toISOString().split('T')[0] },
      s5: { value: null, date: new Date(Date.UTC(y, m, 29)).toISOString().split('T')[0] },
    });

    metrics.forEach(m => {
      const cellName = (m.celula || 'DISTRITO').toUpperCase().replace(/_/g, ' ').trim();
      const techId = m.tecnicos?.id;
      const techName = m.tecnico || (m.tecnicos ? `${m.tecnicos.apellido}, ${m.tecnicos.nombre}` : 'Desconocido');
      const week = getWeekOfDate(new Date(m.fecha));

      if (!cellMap[cellName]) {
        cellMap[cellName] = {
          name: cellName,
          isCell: true,
          metrics: {
            inicio: createEmptyMetricData(month, year),
            ok1: createEmptyMetricData(month, year),
            cierres: createEmptyMetricData(month, year),
            completadas: createEmptyMetricData(month, year),
            no_encontrados: createEmptyMetricData(month, year),
            deriva_bajadas: createEmptyMetricData(month, year),
          },
          technicians: []
        };
      }

      const cell = cellMap[cellName];
      let tech = cell.technicians?.find(t => t.id === techId || t.name === techName);

      if (!tech) {
        tech = {
          id: techId,
          name: techName,
          isCell: false,
          metrics: {
            inicio: createEmptyMetricData(month, year),
            ok1: createEmptyMetricData(month, year),
            cierres: createEmptyMetricData(month, year),
            completadas: createEmptyMetricData(month, year),
            no_encontrados: createEmptyMetricData(month, year),
            deriva_bajadas: createEmptyMetricData(month, year),
          }
        };
        cell.technicians?.push(tech);
      }

      // Mapping TOA fields (Note: These keys must match the DB column names if they exist)
      tech.metrics.inicio[week] = { value: m.inicio ?? null, id: m.id, date: m.fecha };
      tech.metrics.ok1[week] = { value: m.ok1 ?? null, id: m.id, date: m.fecha };
      tech.metrics.cierres[week] = { value: m.cierres ?? null, id: m.id, date: m.fecha };
      tech.metrics.completadas[week] = { value: m.completadas ?? null, id: m.id, date: m.fecha };
      tech.metrics.no_encontrados[week] = { value: m.no_encontrados ?? null, id: m.id, date: m.fecha };
      tech.metrics.deriva_bajadas[week] = { value: m.deriva_bajadas ?? null, id: m.id, date: m.fecha };
    });

    // Calculate cell averages/sums
    Object.values(cellMap).forEach(cell => {
        (Object.keys(TOA_KPI_CONFIG) as ToaKpiType[]).forEach(kpi => {
            (['s1', 's2', 's3', 's4', 's5'] as const).forEach(week => {
                if (cell.metrics[kpi][week].value === null) {
                  const techValues = cell.technicians?.map(t => t.metrics[kpi][week].value).filter(v => v !== null) as number[];
                  if (techValues.length > 0) {
                      cell.metrics[kpi][week].value = Math.round(techValues.reduce((a, b) => a + b, 0) / techValues.length);
                  }
                }
            });
        });
    });

    // POS-PROCESAMIENTO: Integrar totales cargados manualmente (Sobrescriben promedios)
    cellTotals.forEach(ct => {
      const cellName = (ct.celula || 'DISTRITO').toUpperCase().replace(/_/g, ' ').trim();
      const week = getWeekOfDate(new Date(ct.fecha));
      
      if (!cellMap[cellName]) {
        cellMap[cellName] = {
           name: cellName,
           isCell: true,
           metrics: {
             inicio: createEmptyMetricData(month, year),
             ok1: createEmptyMetricData(month, year),
             cierres: createEmptyMetricData(month, year),
             completadas: createEmptyMetricData(month, year),
             no_encontrados: createEmptyMetricData(month, year),
             deriva_bajadas: createEmptyMetricData(month, year),
           },
           technicians: []
        };
      }
      
      const cell = cellMap[cellName];
      if (ct.inicio != null) cell.metrics.inicio[week] = { value: ct.inicio, id: ct.id, date: ct.fecha };
      if (ct.ok1 != null) cell.metrics.ok1[week] = { value: ct.ok1, id: ct.id, date: ct.fecha };
      if (ct.cierres != null) cell.metrics.cierres[week] = { value: ct.cierres, id: ct.id, date: ct.fecha };
      if (ct.completadas != null) cell.metrics.completadas[week] = { value: ct.completadas, id: ct.id, date: ct.fecha };
      if (ct.no_encontrados != null) cell.metrics.no_encontrados[week] = { value: ct.no_encontrados, id: ct.id, date: ct.fecha };
      if (ct.deriva_bajadas != null) cell.metrics.deriva_bajadas[week] = { value: ct.deriva_bajadas, id: ct.id, date: ct.fecha };
    });

    return Object.values(cellMap).sort((a, b) => a.name.localeCompare(b.name));
  };

  const weekLabels = [0, 1, 2, 3, 4].map(i => {
      const Monday = getMondayOfNextWeek(new Date().getFullYear(), MONTHS.indexOf(selectedMonth), i);
      const day = Monday.getDate().toString().padStart(2, '0');
      const month = (Monday.getMonth() + 1).toString().padStart(2, '0');
      return `SEMANA ${i + 1} - LUN ${day}/${month}`;
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '32px 40px 60px 40px' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)' }}>
                <ClipboardCheck size={32} strokeWidth={2.5} />
            </div>
            <div>
                <h1 style={{ fontSize: '36px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.5px', lineHeight: '1' }}>Actividades TOA</h1>
                <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '700', marginTop: '8px' }}>Seguimiento de actividad técnica operativa</p>
            </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', padding: '10px 20px', backgroundColor: 'white', borderRadius: '22px', border: '2px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#1e293b" />
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>{selectedMonth}</span>
            </div>
            <div style={{ width: '2px', height: '20px', backgroundColor: '#e2e8f0' }}></div>
            <span style={{ fontSize: '14px', fontWeight: '900', color: '#64748b' }}>MODO {viewMode.toUpperCase()}</span>
        </div>
      </header>


      <section style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {visibleMonths.map(month => (
              <button 
                key={month} 
                onClick={() => handleMonthSelect(month)} 
                style={{ 
                  padding: '12px 24px', 
                  borderRadius: '14px', 
                  fontSize: '14px', 
                  fontWeight: selectedMonth === month ? '900' : '700', 
                  backgroundColor: selectedMonth === month ? '#1F2937' : '#F3F4F6', 
                  color: selectedMonth === month ? 'white' : '#1F2937', 
                  transition: 'all 0.2s', 
                  border: 'none',
                  cursor: 'pointer', 
                  boxShadow: selectedMonth === month ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {month}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              backgroundColor: '#94a3b8', 
              borderRadius: '18px', 
              padding: '5px', 
              gap: '4px',
              border: 'none',
            }}>
              <button 
                onClick={() => setViewMode('semanal')}
                style={{ 
                  padding: '10px 24px', 
                  borderRadius: '14px', 
                  fontSize: '13px', 
                  fontWeight: '900', 
                  backgroundColor: viewMode === 'semanal' ? 'white' : 'transparent', 
                  color: viewMode === 'semanal' ? '#0f172a' : '#64748b', 
                  boxShadow: viewMode === 'semanal' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                Semanal
              </button>
              <button 
                onClick={() => setViewMode('indicador')}
                style={{ 
                  padding: '10px 24px', 
                  borderRadius: '14px', 
                  fontSize: '13px', 
                  fontWeight: '900', 
                  backgroundColor: viewMode === 'indicador' ? 'white' : 'transparent', 
                  color: viewMode === 'indicador' ? '#0f172a' : '#64748b', 
                  boxShadow: viewMode === 'indicador' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                Indicador
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '4px' }}>
          {viewMode === 'semanal' ? (
            (Object.keys(TOA_KPI_CONFIG) as ToaKpiType[]).map(kpi => {
              const isActive = selectedKpi === kpi;
              const Icon = TOA_KPI_CONFIG[kpi].icon;
              return (
                    <button 
                      key={kpi} 
                      onClick={() => setSelectedKpi(kpi)} 
                      style={{ 
                        minWidth: '200px', 
                        padding: '16px 24px', 
                        borderRadius: '20px', 
                        backgroundColor: isActive ? '#f8fafc' : '#f1f5f9', 
                        border: isActive ? '3px solid #1e293b' : '3px solid #cbd5e1',
                        transition: 'all 0.2s ease', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '14px', 
                        cursor: 'pointer', 
                        boxShadow: isActive ? '0 10px 15px -3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)', 
                      }}
                  >
                    <div style={{ color: isActive ? '#1e293b' : '#cbd5e1' }}><Icon size={20} strokeWidth={3} /></div>
                    <span style={{ fontSize: '14px', fontWeight: '950', color: isActive ? '#1e293b' : '#64748b', textTransform: 'uppercase' }}>{TOA_KPI_CONFIG[kpi].label}</span>
                  </button>
              )
            })
          ) : (
            (['s1', 's2', 's3', 's4'] as WeekKey[]).map((week, idx) => {
              const isActive = selectedWeek === week;
              const label = weekLabels[idx].split(' - ')[0]; 
              const subLabel = weekLabels[idx].split(' - ')[1]; 
              return (
                    <button 
                      key={week} 
                      onClick={() => setSelectedWeek(week)} 
                      style={{ 
                        minWidth: '200px', 
                        padding: '16px 24px', 
                        borderRadius: '20px', 
                        backgroundColor: isActive ? '#f8fafc' : '#f1f5f9', 
                        border: isActive ? '3px solid #1e293b' : '3px solid #cbd5e1',
                        transition: 'all 0.2s ease', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'flex-start', 
                        gap: '4px', 
                        cursor: 'pointer', 
                        boxShadow: isActive ? '0 10px 15px -3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)', 
                      }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '950', color: isActive ? '#1e293b' : '#64748b', textTransform: 'uppercase' }}>{label}</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: isActive ? '#64748b' : '#94a3b8' }}>{subLabel}</span>
                  </button>
              )
            })
          )}
        </div>
      </section>

      <div style={{ width: '100%', backgroundColor: 'white', borderRadius: '28px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)', border: '2px solid #e2e8f0' }}>
          {!loading && (
            <div style={{ position: 'sticky', top: '-32px', zIndex: 10, backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', margin: '0 -32px 16px -32px', padding: '16px 32px 12px 32px' }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                  <colgroup>
                      <col style={{ width: '280px' }} />
                      {viewMode === 'semanal' ? (
                        [1, 2, 3, 4, 5].map(i => <col key={i} style={{ width: '14%' }} />)
                      ) : (
                        [1, 2, 3, 4, 5, 6].map(i => <col key={i} style={{ width: '11%' }} />)
                      )}
                  </colgroup>
                  <thead>
                      <tr style={{ textAlign: 'left' }}>
                          <th style={{ padding: '0 24px' }}></th>
                          {viewMode === 'semanal' ? (
                            weekLabels.map(label => (
                              <th key={label} style={{ padding: '0', fontSize: '11px', fontWeight: '900', color: '#374151', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.05em' }}>{label}</th>
                            ))
                          ) : (
                            (Object.keys(TOA_KPI_CONFIG) as ToaKpiType[]).map(k => (
                              <th key={k} style={{ padding: '0', fontSize: '11px', fontWeight: '900', color: '#374151', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.05em' }}>{TOA_KPI_CONFIG[k].label}</th>
                            ))
                          )}
                      </tr>
                  </thead>
              </table>
            </div>
          )}
          
          {loading ? (
              <div style={{ padding: '100px', textAlign: 'center', color: '#64748b' }}>
                  <Loader2 className="animate-spin" size={48} style={{ margin: '0 auto 16px' }} />
                  <p style={{ fontWeight: '800', fontSize: '18px' }}>Cargando actividades...</p>
              </div>
          ) : data.length === 0 ? (
              <div style={{ padding: '100px', textAlign: 'center', border: '3px dashed #e2e8f0', borderRadius: '24px' }}>
                  <p style={{ fontWeight: '800', color: '#94a3b8', fontSize: '18px' }}>No hay registros operativos para este mes.</p>
              </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
              {data.filter(row => row.name !== 'DISTRITO').map((row) => (
                <CellGroup 
                  key={row.name} 
                  row={row} 
                  kpi={selectedKpi} 
                  viewMode={viewMode}
                  selectedWeek={selectedWeek}
                  config={TOA_KPI_CONFIG} 
                  onTechnicianClick={(tech) => {
                    setSelectedTechnician(tech);
                    setShowDetails(true);
                  }}
                />
              ))}
            </div>
          )}
      </div>

      <TechnicianDetailsSheet
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        technician={selectedTechnician}
      />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .kpi-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
        @media (min-width: 1024px) {
          .kpi-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 24px !important; }
        }
        
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
