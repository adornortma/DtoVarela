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
    celula?: string;
    metrics: any; // Combined metrics
  } | null;
}

// --- Components ---

const MetricCard = ({ label, value, unit, color, icon: Icon, isLatest = false }: any) => (
  <div style={{
    backgroundColor: color.bg,
    padding: '16px',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '120px',
    flex: 1,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.05)',
    position: 'relative',
    overflow: 'hidden'
  }}>
    {isLatest && (
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        backgroundColor: 'rgba(255,255,255,0.5)',
        padding: '2px 6px',
        borderRadius: '6px',
        fontSize: '8px',
        fontWeight: '900',
        color: color.text,
        textTransform: 'uppercase'
      }}>
        Última semana
      </div>
    )}
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: color.text }}>
      <Icon size={14} strokeWidth={3} />
      <span style={{ fontSize: '10px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
    </div>
    <div style={{ fontSize: '24px', fontWeight: '950', color: color.text }}>
      {value ?? '-'}<span style={{ fontSize: '14px', fontWeight: '800', opacity: 0.7 }}>{unit}</span>
    </div>
  </div>
);

const DetailRow = ({ label, value, unit, green, yellow, reverse }: any) => {
  const color = getStatusColor(value, green, yellow, reverse);
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
        backgroundColor: color.bg, 
        color: color.text, 
        padding: '4px 8px', 
        borderRadius: '8px', 
        fontSize: '13px', 
        fontWeight: '900', 
        textAlign: 'center' 
      }}>
        {value ?? '-'}{unit}
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
  const width = 600;
  const height = 200;
  const padding = 30;
  const weeks = ['s1', 's2', 's3', 's4', 's5'];
  
  // Calculate vertical scaling based on percentages (0-100) or productivity (0-10)
  const getScaleY = (val: number, isPercent: boolean) => {
    const max = isPercent ? 100 : 10;
    return height - padding - (val / max) * (height - 2 * padding);
  };

  const getPoints = (kpi: string) => {
    const isPercent = configs[kpi].unit === '%';
    return weeks.map((w, i) => {
      const val = data[kpi]?.[w]?.value;
      if (val === null || val === undefined) return null;
      return {
        x: padding + i * ((width - 2 * padding) / (weeks.length - 1)),
        y: getScaleY(val, isPercent),
        val
      };
    });
  };

  return (
    <div style={{ width: '100%', height: height + 40, position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Grid Lines */}
        {[0, 25, 50, 75, 100].map(v => (
          <line 
            key={v} 
            x1={padding} 
            y1={getScaleY(v, true)} 
            x2={width - padding} 
            y2={getScaleY(v, true)} 
            stroke="#f1f5f9" 
            strokeWidth="1" 
          />
        ))}

        {/* X Axis Labels */}
        {weeks.map((w, i) => (
          <text 
            key={w} 
            x={padding + i * ((width - 2 * padding) / (weeks.length - 1))} 
            y={height - 5} 
            textAnchor="middle" 
            fontSize="10" 
            fontWeight="700" 
            fill="#94a3b8"
          >
            {w.toUpperCase()}
          </text>
        ))}

        {/* Target Lines & Series */}
        {Object.entries(configs).map(([kpi, config]) => {
          if (!activeKPIs[kpi]) return null;
          const points = getPoints(kpi);
          const isPercent = config.unit === '%';
          const targetY = getScaleY(config.target, isPercent);

          // Path with gaps
          let paths: string[] = [];
          let currentPath = "";
          
          points.forEach((p, i) => {
            if (p) {
               if (currentPath === "") currentPath = `M ${p.x} ${p.y}`;
               else currentPath += ` L ${p.x} ${p.y}`;
            } else {
               if (currentPath !== "") paths.push(currentPath);
               currentPath = "";
            }
          });
          if (currentPath !== "") paths.push(currentPath);

          return (
            <g key={kpi}>
              {/* Target Area Reference (Shadow line) */}
              <line 
                x1={padding} 
                y1={targetY} 
                x2={width - padding} 
                y2={targetY} 
                stroke={config.color} 
                strokeWidth="1.5" 
                strokeDasharray="4 4" 
                opacity="0.3"
              />
              
              {/* Lines */}
              {paths.map((d, idx) => (
                <path 
                  key={idx} 
                  d={d} 
                  fill="none" 
                  stroke={config.color} 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              ))}

              {/* Dots */}
              {points.map((p, i) => p && (
                <circle 
                  key={i} 
                  cx={p.x} 
                  cy={p.y} 
                  r="4" 
                  fill="white" 
                  stroke={config.color} 
                  strokeWidth="2.5" 
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// --- Helper Functions ---

const normalize = (value: number | null, min: number, max: number, inverted = false) => {
  if (value === null) return 0;
  let score = ((value - min) / (max - min)) * 100;
  if (inverted) score = 100 - score;
  return Math.min(Math.max(score, 0), 100);
};

const getStatusColor = (value: number | null, green: number, yellow: number, reverse = false) => {
  if (value === null) return { bg: '#f1f5f9', text: '#64748b' };
  if (reverse) {
    if (value <= green) return { bg: '#ecfdf5', text: '#059669' };
    if (value <= yellow) return { bg: '#fffbeb', text: '#d97706' };
    return { bg: '#fef2f2', text: '#dc2626' };
  }
  if (value >= green) return { bg: '#ecfdf5', text: '#059669' };
  if (value >= yellow) return { bg: '#fffbeb', text: '#d97706' };
  return { bg: '#fef2f2', text: '#dc2626' };
};

// --- Main Export ---

export default function TechnicianDetailsSheet({ isOpen, onClose, technician }: TechnicianDetailsProps) {
  const [activeKPIs, setActiveKPIs] = useState<Record<string, boolean>>({
    resolucion: true,
    productividad: true,
    ok1: true,
    no_encontrados: false
  });

  if (!technician || !technician.metrics) return null;

  const kpiConfigs: Record<string, { color: string, target: number, unit: string, reverse?: boolean }> = {
    resolucion: { color: '#019df4', target: 75, unit: '%' },
    productividad: { color: '#f59e0b', target: 6, unit: '' },
    ok1: { color: '#10b981', target: 80, unit: '%' },
    no_encontrados: { color: '#64748b', target: 4.9, unit: '%', reverse: true },
  };

  const getAvg = (kpi: string) => {
    if (!technician?.metrics?.[kpi]) return null;
    const values = ['s1', 's2', 's3', 's4', 's5']
      .map(s => technician.metrics[kpi][s]?.value)
      .filter(v => v !== null && v !== undefined) as number[];
    if (values.length === 0) return null;
    return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
  };

  const getLatest = (kpi: string) => {
    if (!technician?.metrics?.[kpi]) return null;
    const weeksOrder = ['s5', 's4', 's3', 's2', 's1'];
    for (const w of weeksOrder) {
      const val = technician.metrics[kpi][w]?.value;
      if (val !== null && val !== undefined) return val;
    }
    return null;
  };

  const scores = {
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

  const latest = {
    resolucion: getLatest('resolucion'),
    productividad: getLatest('productividad'),
    ok1: getLatest('ok1'),
    no_encontrados: getLatest('no_encontrados'),
  };

  // Classification & Insights Logic
  const performanceInfo = useMemo(() => {
    const list: string[] = [];
    let status = 'estable'; // default
    
    // 1. Classification Logic (Status)
    const resolucionVal = scores.resolucion || 0;
    const productivityVal = scores.productividad || 0;
    const reiterosVal = scores.reiteros || 0;

    const isHighPerf = resolucionVal >= 78 && productivityVal >= 6.5;
    const isAtRisk = resolucionVal < 70 || reiterosVal > 5.5;

    if (isHighPerf) status = 'high';
    else if (isAtRisk) status = 'risk';

    // 2. Trend & Operational Insights
    // Multi-week trend check
    ['resolucion', 'productividad', 'ok1', 'reiteros'].forEach(kpi => {
        const weeks = ['s1', 's2', 's3', 's4', 's5'];
        const values = weeks.map(w => technician.metrics?.[kpi]?.[w]?.value).filter(v => v != null);
        if (values.length >= 2) {
            const last = values[values.length - 1];
            const prev = values[values.length - 2];
            
            // Goals / Alert checks
            if (kpi === 'resolucion' && last < 75) list.push("Resolución debajo del objetivo semanal");
            if (kpi === 'reiteros' && last > 5) list.push("Alerta de reiteros en última semana");
            if (kpi === 'productividad' && last > prev) list.push("Mejora en productividad detectada");
            if (kpi === 'resolucion' && last > prev) list.push("Tendencia creciente en resolución");
        }
    });

    // Activity checks
    if ((scores.no_encontrados || 0) > 6.9) list.push("Nivel crítico de No Encontrados");
    if ((scores.deriva_bajadas || 0) > 6.9) list.push("Deriva de bajadas fuera de rango");
    if ((scores.ok1 || 0) < 71) list.push("Bajo rendimiento en 1er OK");

    return { insights: list.slice(0, 3), status };
  }, [technician, scores]);

  const statusConfig = {
    high: { label: 'Alto Rendimiento', color: '#10b981', bg: '#ecfdf5' },
    risk: { label: 'En Riesgo', color: '#ef4444', bg: '#fef2f2' },
    estable: { label: 'Rendimiento Estable', color: '#64748b', bg: '#f1f5f9' }
  }[performanceInfo.status as 'high' | 'risk' | 'estable'] || { label: 'Normal', color: '#64748b', bg: '#f1f5f9' };

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
            alignItems: 'center', // Centered alignment
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
              borderRadius: '32px', // Fully rounded
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.5px', lineHeight: 1 }}>{technician.name}</h2>
                  <div style={{ 
                    padding: '6px 12px',
                    backgroundColor: statusConfig.bg,
                    borderRadius: '10px',
                    color: statusConfig.color,
                    fontSize: '11px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    border: `1px solid ${statusConfig.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusConfig.color }} />
                    {statusConfig.label}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                  <Briefcase size={16} />
                  <span style={{ fontSize: '15px', fontWeight: '700' }}>Célula: <span style={{ color: '#0f172a' }}>{technician.celula}</span></span>
                </div>
              </div>
              <button 
                onClick={onClose}
                style={{ padding: '12px', borderRadius: '16px', border: 'none', backgroundColor: '#f1f5f9', cursor: 'pointer' }}
              >
                <X size={24} color="#0f172a" strokeWidth={3} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
              
              {/* Snapshot Section */}
              <div style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <MetricCard label="Resolución" value={latest.resolucion} unit="%" icon={TrendingUp} color={getStatusColor(latest.resolucion, 75, 70)} isLatest />
                  <MetricCard label="Productividad" value={latest.productividad} unit="" icon={Zap} color={getStatusColor(latest.productividad, 6, 5)} isLatest />
                  <MetricCard label="1er OK" value={latest.ok1} unit="%" icon={CheckCircle2} color={getStatusColor(latest.ok1, 80, 71)} isLatest />
                  <MetricCard label="Hallazgo" value={latest.no_encontrados} unit="%" icon={Search} color={getStatusColor(latest.no_encontrados, 4.9, 6.9, true)} isLatest />
                </div>
              </div>

              {/* Evolution Chart Section */}
              <div style={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '24px', 
                padding: '24px', 
                border: '2px solid #f1f5f9',
                marginBottom: '40px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '950', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evolución Semanal</h3>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {Object.entries(kpiConfigs).map(([kpi, config]) => (
                      <button 
                        key={kpi}
                        onClick={() => setActiveKPIs(prev => ({ ...prev, [kpi]: !prev[kpi] }))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '10px',
                          border: `2px solid ${activeKPIs[kpi] ? config.color : '#e2e8f0'}`,
                          backgroundColor: activeKPIs[kpi] ? `${config.color}10` : 'white',
                          color: activeKPIs[kpi] ? config.color : '#94a3b8',
                          fontSize: '11px',
                          fontWeight: '900',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textTransform: 'uppercase'
                        }}
                      >
                        {kpi === 'ok1' ? '1er OK' : kpi.split('_').join(' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Insights Banner */}
                {performanceInfo.insights.length > 0 && (
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    {performanceInfo.insights.map((insight: string, idx: number) => (
                      <div key={idx} style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '10px 16px', 
                        backgroundColor: '#f0f9ff', 
                        borderRadius: '12px', 
                        borderLeft: '4px solid #0ea5e9'
                      }}>
                        <AlertCircle size={14} color="#0ea5e9" />
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0369a1' }}>{insight}</span>
                      </div>
                    ))}
                  </div>
                )}

                <LineChart data={technician.metrics} configs={kpiConfigs} activeKPIs={activeKPIs} />
              </div>

              {/* KPI Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', marginBottom: '20px' }}>
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
                    <DetailRow label="No Encontrados" value={scores.no_encontrados} unit="%" green={4.9} yellow={6.9} reverse />
                    <DetailRow label="Deriva Bajadas" value={scores.deriva_bajadas} unit="%" green={4.9} yellow={6.9} reverse />
                    <DetailRow label="Cant. Cierres" value={scores.cierres} unit="" green={0} yellow={0} />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { 
          from { opacity: 0; transform: scale(0.95) translateY(10px); } 
          to { opacity: 1; transform: scale(1) translateY(0); } 
        }
      `}</style>
    </>
  );
}
