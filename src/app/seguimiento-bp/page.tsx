'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  Zap
} from 'lucide-react';

// --- Types ---
type WeeklyLoadStatus = 'full' | 'partial' | 'empty';
type TimeScale = 'monthly' | 'weekly';

interface BPAlarmData {
  pt: number; // Primera Tarde
  ft: number; // Fin Temprano
  ta: number; // Tiempo Almuerzo
  ma: number; // Momento Almuerzo
  te: number; // Tiempo Ejecución
  rt: number; // Retrabajo
  ne: number; // No Efectiva
  tea: number; // Tiempo Entre Actuaciones
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

// --- Mock Data ---
const INITIAL_DATA: BPSession = {
  id: '1',
  techName: 'STELLA SERGIO LEONEL',
  dni: '37653458',
  cell: 'VARELA 1',
  district: 'Varela',
  status: 'critico',
  history: [
    { id: 'w1', weekLabel: 'Semana 1', dateRange: '03/03 - 09/03', monthLabel: 'MARZO', resolucion: 86, reitero: 11, puntualidad: 82, productividad: 3.2, status: 'full', alarms: { pt: 0, ft: 0, ta: 40, ma: 0, te: 52, rt: 1, ne: 0, tea: 12 }, observation: 'Se observa buena disposición pero falta ajuste en rutas.', locked: true },
    { id: 'w2', weekLabel: 'Semana 2', dateRange: '10/03 - 16/03', monthLabel: 'MARZO', resolucion: 84, reitero: 12.5, puntualidad: 78, productividad: 3.1, status: 'full', alarms: { pt: 1, ft: 0, ta: 42, ma: 1, te: 50, rt: 2, ne: 1, tea: 14 }, observation: 'Incremento leve en reiteros por fallas en cierres.', locked: true },
    { id: 'w3', weekLabel: 'Semana 3', dateRange: '17/03 - 23/03', monthLabel: 'MARZO', resolucion: 82, reitero: 14, puntualidad: 75, productividad: 2.9, status: 'full', alarms: { pt: 2, ft: 1, ta: 50, ma: 2, te: 48, rt: 4, ne: 2, tea: 18 }, observation: 'Se refuerza proceso de validación con cliente.', locked: true },
    { id: 'w4', weekLabel: 'Semana 4', dateRange: '24/03 - 30/03', monthLabel: 'MARZO', resolucion: 78, reitero: 16.5, puntualidad: 70, productividad: 2.7, status: 'full', alarms: { pt: 3, ft: 2, ta: 60, ma: 3, te: 45, rt: 7, ne: 3, tea: 22 }, observation: 'Tendencia negativa en puntualidad.', locked: true },
    { id: 'w5', weekLabel: 'Semana 5', dateRange: '31/03 - 06/04', monthLabel: 'ABRIL', resolucion: 75, reitero: 18, puntualidad: 68, productividad: 2.5, status: 'full', alarms: { pt: 4, ft: 2, ta: 65, ma: 4, te: 43, rt: 10, ne: 4, tea: 28 }, observation: 'Caso crítico. Se requiere intervención urgente.', locked: true },
    { id: 'w6', weekLabel: 'Semana 6', dateRange: '07/04 - 13/04', monthLabel: 'ABRIL', resolucion: 72, reitero: 19.5, puntualidad: 65, productividad: 2.3, status: 'partial', alarms: null },
    { id: 'w7', weekLabel: 'Semana 7', dateRange: '14/04 - 20/04', monthLabel: 'ABRIL', resolucion: 74, reitero: 18.5, puntualidad: 67, productividad: 2.4, status: 'empty', alarms: null },
  ],
  actions: [
    { id: 'a1', weekLabel: '31/03 - 06/04', observation: 'Caso crítico. Se requiere intervención urgente.', date: '2026-04-07' },
    { id: 'a2', weekLabel: '24/03 - 30/03', observation: 'Tendencia negativa en puntualidad.', date: '2026-03-31' },
    { id: 'a3', weekLabel: '17/03 - 23/03', observation: 'Se refuerza proceso de validación con cliente.', date: '2026-03-24' },
  ]
};

// --- Utils ---
const getSemaforo = (value: number, kpi: string) => {
  if (kpi === 'resolucion') {
    if (value >= 75) return { color: '#065f46', bg: '#d1fae5', label: 'Objetivo OK' }; // Green
    if (value >= 70) return { color: '#854d0e', bg: '#fef3c7', label: 'En Umbral' }; // Yellow
    return { color: '#991b1b', bg: '#fee2e2', label: 'Crítico' }; // Red
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
    <div style={{ 
      backgroundColor: semaforo.bg, 
      borderRadius: '24px', 
      padding: '24px', 
      border: '1px solid rgba(0,0,0,0.05)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      flex: 1,
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', fontWeight: '950', color: semaforo.color, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.8 }}>{title}</p>
        <div style={{ backgroundColor: 'white', color: semaforo.color, padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '950', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
           {semaforo.label}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h4 style={{ fontSize: '40px', fontWeight: '950', color: '#0f172a', margin: 0, letterSpacing: '-1px' }}>{typeof value === 'number' && kpiKey !== 'productividad' ? `${value.toFixed(1)}%` : value}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: trendColor }}>
           {isUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
           <span style={{ fontSize: '14px', fontWeight: '950' }}>{variation === 0 ? '0%' : `${Math.abs(variation).toFixed(variation < 0.1 && variation > -0.1 ? 2 : 1)}%`}</span>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, icon: Icon, children }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '14px', color: 'white' }}>
        <Icon size={20} />
      </div>
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
          padding: '8px 16px',
          borderRadius: '9px',
          border: 'none',
          backgroundColor: active === opt.value ? 'white' : 'transparent',
          color: active === opt.value ? '#0f172a' : '#64748b',
          fontSize: '12px',
          fontWeight: '900',
          boxShadow: active === opt.value ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        {opt.icon && <opt.icon size={14} />}
        {opt.label}
      </button>
    ))}
  </div>
);

const AlarmsModal = ({ week, onClose, onSave }: any) => {
  const [formData, setFormData] = useState<BPAlarmData>({
    pt: 0, ft: 0, ta: 0, ma: 0, te: 0, rt: 0, ne: 0, tea: 0
  });

  const inputs = [
    { key: 'pt', label: 'Primera Tarde' },
    { key: 'ft', label: 'Fin Temprano' },
    { key: 'ta', label: 'Tiempo Almuerzo' },
    { key: 'ma', label: 'Momento Almuerzo' },
    { key: 'te', label: 'Tiempo Ejecución' },
    { key: 'rt', label: 'Retrabajo' },
    { key: 'ne', label: 'No Efectiva' },
    { key: 'tea', label: 'Tiempo Entre Actuaciones' },
  ];

  const handleSave = () => {
    // Basic validation: all fields required and non-negative
    const emptyValues = Object.values(formData).some(v => v === undefined || v === null);
    if (emptyValues) {
       alert('Todos los campos son obligatorios');
       return;
    }
    onSave(formData);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '32px', width: '90%', maxWidth: '580px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#0f172a' }}>Carga de Alarmas</h2>
            <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '700' }}>Semana: {week.dateRange}</p>
          </div>
          <button onClick={onClose} style={{ padding: '10px', borderRadius: '14px', backgroundColor: '#f1f5f9', color: '#64748b' }}><X size={20}/></button>
        </div>
        
        <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
           {inputs.map(inp => (
             <div key={inp.key}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>{inp.label}</label>
                <input 
                  type="number"
                  min="0"
                  value={formData[inp.key as keyof BPAlarmData]}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val < 0) return;
                    setFormData({...formData, [inp.key]: val || 0})
                  }}
                  placeholder="0"
                  style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '2.5px solid #f1f5f9', fontSize: '15px', fontWeight: '900', outline: 'none' }}
                />
             </div>
           ))}
        </div>

        <div style={{ padding: '32px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '16px', fontWeight: '950', color: '#64748b', backgroundColor: '#f1f5f9' }}>CANCELAR</button>
          <button onClick={handleSave} style={{ flex: 2, padding: '16px', borderRadius: '16px', fontWeight: '950', color: 'white', backgroundColor: '#019df4', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Save size={18} /> GUARDAR ALARMAS
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Page ---

export default function SeguimientoBP() {
  const [activeTab, setActiveTab] = useState<'data' | 'actions'>('data');
  const [session, setSession] = useState<BPSession>(INITIAL_DATA);
  const [kpiScale, setKpiScale] = useState<TimeScale>('weekly');
  const [kpiView, setKpiView] = useState<'table' | 'chart'>('table');
  const [modalWeek, setModalWeek] = useState<WeeklyKPI | null>(null);
  
  // Current logic: Find the first week that is not 'full' to be the "active" or "pending" one
  const activeWeekIndex = useMemo(() => {
    const idx = session.history.findIndex(w => w.status !== 'full');
    return idx === -1 ? session.history.length - 1 : idx;
  }, [session]);

  const activeWeek = session.history[activeWeekIndex];
  const [observationText, setObservationText] = useState(activeWeek?.observation || '');

  // Variation calculation for Bloque 1
  const prevWeek = session.history[activeWeekIndex - 1] || activeWeek;

  const handleSaveAlarms = (data: BPAlarmData) => {
    if (!modalWeek) return;
    const newHistory = session.history.map(w => {
      if (w.id === modalWeek.id) {
        return { ...w, alarms: data, status: 'full' as WeeklyLoadStatus };
      }
      return w;
    });
    setSession({ ...session, history: newHistory });
    setModalWeek(null);
  };

  const handleConfirmCheck = () => {
    if (!activeWeek.alarms) {
      alert('Debes cargar las alarmas de la semana antes de confirmar el check.');
      return;
    }
    const newAction: BPAction = {
      id: Math.random().toString(36).substr(2, 9),
      weekLabel: activeWeek.dateRange,
      observation: observationText,
      date: new Date().toLocaleDateString('es-ES')
    };
    
    // Update history with observation and lock it
    const newHistory = session.history.map((w, i) => {
      if (i === activeWeekIndex) {
        return { ...w, observation: observationText, locked: true };
      }
      return w;
    });

    setSession({
      ...session,
      history: newHistory,
      actions: [newAction, ...session.actions]
    });
    
    alert('Check semanal confirmado y guardado con éxito.');
  };

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
              active={activeTab} 
              onChange={setActiveTab} 
            />
         </div>
      </header>

      {activeTab === 'data' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
           
           {/* BLOQUE 1: KPIs ACTUALES */}
           <section>
              <SectionHeader title="KPIs ACTUALES" icon={Zap} />
              <div style={{ display: 'flex', gap: '20px' }}>
                 <StatCard title="Resolución %" value={activeWeek.resolucion} previousValue={prevWeek.resolucion} kpiKey="resolucion" />
                 <StatCard title="Reitero %" value={activeWeek.reitero} previousValue={prevWeek.reitero} kpiKey="reitero" />
                 <StatCard title="Puntualidad %" value={activeWeek.puntualidad} previousValue={prevWeek.puntualidad} kpiKey="puntualidad" />
                 <StatCard title="Productividad" value={activeWeek.productividad} previousValue={prevWeek.productividad} kpiKey="productividad" />
              </div>
           </section>

           {/* BLOQUE 2: KPIs HISTÓRICOS */}
           <section>
              <SectionHeader title="KPIs HISTÓRICOS" icon={TrendingUp}>
                 <ViewToggle 
                   options={[{ value: 'table', label: 'Tabla', icon: TableIcon }, { value: 'chart', label: 'Gráfico', icon: BarChart3 }]} 
                   active={kpiView} 
                   onChange={setKpiView} 
                 />
                 <ViewToggle 
                   options={[{ value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensual' }]} 
                   active={kpiScale} 
                   onChange={setKpiScale} 
                 />
              </SectionHeader>

              {kpiView === 'table' ? (
                <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '12px' }}>
                   <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                      <thead>
                         <tr style={{ backgroundColor: 'white' }}>
                            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '10px', color: '#94a3b8', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '1px' }}>Semana</th>
                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '10px', color: '#1e293b', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '1px' }}>Resolución</th>
                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '10px', color: '#1e293b', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '1px' }}>Reiteros</th>
                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '10px', color: '#1e293b', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '1px' }}>Puntualidad</th>
                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '10px', color: '#1e293b', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '1px' }}>Productividad</th>
                         </tr>
                      </thead>
                      <tbody>
                         {session.history.map((w) => {
                           const resStyle = getSemaforo(w.resolucion, 'resolucion');
                           const reiStyle = getSemaforo(w.reitero, 'reitero');
                           const punStyle = getSemaforo(w.puntualidad, 'puntualidad');
                           const proStyle = getSemaforo(w.productividad, 'productividad');
                           return (
                             <tr key={w.id} style={{ backgroundColor: 'white' }}>
                                <td style={{ padding: '16px 24px', border: '1px solid #f1f5f9', borderRight: 'none', borderRadius: '16px 0 0 16px' }}>
                                   <div style={{ fontWeight: '950', color: '#0f172a', fontSize: '14px' }}>{w.weekLabel}</div>
                                   <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '800' }}>{w.dateRange}</div>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                   <div style={{ 
                                     backgroundColor: resStyle.bg, 
                                     color: resStyle.color, 
                                     padding: '10px 0', 
                                     borderRadius: '12px', 
                                     fontWeight: '950', 
                                     fontSize: '14px',
                                     width: '140px',
                                     margin: '0 auto',
                                     border: '1px solid rgba(0,0,0,0.03)'
                                   }}>{w.resolucion.toFixed(2)}%</div>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                   <div style={{ 
                                     backgroundColor: reiStyle.bg, 
                                     color: reiStyle.color, 
                                     padding: '10px 0', 
                                     borderRadius: '12px', 
                                     fontWeight: '950', 
                                     fontSize: '14px',
                                     width: '140px',
                                     margin: '0 auto',
                                     border: '1px solid rgba(0,0,0,0.03)'
                                   }}>{w.reitero.toFixed(2)}%</div>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                                   <div style={{ 
                                     backgroundColor: punStyle.bg, 
                                     color: punStyle.color, 
                                     padding: '10px 0', 
                                     borderRadius: '12px', 
                                     fontWeight: '950', 
                                     fontSize: '14px',
                                     width: '140px',
                                     margin: '0 auto',
                                     border: '1px solid rgba(0,0,0,0.03)'
                                   }}>{w.puntualidad.toFixed(2)}%</div>
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'center', border: '1px solid #f1f5f9', borderLeft: 'none', borderRadius: '0 16px 16px 0' }}>
                                   <div style={{ 
                                     backgroundColor: proStyle.bg, 
                                     color: proStyle.color, 
                                     padding: '10px 0', 
                                     borderRadius: '12px', 
                                     fontWeight: '950', 
                                     fontSize: '14px',
                                     width: '140px',
                                     margin: '0 auto',
                                     border: '1px solid rgba(0,0,0,0.03)'
                                   }}>{w.productividad.toFixed(2)}</div>
                                </td>
                             </tr>
                           );
                         })}
                      </tbody>
                   </table>
                </div>
              ) : (
                <div style={{ backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '32px', height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {/* Visual represention of line chart */}
                   <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                     <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#059669' }} /> <span style={{ fontSize: '11px', fontWeight: '800' }}>Resolución</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#dc2626' }} /> <span style={{ fontSize: '11px', fontWeight: '800' }}>Reitero</span></div>
                     </div>
                     <svg width="100%" height="200" viewBox="0 0 800 200" style={{ overflow: 'visible' }}>
                        {/* Grid */}
                        {[0, 50, 100, 150, 200].map(y => <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#f1f5f9" strokeWidth="1" />)}
                        {/* Resolución Line */}
                        <path d={session.history.map((w, i) => `${i === 0 ? 'M' : 'L'} ${(i * 120)},${180 - (w.resolucion - 50) * 3}`).join(' ')} fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" />
                        {/* Reitero Line */}
                        <path d={session.history.map((w, i) => `${i === 0 ? 'M' : 'L'} ${(i * 120)},${180 - (w.reitero) * 6}`).join(' ')} fill="none" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
                        {/* Points */}
                        {session.history.map((w, i) => (
                          <g key={i}>
                            <circle cx={(i * 120)} cy={180 - (w.resolucion - 50) * 3} r="5" fill="#059669" />
                            <circle cx={(i * 120)} cy={180 - (w.reitero) * 6} r="5" fill="#dc2626" />
                            <text x={(i * 120)} y="200" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="800">{w.weekLabel.split(' ')[1]}</text>
                          </g>
                        ))}
                     </svg>
                   </div>
                </div>
              )}
           </section>

           {/* BLOQUE 3: ALARMAS OPERATIVAS */}
           <section>
              <SectionHeader title="ALARMAS OPERATIVAS" icon={AlertCircle}>
                 <button 
                   onClick={() => setModalWeek(activeWeek)}
                   style={{ 
                     backgroundColor: '#019df4', color: 'white', padding: '10px 20px', 
                     borderRadius: '14px', fontWeight: '950', fontSize: '13px', display: 'flex', 
                     alignItems: 'center', gap: '8px', cursor: 'pointer'
                   }}
                 >
                    <Plus size={18} /> Cargar alarmas de la semana
                 </button>
              </SectionHeader>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                 <div style={{ backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                       <thead>
                          <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                             <th style={{ padding: '14px', textAlign: 'left', fontWeight: '950', color: '#64748b' }}>SEM.</th>
                             <th style={{ padding: '14px', textAlign: 'center', fontWeight: '950', color: '#0f172a' }}>PT</th>
                             <th style={{ padding: '14px', textAlign: 'center', fontWeight: '950', color: '#0f172a' }}>FT</th>
                             <th style={{ padding: '14px', textAlign: 'center', fontWeight: '950', color: '#0f172a' }}>TA</th>
                             <th style={{ padding: '14px', textAlign: 'center', fontWeight: '950', color: '#0f172a' }}>MA</th>
                             <th style={{ padding: '14px', textAlign: 'center', fontWeight: '950', color: '#0f172a' }}>TE</th>
                             <th style={{ padding: '14px', textAlign: 'center', fontWeight: '950', color: '#0f172a' }}>RT</th>
                             <th style={{ padding: '14px', textAlign: 'center', fontWeight: '950', color: '#0f172a' }}>NE</th>
                             <th style={{ padding: '14px', textAlign: 'center', fontWeight: '950', color: '#0f172a' }}>TEA</th>
                          </tr>
                       </thead>
                       <tbody>
                          {session.history.filter(w => w.alarms).map(w => (
                            <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                               <td style={{ padding: '14px', fontWeight: '900', color: '#64748b' }}>{w.weekLabel.split(' ')[1]}</td>
                               <td style={{ padding: '14px', textAlign: 'center', fontWeight: '800' }}>{w.alarms?.pt}</td>
                               <td style={{ padding: '14px', textAlign: 'center', fontWeight: '800' }}>{w.alarms?.ft}</td>
                               <td style={{ padding: '14px', textAlign: 'center', fontWeight: '800' }}>{w.alarms?.ta}</td>
                               <td style={{ padding: '14px', textAlign: 'center', fontWeight: '800' }}>{w.alarms?.ma}</td>
                               <td style={{ padding: '14px', textAlign: 'center', fontWeight: '800' }}>{w.alarms?.te}</td>
                               <td style={{ padding: '14px', textAlign: 'center', fontWeight: '800' }}>{w.alarms?.rt}</td>
                               <td style={{ padding: '14px', textAlign: 'center', fontWeight: '800' }}>{w.alarms?.ne}</td>
                               <td style={{ padding: '14px', textAlign: 'center', fontWeight: '800' }}>{w.alarms?.tea}</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>

                 <div style={{ backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '950', color: '#0f172a' }}>Distribución {activeWeek.dateRange}</h3>
                      <BarChart3 size={18} color="#94a3b8" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                       {activeWeek.alarms ? Object.entries(activeWeek.alarms).map(([key, val]) => (
                         <div key={key}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: '#64748b' }}>
                               <span>{key}</span>
                               <span style={{ color: '#0f172a' }}>{val}</span>
                            </div>
                            <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                               <div style={{ height: '100%', width: `${Math.min((val / 20) * 100 + 2, 100)}%`, backgroundColor: '#019df4', borderRadius: '3px' }} />
                            </div>
                         </div>
                       )) : <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Sin alarmas cargadas para esta semana</p>}
                    </div>
                    <div style={{ marginTop: '20px', padding: '12px', borderRadius: '12px', backgroundColor: '#fdf2f2', border: '1px solid #fee2e2' }}>
                       <p style={{ fontSize: '11px', color: '#991b1b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={14}/> Objetivo: Detectar predominancia de fallos</p>
                    </div>
                 </div>
              </div>
           </section>

           {/* BLOQUE 4: CHECK SEMANAL */}
           <section style={{ backgroundColor: '#f0f9ff', padding: '40px', borderRadius: '32px', border: '1.5px dashed #bae6fd' }}>
              <SectionHeader title="CHECK SEMANAL" icon={MessageSquare} />
              
              <div style={{ marginBottom: '24px' }}>
                 <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#0369a1', marginBottom: '12px' }}>Observaciones del líder ({activeWeek.dateRange})</label>
                 <textarea 
                   rows={4}
                   value={observationText}
                   onChange={(e) => setObservationText(e.target.value)}
                   placeholder="Ingrese el feedback del seguimiento, compromisos del técnico o detalles del acompañamiento..."
                   style={{ width: '100%', padding: '20px', borderRadius: '16px', border: '1.5px solid #e0f2fe', outline: 'none', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}
                 />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '20px' }}>
                  {!activeWeek.alarms && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e11d48', fontSize: '13px', fontWeight: '800' }}>
                       <AlertTriangle size={18} /> Pendiente carga de alarmas para confirmar
                    </div>
                  )}
                  <button 
                    onClick={handleConfirmCheck}
                    disabled={activeWeek.locked || !activeWeek.alarms}
                    style={{ 
                      backgroundColor: activeWeek.locked ? '#94a3b8' : '#0ea5e9', 
                      color: 'white', padding: '16px 32px', borderRadius: '16px', 
                      fontWeight: '950', fontSize: '14px', cursor: (activeWeek.locked || !activeWeek.alarms) ? 'default' : 'pointer',
                      boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.3)',
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                     <CheckCircle2 size={18} />
                     {activeWeek.locked ? 'Check Semanal Confirmado' : 'Confirmar check semanal'}
                  </button>
              </div>
           </section>

        </div>
      ) : (
        /* HISTORIAL DE ACCIONES (Timeline) */
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
           <SectionHeader title="HISTORIAL DE ACCIONES" icon={History} />
           {session.actions.map((action, i) => (
             <div key={action.id} style={{ display: 'flex', gap: '32px', position: 'relative' }}>
                {i < session.actions.length - 1 && (
                  <div style={{ position: 'absolute', left: '20px', top: '40px', bottom: '-32px', width: '2px', backgroundColor: '#e2e8f0' }} />
                )}
                <div style={{ 
                  width: '42px', height: '42px', borderRadius: '14px', backgroundColor: 'white', 
                  border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 2, color: '#019df4'
                }}>
                   <Clock size={18} />
                </div>
                <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', flex: 1, boxShadow: '0 4px 6px -4px rgba(0,0,0,0.05)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semana {action.weekLabel}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: '800' }}>
                         <Calendar size={14} /> {action.date}
                      </div>
                   </div>
                   <p style={{ fontSize: '15px', color: '#334155', fontWeight: '700', lineHeight: '1.6', margin: 0 }}>
                      {action.observation}
                   </p>
                   <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#019df4', fontSize: '12px', fontWeight: '900', backgroundColor: '#f0f9ff', padding: '6px 12px', borderRadius: '10px' }}>
                          <CheckCircle2 size={14} /> Registro Trazable
                       </div>
                   </div>
                </div>
             </div>
           ))}
           {session.actions.length === 0 && (
             <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                <History size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p style={{ fontWeight: '800' }}>Aún no hay acciones registradas</p>
             </div>
           )}
        </div>
      )}

      {/* Modals */}
      {modalWeek && <AlarmsModal week={modalWeek} onClose={() => setModalWeek(null)} onSave={handleSaveAlarms} />}

      <style jsx global>{`
        * { box-sizing: border-box; transition: color 0.2s, background-color 0.2s; }
        body { background-color: #f8fafc; }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
