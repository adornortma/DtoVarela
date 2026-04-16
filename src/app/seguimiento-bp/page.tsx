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
  Search,
  ChevronDown,
  Layout
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
    weekLabel: string; // "31/03 - 06/04"
    shortLabel: string; // "31/03"
    monthLabel: string; // "MARZO"
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
    { weekLabel: '03/03 - 09/03', shortLabel: '03/03', monthLabel: 'MARZO', reitero: 11, resolucion: 86, deriva: 4, status: 'full', alarms: { pt: 0, ft: 0, ta: 40, ma: 0, te: 52, rt: 1, ne: 0, tea: 12 } },
    { weekLabel: '10/03 - 16/03', shortLabel: '10/03', monthLabel: 'MARZO', reitero: 12.5, resolucion: 84, deriva: 5, status: 'full', alarms: { pt: 1, ft: 0, ta: 42, ma: 1, te: 50, rt: 2, ne: 1, tea: 14 } },
    { weekLabel: '17/03 - 23/03', shortLabel: '17/03', monthLabel: 'MARZO', reitero: 14, resolucion: 82, deriva: 6.5, status: 'full', alarms: { pt: 2, ft: 1, ta: 50, ma: 2, te: 48, rt: 4, ne: 2, tea: 18 } },
    { weekLabel: '24/03 - 30/03', shortLabel: '24/03', monthLabel: 'MARZO', reitero: 16.5, resolucion: 78, deriva: 8, status: 'full', alarms: { pt: 3, ft: 2, ta: 60, ma: 3, te: 45, rt: 7, ne: 3, tea: 22 } },
    { weekLabel: '31/03 - 06/04', shortLabel: '31/03', monthLabel: 'ABRIL', reitero: 18, resolucion: 75, deriva: 9.5, status: 'full', alarms: { pt: 4, ft: 2, ta: 65, ma: 4, te: 43, rt: 10, ne: 4, tea: 28 } },
    { weekLabel: '07/04 - 13/04', shortLabel: '07/04', monthLabel: 'ABRIL', reitero: 19.5, resolucion: 72, deriva: 11, status: 'partial', alarms: { pt: 5, ft: 4, ta: 75, ma: 5, te: 40, rt: 14, ne: 6, tea: 35 } },
    { weekLabel: '14/04 - 20/04', shortLabel: '14/04', monthLabel: 'ABRIL', reitero: 18.5, resolucion: 74, deriva: 9.5, status: 'empty', alarms: { pt: 0, ft: 0, ta: 0, ma: 0, te: 0, rt: 0, ne: 0, tea: 0 } },
  ],
  actions: [
    { id: '1', type: 'Acompañamiento', date: '2026-03-25', title: 'Veeduría en Campo', description: 'Se observa falta de orden en herramientas. Se corrige en el momento.', weekAssoc: '17/03' },
    { id: '2', type: 'Capacitación', date: '2026-04-02', title: 'Módulo de Resolución', description: 'Capacitación técnica sobre resolución de fallas complejas.', weekAssoc: '31/03' },
    { id: '3', type: 'Acción Disciplinaria', date: '2026-04-10', title: 'Apercibimiento', description: 'Reincidencia en alarma de PT y RT.', weekAssoc: '07/04' },
  ]
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
  const width = 1200;
  const height = 280;
  const padding = 60;
  const getY = (val: number) => height - ((val / 100) * (height - 2 * padding)) - padding;
  const getX = (i: number) => (i / (data.length - 1)) * (width - 2 * padding) + padding;

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '32px', padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
         <div>
            <h3 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b' }}>Evolución de KPIs de Gestión</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>{timeScale.toUpperCase()} • {data[0]?.monthLabel || ''} - {data[data.length-1]?.monthLabel || ''}</p>
         </div>
         <div style={{ display: 'flex', gap: '20px' }}>
            {[{ l: 'Reitero %', c: 'var(--movistar-blue)' }, { l: 'Resolución %', c: '#10b981' }, { l: 'Deriva %', c: '#f59e0b' }].map(k => (
              <div key={k.l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: k.c }} /> {k.l}
              </div>
            ))}
         </div>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
         {[0, 25, 50, 75, 100].map(v => (
           <g key={v}>
              <line x1={padding} y1={getY(v)} x2={width - padding} y2={getY(v)} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padding - 10} y={getY(v)} textAnchor="end" alignmentBaseline="middle" fontSize="11" fill="#94a3b8" fontWeight="800">{v}%</text>
           </g>
         ))}
         <path d={data.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.reitero)}`).join(' ')} fill="none" stroke="var(--movistar-blue)" strokeWidth="6" strokeLinecap="round" />
         <path d={data.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.resolucion)}`).join(' ')} fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" />
         <path d={data.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.deriva)}`).join(' ')} fill="none" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
         
         {data.map((d: any, i: number) => (
           <g key={i} onClick={() => onPointClick(d)} style={{ cursor: 'pointer' }}>
              <text x={getX(i)} y={height - 5} textAnchor="middle" fontSize="12" fill="#64748b" fontWeight="950">{timeScale === 'monthly' ? d.monthLabel : d.shortLabel}</text>
              <circle cx={getX(i)} cy={getY(d.reitero)} r="6" fill="white" stroke="var(--movistar-blue)" strokeWidth="3" />
           </g>
         ))}
      </svg>
    </div>
  );
};

const AlarmBarChart = ({ data, timeScale }: any) => {
  const [showAll, setShowAll] = useState(false);
  const metricsBase = [
    { k: 'pt', l: 'Primera Tarde', c: '#ef4444' }, 
    { k: 'ft', l: 'Fin Temprano', c: '#f59e0b' },
    { k: 'rt', l: 'Retrabajo', c: '#8b5cf6' }, 
    { k: 'ne', l: 'No Efectiva', c: '#ec4899' }
  ];
  const metricsExtra = [
    { k: 'ta', l: 'T. Almuerzo', c: '#10b981' },
    { k: 'ma', l: 'Momento Alm.', c: '#14b8a6' },
    { k: 'te', l: 'T. Ejecución', c: '#3b82f6' },
    { k: 'tea', l: 'T. e. Act.', c: '#64748b' }
  ];
  const currentMetrics = showAll ? [...metricsBase, ...metricsExtra] : metricsBase;

  const width = 1200;
  const height = 240;
  const paddingSide = 60;
  const paddingBottom = 40;
  const chartHeight = height - paddingBottom;

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '32px', padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
         <div>
            <h3 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b' }}>Análisis de Alarmas Operativas</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>Eventos cuantificados por {timeScale === 'monthly' ? 'mes' : 'fecha'}</p>
         </div>
         <button 
          onClick={() => setShowAll(!showAll)}
          style={{ padding: '8px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#475569', fontSize: '12px', fontWeight: '950', cursor: 'pointer' }}
         >
           {showAll ? 'Ver principales' : 'Ver todas'}
         </button>
      </div>

      <div style={{ position: 'relative', height: height + 'px', width: '100%', paddingLeft: paddingSide + 'px', paddingRight: paddingSide + 'px' }}>
         {/* Eje Y y Grillas */}
         <div style={{ position: 'absolute', left: 0, top: 0, bottom: paddingBottom, width: paddingSide, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textAlign: 'right', paddingRight: '10px' }}>
            <span>15</span><span>10</span><span>5</span><span>0</span>
         </div>
         {[0, 5, 10, 15].map(v => (
            <div key={v} style={{ position: 'absolute', left: paddingSide, right: paddingSide, bottom: `${(v / 15) * (chartHeight)} + ${paddingBottom}px`, top: v === 15 ? 0 : 'auto', borderTop: '1px solid #f1f5f9', zIndex: 0 }} />
         ))}

         <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: chartHeight + 'px', position: 'relative', zIndex: 1, paddingBottom: 0 }}>
            {data.map((d: any, i: number) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%', justifyContent: 'center', height: '100%' }}>
                    {currentMetrics.map(m => (
                       <div key={m.k} style={{ 
                        width: showAll ? '6px' : '14px', 
                        height: `${(d.alarms[m.k as keyof BPAlarmData] / 15) * 100}%`, 
                        maxHeight: '100%',
                        backgroundColor: m.c, 
                        borderRadius: '2px 2px 0 0',
                        opacity: 0.9
                       }} title={`${m.l}: ${d.alarms[m.k as keyof BPAlarmData]}`} />
                    ))}
                 </div>
                 <span style={{ fontSize: '11px', fontWeight: '950', color: '#64748b', marginTop: '12px', fontVariantNumeric: 'tabular-nums' }}>
                   {timeScale === 'monthly' ? d.monthLabel : d.shortLabel}
                 </span>
              </div>
            ))}
         </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '32px' }}>
         {currentMetrics.map(m => (
           <div key={m.k} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: m.c }} /> {m.l}
           </div>
         ))}
      </div>
    </div>
  );
};

export default function SeguimientoBP() {
  const [activeTab, setActiveTab] = useState<'data' | 'actions'>('data');
  const [timeScale, setTimeScale] = useState<TimeScale>('weekly');
  const [selectedTech] = useState<BPSession>(MOCK_BP_DATA);

  // --- Process Data ---
  const displayData = useMemo(() => {
    if (timeScale === 'weekly') return selectedTech.kpiHistory;
    const months = [...new Set(selectedTech.kpiHistory.map(h => h.monthLabel))];
    return months.map(m => {
      const items = selectedTech.kpiHistory.filter(h => h.monthLabel === m);
      return {
        monthLabel: m,
        reitero: items.reduce((a, b) => a + b.reitero, 0) / items.length,
        resolucion: items.reduce((a, b) => a + b.resolucion, 0) / items.length,
        deriva: items.reduce((a, b) => a + b.deriva, 0) / items.length,
        alarms: {
          pt: items.reduce((a, b) => a + b.alarms.pt, 0),
          ft: items.reduce((a, b) => a + b.alarms.ft, 0),
          rt: items.reduce((a, b) => a + b.alarms.rt, 0),
          ne: items.reduce((a, b) => a + b.alarms.ne, 0),
          ta: items.reduce((a, b) => a + b.alarms.ta, 0),
          ma: items.reduce((a, b) => a + b.alarms.ma, 0),
          te: items.reduce((a, b) => a + b.alarms.te, 0),
          tea: items.reduce((a, b) => a + b.alarms.tea, 0),
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
           
           {/* Control de Escala */}
           <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                 <button onClick={() => setTimeScale('monthly')} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', backgroundColor: timeScale === 'monthly' ? 'white' : 'transparent', fontWeight: '950', fontSize: '12px', cursor: 'pointer' }}>MENSUAL</button>
                 <button onClick={() => setTimeScale('weekly')} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', backgroundColor: timeScale === 'weekly' ? 'white' : 'transparent', fontWeight: '950', fontSize: '12px', cursor: 'pointer' }}>SEMANAL</button>
              </div>
           </div>

           {/* Gráficos Full Width */}
           <LineChart data={displayData} timeScale={timeScale} onPointClick={(p: any) => p.monthLabel && setTimeScale('weekly')} />
           <AlarmBarChart data={displayData} timeScale={timeScale} />

           {/* Tabla de Confirmación */}
           <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                       <th style={{ padding: '20px 32px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', fontWeight: '950' }}>{timeScale === 'monthly' ? 'MES' : 'SEMANA'}</th>
                       <th style={{ padding: '20px 32px', textAlign: 'center', fontSize: '11px', color: '#1e293b', fontWeight: '950' }}>REITERO</th>
                       <th style={{ padding: '20px 32px', textAlign: 'center', fontSize: '11px', color: '#1e293b', fontWeight: '950' }}>RESOLUCIÓN</th>
                       <th style={{ padding: '20px 32px', textAlign: 'center', fontSize: '11px', color: '#1e293b', fontWeight: '950' }}>DERIVA</th>
                       <th style={{ padding: '20px 32px', textAlign: 'right', fontSize: '11px', color: '#94a3b8', fontWeight: '950' }}>ESTADO</th>
                    </tr>
                 </thead>
                 <tbody>
                    {timeScale === 'weekly' ? selectedTech.kpiHistory.map((d: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                         <td style={{ padding: '20px 32px', fontWeight: '950', fontSize: '14px', color: '#1e293b' }}>{d.weekLabel}</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900', color: d.reitero > 15 ? '#ef4444' : '#1e293b' }}>{d.reitero.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900', color: d.resolucion < 75 ? '#ef4444' : '#10b981' }}>{d.resolucion.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900' }}>{d.deriva.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                            <WeekStatusIndicator status={d.status} />
                         </td>
                      </tr>
                    )) : displayData.map((d: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                         <td style={{ padding: '20px 32px', fontWeight: '950', fontSize: '14px', color: '#1e293b' }}>{d.monthLabel}</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900' }}>{d.reitero.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900' }}>{d.resolucion.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900' }}>{d.deriva.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'right' }}>-</td>
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
