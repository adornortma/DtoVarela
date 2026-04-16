'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  TrendingUp, 
  Activity, 
  CheckCircle2, 
  Briefcase, 
  Zap, 
  Search, 
  ClipboardCheck, 
  BarChart3,
  Clock,
  ArrowRightLeft,
  AlertCircle
} from 'lucide-react';

interface MetricEntry {
  value: number | null;
  date: string;
}

interface MetricData {
  s1: MetricEntry;
  s2: MetricEntry;
  s3: MetricEntry;
  s4: MetricEntry;
  s5: MetricEntry;
}

interface TechnicianDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  technician: {
    name: string;
    dni: string;
    celula?: string;
    metrics: any; // Combined metrics
  } | null;
}

// --- Components ---

// --- Components ---

const MetricCard = ({ label, value, unit, statusStyle, icon: Icon }: any) => (
  <div style={{
    backgroundColor: statusStyle.bg,
    padding: '20px',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '120px',
    flex: 1,
    border: '1px solid #E5E7EB',
    position: 'relative',
    transition: 'all 0.2s ease',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon size={14} color="#6B7280" />
      <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280' }}>{label}</span>
    </div>
    <div style={{ fontSize: '28px', fontWeight: '950', color: statusStyle.color }}>
      {value ?? '-'}<span style={{ fontSize: '14px', fontWeight: '800', opacity: 0.7 }}>{unit}</span>
    </div>
  </div>
);

const DetailRow = ({ label, value, unit, green, yellow, reverse }: any) => {
  const style = getStatusColor(value, green, yellow, reverse);
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 80px', 
      alignItems: 'center', 
      padding: '12px 16px', 
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #f1f5f9'
    }}>
      <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{label}</span>
      <div style={{ 
        backgroundColor: style.bg || '#f1f5f9', 
        color: style.color || '#64748b', 
        padding: '4px 8px', 
        borderRadius: '8px', 
        fontSize: '13px', 
        fontWeight: '900', 
        textAlign: 'center' 
      }}>
        {value !== null && value !== undefined ? `${value}${unit}` : '-'}
      </div>
    </div>
  );
};

// --- Line Chart Component ---

const LineChart = ({ 
  data, 
  configs, 
  activeKPIs 
}: { 
  data: any, 
  configs: Record<string, { color: string, target: number, unit: string, reverse?: boolean }>,
  activeKPIs: Record<string, boolean>
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const width = 600;
  const height = 240;
  const padding = 50;

  // Extract real dates and week keys from data
  const weekInfo = useMemo(() => {
    const keys = new Set<string>();
    const keyToDate: Record<string, string> = {};
    
    Object.values(data || {}).forEach((kpiData: any) => {
      Object.entries(kpiData || {}).forEach(([k, entry]: [string, any]) => {
        if (/^s\d+$/.test(k)) {
          keys.add(k);
          if (entry.date) keyToDate[k] = entry.date;
        }
      });
    });

    const sortedIds = Array.from(keys).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
    
    return sortedIds.map(id => {
      let label = id.toUpperCase();
      if (keyToDate[id]) {
        try {
          const d = new Date(keyToDate[id]);
          const day = d.getUTCDate().toString().padStart(2, '0');
          const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          label = `${day} ${months[d.getUTCMonth()]}`;
        } catch (e) { /* fallback */ }
      }
      return { id, label };
    });
  }, [data]);
  
  const getScaleY = (val: number, kpi: string) => {
    const config = configs[kpi];
    // UNIFIED NORMALIZATION: Align target value to 75% mark on Y-axis
    // Formula: (value / target) * 75
    // This allows visual comparison: if a line is >= 75%, it's hitting the goal.
    const normalizedVal = config ? (val / config.target) * 75 : val;
    const clampedVal = Math.min(Math.max(normalizedVal, 0), 120); // allow some overflow
    return height - padding - (clampedVal / 100) * (height - 2 * padding);
  };

  const getPoints = (kpi: string) => {
    try {
      const kpiData = data?.[kpi];
      if (!kpiData) return [];

      return weekInfo.map((w, i) => {
        const val = kpiData[w.id]?.value;
        if (typeof val !== 'number' || val === null) return null;
        return {
          x: padding + i * ((width - 2 * padding) / (weekInfo.length - 1)),
          y: getScaleY(val, kpi),
          val,
          dateLabel: w.label,
          kpi
        };
      });
    } catch (e) { return []; }
  };

  return (
    <div style={{ width: '100%', height: height + 60, position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Y-Axis Labels */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = height - padding - (v / 100) * (height - 2 * padding);
          return (
            <g key={v}>
              <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="10" fontWeight="700" fill="#94a3b8">{v}%</text>
              <line x1={padding} y1={y} x2={width - (padding / 2)} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            </g>
          );
        })}

        {/* X-Axis Labels */}
        {weekInfo.map((w, i) => (
          <text 
            key={w.id} 
            x={padding + i * ((width - 2 * padding) / (weekInfo.length - 1))} 
            y={height - 10} 
            textAnchor="middle" 
            fontSize="10" 
            fontWeight="700" 
            fill="#94a3b8"
          >
            {w.label}
          </text>
        ))}

        {/* Series and Targets */}
        {Object.entries(configs).map(([kpi, config]) => {
          if (!activeKPIs[kpi]) return null;
          const points = getPoints(kpi);
          const validPoints = points.filter(p => p !== null);
          
          if (validPoints.length < 3) return null;

          // Target line always at 75% for all normalized metrics
          const targetY = height - padding - (75 / 100) * (height - 2 * padding);

          return (
            <g key={kpi}>
              <line 
                x1={padding} 
                y1={targetY} 
                x2={width - (padding / 2)} 
                y2={targetY} 
                stroke={config.color} 
                strokeWidth="1.5" 
                strokeDasharray="4 4" 
                opacity="0.3"
              />
              
              {(() => {
                let paths: string[] = [];
                let currentPath = "";
                points.forEach((p) => {
                  if (p) {
                    if (currentPath === "") currentPath = `M ${p.x} ${p.y}`;
                    else currentPath += ` L ${p.x} ${p.y}`;
                  } else {
                    if (currentPath !== "") paths.push(currentPath);
                    currentPath = "";
                  }
                });
                if (currentPath !== "") paths.push(currentPath);
                
                return paths.map((d, idx) => (
                  <path 
                    key={idx} 
                    d={d} 
                    fill="none" 
                    stroke={config.color} 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 4px 6px ${config.color}30)` }}
                  />
                ));
              })()}

              {points.map((p, i) => p && (
                <circle 
                  key={i} 
                  cx={p.x} 
                  cy={p.y} 
                  r={hoveredPoint?.kpi === kpi && hoveredPoint?.dateLabel === p.dateLabel ? "7" : "4.5"} 
                  fill="white" 
                  stroke={config.color} 
                  strokeWidth="3" 
                  onMouseEnter={() => setHoveredPoint(p)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              ))}
            </g>
          );
        })}

        {/* Tooltip */}
        {hoveredPoint && (() => {
          const config = configs[hoveredPoint.kpi];
          const diff = hoveredPoint.val - config.target;
          const isBetter = config.reverse ? diff <= 0 : diff >= 0;
          const diffPrefix = diff > 0 ? '+' : '';
          
          return (
            <g transform={`translate(${Math.min(hoveredPoint.x + 15, width - 125)}, ${hoveredPoint.y - 70})`}>
              <rect width="130" height="60" rx="16" fill="#0f172a" style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.4))' }} />
              <text x="12" y="20" fill="#94a3b8" fontSize="10" fontWeight="900" style={{ textTransform: 'uppercase' }}>{(config as any).label}</text>
              <text x="12" y="38" fill="white" fontSize="16" fontWeight="950">
                {hoveredPoint.val}{config.unit}
              </text>
              <text x="12" y="50" fill={isBetter ? '#4ade80' : '#f87171'} fontSize="10" fontWeight="900">
                {hoveredPoint.dateLabel} • {diffPrefix}{diff.toFixed(1)} vs obj
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
};

// --- Helper Functions ---

const getStatusColor = (value: number | null, green: number, yellow: number, reverse = false) => {
  if (value === null) return { bg: '#F3F4F6', color: '#6B7280' };
  
  const COLORS = {
    green: { bg: 'rgba(34, 197, 94, 0.15)', color: '#059669' },
    yellow: { bg: 'rgba(217, 119, 6, 0.15)', color: '#D97706' },
    red: { bg: 'rgba(220, 38, 38, 0.15)', color: '#DC2626' }
  };

  if (reverse) {
    if (value <= green) return COLORS.green;
    if (value <= yellow) return COLORS.yellow;
    return COLORS.red;
  }
  if (value >= green) return COLORS.green;
  if (value >= yellow) return COLORS.yellow;
  return COLORS.red;
};

// --- Main Export ---

export default function TechnicianDetailsSheet({ isOpen, onClose, technician }: TechnicianDetailsProps) {
  const [activeKPIs, setActiveKPIs] = useState<Record<string, boolean>>({
    resolucion: true,
    productividad: true,
    reiteros: true,
    no_encontrados: false
  });

  const teacherMetrics = technician?.metrics || {};

  const kpiConfigs: Record<string, { color: string, target: number, unit: string, label: string, reverse?: boolean }> = {
    resolucion: { label: 'Resolución', color: '#019df4', target: 75, unit: '%' },
    productividad: { label: 'Productividad', color: '#f59e0b', target: 6, unit: '' },
    reiteros: { label: 'Reiteros', color: '#ef4444', target: 4.5, unit: '%', reverse: true },
    no_encontrados: { label: 'No encontrados', color: '#64748b', target: 4.9, unit: '%', reverse: true },
  };

  const scores = useMemo(() => {
    if (!technician) return {} as any;
    
    const getAvg = (kpi: string) => {
      try {
        const kpiData = teacherMetrics[kpi];
        if (!kpiData) return null;
        const allWeekKeys = Object.keys(kpiData).filter(k => /^s\d+$/.test(k));
        const values = allWeekKeys
          .map(s => kpiData[s]?.value)
          .filter(v => typeof v === 'number' && v !== null) as number[];
        if (values.length === 0) return null;
        return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
      } catch (e) { return null; }
    };

    return {
      resolucion: getAvg('resolucion'),
      productividad: getAvg('productividad'),
      reiteros: getAvg('reiteros'),
      puntualidad: getAvg('puntualidad'),
      inicio: getAvg('inicio'),
      ok1: getAvg('ok1'),
      completadas: getAvg('completadas'),
      no_encontrados: getAvg('no_encontrados'),
      deriva_bajadas: getAvg('deriva_bajadas'),
      cierres: getAvg('cierres'),
    };
  }, [teacherMetrics, technician]);

  const latest = useMemo(() => {
    if (!technician) return {} as any;
    
    const getLatest = (kpi: string) => {
      try {
        const kpiData = teacherMetrics[kpi];
        if (!kpiData) return null;
        const weeksOrder = ['s8', 's7', 's6', 's5', 's4', 's3', 's2', 's1'];
        for (const w of weeksOrder) {
          const val = kpiData[w]?.value;
          if (typeof val === 'number' && val !== null) return val;
        }
        return null;
      } catch (e) { return null; }
    };

    return {
      resolucion: getLatest('resolucion'),
      productividad: getLatest('productividad'),
      reiteros: getLatest('reiteros'),
      no_encontrados: getLatest('no_encontrados'),
    };
  }, [teacherMetrics, technician]);

  if (!isOpen || !technician) return null;

  return (
    <>
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(12px)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center', 
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '95%',
              maxWidth: '850px',
              maxHeight: '90vh',
              backgroundColor: 'white',
              borderRadius: '32px', 
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '32px', fontWeight: '950', color: '#1F2937', letterSpacing: '-1.5px', lineHeight: 1, margin: 0 }}>{technician.name}</h2>
                  <a 
                    href={`/seguimiento-bp?dni=${technician.dni}`}
                    style={{ 
                      backgroundColor: '#f0f9ff', color: '#019df4', padding: '8px 16px', 
                      borderRadius: '12px', fontSize: '11px', fontWeight: '950', 
                      display: 'flex', alignItems: 'center', gap: '6px', 
                      textDecoration: 'none', border: '1px solid #bae6fd',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                    }}
                  >
                    <Activity size={14} /> IR A SEGUIMIENTO BP
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280' }}>
                  <Briefcase size={16} />
                  <span style={{ fontSize: '15px', fontWeight: '600' }}>Célula: <span style={{ color: '#1F2937', fontWeight: '800' }}>{technician.celula}</span></span>
                  <span style={{ fontSize: '15px', fontWeight: '600', marginLeft: '12px' }}>DNI: <span style={{ color: '#1F2937', fontWeight: '800' }}>{technician.dni}</span></span>
                </div>
              </div>
              <button 
                onClick={onClose}
                style={{ padding: '12px', borderRadius: '16px', border: 'none', backgroundColor: '#F3F4F6', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <X size={24} color="#1F2937" strokeWidth={3} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
              
              {/* Snapshot Section */}
              <div style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Resumen – Semana actual</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <MetricCard label="Resolución" value={latest.resolucion} unit="%" icon={TrendingUp} statusStyle={getStatusColor(latest.resolucion, 75, 70)} />
                  <MetricCard label="Productividad" value={latest.productividad} unit="" icon={Zap} statusStyle={getStatusColor(latest.productividad, 6, 5)} />
                  <MetricCard label="Reiteros" value={latest.reiteros} unit="%" icon={ArrowRightLeft} statusStyle={getStatusColor(latest.reiteros, 4.5, 5, true)} />
                  <MetricCard label="No encontrados" value={latest.no_encontrados} unit="%" icon={Search} statusStyle={getStatusColor(latest.no_encontrados, 4.9, 6.9, true)} />
                </div>
              </div>

              {/* Evolution Chart Section */}
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '32px', padding: '32px', border: '2px solid #f1f5f9', marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px' }}>Evolución Semanal</h3>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Object.entries(kpiConfigs).map(([kpi, config]) => {
                      const points = Object.keys(teacherMetrics[kpi] || {}).filter(k => /^s\d+$/.test(k));
                      const isInsufficient = points.length < 3;
                      
                      return (
                        <button
                          key={kpi}
                          onClick={() => setActiveKPIs(prev => ({ ...prev, [kpi]: !prev[kpi] }))}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            borderRadius: '14px',
                            border: '2px solid',
                            borderColor: activeKPIs[kpi] ? config.color : '#e2e8f0',
                            backgroundColor: activeKPIs[kpi] ? `${config.color}10` : 'white',
                            color: activeKPIs[kpi] ? config.color : '#64748b',
                            fontSize: '13px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: isInsufficient && !activeKPIs[kpi] ? 0.6 : 1
                          }}
                        >
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: config.color }} />
                          {kpi === 'ok1' ? '1er OK' : kpi.split('_').join(' ').charAt(0).toUpperCase() + kpi.split('_').join(' ').slice(1)}
                          {isInsufficient && (
                            <span style={{ fontSize: '10px', backgroundColor: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '6px' }}>
                              Incomp.
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LineChart 
                    data={teacherMetrics} 
                    configs={kpiConfigs} 
                    activeKPIs={activeKPIs} 
                  />
                </div>
                
                <div style={{ marginTop: '20px', display: 'flex', gap: '24px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '20px', height: '1px', borderTop: '2px dashed #94a3b8', opacity: 0.5 }} />
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>Línea de Objetivo</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', fontWeight: '600' }}>
                    * Productividad normalizada base objetivo (100% = {kpiConfigs.productividad.target})
                  </div>
                </div>
              </div>

              {/* KPI Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '20px' }}>
                <section>
                  <h3 style={{ fontSize: '14px', fontWeight: '950', color: 'var(--movistar-blue)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={16} /> Resultados <span style={{fontSize: '10px', opacity: 0.5}}>(Promedio)</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <DetailRow label="Resolución" value={scores.resolucion} unit="%" green={75} yellow={70} />
                    <DetailRow label="Reiteros" value={scores.reiteros} unit="%" green={4.5} yellow={5} reverse />
                    <DetailRow label="Puntualidad" value={scores.puntualidad} unit="%" green={80} yellow={70} />
                    <DetailRow label="Productividad" value={scores.productividad} unit="" green={6} yellow={5} />
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '14px', fontWeight: '950', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={16} /> Actividad <span style={{fontSize: '10px', opacity: 0.5}}>(Promedio)</span>
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <DetailRow label="Inicio" value={scores.inicio} unit="%" green={80} yellow={71} />
                    <DetailRow label="1er OK" value={scores.ok1} unit="%" green={80} yellow={71} />
                    <DetailRow label="Completadas" value={scores.completadas} unit="%" green={75} yellow={70} />
                    <DetailRow label="No encontrados" value={scores.no_encontrados} unit="%" green={4.9} yellow={6.9} reverse />
                    <DetailRow label="Deriva Bajadas" value={scores.deriva_bajadas} unit="%" green={4.9} yellow={6.9} reverse />
                    <DetailRow label="Cant. Cierres" value={scores.cierres} unit="" green={0} yellow={0} />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { 
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); } 
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); } 
        }
      `}</style>
    </>
  );
}
