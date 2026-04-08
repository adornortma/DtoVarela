'use client';

import React from 'react';
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
  ArrowRightLeft
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

// Helper to normalize values for Radar Chart (0-100)
const normalize = (value: number | null, min: number, max: number, inverted = false) => {
  if (value === null) return 0;
  let score = ((value - min) / (max - min)) * 100;
  if (inverted) score = 100 - score;
  return Math.min(Math.max(score, 0), 100);
};

const RadarChart = ({ data }: { data: { label: string; value: number }[] }) => {
  const size = 300;
  const center = size / 2;
  const radius = 100;
  const angleStep = (Math.PI * 2) / data.length;

  const points = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (d.value / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      labelX: center + (radius + 25) * Math.cos(angle),
      labelY: center + (radius + 20) * Math.sin(angle)
    };
  });

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');
  
  // Grid circles
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: size }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* Grid Circles */}
        {gridLevels.map(level => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={radius * level}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}
        
        {/* Axis lines */}
        {points.map((p, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}

        {/* Labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.labelX}
            y={p.labelY}
            textAnchor="middle"
            fontSize="10"
            fontWeight="950"
            fill="#64748b"
            style={{ textTransform: 'uppercase' }}
          >
            {data[i].label}
          </text>
        ))}

        {/* Data polygon */}
        <polygon
          points={polygonPath}
          fill="rgba(1, 157, 244, 0.2)"
          stroke="var(--movistar-blue, #019df4)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--movistar-blue, #019df4)" />
        ))}
      </svg>
    </div>
  );
};

const MetricCard = ({ label, value, unit, color, icon: Icon }: any) => (
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
    border: '1px solid rgba(0,0,0,0.05)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: color.text }}>
      <Icon size={14} strokeWidth={3} />
      <span style={{ fontSize: '10px', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
    </div>
    <div style={{ fontSize: '24px', fontWeight: '950', color: color.text }}>
      {value ?? '-'}<span style={{ fontSize: '14px', fontWeight: '800', opacity: 0.7 }}>{unit}</span>
    </div>
  </div>
);

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

export default function TechnicianDetailsSheet({ isOpen, onClose, technician }: TechnicianDetailsProps) {
  if (!technician) return null;

  // Average function helper
  const getAvg = (kpi: string) => {
    if (!technician.metrics[kpi]) return null;
    const values = ['s1', 's2', 's3', 's4', 's5']
      .map(s => technician.metrics[kpi][s]?.value)
      .filter(v => v !== null && v !== undefined) as number[];
    if (values.length === 0) return null;
    return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
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

  // Radar chart data normalization
  const radarData = [
    { label: 'Resolución', value: normalize(scores.resolucion, 60, 90) },
    { label: '1er OK', value: normalize(scores.ok1, 60, 90) },
    { label: 'Completadas', value: normalize(scores.completadas, 60, 90) },
    { label: 'Productividad', value: normalize(scores.productividad, 3, 9) },
    { label: 'Hallazgo', value: normalize(scores.no_encontrados, 1, 10, true) }, // Non-found inverted
  ];

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
            backdropFilter: 'blur(8px)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '700px',
              height: '85vh',
              backgroundColor: 'white',
              borderTopLeftRadius: '40px',
              borderTopRightRadius: '40px',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -20px 50px rgba(0,0,0,0.15)',
              animation: 'slideUp 0.4s cubic-bezier(0, 0, 0.2, 1)',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.5px', lineHeight: 1 }}>{technician.name}</h2>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    backgroundColor: getStatusColor(scores.resolucion, 75, 70).text,
                    boxShadow: `0 0 10px ${getStatusColor(scores.resolucion, 75, 70).text}` 
                  }}></div>
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
              {/* Summary Cards */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
                <MetricCard label="Resolución" value={scores.resolucion} unit="%" icon={TrendingUp} color={getStatusColor(scores.resolucion, 75, 70)} />
                <MetricCard label="Productividad" value={scores.productividad} unit="" icon={Zap} color={getStatusColor(scores.productividad, 6, 5)} />
                <MetricCard label="1er OK" value={scores.ok1} unit="%" icon={CheckCircle2} color={getStatusColor(scores.ok1, 80, 71)} />
                <MetricCard label="Hallazgo" value={scores.no_encontrados} unit="%" icon={Search} color={getStatusColor(scores.no_encontrados, 4.9, 6.9, true)} />
              </div>

              {/* Radar Chart */}
              <div style={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '24px', 
                padding: '24px', 
                border: '2px solid #f1f5f9',
                marginBottom: '40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Equilibrio de Desempeño</h3>
                <RadarChart data={radarData} />
              </div>

              {/* KPI Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }}>
                <section>
                  <h3 style={{ fontSize: '14px', fontWeight: '950', color: 'var(--movistar-blue)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={16} /> Resultados
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
                    <Activity size={16} /> Actividad
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
        @keyframes slideUp { 
          from { transform: translateY(100%); } 
          to { transform: translateY(0); } 
        }
      `}</style>
    </>
  );
}
