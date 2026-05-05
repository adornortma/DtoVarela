'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  User, 
  ChevronRight, 
  ChevronLeft,
  Filter,
  BarChart3,
  Search,
  ArrowRight,
  CloudRain,
  Smile,
  Frown,
  Meh,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Save,
  Loader2
} from 'lucide-react';

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
  <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '32px', border: '1px solid #eef2f6', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', flex: 1 }}>
    <p style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>{title}</p>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
      <h3 style={{ fontSize: '48px', fontWeight: '950', color: '#1a1a1a', letterSpacing: '-2px' }}>
        {type === 'nps' ? (typeof value === 'number' ? value.toFixed(0) : value) : value}
      </h3>
      {type === 'nps' && <span style={{ fontSize: '20px', fontWeight: '800', color: '#94a3b8' }}>pts</span>}
    </div>
    {subValue && <p style={{ fontSize: '14px', fontWeight: '700', color: '#019df4', marginTop: '8px' }}>{subValue}</p>}
  </div>
);

export default function NPSDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [agregado, setAgregado] = useState<NPSAgregado[]>([]);
  const [detalles, setDetalles] = useState<NPSEncuesta[]>([]);
  
  // Selection State
  const [selectedDistrito, setSelectedDistrito] = useState('VARELA');
  const [selectedCelula, setSelectedCelula] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // MM-YYYY
  
  // Navigation State
  const [viewLevel, setViewLevel] = useState<'distrito' | 'celula' | 'tecnico' | 'encuestas'>('distrito');
  const [activeCelula, setActiveCelula] = useState<string | null>(null);
  const [activeTecnico, setActiveTecnico] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEncuesta, setSelectedEncuesta] = useState<NPSEncuesta | null>(null);
  const [newDescargo, setNewDescargo] = useState('');
  const [savingDescargo, setSavingDescargo] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: aggData } = await supabase.from('nps_agregado').select('*').order('mes', { ascending: true });
    const { data: detData } = await supabase.from('nps_detalles').select('*').order('fecha', { ascending: false });
    
    setAgregado(aggData || []);
    setDetalles(detData || []);
    
    // Set default month to the latest available
    if (aggData && aggData.length > 0) {
      const sortedMonths = [...new Set(aggData.map(d => d.mes))].sort((a, b) => {
        const [mA, yA] = a.split('-').map(Number);
        const [mB, yB] = b.split('-').map(Number);
        return yB !== yA ? yB - yA : mB - mA;
      });
      setSelectedMonth(sortedMonths[0]);
    }
    setLoading(false);
  };

  // Derived Data
  const filteredAgregado = useMemo(() => {
    return agregado.filter(d => d.distrito === selectedDistrito);
  }, [agregado, selectedDistrito]);

  const currentMonthData = useMemo(() => {
    if (viewLevel === 'distrito') {
      return filteredAgregado.find(d => d.mes === selectedMonth && d.celula === null);
    } else {
      return filteredAgregado.find(d => d.mes === selectedMonth && d.celula === activeCelula);
    }
  }, [filteredAgregado, selectedMonth, viewLevel, activeCelula]);

  const cellStats = useMemo(() => {
    return filteredAgregado.filter(d => d.mes === selectedMonth && d.celula !== null);
  }, [filteredAgregado, selectedMonth]);

  const technicianStats = useMemo(() => {
    if (!activeCelula) return [];
    const cellSurveys = detalles.filter(d => d.tx_celula === activeCelula);
    const techMap = new Map<string, { count: number, dni: string }>();
    cellSurveys.forEach(s => {
      const entry = techMap.get(s.nombre_tecnico) || { count: 0, dni: s.dni_tecnico };
      entry.count++;
      techMap.set(s.nombre_tecnico, entry);
    });
    return Array.from(techMap.entries()).map(([name, stats]) => ({
      nombre_tecnico: name,
      total_encuestas: stats.count,
      dni_tecnico: stats.dni
    }));
  }, [detalles, activeCelula]);

  const filteredSurveys = useMemo(() => {
    let base = detalles;
    if (activeCelula) base = base.filter(d => d.tx_celula === activeCelula);
    if (activeTecnico) base = base.filter(d => d.nombre_tecnico === activeTecnico);
    return base;
  }, [detalles, activeCelula, activeTecnico]);

  const handleSaveDescargo = async () => {
    if (!selectedEncuesta) return;
    setSavingDescargo(true);
    const { error } = await supabase
      .from('nps_detalles')
      .update({ obs_resoluci: newDescargo })
      .eq('access_id', selectedEncuesta.access_id);
    
    if (!error) {
      // Refresh local state
      setDetalles(prev => prev.map(d => d.access_id === selectedEncuesta.access_id ? { ...d, obs_resoluci: newDescargo } : d));
      setIsModalOpen(false);
      setSelectedEncuesta(null);
    }
    setSavingDescargo(false);
  };

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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px' }}>
      {/* Header */}
      <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
             <button 
               onClick={() => {
                 if (viewLevel === 'encuestas') setViewLevel('tecnico');
                 else if (viewLevel === 'tecnico') setViewLevel('distrito');
                 else setViewLevel('distrito');
               }}
               style={{ 
                 display: viewLevel === 'distrito' ? 'none' : 'flex',
                 alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'white', border: '1px solid #eef2f6', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '13px' 
               }}
             >
               <ChevronLeft size={16} /> Volver
             </button>
             <div style={{ padding: '8px', backgroundColor: '#1a171e', borderRadius: '10px', color: 'white' }}>
               <BarChart3 size={20} />
             </div>
             <span style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>Encuestas de Satisfacción</span>
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: '950', color: '#1a1a1a', letterSpacing: '-2px', lineHeight: '1' }}>
            {viewLevel === 'distrito' ? `NPS Distrito ${selectedDistrito}` : 
             viewLevel === 'tecnico' ? `Célula: ${activeCelula}` :
             viewLevel === 'encuestas' ? `Encuestas: ${activeTecnico}` : `NPS ${selectedDistrito}`}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ backgroundColor: 'white', padding: '8px 16px', borderRadius: '16px', border: '1px solid #eef2f6', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={18} color="#94a3b8" />
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ border: 'none', fontWeight: '800', fontSize: '14px', outline: 'none', backgroundColor: 'transparent' }}
            >
              {[...new Set(agregado.map(d => d.mes))].sort().reverse().map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main Stats */}
      {viewLevel === 'distrito' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '40px' }}>
          <MetricCard 
            title="NPS Actual" 
            value={currentMonthData?.nps || 'N/A'} 
            subValue={`Objetivo: > 70`}
            type="nps"
          />
          <MetricCard 
            title="Total Encuestas" 
            value={currentMonthData?.total_encuestas || 0} 
            subValue={`Mes: ${selectedMonth}`}
            type="total"
          />
        </div>
      )}

      {viewLevel === 'tecnico' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '40px' }}>
          <MetricCard 
            title="NPS Célula" 
            value={currentMonthData?.nps || 'N/A'} 
            type="nps"
          />
          <MetricCard 
            title="Encuestas Recibidas" 
            value={technicianStats.reduce((acc, curr) => acc + curr.total_encuestas, 0)} 
            type="total"
          />
        </div>
      )}

      {/* Chart Section (Only in Distrito View) */}
      {viewLevel === 'distrito' && (
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #eef2f6', marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '950' }}>Evolución Mensual NPS</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '800', color: '#64748b' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#019df4', borderRadius: '3px' }} /> Línea NPS
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '800', color: '#64748b' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '3px' }} /> Barras Encuestas
              </div>
            </div>
          </div>
          
          {filteredAgregado.filter(d => d.celula === null).length > 0 ? (
            <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', paddingBottom: '30px', position: 'relative' }}>
              {/* Simple Grid Lines */}
              {[0, 25, 50, 75, 100].map(val => (
                <div key={val} style={{ position: 'absolute', bottom: `${val}%`, left: 0, right: 0, borderTop: '1px solid #f8fafc', zIndex: 0 }} />
              ))}
              
              {filteredAgregado.filter(d => d.celula === null).map((d, i, arr) => {
                const maxSurveys = Math.max(...arr.map(x => x.total_encuestas));
                const barHeight = (d.total_encuestas / (maxSurveys || 1)) * 100;
                const dotPos = Math.max(0, Math.min(100, d.nps)); 

                const isLast = i === arr.length - 1;

                return (
                  <div key={d.mes} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{ 
                      width: '100%', 
                      height: `${barHeight}%`, 
                      backgroundColor: isLast ? '#e2e8f0' : '#f1f5f9', 
                      borderRadius: '8px 8px 4px 4px',
                      transition: 'all 0.5s'
                    }} />
                    
                    <div style={{ 
                      position: 'absolute', 
                      bottom: `${dotPos}%`, 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: '#019df4', 
                      borderRadius: '50%', 
                      border: '3px solid white',
                      boxShadow: '0 4px 10px rgba(1, 157, 244, 0.4)',
                      zIndex: 2,
                      transform: 'translateY(50%)'
                    }}>
                      {isLast && (
                        <div style={{ position: 'absolute', top: '-45px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1a171e', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', whiteSpace: 'nowrap', fontWeight: '800' }}>
                          Actual: {d.nps}
                          <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #1a171e' }} />
                        </div>
                      )}
                    </div>

                    <span style={{ position: 'absolute', bottom: '-25px', fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{d.mes}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px dashed #e2e8f0' }}>
              <p style={{ color: '#94a3b8', fontWeight: '700' }}>No hay datos disponibles para el período seleccionado</p>
            </div>
          )}
        </div>
      )}

      {/* Tables Section */}
      <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #eef2f6', overflow: 'hidden' }}>
        
        {viewLevel === 'distrito' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfdfe' }}>
                <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Célula</th>
                <th style={{ textAlign: 'center', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>NPS Mes</th>
                <th style={{ textAlign: 'center', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Encuestas</th>
                <th style={{ textAlign: 'right', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cellStats.length > 0 ? cellStats.map(cell => (
                <tr key={cell.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '24px 32px', fontWeight: '900', color: '#1a1a1a', fontSize: '15px' }}>{cell.celula}</td>
                  <td style={{ padding: '24px 32px', textAlign: 'center' }}>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', 
                      backgroundColor: `${getNPSColor(cell.nps)}15`, color: getNPSColor(cell.nps), fontWeight: '950', fontSize: '16px' 
                    }}>
                      {cell.nps.toFixed(0)}
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px', textAlign: 'center', fontWeight: '800', color: '#64748b' }}>{cell.total_encuestas}</td>
                  <td style={{ padding: '24px 32px', textAlign: 'right' }}>
                    <button 
                      onClick={() => { setActiveCelula(cell.celula); setViewLevel('tecnico'); }}
                      style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '900', color: '#1a1a1a', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      Ver Célula <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontWeight: '700' }}>No hay datos por célula para este mes.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {viewLevel === 'tecnico' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfdfe' }}>
                <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Técnico</th>
                <th style={{ textAlign: 'center', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Encuestas</th>
                <th style={{ textAlign: 'right', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {technicianStats.map(tech => (
                <tr key={tech.nombre_tecnico} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <User size={20} />
                      </div>
                      <div>
                        <p style={{ fontWeight: '900', color: '#1a1a1a', fontSize: '15px', margin: 0 }}>{tech.nombre_tecnico}</p>
                        <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', margin: 0 }}>DNI: {tech.dni_tecnico}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px', textAlign: 'center', fontWeight: '950', fontSize: '18px', color: '#1a1a1a' }}>{tech.total_encuestas}</td>
                  <td style={{ padding: '24px 32px', textAlign: 'right' }}>
                    <button 
                      onClick={() => { setActiveTecnico(tech.nombre_tecnico); setViewLevel('encuestas'); }}
                      style={{ padding: '10px 20px', backgroundColor: '#1a171e', border: 'none', borderRadius: '12px', fontWeight: '900', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      Ver Detalle <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {viewLevel === 'encuestas' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fcfdfe' }}>
                <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Fecha</th>
                <th style={{ textAlign: 'center', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Tipo</th>
                <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Comentario Cliente</th>
                <th style={{ textAlign: 'center', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Estado</th>
                <th style={{ textAlign: 'right', padding: '24px 32px', fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredSurveys.map(enc => {
                const isPromotor = enc.promotor === 1;
                const isDetractor = enc.detractor === 1;
                const typeColor = isPromotor ? '#10b981' : isDetractor ? '#ef4444' : '#f59e0b';
                const typeIcon = isPromotor ? <Smile size={20} /> : isDetractor ? <Frown size={20} /> : <Meh size={20} />;
                const comment = [enc.obs_recomendacion, enc.obs_wapp].filter(Boolean).join(' | ');

                return (
                  <tr key={enc.access_id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '24px 32px', fontSize: '14px', fontWeight: '800', color: '#64748b' }}>
                      {new Date(enc.fecha).toLocaleDateString('es-AR')}
                    </td>
                    <td style={{ padding: '24px 32px', textAlign: 'center' }}>
                      <div style={{ color: typeColor, display: 'inline-flex' }}>{typeIcon}</div>
                    </td>
                    <td style={{ padding: '24px 32px', maxWidth: '300px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: '#4b5563', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {comment || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Sin comentario</span>}
                      </p>
                    </td>
                    <td style={{ padding: '24px 32px', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '11px', fontWeight: '900', padding: '6px 12px', borderRadius: '20px',
                        backgroundColor: enc.obs_resoluci ? '#f0fdf4' : '#fef2f2',
                        color: enc.obs_resoluci ? '#16a34a' : '#dc2626',
                        border: enc.obs_resoluci ? '1px solid #bbf7d0' : '1px solid #fecaca'
                      }}>
                        {enc.obs_resoluci ? 'Gestionado' : 'Pendiente'}
                      </span>
                    </td>
                    <td style={{ padding: '24px 32px', textAlign: 'right' }}>
                      <button 
                        onClick={() => { setSelectedEncuesta(enc); setNewDescargo(enc.obs_resoluci || ''); setIsModalOpen(true); }}
                        style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Descargo Modal */}
      {isModalOpen && selectedEncuesta && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '32px', width: '90%', maxWidth: '600px', padding: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '950' }}>Gestionar Descargo</h3>
                <p style={{ color: '#64748b', fontWeight: '700' }}>Técnico: {selectedEncuesta.nombre_tecnico}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <div style={{ marginBottom: '32px', padding: '24px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #eef2f6' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <MessageSquare size={16} color="#94a3b8" />
                  <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comentario del Cliente</span>
               </div>
               <p style={{ fontSize: '15px', color: '#1e293b', fontWeight: '700', lineHeight: '1.6', margin: 0 }}>
                 {[selectedEncuesta.obs_recomendacion, selectedEncuesta.obs_wapp].filter(Boolean).join(' | ') || 'Sin comentarios.'}
               </p>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '900', color: '#1e293b', marginBottom: '12px' }}>
                <FileText size={16} color="#019df4" /> Descargo del Líder / Resolución
              </label>
              <textarea 
                value={newDescargo}
                onChange={(e) => setNewDescargo(e.target.value)}
                placeholder="Escribe aquí el descargo o acción realizada..."
                style={{ width: '100%', height: '150px', padding: '20px', borderRadius: '16px', border: '2px solid #f1f5f9', fontWeight: '700', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <button 
              onClick={handleSaveDescargo}
              disabled={savingDescargo}
              style={{ 
                width: '100%', padding: '18px', backgroundColor: '#1a171e', color: 'white', borderRadius: '16px', fontWeight: '950', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
              }}
            >
              {savingDescargo ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Guardar Descargo</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
