'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity,
  ArrowRight,
  Search,
  LayoutDashboard,
  MapPin,
  User,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// --- Types ---
interface Actuacion {
  id: string;
  tx_celula: string;
  fecha_cita: string;
  estado: string;
  recurso: string;
  resolucion: string;
}

interface TechDailyStats {
  name: string;
  cumplidas: number;
  noRealizadas: number;
  suspendidas: number;
  total: number;
  resolucionPorcentaje: number;
  actuaciones: Actuacion[];
}

interface CellDailyGroup {
  name: string;
  cumplidas: number;
  noRealizadas: number;
  suspendidas: number;
  total: number;
  resolucionPorcentaje: number;
  technicians: TechDailyStats[];
}

// --- Utils ---
const getStatusBadge = (estado: string) => {
  const e = estado.toUpperCase();
  if (e === 'CUMPLIDA') return { color: '#059669', bg: 'rgba(34, 197, 94, 0.15)', icon: CheckCircle2, label: 'Cumplida' };
  if (e === 'NO_REALIZADA') return { color: '#DC2626', bg: 'rgba(220, 38, 38, 0.15)', icon: XCircle, label: 'No realizada' };
  if (e === 'SUSPENDIDA') return { color: '#D97706', bg: 'rgba(217, 119, 6, 0.15)', icon: Clock, label: 'Suspendida' };
  return { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.15)', icon: Activity, label: estado };
};

const getSemaforo = (value: number) => {
  if (value >= 75) return { color: '#166534', bg: 'rgba(34, 197, 94, 0.18)' };
  if (value >= 70) return { color: '#854d0e', bg: 'rgba(234, 179, 8, 0.22)' };
  return { color: '#991b1b', bg: 'rgba(239, 68, 68, 0.18)' };
};

const formatDateLong = (dateStr: string) => {
  try {
    const d = new Date(dateStr + 'T12:00:00'); // Use mid-day to avoid timezone shifting
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayName = days[d.getDay()];
    const dayNum = d.getDate().toString().padStart(2, '0');
    const monthNum = (d.getMonth() + 1).toString().padStart(2, '0');
    return {
      full: `${dayName} ${dayNum}/${monthNum}`,
      monthName: months[d.getMonth()],
      dayOfWeek: dayName,
      short: `${dayNum}/${monthNum}`
    };
  } catch (e) {
    return { full: dateStr, monthName: '', dayOfWeek: '', short: '' };
  }
};

// --- Components ---
const AnalysisDrawer = ({ 
  isOpen, 
  onClose, 
  cellName, 
  date, 
  actuaciones 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  cellName: string, 
  date: string,
  actuaciones: Actuacion[]
}) => {
  const analysis = useMemo(() => {
    if (!actuaciones.length) return null;

    const process = (items: Actuacion[]) => {
      const counts: Record<string, number> = {};
      items.forEach(a => {
        const text = (a.resolucion || 'Sin detalle').trim().toLowerCase();
        counts[text] = (counts[text] || 0) + 1;
      });

      const total = items.length;
      const sorted = Object.entries(counts)
        .map(([text, count]) => ({ 
          text: text.charAt(0).toUpperCase() + text.slice(1), 
          count,
          percentage: (count / total) * 100 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const top = sorted[0];
      const insight = top ? `Principal motivo: ${top.text} (${top.percentage.toFixed(0)}%)` : '';

      return { sorted, total, insight, max: sorted[0]?.count || 1 };
    };

    const resueltas = process(actuaciones.filter(a => a.estado.toUpperCase() === 'CUMPLIDA'));
    const noResueltas = process(actuaciones.filter(a => ['NO_REALIZADA', 'SUSPENDIDA'].includes(a.estado.toUpperCase())));

    return { resueltas, noResueltas };
  }, [actuaciones]);

  if (!analysis) return null;

  return (
    <>
      <div 
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
          zIndex: 6000, opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease'
        }}
      />
      <div style={{
        position: 'fixed', 
        top: isOpen ? '5vh' : '100vh',
        right: '24px',
        width: 'calc(100% - 48px)',
        maxWidth: '450px', 
        maxHeight: '90vh',
        backgroundColor: 'white', 
        borderRadius: '32px',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
        zIndex: 6001, 
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header - Fixed */}
        <div style={{ padding: '32px 24px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, position: 'relative' }}>
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '24px', right: '24px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}
          >
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ backgroundColor: '#0ea5e9', padding: '10px', borderRadius: '14px', color: 'white' }}>
              <Activity size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px' }}>Motivos de resolución</h2>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                {cellName} • {date}
              </div>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* Bloque 1: Resueltas */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
              <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resueltas (OK)</h3>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginLeft: 'auto' }}>{analysis.resueltas.total} actuaciones</span>
            </div>
            
            {analysis.resueltas.insight && (
              <div style={{ backgroundColor: '#f0fdf4', padding: '12px 16px', borderRadius: '12px', border: '1px solid #dcfce7', marginBottom: '20px', fontSize: '13px', fontWeight: '800', color: '#166534' }}>
                💡 {analysis.resueltas.insight}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {analysis.resueltas.sorted.map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: '700' }}>
                    <span style={{ color: '#1e293b' }}>{item.text}</span>
                    <span style={{ color: '#64748b' }}>{item.count}</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      backgroundColor: '#10b981', 
                      borderRadius: '4px',
                      width: `${(item.count / analysis.resueltas.max) * 100}%`,
                      opacity: 0.6
                    }}></div>
                  </div>
                </div>
              ))}
              {analysis.resueltas.total === 0 && <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Sin datos de resolución</p>}
            </div>
          </section>

          {/* Bloque 2: No Resueltas */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e' }}></div>
              <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>No Resueltas / Susp.</h3>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginLeft: 'auto' }}>{analysis.noResueltas.total} actuaciones</span>
            </div>

            {analysis.noResueltas.insight && (
              <div style={{ backgroundColor: '#fff1f2', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ffe4e6', marginBottom: '20px', fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>
                ⚠️ {analysis.noResueltas.insight}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {analysis.noResueltas.sorted.map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: '700' }}>
                    <span style={{ color: '#1e293b' }}>{item.text}</span>
                    <span style={{ color: '#64748b' }}>{item.count}</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      backgroundColor: '#f43f5e', 
                      borderRadius: '4px',
                      width: `${(item.count / analysis.noResueltas.max) * 100}%`,
                      opacity: 0.6
                    }}></div>
                  </div>
                </div>
              ))}
              {analysis.noResueltas.total === 0 && <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Sin datos de fallo</p>}
            </div>
          </section>

        </div>
      </div>
    </>
  );
};

const CalendarPicker = ({ isOpen, onClose, selectedDate, onSelect, rainyDays }: { isOpen: boolean, onClose: () => void, selectedDate: string, onSelect: (date: string) => void, rainyDays: string[] }) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate + 'T12:00:00'));
  
  if (!isOpen) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const monthName = viewDate.toLocaleString('es-ES', { month: 'long' });

  const days = [];
  // Padding
  for (let i = 0; i < firstDay; i++) days.push(null);
  // Real days
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: '340px', backgroundColor: 'white', borderRadius: '32px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ textTransform: 'capitalize', fontWeight: '900', color: '#1e293b' }}>{monthName} {year}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={prevMonth} style={{ padding: '8px', borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
            <button onClick={nextMonth} style={{ padding: '8px', borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer' }}><ChevronRight size={18} /></button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
          {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
            <span key={d} style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', padding: '8px 0' }}>{d}</span>
          ))}
          {days.map((d, i) => {
            if (d === null) return <div key={`empty-${i}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDate;
            const hasRain = rainyDays.includes(dateStr);

            return (
              <button
                key={i}
                onClick={() => { onSelect(dateStr); onClose(); }}
                style={{
                  padding: '10px 0',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: isSelected ? 'var(--movistar-blue)' : 'transparent',
                  color: isSelected ? 'white' : '#1e293b',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s'
                }}
              >
                {d}
                {hasRain && (
                  <span style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '8px' }}>🌧️</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const DetailDrawer = ({ isOpen, onClose, tech, date }: { isOpen: boolean, onClose: () => void, tech: TechDailyStats | null, date: string }) => {
  if (!tech) return null;

  return (
    <>
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
          zIndex: 5000,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease'
        }}
      />
      <div style={{
        position: 'fixed',
        top: isOpen ? '5vh' : '100vh',
        right: '24px',
        width: 'calc(100% - 48px)',
        maxWidth: '450px',
        maxHeight: '90vh',
        backgroundColor: 'white',
        borderRadius: '32px',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
        zIndex: 5001,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header - Fixed */}
        <div style={{ padding: '32px 24px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, position: 'relative' }}>
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '24px', right: '24px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}
          >
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: 'var(--movistar-blue)', padding: '10px', borderRadius: '14px', color: 'white' }}>
              <User size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px' }}>{tech.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                <span>Actuaciones</span>
                <span>•</span>
                <span>{date}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
             <div style={{ flex: 1, backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#166534', textTransform: 'uppercase' }}>Cumplidas</span>
                <span style={{ fontSize: '20px', fontWeight: '950', color: '#14532d' }}>{tech.cumplidas}</span>
             </div>
             <div style={{ flex: 1, backgroundColor: '#fef2f2', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#991b1b', textTransform: 'uppercase' }}>Pendientes</span>
                <span style={{ fontSize: '20px', fontWeight: '950', color: '#7f1d1d' }}>{tech.noRealizadas + tech.suspendidas}</span>
             </div>
          </div>
        </div>

        {/* List - Scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tech.actuaciones.map((act, i) => {
              const badge = getStatusBadge(act.estado);
              const StatusIcon = badge.icon;
              return (
                <div key={i} style={{ 
                  padding: '16px', 
                  borderRadius: '20px', 
                  backgroundColor: '#f8fafc', 
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  gap: '16px',
                  position: 'relative'
                }}>
                  {i < tech.actuaciones.length - 1 && (
                    <div style={{ position: 'absolute', left: '33px', top: '50px', width: '2px', height: '30px', backgroundColor: '#e2e8f0' }} />
                  )}

                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '12px', 
                    backgroundColor: badge.bg, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: badge.color,
                    flexShrink: 0
                  }}>
                    <StatusIcon size={20} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '900', color: badge.color, textTransform: 'uppercase' }}>{badge.label}</span>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4' }}>
                      {act.resolucion || 'Sin detalle de resolución'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', opacity: 0.6 }}>
                       <MapPin size={12} />
                       <span style={{ fontSize: '11px', fontWeight: '700' }}>Célula: {act.tx_celula}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default function DetalleDiario() {
  const [selectedDate, setSelectedDate] = useState('2026-04-06');
  const [loading, setLoading] = useState(true);
  const [actuaciones, setActuaciones] = useState<Actuacion[]>([]);
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});
  const [selectedTech, setSelectedTech] = useState<TechDailyStats | null>(null);
  const [selectedAnalysisCell, setSelectedAnalysisCell] = useState<CellDailyGroup | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isRainy, setIsRainy] = useState(false);
  const [rainyDays, setRainyDays] = useState<string[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const stats = useMemo(() => {
    if (!actuaciones.length) return null;

    const filteredActuaciones = actuaciones.filter(a => a.tx_celula?.toUpperCase() !== 'ACCESO VARELA');

    const district = {
      cumplidas: 0,
      noRealizadas: 0,
      suspendidas: 0,
      total: 0,
      resolucionPorcentaje: 0
    };

    const cells: Record<string, CellDailyGroup> = {};

    filteredActuaciones.forEach(act => {
      const e = act.estado.toUpperCase();
      const cellName = act.tx_celula || 'SIN CÉLULA';
      const techName = act.recurso || 'SIN TÉCNICO';

      if (!cells[cellName]) {
        cells[cellName] = {
          name: cellName,
          cumplidas: 0,
          noRealizadas: 0,
          suspendidas: 0,
          total: 0,
          resolucionPorcentaje: 0,
          technicians: []
        };
      }

      const cell = cells[cellName];
      let tech = cell.technicians.find(t => t.name === techName);
      if (!tech) {
        tech = {
          name: techName,
          cumplidas: 0,
          noRealizadas: 0,
          suspendidas: 0,
          total: 0,
          resolucionPorcentaje: 0,
          actuaciones: []
        };
        cell.technicians.push(tech);
      }

      // Update counters
      district.total++;
      cell.total++;
      tech.total++;

      if (e === 'CUMPLIDA') {
        district.cumplidas++;
        cell.cumplidas++;
        tech.cumplidas++;
      } else if (e === 'NO_REALIZADA') {
        district.noRealizadas++;
        cell.noRealizadas++;
        tech.noRealizadas++;
      } else if (e === 'SUSPENDIDA') {
        district.suspendidas++;
        cell.suspendidas++;
        tech.suspendidas++;
      }
      
      tech.actuaciones.push(act);
    });

    // Calculate percentages and sort
    district.resolucionPorcentaje = district.total > 0 ? (district.cumplidas / district.total) * 100 : 0;

    const cellList = Object.values(cells).map(cell => {
      cell.resolucionPorcentaje = cell.total > 0 ? (cell.cumplidas / cell.total) * 100 : 0;
      cell.technicians.forEach(t => {
        t.resolucionPorcentaje = t.total > 0 ? (t.cumplidas / t.total) * 100 : 0;
      });
      cell.technicians.sort((a, b) => a.resolucionPorcentaje - b.resolucionPorcentaje);
      return cell;
    }).sort((a, b) => b.resolucionPorcentaje - a.resolucionPorcentaje);

    const getTopResolucion = (items: Actuacion[]) => {
      if (!items.length) return null;
      const counts: Record<string, number> = {};
      items.forEach(a => {
        const text = (a.resolucion || 'Sin detalle').trim().toLowerCase();
        counts[text] = (counts[text] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return top ? { text: top[0].charAt(0).toUpperCase() + top[0].slice(1), percentage: (top[1] / items.length) * 100 } : null;
    };

    const principalResolucion = getTopResolucion(filteredActuaciones.filter(a => a.estado.toUpperCase() === 'CUMPLIDA'));
    const principalInformado = getTopResolucion(filteredActuaciones.filter(a => ['NO_REALIZADA', 'SUSPENDIDA'].includes(a.estado.toUpperCase())));

    return { 
      district, 
      cells: cellList, 
      insights: { principalResolucion, principalInformado } 
    };
  }, [actuaciones]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch actuaciones
      const { data: acts, error: actsErr } = await supabase
        .from('actuaciones')
        .select('*')
        .eq('fecha_cita', selectedDate);
      
      if (actsErr) throw actsErr;
      setActuaciones(acts || []);

      // Fetch day meta (rain)
      const { data: meta } = await supabase
        .from('dias_operativos')
        .select('lluvia')
        .eq('fecha', selectedDate)
        .maybeSingle();
      
      setIsRainy(meta?.lluvia || false);

    } catch (e) {
      console.error('Error loading daily detail:', e);
      setActuaciones([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRainyDays = async () => {
    const { data } = await supabase.from('dias_operativos').select('fecha').eq('lluvia', true);
    if (data) setRainyDays(data.map(d => d.fecha));
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    fetchRainyDays();
  }, []);

  const toggleCell = (name: string) => {
    setExpandedCells(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const dayInfo = formatDateLong(selectedDate);

  const handlePrevDay = () => {
     const d = new Date(selectedDate + 'T12:00:00');
     d.setDate(d.getDate() - 1);
     setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
     const d = new Date(selectedDate + 'T12:00:00');
     d.setDate(d.getDate() + 1);
     setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '16px 40px 60px 40px', width: '100%' }}>
      {/* Header & Breadcrumb */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/'}>KPIs Resolución</span>
            <ChevronRight size={14} />
            <span>{dayInfo.monthName}</span>
            <ChevronRight size={14} />
            <span>Semana 2</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--movistar-blue)', fontWeight: '900' }}>{dayInfo.full}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '16px', color: 'white', boxShadow: '0 8px 12px -3px rgba(0, 0, 0, 0.2)' }}>
              <LayoutDashboard size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.5px', lineHeight: '1' }}>Detalle Diario</h1>
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '700', marginTop: '6px' }}>Análisis táctico por célula y técnico</p>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            backgroundColor: 'white', 
            padding: '8px', 
            borderRadius: '16px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <button 
              onClick={handlePrevDay}
              style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#1e293b', border: 'none', cursor: 'pointer' }}
            >
              <ChevronLeft size={20} strokeWidth={3} />
            </button>
            <div 
              onClick={() => setIsCalendarOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', minWidth: '180px', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
            >
               <div style={{ position: 'relative' }}>
                <Calendar size={18} color="var(--movistar-blue)" />
                {isRainy && <span style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '14px' }}>🌧️</span>}
               </div>
               <span style={{ fontSize: '15px', fontWeight: '950', color: '#1e293b' }}>{dayInfo.full}</span>
            </div>
            <button 
              onClick={handleNextDay}
              style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#1e293b', border: 'none', cursor: 'pointer' }}
            >
              <ChevronRight size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      </header>

      {/* Block 1: KPIs Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Cumplidas', value: stats?.district.cumplidas || 0, color: '#166534', bg: 'rgba(34, 197, 94, 0.18)', icon: CheckCircle2 },
            { label: 'No realizadas', value: stats?.district.noRealizadas || 0, color: '#991b1b', bg: 'rgba(239, 68, 68, 0.18)', icon: XCircle },
            { label: 'Suspendidas', value: stats?.district.suspendidas || 0, color: '#854d0e', bg: 'rgba(234, 179, 8, 0.22)', icon: Clock },
            { label: 'Total actuaciones', value: stats?.district.total || 0, color: '#1e293b', bg: '#f1f5f9', icon: Activity },
            { label: '% Resolución', value: (stats?.district.resolucionPorcentaje.toFixed(1) || '0') + '%', color: 'var(--movistar-blue)', bg: 'rgba(1, 157, 244, 0.1)', icon: ArrowUpRight, isMain: true },
          ].map((kpi, idx) => (
            <div key={idx} style={{
              backgroundColor: kpi.bg,
              padding: '24px',
              borderRadius: '24px',
              border: kpi.isMain ? '2px solid var(--movistar-blue)' : `1px solid ${kpi.color}22`,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <kpi.icon size={16} color={kpi.color} strokeWidth={3} />
                  <span style={{ fontSize: '11px', fontWeight: '900', color: kpi.color, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{kpi.label}</span>
               </div>
               <div style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1px' }}>
                  {kpi.value}
               </div>
               {kpi.isMain && (
                 <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.1 }}>
                    <kpi.icon size={80} color={kpi.color} />
                 </div>
               )}
            </div>
          ))}
      </div>

      {/* Resumen del Día Insights */}
      {!loading && stats?.insights && (
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '24px', 
          flexWrap: 'wrap',
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '20px',
          border: '1px solid #e2e8f0'
        }}>
          {stats.insights.principalResolucion && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              backgroundColor: '#f0fdf4', 
              borderRadius: '12px',
              border: '1px solid #dcfce7'
            }}>
              <CheckCircle2 size={14} color="#10b981" />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#166534' }}>
                Principal resolución: <span style={{ fontWeight: '900' }}>{stats.insights.principalResolucion.text} ({stats.insights.principalResolucion.percentage.toFixed(0)}%)</span>
              </span>
            </div>
          )}
          
          {stats.insights.principalInformado && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              backgroundColor: '#fff1f2', 
              borderRadius: '12px',
              border: '1px solid #ffe4e6'
            }}>
              <XCircle size={14} color="#f43f5e" />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b' }}>
                Principal Informado: <span style={{ fontWeight: '900' }}>{stats.insights.principalInformado.text} ({stats.insights.principalInformado.percentage.toFixed(0)}%)</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Block 2: Structure Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', backgroundColor: 'white', borderRadius: '32px' }}>
            <Activity size={40} className="animate-spin" color="var(--movistar-blue)" />
            <p style={{ marginTop: '16px', fontWeight: '800', color: '#64748b' }}>Cargando datos del día...</p>
          </div>
        ) : (
          stats?.cells.map((cell) => (
            <div key={cell.name} style={{
              backgroundColor: 'white',
              borderRadius: '24px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
            }}>
              {/* Cell Toggle Row */}
              <div 
                onClick={() => toggleCell(cell.name)}
                style={{ 
                  padding: '20px 24px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: expandedCells[cell.name] ? '#f8fafc' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    backgroundColor: expandedCells[cell.name] ? '#1e293b' : '#f1f5f9', 
                    padding: '8px', 
                    borderRadius: '12px',
                    color: expandedCells[cell.name] ? 'white' : '#1e293b'
                  }}>
                    {expandedCells[cell.name] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b' }}>{cell.name}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{cell.technicians.length} técnicos activos hoy</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnalysisCell(cell);
                          setIsAnalysisOpen(true);
                        }}
                        style={{
                          width: 'fit-content',
                          backgroundColor: '#f8fafc',
                          color: 'var(--movistar-blue)',
                          padding: '6px 12px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          fontSize: '11px',
                          fontWeight: '950',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--movistar-blue)';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.color = 'var(--movistar-blue)';
                        }}
                      >
                        <Activity size={12} />
                        VER MOTIVOS
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                   <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>C / NR / S</span>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{cell.cumplidas} / {cell.noRealizadas} / {cell.suspendidas}</span>
                   </div>
                   
                   <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ 
                        backgroundColor: getSemaforo(cell.resolucionPorcentaje).bg, 
                        color: getSemaforo(cell.resolucionPorcentaje).color,
                        padding: '8px 16px',
                        borderRadius: '12px',
                        minWidth: '94px',
                        textAlign: 'center'
                      }}>
                          <span style={{ display: 'block', fontSize: '10px', fontWeight: '900', opacity: 0.8, textTransform: 'uppercase' }}>Resolución</span>
                          <span style={{ fontSize: '16px', fontWeight: '950' }}>{cell.resolucionPorcentaje.toFixed(1)}%</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Technicians Table */}
              {expandedCells[cell.name] && (
                <div style={{ borderTop: '1px solid #f1f5f9' }}>
                   <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Técnico</th>
                          <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Cumplidas</th>
                          <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>No Realizadas</th>
                          <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Suspendidas</th>
                          <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Total</th>
                          <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>% Resolución</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cell.technicians.map((tech) => (
                          <tr 
                            key={tech.name} 
                            onClick={() => {
                              setSelectedTech(tech);
                              setIsDrawerOpen(true);
                            }}
                            style={{ 
                              borderTop: '1px solid #f1f5f9', 
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              backgroundColor: 'white'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                          >
                            <td style={{ padding: '16px 24px' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                     <User size={16} />
                                  </div>
                                  <span style={{ fontWeight: '800', color: '#1e293b' }}>{tech.name}</span>
                               </div>
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                               <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#166534', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', fontSize: '14px' }}>{tech.cumplidas}</span>
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                               <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#991b1b', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', fontSize: '14px' }}>{tech.noRealizadas}</span>
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                               <span style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#854d0e', padding: '4px 10px', borderRadius: '8px', fontWeight: '900', fontSize: '14px' }}>{tech.suspendidas}</span>
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                               <span style={{ fontWeight: '800', color: '#64748b' }}>{tech.total}</span>
                            </td>
                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                               <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: '950', color: getSemaforo(tech.resolucionPorcentaje).color, fontSize: '16px' }}>{tech.resolucionPorcentaje.toFixed(1)}%</span>
                                  <ArrowRight size={14} color="#94a3b8" />
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Drawer */}
      <DetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        tech={selectedTech} 
        date={dayInfo.full}
      />

      <AnalysisDrawer 
        isOpen={isAnalysisOpen} 
        onClose={() => setIsAnalysisOpen(false)}
        cellName={selectedAnalysisCell?.name || ''}
        actuaciones={actuaciones.filter(a => a.tx_celula === selectedAnalysisCell?.name)}
        date={dayInfo.full}
      />

      <CalendarPicker 
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelect={(date) => setSelectedDate(date)}
        rainyDays={rainyDays}
      />

      <style jsx global>{`
        .animate-spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
