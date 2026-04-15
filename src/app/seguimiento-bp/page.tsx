'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronRight, 
  LayoutDashboard, 
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
  MoreHorizontal,
  X,
  Target,
  ArrowUpRight
} from 'lucide-react';

// --- Types ---
interface BPEvent {
  id: string;
  type: 'check' | 'action' | 'status_change' | 'alert';
  date: string;
  title: string;
  description: string;
  status?: 'mejora' | 'igual' | 'empeoro';
}

interface BPSession {
  id: string;
  techName: string;
  cell: string;
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
  }[];
  events: BPEvent[];
}

// --- Mock Data ---
const MOCK_BP_DATA: BPSession[] = [
  {
    id: '1',
    techName: 'GARCIA JUAN CARLOS',
    cell: 'VARELA 1',
    status: 'critico',
    mainKpi: 18.5,
    trend: 'down',
    daysInBp: 24,
    startDate: '2026-03-22',
    lastCheckDate: '2026-04-10',
    lastAction: 'Charla técnica presencial',
    kpiHistory: [
      { week: 'S11', reitero: 12, resolucion: 85, deriva: 5 },
      { week: 'S12', reitero: 14, resolucion: 82, deriva: 7 },
      { week: 'S13', reitero: 18, resolucion: 78, deriva: 9 },
      { week: 'S14', reitero: 19, resolucion: 75, deriva: 11 },
      { week: 'S15', reitero: 18.5, resolucion: 76, deriva: 10 },
    ],
    events: [
      { id: 'e1', type: 'status_change', date: '2026-03-22', title: 'Inicio BP', description: 'Ingreso por reitero > 15%', status: 'empeoro' },
      { id: 'e2', type: 'action', date: '2026-03-25', title: 'Acción Técnica', description: 'Revisión de herramientas y materiales' },
      { id: 'e3', type: 'check', date: '2026-04-02', title: 'Check Semanal', description: 'Se mantiene igual, sin cambios significativos', status: 'igual' },
      { id: 'e4', type: 'action', date: '2026-04-05', title: 'Acompañamiento', description: 'Veeduría en campo por líder de célula' },
      { id: 'e5', type: 'check', date: '2026-04-10', title: 'Check Semanal', description: 'Ligera mejora en resolución, reitero sigue alto', status: 'mejora' },
    ]
  },
  {
    id: '2',
    techName: 'RODRIGUEZ ARIEL',
    cell: 'VARELA 2',
    status: 'seguimiento',
    mainKpi: 14.2,
    trend: 'stable',
    daysInBp: 45,
    startDate: '2026-03-01',
    lastCheckDate: '2026-04-14',
    lastAction: 'Refuerzo en protocolos TOA',
    kpiHistory: [
      { week: 'S11', reitero: 15, resolucion: 80, deriva: 8 },
      { week: 'S12', reitero: 16, resolucion: 79, deriva: 7 },
      { week: 'S13', reitero: 14, resolucion: 81, deriva: 6 },
      { week: 'S14', reitero: 14.5, resolucion: 82, deriva: 5 },
      { week: 'S15', reitero: 14.2, resolucion: 83, deriva: 4 },
    ],
    events: [
      { id: 'e1', type: 'status_change', date: '2026-03-01', title: 'Inicio BP', description: 'Entra en seguimiento preventivo' },
      { id: 'e2', type: 'check', date: '2026-04-14', title: 'Check Semanal', description: 'Estabilidad en los indicadores principales', status: 'igual' },
    ]
  },
  {
    id: '3',
    techName: 'LOPEZ MARIANO',
    cell: 'BERAZATEGUI',
    status: 'mejora',
    mainKpi: 9.8,
    trend: 'up',
    daysInBp: 12,
    startDate: '2026-04-03',
    lastCheckDate: '2026-04-12',
    lastAction: 'N/A',
    kpiHistory: [
      { week: 'S13', reitero: 16, resolucion: 70, deriva: 12 },
      { week: 'S14', reitero: 12, resolucion: 78, deriva: 8 },
      { week: 'S15', reitero: 9.8, resolucion: 88, deriva: 4 },
    ],
    events: [
      { id: 'e1', type: 'status_change', date: '2026-04-03', title: 'Inicio BP', description: 'Ingreso por baja resolución' },
      { id: 'e2', type: 'check', date: '2026-04-12', title: 'Check Semanal', description: 'Excelente evolución semanal', status: 'mejora' },
    ]
  }
];

// --- Components ---

const StatusBadge = ({ status }: { status: BPSession['status'] }) => {
  const config = {
    critico: { label: 'Crítico', bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
    seguimiento: { label: 'Seguimiento', bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
    mejora: { label: 'Mejora', bg: '#dcfce7', color: '#166534', dot: '#10b981' }
  };
  const { label, bg, color, dot } = config[status];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '12px', backgroundColor: bg, color, fontSize: '12px', fontWeight: '800' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dot }} />
      {label}
    </div>
  );
};

const KpiChart = ({ history }: { history: BPSession['kpiHistory'] }) => {
  // Simple SVG Line Chart implementation
  const width = 800;
  const height = 240;
  const padding = 40;
  
  const maxVal = 100;
  const minVal = 0;
  
  const getX = (index: number) => (index / (history.length - 1)) * (width - 2 * padding) + padding;
  const getY = (val: number) => height - ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding) - padding;

  const createPath = (key: keyof typeof history[0], color: string) => {
    return history.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p[key] as number)}`).join(' ');
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: 'white', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--movistar-blue)', borderRadius: '4px' }} />
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>Reitero %</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '4px' }} />
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>Resolución %</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '4px' }} />
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}>Deriva %</span>
          </div>
      </div>
      
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Grid Lines */}
        {[0, 25, 50, 75, 100].map(val => (
          <g key={val}>
            <line x1={padding} y1={getY(val)} x2={width - padding} y2={getY(val)} stroke="#f1f5f9" strokeWidth="1" />
            <text x={padding - 10} y={getY(val)} textAnchor="end" alignmentBaseline="middle" fontSize="11" fill="#94a3b8" fontWeight="800">{val}%</text>
          </g>
        ))}

        {/* Lines */}
        <path d={createPath('reitero', 'var(--movistar-blue)')} fill="none" stroke="var(--movistar-blue)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 4px 6px rgba(1, 157, 244, 0.2))' }} />
        <path d={createPath('resolucion', '#10b981')} fill="none" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 4px 6px rgba(16, 185, 129, 0.2))' }} />
        <path d={createPath('deriva', '#f59e0b')} fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 4px 6px rgba(245, 158, 11, 0.2))' }} />

        {/* Points & Labels */}
        {history.map((p, i) => (
          <g key={i}>
            <text x={getX(i)} y={height - 5} textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="950">{p.week}</text>
            <circle cx={getX(i)} cy={getY(p.reitero)} r="6" fill="white" stroke="var(--movistar-blue)" strokeWidth="4" />
            <circle cx={getX(i)} cy={getY(p.resolucion)} r="6" fill="white" stroke="#10b981" strokeWidth="4" />
            <circle cx={getX(i)} cy={getY(p.deriva)} r="6" fill="white" stroke="#f59e0b" strokeWidth="4" />
          </g>
        ))}
      </svg>
    </div>
  );
};

export default function SeguimientoBP() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedTech, setSelectedTech] = useState<BPSession | null>(null);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // --- Handlers ---
  const handleTechClick = (tech: BPSession) => {
    setSelectedTech(tech);
    setView('detail');
  };

  const getTimeStatus = (lastCheck: string) => {
    const d = new Date(lastCheck);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 7) return { color: '#10b981', label: 'Al día', dot: '#10b981' };
    if (diff < 11) return { color: '#f59e0b', label: 'Pendiente', dot: '#f59e0b' };
    return { color: '#ef4444', label: 'Urgente', dot: '#ef4444' };
  };

  return (
    <div style={{ backgroundColor: '#f4f7fa', minHeight: '100vh', padding: '16px 40px 60px 40px', width: '100%' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#64748b', fontSize: '13px', fontWeight: '800' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/'}>Página Principal</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--movistar-blue)', fontWeight: '950' }}>Seguimiento BP</span>
            {view === 'detail' && (
              <>
                <ChevronRight size={14} />
                <span style={{ fontWeight: '950', color: '#1e293b' }}>{selectedTech?.techName}</span>
              </>
            )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
             {view === 'detail' ? (
               <button 
                onClick={() => setView('list')}
                style={{ padding: '12px', borderRadius: '18px', backgroundColor: 'white', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
               >
                 <ArrowLeft size={20} strokeWidth={3} />
               </button>
             ) : (
               <div style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '20px', color: 'white', boxShadow: '0 10px 15px -3px rgba(30, 41, 59, 0.4)' }}>
                  <Target size={28} strokeWidth={2.5} />
               </div>
             )}
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.8px', lineHeight: '0.9' }}>
                {view === 'list' ? 'Seguimiento BP' : 'Evolución Histórica'}
              </h1>
              <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '800', marginTop: '8px' }}>
                {view === 'list' ? 'Gestión táctica de colaboradores en seguimiento' : 'Dashboard de rendimiento y eventos de intervención'}
              </p>
            </div>
          </div>

          {view === 'detail' && (
            <div style={{ display: 'flex', gap: '14px' }}>
               <button 
                  onClick={() => setIsCheckModalOpen(true)}
                  style={{ backgroundColor: 'var(--movistar-blue)', color: 'white', padding: '12px 24px', borderRadius: '16px', border: 'none', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(1, 157, 244, 0.3)', transition: 'transform 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
               >
                 <CheckCircle2 size={20} />
                 NUEVO CHECK
               </button>
               <button 
                  onClick={() => setIsActionModalOpen(true)}
                  style={{ backgroundColor: 'white', color: '#1e293b', padding: '12px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
               >
                 <Plus size={20} />
                 AGREGAR ACCIÓN
               </button>
            </div>
          )}
        </div>
      </header>

      {view === 'list' ? (
        <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
             <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 20px', borderRadius: '18px', width: '400px', border: '1px solid #f1f5f9' }}>
                <Search size={20} color="#94a3b8" />
                <input type="text" placeholder="Filtrar por nombre o célula..." style={{ border: 'none', fontSize: '15px', fontWeight: '700', outline: 'none', width: '100%', backgroundColor: 'transparent', color: '#1e293b' }} />
             </div>
             <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{ padding: '10px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '14px', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                   <Filter size={16} /> Filtros Avanzados
                </button>
             </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Técnico y Célula</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estatus BP</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>KPI Principal</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Tendencia</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Días en BP</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Último Check</th>
                <th style={{ padding: '20px 32px', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Última Acción</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_BP_DATA.map((tech) => (
                <tr 
                  key={tech.id} 
                  onClick={() => handleTechClick(tech)}
                  style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: 'white' }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                >
                  <td style={{ padding: '20px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '14px', backgroundColor: 'rgba(1, 157, 244, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--movistar-blue)' }}>
                           <User size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                          <span style={{ display: 'block', fontWeight: '950', color: '#1e293b', fontSize: '15px' }}>{tech.techName}</span>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>{tech.cell}</span>
                        </div>
                     </div>
                  </td>
                  <td style={{ padding: '20px 32px' }}>
                    <StatusBadge status={tech.status} />
                  </td>
                  <td style={{ padding: '20px 32px', textAlign: 'center' }}>
                     <span style={{ fontWeight: '950', fontSize: '18px', color: '#1e293b' }}>{tech.mainKpi}%</span>
                     <span style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Reitero</span>
                  </td>
                  <td style={{ padding: '20px 32px', textAlign: 'center' }}>
                     {tech.trend === 'up' && <TrendingDown size={24} color="#10b981" strokeWidth={3} />}
                     {tech.trend === 'down' && <TrendingUp size={24} color="#ef4444" strokeWidth={3} />}
                     {tech.trend === 'stable' && <Minus size={24} color="#f59e0b" strokeWidth={3} />}
                  </td>
                  <td style={{ padding: '20px 32px', textAlign: 'center' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '14px', backgroundColor: '#f1f5f9', fontWeight: '950', color: '#1e293b' }}>{tech.daysInBp}</div>
                  </td>
                  <td style={{ padding: '20px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getTimeStatus(tech.lastCheckDate).dot }} />
                        <span style={{ fontSize: '14px', fontWeight: '950', color: '#1e293b' }}>{tech.lastCheckDate}</span>
                     </div>
                     <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', marginLeft: '18px', textTransform: 'uppercase' }}>{getTimeStatus(tech.lastCheckDate).label}</span>
                  </td>
                  <td style={{ padding: '20px 32px' }}>
                     <span style={{ fontSize: '14px', fontWeight: '800', color: '#64748b' }}>{tech.lastAction}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '20px 32px', borderTop: '1px solid #f1f5f9', textAlign: 'center', backgroundColor: '#f8fafc' }}>
             <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '800' }}>Mostrando {MOCK_BP_DATA.length} técnicos en programa BP</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '28px' }}>
          
          {/* Main Area (Chart + Timeline) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Bloque 1: Gráfico KPI Evolución */}
            <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '40px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                     <div style={{ backgroundColor: 'rgba(1, 157, 244, 0.1)', padding: '12px', borderRadius: '16px', color: 'var(--movistar-blue)' }}>
                        <Activity size={24} strokeWidth={2.5} />
                     </div>
                     <div>
                        <h3 style={{ fontSize: '22px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px' }}>Evolución Semanal de KPIs</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>Seguimiento por bloques de 7 días naturales</p>
                     </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <div style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Inicio del Programa</div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: '950', fontSize: '15px', backgroundColor: '#f8fafc', padding: '8px 16px', borderRadius: '14px', border: '1px solid #f1f5f9' }}>
                        <Calendar size={16} />
                        {selectedTech?.startDate}
                     </div>
                  </div>
               </div>
               <KpiChart history={selectedTech?.kpiHistory || []} />
            </div>

            {/* Bloque 2: Timeline de Eventos */}
            <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '40px', border: '1px solid #e2e8f0' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
                  <div style={{ backgroundColor: 'rgba(100, 116, 139, 0.1)', padding: '12px', borderRadius: '16px', color: '#64748b' }}>
                     <History size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '22px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px' }}>Cronología de Intervenciones</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>Contexto histórico de decisiones y checks</p>
                  </div>
               </div>

               <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                 <div style={{ position: 'absolute', left: '21px', top: '10px', bottom: '10px', width: '3px', backgroundColor: '#f1f5f9', zIndex: 0 }} />
                 {selectedTech?.events.slice().reverse().map((event, i) => (
                   <div key={event.id} style={{ display: 'flex', gap: '24px', position: 'relative', zIndex: 1 }}>
                     <div style={{ 
                       width: '46px', 
                       height: '46px', 
                       borderRadius: '16px', 
                       backgroundColor: event.type === 'check' ? '#eff6ff' : event.type === 'action' ? '#f0fdf4' : '#fef2f2', 
                       display: 'flex', 
                       alignItems: 'center', 
                       justifyContent: 'center',
                       color: event.type === 'check' ? 'var(--movistar-blue)' : event.type === 'action' ? '#10b981' : '#ef4444',
                       boxShadow: '0 8px 15px -3px rgba(0,0,0,0.08)',
                       flexShrink: 0,
                       border: '1px solid white'
                     }}>
                       {event.type === 'check' ? <CheckCircle2 size={24} /> : event.type === 'action' ? <Plus size={24} /> : <AlertCircle size={24} />}
                     </div>
                     <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '6px' }}>
                           <span style={{ fontSize: '16px', fontWeight: '950', color: '#1e293b' }}>{event.title}</span>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px', fontWeight: '800' }}>
                              <Calendar size={14} />
                              {event.date}
                           </div>
                           {event.status && (
                             <div style={{ 
                               marginLeft: 'auto',
                               fontSize: '11px', 
                               fontWeight: '950', 
                               textTransform: 'uppercase',
                               padding: '4px 10px',
                               borderRadius: '8px',
                               color: event.status === 'mejora' ? '#10b981' : event.status === 'igual' ? '#f59e0b' : '#ef4444',
                               backgroundColor: event.status === 'mejora' ? '#f0fdf4' : event.status === 'igual' ? '#fffbeb' : '#fef2f2'
                             }}>
                               {event.status}
                             </div>
                           )}
                        </div>
                        <p style={{ fontSize: '16px', color: '#64748b', fontWeight: '600', lineHeight: '1.6' }}>{event.description}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* Sidebar Area (Summary) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
             <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '40px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginBottom: '24px' }}>Estatus del Colaborador</span>
                <div style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '35px', 
                  backgroundColor: selectedTech?.status === 'critico' ? '#fee2e2' : selectedTech?.status === 'seguimiento' ? '#fef3c7' : '#dcfce7',
                  margin: '0 auto 24px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: selectedTech?.status === 'critico' ? '#ef4444' : selectedTech?.status === 'seguimiento' ? '#f59e0b' : '#10b981',
                  boxShadow: '0 15px 20px -3px rgba(0,0,0,0.1)'
                }}>
                   <AlertCircle size={52} strokeWidth={2.5} />
                </div>
                <h4 style={{ fontSize: '24px', fontWeight: '950', color: '#1e293b', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                  {selectedTech?.status === 'critico' ? 'ZONA CRÍTICA' : selectedTech?.status === 'seguimiento' ? 'EN SEGUIMIENTO' : 'EN MEJORA'}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', fontWeight: '900', color: selectedTech?.trend === 'up' ? '#10b981' : '#ef4444' }}>
                   {selectedTech?.trend === 'up' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                   Tendencia {selectedTech?.trend === 'up' ? 'Positiva' : 'Negativa'}
                </div>
             </div>

             <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '32px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '14px', color: '#64748b', border: '1px solid #f1f5f9' }}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Tiempo en BP</span>
                        <span style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b' }}>{selectedTech?.daysInBp} días</span>
                      </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ backgroundColor: 'rgba(1, 157, 244, 0.08)', padding: '10px', borderRadius: '14px', color: 'var(--movistar-blue)', border: '1px solid rgba(1, 157, 244, 0.1)' }}>
                        <Target size={20} strokeWidth={3} />
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>KPI Actual</span>
                        <span style={{ fontSize: '24px', fontWeight: '950', color: 'var(--movistar-blue)', letterSpacing: '-1px' }}>{selectedTech?.mainKpi}%</span>
                      </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '14px', color: '#64748b', border: '1px solid #f1f5f9' }}>
                        <Info size={20} />
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '11px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Ubicación</span>
                        <span style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b' }}>{selectedTech?.cell}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div style={{ backgroundColor: 'var(--movistar-blue)', borderRadius: '32px', padding: '32px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 15px 30px -5px rgba(1, 157, 244, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                   <Activity size={20} />
                   <h5 style={{ fontSize: '16px', fontWeight: '950' }}>Resumen Ejecutivo</h5>
                </div>
                <p style={{ fontSize: '15px', fontWeight: '700', lineHeight: '1.6', opacity: 0.95, position: 'relative', zIndex: 1 }}>
                   {selectedTech?.status === 'critico' 
                     ? 'Se requiere intervención inmediata. Los niveles de reitero han superado el umbral permitido por segunda semana consecutiva. Agendar veeduría prioritaria.' 
                     : 'El técnico muestra signos de estabilidad progresiva. Mantener acompañamiento pasivo hasta consolidar resolución arriba del 85%.'}
                </p>
                <ArrowUpRight size={80} style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.15 }} />
             </div>
          </div>
        </div>
      )}

      {/* Check Semanal Modal */}
      {isCheckModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setIsCheckModalOpen(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '540px', backgroundColor: 'white', borderRadius: '36px', padding: '40px', boxShadow: '0 35px 70px -15px rgba(0,0,0,0.4)', animation: 'bounce-subtle 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                 <div style={{ backgroundColor: 'rgba(1, 157, 244, 0.1)', padding: '10px', borderRadius: '16px', color: 'var(--movistar-blue)' }}>
                    <CheckCircle2 size={24} strokeWidth={2.5} />
                 </div>
                 <div>
                    <h3 style={{ fontSize: '22px', fontWeight: '950', color: '#1e293b', letterSpacing: '-0.5px' }}>Registrar Check Semanal</h3>
                    <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '800' }}>Evaluación de progreso semanal</p>
                 </div>
              </div>
              <button onClick={() => setIsCheckModalOpen(false)} style={{ padding: '10px', borderRadius: '14px', backgroundColor: '#f8fafc', color: '#64748b', border: 'none', cursor: 'pointer' }}><X size={20} strokeWidth={3} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
               <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>¿Cómo evolucionó el desempeño?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'Empeoró', color: '#ef4444', icon: TrendingDown },
                      { label: 'Igual', color: '#f59e0b', icon: Minus },
                      { label: 'Mejoró', color: '#10b981', icon: TrendingUp }
                    ].map(opt => (
                      <button key={opt.label} style={{ 
                        padding: '16px 8px', 
                        borderRadius: '16px', 
                        border: '1px solid #e2e8f0', 
                        fontSize: '13px', 
                        fontWeight: '900', 
                        backgroundColor: 'white', 
                        color: '#1e293b', 
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}>
                        <opt.icon size={20} color={opt.color} strokeWidth={3} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
               </div>

               <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Alertas Detectadas (Multi-select)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Reitero alto', 'Baja resolución', 'Mala carga TOA', 'Tiempos elevados', 'Quejas cliente', 'Falta cumplimiento'].map(label => (
                      <div key={label} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', fontSize: '13px', fontWeight: '800', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {label}
                      </div>
                    ))}
                  </div>
               </div>

               <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>¿Se ejecutaron las acciones acordadas?</label>
                  <div style={{ display: 'flex', gap: '20px' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: '850', cursor: 'pointer' }}>
                        <input type="radio" name="acc" style={{ width: '18px', height: '18px' }} /> Sí
                     </label>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: '850', cursor: 'pointer' }}>
                        <input type="radio" name="acc" style={{ width: '18px', height: '18px' }} /> No
                     </label>
                  </div>
               </div>

               <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>Siguiente Paso Estratégico</label>
                  <select style={{ width: '100%', padding: '16px', borderRadius: '18px', border: '2px solid #f1f5f9', fontSize: '15px', fontWeight: '800', outline: 'none', backgroundColor: '#f8fafc', color: '#1e293b' }}>
                     <option>Nueva acción de intervención</option>
                     <option>Mantener seguimiento estándar</option>
                     <option>Escalar a coordinación</option>
                     <option>Cerrar caso por mejora técnica</option>
                  </select>
               </div>

               <button 
                onClick={() => setIsCheckModalOpen(false)}
                style={{ width: '100%', marginTop: '12px', backgroundColor: '#1e293b', color: 'white', padding: '18px', borderRadius: '20px', border: 'none', fontWeight: '950', fontSize: '16px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(30, 41, 59, 0.4)' }}
               >
                 GUARDAR SEGUIMIENTO
               </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @font-face {
          font-family: 'Inter';
          src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        }
        * { font-family: 'Inter', sans-serif; }
        @keyframes bounce-subtle {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
