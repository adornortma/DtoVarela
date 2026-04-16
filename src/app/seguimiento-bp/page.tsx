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
  CalendarCheck
} from 'lucide-react';

// --- Types ---
type WeeklyLoadStatus = 'full' | 'partial' | 'empty';

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

interface BPEvent {
  id: string;
  type: 'check' | 'action' | 'status_change';
  date: string;
  title: string;
  description: string;
  status?: 'mejora' | 'igual' | 'empeoro';
}

interface BPSession {
  id: string;
  techName: string;
  dni: string;
  cell: string;
  district: string;
  status: 'critico' | 'seguimiento' | 'mejora';
  mainKpi: number; 
  trend: 'up' | 'down' | 'stable';
  daysInBp: number;
  startDate: string;
  lastCheckDate: string;
  lastCheckStatus: 'mejora' | 'igual' | 'empeoro';
  kpiHistory: {
    week: string;
    reitero: number;
    resolucion: number;
    deriva: number;
    status: WeeklyLoadStatus;
    alarms: BPAlarmData;
  }[];
  actions: BPEvent[];
}

// --- Mock Data ---
const MOCK_BP_DATA: BPSession[] = [
  {
    id: '1',
    techName: 'STELLA SERGIO LEONEL',
    dni: '37653458',
    cell: 'VARELA 1',
    district: 'Varela',
    status: 'critico',
    mainKpi: 18.5,
    trend: 'down',
    daysInBp: 24,
    startDate: '2026-03-22',
    lastCheckDate: '2026-04-10',
    lastCheckStatus: 'empeoro',
    kpiHistory: [
      { 
        week: 'S11', reitero: 12, resolucion: 85, deriva: 5, status: 'full',
        alarms: { pt: 1, ft: 0, ta: 45, ma: 1, te: 50, rt: 2, ne: 1, tea: 15 } 
      },
      { 
        week: 'S12', reitero: 14, resolucion: 82, deriva: 7, status: 'full',
        alarms: { pt: 2, ft: 1, ta: 55, ma: 2, te: 48, rt: 4, ne: 2, tea: 20 } 
      },
      { 
        week: 'S13', reitero: 18, resolucion: 78, deriva: 9, status: 'full',
        alarms: { pt: 3, ft: 2, ta: 60, ma: 3, te: 45, rt: 8, ne: 4, tea: 25 } 
      },
      { 
        week: 'S14', reitero: 19.5, resolucion: 72, deriva: 11, status: 'partial',
        alarms: { pt: 4, ft: 3, ta: 75, ma: 4, te: 42, rt: 12, ne: 5, tea: 35 } 
      },
      { 
        week: 'S15', reitero: 18.5, resolucion: 74, deriva: 9.5, status: 'empty',
        alarms: { pt: 0, ft: 0, ta: 0, ma: 0, te: 0, rt: 0, ne: 0, tea: 0 } 
      },
    ],
    actions: [
      { id: 'a1', type: 'action', date: '2026-03-25', title: 'Acción Técnica', description: 'Revisión de herramientas y materiales' },
      { id: 'a2', type: 'action', date: '2026-04-05', title: 'Acompañamiento', description: 'Veeduría en campo por líder de célula' },
    ]
  }
];

// --- Subcomponents ---

const StatusBadge = ({ status }: { status: BPSession['status'] }) => {
  const config = {
    critico: { label: 'Crítico', bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
    seguimiento: { label: 'En seguimiento', bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
    mejora: { label: 'Mejora', bg: '#dcfce7', color: '#166534', dot: '#10b981' }
  };
  const { label, bg, color, dot } = config[status];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '14px', backgroundColor: bg, color, fontSize: '13px', fontWeight: '900', border: `1px solid ${dot}33` }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dot }} />
      {label}
    </div>
  );
};

const WeekStatusIndicator = ({ status }: { status: WeeklyLoadStatus }) => {
  const config = {
    full: { label: 'Completa', color: '#10b981', Icon: CheckCircle2 },
    partial: { label: 'Parcial', color: '#f59e0b', Icon: AlertTriangle },
    empty: { label: 'Sin carga', color: '#ef4444', Icon: CircleOff }
  };
  const { label, color, Icon } = config[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color, fontSize: '11px', fontWeight: '900' }}>
       <Icon size={14} />
       <span>{label.toUpperCase()}</span>
    </div>
  );
};

const MetricCard = ({ 
  label, 
  value, 
  previousValue, 
  isLowerBetter = true,
  unit = '%'
}: { 
  label: string, 
  value: number, 
  previousValue: number, 
  isLowerBetter?: boolean,
  unit?: string
}) => {
  const diff = value - previousValue;
  const isBetter = isLowerBetter ? diff < 0 : diff > 0;
  const isSame = diff === 0;
  
  const color = isSame ? '#64748b' : (isBetter ? '#10b981' : '#ef4444');
  const Icon = isSame ? Minus : (isBetter ? (isLowerBetter ? TrendingDown : TrendingUp) : (isLowerBetter ? TrendingUp : TrendingDown));

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h3 style={{ fontSize: '32px', fontWeight: '950', color: '#1e293b', letterSpacing: '-1.5px', margin: 0 }}>{value}{unit}</h3>
        <div style={{ display: 'flex', alignItems: 'center', color, gap: '2px', backgroundColor: `${color}10`, padding: '2px 8px', borderRadius: '8px' }}>
          <Icon size={16} strokeWidth={3} />
          <span style={{ fontSize: '13px', fontWeight: '900' }}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}{unit}</span>
        </div>
      </div>
    </div>
  );
};

const ViewToggle = ({ mode, setMode }: { mode: 'chart' | 'table', setMode: (m: 'chart' | 'table') => void }) => (
  <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '14px', gap: '4px' }}>
    <button 
        onClick={() => setMode('chart')}
        style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: mode === 'chart' ? 'white' : 'transparent', color: mode === 'chart' ? '#1e293b' : '#64748b', fontSize: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: mode === 'chart' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
    >
        <BarChart3 size={16} /> Gráfico
    </button>
    <button 
        onClick={() => setMode('table')}
        style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', backgroundColor: mode === 'table' ? 'white' : 'transparent', color: mode === 'table' ? '#1e293b' : '#64748b', fontSize: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: mode === 'table' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
    >
        <TableIcon size={16} /> Tabla
    </button>
  </div>
);

const KpiBlock = ({ history }: { history: BPSession['kpiHistory'] }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  
  const width = 1000;
  const height = 260;
  const padding = 60;
  const getY = (val: number) => height - ((val / 100) * (height - 2 * padding)) - padding;
  const getX = (i: number) => (i / (history.length - 1)) * (width - 2 * padding) + padding;

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '32px', border: '1px solid #e2e8f0' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ backgroundColor: '#eff6ff', padding: '6px', borderRadius: '10px', color: 'var(--movistar-blue)' }}><Activity size={18} /></div>
              <h2 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b' }}>Evolución de KPIs de Gestión</h2>
          </div>
          <ViewToggle mode={viewMode} setMode={setViewMode} />
       </div>

       {viewMode === 'chart' ? (
         <div style={{ width: '100%', overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                {[{ label: 'Reitero %', color: 'var(--movistar-blue)' }, { label: 'Resolución %', color: '#10b981' }, { label: 'Deriva %', color: '#f59e0b' }].map(k => (
                  <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: k.color }} />
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>{k.label}</span>
                  </div>
                ))}
            </div>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
              {[0, 50, 100].map(val => (
                <g key={val}>
                  <line x1={padding} y1={getY(val)} x2={width - padding} y2={getY(val)} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={padding - 10} y={getY(val)} textAnchor="end" alignmentBaseline="middle" fontSize="11" fill="#94a3b8" fontWeight="950">{val}%</text>
                </g>
              ))}
              <path d={history.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.reitero)}`).join(' ')} fill="none" stroke="var(--movistar-blue)" strokeWidth="5" strokeLinecap="round" />
              <path d={history.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.resolucion)}`).join(' ')} fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
              <path d={history.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.deriva)}`).join(' ')} fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" />
              
              {history.map((p, i) => (
                <g key={i}>
                  <text x={getX(i)} y={height - 5} textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="950">{p.week}</text>
                  <circle cx={getX(i)} cy={getY(p.reitero)} r="5" fill="white" stroke="var(--movistar-blue)" strokeWidth="3" />
                </g>
              ))}
            </svg>
         </div>
       ) : (
         <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                     <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: '950', color: '#94a3b8' }}>SEMANA</th>
                     <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '11px', fontWeight: '950', color: '#1e293b' }}>REITERO</th>
                     <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '11px', fontWeight: '950', color: '#1e293b' }}>RESOLUCIÓN</th>
                     <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '11px', fontWeight: '950', color: '#1e293b' }}>DERIVA</th>
                     <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '11px', fontWeight: '950', color: '#94a3b8' }}>ESTADO</th>
                  </tr>
               </thead>
               <tbody>
                  {history.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                       <td style={{ padding: '16px 24px', fontWeight: '950', fontSize: '14px' }}>{p.week}</td>
                       <td style={{ padding: '16px 24px', textAlign: 'center', fontWeight: '900', color: p.reitero > 15 ? '#ef4444' : '#1e293b', backgroundColor: p.reitero > 15 ? '#fef2f2' : 'transparent', borderRadius: '8px' }}>{p.reitero}%</td>
                       <td style={{ padding: '16px 24px', textAlign: 'center', fontWeight: '900', color: p.resolucion < 75 ? '#ef4444' : '#10b981' }}>{p.resolucion}%</td>
                       <td style={{ padding: '16px 24px', textAlign: 'center', fontWeight: '900' }}>{p.deriva}%</td>
                       <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <WeekStatusIndicator status={p.status} />
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
       )}
    </div>
  );
};

const AlarmBlock = ({ history }: { history: BPSession['kpiHistory'] }) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  
  const metrics = [
    { key: 'pt', label: 'PT', full: 'Primera Tarde', color: '#ef4444' },
    { key: 'ft', label: 'FT', full: 'Fin Temprano', color: '#f59e0b' },
    { key: 'rt', label: 'RT', full: 'Retrabajo', color: '#8b5cf6' },
    { key: 'ne', label: 'NE', full: 'No Efectiva', color: '#ec4899' },
    { key: 'ta', label: 'TA', full: 'Tiempo Almuerzo', color: '#10b981' },
    { key: 'tea', label: 'TEA', full: 'Tiempo Entre Actuaciones', color: '#64748b' }
  ] as const;

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '32px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#fff1f2', padding: '8px', borderRadius: '12px', color: '#ef4444' }}><AlertCircle size={20} /></div>
            <div>
               <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#1e293b' }}>Análisis de Alarmas</h2>
               <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '700' }}>Patrones operativos semanales cuantificados</p>
            </div>
         </div>
         <ViewToggle mode={viewMode} setMode={setViewMode} />
      </div>

      {viewMode === 'chart' ? (
        <div style={{ padding: '0 10px' }}>
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
              {metrics.slice(0, 4).map(m => (
                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: m.color }} />
                   <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748b' }}>{m.full}</span>
                </div>
              ))}
           </div>
           
           <div style={{ position: 'relative', height: '240px', width: '100%', paddingLeft: '40px' }}>
              {/* Vertical Scale */}
              <div style={{ position: 'absolute', left: 0, top: 0, height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textAlign: 'right', width: '30px' }}>
                 <span>15</span>
                 <span>10</span>
                 <span>5</span>
                 <span>0</span>
              </div>
              
              {/* Grid Lines */}
              {[0, 5, 10, 15].map(v => (
                <div key={v} style={{ position: 'absolute', left: '40px', right: 0, bottom: `${(v / 15) * 200 + 40}px`, borderTop: '1px solid #f1f5f9', zIndex: 0 }} />
              ))}

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', height: '200px', position: 'relative', zIndex: 1 }}>
                {history.map((week, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '100%', height: '160px', display: 'flex', alignItems: 'flex-end', gap: '4px', justifyContent: 'center' }}>
                        {metrics.slice(0, 4).map(m => (
                          <div key={m.key} title={`${m.full}: ${week.alarms[m.key]}`} style={{ 
                            width: '12px', 
                            height: `${Math.min((week.alarms[m.key] / 15) * 100, 100)}%`, 
                            backgroundColor: m.color, 
                            borderRadius: '4px 4px 0 0',
                            opacity: 0.9,
                            transition: 'height 0.3s ease'
                          }} />
                        ))}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '950', color: '#1e293b' }}>{week.week}</span>
                  </div>
                ))}
              </div>
           </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                 <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ padding: '12px', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textAlign: 'left' }}>Semana</th>
                    {metrics.map(m => (
                      <th key={m.key} title={m.full} style={{ padding: '12px', fontSize: '11px', fontWeight: '950', color: '#1e293b' }}>{m.label}</th>
                    ))}
                    <th style={{ padding: '12px', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textAlign: 'right' }}>ESTADO</th>
                 </tr>
              </thead>
              <tbody>
                 {history.map((week, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                       <td style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '950', fontSize: '13px' }}>{week.week}</td>
                       {metrics.map(m => {
                         const val = week.alarms[m.key];
                         const isHigh = val > 5;
                         return (
                           <td key={m.key} style={{ padding: '16px 12px', fontWeight: '900', color: isHigh ? '#ef4444' : '#1e293b', backgroundColor: isHigh ? '#fef2f2' : 'transparent', fontSize: '14px' }}>
                             {val}
                           </td>
                         )
                       })}
                       <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                          <WeekStatusIndicator status={week.status} />
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default function SeguimientoBP() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedTech, setSelectedTech] = useState<BPSession | null>(null);
  const [isActionsDrawerOpen, setIsActionsDrawerOpen] = useState(false);
  const [isCompleteWeekModalOpen, setIsCompleteWeekModalOpen] = useState(false);

  // --- Handlers ---
  const handleTechClick = (tech: BPSession) => {
    setSelectedTech(tech);
    setView('detail');
    window.scrollTo(0, 0);
  };

  const currentKpis = useMemo(() => {
    if (!selectedTech || selectedTech.kpiHistory.length < 2) return null;
    const history = selectedTech.kpiHistory;
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    return { current, previous };
  }, [selectedTech]);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '16px 40px 100px 40px', width: '100%' }}>
      
      {/* Header Identidad */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#94a3b8', fontSize: '13px', fontWeight: '800' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => view === 'detail' ? setView('list') : window.location.href = '/'}>Página Principal</span>
            <ChevronRight size={14} />
            <span style={{ color: view === 'list' ? 'var(--movistar-blue)' : '#94a3b8', fontWeight: '950' }} onClick={() => setView('list')}>Seguimiento BP</span>
            {view === 'detail' && (
              <>
                <ChevronRight size={14} />
                <span style={{ color: 'var(--movistar-blue)', fontWeight: '950' }}>{selectedTech?.techName}</span>
              </>
            )}
        </div>

        {view === 'detail' && (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px 32px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
               <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '16px', color: 'white' }}>
                  <User size={28} />
               </div>
               <div>
                  <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#1e293b', letterSpacing: '-1.5px', lineHeight: '1' }}>{selectedTech?.techName}</h1>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#64748b' }}>DNI: {selectedTech?.dni} • {selectedTech?.cell} • {selectedTech?.district}</span>
               </div>
            </div>
            <div style={{ display: 'flex', gap: '40px', borderLeft: '1px solid #f1f5f9', paddingLeft: '40px' }}>
               <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Ingreso BP</span>
                  <span style={{ fontSize: '15px', fontWeight: '950', color: '#1e293b' }}>{selectedTech?.startDate}</span>
               </div>
               <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Días en programa</span>
                  <span style={{ fontSize: '15px', fontWeight: '950', color: 'var(--movistar-blue)' }}>{selectedTech?.daysInBp} DÍAS</span>
               </div>
            </div>
          </div>
        )}
      </header>

      {view === 'list' ? (
        /* VISTA GLOBAL LIST */
        <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Técnico</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Estado</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>KPI Actual</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Días</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_BP_DATA.map((tech) => (
                <tr key={tech.id} onClick={() => handleTechClick(tech)} style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}>
                   <td style={{ padding: '20px 32px' }}>
                      <span style={{ display: 'block', fontWeight: '950', color: '#1e293b' }}>{tech.techName}</span>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>
                        <span>DNI: {tech.dni}</span>
                        <span>•</span>
                        <span>{tech.cell}</span>
                      </div>
                   </td>
                   <td style={{ padding: '20px 32px' }}><StatusBadge status={tech.status} /></td>
                   <td style={{ padding: '20px 32px', textAlign: 'center' }}><span style={{ fontWeight: '950', fontSize: '18px' }}>{tech.mainKpi}%</span></td>
                   <td style={{ padding: '20px 32px', textAlign: 'center' }}>{tech.daysInBp}</td>
                </tr>
              ))}
            </tbody>
           </table>
        </div>
      ) : (
        /* VISTA DETALLE */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Bloque Superior de KPIs Actuales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
             <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: selectedTech?.status === 'critico' ? '#fee2e2' : (selectedTech?.status === 'mejora' ? '#dcfce7' : '#fef3c7'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedTech?.status === 'critico' ? '#ef4444' : (selectedTech?.status === 'mejora' ? '#10b981' : '#f59e0b') }}>
                    <AlertCircle size={24} strokeWidth={2.5} />
                </div>
                <div>
                   <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Estado Actual</span>
                   <h4 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b', lineHeight: 1.2 }}>{selectedTech?.status.toUpperCase()}</h4>
                   <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>Check: {selectedTech?.lastCheckStatus.toUpperCase()}</span>
                </div>
             </div>
             
             <MetricCard label="Reitero Actual" value={currentKpis?.current.reitero ?? 0} previousValue={currentKpis?.previous.reitero ?? 0} />
             <MetricCard label="Resolución Actual" value={currentKpis?.current.resolucion ?? 0} previousValue={currentKpis?.previous.resolucion ?? 0} isLowerBetter={false} />
             <MetricCard label="Deriva Actual" value={currentKpis?.current.deriva ?? 0} previousValue={currentKpis?.previous.deriva ?? 0} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
             <button 
                onClick={() => setIsCompleteWeekModalOpen(true)}
                style={{ backgroundColor: 'var(--movistar-blue)', border: 'none', padding: '12px 24px', borderRadius: '16px', color: 'white', fontSize: '14px', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
             >
                <CalendarCheck size={18} /> COMPLETAR SEMANA ACTUAL
             </button>
          </div>

          <KpiBlock history={selectedTech?.kpiHistory || []} />

          <AlarmBlock history={selectedTech?.kpiHistory || []} />

          {/* Acciones Históricas */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
             <button 
                onClick={() => setIsActionsDrawerOpen(true)}
                style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', padding: '16px 32px', borderRadius: '24px', color: '#64748b', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
             >
                <History size={18} /> VER HISTORIAL DE ACCIONES Y NOTAS
             </button>
          </div>
        </div>
      )}

      {/* Modal Completar Semana (New Action Flow) */}
      {isCompleteWeekModalOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
           <div onClick={() => setIsCompleteWeekModalOpen(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)' }} />
           <div style={{ position: 'relative', width: '100%', maxWidth: '600px', backgroundColor: 'white', borderRadius: '32px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                 <div>
                    <h3 style={{ fontSize: '24px', fontWeight: '950', color: '#1e293b' }}>Completar Seguimiento Semanal</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Semana S15 •STELLA SERGIO LEONEL</p>
                 </div>
                 <button onClick={() => setIsCompleteWeekModalOpen(false)} style={{ border: 'none', backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {[
                      { key: 'pt', label: 'PT (1ra Tarde)' },
                      { key: 'ft', label: 'FT (Fin Temprano)' },
                      { key: 'rt', label: 'RT (Retrabajo)' },
                      { key: 'ne', label: 'NE (No Efectiva)' },
                      { key: 'ta', label: 'TA (T. Almuerzo)' },
                      { key: 'tea', label: 'TEA (T. e. Act.)' },
                    ].map(m => (
                      <div key={m.key}>
                         <label style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#94a3b8', marginBottom: '6px' }}>{m.label}</label>
                         <input type="number" defaultValue={0} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '800' }} />
                      </div>
                    ))}
                 </div>

                 <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#94a3b8', marginBottom: '12px' }}>ESTADO DE LA SEMANA</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                       {['mejoró', 'igual', 'empeoró'].map(val => (
                         <button key={val} style={{ padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', cursor: 'pointer' }}>{val}</button>
                       ))}
                    </div>
                 </div>

                 <button 
                  onClick={() => setIsCompleteWeekModalOpen(false)}
                  style={{ backgroundColor: 'var(--movistar-blue)', color: 'white', padding: '16px', borderRadius: '16px', border: 'none', fontSize: '15px', fontWeight: '950', marginTop: '20px', cursor: 'pointer' }}
                 >
                    GUARDAR SEMANA S15
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Actions Drawer */}
      {isActionsDrawerOpen && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10000 }}>
           <div onClick={() => setIsActionsDrawerOpen(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }} />
           <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '450px', backgroundColor: 'white', padding: '40px', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                 <h3 style={{ fontSize: '24px', fontWeight: '950', color: '#1e293b' }}>Intervenciones</h3>
                 <button onClick={() => setIsActionsDrawerOpen(false)} style={{ border: 'none', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                 {selectedTech?.actions.map(a => (
                   <div key={a.id}>
                      <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8' }}>{a.date}</span>
                      <h5 style={{ fontSize: '16px', fontWeight: '950', color: '#1e293b', margin: '4px 0' }}>{a.title}</h5>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', lineHeight: '1.5' }}>{a.description}</p>
                   </div>
                 ))}
                 <button style={{ marginTop: '20px', padding: '16px', borderRadius: '16px', border: '2px dashed #e2e8f0', color: '#94a3b8', fontSize: '13px', fontWeight: '900', cursor: 'pointer', backgroundColor: 'transparent' }}>+ AGREGAR REGISTRO</button>
              </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        * { box-sizing: border-box; }
        @font-face {
          font-family: 'Inter';
          src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        }
        body { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}
