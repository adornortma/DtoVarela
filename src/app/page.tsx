'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Zap, 
  CheckCircle2, 
  Loader2,
  Pencil,
  ClipboardCheck,
  Activity,
  ListChecks,
  Search,
  ArrowRightLeft
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import TechnicianDetailsSheet from '@/components/TechnicianDetailsSheet';
import WeatherIndicator from '@/components/WeatherIndicator';

// --- Weather Data ---
const WEATHER_DATA: Record<string, Record<string, string[]>> = {
  'Abril': {
    's2': ['Lunes 06-04', 'Martes 07-04']
  }
};

// --- Types ---
type KpiType = 'resolucion' | 'reiteros' | 'puntualidad' | 'productividad';
type ViewMode = 'semanal' | 'indicador';
type WeekKey = 's1' | 's2' | 's3' | 's4' | 's5';

interface MetricEntry {
  value: number | null;
  id?: string; // Supabase row ID
  date: string; // The specific date for this week and tech
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
  metrics: Record<string, MetricData>;
  isCell: boolean;
  technicians?: ItemRow[];
  celula?: string;
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface KpiConfigItem {
    label: string;
    unit: string;
    targets: { green: number; yellow: number; reverse?: boolean };
}

// --- Constants ---
const DEFAULT_KPI_CONFIG: Record<KpiType, KpiConfigItem> = {
  resolucion: { label: 'Resolución', unit: '%', targets: { green: 75, yellow: 70 } },
  reiteros: { label: 'Reiteros', unit: '%', targets: { green: 4.5, yellow: 5, reverse: true } },
  puntualidad: { label: 'Puntualidad', unit: '%', targets: { green: 80, yellow: 70 } },
  productividad: { label: 'Productividad', unit: '', targets: { green: 6, yellow: 5 } },
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

const getStatusColors = (value: number | null, kpi: KpiType, config: Record<KpiType, KpiConfigItem>) => {
  if (value === null) return { bg: '#F3F4F6', text: '#6B7280' };
  const { targets } = config[kpi];
  
  const COLORS = {
    green: { bg: '#DCFCE7', text: '#15803d' },
    yellow: { bg: '#FEF3C7', text: '#b45309' },
    red: { bg: '#FEE2E2', text: '#b91c1c' }
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
    // Find the first Monday of the month
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    let firstMonday = new Date(year, monthIndex, 1);
    const dayOfWeek = firstMonday.getDay(); // 0 (Sun) to 6 (Sat)
    
    // diff to reach next Monday: if Sun(0) -> +1, if Mon(1) -> 0, if Tue(2) -> +6, etc.
    const diff = (dayOfWeek === 1 ? 0 : (dayOfWeek === 0 ? 1 : 8 - dayOfWeek));
    firstMonday.setDate(firstMonday.getDate() + diff);
    
    const result = new Date(firstMonday);
    result.setDate(firstMonday.getDate() + (weekIndex * 7));
    return result;
};

const calculateAverage = (metrics: MetricData): number | null => {
  if (!metrics) return null;
  const values = [metrics.s1.value, metrics.s2.value, metrics.s3.value, metrics.s4.value, metrics.s5.value].filter(v => v !== null) as number[];
  if (values.length === 0) return null;
  return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
};

// --- UI Components ---
const DistrictOverview = ({ config, districtData, lastUpdate }: { config: Record<KpiType, KpiConfigItem>, districtData: Record<KpiType, number> | null, lastUpdate: string | null }) => {
  const formattedDate = lastUpdate ? new Date(lastUpdate).toLocaleString('es-AR') : 'Nunca';

  const safeData = districtData || { resolucion: 0, reiteros: 0, puntualidad: 0, productividad: 0 };
  const stats: { kpi: KpiType, value: number }[] = [
    { kpi: 'resolucion', value: safeData.resolucion || 0 },
    { kpi: 'reiteros', value: safeData.reiteros || 0 },
    { kpi: 'puntualidad', value: safeData.puntualidad || 0 },
    { kpi: 'productividad', value: safeData.productividad || 0 },
  ];

  return (
    <div style={{ marginBottom: '40px' }}>
      <p style={{ fontSize: '12px', fontWeight: '900', color: '#6B7280', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Indicadores del distrito (última actualización: {formattedDate})
      </p>
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {stats.map((stat) => {
          const colors = getStatusColors(stat.value, stat.kpi, config);
          const { label, unit, targets } = config[stat.kpi];

          return (
            <div key={stat.kpi} className="kpi-card" style={{
              backgroundColor: colors.bg,
              padding: '24px 28px',
              borderRadius: '24px',
              border: '1px solid #E5E7EB',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</h3>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', marginTop: '4px' }}>Objetivo: {targets.green}{unit}</div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '48px', fontWeight: '950', color: colors.text, letterSpacing: '-2px' }}>
                  {stat.kpi === 'productividad' ? stat.value.toFixed(2) : stat.value}
                </span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: '#94a3b8' }}>{unit}</span>
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
  isEditable = false, 
  onUpdate 
}: { 
  entry: MetricEntry, 
  prevValue?: number | null, 
  kpi: KpiType, 
  unit: string, 
  config: Record<KpiType, KpiConfigItem>,
  isEditable?: boolean,
  onUpdate?: (newValue: number) => void
}) => {
  const [localValue, setLocalValue] = useState<string>(entry.value !== null ? entry.value.toString() : '');
  const [isFocused, setIsFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const colors = getStatusColors(entry.value, kpi, config);
  
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(entry.value !== null ? entry.value.toString() : '');
    }
  }, [entry.value, isFocused]);

  let trend = null;
  if (entry.value !== null && prevValue != null) {
      const diff = entry.value - prevValue;
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

  const handleSave = async () => {
    const num = parseFloat(localValue.replace(',', '.'));
    if (!isNaN(num) && num !== entry.value) {
      setIsSaving(true);
      await onUpdate?.(num);
      setIsSaving(false);
    }
    setIsFocused(false);
  };

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
        position: 'relative',
        boxShadow: entry.value !== null ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
        border: isFocused ? '2px solid var(--movistar-blue)' : '1px solid rgba(255,255,255,0.2)',
        transition: 'all 0.2s',
        cursor: isEditable ? 'text' : 'default'
      }}>
        {isEditable && !isFocused && !isSaving && (
          <div style={{ position: 'absolute', top: '4px', right: '4px', opacity: 0.5 }}>
            <Pencil size={10} />
          </div>
        )}

        {isSaving ? (
            <Loader2 size={16} className="animate-spin" color="var(--movistar-blue)" />
        ) : isEditable ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0 4px' }}>
            <input 
              type="text"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={(e) => {
                if (e.relatedTarget?.getAttribute('data-save-btn')) return;
                handleSave();
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                textAlign: 'center',
                fontSize: '17px',
                fontWeight: '800',
                color: colors.text,
                outline: 'none',
                padding: 0
              }}
            />
            {isFocused && (
                <button 
                  data-save-btn="true"
                  onClick={handleSave}
                  style={{ 
                    position: 'absolute', 
                    right: '4px', 
                    background: '#10b981', 
                    border: 'none', 
                    borderRadius: '4px', 
                    color: 'white', 
                    padding: '2px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                    <CheckCircle2 size={12} />
                </button>
            )}
          </div>
        ) : (
          <span style={{ 
              fontSize: '17px', 
              fontWeight: '800', 
              color: colors.text,
              letterSpacing: '-0.3px',
              lineHeight: '1'
          }}>
            {entry.value !== null ? (kpi === 'productividad' ? `${entry.value}` : `${entry.value}${unit}`) : '-'}
          </span>
        )}
        
        {trend && !isFocused && (
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

const CellGroup = ({ 
  row, 
  kpi, 
  viewMode,
  selectedWeek,
  config, 
  onUpdateMetric,
  onTechnicianClick
}: { 
  row: ItemRow, 
  kpi: KpiType, 
  viewMode: ViewMode,
  selectedWeek: WeekKey,
  config: Record<KpiType, KpiConfigItem>,
  onUpdateMetric: (techId: string, date: string, value: number, celula: string) => void,
  onTechnicianClick: (tech: ItemRow) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const metrics = row.metrics[kpi];
  const unit = config[kpi].unit;
  
  // Weekly mode sorting (same as before)
  const average = calculateAverage(metrics);
  
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

  const borderColor = isExpanded ? 'var(--movistar-blue)' : 'rgba(1, 157, 244, 0.15)';

  return (
    <div style={{
        border: '1px solid #E5E7EB',
        borderRadius: '24px',
        marginBottom: '16px',
        overflow: 'hidden',
        backgroundColor: 'white',
        transition: 'all 0.3s ease',
        boxShadow: isExpanded ? '0 10px 15px -3px rgba(0, 0, 0, 0.05)' : 'none',
    }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', textAlign: 'left', tableLayout: 'fixed' }}>
            <colgroup>
                <col style={{ width: '30%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
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
                    <style jsx>{`
                      .table-row-hover:hover {
                        background-color: #f1f5f9 !important;
                      }
                    `}</style>
                    <td style={{ 
                        padding: '12px 20px', 
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
                      <>
                        <MetricCard entry={row.metrics.resolucion[selectedWeek]} kpi="resolucion" unit={config.resolucion.unit} config={config} />
                        <MetricCard entry={row.metrics.reiteros[selectedWeek]} kpi="reiteros" unit={config.reiteros.unit} config={config} />
                        <MetricCard entry={row.metrics.puntualidad[selectedWeek]} kpi="puntualidad" unit={config.puntualidad.unit} config={config} />
                        <MetricCard entry={row.metrics.productividad[selectedWeek]} kpi="productividad" unit={config.productividad.unit} config={config} />
                      </>
                    )}
                </tr>

                {isExpanded && sortedTechnicians.map((tech, idx) => (
                    <tr 
                        key={tech.name} 
                        style={{ 
                            backgroundColor: idx % 2 === 0 ? 'white' : '#F9FAFB', 
                            borderTop: '1px solid #E5E7EB' 
                        }}
                    >
                        <td 
                          onClick={() => onTechnicianClick({ ...tech, celula: row.name })}
                          style={{ 
                            padding: '12px 24px 12px 64px', 
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
                                 isEditable={kpi === 'puntualidad' && tech.id !== undefined}
                                 onUpdate={(val) => tech.id && onUpdateMetric(tech.id, tech.metrics[kpi][s].date, val, row.name)}
                               />
                             );
                          })
                        ) : (
                          (['resolucion', 'reiteros', 'puntualidad', 'productividad'] as const).map((k) => (
                             <MetricCard 
                               key={k}
                               entry={tech.metrics[k][selectedWeek]} 
                               kpi={k} 
                               unit={config[k].unit} 
                               config={config} 
                               isEditable={k === 'puntualidad' && tech.id !== undefined}
                               onUpdate={(val) => tech.id && onUpdateMetric(tech.id, tech.metrics[k][selectedWeek].date, val, row.name)}
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

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('indicador');
  const [selectedWeek, setSelectedWeek] = useState<WeekKey>('s2');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [visibleMonths, setVisibleMonths] = useState(
    MONTHS.slice(Math.max(0, new Date().getMonth() - 1), Math.max(0, new Date().getMonth() - 1) + 4)
  );
  const [selectedKpi, setSelectedKpi] = useState<KpiType>('resolucion');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [data, setData] = useState<ItemRow[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<ItemRow | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpiConfig, setKpiConfig] = useState<Record<KpiType, KpiConfigItem>>(DEFAULT_KPI_CONFIG);
  const [districtKPIs, setDistrictKPIs] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setIsDropdownOpen(false);
    if (!visibleMonths.includes(month)) {
      const newVisible = [...visibleMonths];
      newVisible[3] = month; // Swap the last one
      setVisibleMonths(newVisible);
    }
  };

  useEffect(() => {
    const fetchConfig = async () => {
        const { data: dbConfig } = await supabase.from('kpi_thresholds').select('*');
        if (dbConfig) {
          const newConfig = { ...DEFAULT_KPI_CONFIG };
          dbConfig.forEach((row: any) => {
            if (newConfig[row.kpi as KpiType]) {
              newConfig[row.kpi as KpiType].targets = {
                green: row.verde,
                yellow: row.amarillo,
                reverse: row.kpi === 'reiteros'
              };
            }
          });
          
          // Force 4.5 if DB has 4 (user request fix)
          if (newConfig.reiteros.targets.green === 4) {
             newConfig.reiteros.targets.green = 4.5;
          }

          setKpiConfig(newConfig);
        }

        // Fetch District KPIs (most recent row)
        const { data: distData } = await supabase
            .from('indicadores_distrito')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (distData) {
            setDistrictKPIs(distData);
            setLastUpdate(distData.updated_at);
        }
    };
    fetchConfig();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const monthIndex = MONTHS.indexOf(selectedMonth);
    const year = new Date().getFullYear();
    const startDate = new Date(year, monthIndex, 1).toISOString();
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59).toISOString();

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (isSupabaseConfigured) {
      const { data: dbMetrics, error } = await supabase
        .from('metricas')
        .select(`
          *,
          tecnicos (
            id,
            nombre,
            apellido
          )
        `)
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      const metrics = dbMetrics || [];

      const { data: dbCellTotals } = await supabase
        .from('metricas_celula')
        .select('*')
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      const cellTotals = dbCellTotals || [];

      if (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
        return;
      }
      setData(processData(metrics, cellTotals, monthIndex, year));
    } else {
        // Fallback or dummy logic if needed
        setData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const processData = (metrics: any[], cellTotals: any[], month: number, year: number) => {
    const cellMap: Record<string, ItemRow> = {};

    const createEmptyMetricData = (m: number, y: number): MetricData => {
      return {
        s1: { value: null, date: new Date(Date.UTC(y, m, 1)).toISOString().split('T')[0] },
        s2: { value: null, date: new Date(Date.UTC(y, m, 8)).toISOString().split('T')[0] },
        s3: { value: null, date: new Date(Date.UTC(y, m, 15)).toISOString().split('T')[0] },
        s4: { value: null, date: new Date(Date.UTC(y, m, 22)).toISOString().split('T')[0] },
        s5: { value: null, date: new Date(Date.UTC(y, m, 29)).toISOString().split('T')[0] },
      };
    };

    metrics.forEach(m => {
      const cellName = (m.celula || "DISTRITO").toUpperCase().replace(/_/g, ' ').trim();
      const techId = m.tecnicos?.id;
      const techName = m.tecnico || (m.tecnicos ? `${m.tecnicos.apellido}, ${m.tecnicos.nombre}` : 'Desconocido');
      const week = getWeekOfDate(new Date(m.fecha));

      if (!cellMap[cellName]) {
        cellMap[cellName] = {
          name: cellName,
          isCell: true,
          metrics: {
            resolucion: createEmptyMetricData(month, year),
            reiteros: createEmptyMetricData(month, year),
            puntualidad: createEmptyMetricData(month, year),
            productividad: createEmptyMetricData(month, year),
            inicio: createEmptyMetricData(month, year),
            ok1: createEmptyMetricData(month, year),
            completadas: createEmptyMetricData(month, year),
            no_encontrados: createEmptyMetricData(month, year),
            deriva_bajadas: createEmptyMetricData(month, year),
            cierres: createEmptyMetricData(month, year),
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
            resolucion: createEmptyMetricData(month, year),
            reiteros: createEmptyMetricData(month, year),
            puntualidad: createEmptyMetricData(month, year),
            productividad: createEmptyMetricData(month, year),
            inicio: createEmptyMetricData(month, year),
            ok1: createEmptyMetricData(month, year),
            completadas: createEmptyMetricData(month, year),
            no_encontrados: createEmptyMetricData(month, year),
            deriva_bajadas: createEmptyMetricData(month, year),
            cierres: createEmptyMetricData(month, year),
          }
        };
        cell.technicians?.push(tech);
      }

      tech.metrics.reiteros[week] = { value: m.reitero ?? null, id: m.id, date: m.fecha };
      tech.metrics.resolucion[week] = { value: m.resolucion ?? null, id: m.id, date: m.fecha };
      tech.metrics.puntualidad[week] = { value: m.puntualidad ?? null, id: m.id, date: m.fecha };
      tech.metrics.productividad[week] = { value: m.productividad ?? null, id: m.id, date: m.fecha };
      tech.metrics.inicio[week] = { value: m.inicio ?? null, id: m.id, date: m.fecha };
      tech.metrics.ok1[week] = { value: m.ok1 ?? null, id: m.id, date: m.fecha };
      tech.metrics.completadas[week] = { value: m.completadas ?? null, id: m.id, date: m.fecha };
      tech.metrics.no_encontrados[week] = { value: m.no_encontrados ?? null, id: m.id, date: m.fecha };
      tech.metrics.deriva_bajadas[week] = { value: m.deriva_bajadas ?? null, id: m.id, date: m.fecha };
      tech.metrics.cierres[week] = { value: m.cierres ?? null, id: m.id, date: m.fecha };
    });

    cellTotals.forEach(ct => {
      const cellName = (ct.celula || "DISTRITO").toUpperCase().replace(/_/g, ' ').trim();
      const week = getWeekOfDate(new Date(ct.fecha));
      if (!cellMap[cellName]) {
        cellMap[cellName] = {
          name: cellName,
          isCell: true,
          metrics: {
            resolucion: createEmptyMetricData(month, year),
            reiteros: createEmptyMetricData(month, year),
            puntualidad: createEmptyMetricData(month, year),
            productividad: createEmptyMetricData(month, year),
            inicio: createEmptyMetricData(month, year),
            ok1: createEmptyMetricData(month, year),
            completadas: createEmptyMetricData(month, year),
            no_encontrados: createEmptyMetricData(month, year),
            deriva_bajadas: createEmptyMetricData(month, year),
            cierres: createEmptyMetricData(month, year),
          },
          technicians: []
        };
      }
      
      const cell = cellMap[cellName];
      cell.metrics.reiteros[week] = { value: ct.reitero, id: ct.id, date: ct.fecha };
      cell.metrics.resolucion[week] = { value: ct.resolucion, id: ct.id, date: ct.fecha };
      cell.metrics.puntualidad[week] = { value: ct.puntualidad, id: ct.id, date: ct.fecha };
      cell.metrics.productividad[week] = { value: ct.productividad, id: ct.id, date: ct.fecha };
    });

    Object.values(cellMap).forEach(cell => {
        (['reiteros', 'resolucion', 'puntualidad', 'productividad', 'inicio', 'ok1', 'completadas', 'no_encontrados', 'deriva_bajadas', 'cierres'] as any[]).forEach(kpi => {
            (['s1', 's2', 's3', 's4', 's5'] as const).forEach(week => {
                if (cell.metrics[kpi][week].value === null) {
                  const techValues = cell.technicians?.map(t => t.metrics[kpi][week].value).filter(v => v !== null) as number[];
                  if (techValues.length > 0) {
                      cell.metrics[kpi][week].value = parseFloat((techValues.reduce((a, b) => a + b, 0) / techValues.length).toFixed(1));
                  }
                }
            });
        });
    });

    return Object.values(cellMap).sort((a, b) => a.name.localeCompare(b.name));
  };

  const updatePuntualidad = async (techId: string, date: string, value: number, celula: string) => {
    if (techId.startsWith('mock-')) return;
    try {
      const { data: existing } = await supabase.from('metricas').select('id').eq('tecnico_id', techId).eq('fecha', date).maybeSingle();
      if (existing) {
        await supabase.from('metricas').update({ puntualidad: value }).eq('id', existing.id);
      } else {
        await supabase.from('metricas').insert({ tecnico_id: techId, fecha: date, celula: celula, puntualidad: value, resolucion: 0, reitero: 0, productividad: 0 });
      }
      fetchData();
    } catch (err) {
      console.error('Error updating metric:', err);
    }
  };

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = MONTHS.indexOf(selectedMonth);
  const weekLabels = [0, 1, 2, 3, 4].map(i => {
      const Monday = getMondayOfNextWeek(currentYear, currentMonthIdx, i);
      const day = Monday.getDate().toString().padStart(2, '0');
      const month = (Monday.getMonth() + 1).toString().padStart(2, '0');
      return `SEMANA ${i + 1} - LUN ${day}/${month}`;
  });

  const hiddenMonths = MONTHS.filter(m => !visibleMonths.includes(m));

  return (
    <div style={{ padding: '32px 20px 60px 0', width: '100%', minHeight: '100vh' }}>
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '16px', color: 'var(--movistar-blue)', boxShadow: 'var(--card-shadow)', border: '1px solid #e2e8f0' }}>
                <TrendingUp size={24} strokeWidth={3} />
            </div>
            <div>
                <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#1a1a1a', letterSpacing: '-1px', lineHeight: '1' }}>KPIs Resolución</h1>
                <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '600', marginTop: '6px' }}>Fuente: Persa/incentivos - PBI Productividad</p>
            </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', padding: '8px 16px', backgroundColor: 'white', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: 'var(--card-shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--movistar-blue)' }}></div>
              <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{selectedMonth}</span>
            </div>
            <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0' }}></div>
            <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--movistar-blue)' }}>{kpiConfig[selectedKpi].label}</span>
        </div>
      </header>

      <DistrictOverview config={kpiConfig} districtData={districtKPIs} lastUpdate={lastUpdate} />


      <section style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 🟦 BLOQUE 1: MESES (FILTRO PRINCIPAL) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {visibleMonths.map(month => (
              <button 
                key={month} 
                onClick={() => handleMonthSelect(month)} 
                style={{ 
                  padding: '12px 24px', 
                  borderRadius: '14px', 
                  fontSize: '14px', 
                  fontWeight: selectedMonth === month ? '950' : '700', 
                  backgroundColor: selectedMonth === month ? 'var(--movistar-blue)' : '#f1f5f9', 
                  color: selectedMonth === month ? 'white' : '#475569', 
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                  border: selectedMonth === month ? 'none' : '2px solid #cbd5e1', 
                  cursor: 'pointer', 
                  boxShadow: selectedMonth === month ? '0 6px 16px rgba(1, 157, 244, 0.3)' : 'none',
                  transform: selectedMonth === month ? 'translateY(-2px)' : 'none'
                }}
              >
                {month}
              </button>
            ))}
            
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '14px', 
                  fontSize: '14px', 
                  fontWeight: '950', 
                  backgroundColor: 'white', 
                  color: '#64748b', 
                  border: '1px solid #e2e8f0', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ fontSize: '18px', lineHeight: 0, marginBottom: '6px' }}>...</span>
              </button>
              
              {isDropdownOpen && (
                <div style={{ 
                  position: 'absolute', 
                  top: 'calc(100% + 8px)', 
                  left: 0, 
                  backgroundColor: 'white', 
                  borderRadius: '16px', 
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)', 
                  border: '1px solid #e2e8f0', 
                  zIndex: 100, 
                  minWidth: '180px',
                  padding: '10px',
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '4px'
                }}>
                  {hiddenMonths.map(month => (
                    <button
                      key={month}
                      onClick={() => handleMonthSelect(month)}
                      style={{
                        padding: '12px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#64748b',
                        fontSize: '14px',
                        fontWeight: '700',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                        e.currentTarget.style.color = 'var(--movistar-blue)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 🟪 BLOQUE 2: MODO (SWITCH CONFIG) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px' }}>Vista:</span>
            <div style={{ 
              display: 'flex', 
              backgroundColor: '#94a3b8', 
              borderRadius: '16px', 
              padding: '4px', 
              gap: '2px',
              border: 'none',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <button 
                onClick={() => setViewMode('semanal')}
                style={{ 
                  padding: '8px 20px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: '900', 
                  backgroundColor: viewMode === 'semanal' ? 'white' : 'transparent', 
                  color: viewMode === 'semanal' ? '#0f172a' : '#f1f5f9', 
                  boxShadow: viewMode === 'semanal' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: 'none'
                }}
              >
                <BarChart3 size={15} />
                Semanal
              </button>
              <button 
                onClick={() => setViewMode('indicador')}
                style={{ 
                  padding: '8px 20px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: '900', 
                  backgroundColor: viewMode === 'indicador' ? 'white' : 'transparent', 
                  color: viewMode === 'indicador' ? '#0f172a' : '#f1f5f9', 
                  boxShadow: viewMode === 'indicador' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: 'none'
                }}
              >
                <Zap size={15} />
                Indicador
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <div className="filter-tabs" style={{ display: 'flex', gap: '12px', overflow: 'visible', paddingBottom: '12px', paddingTop: '4px', paddingLeft: '4px', paddingRight: '4px' }}>
          {viewMode === 'semanal' ? (
            (Object.keys(kpiConfig) as KpiType[]).map(kpi => {
              const isActive = selectedKpi === kpi;
              return (
                  <button 
                    key={kpi} 
                    onClick={() => setSelectedKpi(kpi)} 
                    style={{ 
                      minWidth: '180px', 
                      flexShrink: 0, 
                      padding: '12px 20px', 
                      borderRadius: '16px', 
                      backgroundColor: isActive ? '#f8fbfc' : '#f1f5f9', 
                      border: isActive ? '3px solid #1e293b' : '2px solid #cbd5e1', 
                      transition: 'all 0.2s ease', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer', 
                      boxShadow: isActive ? '0 4px 12px rgba(1, 157, 244, 0.08)' : '0 2px 4px rgba(0,0,0,0.01)', 
                      transform: isActive ? 'translateY(-1px)' : 'none' 
                    }}
                  >
                    <div style={{ color: isActive ? '#1e293b' : '#64748b' }}><BarChart3 size={18} /></div>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: isActive ? '#1e293b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{kpiConfig[kpi].label}</span>
                  </button>
              )
            })
          ) : (
            (['s1', 's2', 's3', 's4', 's5'] as WeekKey[]).map((week, idx) => {
              const isActive = selectedWeek === week;
              const label = weekLabels[idx].split(' - ')[0]; 
              const subLabel = weekLabels[idx].split(' - ')[1]; 
              return (
                  <button 
                    key={week} 
                    onClick={() => setSelectedWeek(week)} 
                    style={{ 
                      minWidth: '180px', 
                      flexShrink: 0, 
                      padding: '12px 20px', 
                      borderRadius: '16px', 
                      backgroundColor: isActive ? '#f8fbfc' : '#f1f5f9', 
                      border: isActive ? '3px solid #1e293b' : '2px solid #cbd5e1', 
                      transition: 'all 0.2s ease', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'flex-start', 
                      gap: '2px', 
                      cursor: 'pointer', 
                      boxShadow: isActive ? '0 4px 12px rgba(1, 157, 244, 0.08)' : '0 2px 4px rgba(0,0,0,0.01)', 
                      transform: isActive ? 'translateY(-1px)' : 'none',
                      position: 'relative'
                    }}
                  >
                    {WEATHER_DATA[selectedMonth]?.[week] && (
                      <WeatherIndicator days={WEATHER_DATA[selectedMonth][week]} />
                    )}
                    <span style={{ fontSize: '13px', fontWeight: '900', color: isActive ? '#1e293b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: isActive ? '#475569' : '#94a3b8', textTransform: 'uppercase' }}>{subLabel}</span>
                  </button>
              )
            })
          )}
        </div>
      </section>

      <div style={{ 
        width: '100%', 
        backgroundColor: 'white', 
        borderRadius: '24px', 
        padding: '0 24px 24px 24px', 
        boxShadow: 'var(--card-shadow)', 
        border: '1px solid #cbd5e1',
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
        overflowX: 'auto',
        position: 'relative'
      }}>
          <div style={{ minWidth: '950px' }}>
              {!loading && data.length > 0 && (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white', borderBottom: '1px solid #E5E7EB', margin: '0 -24px 16px -24px', padding: '20px 24px 12px 24px' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                    <colgroup>
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '14%' }} />
                    </colgroup>
                    <thead>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: '0 20px' }}></th>
                            {viewMode === 'semanal' ? (
                              weekLabels.map(label => (
                                <th key={label} style={{ padding: '0', fontSize: '11px', fontWeight: '900', color: '#374151', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.05em' }}>{label}</th>
                              ))
                            ) : (
                              (Object.keys(kpiConfig) as KpiType[]).map(k => (
                                <th key={k} style={{ padding: '0', fontSize: '11px', fontWeight: '900', color: '#374151', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.05em' }}>{kpiConfig[k].label}</th>
                              ))
                            )}
                        </tr>
                    </thead>
                  </table>
                </div>
              )}
              {loading ? (
                  <div style={{ padding: '100px', textAlign: 'center', color: '#666' }}>
                      <Loader2 className="animate-spin" style={{ margin: '0 auto 16px' }} />
                      <p style={{ fontWeight: '700' }}>Cargando datos...</p>
                  </div>
              ) : data.length === 0 ? (
                  <div style={{ padding: '100px', textAlign: 'center', backgroundColor: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                      <p style={{ fontWeight: '700', color: '#94a3b8' }}>No hay datos registrados para este mes.</p>
                  </div>
              ) : (
                <div style={{ 
                  animation: 'fadeIn 0.4s ease-out'
                }}>
                  {data.filter(row => row.name !== 'DISTRITO').map((row) => (
                    <CellGroup 
                      key={row.name} 
                      row={row} 
                      kpi={selectedKpi} 
                      viewMode={viewMode}
                      selectedWeek={selectedWeek}
                      config={kpiConfig} 
                      onUpdateMetric={updatePuntualidad}
                      onTechnicianClick={(tech) => {
                        setSelectedTechnician(tech);
                        setShowDetails(true);
                      }}
                    />
                  ))}
                </div>
              )}
          </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .filter-tabs::-webkit-scrollbar { height: 0px; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .kpi-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
        @media (min-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)) !important; gap: 24px !important; }
        }
      `}</style>
      <TechnicianDetailsSheet
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        technician={selectedTechnician}
      />
    </div>
  );
}
