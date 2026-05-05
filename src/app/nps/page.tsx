'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  MessageSquare, 
  User, 
  ChevronRight, 
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell as RechartsCell,
  LabelList
} from 'recharts';

// --- Types ---
interface NPSAgregado {
  id: string;
  mes: string;
  distrito: string;
  celula: string | null;
  nps: number;
  total_encuestas: number;
}

interface NPSEncuesta {
  access_id: string;
  fecha: string;
  tx_celula: string;
  dni_tecnico: string;
  nombre_tecnico: string;
  recomendacion: number;
  cordialidad_tecnico: number;
  promotor: number;
  detractor: number;
  obs_recomendacion: string;
  obs_wapp: string;
  obs_resoluci: string;
}

// --- Components ---

const MetricCard = ({ title, value, subValue, type }: { title: string, value: string | number, subValue?: string, type: 'nps' | 'total' }) => (
  <div style={{ backgroundColor: 'white', padding: '10px 16px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', flex: 1 }}>
    <p style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{title}</p>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: '950', color: '#1a1a1a', letterSpacing: '-0.5px', margin: 0 }}>
        {type === 'nps' ? (typeof value === 'number' ? value.toFixed(0) : value) : value}
      </h3>
      {type === 'nps' && <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>pts</span>}
    </div>
    {subValue && <p style={{ fontSize: '10px', fontWeight: '700', color: '#019df4', margin: 0 }}>{subValue}</p>}
  </div>
);

const TrendChart = ({ data }: { data: any[] }) => {
  if (data.length === 0) return null;

  return (
    <div style={{ 
      backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', 
      marginBottom: '24px', height: '320px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <TrendingUp size={16} color="#019df4" />
        <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Evolución Histórica NPS
        </h3>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={data} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="mes" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 900, fill: '#000000' }} 
            dy={10}
          />
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 900, fill: '#000000' }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 900, fill: '#000000' }}
            domain={[-100, 110]}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: '700' }}
          />
          <Bar 
            yAxisId="left"
            dataKey="total_encuestas" 
            name="Encuestas" 
            fill="#1e293b" 
            radius={[4, 4, 0, 0]} 
            barSize={40}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="nps" 
            name="NPS" 
            stroke="#10b981" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 6, strokeWidth: 0 }}
          >
            <LabelList dataKey="nps" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: '#000000' }} offset={10} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function NPSDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [agregado, setAgregado] = useState<NPSAgregado[]>([]);
  const [detalles, setDetalles] = useState<NPSEncuesta[]>([]);
  
  // Selection State
  const [selectedDistrito] = useState('VARELA');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // MM-YYYY
  const [selectedCelula, setSelectedCelula] = useState<string | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<'TODOS' | 'PROMOTORES' | 'NEUTROS' | 'DETRACTORES'>('TODOS');
  
  // Expansion State
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());
  const [expandedTechs, setExpandedTechs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: aggData } = await supabase.from('nps_agregado').select('*').order('mes', { ascending: true });
      const { data: detData } = await supabase.from('nps_detalles').select('*').order('fecha', { ascending: false });
      
      const safeAgg = aggData || [];
      const safeDet = detData || [];
      
      setAgregado(safeAgg);
      setDetalles(safeDet);
      
      const aggMonths = safeAgg.map(d => d.mes);
      const detMonths = safeDet.map(d => {
        const date = new Date(d.fecha);
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${m}-${y}`;
      });
      
      const allMonths = [...new Set([...aggMonths, ...detMonths])].sort((a, b) => {
        const [mA, yA] = a.split('-').map(Number);
        const [mB, yB] = b.split('-').map(Number);
        return yB !== yA ? yB - yA : mB - mA;
      });

      if (allMonths.length > 0 && !selectedMonth) {
        setSelectedMonth(allMonths[0]);
      }
    } catch (err) {
      console.error("Error fetching NPS data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCell = (cell: string) => {
    const newExpanded = new Set(expandedCells);
    if (newExpanded.has(cell)) newExpanded.delete(cell);
    else newExpanded.add(cell);
    setExpandedCells(newExpanded);
  };

  const toggleTech = (techKey: string) => {
    const newExpanded = new Set(expandedTechs);
    if (newExpanded.has(techKey)) newExpanded.delete(techKey);
    else newExpanded.add(techKey);
    setExpandedTechs(newExpanded);
  };

  // Derived Data
  const availableCells = useMemo(() => {
    const cells = new Set(agregado.filter(d => d.celula !== null && d.distrito === selectedDistrito).map(d => d.celula!));
    detalles.forEach(d => cells.add(d.tx_celula));
    
    // Filter out unwanted cells
    const filtered = Array.from(cells).filter(c => c !== 'ACCESO_VARELA');
    return filtered.sort();
  }, [agregado, detalles, selectedDistrito]);

  const filteredAgregado = useMemo(() => {
    return agregado.filter(d => d.distrito === selectedDistrito);
  }, [agregado, selectedDistrito]);

  const cellStats = useMemo(() => {
    const fromAgg = filteredAgregado.filter(d => d.mes === selectedMonth && d.celula !== null);
    
    // If a cell is selected, only show that cell
    const targetAgg = selectedCelula 
      ? fromAgg.filter(c => c.celula === selectedCelula)
      : fromAgg;

    if (targetAgg.length > 0) return targetAgg;

    const monthDetalles = detalles.filter(d => {
      const date = new Date(d.fecha);
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      const matchesMonth = `${m}-${y}` === selectedMonth;
      const matchesCell = selectedCelula ? d.tx_celula === selectedCelula : true;
      return matchesMonth && matchesCell;
    });

    const cellMap = new Map<string, { nps: number, count: number, p: number, d: number }>();
    monthDetalles.forEach(s => {
      const entry = cellMap.get(s.tx_celula) || { nps: 0, count: 0, p: 0, d: 0 };
      entry.count++;
      entry.p += s.promotor;
      entry.d += s.detractor;
      cellMap.set(s.tx_celula, entry);
    });

    return Array.from(cellMap.entries()).map(([name, stats]) => ({
      id: name,
      mes: selectedMonth,
      distrito: selectedDistrito,
      celula: name,
      nps: Math.round(((stats.p - stats.d) / (stats.count || 1)) * 100),
      total_encuestas: stats.count
    }));
  }, [filteredAgregado, selectedMonth, detalles, selectedDistrito, selectedCelula]);

  const currentMonthData = useMemo(() => {
    const fromAgg = filteredAgregado.find(d => d.mes === selectedMonth && d.celula === selectedCelula);
    if (fromAgg) return fromAgg;
    
    const monthDetalles = detalles.filter(d => {
      const date = new Date(d.fecha);
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      const matchesMonth = `${m}-${y}` === selectedMonth;
      const matchesCell = selectedCelula ? d.tx_celula === selectedCelula : true;
      return matchesMonth && matchesCell;
    });
    const p = monthDetalles.reduce((acc, d) => acc + d.promotor, 0);
    const d = monthDetalles.reduce((acc, d) => acc + d.detractor, 0);
    
    return {
      id: 'total',
      mes: selectedMonth,
      distrito: selectedDistrito,
      celula: selectedCelula,
      nps: Math.round(((p - d) / (monthDetalles.length || 1)) * 100),
      total_encuestas: monthDetalles.length
    };
  }, [filteredAgregado, selectedMonth, detalles, selectedDistrito, selectedCelula]);

  const trendData = useMemo(() => {
    // 1. Try to get from aggregate table (fastest/pre-calculated)
    const fromAgg = filteredAgregado
      .filter(d => d.celula === selectedCelula)
      .sort((a, b) => {
        const [mA, yA] = a.mes.split('-').map(Number);
        const [mB, yB] = b.mes.split('-').map(Number);
        return yA !== yB ? yA - yB : mA - mB;
      });

    if (fromAgg.length > 0) return fromAgg;

    // 2. Fallback: Calculate from raw details
    const monthlyMap = new Map<string, { nps: number, total_encuestas: number, p: number, d: number }>();
    detalles.forEach(d => {
      if (!d.fecha) return;
      if (selectedCelula && d.tx_celula !== selectedCelula) return;

      const date = new Date(d.fecha);
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      const key = `${m}-${y}`;
      
      const entry = monthlyMap.get(key) || { nps: 0, total_encuestas: 0, p: 0, d: 0 };
      entry.total_encuestas++;
      entry.p += (d.promotor || 0);
      entry.d += (d.detractor || 0);
      monthlyMap.set(key, entry);
    });

    return Array.from(monthlyMap.entries())
      .map(([mes, stats]) => ({
        mes,
        nps: Math.round(((stats.p - stats.d) / (stats.total_encuestas || 1)) * 100),
        total_encuestas: stats.total_encuestas
      }))
      .sort((a, b) => {
        const [mA, yA] = a.mes.split('-').map(Number);
        const [mB, yB] = b.mes.split('-').map(Number);
        return yA !== yB ? yA - yB : mA - mB;
      });
  }, [filteredAgregado, detalles, selectedCelula]);

  const getNPSColor = (nps: number) => {
    if (nps > 70) return '#10b981';
    if (nps >= 50) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader2 className="animate-spin" size={48} color="#019df4" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '24px 40px' }}>
      {/* Header */}
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
             <div style={{ padding: '4px', backgroundColor: '#1a171e', borderRadius: '6px', color: 'white' }}>
               <BarChart3 size={14} />
             </div>
             <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Satisfacción NPS</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '950', color: '#1a1a1a', letterSpacing: '-1px' }}>
            NPS Distrito {selectedDistrito}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={fetchData}
            style={{ padding: '8px 12px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '11px' }}
          >
            <Loader2 size={14} className={loading ? "animate-spin" : ""} />
            REFRESCAR
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Trend Chart */}
        <TrendChart data={trendData} />

        {/* 1. Cell Selector */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '4px' }}>
            SELECCIONAR CÉLULA
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', backgroundColor: 'white', padding: '10px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setSelectedCelula(null)}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: selectedCelula === null ? '2px solid #019df4' : '1px solid #e2e8f0',
                backgroundColor: selectedCelula === null ? '#019df4' : '#f8fafc',
                color: selectedCelula === null ? 'white' : '#64748b',
                fontSize: '12px',
                fontWeight: '900',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              DISTRITO TOTAL
            </button>
            {availableCells.map(cell => (
              <button
                key={cell}
                onClick={() => setSelectedCelula(cell)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: selectedCelula === cell ? '2px solid #019df4' : '1px solid #e2e8f0',
                  backgroundColor: selectedCelula === cell ? '#019df4' : 'white',
                  color: selectedCelula === cell ? 'white' : '#64748b',
                  fontSize: '12px',
                  fontWeight: '900',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {cell}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Month Selector */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '4px' }}>
            MES SELECCIONADO
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', backgroundColor: 'white', padding: '10px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
            {['01', '02', '03', '04', '05', '06', '07', '08'].map(m => {
              const monthVal = `${m}-2026`;
              const isActive = selectedMonth === monthVal;
              const monthNames: Record<string, string> = {
                '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
                '07': 'Julio', '08': 'Agosto'
              };

              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(monthVal)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: isActive ? '2px solid #019df4' : '1px solid #e2e8f0',
                    backgroundColor: isActive ? '#019df4' : 'white',
                    color: isActive ? 'white' : '#475569',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>📅</span>
                  {monthNames[m]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Sentiment Filter */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '4px' }}>
            FILTRAR POR SENTIMIENTO
          </p>
          <div style={{ display: 'flex', gap: '8px', backgroundColor: 'white', padding: '10px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
            {[
              { id: 'TODOS', label: 'TODOS', color: '#019df4', emoji: '👥' },
              { id: 'PROMOTORES', label: 'PROMOTORES', color: '#10b981', emoji: '✅' },
              { id: 'NEUTROS', label: 'NEUTROS', color: '#f59e0b', emoji: '⚖️' },
              { id: 'DETRACTORES', label: 'DETRACTORES', color: '#ef4444', emoji: '❌' }
            ].map(f => {
              const isActive = selectedSentiment === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedSentiment(f.id as any)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '12px',
                    border: isActive ? `2px solid ${f.color}` : '1px solid #e2e8f0',
                    backgroundColor: isActive ? f.color : 'white',
                    color: isActive ? 'white' : '#64748b',
                    fontSize: '11px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? `0 4px 12px ${f.color}40` : 'none'
                  }}
                >
                  <span>{f.emoji}</span>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expandable Hierarchy Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '0 4px', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Desglose por Célula</h3>
          </div>

          {cellStats.length > 0 ? (
            cellStats.map(cell => (
              <div key={cell.celula} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                {/* Cell Header */}
                <div 
                  onClick={() => toggleCell(cell.celula!)}
                  style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: expandedCells.has(cell.celula!) ? '#fcfdfe' : 'white' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ transform: expandedCells.has(cell.celula!) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <ChevronDown size={16} color="#94a3b8" />
                    </div>
                    <h4 style={{ fontSize: '15px', fontWeight: '900', color: '#1a1a1a' }}>{cell.celula}</h4>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ 
                      backgroundColor: getNPSColor(cell.nps), 
                      color: 'white', 
                      padding: '8px 12px', 
                      borderRadius: '10px', 
                      boxShadow: `0 4px 10px ${getNPSColor(cell.nps)}40`
                    }}>
                      <p style={{ fontSize: '16px', fontWeight: '950', margin: 0, lineHeight: '1' }}>{cell.nps} NPS</p>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', margin: 0 }}>{cell.total_encuestas}</p>
                      <p style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>encuestas</p>
                    </div>
                  </div>
                </div>

                {/* Technicians under Cell */}
                {expandedCells.has(cell.celula!) && (
                  <div style={{ padding: '4px 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#fcfdfe' }}>
                    {Object.entries(
                      detalles.filter(d => d.tx_celula === cell.celula && (`${String(new Date(d.fecha).getMonth() + 1).padStart(2, '0')}-${new Date(d.fecha).getFullYear()}` === selectedMonth))
                        .reduce((acc, d) => {
                          // Apply sentiment filter
                          if (selectedSentiment === 'PROMOTORES' && d.promotor !== 1) return acc;
                          if (selectedSentiment === 'DETRACTORES' && d.detractor !== 1) return acc;
                          if (selectedSentiment === 'NEUTROS' && (d.promotor === 1 || d.detractor === 1)) return acc;

                          if (!acc[d.nombre_tecnico]) acc[d.nombre_tecnico] = { count: 0, p: 0, d: 0, surveys: [] };
                          acc[d.nombre_tecnico].count++;
                          acc[d.nombre_tecnico].p += d.promotor;
                          acc[d.nombre_tecnico].d += d.detractor;
                          acc[d.nombre_tecnico].surveys.push(d);
                          return acc;
                        }, {} as Record<string, { count: number, p: number, d: number, surveys: NPSEncuesta[] }>)
                    ).map(([techName, stats]) => {
                      const techKey = `${cell.celula}-${techName}`;
                      if (stats.surveys.length === 0) return null;
                      
                      return (
                        <div key={techKey} style={{ border: '1px solid #cbd5e1', borderRadius: '12px', backgroundColor: 'white' }}>
                          <div 
                            onClick={() => toggleTech(techKey)}
                            style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <User size={14} color="#64748b" />
                              <span style={{ fontSize: '13px', fontWeight: '800', color: '#4b5563', minWidth: '160px' }}>{techName}</span>
                              
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {(selectedSentiment === 'TODOS' || selectedSentiment === 'PROMOTORES') && stats.p > 0 && <span style={{ fontSize: '9px', fontWeight: '900', backgroundColor: '#ecfdf5', color: '#10b981', padding: '2px 8px', borderRadius: '6px', border: '1px solid #10b98120' }}>{stats.p} PROMOTOR</span>}
                                {(selectedSentiment === 'TODOS' || selectedSentiment === 'NEUTROS') && (stats.count - stats.p - stats.d) > 0 && <span style={{ fontSize: '9px', fontWeight: '900', backgroundColor: '#fff7ed', color: '#f59e0b', padding: '2px 8px', borderRadius: '6px', border: '1px solid #f59e0b20' }}>{stats.count - stats.p - stats.d} NEUTRO</span>}
                                {(selectedSentiment === 'TODOS' || selectedSentiment === 'DETRACTORES') && stats.d > 0 && <span style={{ fontSize: '9px', fontWeight: '900', backgroundColor: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: '6px', border: '1px solid #ef444420' }}>{stats.d} DETRACTOR</span>}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                              <div style={{ transform: expandedTechs.has(techKey) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                <ChevronDown size={14} color="#cbd5e1" />
                              </div>
                            </div>
                          </div>

                          {/* Surveys under Technician */}
                          {expandedTechs.has(techKey) && (
                            <div style={{ padding: '12px 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f8fafc', backgroundColor: '#fafbfc' }}>
                              {stats.surveys.map(enc => {
                                const isPromotor = enc.promotor === 1;
                                const isDetractor = enc.detractor === 1;
                                const statusColor = isPromotor ? '#10b981' : isDetractor ? '#ef4444' : '#f59e0b';
                                const statusBg = isPromotor ? '#ecfdf5' : isDetractor ? '#fef2f2' : '#fff7ed';

                                return (
                                  <div key={enc.access_id} style={{ padding: '12px', borderRadius: '10px', backgroundColor: statusBg, border: `1px solid ${statusColor}60` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '9px', fontWeight: '900', color: statusColor, textTransform: 'uppercase' }}>
                                          {isPromotor ? 'Promotor' : isDetractor ? 'Detractor' : 'Neutro'}
                                        </span>
                                        <span style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                          ID: {enc.access_id}
                                        </span>
                                      </div>
                                      <span style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8' }}>{new Date(enc.fecha).toLocaleDateString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {enc.obs_recomendacion ? (
                                        <p style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', margin: 0, lineHeight: '1.4' }}>"{enc.obs_recomendacion}"</p>
                                      ) : (
                                        <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>Sin comentarios del cliente</p>
                                      )}
                                      {enc.obs_wapp && <p style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', margin: 0, fontStyle: 'italic' }}>WA: {enc.obs_wapp}</p>}
                                    </div>
                                    
                                    {isDetractor && (
                                      <div style={{ marginTop: '10px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '10px' }}>
                                        <textarea 
                                          defaultValue={enc.obs_resoluci || ''}
                                          onBlur={async (e) => {
                                            const val = e.target.value;
                                            if (val === enc.obs_resoluci) return;
                                            await supabase.from('nps_detalles').update({ obs_resoluci: val }).eq('access_id', enc.access_id);
                                            setDetalles(prev => prev.map(d => d.access_id === enc.access_id ? { ...d, obs_resoluci: val } : d));
                                          }}
                                          placeholder="Añadir descargo..."
                                          style={{ 
                                            width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                                            fontSize: '11px', fontWeight: '700', outline: 'none', minHeight: '50px', resize: 'vertical'
                                          }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '9px', fontWeight: '900', color: enc.obs_resoluci ? '#10b981' : '#ef4444' }}>
                                          {enc.obs_resoluci ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                          {enc.obs_resoluci ? 'GESTIONADO' : 'PENDIENTE'}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'white', borderRadius: '24px', border: '1px solid #eef2f6' }}>
              <p style={{ fontSize: '13px', fontWeight: '800', color: '#94a3b8' }}>Sin datos para este mes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
