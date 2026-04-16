'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Activity,
  Calendar,
  Info,
  History,
  Plus,
  ArrowLeft,
  Filter,
  Search,
  X,
  Target,
  ArrowUpRight,
  MapPin,
  ClipboardList,
  Fingerprint,
  ChevronDown,
  Layout
} from 'lucide-react';

// --- Types ---
interface BPEvent {
  id: string;
  type: 'check' | 'action' | 'status_change' | 'alert';
  date: string;
  title: string;
  description: string;
  status?: 'mejora' | 'igual' | 'empeoro';
  alarms?: string[];
}

interface BPSession {
  id: string;
  techName: string;
  cell: string;
  district: string;
  status: 'critico' | 'seguimiento' | 'mejora';
  mainKpi: number; // e.g. Reitero %
  trend: 'up' | 'down' | 'stable';
  daysInBp: number;
  startDate: string;
  lastCheckDate: string;
  lastAction: string;
  kpiHistory: {
    week: string;
    reitero: number;
    resolucion: number;
    deriva: number;
    alarms: string[];
  }[];
  checks: BPEvent[];
  actions: BPEvent[];
}

// --- Mock Data ---
const MOCK_BP_DATA: BPSession[] = [
  {
    id: '1',
    techName: 'GARCIA JUAN CARLOS',
    cell: 'VARELA 1',
    district: 'Varela',
    status: 'critico',
    mainKpi: 18.5,
    trend: 'down',
    daysInBp: 24,
    startDate: '2026-03-22',
    lastCheckDate: '2026-04-10',
    lastAction: 'Charla técnica presencial',
    kpiHistory: [
      { week: 'S11', reitero: 12, resolucion: 85, deriva: 5, alarms: [] },
      { week: 'S12', reitero: 14, resolucion: 82, deriva: 7, alarms: ['Reitero subiendo'] },
      { week: 'S13', reitero: 18, resolucion: 78, deriva: 9, alarms: ['Reitero alto', 'Baja resolución'] },
      { week: 'S14', reitero: 19, resolucion: 75, deriva: 11, alarms: ['Reitero crítico', 'Deriva alta'] },
      { week: 'S15', reitero: 18.5, resolucion: 76, deriva: 10, alarms: ['Reitero crítico'] },
    ],
    checks: [
      { id: 'c1', type: 'check', date: '2026-04-02', title: 'Check Semanal', description: 'Se mantiene igual, sin cambios significativos', status: 'igual' },
      { id: 'c2', type: 'check', date: '2026-04-10', title: 'Check Semanal', description: 'Ligera mejora en resolución, reitero sigue alto', status: 'mejora' },
    ],
    actions: [
      { id: 'a1', type: 'action', date: '2026-03-25', title: 'Acción Técnica', description: 'Revisión de herramientas y materiales' },
      { id: 'a2', type: 'action', date: '2026-04-05', title: 'Acompañamiento', description: 'Veeduría en campo por líder de célula' },
    ]
  },
  {
    id: '2',
    techName: 'RODRIGUEZ ARIEL',
    cell: 'VARELA 2',
    district: 'Varela',
    status: 'seguimiento',
    mainKpi: 14.2,
    trend: 'stable',
    daysInBp: 45,
    startDate: '2026-03-01',
    lastCheckDate: '2026-04-14',
    lastAction: 'Refuerzo en protocolos TOA',
    kpiHistory: [
      { week: 'S11', reitero: 15, resolucion: 80, deriva: 8, alarms: ['Reitero alto'] },
      { week: 'S12', reitero: 16, resolucion: 79, deriva: 7, alarms: ['Reitero alto'] },
      { week: 'S13', reitero: 14, resolucion: 81, deriva: 6, alarms: [] },
      { week: 'S14', reitero: 14.5, resolucion: 82, deriva: 5, alarms: [] },
      { week: 'S15', reitero: 14.2, resolucion: 83, deriva: 4, alarms: [] },
    ],
    checks: [
      { id: 'c1', type: 'check', date: '2026-04-14', title: 'Check Semanal', description: 'Estabilidad en los indicadores principales', status: 'igual' },
    ],
    actions: [
      { id: 'a1', type: 'action', date: '2026-03-20', title: 'Feedback Directo', description: 'Revisión mensual de objetivos' }
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

const KpiChart = ({ history }: { history: BPSession['kpiHistory'] }) => {
  const width = 1000;
  const height = 300;
  const padding = 60;
  const maxVal = 100;
  const minVal = 0;
  
  const getX = (index: number) => (index / (history.length - 1)) * (width - 2 * padding) + padding;
  const getY = (val: number) => height - ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding) - padding;

  const createPath = (key: 'reitero' | 'resolucion' | 'deriva') => {
    return history.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p[key])}`).join(' ');
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: '#fff', borderRadius: '32px', padding: '32px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', gap: '32px', marginBottom: '32px' }}>
          {[{ key: 'reitero', label: 'Reitero %', color: 'var(--movistar-blue)' }, { key: 'resolucion', label: 'Resolución %', color: '#10b981' }, { key: 'deriva', label: 'Deriva %', color: '#f59e0b' }].map(k => (
            <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <div style={{ width: '14px', height: '14px', borderRadius: '5px', backgroundColor: k.color }} />
               <span style={{ fontSize: '14px', fontWeight: '950', color: '#1e293b' }}>{k.label}</span>
            </div>
          ))}
      </div>
      
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Grid Lines */}
        {[0, 25, 50, 75, 100].map(val => (
          <g key={val}>
            <line x1={padding} y1={getY(val)} x2={width - padding} y2={getY(val)} stroke="#f1f5f9" strokeWidth="1.5" />
            <text x={padding - 15} y={getY(val)} textAnchor="end" alignmentBaseline="middle" fontSize="12" fill="#94a3b8" fontWeight="900">{val}%</text>
          </g>
        ))}

        {/* Lines */}
        <path d={createPath('reitero')} fill="none" stroke="var(--movistar-blue)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 6px 12px rgba(1, 157, 244, 0.2))' }} />
        <path d={createPath('resolucion')} fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 6px 12px rgba(16, 185, 129, 0.2))' }} />
        <path d={createPath('deriva')} fill="none" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 6px 12px rgba(245, 158, 11, 0.2))' }} />

        {/* Start BP Indicator */}
        <line x1={getX(0)} y1={padding} x2={getX(0)} y2={height - padding} stroke="#ef4444" strokeWidth="2" strokeDasharray="6,4" />
        <text x={getX(0)} y={padding - 10} textAnchor="middle" fontSize="11" fill="#ef4444" fontWeight="950">📍 INICIO BP</text>

        {/* Points */}
        {history.map((p, i) => (
          <g key={i}>
            <text x={getX(i)} y={height - 5} textAnchor="middle" fontSize="13" fill="#1e293b" fontWeight="950">{p.week}</text>
            <circle cx={getX(i)} cy={getY(p.reitero)} r="7" fill="white" stroke="var(--movistar-blue)" strokeWidth="4" />
            <circle cx={getX(i)} cy={getY(p.resolucion)} r="7" fill="white" stroke="#10b981" strokeWidth="4" />
            <circle cx={getX(i)} cy={getY(p.deriva)} r="7" fill="white" stroke="#f59e0b" strokeWidth="4" />
          </g>
        ))}
      </svg>
    </div>
  );
};

export default function SeguimientoBP() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedTech, setSelectedTech] = useState<BPSession | null>(null);
  const [isActionsDrawerOpen, setIsActionsDrawerOpen] = useState(false);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);

  // --- Handlers ---
  const handleTechClick = (tech: BPSession) => {
    setSelectedTech(tech);
    setView('detail');
    window.scrollTo(0, 0);
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '16px 40px 100px 40px', width: '100%' }}>
      
      {/* 1. HEADER - IDENTIDAD (Solo en detalle) */}
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
                  <div style={{ display: 'flex', gap: '16px', marginTop: '4px', color: '#64748b', fontSize: '13px', fontWeight: '800' }}>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {selectedTech?.cell} • {selectedTech?.district}</span>
                  </div>
               </div>
            </div>
            <div style={{ display: 'flex', gap: '40px', borderLeft: '1px solid #f1f5f9', paddingLeft: '40px' }}>
               <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Inicio Seguimiento</span>
                  <span style={{ fontSize: '15px', fontWeight: '950', color: '#1e293b' }}>{selectedTech?.startDate}</span>
               </div>
               <div>
                  <span style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Días transcurridos</span>
                  <span style={{ fontSize: '15px', fontWeight: '950', color: 'var(--movistar-blue)' }}>{selectedTech?.daysInBp} DÍAS</span>
               </div>
            </div>
          </div>
        )}

        {view === 'list' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.8px' }}>Seguimiento BP</h1>
              <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '800' }}>Gestión histórica de técnicos en bajo desempeño</p>
            </div>
            <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '20px', color: 'white' }}>
              <Target size={28} />
            </div>
          </div>
        )}
      </header>

      {view === 'list' ? (
        /* VISTA GLOBAL TABLE */
        <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Técnico</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Estado</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>KPI Actual</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Días BP</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Próximo Paso</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_BP_DATA.map((tech) => (
                <tr key={tech.id} onClick={() => handleTechClick(tech)} style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}>
                   <td style={{ padding: '20px 32px' }}>
                      <span style={{ display: 'block', fontWeight: '950', color: '#1e293b' }}>{tech.techName}</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>{tech.cell}</span>
                   </td>
                   <td style={{ padding: '20px 32px' }}><StatusBadge status={tech.status} /></td>
                   <td style={{ padding: '20px 32px', textAlign: 'center' }}>
                      <span style={{ fontWeight: '950', fontSize: '18px', color: '#1e293b' }}>{tech.mainKpi}%</span>
                   </td>
                   <td style={{ padding: '20px 32px', textAlign: 'center' }}>{tech.daysInBp}</td>
                   <td style={{ padding: '20px 32px' }}>
                      <button style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>GESTIONAR</button>
                   </td>
                </tr>
              ))}
            </tbody>
           </table>
        </div>
      ) : (
        /* 2. ESTADO ACTUAL + 3. HISTORIA DE KPIs */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* BLOQUE ESTADO ACTUAL */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
             <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '32px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '24px', 
                  backgroundColor: selectedTech?.status === 'critico' ? '#fee2e2' : selectedTech?.status === 'seguimiento' ? '#fef3c7' : '#dcfce7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: selectedTech?.status === 'critico' ? '#ef4444' : selectedTech?.status === 'seguimiento' ? '#f59e0b' : '#10b981'
                }}>
                   <AlertCircle size={32} strokeWidth={2.5} />
                </div>
                <div>
                   <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>ESTADO HOY</span>
                   <h4 style={{ fontSize: '20px', fontWeight: '950', color: '#1e293b' }}>{selectedTech?.status.toUpperCase()}</h4>
                </div>
             </div>

             <div style={{ backgroundColor: '#fff', borderRadius: '32px', padding: '32px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '24px' }}>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>REITERO ACTUAL</span>
                  <span style={{ fontSize: '36px', fontWeight: '950', color: 'var(--movistar-blue)', letterSpacing: '-2px', lineHeight: '1' }}>{selectedTech?.mainKpi}%</span>
               </div>
             </div>

             <div style={{ backgroundColor: '#fff', borderRadius: '32px', padding: '32px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ 
                  width: '56px', height: '56px', borderRadius: '20px', backgroundColor: selectedTech?.trend === 'up' ? '#ecfdf5' : '#fef2f2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: selectedTech?.trend === 'up' ? '#10b981' : '#ef4444'
                }}>
                   {selectedTech?.trend === 'up' ? <TrendingUp size={28} strokeWidth={3} /> : <TrendingDown size={28} strokeWidth={3} />}
                </div>
                <div>
                   <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>TENDENCIA</span>
                   <h4 style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b' }}>{selectedTech?.trend === 'up' ? 'Mejorando' : 'Empeorando'}</h4>
                </div>
             </div>
          </section>

          {/* HISTORIA DE KPIs - EL PROTAGONISTA */}
          <section>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '12px', color: 'var(--movistar-blue)' }}><Activity size={20} /></div>
                <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#1e293b' }}>Evolución Histórica de KPIs</h2>
             </div>
             <KpiChart history={selectedTech?.kpiHistory || []} />
          </section>

          {/* 4. HISTORIA DE ALARMAS (PATRONES) & 5. HISTORIA DE CHECKS (PERCEPCIÓN) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            
            {/* HISTORIA DE ALARMAS */}
            <section style={{ backgroundColor: 'white', borderRadius: '32px', padding: '32px', border: '1px solid #e2e8f0' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                  <div style={{ backgroundColor: '#fef2f2', padding: '8px', borderRadius: '12px', color: '#ef4444' }}><AlertCircle size={20} /></div>
                  <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#1e293b' }}>Historia de Alarmas (Patrones)</h2>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {selectedTech?.kpiHistory.slice().reverse().map(week => (
                    <div key={week.week} style={{ borderBottom: '1px solid #f8fafc', paddingBottom: '16px' }}>
                       <div style={{ fontSize: '12px', fontWeight: '950', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>Semana {week.week}</div>
                       <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {week.alarms.length > 0 ? week.alarms.map((a, i) => (
                            <span key={i} style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '900', border: '1px solid rgba(239, 68, 68, 0.1)' }}>{a}</span>
                          )) : (
                            <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '800' }}>✓ Sin alarmas detectadas</span>
                          )}
                       </div>
                    </div>
                  ))}
               </div>
            </section>

            {/* HISTORIA DE CHECKS (PERCEPCIÓN) */}
            <section style={{ backgroundColor: 'white', borderRadius: '32px', padding: '32px', border: '1px solid #e2e8f0' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                  <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '12px', color: '#10b981' }}><ClipboardList size={20} /></div>
                  <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#1e293b' }}>Percepción del Seguimiento</h2>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {selectedTech?.checks.slice().reverse().map(check => (
                    <div key={check.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                       <div style={{ 
                         width: '12px', height: '12px', borderRadius: '50%', marginTop: '5px',
                         backgroundColor: check.status === 'mejora' ? '#10b981' : check.status === 'igual' ? '#f59e0b' : '#ef4444',
                         flexShrink: 0
                       }} />
                       <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                             <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8' }}>{check.date}</span>
                             <span style={{ fontSize: '11px', fontWeight: '950', color: check.status === 'mejora' ? '#10b981' : check.status === 'igual' ? '#f59e0b' : '#ef4444', textTransform: 'uppercase' }}>• {check.status}</span>
                          </div>
                          <p style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', lineHeight: '1.4' }}>{check.description}</p>
                       </div>
                    </div>
                  ))}
               </div>

               <button 
                  onClick={() => setIsCheckModalOpen(true)}
                  style={{ width: '100%', marginTop: '32px', padding: '14px', borderRadius: '16px', border: '2px dashed #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '13px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
               >
                  <Plus size={16} /> REGISTRAR NUEVO CHECK
               </button>
            </section>
          </div>

          {/* 6. HISTORIA DE ACCIONES (FOOTER / ACCESORIO) */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
             <button 
                onClick={() => setIsActionsDrawerOpen(true)}
                style={{ backgroundColor: '#1e293b', color: 'white', padding: '16px 32px', borderRadius: '20px', border: 'none', fontWeight: '950', fontSize: '15px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 15px -3px rgba(30, 41, 59, 0.3)' }}
             >
                <ClipboardList size={20} />
                VER HISTORIAL DE ACCIONES REALIZADAS
             </button>
          </div>
        </div>
      )}

      {/* ACTIONS DRAWER */}
      {isActionsDrawerOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, display: 'flex', justifyContent: 'flex-end' }}>
           <div onClick={() => setIsActionsDrawerOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }} />
           <div style={{ position: 'relative', width: '100%', maxWidth: '500px', height: '100%', backgroundColor: 'white', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', animation: 'slideFromRight 0.4s cubic-bezier(0, 0, 0.2, 1)' }}>
              <div style={{ padding: '32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#1e293b', letterSpacing: '-1px' }}>Intervenciones</h2>
                    <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Registro total de acciones ejecutadas</p>
                 </div>
                 <button onClick={() => setIsActionsDrawerOpen(false)} style={{ padding: '10px', borderRadius: '12px', backgroundColor: '#f8fafc', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
              </div>
              <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
                   <div style={{ position: 'absolute', left: '19px', top: '10px', bottom: '10px', width: '2px', backgroundColor: '#f1f5f9' }} />
                   {selectedTech?.actions.slice().reverse().map(action => (
                     <div key={action.id} style={{ display: 'flex', gap: '20px', position: 'relative' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '14px', backgroundColor: '#f0fdf4', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                           <Plus size={20} strokeWidth={3} />
                        </div>
                        <div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '15px', fontWeight: '950', color: '#1e293b' }}>{action.title}</span>
                              <span style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8' }}>{action.date}</span>
                           </div>
                           <p style={{ fontSize: '15px', color: '#64748b', fontWeight: '700', lineHeight: '1.5' }}>{action.description}</p>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
              <div style={{ padding: '32px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                 <button style={{ width: '100%', padding: '16px', borderRadius: '18px', backgroundColor: 'var(--movistar-blue)', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <Plus size={20} /> REGISTRAR NUEVA ACCIÓN
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CHECK SEMANAL (Simplificado) */}
      {isCheckModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
           <div onClick={() => setIsCheckModalOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }} />
           <div style={{ position: 'relative', width: '100%', maxWidth: '540px', backgroundColor: 'white', borderRadius: '36px', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                 <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#1e293b' }}>Check de Percepción</h2>
                 <button onClick={() => setIsCheckModalOpen(false)} style={{ border: 'none', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '12px', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {['Empeoró', 'Igual', 'Mejoró'].map(o => (
                      <button key={o} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', fontWeight: '950', backgroundColor: 'white', cursor: 'pointer' }}>{o}</button>
                    ))}
                 </div>
                 <textarea placeholder="Comentario rápido de percepción líder..." style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', minHeight: '100px', fontWeight: '700', outline: 'none' }} />
                 <button onClick={() => setIsCheckModalOpen(false)} style={{ padding: '18px', backgroundColor: '#1e293b', color: 'white', borderRadius: '20px', fontWeight: '950', border: 'none', cursor: 'pointer' }}>GUARDAR CHECK</button>
              </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        @font-face {
          font-family: 'Inter';
          src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        }
        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        @keyframes slideFromRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
