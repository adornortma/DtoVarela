'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Minus,
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
  CircleOff,
  CalendarCheck,
  LayoutDashboard,
  Hammer,
  ArrowRight,
  Filter,
  Calendar,
  Search
} from 'lucide-react';

// --- Types ---
type WeeklyLoadStatus = 'full' | 'partial' | 'empty';
type TimeScale = 'monthly' | 'weekly';

interface BPAlarmData {
  pt: number; ft: number; ta: number; ma: number; te: number; rt: number; ne: number; tea: number;
}

interface BPEvent {
  id: string;
  type: string;
  date: string;
  title: string;
  description: string;
  weekAssoc?: string;
}

interface BPSession {
  id: string;
  techName: string;
  dni: string;
  cell: string;
  district: string;
  status: 'critico' | 'seguimiento' | 'mejora';
  startDate: string;
  daysInBp: number;
  lastCheckStatus: 'mejora' | 'igual' | 'empeoro';
  kpiHistory: {
    week: string;
    month: string;
    reitero: number;
    resolucion: number;
    deriva: number;
    status: WeeklyLoadStatus;
    alarms: BPAlarmData;
  }[];
  actions: BPEvent[];
}

// --- Mock Data ---
const MOCK_BP_DATA: BPSession = {
  id: '1',
  techName: 'STELLA SERGIO LEONEL',
  dni: '37653458',
  cell: 'VARELA 1',
  district: 'Varela',
  status: 'critico',
  startDate: '2026-03-22',
  daysInBp: 24,
  lastCheckStatus: 'empeoro',
  kpiHistory: [
    { week: 'S09', month: 'MARZO', reitero: 11, resolucion: 86, deriva: 4, status: 'full', alarms: { pt: 0, ft: 0, ta: 40, ma: 0, te: 52, rt: 1, ne: 0, tea: 12 } },
    { week: 'S10', month: 'MARZO', reitero: 12.5, resolucion: 84, deriva: 5, status: 'full', alarms: { pt: 1, ft: 0, ta: 42, ma: 1, te: 50, rt: 2, ne: 1, tea: 14 } },
    { week: 'S11', month: 'MARZO', reitero: 14, resolucion: 82, deriva: 6.5, status: 'full', alarms: { pt: 2, ft: 1, ta: 50, ma: 2, te: 48, rt: 4, ne: 2, tea: 18 } },
    { week: 'S12', month: 'MARZO', reitero: 16.5, resolucion: 78, deriva: 8, status: 'full', alarms: { pt: 3, ft: 2, ta: 60, ma: 3, te: 45, rt: 7, ne: 3, tea: 22 } },
    { week: 'S13', month: 'ABRIL', reitero: 18, resolucion: 75, deriva: 9.5, status: 'full', alarms: { pt: 4, ft: 2, ta: 65, ma: 4, te: 43, rt: 10, ne: 4, tea: 28 } },
    { week: 'S14', month: 'ABRIL', reitero: 19.5, resolucion: 72, deriva: 11, status: 'partial', alarms: { pt: 5, ft: 4, ta: 75, ma: 5, te: 40, rt: 14, ne: 6, tea: 35 } },
    { week: 'S15', month: 'ABRIL', reitero: 18.5, resolucion: 74, deriva: 9.5, status: 'empty', alarms: { pt: 0, ft: 0, ta: 0, ma: 0, te: 0, rt: 0, ne: 0, tea: 0 } },
  ],
  actions: [
    { id: '1', type: 'Acompañamiento', date: '2026-03-25', title: 'Veeduría en Campo', description: 'Se observa falta de orden en herramientas. Se corrige en el momento.', weekAssoc: 'S11' },
    { id: '2', type: 'Capacitación', date: '2026-04-02', title: 'Módulo de Resolución', description: 'Capacitación técnica sobre resolución de fallas complejas.', weekAssoc: 'S13' },
    { id: '3', type: 'Acción Disciplinaria', date: '2026-04-10', title: 'Apercibimiento', description: 'Reincidencia en alarma de PT y RT.', weekAssoc: 'S14' },
  ]
};

// --- Utils ---
const getDominantAlarm = (alarms: BPAlarmData) => {
  const entries = Object.entries(alarms) as [keyof BPAlarmData, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  if (best[1] === 0) return '-';
  const labels: Record<string, string> = { pt: 'PT', ft: 'FT', ta: 'Alm', ma: 'Mom', te: 'Eje', rt: 'Ret', ne: 'N.Ef', tea: 'TEA' };
  return `${labels[best[0]]} (${best[1]})`;
};

// --- Subcomponents ---

const WeekStatusIndicator = ({ status }: { status: WeeklyLoadStatus }) => {
  const config = {
    full: { color: '#10b981', Icon: CheckCircle2 },
    partial: { color: '#f59e0b', Icon: AlertTriangle },
    empty: { color: '#ef4444', Icon: CircleOff }
  };
  const { color, Icon } = config[status];
  return <div style={{ color }}><Icon size={16} /></div>;
};

const TabButton = ({ active, label, icon: Icon, onClick }: any) => (
  <button 
    onClick={onClick}
    style={{ 
      display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '14px', border: 'none',
      backgroundColor: active ? 'var(--movistar-blue)' : 'white',
      color: active ? 'white' : '#64748b',
      boxShadow: active ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
      cursor: 'pointer', fontSize: '14px', fontWeight: '950', transition: 'all 0.2s'
    }}
  >
    <Icon size={18} /> {label}
  </button>
);

const LineChart = ({ data, timeScale, onPointClick }: any) => {
  const width = 1000;
  const height = 240;
  const padding = 60;
  const getY = (val: number) => height - ((val / 100) * (height - 2 * padding)) - padding;
  const getX = (i: number) => (i / (data.length - 1)) * (width - 2 * padding) + padding;

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '32px', padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
         <h3 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b' }}>Evolución de KPIs ({timeScale})</h3>
         <div style={{ display: 'flex', gap: '20px' }}>
            {[{ l: 'Reitero', c: 'var(--movistar-blue)' }, { l: 'Resolución', c: '#10b981' }, { l: 'Deriva', c: '#f59e0b' }].map(k => (
              <div key={k.l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: k.c }} /> {k.l}
              </div>
            ))}
         </div>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
         {[0, 50, 100].map(v => (
           <g key={v}>
              <line x1={padding} y1={getY(v)} x2={width - padding} y2={getY(v)} stroke="#f1f5f9" />
              <text x={padding - 10} y={getY(v)} textAnchor="end" fontSize="11" fill="#94a3b8" fontWeight="800">{v}%</text>
           </g>
         ))}
         {/* Paths */}
         <path d={data.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.reitero)}`).join(' ')} fill="none" stroke="var(--movistar-blue)" strokeWidth="4" />
         <path d={data.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.resolucion)}`).join(' ')} fill="none" stroke="#10b981" strokeWidth="4" />
         <path d={data.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.deriva)}`).join(' ')} fill="none" stroke="#f59e0b" strokeWidth="4" />
         {/* Points */}
         {data.map((d: any, i: number) => (
           <g key={i} style={{ cursor: 'pointer' }} onClick={() => onPointClick(d)}>
              <circle cx={getX(i)} cy={getY(d.reitero)} r="4" fill="white" stroke="var(--movistar-blue)" strokeWidth="2" />
              <text x={getX(i)} y={height - 5} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="800">{timeScale === 'monthly' ? d.month : d.week}</text>
           </g>
         ))}
      </svg>
    </div>
  );
};

const AlarmBarChart = ({ data, timeScale }: any) => {
  const metrics = [
    { k: 'pt', l: 'PT', c: '#ef4444' }, { k: 'ft', l: 'FT', c: '#f59e0b' },
    { k: 'rt', l: 'RT', c: '#8b5cf6' }, { k: 'ne', l: 'NE', c: '#ec4899' }
  ];

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '32px', padding: '32px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b', marginBottom: '24px' }}>Análisis de Causas (Alarmas)</h3>
      <div style={{ position: 'relative', height: '180px', display: 'flex', gap: '16px', alignItems: 'flex-end', paddingLeft: '40px' }}>
         <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', fontWeight: '950' }}>
            <span>15</span><span>10</span><span>5</span><span>0</span>
         </div>
         {data.map((d: any, i: number) => (
           <div key={i} style={{ flex: 1, display: 'flex', gap: '2px', alignItems: 'flex-end', justifyContent: 'center' }}>
              {metrics.map(m => (
                <div key={m.k} style={{ 
                  width: '8px', 
                  height: `${Math.min((d.alarms[m.k] / 15) * 100, 100)}%`, 
                  backgroundColor: m.c, borderRadius: '2px 2px 0 0' 
                }} title={`${m.l}: ${d.alarms[m.k]}`} />
              ))}
           </div>
         ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '20px' }}>
         {metrics.map(m => (
           <div key={m.k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#64748b' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: m.c }} /> {m.l}
           </div>
         ))}
      </div>
    </div>
  );
};

export default function SeguimientoBP() {
  const [activeTab, setActiveTab] = useState<'data' | 'actions'>('data');
  const [timeScale, setTimeScale] = useState<TimeScale>('monthly');
  const [selectedTech] = useState<BPSession>(MOCK_BP_DATA);

  // --- Process Data ---
  const displayData = useMemo(() => {
    if (timeScale === 'weekly') return selectedTech.kpiHistory;
    // Simple Monthly Grouping
    const months = [...new Set(selectedTech.kpiHistory.map(h => h.month))];
    return months.map(m => {
      const items = selectedTech.kpiHistory.filter(h => h.month === m);
      return {
        month: m,
        reitero: items.reduce((a, b) => a + b.reitero, 0) / items.length,
        resolucion: items.reduce((a, b) => a + b.resolucion, 0) / items.length,
        deriva: items.reduce((a, b) => a + b.deriva, 0) / items.length,
        alarms: {
          pt: items.reduce((a, b) => a + b.alarms.pt, 0),
          ft: items.reduce((a, b) => a + b.alarms.ft, 0),
          rt: items.reduce((a, b) => a + b.alarms.rt, 0),
          ne: items.reduce((a, b) => a + b.alarms.ne, 0),
        }
      };
    });
  }, [timeScale, selectedTech]);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '16px 40px 120px 40px', width: '100%', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Fijo */}
      <header style={{ marginBottom: '40px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: '#94a3b8', fontSize: '13px', fontWeight: '800' }}>
            <span>Página Principal</span><ChevronRight size={14} />
            <span style={{ color: 'var(--movistar-blue)', fontWeight: '950' }}>Seguimiento BP</span>
         </div>

         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
               <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#1e293b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={32} />
               </div>
               <div>
                  <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#1e293b', letterSpacing: '-1.5px', margin: 0 }}>{selectedTech.techName}</h1>
                  <p style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', margin: '4px 0' }}>DNI: {selectedTech.dni} • {selectedTech.cell} • Varela</p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                     <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '950' }}>CRÍTICO</div>
                     <div style={{ backgroundColor: '#eff6ff', color: 'var(--movistar-blue)', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '950' }}>{selectedTech.daysInBp} DÍAS EN BP</div>
                  </div>
               </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
                <TabButton active={activeTab === 'data'} label="ANÁLISIS DE DATOS" icon={LayoutDashboard} onClick={() => setActiveTab('data')} />
                <TabButton active={activeTab === 'actions'} label="HISTORIAL DE ACCIONES" icon={Hammer} onClick={() => setActiveTab('actions')} />
            </div>
         </div>
      </header>

      {activeTab === 'data' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
           
           {/* Controles de Escala */}
           <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                 <button 
                  onClick={() => setTimeScale('monthly')}
                  style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', backgroundColor: timeScale === 'monthly' ? 'white' : 'transparent', fontWeight: '950', fontSize: '12px', cursor: 'pointer' }}
                 >MENSUAL</button>
                 <button 
                  onClick={() => setTimeScale('weekly')}
                  style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', backgroundColor: timeScale === 'weekly' ? 'white' : 'transparent', fontWeight: '950', fontSize: '12px', cursor: 'pointer' }}
                 >SEMANAL</button>
              </div>
           </div>

           {/* Gráficos Sincronizados */}
           <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              <LineChart data={displayData} timeScale={timeScale} onPointClick={(p: any) => p.month && setTimeScale('weekly')} />
              <AlarmBarChart data={displayData} timeScale={timeScale} />
           </div>

           {/* Tabla de Confirmación */}
           <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                       <th style={{ padding: '20px 32px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', fontWeight: '950' }}>{timeScale === 'monthly' ? 'MES' : 'SEMANA'}</th>
                       <th style={{ padding: '20px 32px', textAlign: 'center', fontSize: '11px', color: '#1e293b', fontWeight: '950' }}>REITERO</th>
                       <th style={{ padding: '20px 32px', textAlign: 'center', fontSize: '11px', color: '#1e293b', fontWeight: '950' }}>RESOLUCIÓN</th>
                       <th style={{ padding: '20px 32px', textAlign: 'center', fontSize: '11px', color: '#1e293b', fontWeight: '950' }}>DERIVA</th>
                       <th style={{ padding: '20px 32px', textAlign: 'center', fontSize: '11px', color: '#1e293b', fontWeight: '950' }}>🔍 CAUSA PRINCIPAL</th>
                       <th style={{ padding: '20px 32px', textAlign: 'right', fontSize: '11px', color: '#94a3b8', fontWeight: '950' }}>ST</th>
                    </tr>
                 </thead>
                 <tbody>
                    {displayData.map((d: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                         <td style={{ padding: '20px 32px', fontWeight: '950', fontSize: '14px', color: '#1e293b' }}>{timeScale === 'monthly' ? d.month : d.week}</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900', color: d.reitero > 15 ? '#ef4444' : '#1e293b' }}>{d.reitero.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900', color: d.resolucion < 75 ? '#ef4444' : '#10b981' }}>{d.resolucion.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900' }}>{d.deriva.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-block', backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '950', color: '#475569' }}>
                                {getDominantAlarm(d.alarms)}
                            </div>
                         </td>
                         <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                            {d.status ? <WeekStatusIndicator status={d.status} /> : <div style={{ color: '#10b981' }}><CheckCircle2 size={16} /></div>}
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#1e293b' }}>Historial de Acciones</h2>
              <button style={{ backgroundColor: 'var(--movistar-blue)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '16px', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <Activity size={18} /> AGREGAR ACCIÓN
              </button>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '19px', top: '24px', bottom: '24px', width: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }} />
              {selectedTech.actions.map(action => (
                <div key={action.id} style={{ display: 'flex', gap: '32px', padding: '24px 0', position: 'relative', zIndex: 1 }}>
                   <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'white', border: '2px solid var(--movistar-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Calendar size={18} color="var(--movistar-blue)" />
                   </div>
                   <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', flex: 1, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                         <div>
                            <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>{action.type} • {action.weekAssoc}</span>
                            <h4 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b', marginTop: '4px' }}>{action.title}</h4>
                         </div>
                         <span style={{ fontSize: '13px', fontWeight: '900', color: '#64748b' }}>{action.date}</span>
                      </div>
                      <p style={{ fontSize: '14px', color: '#475569', fontWeight: '700', lineHeight: '1.6', margin: 0 }}>{action.description}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Footer Fijo */}
      <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 100 }}>
         <button 
           onClick={() => setTimeScale(timeScale === 'monthly' ? 'weekly' : 'monthly')}
           style={{ backgroundColor: '#1e293b', color: 'white', padding: '16px 32px', borderRadius: '20px', border: 'none', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', cursor: 'pointer' }}
         >
            {timeScale === 'monthly' ? <Search size={20} /> : <TrendingUp size={20} />}
            {timeScale === 'monthly' ? 'DRILL DOWN A SEMANAS' : 'VOLVER A VISTA MENSUAL'}
         </button>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; }
        @font-face {
          font-family: 'Inter';
          src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        }
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
      `}</style>
    </div>
  );
}
