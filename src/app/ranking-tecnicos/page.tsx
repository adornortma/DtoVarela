'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Users, 
  Star, 
  Wrench, 
  Clock, 
  Calendar,
  Search,
  ChevronRight,
  Filter,
  BarChart3,
  Loader2,
  ShieldAlert,
  Medal,
  Activity,
  User,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  CheckCircle2,
  Zap
} from 'lucide-react';

// --- Types ---
type Period = 'semanal' | 'mensual';
type KpiCategory = 'productividad' | 'nps' | 'calidad' | 'reincidencias' | 'puntualidad';

interface TechStats {
  id: string;
  nombre: string;
  celula: string;
  productividad: number;
  nps: number;
  calidad: number;
  reincidencias: number;
  puntualidad: number;
  total_servicios: number;
  trend: Record<string, number>;
  isCritical: boolean;
  status: 'destacado' | 'seguimiento' | 'critico';
}

interface Thresholds {
  productividad: { green: number; yellow: number };
  nps: { green: number; yellow: number };
  calidad: { green: number; yellow: number };
  reincidencias: { green: number; yellow: number; reverse: boolean };
  puntualidad: { green: number; yellow: number };
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// --- Helper Components ---

const StatCard = ({ title, value, icon, color, subValue }: { title: string, value: number, icon: any, color: string, subValue: string }) => (
  <div style={{ 
    backgroundColor: 'white', 
    padding: '20px', 
    borderRadius: '24px', 
    border: '1px solid #e2e8f0', 
    flex: 1,
    minWidth: '200px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  }}>
    <div style={{ backgroundColor: `${color}15`, padding: '12px', borderRadius: '16px', color: color }}>
      {icon}
    </div>
    <div>
      <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{title}</p>
      <h3 style={{ fontSize: '24px', fontWeight: '950', color: '#1e293b', margin: 0 }}>{value}</h3>
      <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', margin: 0 }}>{subValue}</p>
    </div>
  </div>
);

const HighlightCard = ({ title, tech, kpiName, value, unit, position, trend, color, icon }: any) => (
  <div style={{ 
    backgroundColor: 'white', 
    padding: '24px', 
    borderRadius: '28px', 
    border: '1px solid #e2e8f0', 
    flex: 1,
    minWidth: '240px',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s',
    cursor: 'pointer'
  }}
  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
      {React.cloneElement(icon, { size: 100 })}
    </div>
    
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
      <div style={{ backgroundColor: `${color}15`, padding: '8px', borderRadius: '12px', color: color }}>
        {icon}
      </div>
      <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '900' }}>
        #{position} RANKING
      </div>
    </div>

    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <User size={20} color="#64748b" />
      </div>
      <div>
        <h4 style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b', margin: 0 }}>{tech.nombre}</h4>
        <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', margin: 0 }}>{tech.celula}</p>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
      <span style={{ fontSize: '28px', fontWeight: '950', color: '#1e293b' }}>{value}</span>
      <span style={{ fontSize: '14px', fontWeight: '800', color: '#94a3b8' }}>{unit}</span>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {trend >= 0 ? <TrendingUp size={14} color="#10b981" /> : <TrendingDown size={14} color="#ef4444" />}
      <span style={{ fontSize: '12px', fontWeight: '800', color: trend >= 0 ? '#10b981' : '#ef4444' }}>
        {trend >= 0 ? '+' : ''}{trend}% vs anterior
      </span>
    </div>
  </div>
);

// --- Main Page Component ---

export default function RankingTecnicosPage() {
  const [loading, setLoading] = useState(true);
  const [viewLevel, setViewLevel] = useState<'distrito' | 'celula'>('distrito');
  const [selectedCelula, setSelectedCelula] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [activeTab, setActiveTab] = useState<KpiCategory>('productividad');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [techs, setTechs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [prevMetrics, setPrevMetrics] = useState<any[]>([]);
  const [npsData, setNpsData] = useState<any[]>([]);
  const [prevNpsData, setPrevNpsData] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds>({
    productividad: { green: 6, yellow: 5 },
    nps: { green: 70, yellow: 50 },
    calidad: { green: 80, yellow: 70 },
    reincidencias: { green: 4.5, yellow: 6, reverse: true },
    puntualidad: { green: 80, yellow: 70 }
  });

  const availableCells = useMemo(() => {
    const cells = Array.from(new Set(techs.map(t => t.celula))).filter(Boolean);
    return cells.sort();
  }, [techs]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Techs
      const { data: dbTechs } = await supabase.from('tecnicos').select('*');
      setTechs(dbTechs || []);

      // 2. Fetch Thresholds
      const { data: dbThresholds } = await supabase.from('kpi_thresholds').select('*');
      if (dbThresholds) {
        const newThresholds = { ...thresholds };
        dbThresholds.forEach(t => {
          if (newThresholds[t.kpi as keyof Thresholds]) {
            (newThresholds[t.kpi as keyof Thresholds] as any).green = t.verde;
            (newThresholds[t.kpi as keyof Thresholds] as any).amarillo = t.amarillo;
          }
        });
        setThresholds(newThresholds);
      }

      // 3. Fetch Metrics (Current Month)
      const monthIdx = MONTHS.indexOf(selectedMonth);
      const year = new Date().getFullYear();
      const start = new Date(year, monthIdx, 1).toISOString();
      const end = new Date(year, monthIdx + 1, 0, 23, 59, 59).toISOString();

      // Previous Month for trends
      const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;
      const prevYear = monthIdx === 0 ? year - 1 : year;
      const prevStart = new Date(prevYear, prevMonthIdx, 1).toISOString();
      const prevEnd = new Date(prevYear, prevMonthIdx + 1, 0, 23, 59, 59).toISOString();

      const [currentMetricsRes, prevMetricsRes, currentNpsRes, prevNpsRes] = await Promise.all([
        supabase.from('metricas').select('*').gte('fecha', start).lte('fecha', end),
        supabase.from('metricas').select('*').gte('fecha', prevStart).lte('fecha', prevEnd),
        supabase.from('nps_detalles').select('*').gte('fecha', start).lte('fecha', end),
        supabase.from('nps_detalles').select('*').gte('fecha', prevStart).lte('fecha', prevEnd)
      ]);

      setMetrics(currentMetricsRes.data || []);
      setPrevMetrics(prevMetricsRes.data || []);
      setNpsData(currentNpsRes.data || []);
      setPrevNpsData(prevNpsRes.data || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  // --- Data Processing ---
  const rankingData = useMemo(() => {
    if (loading) return [];

    const techMap = new Map<string, TechStats>();

    // Initial pass: consolidate names and cells
    techs.forEach(t => {
      const fullName = `${t.apellido}, ${t.nombre}`;
      techMap.set(t.id, {
        id: t.id,
        nombre: fullName,
        celula: t.celula || 'DISTRITO',
        productividad: 0,
        nps: 0,
        calidad: 0,
        reincidencias: 0,
        puntualidad: 0,
        total_servicios: 0,
        trend: {
          productividad: 0,
          nps: 0,
          calidad: 0,
          reincidencias: 0,
          puntualidad: 0
        },
        isCritical: false,
        status: 'seguimiento'
      });
    });

    const calculateKpis = (dataList: any[], techId: string, isCurrent: boolean) => {
      const stats = techMap.get(techId);
      if (!stats) return null;

      const techMetrics = dataList.filter(m => m.tecnico_id === techId);
      if (techMetrics.length === 0) return null;

      const totalProd = techMetrics.reduce((acc, curr) => acc + (curr.productividad || 0), 0);
      const totalOk1 = techMetrics.reduce((acc, curr) => acc + (curr.ok1 || 0), 0);
      const totalReit = techMetrics.reduce((acc, curr) => acc + (curr.reitero || 0), 0);
      const totalPunt = techMetrics.reduce((acc, curr) => acc + (curr.puntualidad || 0), 0);
      const count = techMetrics.length;

      const result = {
        productividad: Number((totalProd / count).toFixed(2)),
        calidad: Number((totalOk1 / count).toFixed(1)),
        reincidencias: Number((totalReit / count).toFixed(1)),
        puntualidad: Number((totalPunt / count).toFixed(1)),
        count
      };

      if (isCurrent) {
        stats.productividad = result.productividad;
        stats.calidad = result.calidad;
        stats.reincidencias = result.reincidencias;
        stats.puntualidad = result.puntualidad;
        stats.total_servicios = count;
      }

      return result;
    };

    const calculateNps = (npsList: any[], techId: string, isCurrent: boolean) => {
      const stats = techMap.get(techId);
      const tech = techs.find(t => t.id === techId);
      if (!stats || !tech) return null;

      const techNps = npsList.filter(n => n.dni_tecnico === tech.dni || `${tech.apellido}, ${tech.nombre}`.toUpperCase() === n.nombre_tecnico.toUpperCase());
      if (techNps.length === 0) return null;

      const p = techNps.reduce((acc, curr) => acc + (curr.promotor || 0), 0);
      const d = techNps.reduce((acc, curr) => acc + (curr.detractor || 0), 0);
      const nps = Math.round(((p - d) / techNps.length) * 100);

      if (isCurrent) {
        stats.nps = nps;
      }

      return nps;
    };

    // Process each tech
    techs.forEach(t => {
      const current = calculateKpis(metrics, t.id, true);
      const prev = calculateKpis(prevMetrics, t.id, false);
      const currentNps = calculateNps(npsData, t.id, true);
      const prevNps = calculateNps(prevNpsData, t.id, false);

      const stats = techMap.get(t.id);
      if (stats && current && prev) {
        stats.trend.productividad = prev.productividad ? Math.round(((current.productividad - prev.productividad) / prev.productividad) * 100) : 0;
        stats.trend.calidad = prev.calidad ? Math.round(current.calidad - prev.calidad) : 0;
        stats.trend.puntualidad = prev.puntualidad ? Math.round(current.puntualidad - prev.puntualidad) : 0;
        stats.trend.reincidencias = prev.reincidencias ? Math.round(current.reincidencias - prev.reincidencias) : 0;
      }
      if (stats && currentNps !== null && prevNps !== null) {
        stats.trend.nps = currentNps - prevNps;
      }
    });

    // Filter by Cell if applicable
    let finalData = Array.from(techMap.values());
    if (viewLevel === 'celula' && selectedCelula) {
      finalData = finalData.filter(t => t.celula === selectedCelula);
    }

    // Filter out techs with no data for this month
    finalData = finalData.filter(t => t.total_servicios > 0 || t.nps !== 0);

    // Apply Search
    if (searchTerm) {
      finalData = finalData.filter(t => t.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Determine Status
    finalData.forEach(t => {
      const prodCrit = t.productividad < thresholds.productividad.yellow;
      const npsCrit = t.nps < thresholds.nps.yellow;
      const reitCrit = t.reincidencias > thresholds.reincidencias.yellow;
      
      const criticalCount = [prodCrit, npsCrit, reitCrit].filter(Boolean).length;
      
      if (criticalCount >= 2 || (t.productividad > 0 && prodCrit)) {
        t.status = 'critico';
        t.isCritical = true;
      } else if (criticalCount === 1) {
        t.status = 'seguimiento';
      } else if (t.productividad >= thresholds.productividad.green && t.nps >= thresholds.nps.green) {
        t.status = 'destacado';
      }
    });

    return finalData;
  }, [techs, metrics, prevMetrics, npsData, prevNpsData, viewLevel, selectedCelula, searchTerm, thresholds, loading, selectedMonth]);

  // Derived Rankings
  const topProductividad = useMemo(() => [...rankingData].sort((a, b) => b.productividad - a.productividad).slice(0, 1)[0], [rankingData]);
  const topNPS = useMemo(() => [...rankingData].sort((a, b) => b.nps - a.nps).slice(0, 1)[0], [rankingData]);
  const topCalidad = useMemo(() => [...rankingData].sort((a, b) => b.calidad - a.calidad).slice(0, 1)[0], [rankingData]);
  
  const criticalTechs = useMemo(() => rankingData.filter(t => t.status === 'critico').sort((a, b) => a.productividad - b.productividad), [rankingData]);

  const currentRanking = useMemo(() => {
    return [...rankingData].sort((a, b) => {
      if (activeTab === 'productividad') return b.productividad - a.productividad;
      if (activeTab === 'nps') return b.nps - a.nps;
      if (activeTab === 'calidad') return b.calidad - a.calidad;
      if (activeTab === 'reincidencias') return a.reincidencias - b.reincidencias;
      if (activeTab === 'puntualidad') return b.puntualidad - a.puntualidad;
      return 0;
    });
  }, [rankingData, activeTab]);

  const getKpiColor = (val: number, cat: KpiCategory) => {
    const config = thresholds[cat === 'calidad' ? 'calidad' : cat];
    if (!config) return '#1e293b';
    
    if (cat === 'reincidencias') {
      if (val <= config.green) return '#10b981';
      if (val <= config.yellow) return '#f59e0b';
      return '#ef4444';
    } else {
      if (val >= config.green) return '#10b981';
      if (val >= config.yellow) return '#f59e0b';
      return '#ef4444';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
        <Loader2 size={48} className="animate-spin" color="#019df4" />
        <p style={{ fontSize: '14px', fontWeight: '800', color: '#64748b' }}>Procesando rankings operativos...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 0', minHeight: '100vh', color: '#1e293b' }}>
      
      {/* Header & Controls */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '6px', borderRadius: '8px', color: 'white' }}>
                <Trophy size={16} />
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '950', letterSpacing: '-1px' }}>Ranking de Técnicos</h2>
            </div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Análisis comparativo de performance y gestión operativa</p>
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

        {/* View Level Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#e2e8f0', padding: '6px', borderRadius: '18px' }}>
            <button 
              onClick={() => { setViewLevel('distrito'); setSelectedCelula(null); }}
              style={{ padding: '8px 24px', borderRadius: '14px', border: 'none', backgroundColor: viewLevel === 'distrito' ? 'white' : 'transparent', color: viewLevel === 'distrito' ? '#1e293b' : '#64748b', fontSize: '12px', fontWeight: '900', cursor: 'pointer', boxShadow: viewLevel === 'distrito' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
            >
              VISTA DISTRITO
            </button>
            <button 
              onClick={() => setViewLevel('celula')}
              style={{ padding: '8px 24px', borderRadius: '14px', border: 'none', backgroundColor: viewLevel === 'celula' ? 'white' : 'transparent', color: viewLevel === 'celula' ? '#1e293b' : '#64748b', fontSize: '12px', fontWeight: '900', cursor: 'pointer', boxShadow: viewLevel === 'celula' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
            >
              VISTA CÉLULA
            </button>
          </div>

          {viewLevel === 'celula' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {availableCells.map(cell => (
                <button 
                  key={cell}
                  onClick={() => setSelectedCelula(cell)}
                  style={{ 
                    padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', 
                    backgroundColor: selectedCelula === cell ? '#019df4' : 'white', 
                    color: selectedCelula === cell ? 'white' : '#64748b', 
                    fontSize: '11px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {cell}
                </button>
              ))}
            </div>
          )}
          
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
            <input 
              type="text" 
              placeholder="Buscar técnico..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '14px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '700' }}
            />
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <StatCard title="Técnicos Destacados" value={rankingData.filter(t => t.status === 'destacado').length} icon={<Medal size={24} />} color="#10b981" subValue="Cumplen todos los objetivos" />
        <StatCard title="En Seguimiento" value={rankingData.filter(t => t.status === 'seguimiento').length} icon={<Activity size={24} />} color="#f59e0b" subValue="KPIs cerca del límite" />
        <StatCard title="Estado Crítico" value={rankingData.filter(t => t.status === 'critico').length} icon={<ShieldAlert size={24} />} color="#ef4444" subValue="Atención inmediata requerida" />
      </div>

      {/* Block 1: Destacados */}
      <section style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Star size={16} fill="#f59e0b" color="#f59e0b" /> Líderes del Mes
        </h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {topProductividad && <HighlightCard title="Mejor Productividad" tech={topProductividad} kpiName="Productividad" value={topProductividad.productividad} unit="v/d" position={1} trend={topProductividad.trend.productividad} color="#019df4" icon={<Zap size={24} />} />}
          {topNPS && <HighlightCard title="Mejor NPS" tech={topNPS} kpiName="NPS" value={topNPS.nps} unit="pts" position={1} trend={topNPS.trend.nps} color="#10b981" icon={<MessageSquare size={24} />} />}
          {topCalidad && <HighlightCard title="Calidad Técnica" tech={topCalidad} kpiName="Calidad" value={topCalidad.calidad} unit="%" position={1} trend={topCalidad.trend.calidad} color="#8b5cf6" icon={<Wrench size={24} />} />}
        </div>
      </section>

      {/* Block 2: Rankings Table */}
      <section style={{ marginBottom: '48px', backgroundColor: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '14px' }}>
            {(['productividad', 'nps', 'calidad', 'reincidencias', 'puntualidad'] as KpiCategory[]).map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveTab(cat)}
                style={{ 
                  padding: '8px 16px', borderRadius: '11px', border: 'none', 
                  backgroundColor: activeTab === cat ? 'white' : 'transparent', 
                  color: activeTab === cat ? '#1e293b' : '#64748b', 
                  fontSize: '11px', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase',
                  boxShadow: activeTab === cat ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <button style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '11px', fontWeight: '800', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} /> EXPORTAR LISTADO
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Pos.</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Célula</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>{activeTab}</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Estado</th>
                <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {currentRanking.map((t, idx) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      width: '28px', height: '28px', borderRadius: '8px', 
                      backgroundColor: idx < 3 ? '#1e293b' : '#f1f5f9',
                      color: idx < 3 ? 'white' : '#64748b',
                      fontSize: '12px', fontWeight: '950'
                    }}>
                      {idx + 1}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={16} color="#94a3b8" />
                      </div>
                      <span style={{ fontWeight: '800', fontSize: '14px' }}>{t.nombre}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{t.celula}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        fontSize: '16px', fontWeight: '950', 
                        color: getKpiColor(t[activeTab as keyof TechStats] as number, activeTab) 
                      }}>
                        {t[activeTab as keyof TechStats]}
                        <span style={{ fontSize: '10px', marginLeft: '2px', opacity: 0.6 }}>
                          {activeTab === 'productividad' ? '' : '%'}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '6px', 
                      padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '900',
                      backgroundColor: t.status === 'destacado' ? '#10b98115' : (t.status === 'critico' ? '#ef444415' : '#f59e0b15'),
                      color: t.status === 'destacado' ? '#10b981' : (t.status === 'critico' ? '#ef4444' : '#f59e0b'),
                      textTransform: 'uppercase'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                      {t.status}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <button style={{ background: 'none', border: 'none', color: '#019df4', cursor: 'pointer' }}>
                      <ChevronRight size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Block 3: Vista Críticos */}
      <section style={{ backgroundColor: '#0f172a', borderRadius: '32px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '2px solid #ef4444' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#ef4444', padding: '10px', borderRadius: '14px', color: 'white', animation: 'pulse 2s infinite' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '950', color: 'white', margin: 0 }}>VISTA CRÍTICOS</h3>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', margin: 0 }}>Detección automática de desvíos operativos graves</p>
            </div>
          </div>
          <div style={{ backgroundColor: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '900' }}>
            {criticalTechs.length} TÉCNICOS EN RIESGO
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {criticalTechs.length > 0 ? criticalTechs.map(t => (
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
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Productividad</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '950', color: t.productividad < thresholds.productividad.yellow ? '#ef4444' : '#f59e0b' }}>{t.productividad}</span>
                    {t.productividad < thresholds.productividad.yellow && <ArrowDown size={14} color="#ef4444" />}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>NPS</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '950', color: t.nps < thresholds.nps.yellow ? '#ef4444' : '#f59e0b' }}>{t.nps}</span>
                    {t.nps < thresholds.nps.yellow && <ArrowDown size={14} color="#ef4444" />}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                 <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '950' }}>CRÍTICO</div>
                 <button style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                   <ChevronRight size={18} />
                 </button>
              </div>
            </div>
          )) : (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ fontSize: '14px', fontWeight: '800', color: '#94a3b8' }}>No se detectaron técnicos en estado crítico este mes.</p>
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
