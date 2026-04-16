'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Activity,
  History,
  X,
  ClipboardList,
  User,
  BarChart3,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
  LayoutDashboard,
  Hammer,
  ArrowUpRight,
  Filter,
  Calendar,
  Search,
  ChevronDown,
  Save,
  Plus,
  CloudRain,
  MessageSquare,
  ArrowRight,
  Clock,
  Zap,
  List
} from 'lucide-react';

// --- Types ---
type WeeklyLoadStatus = 'full' | 'partial' | 'empty';
type TimeScale = 'monthly' | 'weekly';

interface BPAlarmData {
  pt: number;
  ft: number;
  ta: number;
  ma: number;
  te: number;
  rt: number;
  ne: number;
  tea: number;
}

interface WeeklyKPI {
  id: string;
  weekLabel: string;
  dateRange: string;
  monthLabel: string;
  resolucion: number;
  reitero: number;
  puntualidad: number;
  productividad: number;
  status: WeeklyLoadStatus;
  alarms: BPAlarmData | null;
  observation?: string;
  locked?: boolean;
}

interface BPAction {
  id: string;
  weekLabel: string;
  observation: string;
  date: string;
}

interface BPSession {
  id: string;
  techName: string;
  dni: string;
  cell: string;
  district: string;
  status: 'critico' | 'seguimiento' | 'mejora';
  history: WeeklyKPI[];
  actions: BPAction[];
}

// --- Utils ---
const getSemaforo = (value: number, kpi: string) => {
  if (kpi === 'resolucion') {
    if (value >= 75) return { color: '#065f46', bg: '#d1fae5', label: 'Objetivo OK' };
    if (value >= 70) return { color: '#854d0e', bg: '#fef3c7', label: 'En Umbral' };
    return { color: '#991b1b', bg: '#fee2e2', label: 'Crítico' };
  }
  if (kpi === 'reitero') {
    if (value <= 4.5) return { color: '#065f46', bg: '#d1fae5', label: 'Objetivo OK' };
    if (value <= 6) return { color: '#854d0e', bg: '#fef3c7', label: 'En Umbral' };
    return { color: '#991b1b', bg: '#fee2e2', label: 'Crítico' };
  }
  if (kpi === 'puntualidad') {
    if (value >= 80) return { color: '#065f46', bg: '#d1fae5', label: 'Objetivo OK' };
    if (value >= 75) return { color: '#854d0e', bg: '#fef3c7', label: 'En Umbral' };
    return { color: '#991b1b', bg: '#fee2e2', label: 'Crítico' };
  }
  if (kpi === 'productividad') {
    if (value >= 6) return { color: '#065f46', bg: '#d1fae5', label: 'Objetivo OK' };
    if (value >= 5.2) return { color: '#854d0e', bg: '#fef3c7', label: 'En Umbral' };
    return { color: '#991b1b', bg: '#fee2e2', label: 'Crítico' };
  }
  return { color: '#64748b', bg: '#f1f5f9', label: 'N/A' };
};

// --- Components ---

const StatCard = ({ title, value, previousValue, kpiKey }: { title: string, value: string | number, previousValue: number, kpiKey: string }) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const variation = numValue - previousValue;
  const isPositiveMetric = ['resolucion', 'puntualidad', 'productividad'].includes(kpiKey);
  const isUp = variation > 0;
  const trendColor = isUp === isPositiveMetric ? '#059669' : '#dc2626';
  const semaforo = getSemaforo(numValue, kpiKey);

  return (
    <div style={{ backgroundColor: semaforo.bg, borderRadius: '24px', padding: '24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', fontWeight: '950', color: semaforo.color, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.8 }}>{title}</p>
        <div style={{ backgroundColor: 'white', color: semaforo.color, padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '950' }}>{semaforo.label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h4 style={{ fontSize: '40px', fontWeight: '950', color: '#0f172a', margin: 0, letterSpacing: '-1px' }}>{kpiKey !== 'productividad' ? `${numValue.toFixed(1)}%` : numValue.toFixed(2)}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: trendColor }}>
           {isUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
           <span style={{ fontSize: '14px', fontWeight: '950' }}>{variation === 0 ? '0%' : `${Math.abs(variation).toFixed(1)}%`}</span>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, icon: Icon, children }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '14px', color: 'white' }}><Icon size={20} /></div>
      <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px' }}>{title}</h2>
    </div>
    <div style={{ display: 'flex', gap: '12px' }}>{children}</div>
  </div>
);

const ViewToggle = ({ options, active, onChange }: any) => (
  <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
    {options.map((opt: any) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        style={{
          padding: '8px 16px', borderRadius: '9px', border: 'none',
          backgroundColor: active === opt.value ? 'white' : 'transparent',
          color: active === opt.value ? '#0f172a' : '#64748b',
          fontSize: '12px', fontWeight: '900', boxShadow: active === opt.value ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
        }}
      >
        {opt.icon && <opt.icon size={14} />}
        {opt.label}
      </button>
    ))}
  </div>
);

const AlarmsModal = ({ week, onClose, onSave }: any) => {
  const [formData, setFormData] = useState<BPAlarmData>(week.alarms || { pt: 0, ft: 0, ta: 0, ma: 0, te: 0, rt: 0, ne: 0, tea: 0 });
  const inputs = [
    { key: 'pt', label: 'PT' }, { key: 'ft', label: 'FT' }, { key: 'ta', label: 'TA' }, { key: 'ma', label: 'MA' },
    { key: 'te', label: 'TE' }, { key: 'rt', label: 'RT' }, { key: 'ne', label: 'NE' }, { key: 'tea', label: 'TEA' },
  ];

  const [selectedDate, setSelectedDate] = useState(week.dateRange || new Date().toISOString().split('T')[0]);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '32px', width: '90%', maxWidth: '580px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#0f172a' }}>Carga de Alarmas</h2>
            <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '700' }}>Seleccione la fecha de inicio</p>
          </div>
          <button onClick={onClose} style={{ padding: '10px', borderRadius: '14px', backgroundColor: '#f1f5f9', color: '#64748b' }}><X size={20}/></button>
        </div>
        
        <div style={{ padding: '32px 32px 0 32px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semana (Fecha de inicio)</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '2.5px solid #019df4', fontSize: '15px', fontWeight: '900', outline: 'none', backgroundColor: '#f0f9ff', color: '#019df4' }}
          />
        </div>

        <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
           {inputs.map(inp => (
             <div key={inp.key}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#64748b', marginBottom: '8px' }}>{inp.label}</label>
                <input 
                  type="number" value={formData[inp.key as keyof BPAlarmData]}
                  onChange={(e) => setFormData({...formData, [inp.key]: parseInt(e.target.value) || 0})}
                  style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '2.5px solid #f1f5f9', fontSize: '15px', fontWeight: '900', outline: 'none', color: '#1e293b' }}
                />
             </div>
           ))}
        </div>

        <div style={{ padding: '32px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px', backgroundColor: '#f8fafc' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '16px', fontWeight: '950', color: '#64748b', backgroundColor: 'white', border: '1px solid #e2e8f0' }}>CERRAR</button>
          <button onClick={() => onSave(formData, selectedDate)} style={{ flex: 2, padding: '16px', borderRadius: '16px', fontWeight: '950', color: 'white', backgroundColor: '#019df4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(1, 157, 244, 0.3)' }}>
            <Save size={18} /> GUARDAR
          </button>
        </div>
      </div>
    </div>
  );
};

// --- BP Tracking Logic ---

function BPTrackingContent() {
  const searchParams = useSearchParams();
  const dni = searchParams.get('dni') || '37653458'; // Fallback for demo
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<BPSession | null>(null);
  const [kpiScale, setKpiScale] = useState<TimeScale>('weekly');
  const [kpiView, setKpiView] = useState<'table' | 'chart'>('table');
  const [alarmScale, setAlarmScale] = useState<TimeScale>('weekly');
  const [alarmView, setAlarmView] = useState<'table' | 'chart'>('table');
  const [modalWeek, setModalWeek] = useState<WeeklyKPI | null>(null);
  const [activeTab, setActiveTab] = useState<'data' | 'actions'>('data');
  const [observationText, setObservationText] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Tech Info
      const { data: tech, error: techError } = await supabase
        .from('tecnicos')
        .select('*')
        .eq('dni', dni)
        .single();

      if (techError || !tech) throw new Error('Técnico no encontrado');

      // 2. Fetch Weekly Metrics (already existing table)
      // Group by week for logic
      const { data: metrics } = await supabase
        .from('metricas')
        .select('*')
        .eq('tecnico_id', tech.id)
        .order('fecha', { ascending: false });

      // 3. Fetch Tracking (alarms/obs) from our new table
      const { data: tracking } = await supabase
        .from('seguimiento_bp')
        .select('*')
        .eq('tecnico_id', tech.id);

      // --- Mapeo a Estructura de UI ---
      // Para efectos del demo/MVP agruparemos por semanas ficticias basadas en las métricas
      // En producción esto vendría de una lógica de calendario real
      const history: WeeklyKPI[] = (metrics || []).slice(0, 10).map((m, i) => {
        const track = tracking?.find(t => t.fecha_inicio <= m.fecha && t.fecha_fin >= m.fecha);
        return {
          id: m.id,
          weekLabel: `Semana ${10 - i}`,
          dateRange: `${m.fecha}`,
          monthLabel: 'MARZO', // Mock month
          resolucion: m.resolucion,
          reitero: m.reitero,
          puntualidad: m.puntualidad,
          productividad: m.productividad,
          status: track ? (track.estado_carga as any) : 'empty',
          alarms: track ? {
            pt: track.alarma_pt || 0, ft: track.alarma_ft || 0, ta: track.alarma_ta || 0, ma: track.alarma_ma || 0,
            te: track.alarma_te || 0, rt: track.alarma_rt || 0, ne: track.alarma_ne || 0, tea: track.alarma_tea || 0
          } : null,
          observation: track?.observacion_lider,
          locked: track?.confirmado
        };
      });

      const actions: BPAction[] = (tracking || [])
        .filter(t => t.confirmado && t.observacion_lider)
        .map(t => ({
          id: t.id,
          weekLabel: t.fecha_inicio,
          observation: t.observacion_lider,
          date: new Date(t.fecha_confirmacion).toLocaleDateString()
        }));

      setSession({
        id: tech.id,
        techName: `${tech.nombre} ${tech.apellido}`,
        dni: tech.dni,
        cell: metrics?.[0]?.celula || 'N/A',
        district: 'Varela',
        status: 'critico', // Mock status check based on KPIs
        history,
        actions
      });
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [dni]);

  const activeWeek = session?.history[0]; // Logic for latest pending week
  
  useEffect(() => {
    if (activeWeek) setObservationText(activeWeek.observation || '');
  }, [activeWeek]);

  const handleSaveAlarms = async (data: BPAlarmData, date?: string) => {
    if (!session || !activeWeek) return;
    
    const targetDate = date || activeWeek.dateRange;

    const { error } = await supabase
      .from('seguimiento_bp')
      .upsert({
        tecnico_id: session.id,
        fecha_inicio: targetDate, 
        fecha_fin: targetDate,
        alarma_pt: data.pt, alarma_ft: data.ft, alarma_ta: data.ta, alarma_ma: data.ma,
        alarma_te: data.te, alarma_rt: data.rt, alarma_ne: data.ne, alarma_tea: data.tea,
        estado_carga: 'full'
      }, { onConflict: 'tecnico_id, fecha_inicio' });

    if (error) {
      alert('Error guardando alarmas: ' + error.message);
    } else {
      setModalWeek(null);
      fetchData();
    }
  };

  const handleConfirmCheck = async () => {
    if (!session || !activeWeek) return;

    const confirm = window.confirm("¿Estás seguro? ¿Se actualizaron todas las alarmas operativas para este técnico?");
    if (!confirm) return;

    const { error } = await supabase
      .from('seguimiento_bp')
      .update({
        observacion_lider: observationText,
        confirmado: true,
        fecha_confirmacion: new Date().toISOString()
      })
      .eq('tecnico_id', session.id)
      .eq('fecha_inicio', activeWeek.dateRange);

    if (error) {
      alert('Error confirmando check: ' + error.message);
    } else {
      alert('Seguimiento guardado con éxito!');
      fetchData();
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <Activity size={48} className="animate-spin" color="#019df4" />
          <p style={{ marginTop: '16px', fontWeight: '950', color: '#0f172a' }}>Cargando expediente...</p>
       </div>
    </div>
  );

  if (!session) return <div>No se encontró información para el técnico.</div>;

  const prevWeek = session.history[1] || session.history[0];

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '16px 40px 120px 40px', width: '100%', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: '#94a3b8', fontSize: '13px', fontWeight: '800' }}>
            <span>Panel de Gestión</span><ChevronRight size={14} />
            <span style={{ color: '#019df4', fontWeight: '950' }}>Detalle Seguimiento BP</span>
         </div>

         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
               <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={30} />
               </div>
               <div>
                  <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.5px', margin: 0 }}>{session.techName}</h1>
                  <p style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', marginTop: '4px' }}>DNI: {session.dni} • Célula: {session.cell} • Distrito: {session.district}</p>
               </div>
            </div>
            
            <ViewToggle 
              options={[
                { value: 'data', label: 'ANÁLISIS OPERATIVO', icon: Activity },
                { value: 'actions', label: 'HISTORIAL DE SEGUIMIENTO', icon: History }
              ]} 
              active={activeTab} onChange={setActiveTab} 
            />
         </div>
      </header>

      {activeTab === 'data' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
           
           {/* BLOQUE 1: KPIs ACTUALES */}
           <section>
              <SectionHeader title="KPIs ACTUALES" icon={Zap} />
              <div style={{ display: 'flex', gap: '20px' }}>
                 <StatCard title="Resolución %" value={activeWeek?.resolucion || 0} previousValue={prevWeek?.resolucion || 0} kpiKey="resolucion" />
                 <StatCard title="Reitero %" value={activeWeek?.reitero || 0} previousValue={prevWeek?.reitero || 0} kpiKey="reitero" />
                 <StatCard title="Puntualidad %" value={activeWeek?.puntualidad || 0} previousValue={prevWeek?.puntualidad || 0} kpiKey="puntualidad" />
                 <StatCard title="Productividad" value={activeWeek?.productividad || 0} previousValue={prevWeek?.productividad || 0} kpiKey="productividad" />
              </div>
           </section>

           {/* BLOQUE 2: KPIs HISTÓRICOS */}
           <section>
              <SectionHeader title="KPIs HISTÓRICOS" icon={TrendingUp}>
                 <ViewToggle 
                   options={[{ value: 'table', label: 'Tabla', icon: TableIcon }, { value: 'chart', label: 'Gráfico', icon: BarChart3 }]} 
                   active={kpiView} onChange={setKpiView} 
                 />
                 <ViewToggle 
                   options={[{ value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensual' }]} 
                   active={kpiScale} onChange={setKpiScale} 
                 />
              </SectionHeader>

              {kpiView === 'table' ? (
                <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '12px' }}>
                   <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                      <thead>
                         <tr>
                            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', fontWeight: '950', textTransform: 'uppercase' }}>Fecha</th>
                            {['Resolución', 'Reiteros', 'Puntualidad', 'Prod.'].map(h => (
                              <th key={h} style={{ padding: '12px 24px', textAlign: 'center', fontSize: '10px', color: '#1e293b', fontWeight: '950', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                         </tr>
                      </thead>
                      <tbody>
                         {session.history.map((w) => {
                           const resS = getSemaforo(w.resolucion, 'resolucion');
                           const reiS = getSemaforo(w.reitero, 'reitero');
                           return (
                             <tr key={w.id}>
                                <td style={{ padding: '16px 24px', border: '1px solid #f1f5f9', borderRadius: '16px 0 0 16px' }}>
                                   <div style={{ fontWeight: '950', color: '#0f172a' }}>{w.dateRange}</div>
                                </td>
                                {[w.resolucion, w.reitero, w.puntualidad, w.productividad].map((v, i) => (
                                  <td key={i} style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', borderRight: i === 3 ? '1px solid #f1f5f9' : 'none', borderRadius: i === 3 ? '0 16px 16px 0' : '0' }}>
                                    <div style={{ backgroundColor: getSemaforo(v || 0, ['resolucion', 'reitero', 'puntualidad', 'productividad'][i]).bg, color: getSemaforo(v || 0, ['resolucion', 'reitero', 'puntualidad', 'productividad'][i]).color, padding: '8px 16px', borderRadius: '12px', fontWeight: '950', fontSize: '13px' }}>
                                       {v !== null && v !== undefined ? (i === 3 ? v.toFixed(2) : `${v.toFixed(1)}%`) : '-'}
                                    </div>
                                  </td>
                                ))}
                             </tr>
                           );
                         })}
                      </tbody>
                   </table>
                </div>
              ) : (
                <div style={{ backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '32px', height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Gráfico dinámico en desarrollo...</p>
                </div>
              )}
           </section>

           {/* BLOQUE 3: ALARMAS OPERATIVAS */}
           <section>
              <SectionHeader title="ALARMAS OPERATIVAS" icon={AlertCircle}>
                 <ViewToggle options={[{ value: 'table', label: 'Tabla', icon: TableIcon }, { value: 'chart', label: 'Gráfico', icon: BarChart3 }]} active={alarmView} onChange={setAlarmView} />
                 <ViewToggle options={[{ value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensual' }]} active={alarmScale} onChange={setAlarmScale} />
                 <button 
                   onClick={() => activeWeek && setModalWeek(activeWeek)}
                   style={{ backgroundColor: '#019df4', color: 'white', padding: '10px 20px', borderRadius: '14px', fontWeight: '950', fontSize: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                 >
                    <Plus size={16} /> Cargar alarmas
                 </button>
              </SectionHeader>

              {alarmView === 'table' ? (
                <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '12px' }}>
                   <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                      <thead>
                         <tr>
                            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', fontWeight: '950' }}>Fecha</th>
                            {['PT', 'FT', 'TA', 'MA', 'TE', 'RT', 'NE', 'TEA'].map(h => <th key={h} style={{ padding: '12px 10px', textAlign: 'center', fontSize: '10px', color: '#1e293b', fontWeight: '950' }}>{h}</th>)}
                         </tr>
                      </thead>
                      <tbody>
                         {session.history.map((w) => {
                           const a = w.alarms;
                           const maxVal = a ? Math.max(a.pt, a.ft, a.ta, a.ma, a.te, a.rt, a.ne, a.tea) : 0;
                           return (
                             <tr key={w.id} onClick={() => setModalWeek(w)} style={{ cursor: 'pointer' }}>
                                <td style={{ padding: '16px 24px', border: '1px solid #f1f5f9', borderRadius: '16px 0 0 16px' }}>
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ fontWeight: '950', color: '#0f172a' }}>{w.dateRange}</div>
                                      {!a && <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: '950' }}>PENDIENTE</div>}
                                   </div>
                                </td>
                                {a ? [a.pt, a.ft, a.ta, a.ma, a.te, a.rt, a.ne, a.tea].map((v, i) => (
                                  <td key={i} style={{ padding: '16px 4px', textAlign: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', borderRight: i === 7 ? '1px solid #f1f5f9' : 'none', borderRadius: i === 7 ? '0 16px 16px 0' : '0' }}>
                                     <div style={{ backgroundColor: v === maxVal && v > 0 ? '#fee2e2' : '#f8fafc', color: v === maxVal && v > 0 ? '#991b1b' : '#475569', padding: '10px 0', borderRadius: '12px', fontWeight: '950', fontSize: '14px', width: '55px', margin: '0 auto' }}>{v}</div>
                                  </td>
                                )) : (
                                  <td colSpan={8} style={{ padding: '16px 4px', textAlign: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', borderRadius: '0 16px 16px 0' }}>
                                     <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', fontStyle: 'italic' }}>Haz clic para cargar alarmas</div>
                                  </td>
                                )}
                             </tr>
                           );
                         })}
                      </tbody>
                   </table>
                </div>
              ) : (
                <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', padding: '60px', height: '400px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '20px' }}>
                   {activeWeek?.alarms ? Object.entries(activeWeek.alarms).map(([k, v], i) => (
                     <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '950' }}>{v}</div>
                        <div style={{ width: '100%', height: `${(v / 50) * 200}px`, backgroundColor: '#94a3b8', borderRadius: '12px 12px 4px 4px' }} />
                        <div style={{ fontSize: '12px', fontWeight: '950', color: '#64748b' }}>{k.toUpperCase()}</div>
                     </div>
                   )) : <p>Cargue alarmas para visualizar</p>}
                </div>
              )}
           </section>

           {/* BLOQUE 4: CHECK SEMANAL */}
           <section style={{ backgroundColor: '#f0f9ff', padding: '40px', borderRadius: '32px', border: '1.5px dashed #bae6fd' }}>
              <SectionHeader title="CHECK SEMANAL" icon={MessageSquare} />
              <div style={{ marginBottom: '24px' }}>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#0369a1', marginBottom: '12px' }}>Observaciones del líder</label>
                 <textarea rows={4} value={observationText} onChange={(e) => setObservationText(e.target.value)} placeholder="Ingrese feedback..." style={{ width: '100%', padding: '20px', borderRadius: '16px', border: '1.5px solid #e0f2fe', outline: 'none', fontSize: '14px', fontWeight: '700' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px' }}>
                  <button 
                    onClick={handleConfirmCheck} disabled={activeWeek?.locked}
                    style={{ backgroundColor: activeWeek?.locked ? '#94a3b8' : '#0ea5e9', color: 'white', padding: '16px 32px', borderRadius: '16px', fontWeight: '950', cursor: activeWeek?.locked ? 'not-allowed' : 'pointer', border: 'none' }}
                  >
                     {activeWeek?.locked ? 'Check Confirmado' : 'Confirmar seguimiento'}
                  </button>
              </div>
           </section>
        </div>
      ) : (
        /* HISTORIAL TIMELINE */
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
           <SectionHeader title="HISTORIAL DE ACCIONES" icon={History} />
           {session.actions.map((a) => (
             <div key={a.id} style={{ display: 'flex', gap: '32px', marginBottom: '32px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '14px', backgroundColor: 'white', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={18} /></div>
                <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', flex: 1 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8' }}>SEMANA {a.weekLabel}</span>
                      <span style={{ fontSize: '12px', fontWeight: '800' }}>{a.date}</span>
                   </div>
                   <p style={{ fontSize: '15px', color: '#334155', fontWeight: '700' }}>{a.observation}</p>
                </div>
             </div>
           ))}
        </div>
      )}

      {modalWeek && <AlarmsModal week={modalWeek} onClose={() => setModalWeek(null)} onSave={handleSaveAlarms} />}
    </div>
  );
}

export function BPTrackingPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <BPTrackingContent />
    </Suspense>
  );
}

// Wrapper default export
export default BPTrackingPage;
