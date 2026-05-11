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
  Filter,
  X,
  MapPin,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  Clock,
  XCircle
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
  cierres: number;
  no_encontrados: number;
  trend: {
    productividad: number;
    resolucion: number;
    reiteros: number;
  };
  status: 'destacado' | 'seguimiento' | 'critico';
  dni?: string;
}

interface AnalysisData {
  resueltas: {
    total: number;
    max: number;
    sorted: { text: string; count: number }[];
    insight?: string;
  };
  noResueltas: {
    total: number;
    max: number;
    sorted: { text: string; count: number }[];
    insight?: string;
  };
}

const getKpiColor = (val: number, cat: KpiCategory) => {
  if (cat === 'reiteros') {
    return val <= 4.5 ? '#10b981' : val <= 5.0 ? '#f59e0b' : '#ef4444';
  }
  if (cat === 'productividad') {
    return val >= 6.0 ? '#10b981' : val >= 5.0 ? '#f59e0b' : '#ef4444';
  }
  return val >= 75 ? '#10b981' : val >= 70 ? '#f59e0b' : '#ef4444';
};

const isRed = (val: number, cat: KpiCategory) => getKpiColor(val, cat) === '#ef4444';

const AnalysisDrawer = ({ isOpen, onClose, tech, data, loading, month }: { isOpen: boolean, onClose: () => void, tech: TechStats | null, data: AnalysisData | null, loading: boolean, month: string }) => {
  if (!tech) return null;

  return (
    <>
      <div 
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
          zIndex: 6000, opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease'
        }}
      />
      <div style={{
        position: 'fixed', 
        top: '5vh', 
        left: '50%',
        transform: `translateX(-50%) translateY(${isOpen ? '0' : '110%'})`,
        width: 'calc(100% - 48px)', 
        maxWidth: '500px', 
        maxHeight: '90vh',
        backgroundColor: 'white', 
        borderRadius: '32px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
        zIndex: 6001,
        visibility: isOpen ? 'visible' : 'hidden',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'grid', 
        gridTemplateRows: 'auto 1fr', 
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '32px 24px', borderBottom: '1px solid #f1f5f9', position: 'relative', backgroundColor: 'white', zIndex: 10 }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', padding: '8px', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ backgroundColor: '#0ea5e9', padding: '10px', borderRadius: '14px', color: 'white' }}>
              <User size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px' }}>{tech.nombre}</h2>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                Resumen de gestión • {month} 2026
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
             <div style={{ flex: 1, backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '14px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: '#166534', textTransform: 'uppercase' }}>Resueltas</span>
                <span style={{ fontSize: '18px', fontWeight: '950', color: '#14532d' }}>{data?.resueltas.total || 0}</span>
             </div>
             <div style={{ flex: 1, backgroundColor: '#fff1f2', padding: '10px', borderRadius: '14px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: '#991b1b', textTransform: 'uppercase' }}>Fallidas</span>
                <span style={{ fontSize: '18px', fontWeight: '950', color: '#991b1b' }}>{data?.noResueltas.total || 0}</span>
             </div>
             <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '14px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Resolución</span>
                <span style={{ fontSize: '18px', fontWeight: '950', color: '#1e293b' }}>{tech.resolucion}%</span>
             </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Activity size={32} className="animate-spin" style={{ color: '#0ea5e9', margin: '0 auto 16px' }} />
              <p style={{ fontWeight: '800', color: '#64748b' }}>Analizando gestiones...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Resueltas */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                  <h3 style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>Motivos de resolución (OK)</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data?.resueltas.sorted.map((item, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', fontWeight: '700' }}>
                        <span style={{ color: '#334155' }}>{item.text}</span>
                        <span style={{ color: '#64748b' }}>{item.count}</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', backgroundColor: '#10b981', width: `${(item.count / data.resueltas.max) * 100}%`, opacity: 0.7 }}></div>
                      </div>
                    </div>
                  ))}
                  {data?.resueltas.total === 0 && <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Sin datos</p>}
                </div>
              </section>

              {/* No Resueltas */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e' }}></div>
                  <h3 style={{ fontSize: '13px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>Motivos de No Resolución</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data?.noResueltas.sorted.map((item, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', fontWeight: '700' }}>
                        <span style={{ color: '#334155' }}>{item.text}</span>
                        <span style={{ color: '#64748b' }}>{item.count}</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', backgroundColor: '#f43f5e', width: `${(item.count / data.noResueltas.max) * 100}%`, opacity: 0.7 }}></div>
                      </div>
                    </div>
                  ))}
                  {data?.noResueltas.total === 0 && <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Sin datos</p>}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default function RankingTecnicosPage() {
  const [loading, setLoading] = useState(true);
  const [rankingData, setRankingData] = useState<TechStats[]>([]);
  const [activeTab, setActiveTab] = useState<KpiCategory>('productividad');
  const [viewLevel, setViewLevel] = useState<'distrito' | 'celula'>('distrito');
  const [selectedCelula, setSelectedCelula] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[3]); // Abril as default
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [thresholds, setThresholds] = useState<any>(null);
  
  // States for Technician Analysis Bottom Sheet
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState<TechStats | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const monthIdx = MONTHS.indexOf(selectedMonth);
      const prevMonth = MONTHS[monthIdx - 1] || selectedMonth;

      // Definimos la fecha exacta para TOA
      let toaDate = '';
      if (selectedMonth === 'Abril') {
        toaDate = '2026-05-04'; // Semana 1 Mayo (Acumulado Abril)
      } else {
        // Buscamos el lunes más reciente con datos para el mes seleccionado
        const { data: latestDay } = await supabase
          .from('metricas')
          .select('fecha')
          .filter('fecha', 'ilike', `2026-${(monthIdx + 1).toString().padStart(2, '0')}-%`)
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (latestDay) {
          toaDate = latestDay.fecha;
        } else {
          // Fallback: primer día del mes
          toaDate = new Date(Date.UTC(2026, monthIdx, 1)).toISOString().split('T')[0];
        }
      }

      const [metricsRes, prevMetricsRes, thresholdsRes, toaRes] = await Promise.all([
        supabase
          .from('metricas_mensuales')
          .select('*, tecnicos(nombre, apellido, nombre_normalizado, dni)')
          .eq('mes', selectedMonth),
        supabase
          .from('metricas_mensuales')
          .select('*, tecnicos(nombre, apellido, nombre_normalizado, dni)')
          .eq('mes', prevMonth),
        supabase.from('kpi_thresholds').select('*'),
        supabase
          .from('metricas')
          .select('tecnico_id, cierres, no_encontrados')
          .eq('fecha', toaDate)
      ]);

      const threshMap = (thresholdsRes.data || []).reduce((acc: any, curr) => {
        acc[curr.kpi_name] = { yellow: curr.yellow_threshold, green: curr.green_threshold };
        return acc;
      }, {});
      setThresholds(threshMap);

      const currentMetrics = metricsRes.data || [];
      const prevMetrics = prevMetricsRes.data || [];
      const toaData = toaRes.data || [];

      const processedData: TechStats[] = currentMetrics.map(m => {
        const pm = prevMetrics.find(p => p.tecnico_id === m.tecnico_id);
        const toa = toaData.find(t => t.tecnico_id === m.tecnico_id);
        const tech = m.tecnicos as any;
        const nombreCompleto = tech ? `${tech.apellido}, ${tech.nombre}` : 'Sin Nombre';
        
        return {
          id: m.tecnico_id,
          nombre: nombreCompleto,
          celula: m.celula,
          productividad: Number(m.productividad) || 0,
          resolucion: Number(m.resolucion) || 0,
          reiteros: Number(m.reiteros) || 0,
          cierres: toa ? Number(toa.cierres) : 0,
          no_encontrados: toa ? Number(toa.no_encontrados) : 0,
          dni: tech?.dni,
          trend: {
            productividad: pm ? (Number(m.productividad) || 0) - (Number(pm.productividad) || 0) : 0,
            resolucion: pm ? (Number(m.resolucion) || 0) - (Number(pm.resolucion) || 0) : 0,
            reiteros: pm ? (Number(m.reiteros) || 0) - (Number(pm.reiteros) || 0) : 0
          },
          status: getTechStatus(m, threshMap)
        };
      }).filter(t => t.id !== null);

      setRankingData(processedData);
    } catch (error) {
      console.error('Error fetching ranking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechAnalysis = async (tech: TechStats) => {
    try {
      setIsAnalysisLoading(true);
      setSelectedTech(tech);
      setIsAnalysisOpen(true);
      setAnalysisData(null);
      
      const monthIdx = MONTHS.indexOf(selectedMonth);
      const year = 2026;
      const startDate = new Date(Date.UTC(year, monthIdx, 1)).toISOString().split('T')[0];
      const endDate = new Date(Date.UTC(year, monthIdx + 1, 0)).toISOString().split('T')[0];

      const { data: acts, error } = await supabase
        .from('actuaciones')
        .select('*')
        .gte('fecha_cita', startDate)
        .lte('fecha_cita', endDate)
        .ilike('recurso', `%${tech.dni}%`);
      
      if (error) throw error;

      const techActs = acts || [];

      const resueltas: Record<string, number> = {};
      const noResueltas: Record<string, number> = {};
      let totalRes = 0;
      let totalNoRes = 0;

      techActs.forEach(a => {
        const estado = a.estado?.toUpperCase();
        const reason = (a.resolucion || 'Sin detalle').trim();
        if (estado === 'CUMPLIDA') {
          resueltas[reason] = (resueltas[reason] || 0) + 1;
          totalRes++;
        } else {
          noResueltas[reason] = (noResueltas[reason] || 0) + 1;
          totalNoRes++;
        }
      });

      const sortMap = (map: Record<string, number>) => 
        Object.entries(map)
          .map(([text, count]) => ({ text, count }))
          .sort((a, b) => b.count - a.count);

      const sortedRes = sortMap(resueltas);
      const sortedNoRes = sortMap(noResueltas);

      setAnalysisData({
        resueltas: {
          total: totalRes,
          max: sortedRes[0]?.count || 1,
          sorted: sortedRes
        },
        noResueltas: {
          total: totalNoRes,
          max: sortedNoRes[0]?.count || 1,
          sorted: sortedNoRes
        }
      });
    } catch (e) {
      console.error('Error fetching tech analysis:', e);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const getTechStatus = (m: any, thresholds: any): 'destacado' | 'seguimiento' | 'critico' => {
    // If we don't have database thresholds, we use the hardcoded ones in getKpiColor
    const prod = Number(m.productividad);
    const reit = Number(m.reiteros);
    const res = Number(m.resolucion);

    const prodColor = getKpiColor(prod, 'productividad');
    const reitColor = getKpiColor(reit, 'reiteros');
    const resColor = getKpiColor(res, 'resolucion');

    if (prodColor === '#ef4444' || reitColor === '#ef4444' || resColor === '#ef4444') return 'critico';
    if (prodColor === '#10b981' && reitColor === '#10b981' && resColor === '#10b981') return 'destacado';
    return 'seguimiento';
  };

  const availableCells = Array.from(new Set(rankingData.map(t => t.celula))).sort();

  const filteredRanking = rankingData.filter(t => {
    const matchesSearch = t.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = viewLevel === 'distrito' || t.celula === selectedCelula;
    return matchesSearch && matchesLevel;
  });

  const sortedRanking = [...filteredRanking].sort((a, b) => {
    const valA = a[activeTab] as number;
    const valB = b[activeTab] as number;
    return activeTab === 'reiteros' ? valA - valB : valB - valA;
  });

  const criticalByIndicator = sortedRanking.filter(t => isRed(t[activeTab], activeTab));
  const normalTechs = sortedRanking.filter(t => !isRed(t[activeTab], activeTab));
  const criticalTechs = rankingData.filter(t => t.status === 'critico');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontWeight: '900', color: '#64748b' }}>CARGANDO RANKING...</div>;

  return (
    <div style={{ padding: '24px 0', minHeight: '100vh', color: '#1e293b' }}>
      
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'white', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
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

      <section style={{ backgroundColor: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
            RANKING OPERATIVO: {activeTab.toUpperCase()}
          </h3>
          <button style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} /> EXPORTAR
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', width: '80px' }}>Pos.</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Célula</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>{activeTab === 'resolucion' ? 'Resolución' : activeTab === 'reiteros' ? 'Reiteros' : 'Productividad'}</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Cant. Cierres</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>No Encontradas</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '14px' }}>
              {(showAll ? sortedRanking : normalTechs.slice(0, 20)).map((t, idx) => (
                <tr 
                  key={t.id} 
                  onClick={() => fetchTechAnalysis(t)}
                  style={{ 
                    borderBottom: '1px solid #f1f5f9', 
                    backgroundColor: idx < 3 && !searchTerm && !selectedCelula ? 'rgba(241, 245, 249, 0.3)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = idx < 3 && !searchTerm && !selectedCelula ? 'rgba(241, 245, 249, 0.3)' : 'transparent'}
                >
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px',
                      backgroundColor: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#f1f5f9',
                      color: idx < 3 ? 'white' : '#64748b', fontSize: '12px', fontWeight: '950'
                    }}>
                      {idx + 1}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <div style={{ fontWeight: '900', fontSize: '15px', color: '#1e293b' }}>{t.nombre}</div>
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{t.celula}</td>
                  <td style={{ padding: '14px 24px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '950', color: getKpiColor(t[activeTab], activeTab) }}>
                      {t[activeTab]}{activeTab !== 'productividad' && '%'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{t.cierres}</td>
                  <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '800', color: t.no_encontrados > 6.9 ? '#ef4444' : '#1e293b' }}>{t.no_encontrados}%</td>
                </tr>
              ))}

              {!showAll && criticalByIndicator.length > 0 && (
                <>
                  <tr style={{ backgroundColor: '#fff1f2' }}>
                    <td colSpan={6} style={{ padding: '12px 24px', fontSize: '11px', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      ZONA CRÍTICA: TÉCNICOS CON DESVÍOS EN {activeTab.toUpperCase()} ({criticalByIndicator.length})
                    </td>
                  </tr>
                  {criticalByIndicator.map((t) => {
                    const originalIdx = sortedRanking.findIndex(r => r.id === t.id);
                    return (
                      <tr 
                        key={t.id} 
                        onClick={() => fetchTechAnalysis(t)}
                        style={{ 
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
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
                        <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{t.cierres}</td>
                        <td style={{ padding: '14px 24px', fontSize: '14px', fontWeight: '800', color: t.no_encontrados > 6.9 ? '#ef4444' : '#1e293b' }}>{t.no_encontrados}%</td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <AnalysisDrawer 
        isOpen={isAnalysisOpen} 
        onClose={() => setIsAnalysisOpen(false)} 
        tech={selectedTech}
        data={analysisData}
        loading={isAnalysisLoading}
        month={selectedMonth}
      />
    </div>
  );
}
