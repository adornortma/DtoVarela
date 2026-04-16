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
  Save,
  Plus
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
    id: string;
    weekLabel: string;
    shortLabel: string;
    monthLabel: string;
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
    { id: 'w1', weekLabel: '03/03 - 09/03', shortLabel: '03/03', monthLabel: 'MARZO', reitero: 11, resolucion: 86, deriva: 4, status: 'full', alarms: { pt: 0, ft: 0, ta: 40, ma: 0, te: 52, rt: 1, ne: 0, tea: 12 } },
    { id: 'w2', weekLabel: '10/03 - 16/03', shortLabel: '10/03', monthLabel: 'MARZO', reitero: 12.5, resolucion: 84, deriva: 5, status: 'full', alarms: { pt: 1, ft: 0, ta: 42, ma: 1, te: 50, rt: 2, ne: 1, tea: 14 } },
    { id: 'w3', weekLabel: '17/03 - 23/03', shortLabel: '17/03', monthLabel: 'MARZO', reitero: 14, resolucion: 82, deriva: 6.5, status: 'full', alarms: { pt: 2, ft: 1, ta: 50, ma: 2, te: 48, rt: 4, ne: 2, tea: 18 } },
    { id: 'w4', weekLabel: '24/03 - 30/03', shortLabel: '24/03', monthLabel: 'MARZO', reitero: 16.5, resolucion: 78, deriva: 8, status: 'full', alarms: { pt: 3, ft: 2, ta: 60, ma: 3, te: 45, rt: 7, ne: 3, tea: 22 } },
    { id: 'w5', weekLabel: '31/03 - 06/04', shortLabel: '31/03', monthLabel: 'ABRIL', reitero: 18, resolucion: 75, deriva: 9.5, status: 'full', alarms: { pt: 4, ft: 2, ta: 65, ma: 4, te: 43, rt: 10, ne: 4, tea: 28 } },
    { id: 'w6', weekLabel: '07/04 - 13/04', shortLabel: '07/04', monthLabel: 'ABRIL', reitero: 19.5, resolucion: 72, deriva: 11, status: 'partial', alarms: { pt: 0, ft: 0, ta: 0, ma: 0, te: 0, rt: 0, ne: 0, tea: 0 } },
    { id: 'w7', weekLabel: '14/04 - 20/04', shortLabel: '14/04', monthLabel: 'ABRIL', reitero: 18.5, resolucion: 74, deriva: 9.5, status: 'empty', alarms: { pt: 0, ft: 0, ta: 0, ma: 0, te: 0, rt: 0, ne: 0, tea: 0 } },
  ],
  actions: [
    { id: '1', type: 'Acompañamiento', date: '2026-03-25', title: 'Veeduría en Campo', description: 'Se observa falta de orden en herramientas. Se construye plan de acción inmediato.', weekAssoc: '17/03' },
  ]
};

// --- Subcomponents ---

const WeekStatusIndicator = ({ status, onAction }: any) => {
  const config = {
    full: { color: '#10b981', Icon: CheckCircle2, label: 'Completa' },
    partial: { color: '#f59e0b', Icon: AlertTriangle, label: 'Parcial' },
    empty: { color: '#ef4444', Icon: CircleOff, label: 'Sin Carga' }
  };
  const { color, Icon, label } = config[status as WeeklyLoadStatus];

  if (status === 'full') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color }}>
        <Icon size={18} /> <span style={{ fontSize: '12px', fontWeight: '900' }}>{label}</span>
      </div>
    );
  }

  return (
    <button 
      onClick={onAction}
      style={{ 
        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '10px', 
        border: `1.5px solid ${color}`, backgroundColor: 'white', color, cursor: 'pointer',
        fontWeight: '950', fontSize: '11px', transition: 'all 0.2s'
      }}
    >
      <Icon size={14} /> {status === 'empty' ? 'CARGAR' : 'COMPLETAR'}
    </button>
  );
};

const KpiCard = ({ label, value, trend, variation }: any) => (
  <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', flex: 1 }}>
     <p style={{ fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</p>
     <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
        <h4 style={{ fontSize: '28px', fontWeight: '950', color: '#1e293b', margin: 0 }}>{value}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', color: trend === 'up' ? '#ef4444' : '#10b981' }}>
           {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
           <span style={{ fontSize: '12px', fontWeight: '900' }}>{variation}</span>
        </div>
     </div>
  </div>
);

const LoadWeekModal = ({ week, onClose, onSave }: any) => {
  const [formData, setFormData] = useState({
    alarms: { pt: 0, ft: 0, ta: 0, ma: 0, te: 0, rt: 0, ne: 0, tea: 0 },
    evolutionStatus: 'igual'
  });

  const handleAlarmChange = (key: keyof BPAlarmData, val: string) => {
    const num = parseInt(val) || 0;
    if (num < 0) return;
    setFormData(prev => ({ ...prev, alarms: { ...prev.alarms, [key]: num } }));
  };

  const alarmLabels: Record<keyof BPAlarmData, string> = {
    pt: 'Primera Tarde', ft: 'Fin Temprano', ta: 'Tiempo Almuerzo', ma: 'Momento Almuerzo',
    te: 'Tiempo Ejecución', rt: 'Retrabajo', ne: 'No Efectiva', tea: 'Tiempo Entre Actuaciones'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
       <div style={{ backgroundColor: 'white', borderRadius: '32px', width: '100%', maxWidth: '640px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
          <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
                <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#1e293b' }}>Carga de Semana</h2>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#94a3b8', marginTop: '4px' }}>Semana {week.weekLabel}</p>
             </div>
             <button onClick={onClose} style={{ border: 'none', backgroundColor: '#f1f5f9', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}><X size={20}/></button>
          </div>

          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px', maxHeight: '70vh', overflowY: 'auto' }}>
             
             {/* Bloque 1: Alarmas */}
             <section>
                <h3 style={{ fontSize: '14px', fontWeight: '950', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <AlertCircle size={16} color="#ef4444" /> REGISTRO DE ALARMAS (OBLIGATORIO)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                   {(Object.keys(alarmLabels) as Array<keyof BPAlarmData>).map(key => (
                     <div key={key}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>{alarmLabels[key]}</label>
                        <input 
                          type="number" 
                          min="0"
                          value={formData.alarms[key]} 
                          onChange={(e) => handleAlarmChange(key, e.target.value)}
                          style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2.5px solid #f1f5f9', fontSize: '14px', fontWeight: '900', outline: 'none' }} 
                        />
                     </div>
                   ))}
                </div>
             </section>

             {/* Bloque 2: KPIs */}
             <section style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                 <h3 style={{ fontSize: '14px', fontWeight: '950', color: '#1e293b', marginBottom: '12px' }}>VISTA DE KPIs (Móvil)</h3>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    {[
                      { l: 'Reitero', v: `${week.reitero}%` },
                      { l: 'Resolución', v: `${week.resolucion}%` },
                      { l: 'Deriva', v: `${week.deriva}%` }
                    ].map(k => (
                      <div key={k.l}>
                         <p style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', margin: '0 0 4px 0' }}>{k.l}</p>
                         <p style={{ fontSize: '16px', fontWeight: '950', color: '#1e293b', margin: 0 }}>{k.v}</p>
                      </div>
                    ))}
                 </div>
             </section>

             {/* Bloque 3: Estado */}
             <section>
                <h3 style={{ fontSize: '14px', fontWeight: '950', color: '#1e293b', marginBottom: '12px' }}>ESTADO DE LA SEMANA</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                   {['Mejoró', 'Igual', 'Empeoró'].map(st => (
                     <button 
                      key={st}
                      onClick={() => setFormData(p => ({ ...p, evolutionStatus: st.toLowerCase() }))}
                      style={{ 
                        flex: 1, padding: '12px', borderRadius: '14px', border: '2.5px solid',
                        borderColor: formData.evolutionStatus === st.toLowerCase() ? 'var(--movistar-blue)' : '#f1f5f9',
                        backgroundColor: formData.evolutionStatus === st.toLowerCase() ? '#eff6ff' : 'white',
                        color: formData.evolutionStatus === st.toLowerCase() ? 'var(--movistar-blue)' : '#64748b',
                        fontWeight: '950', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                     >{st}</button>
                   ))}
                </div>
             </section>
          </div>

          <div style={{ padding: '32px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '16px' }}>
             <button onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '2.5px solid #f1f5f9', color: '#64748b', fontWeight: '950', cursor: 'pointer' }}>CANCELAR</button>
             <button onClick={() => onSave(formData)} style={{ flex: 2, padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: 'var(--movistar-blue)', color: 'white', fontWeight: '950', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Save size={18} /> GUARDAR SEMANA
             </button>
          </div>
       </div>
    </div>
  );
};

// --- Charts --- (Simplified versions of previous implementations for local render)
const LineChart = ({ data, timeScale }: any) => {
  const width = 1200; const height = 240; const padding = 60;
  const getY = (val: number) => height - ((val / 100) * (height - 2 * padding)) - padding;
  const getX = (i: number) => (i / (data.length - 1)) * (width - 2 * padding) + padding;

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '32px', padding: '32px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b', marginBottom: '24px' }}>Evolución Técnica</h3>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
         {[0, 25, 50, 75, 100].map(v => (
           <g key={v}><line x1={padding} y1={getY(v)} x2={width - padding} y2={getY(v)} stroke="#f1f5f9" /><text x={padding - 10} y={getY(v)} textAnchor="end" fontSize="11" fill="#94a3b8" fontWeight="800">{v}%</text></g>
         ))}
         <path d={data.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.reitero)}`).join(' ')} fill="none" stroke="var(--movistar-blue)" strokeWidth="6" strokeLinecap="round" />
         <path d={data.map((d: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.resolucion)}`).join(' ')} fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" />
         {data.map((d: any, i: number) => <circle key={i} cx={getX(i)} cy={getY(d.reitero)} r="6" fill="white" stroke="var(--movistar-blue)" strokeWidth="3" />)}
      </svg>
    </div>
  );
};

const AlarmChart = ({ data }: any) => {
  const width = 1200; const height = 180; const padding = 60;
  const metrics = [{ k: 'pt', c: '#ef4444' }, { k: 'ft', c: '#f59e0b' }, { k: 'rt', c: '#8b5cf6' }];
  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '32px', padding: '32px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b', marginBottom: '24px' }}>Impacto de Alarmas</h3>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: height + 'px' }}>
         {data.map((d: any, i: number) => (
           <div key={i} style={{ flex: 1, display: 'flex', gap: '2px', alignItems: 'flex-end', justifyContent: 'center' }}>
              {metrics.map(m => <div key={m.k} style={{ width: '12px', height: `${(d.alarms[m.k] / 15) * 100}%`, backgroundColor: m.c, borderRadius: '2px 2px 0 0' }} />)}
           </div>
         ))}
      </div>
    </div>
  );
};

export default function SeguimientoBP() {
  const [activeTab, setActiveTab] = useState<'data' | 'actions'>('data');
  const [loadingWeek, setLoadingWeek] = useState<any>(null);
  const [selectedTech] = useState<BPSession>(MOCK_BP_DATA);

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '16px 40px 120px 40px', width: '100%', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Fijo */}
      <header style={{ marginBottom: '40px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: '#94a3b8', fontSize: '13px', fontWeight: '800' }}>
            <span>Dashboard Principal</span><ChevronRight size={14} />
            <span style={{ color: 'var(--movistar-blue)', fontWeight: '950' }}>Detalle Seguimiento BP</span>
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
           
           {/* 1. KPIs RESUMEN (Cards) */}
           <div style={{ display: 'flex', gap: '24px' }}>
              <KpiCard label="ESTADO" value={selectedTech.status.toUpperCase()} trend="down" variation="Crítico" />
              <KpiCard label="REITERO ACTUAL" value="18.5%" trend="up" variation="+1.5%" />
              <KpiCard label="RESOLUCIÓN" value="74%" trend="down" variation="-2%" />
              <KpiCard label="DERIVA" value="9.5%" trend="up" variation="+0.8%" />
           </div>

           {/* 2. TABLA DE KPIs (Moved Up + Interactive) */}
           <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '24px 32px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '950', color: '#1e293b' }}>Registro Histórico Semanal</h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                     {['MARZO', 'ABRIL'].map(m => <div key={m} style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8' }}>{m}</div>)}
                  </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                       <th style={{ padding: '20px 32px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', fontWeight: '950' }}>SEMANA</th>
                       <th style={{ padding: '20px 32px', textAlign: 'center', fontSize: '11px', color: '#1e293b', fontWeight: '950' }}>REITERO</th>
                       <th style={{ padding: '20px 32px', textAlign: 'center', fontSize: '11px', color: '#1e293b', fontWeight: '950' }}>RESOLUCIÓN</th>
                       <th style={{ padding: '20px 32px', textAlign: 'center', fontSize: '11px', color: '#1e293b', fontWeight: '950' }}>DERIVA</th>
                       <th style={{ padding: '20px 32px', textAlign: 'right', fontSize: '11px', color: '#94a3b8', fontWeight: '950' }}>GESTIÓN / ESTADO</th>
                    </tr>
                 </thead>
                 <tbody>
                    {selectedTech.kpiHistory.map((d: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f8fafc', backgroundColor: d.status === 'empty' ? '#fffafb' : 'transparent' }}>
                         <td style={{ padding: '20px 32px', fontWeight: '950', fontSize: '14px', color: '#1e293b' }}>{d.weekLabel}</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900', color: d.reitero > 15 ? '#ef4444' : '#1e293b' }}>{d.reitero.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900', color: d.resolucion < 75 ? '#ef4444' : '#10b981' }}>{d.resolucion.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'center', fontWeight: '900' }}>{d.deriva.toFixed(1)}%</td>
                         <td style={{ padding: '20px 32px', textAlign: 'right', minWidth: '180px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                               <WeekStatusIndicator status={d.status} onAction={() => setLoadingWeek(d)} />
                            </div>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           {/* 3. GRÁFICO DE KPIs */}
           <LineChart data={selectedTech.kpiHistory} timeScale="weekly" />

           {/* 4. GRÁFICO DE ALARMAS */}
           <AlarmChart data={selectedTech.kpiHistory} />
        </div>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
           <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#1e293b' }}>Historial de Acciones</h2>
           {selectedTech.actions.map(action => (
             <div key={action.id} style={{ display: 'flex', gap: '32px', padding: '24px 0' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', border: '2px solid var(--movistar-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Calendar size={18} color="var(--movistar-blue)" />
                </div>
                <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', flex: 1 }}>
                   <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8' }}>{action.type} • {action.weekAssoc}</span>
                   <h4 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b', marginTop: '4px' }}>{action.title}</h4>
                   <p style={{ fontSize: '14px', color: '#475569', fontWeight: '700', margin: '8px 0 0 0' }}>{action.description}</p>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Modal de Carga */}
      {loadingWeek && (
        <LoadWeekModal 
          week={loadingWeek} 
          onClose={() => setLoadingWeek(null)} 
          onSave={() => setLoadingWeek(null)} 
        />
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
