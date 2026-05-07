'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  CheckCircle2, 
  User, 
  ShieldAlert,
  Filter
} from 'lucide-react';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

type KpiCategory = 'productividad' | 'resolucion' | 'reiteros';

interface TechStats {
  id: string;
  nombre: string;
  celula: string;
  productividad: number;
  resolucion: number;
  reiteros: number;
  trend: {
    productividad: number;
    resolucion: number;
    reiteros: number;
  };
  status: 'destacado' | 'seguimiento' | 'critico';
}

const getKpiColor = (val: number, cat: KpiCategory) => {
  if (cat === 'reiteros') {
    return val <= 5 ? '#10b981' : val <= 10 ? '#f59e0b' : '#ef4444';
  }
  if (cat === 'productividad') {
    return val >= 4.5 ? '#10b981' : val >= 3.5 ? '#f59e0b' : '#ef4444';
  }
  return val >= 90 ? '#10b981' : val >= 80 ? '#f59e0b' : '#ef4444';
};

const isRed = (val: number, cat: KpiCategory) => getKpiColor(val, cat) === '#ef4444';

export default function RankingTecnicosPage() {
  const [loading, setLoading] = useState(true);
  const [rankingData, setRankingData] = useState<TechStats[]>([]);
  const [activeTab, setActiveTab] = useState<KpiCategory>('productividad');
  const [viewLevel, setViewLevel] = useState<'distrito' | 'celula'>('distrito');
  const [selectedCelula, setSelectedCelula] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[MONTHS.length - 1]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [thresholds, setThresholds] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const prevMonth = MONTHS[MONTHS.indexOf(selectedMonth) - 1] || selectedMonth;

      const [metricsRes, prevMetricsRes, thresholdsRes] = await Promise.all([
        supabase
          .from('metricas_mensuales')
          .select('*, tecnicos(nombre, apellido, nombre_normalizado)')
          .eq('mes', selectedMonth),
        supabase
          .from('metricas_mensuales')
          .select('*, tecnicos(nombre, apellido, nombre_normalizado)')
          .eq('mes', prevMonth),
        supabase.from('kpi_thresholds').select('*')
      ]);

      const threshMap = (thresholdsRes.data || []).reduce((acc: any, curr) => {
        acc[curr.kpi_name] = { yellow: curr.yellow_threshold, green: curr.green_threshold };
        return acc;
      }, {});
      setThresholds(threshMap);

      const currentMetrics = metricsRes.data || [];
      const prevMetrics = prevMetricsRes.data || [];

      const processedData: TechStats[] = currentMetrics.map(m => {
        const pm = prevMetrics.find(p => p.tecnico_id === m.tecnico_id);
        const tech = m.tecnicos as any;
        const nombreCompleto = tech ? `${tech.apellido}, ${tech.nombre}` : 'Sin Nombre';
        
        const stats: TechStats = {
          id: m.tecnico_id,
          nombre: nombreCompleto,
          celula: m.celula,
          productividad: Number(m.productividad) || 0,
          resolucion: Number(m.resolucion) || 0,
          reiteros: Number(m.reiteros) || 0,
          trend: {
            productividad: calculateTrend(m.productividad, pm?.productividad),
            resolucion: calculateTrend(m.resolucion, pm?.resolucion),
            reiteros: calculateTrend(m.reiteros, pm?.reiteros)
          },
          status: getTechStatus(m, threshMap)
        };
        return stats;
      }).filter(t => t.id !== null); // Filter out cell totals if any

      setRankingData(processedData);
    } catch (error) {
      console.error('Error fetching ranking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (curr: any, prev: any) => {
    if (!prev || prev === 0) return 0;
    return Math.round(((Number(curr) - Number(prev)) / Number(prev)) * 100);
  };

  const getTechStatus = (m: any, thresholds: any): 'destacado' | 'seguimiento' | 'critico' => {
    if (!thresholds) return 'seguimiento';
    
    const prod = Number(m.productividad);
    const reit = Number(m.reiteros);

    if (prod < thresholds.productividad?.yellow || reit > thresholds.reiteros?.yellow) return 'critico';
    if (prod >= thresholds.productividad?.green && reit <= thresholds.reiteros?.green) return 'destacado';
    
    return 'seguimiento';
  };

  const availableCells = Array.from(new Set(rankingData.map(t => t.celula))).sort();

  const filteredRanking = rankingData.filter(t => {
    const matchesSearch = t.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = viewLevel === 'distrito' || t.celula === selectedCelula;
    return matchesSearch && matchesLevel;
  });

  const currentRanking = [...filteredRanking].sort((a, b) => {
    const valA = a[activeTab] as number;
    const valB = b[activeTab] as number;
    return activeTab === 'reiteros' ? valA - valB : valB - valA;
  });

  const criticalByIndicator = filteredRanking
    .filter(t => isRed(t[activeTab], activeTab))
    .sort((a, b) => {
      const valA = a[activeTab] as number;
      const valB = b[activeTab] as number;
      return activeTab === 'reiteros' ? valB - valA : valA - valB;
    });

  const criticalTechs = rankingData.filter(t => t.status === 'critico');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontWeight: '900', color: '#64748b' }}>CARGANDO INTELIGENCIA OPERATIVA...</div>;

  return (
    <div style={{ padding: '24px 0', minHeight: '100vh', color: '#1e293b' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '6px', borderRadius: '8px', color: 'white' }}>
                <Trophy size={16} />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '950', letterSpacing: '-1px' }}>Ranking de Técnicos</h2>
            </div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Productividad, Resolución y Control de Reiteros</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
             <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
             >
                {MONTHS.map(m => <option key={m} value={m}>{m} 2026</option>)}
             </select>
          </div>
        </div>

        {/* Filters Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
          
          {/* Row 1: Search & Level Selection */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '14px' }}>
              <button 
                onClick={() => { setViewLevel('distrito'); setSelectedCelula(null); }}
                style={{ padding: '8px 20px', borderRadius: '11px', border: 'none', backgroundColor: viewLevel === 'distrito' ? 'white' : 'transparent', color: viewLevel === 'distrito' ? '#1e293b' : '#64748b', fontSize: '11px', fontWeight: '900', cursor: 'pointer', boxShadow: viewLevel === 'distrito' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
              >
                VISTA DISTRITO
              </button>
              <button 
                onClick={() => setViewLevel('celula')}
                style={{ padding: '8px 20px', borderRadius: '11px', border: 'none', backgroundColor: viewLevel === 'celula' ? 'white' : 'transparent', color: viewLevel === 'celula' ? '#1e293b' : '#64748b', fontSize: '11px', fontWeight: '900', cursor: 'pointer', boxShadow: viewLevel === 'celula' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
              >
                VISTA CÉLULA
              </button>
            </div>

            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
              <input 
                type="text" 
                placeholder="Buscar por nombre de técnico..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '700' }}
              />
            </div>
          </div>

          {/* Row 2: Cell Buttons (Conditional) */}
          {viewLevel === 'celula' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              {availableCells.map(cell => (
                <button 
                  key={cell}
                  onClick={() => setSelectedCelula(cell)}
                  style={{ 
                    padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', 
                    backgroundColor: selectedCelula === cell ? '#1e293b' : 'white', 
                    color: selectedCelula === cell ? 'white' : '#64748b', 
                    fontSize: '11px', fontWeight: '900', cursor: 'pointer'
                  }}
                >
                  {cell}
                </button>
              ))}
            </div>
          )}

          {/* Row 3: Indicator Selector */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Seleccionar Indicador de Ranking:</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['productividad', 'resolucion', 'reiteros'] as KpiCategory[]).map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  style={{ 
                    padding: '10px 20px', borderRadius: '12px', border: activeTab === cat ? '2px solid #1e293b' : '1px solid #e2e8f0', 
                    backgroundColor: activeTab === cat ? '#f8fafc' : 'white', 
                    color: '#1e293b', fontSize: '12px', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  {cat === 'productividad' && <Zap size={14} />}
                  {cat === 'resolucion' && <CheckCircle2 size={14} />}
                  {cat === 'reiteros' && <Activity size={14} />}
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Ranking Table */}
      <section style={{ backgroundColor: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
            RANKING OPERATIVO: {activeTab.toUpperCase()}
          </h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
              Mostrando {currentRanking.length} técnicos
            </div>
            <button style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} /> EXPORTAR
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Pos.</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Célula</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Valor</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Tendencia</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {/* Render Top 20 or All */}
              {currentRanking.slice(0, showAll ? currentRanking.length : 20).map((t, idx) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx < 3 ? '#f0f9ff' : 'transparent' }}>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      width: '28px', height: '28px', borderRadius: '8px', 
                      backgroundColor: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#f1f5f9',
                      color: idx < 3 ? 'white' : '#64748b',
                      fontSize: '12px', fontWeight: '950'
                    }}>
                      {idx + 1}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ fontWeight: '800', fontSize: '14px' }}>{t.nombre}</div>
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{t.celula}</td>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '950', color: getKpiColor(t[activeTab], activeTab) }}>
                      {t[activeTab]}{activeTab !== 'productividad' && '%'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '800', color: t.trend[activeTab] >= 0 ? '#10b981' : '#ef4444' }}>
                      {t.trend[activeTab] >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {Math.abs(t.trend[activeTab])}%
                    </div>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase',
                      backgroundColor: t.status === 'destacado' ? '#10b98115' : (t.status === 'critico' ? '#ef444415' : '#f59e0b15'),
                      color: t.status === 'destacado' ? '#10b981' : (t.status === 'critico' ? '#ef4444' : '#f59e0b'),
                    }}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}

              {/* Show All Toggle */}
              {!showAll && currentRanking.length > 40 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
                    <button 
                      onClick={() => setShowAll(true)}
                      style={{ padding: '12px 40px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#1e293b', fontSize: '13px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}
                    >
                      VER TODO EL RANKING ({currentRanking.length} TÉCNICOS)
                    </button>
                  </td>
                </tr>
              )}

              {/* Render Critical Zone if not showing all */}
              {!showAll && criticalByIndicator.length > 0 && (
                <>
                  <tr style={{ backgroundColor: '#fff1f2' }}>
                    <td colSpan={6} style={{ padding: '12px 24px', fontSize: '11px', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      ZONA CRÍTICA: TÉCNICOS CON DESVÍOS EN {activeTab.toUpperCase()} ({criticalByIndicator.length})
                    </td>
                  </tr>
                  {criticalByIndicator.map((t) => {
                    const originalIdx = currentRanking.findIndex(r => r.id === t.id);
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '12px', fontWeight: '950' }}>
                            {originalIdx + 1}
                          </span>
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          <div style={{ fontWeight: '800', fontSize: '14px' }}>{t.nombre}</div>
                        </td>
                        <td style={{ padding: '14px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{t.celula}</td>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{ fontSize: '16px', fontWeight: '950', color: getKpiColor(t[activeTab], activeTab) }}>
                            {t[activeTab]}{activeTab !== 'productividad' && '%'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '800', color: t.trend[activeTab] >= 0 ? '#10b981' : '#ef4444' }}>
                            {t.trend[activeTab] >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {Math.abs(t.trend[activeTab])}%
                          </div>
                        </td>
                        <td style={{ padding: '14px 24px' }}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase',
                            backgroundColor: '#ef444415', color: '#ef4444',
                          }}>
                            CRÍTICO
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Intervention Panel (Critical View) */}
      <section style={{ marginTop: '48px', backgroundColor: '#0f172a', borderRadius: '32px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '2px solid #ef4444' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#ef4444', padding: '10px', borderRadius: '14px', color: 'white' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '950', color: 'white', margin: 0 }}>PANEL DE INTERVENCIÓN</h3>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', margin: 0 }}>Técnicos que requieren seguimiento inmediato</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {criticalTechs.length > 0 ? criticalTechs.slice(0, 10).map(t => (
            <div key={t.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px 24px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#ef444420', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                  <User size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '900', color: 'white', margin: 0 }}>{t.nombre}</h4>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', margin: 0 }}>{t.celula}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '32px' }}>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Prod.</p>
                  <span style={{ fontSize: '16px', fontWeight: '950', color: t.productividad < (thresholds?.productividad?.yellow || 0) ? '#ef4444' : '#f59e0b' }}>{t.productividad}</span>
                </div>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Reit.</p>
                  <span style={{ fontSize: '16px', fontWeight: '950', color: t.reiteros > (thresholds?.reincidencias?.yellow || 0) ? '#ef4444' : '#f59e0b' }}>{t.reiteros}%</span>
                </div>
              </div>

              <button style={{ backgroundColor: '#ef4444', color: 'white', padding: '8px 20px', borderRadius: '12px', fontSize: '11px', fontWeight: '950', border: 'none', cursor: 'pointer' }}>
                VER DETALLE
              </button>
            </div>
          )) : (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ fontSize: '14px', fontWeight: '800', color: '#94a3b8' }}>Operación estable. No se detectan desvíos críticos.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
