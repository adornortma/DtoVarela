'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Activity,
  ShieldCheck,
  Calendar as CalendarIcon
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import TechnicianDetailsSheet from '@/components/TechnicianDetailsSheet';
import WeatherIndicator from '@/components/WeatherIndicator';
import DailyResolutionCalendarModal from '@/components/DailyResolutionCalendarModal';

// --- Weather Data ---
const WEATHER_DATA: Record<string, Record<string, string[]>> = {
  'Abril': {
    's2': ['Lunes 06-04', 'Martes 07-04'],
    's3': ['Miércoles 15-04', 'Jueves 16-04'],
    's4': ['Martes 21-04']
  },
  'Mayo': {
    's2': ['Sábado 09-05']
  }
};

// --- Types ---
type KpiType = 'resolucion' | 'reiteros' | 'puntualidad' | 'productividad' | 'tiempo_operativo';
type ViewMode = 'semanal' | 'indicador';
type WeekKey = 's1' | 's2' | 's3' | 's4' | 's5' | 's6';
type CalendarMode = 'operativo' | 'mensual';

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
  s6?: MetricEntry;
}

interface CalendarWeekDef {
  key: WeekKey;
  start: Date;
  end: Date;
  label: string;
  isPartial: boolean;
  daysCount: number;
}

interface ItemRow {
  id?: string;
  name: string;
  dni?: string;
  metrics: Record<string, MetricData>;
  isCell: boolean;
  technicians?: ItemRow[];
  celula?: string;
  tempMonthly?: Record<string, number[]>;
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface KpiConfigItem {
    label: string;
    unit: string;
    targets: { green: number; yellow: number; reverse?: boolean };
}

const DEFAULT_KPI_CONFIG: Record<KpiType, KpiConfigItem> = {
  resolucion: { label: 'Resolución', unit: '%', targets: { green: 75, yellow: 70 } },
  reiteros: { label: 'Reiteros', unit: '%', targets: { green: 4.5, yellow: 5, reverse: true } },
  puntualidad: { label: 'Puntualidad', unit: '%', targets: { green: 80, yellow: 70 } },
  productividad: { label: 'Productividad', unit: '', targets: { green: 6, yellow: 5 } },
  tiempo_operativo: { label: 'Tiempo Operativo', unit: '%', targets: { green: 70, yellow: 60 } },
};

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
    green: { bg: 'rgba(34,197,94,0.18)', text: '#166534' }, 
    yellow: { bg: 'rgba(234,179,8,0.22)', text: '#854d0e' }, 
    red: { bg: 'rgba(239,68,68,0.18)', text: '#991b1b' }    
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

const getCalendarWeeksForMonth = (year: number, monthIndex: number): CalendarWeekDef[] => {
  const weeks: CalendarWeekDef[] = [];
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  
  let currentStart = new Date(firstDay);
  let weekIndex = 1;

  while (currentStart <= lastDay) {
    let currentEnd = new Date(currentStart);
    const dayOfWeek = currentEnd.getUTCDay();
    const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    currentEnd.setUTCDate(currentEnd.getUTCDate() + daysToSunday);
    
    if (currentEnd > lastDay) {
      currentEnd = new Date(lastDay);
    }
    
    const daysCount = Math.round((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const isPartial = daysCount < 7;
    
    const startDayStr = currentStart.getUTCDate().toString().padStart(2, '0');
    const startMonthStr = (currentStart.getUTCMonth() + 1).toString().padStart(2, '0');
    const endDayStr = currentEnd.getUTCDate().toString().padStart(2, '0');
    const endMonthStr = (currentEnd.getUTCMonth() + 1).toString().padStart(2, '0');
    
    const dayNames = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    const startName = dayNames[currentStart.getUTCDay()];
    const endName = dayNames[currentEnd.getUTCDay()];

    weeks.push({
      key: `s${weekIndex}` as WeekKey,
      start: new Date(currentStart),
      end: new Date(currentEnd),
      label: `SEMANA ${weekIndex} - ${startName} ${startDayStr}/${startMonthStr} - ${endName} ${endDayStr}/${endMonthStr}`,
      isPartial,
      daysCount
    });
    
    currentStart = new Date(currentEnd);
    currentStart.setUTCDate(currentStart.getUTCDate() + 1);
    weekIndex++;
  }
  
  return weeks;
};

const calculateAverage = (metrics: MetricData, calendarMode: CalendarMode = 'operativo', calendarWeeks: CalendarWeekDef[] = []): number | null => {
  if (!metrics) return null;
  const keys = calendarMode === 'operativo' 
      ? ['s1', 's2', 's3', 's4', 's5'] as WeekKey[]
      : calendarWeeks.map(w => w.key);
      
  const values = keys.map(k => metrics[k]?.value).filter(v => v !== null && v !== undefined) as number[];
  if (values.length === 0) return null;
  return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
};

const DistrictOverview = ({ config, districtData, lastUpdate, monthlyDistrictData, calendarMode, selectedMonth, onOpenCalendar }: { config: Record<KpiType, KpiConfigItem>, districtData: Record<KpiType, number> | null, lastUpdate: string | null, monthlyDistrictData: Record<KpiType, number> | null, calendarMode: CalendarMode, selectedMonth: string, onOpenCalendar?: () => void }) => {
  const formattedDate = lastUpdate ? new Date(lastUpdate).toLocaleString('es-AR') : 'Nunca';

  const stats = [
    { kpi: 'resolucion' as KpiType, value: calendarMode === 'operativo' ? (districtData?.resolucion ?? 0) : (monthlyDistrictData?.resolucion ?? 0) },
    { kpi: 'reiteros' as KpiType, value: calendarMode === 'operativo' ? (districtData?.reiteros ?? 0) : (monthlyDistrictData?.reiteros ?? 0) },
    { kpi: 'puntualidad' as KpiType, value: calendarMode === 'operativo' ? (districtData?.puntualidad ?? 0) : (monthlyDistrictData?.puntualidad ?? 0) },
    { kpi: 'productividad' as KpiType, value: calendarMode === 'operativo' ? (districtData?.productividad ?? 0) : (monthlyDistrictData?.productividad ?? 0) },
    { kpi: 'tiempo_operativo' as KpiType, value: calendarMode === 'operativo' ? (districtData?.tiempo_operativo ?? 0) : (monthlyDistrictData?.tiempo_operativo ?? 0) }
  ];

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '11px', fontWeight: '900', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
            Indicadores del distrito (última actualización: {formattedDate})
        </p>
      </div>
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {stats.map((stat) => {
          const colors = getStatusColors(stat.value, stat.kpi, config);
          const { label, unit } = config[stat.kpi];

          return (
            <div key={stat.kpi} className="kpi-card" style={{
              backgroundColor: colors.bg,
              padding: '16px 20px',
              borderRadius: '20px',
              border: `2px solid ${colors.text}44`,
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              position: 'relative'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: colors.text, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {label}
                  </span>
                  <div style={{ color: colors.text }}>
                    {stat.kpi === 'resolucion' && calendarMode === 'mensual' && onOpenCalendar && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onOpenCalendar(); }}
                        style={{ 
                          padding: '4px 8px', backgroundColor: 'transparent', color: colors.text, 
                          borderRadius: '8px', border: `1px solid ${colors.text}55`, 
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                          fontSize: '11px', fontWeight: '800'
                        }}
                      >
                        <CalendarIcon size={12} />
                        Calendario
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '36px', fontWeight: '950', color: colors.text, letterSpacing: '-1.5px', lineHeight: '1' }}>
                  {stat.kpi === 'productividad' ? stat.value.toFixed(2) : `${stat.value.toFixed(1)}${unit}`}
                </span>
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
  entry?: MetricEntry, 
  prevValue?: number | null, 
  kpi: KpiType, 
  unit: string, 
  config: Record<KpiType, KpiConfigItem>,
  isEditable?: boolean,
  onUpdate?: (newValue: number) => void
}) => {
  const [localValue, setLocalValue] = useState<string>(entry?.value !== null && entry?.value !== undefined ? entry.value.toString() : '');
  const [isFocused, setIsFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const colors = getStatusColors(entry?.value ?? null, kpi, config);
  
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(entry?.value !== null && entry?.value !== undefined ? entry.value.toString() : '');
    }
  }, [entry?.value, isFocused]);

  let trend = null;
  if (entry?.value !== null && entry?.value !== undefined && prevValue != null) {
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
    if (!isNaN(num) && num !== (entry?.value ?? null)) {
      setIsSaving(true);
      await onUpdate?.(num);
      setIsSaving(false);
    }
    setIsFocused(false);
  };

  return (
    <td style={{ padding: '2px' }}>
      <div style={{
        backgroundColor: colors.bg,
        borderRadius: '8px',
        height: '38px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: (entry?.value ?? null) !== null ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
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
                fontSize: '15px',
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
            {(entry?.value ?? null) !== null ? (kpi === 'productividad' ? `${entry!.value}` : `${entry!.value}${unit}`) : '-'}
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
  calendarMode,
  calendarWeeks,
  selectedMonth,
  onUpdateMetric,
  onTechnicianClick,
  onOpenCalendar,
  isVarela
}: { 
  row: ItemRow, 
  kpi: KpiType, 
  viewMode: ViewMode,
  selectedWeek: WeekKey,
  config: Record<KpiType, KpiConfigItem>,
  calendarMode: CalendarMode,
  calendarWeeks: CalendarWeekDef[],
  selectedMonth: string,
  onUpdateMetric: (techId: string, date: string, value: number, celula: string) => void,
  onTechnicianClick: (tech: ItemRow) => void,
  onOpenCalendar?: (celula: string) => void,
  isVarela: boolean
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const metrics = row.metrics[kpi];
  const unit = config[kpi].unit;
  
  const sortedTechnicians = [...(row.technicians || [])].sort((a, b) => {
    if (viewMode === 'semanal' && calendarMode === 'operativo') {
      const valA = calculateAverage(a.metrics[kpi], calendarMode, calendarWeeks) ?? -Infinity;
      const valB = calculateAverage(b.metrics[kpi], calendarMode, calendarWeeks) ?? -Infinity;
      if (config[kpi].targets.reverse) {
          return (valA === -Infinity ? 1 : (valB === -Infinity ? -1 : valA - valB));
      }
      return valB - valA;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="cell-group-container" style={{
        border: isExpanded ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(0,0,0,0.12)',
        borderRadius: '20px',
        marginBottom: '12px',
        overflow: 'hidden',
        backgroundColor: 'white',
        transition: 'all 0.2s ease',
        boxShadow: isExpanded ? '0 4px 12px rgba(0, 0, 0, 0.05)' : 'none',
    }}>
        <style jsx>{`
          .cell-group-container:hover {
            border-color: rgba(0,0,0,0.2);
            background-color: #fafafa;
          }
          .main-row:hover {
            background-color: #f8fafc !important;
          }
          .tech-row:hover {
            background-color: #f1f5f9 !important;
          }
        `}</style>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', textAlign: 'left', tableLayout: 'fixed' }}>
            <colgroup>
                <col style={{ width: '30%' }} />
                {viewMode === 'semanal' && calendarMode === 'operativo'
                    ? [0, 1, 2, 3, 4].map(i => <col key={i} style={{ width: '14%' }} />)
                    : [0, 1, 2, 3, 4].map(i => <col key={i} style={{ width: '14%' }} />)
                }
            </colgroup>
            <tbody>
                <tr 
                    className="main-row"
                    onClick={() => row.isCell && setIsExpanded(!isExpanded)}
                    style={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: isExpanded ? '#f8fafc' : 'transparent',
                        borderBottom: isExpanded ? '1px solid rgba(0,0,0,0.08)' : 'none'
                    }}
                >
                    <td style={{ 
                        padding: '8px 16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: '10px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      </div>
                      {calendarMode === 'mensual' && row.isCell && onOpenCalendar && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onOpenCalendar(row.name); }}
                          style={{ 
                            padding: '6px', backgroundColor: '#f1f5f9', color: '#475569', 
                            borderRadius: '8px', border: '1px solid #e2e8f0', 
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            transition: 'all 0.2s'
                          }}
                          title="Ver calendario"
                        >
                          <CalendarIcon size={14} />
                        </button>
                      )}
                    </td>
                    {viewMode === 'semanal' && calendarMode === 'operativo' ? (
                      <>
                        <MetricCard entry={metrics.s1} kpi={kpi} unit={unit} config={config} />
                        <MetricCard entry={metrics.s2} prevValue={metrics.s1.value} kpi={kpi} unit={unit} config={config} />
                        <MetricCard entry={metrics.s3} prevValue={metrics.s2.value} kpi={kpi} unit={unit} config={config} />
                        <MetricCard entry={metrics.s4} prevValue={metrics.s3.value} kpi={kpi} unit={unit} config={config} />
                        <MetricCard entry={metrics.s5} prevValue={metrics.s4.value} kpi={kpi} unit={unit} config={config} />
                      </>
                    ) : (
                      <>
                        <MetricCard entry={row.metrics.resolucion[calendarMode === 'mensual' ? 's1' : selectedWeek]} kpi="resolucion" unit={config.resolucion.unit} config={config} />
                        <MetricCard entry={row.metrics.reiteros[calendarMode === 'mensual' ? 's1' : selectedWeek]} kpi="reiteros" unit={config.reiteros.unit} config={config} />
                        <MetricCard 
                          entry={row.metrics.puntualidad[calendarMode === 'mensual' ? 's1' : selectedWeek]} 
                          kpi="puntualidad" 
                          unit={config.puntualidad.unit} 
                          config={config} 
                          isEditable={!isVarela}
                          onUpdate={(val) => onUpdateMetric('cell-metric', row.metrics.puntualidad[calendarMode === 'mensual' ? 's1' : selectedWeek]?.date || '', val, row.name)}
                        />
                        <MetricCard entry={row.metrics.productividad[calendarMode === 'mensual' ? 's1' : selectedWeek]} kpi="productividad" unit={config.productividad.unit} config={config} />
                        <MetricCard entry={row.metrics.tiempo_operativo[calendarMode === 'mensual' ? 's1' : selectedWeek]} kpi="tiempo_operativo" unit={config.tiempo_operativo.unit} config={config} />
                      </>
                    )}
                </tr>

                {isExpanded && sortedTechnicians.map((tech) => (
                    <tr 
                        key={tech.name} 
                        className="tech-row"
                        style={{ 
                            backgroundColor: '#f8fafc',
                            borderTop: '1px solid rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <td 
                          onClick={() => onTechnicianClick({ ...tech, celula: row.name })}
                          style={{ 
                            padding: '6px 16px 6px 60px', 
                            cursor: 'pointer'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
                                <div style={{ width: '4px', height: '4px', backgroundColor: '#94a3b8', borderRadius: '50%' }} />
                                <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: '700' }}>{tech.name}</span>
                            </div>
                        </td>
                        {viewMode === 'semanal' && calendarMode === 'operativo' ? (
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
                          (['resolucion', 'reiteros', 'puntualidad', 'productividad', 'tiempo_operativo'] as const).map((k) => {
                             const weekKey = calendarMode === 'mensual' ? 's1' : selectedWeek;
                             return (
                               <MetricCard 
                                 key={k}
                                 entry={tech.metrics[k][weekKey]} 
                                 kpi={k} 
                                 unit={config[k].unit} 
                                 config={config} 
                                 isEditable={k === 'puntualidad' && tech.id !== undefined}
                                 onUpdate={(val) => tech.id && onUpdateMetric(tech.id, tech.metrics[k][weekKey]?.date || '', val, row.name)}
                               />
                             );
                          })
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
};

export default function KpiResolucionDashboard({ districtSlug = 'varela' }: { districtSlug?: string }) {
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [districtName, setDistrictName] = useState<string>('Florencio Varela');
  
  const [viewMode, setViewMode] = useState<ViewMode>('indicador');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('mensual'); // Default to mensual as requested for Lanus and multi-district
  const [selectedWeek, setSelectedWeek] = useState<WeekKey>('s1');
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [visibleMonths, setVisibleMonths] = useState(
    MONTHS.slice(Math.max(0, new Date().getMonth() - 2), Math.max(0, new Date().getMonth() - 2) + 5)
  );
  const [selectedKpi, setSelectedKpi] = useState<KpiType>('resolucion');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [data, setData] = useState<ItemRow[]>([]);
  const [metricsRaw, setMetricsRaw] = useState<any[]>([]);
  const [cellTotalsRaw, setCellTotalsRaw] = useState<any[]>([]);
  const [monthlyMetricsRaw, setMonthlyMetricsRaw] = useState<any[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<ItemRow | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpiConfig, setKpiConfig] = useState<Record<KpiType, KpiConfigItem>>(DEFAULT_KPI_CONFIG);
  const [districtKPIs, setDistrictKPIs] = useState<any>(null);
  const [monthlyDistrictKPIs, setMonthlyDistrictKPIs] = useState<Record<KpiType, number> | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [nonOperativeCells, setNonOperativeCells] = useState<Set<string>>(new Set());
  
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarModalCelula, setCalendarModalCelula] = useState<string | null>(null);

  // Force calendarMode to 'mensual' for districts other than Varela
  const isVarela = districtSlug === 'varela';

  useEffect(() => {
    if (!isVarela) {
      setCalendarMode('mensual');
    } else {
      setCalendarMode('operativo'); // Varela defaults to weekly (operativo) view
    }
  }, [districtSlug, isVarela]);

  const calculateMonthlyDistrictKPIs = (monthlyMetrics: any[], nonOpSet: Set<string> = new Set()) => {
      if (!monthlyMetrics || monthlyMetrics.length === 0) return null;

      const kpis: KpiType[] = ['resolucion', 'reiteros', 'puntualidad', 'productividad', 'tiempo_operativo'];
      const result: Record<KpiType, number> = { resolucion: 0, reiteros: 0, puntualidad: 0, productividad: 0, tiempo_operativo: 0 };
      const expectedDistrictCelulaName = districtSlug === 'varela' ? 'DISTRITO' : `DISTRITO_${districtSlug.toUpperCase()}`;
      const distritoRecord = monthlyMetrics.find(m => m.celula === expectedDistrictCelulaName && m.tecnico_id === null);

      if (distritoRecord) {
          kpis.forEach(kpi => {
             result[kpi] = distritoRecord[kpi] !== null && distritoRecord[kpi] !== undefined ? parseFloat(Number(distritoRecord[kpi]).toFixed(1)) : 0;
          });
          return result;
      }
      
      const cellTotals = monthlyMetrics.filter(m => m.tecnico_id === null && m.celula !== expectedDistrictCelulaName && !nonOpSet.has((m.celula || '').toUpperCase().trim()));
      const dataToAverage = cellTotals.length > 0 ? cellTotals : monthlyMetrics.filter(m => !nonOpSet.has((m.celula || '').toUpperCase().trim()));

      kpis.forEach(kpi => {
          const vals = dataToAverage.map(m => m[kpi]).filter(v => v !== null && v !== undefined);
          if (vals.length > 0) {
              result[kpi] = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
          } else {
              result[kpi] = 0;
          }
      });
      return result;
  };

  useEffect(() => {
    const saved = localStorage.getItem('bp_session');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing session');
      }
    }
  }, []);

  const handleMonthSelect = (month: string) => {
    setSelectedMonth(month);
    setIsDropdownOpen(false);
    if (!visibleMonths.includes(month)) {
      const newVisible = [...visibleMonths];
      newVisible[3] = month; 
      setVisibleMonths(newVisible);
    }
  };

  // Fetch District details and Config
  useEffect(() => {
    const fetchConfig = async () => {
        // Resolve district slug to ID and name
        const { data: distRec } = await supabase
            .from('distritos')
            .select('*')
            .eq('slug', districtSlug)
            .maybeSingle();

        if (distRec) {
          setDistrictId(distRec.id);
          setDistrictName(distRec.nombre);
        } else {
          return; // Wait for district resolution
        }

        const currentDistrictId = distRec.id;

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
          
          if (newConfig.reiteros.targets.green === 4) {
             newConfig.reiteros.targets.green = 4.5;
          }

          setKpiConfig(newConfig);
        }

        // Fetch non-operative cells for this specific district
        const { data: cellRecords } = await supabase
            .from('celulas')
            .select('nombre, operativa')
            .eq('distrito_id', currentDistrictId);
        if (cellRecords) {
            const nonOp = new Set(
                cellRecords
                    .filter((c: any) => c.operativa === false)
                    .map((c: any) => c.nombre.trim().toUpperCase())
            );
            setNonOperativeCells(nonOp);
        }

        // Fetch District KPIs (most recent row) for this specific district
        const { data: distData } = await supabase
            .from('indicadores_distrito')
            .select('*')
            .eq('distrito_id', currentDistrictId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (distData) {
            setDistrictKPIs(distData);
            setLastUpdate(distData.updated_at);
        } else {
            setDistrictKPIs(null);
            setLastUpdate(null);
        }

        // Auto-select latest month with data for this specific district
        const { data: lastMetric } = await supabase
          .from('metricas')
          .select('fecha')
          .eq('distrito_id', currentDistrictId)
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const { data: allMonthly } = await supabase
          .from('metricas_mensuales')
          .select('mes')
          .eq('distrito_id', currentDistrictId);
        
        let lastMonthlyMonth = null;
        if (allMonthly && allMonthly.length > 0) {
          const unique = Array.from(new Set(allMonthly.map(m => m.mes)));
          lastMonthlyMonth = unique.reduce((a, b) => MONTHS.indexOf(a) > MONTHS.indexOf(b) ? a : b);
        }

        if (lastMetric || lastMonthlyMonth) {
          let date;
          let monthName;
          
          if (calendarMode === 'operativo' && lastMetric) {
            date = new Date(lastMetric.fecha);
            monthName = MONTHS[date.getUTCMonth()];
          } else if (calendarMode === 'mensual' && lastMonthlyMonth) {
            monthName = lastMonthlyMonth;
          } else if (lastMetric) {
            date = new Date(lastMetric.fecha);
            monthName = MONTHS[date.getUTCMonth()];
          } else {
            monthName = lastMonthlyMonth || selectedMonth;
          }

          if (monthName && MONTHS.includes(monthName)) {
            setSelectedMonth(monthName);
            if (lastMetric && MONTHS[new Date(lastMetric.fecha).getUTCMonth()] === monthName) {
              setSelectedWeek(getWeekOfDate(new Date(lastMetric.fecha)));
            }
            
            const monthIdx = MONTHS.indexOf(monthName);
            setVisibleMonths(MONTHS.slice(Math.max(0, monthIdx - 2), Math.max(0, monthIdx - 2) + 5));
          }
        }
    };
    fetchConfig();
  }, [districtSlug]);

  const fetchData = async () => {
    if (!districtId) return;
    setLoading(true);
    setData([]);
    setMetricsRaw([]);
    setCellTotalsRaw([]);
    setMonthlyMetricsRaw([]);
    setDistrictKPIs(null);
    setMonthlyDistrictKPIs(null);
    
    const monthIndex = MONTHS.indexOf(selectedMonth);
    const year = new Date().getFullYear();
    const startMonth = (monthIndex + 1).toString().padStart(2, '0');
    const startDate = `${year}-${startMonth}-01`;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const endDate = `${year}-${startMonth}-${lastDay.toString().padStart(2, '0')}`;

    const { data: dbMetrics, error } = await supabase
      .from('metricas')
      .select(`
        *,
        tecnicos (
          id,
          dni,
          nombre,
          apellido
        )
      `)
      .eq('distrito_id', districtId)
      .gte('fecha', startDate)
      .lte('fecha', endDate);

    const metrics = dbMetrics || [];

    const { data: dbCellTotals } = await supabase
      .from('metricas_celula')
      .select('*')
      .eq('distrito_id', districtId)
      .gte('fecha', startDate)
      .lte('fecha', endDate);

    const cellTotals = dbCellTotals || [];

    const { data: dbMonthly } = await supabase
      .from('metricas_mensuales')
      .select(`
        *,
        tecnicos (
          id,
          dni,
          nombre,
          apellido
        )
      `)
      .eq('distrito_id', districtId)
      .eq('mes', selectedMonth);
      
    const monthlyMetrics = dbMonthly || [];

    if (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
      return;
    }
    
    // Fetch non-operative cells for calculation filtering
    const { data: cellRecords } = await supabase
        .from('celulas')
        .select('nombre, operativa')
        .eq('distrito_id', districtId);
    const nonOp = new Set(
        (cellRecords || [])
            .filter((c: any) => c.operativa === false)
            .map((c: any) => c.nombre.trim().toUpperCase())
    );
    setNonOperativeCells(nonOp);

    setMetricsRaw(metrics);
    setCellTotalsRaw(cellTotals);
    setMonthlyMetricsRaw(monthlyMetrics);
    
    setMonthlyDistrictKPIs(calculateMonthlyDistrictKPIs(monthlyMetrics, nonOp));
    setData(processData(metrics, cellTotals, monthlyMetrics, monthIndex, year, calendarMode, nonOp));

    // Fetch District KPIs (most recent row) for this specific district to avoid losing cards on re-fetch
    const { data: distData } = await supabase
        .from('indicadores_distrito')
        .select('*')
        .eq('distrito_id', districtId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    if (distData) {
        setDistrictKPIs(distData);
        setLastUpdate(distData.updated_at);
    } else {
        setDistrictKPIs(null);
        setLastUpdate(null);
    }

    const allDates = [...metrics.map(m => m.fecha), ...cellTotals.map(ct => ct.fecha)];
    if (allDates.length > 0) {
      const lastDateStr = allDates.reduce((max, d) => d > max ? d : max, allDates[0]);
      setSelectedWeek(getWeekOfDate(new Date(lastDateStr)));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, districtId, calendarMode]);

  useEffect(() => {
    if (metricsRaw.length > 0 || monthlyMetricsRaw.length > 0) {
      setData(processData(metricsRaw, cellTotalsRaw, monthlyMetricsRaw, MONTHS.indexOf(selectedMonth), new Date().getFullYear(), calendarMode, nonOperativeCells));
    }
  }, [calendarMode]);

  const processData = (metrics: any[], cellTotals: any[], monthlyMetrics: any[], month: number, year: number, mode: CalendarMode, nonOpSet: Set<string> = new Set()) => {
    const cellMap: Record<string, ItemRow> = {};

    const createEmptyMetricData = (m: number, y: number): MetricData => {
      return {
        s1: { value: null, date: new Date(Date.UTC(y, m, 1)).toISOString().split('T')[0] },
        s2: { value: null, date: new Date(Date.UTC(y, m, 8)).toISOString().split('T')[0] },
        s3: { value: null, date: new Date(Date.UTC(y, m, 15)).toISOString().split('T')[0] },
        s4: { value: null, date: new Date(Date.UTC(y, m, 22)).toISOString().split('T')[0] },
        s5: { value: null, date: new Date(Date.UTC(y, m, 29)).toISOString().split('T')[0] },
        s6: { value: null, date: new Date(Date.UTC(y, m, 31)).toISOString().split('T')[0] },
      };
    };

    if (mode === 'mensual') {
       monthlyMetrics.forEach(mm => {
          const cellName = (mm.celula || "DISTRITO").toUpperCase().replace(/_/g, ' ').trim();
          if (!cellMap[cellName]) {
             cellMap[cellName] = {
               name: cellName,
               isCell: true,
               metrics: {
                 resolucion: createEmptyMetricData(month, year),
                 reiteros: createEmptyMetricData(month, year),
                 puntualidad: createEmptyMetricData(month, year),
                 productividad: createEmptyMetricData(month, year),
                 tiempo_operativo: createEmptyMetricData(month, year),
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
          
          if (!mm.tecnico_id) {
            cell.metrics.resolucion['s1'].value = mm.resolucion;
            cell.metrics.reiteros['s1'].value = mm.reiteros;
            cell.metrics.puntualidad['s1'].value = mm.puntualidad;
            cell.metrics.productividad['s1'].value = mm.productividad;
            cell.metrics.tiempo_operativo['s1'].value = mm.tiempo_operativo;
          } else {
            const techId = mm.tecnico_id;
            const techName = mm.tecnicos ? `${mm.tecnicos.apellido}, ${mm.tecnicos.nombre}` : 'Desconocido';
            let tech = cell.technicians?.find((t: any) => t.id === techId);
            if (!tech) {
              tech = {
                id: techId,
                name: techName,
                dni: mm.tecnicos?.dni,
                isCell: false,
                metrics: {
                  resolucion: createEmptyMetricData(month, year),
                  reiteros: createEmptyMetricData(month, year),
                  puntualidad: createEmptyMetricData(month, year),
                  productividad: createEmptyMetricData(month, year),
                  tiempo_operativo: createEmptyMetricData(month, year),
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
            tech.metrics.resolucion['s1'] = { value: mm.resolucion ?? null, id: mm.id, date: mm.mes };
            tech.metrics.reiteros['s1'] = { value: mm.reiteros ?? null, id: mm.id, date: mm.mes };
            tech.metrics.puntualidad['s1'] = { value: mm.puntualidad ?? null, id: mm.id, date: mm.mes };
            tech.metrics.productividad['s1'] = { value: mm.productividad ?? null, id: mm.id, date: mm.mes };
            tech.metrics.tiempo_operativo['s1'] = { value: mm.tiempo_operativo ?? null, id: mm.id, date: mm.mes };
          }
       });
       
       return Object.values(cellMap).filter(cell => !nonOpSet.has(cell.name)).sort((a, b) => a.name.localeCompare(b.name));
    }

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
            tiempo_operativo: createEmptyMetricData(month, year),
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
          dni: m.tecnicos?.dni,
          isCell: false,
          metrics: {
            resolucion: createEmptyMetricData(month, year),
            reiteros: createEmptyMetricData(month, year),
            puntualidad: createEmptyMetricData(month, year),
            productividad: createEmptyMetricData(month, year),
            tiempo_operativo: createEmptyMetricData(month, year),
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
      tech.metrics.tiempo_operativo[week] = { value: m.tiempo_operativo ?? null, id: m.id, date: m.fecha };
      tech.metrics.inicio[week] = { value: m.inicio ?? null, id: m.id, date: m.fecha };
      tech.metrics.ok1[week] = { value: m.ok1 ?? null, id: m.id, date: m.fecha };
      tech.metrics.completadas[week] = { value: m.completadas ?? null, id: m.id, date: m.fecha };
      tech.metrics.no_encontrados[week] = { value: m.no_encontrados ?? null, id: m.id, date: m.fecha };
      tech.metrics.deriva_bajadas[week] = { value: m.deriva_bajadas ?? null, id: m.id, date: m.fecha };
      tech.metrics.cierres[week] = { value: m.cierres ?? null, id: m.id, date: m.fecha };
    });

    cellTotals.forEach(ct => {
      const cellName = (ct.celula || "DISTRITO").toUpperCase().replace(/_/g, ' ').trim();
      const dateStr = ct.fecha.includes('T') ? ct.fecha : `${ct.fecha}T00:00:00Z`;
      const week = getWeekOfDate(new Date(dateStr));
      if (!cellMap[cellName]) {
        cellMap[cellName] = {
          name: cellName,
          isCell: true,
          metrics: {
            resolucion: createEmptyMetricData(month, year),
            reiteros: createEmptyMetricData(month, year),
            puntualidad: createEmptyMetricData(month, year),
            productividad: createEmptyMetricData(month, year),
            tiempo_operativo: createEmptyMetricData(month, year),
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
      cell.metrics.tiempo_operativo[week] = { value: ct.tiempo_operativo, id: ct.id, date: ct.fecha };
    });

    Object.values(cellMap).forEach(cell => {
        const kpisToAverage = ['reiteros', 'resolucion', 'puntualidad', 'productividad', 'tiempo_operativo', 'inicio', 'ok1', 'completadas', 'no_encontrados', 'deriva_bajadas', 'cierres'];
        
        kpisToAverage.forEach(kpi => {
            (['s1', 's2', 's3', 's4', 's5', 's6'] as const).forEach(week => {
                if (cell.metrics[kpi][week] && cell.metrics[kpi][week].value === null) {
                  const techValues = cell.technicians?.map(t => t.metrics[kpi][week]?.value).filter(v => v !== null && v !== undefined) as number[];
                  if (techValues.length > 0) {
                      cell.metrics[kpi][week].value = parseFloat((techValues.reduce((a, b) => a + b, 0) / techValues.length).toFixed(1));
                  }
                }
            });
        });
    });

    return Object.values(cellMap).filter(cell => !nonOpSet.has(cell.name)).sort((a, b) => a.name.localeCompare(b.name));
  };

  const updatePuntualidad = async (techId: string, date: string, value: number, celula: string) => {
    if (!districtId) return;
    try {
      if (techId === 'cell-metric') {
        const { data: existing } = await supabase
          .from('metricas_mensuales')
          .select('id')
          .eq('celula', celula)
          .eq('mes', selectedMonth)
          .eq('distrito_id', districtId)
          .is('tecnico_id', null)
          .maybeSingle();

        if (existing) {
          await supabase.from('metricas_mensuales').update({ puntualidad: value }).eq('id', existing.id);
        } else {
          await supabase.from('metricas_mensuales').insert({
            celula: celula,
            mes: selectedMonth,
            puntualidad: value,
            distrito_id: districtId
          });
        }
      } else {
        if (techId.startsWith('mock-')) return;
        const { data: existing } = await supabase.from('metricas').select('id').eq('tecnico_id', techId).eq('fecha', date).maybeSingle();
        if (existing) {
          await supabase.from('metricas').update({ puntualidad: value }).eq('id', existing.id);
        } else {
          await supabase.from('metricas').insert({ 
            tecnico_id: techId, 
            fecha: date, 
            celula: celula, 
            puntualidad: value, 
            resolucion: 0, 
            reitero: 0, 
            productividad: 0,
            distrito_id: districtId
          });
        }
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
  const calendarWeeks = getCalendarWeeksForMonth(currentYear, currentMonthIdx);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '16px 40px 32px 40px', width: '100%' }}>
      <header style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '16px', color: 'white', boxShadow: '0 8px 12px -3px rgba(0, 0, 0, 0.2)' }}>
                <TrendingUp size={24} strokeWidth={2.5} />
            </div>
            <div>
                <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.2px', lineHeight: '1' }}>
                  KPIs Resolución - {districtName}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '700' }}>
                      {calendarMode === 'operativo' ? 'Fuente: Persa/incentivos - PBI Productividad' : `${selectedMonth} (corte calendario)`}
                  </p>
                  {calendarMode === 'mensual' && (
                    <span style={{ backgroundColor: '#e2e8f0', color: '#475569', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Datos del mes completo</span>
                  )}
                </div>
            </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isVarela && (
            <Link 
              href="/detalle-diario"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 20px', 
                backgroundColor: '#1e293b', 
                color: 'white', 
                borderRadius: '16px', 
                fontSize: '13px', 
                fontWeight: '800',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
            >
              <Activity size={16} />
              Ver Detalle Diario
            </Link>
          )}
          {user?.usuario?.trim().toUpperCase() === 'ADORNO' && (
            <Link 
              href="/auditoria"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 20px', 
                backgroundColor: '#019df4', 
                color: 'white', 
                borderRadius: '16px', 
                fontSize: '13px', 
                fontWeight: '800',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
            >
              <ShieldCheck size={16} />
              Auditoría Global
            </Link>
          )}
          <div style={{ display: 'flex', gap: '12px', padding: '8px 16px', backgroundColor: 'white', borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: 'var(--card-shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--movistar-blue)' }}></div>
                <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{selectedMonth}</span>
              </div>
              <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0' }}></div>
              <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--movistar-blue)' }}>{kpiConfig[selectedKpi].label}</span>
          </div>
        </div>
      </header>

      <section style={{ marginBottom: '20px' }}>
        <DistrictOverview 
          config={kpiConfig} 
          districtData={districtKPIs} 
          lastUpdate={lastUpdate} 
          monthlyDistrictData={monthlyDistrictKPIs} 
          calendarMode={calendarMode} 
          selectedMonth={selectedMonth}
          onOpenCalendar={isVarela ? (() => {
            setCalendarModalCelula(null);
            setCalendarModalOpen(true);
          }) : undefined}
        />
      </section>

      <section style={{ marginBottom: '40px', position: 'relative', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {calendarMode === 'mensual' && (
               <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Mes seleccionado
               </span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: calendarMode === 'mensual' ? '12px' : '8px' }}>
              {visibleMonths.map(month => {
                const monthRainyDays = WEATHER_DATA[month] ? Object.values(WEATHER_DATA[month]).flat() : [];
                const hasRain = calendarMode === 'mensual' && monthRainyDays.length > 0;
                
                return (
                <button 
                  key={month} 
                  onClick={() => handleMonthSelect(month)} 
                  style={{ 
                    position: 'relative',
                    padding: calendarMode === 'mensual' ? `12px ${hasRain ? '48px' : '24px'} 12px 24px` : '8px 16px', 
                    borderRadius: '12px', 
                    fontSize: calendarMode === 'mensual' ? '15px' : '13px', 
                    fontWeight: selectedMonth === month ? '900' : '700', 
                    backgroundColor: selectedMonth === month ? 'var(--movistar-blue)' : (calendarMode === 'mensual' ? '#e2e8f0' : '#f1f5f9'), 
                    color: selectedMonth === month ? 'white' : (calendarMode === 'mensual' ? '#1e293b' : '#475569'), 
                    transition: 'all 0.2s ease', 
                    border: selectedMonth === month && calendarMode === 'mensual' ? '1px solid rgba(0,0,0,0.1)' : '1px solid transparent',
                    cursor: 'pointer', 
                    boxShadow: selectedMonth === month ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {hasRain && (
                     <div style={{ transform: 'scale(0.8)', position: 'absolute', top: '1px', right: '-4px' }}>
                       <WeatherIndicator days={monthRainyDays} />
                     </div>
                  )}
                  {calendarMode === 'mensual' ? `📅 ${month}` : month}
                </button>
              )})}
            
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{ 
                  padding: calendarMode === 'mensual' ? '12px 24px' : '8px 16px', 
                  borderRadius: '12px', 
                  fontSize: calendarMode === 'mensual' ? '15px' : '13px', 
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
          </div>

          {/* Render Vista Switch only for Varela */}
          {isVarela && (
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
                  onClick={async () => {
                    setCalendarMode('mensual');
                    setViewMode('semanal');
                    
                    const { data: hasData } = await supabase.from('metricas_mensuales').select('id').eq('mes', selectedMonth).limit(1).maybeSingle();
                    if (!hasData) {
                      const { data: allM } = await supabase.from('metricas_mensuales').select('mes');
                      if (allM && allM.length > 0) {
                        const unique = Array.from(new Set(allM.map(m => m.mes)));
                        const latest = unique.reduce((a, b) => MONTHS.indexOf(a) > MONTHS.indexOf(b) ? a : b);
                        handleMonthSelect(latest);
                      }
                    }
                  }}
                  style={{ 
                    padding: '8px 20px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: '900', 
                    backgroundColor: calendarMode === 'mensual' ? 'white' : 'transparent', 
                    color: calendarMode === 'mensual' ? '#0f172a' : '#f1f5f9', 
                    boxShadow: calendarMode === 'mensual' ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: 'none'
                  }}
                >
                  <CalendarIcon size={15} />
                  Mensual
                </button>
                <button 
                  onClick={async () => {
                    setCalendarMode('operativo');
                    setViewMode('semanal');
                    
                    const monthIdx = MONTHS.indexOf(selectedMonth);
                    const year = new Date().getFullYear();
                    const startMonth = (monthIdx + 1).toString().padStart(2, '0');
                    const start = `${year}-${startMonth}-01`;
                    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
                    const end = `${year}-${startMonth}-${lastDay.toString().padStart(2, '0')}`;
                    
                    const { data: hasData } = await supabase.from('metricas').select('id').gte('fecha', start).lte('fecha', end).limit(1).maybeSingle();
                    if (!hasData) {
                      const { data: latest } = await supabase.from('metricas').select('fecha').order('fecha', { ascending: false }).limit(1).maybeSingle();
                      if (latest) {
                        const latestMonth = MONTHS[new Date(latest.fecha).getUTCMonth()];
                        handleMonthSelect(latestMonth);
                        setSelectedWeek(getWeekOfDate(new Date(latest.fecha)));
                      }
                    }
                  }}
                  style={{ 
                    padding: '8px 20px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: '900', 
                    backgroundColor: (calendarMode === 'operativo' && viewMode === 'semanal') ? 'white' : 'transparent', 
                    color: (calendarMode === 'operativo' && viewMode === 'semanal') ? '#0f172a' : '#f1f5f9', 
                    boxShadow: (calendarMode === 'operativo' && viewMode === 'semanal') ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
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
                  onClick={async () => {
                    setCalendarMode('operativo');
                    setViewMode('indicador');
                    
                    const monthIdx = MONTHS.indexOf(selectedMonth);
                    const year = new Date().getFullYear();
                    const startMonth = (monthIdx + 1).toString().padStart(2, '0');
                    const start = `${year}-${startMonth}-01`;
                    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
                    const end = `${year}-${startMonth}-${lastDay.toString().padStart(2, '0')}`;
                    
                    const { data: hasData } = await supabase
                      .from('metricas')
                      .select('id')
                      .gte('fecha', start)
                      .lte('fecha', end)
                      .limit(1)
                      .maybeSingle();

                    if (!hasData) {
                      const { data: latest } = await supabase
                        .from('metricas')
                        .select('fecha')
                        .not('resolucion', 'is', null)
                        .order('fecha', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                      if (latest) {
                        const latestMonth = MONTHS[new Date(latest.fecha).getUTCMonth()];
                        handleMonthSelect(latestMonth);
                        setSelectedWeek(getWeekOfDate(new Date(latest.fecha)));
                      }
                    }
                  }}
                  style={{ 
                    padding: '8px 20px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: '900', 
                    backgroundColor: (calendarMode === 'operativo' && viewMode === 'indicador') ? 'white' : 'transparent', 
                    color: (calendarMode === 'operativo' && viewMode === 'indicador') ? '#0f172a' : '#f1f5f9', 
                    boxShadow: (calendarMode === 'operativo' && viewMode === 'indicador') ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
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
          )}

        </div>
      </section>

      {calendarMode === 'operativo' && isVarela && (
      <section style={{ marginBottom: '24px', position: 'relative', zIndex: 100 }}>
        <div className="filter-tabs" style={{ display: 'flex', gap: '10px', overflow: 'visible', paddingBottom: '8px', paddingTop: '2px', paddingLeft: '4px', paddingRight: '4px' }}>
          {viewMode === 'semanal' ? (
            (Object.keys(kpiConfig) as KpiType[]).map(kpi => {
              const isActive = selectedKpi === kpi;
              return (
                  <button 
                    key={kpi} 
                    onClick={() => setSelectedKpi(kpi)} 
                    style={{ 
                      minWidth: '160px', 
                      flexShrink: 0, 
                      padding: '10px 16px', 
                      borderRadius: '14px', 
                      backgroundColor: isActive ? '#f8fbfc' : '#f1f5f9', 
                      border: isActive ? '3px solid #1e293b' : '3px solid #cbd5e1', 
                      transition: 'all 0.2s ease', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      cursor: 'pointer', 
                      boxShadow: isActive ? '0 10px 15px -3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)', 
                      transform: isActive ? 'translateY(-1px)' : 'none' 
                    }}
                  >
                    <div style={{ color: isActive ? '#1e293b' : '#64748b' }}><BarChart3 size={18} /></div>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: isActive ? '#1e293b' : '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{kpiConfig[kpi].label}</span>
                  </button>
              )
            })
          ) : (
            (calendarMode === 'operativo' ? (['s1', 's2', 's3', 's4', 's5'] as WeekKey[]) : calendarWeeks.map(w => w.key as WeekKey)).map((week, idx) => {
              const isActive = selectedWeek === week;
              let label, subLabel;
              if (calendarMode === 'operativo') {
                label = weekLabels[idx]?.split(' - ')[0] || ''; 
                subLabel = weekLabels[idx]?.split(' - ')[1] || ''; 
              } else {
                label = calendarWeeks[idx].label;
                subLabel = calendarWeeks[idx].isPartial ? `Parcial (${calendarWeeks[idx].daysCount} días)` : 'Semana completa';
              }
              return (
                  <button 
                    key={week} 
                    onClick={() => setSelectedWeek(week)} 
                    style={{ 
                      minWidth: '160px', 
                      flexShrink: 0, 
                      padding: '10px 16px', 
                      borderRadius: '14px', 
                      backgroundColor: isActive ? '#f8fbfc' : '#f1f5f9', 
                      border: isActive ? '3px solid #1e293b' : '3px solid #cbd5e1', 
                      transition: 'all 0.2s ease', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'flex-start', 
                      gap: '2px', 
                      cursor: 'pointer', 
                      boxShadow: isActive ? '0 10px 15px -3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)', 
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
      )}

      <div style={{ 
        width: '100%', 
        backgroundColor: 'white', 
        borderRadius: '24px', 
        padding: '0 20px 20px 20px', 
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', 
        border: '1px solid rgba(0,0,0,0.12)',
        maxHeight: 'calc(100vh - 220px)',
        overflowY: 'auto',
        overflowX: 'auto',
        position: 'relative'
      }}>
          <div style={{ minWidth: '950px' }}>
              {!loading && data.length > 0 && (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white', borderBottom: '2px solid rgba(0,0,0,0.1)', margin: '0 -20px 12px -20px', padding: '20px 20px 12px 20px' }}>
                  <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                    <colgroup>
                        <col style={{ width: '30%' }} />
                        {viewMode === 'semanal' && calendarMode === 'operativo'
                            ? [0, 1, 2, 3, 4].map(i => <col key={i} style={{ width: '14%' }} />)
                            : [0, 1, 2, 3, 4].map(i => <col key={i} style={{ width: '14%' }} />)
                        }
                    </colgroup>
                    <thead>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: '8px 16px' }}></th>
                            {viewMode === 'semanal' && calendarMode === 'operativo' ? (
                                weekLabels.map(label => (
                                  <th key={label} style={{ padding: '8px 2px', fontSize: '10px', fontWeight: '900', color: 'rgba(0,0,0,0.8)', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '1px' }}>{label}</th>
                                ))
                            ) : (
                              (Object.keys(kpiConfig) as KpiType[]).map(k => (
                                <th key={k} style={{ padding: '8px 2px', fontSize: '10px', fontWeight: '900', color: 'rgba(0,0,0,0.8)', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '1px' }}>{kpiConfig[k].label}</th>
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
                  {data.filter(row => !row.name.startsWith('DISTRITO')).map((row) => (
                    <CellGroup 
                      key={row.name} 
                      row={row} 
                      kpi={selectedKpi} 
                      viewMode={viewMode}
                      selectedWeek={selectedWeek}
                      config={kpiConfig} 
                      onUpdateMetric={updatePuntualidad}
                      calendarMode={calendarMode}
                      calendarWeeks={calendarWeeks}
                      selectedMonth={selectedMonth}
                      onTechnicianClick={(tech) => {
                        setSelectedTechnician(tech);
                        setShowDetails(true);
                      }}
                      onOpenCalendar={isVarela ? ((celula) => {
                        setCalendarModalCelula(celula);
                        setCalendarModalOpen(true);
                      }) : undefined}
                      isVarela={isVarela}
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
        @media (min-width: 1024px) {
          .kpi-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 24px !important; }
        }
      `}</style>
      <TechnicianDetailsSheet
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        technician={selectedTechnician}
      />
      <DailyResolutionCalendarModal 
        isOpen={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        month={selectedMonth}
        celula={calendarModalCelula}
      />
    </div>
  );
}
