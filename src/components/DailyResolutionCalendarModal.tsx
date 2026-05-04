'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  month: string;
  celula: string | null; // Si es null, es Distrito
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface DayData {
  date: string;
  resolucion: number;
  cumplidas: number;
  total: number;
  noRealizadas: number;
  suspendidas: number;
}

export default function DailyResolutionCalendarModal({ isOpen, onClose, month, celula }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, DayData>>({});

  useEffect(() => {
    if (!isOpen || !month) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const monthIndex = MONTHS.indexOf(month);
        const year = new Date().getFullYear();
        
        const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, monthIndex + 1, 0).getDate();
        const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        let allActs: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          let query = supabase
            .from('actuaciones')
            .select('fecha_cita, estado, tx_celula')
            .gte('fecha_cita', startDate)
            .lte('fecha_cita', endDate)
            .range(page * pageSize, (page + 1) * pageSize - 1);
            
          if (celula) {
            query = query.eq('tx_celula', celula);
          }

          const { data: acts, error } = await query;
          if (error) throw error;

          if (!acts || acts.length === 0) {
            hasMore = false;
          } else {
            allActs = [...allActs, ...acts];
            if (acts.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          }
        }

        let filteredActs = allActs;
        if (!celula) {
          // Filtrar igual que en Detalle Diario para el Distrito (conservando los nulos)
          filteredActs = filteredActs.filter(a => a.tx_celula?.toUpperCase() !== 'ACCESO VARELA');
        }

        const dailyCounts: Record<string, { c: number; nr: number; s: number; t: number }> = {};
        
        filteredActs.forEach(act => {
          const date = act.fecha_cita;
          const e = act.estado.toUpperCase();
          if (!dailyCounts[date]) {
            dailyCounts[date] = { c: 0, nr: 0, s: 0, t: 0 };
          }
          
          dailyCounts[date].t++;
          if (e === 'CUMPLIDA') dailyCounts[date].c++;
          else if (e === 'NO_REALIZADA') dailyCounts[date].nr++;
          else if (e === 'SUSPENDIDA') dailyCounts[date].s++;
        });

        const formattedData: Record<string, DayData> = {};
        Object.entries(dailyCounts).forEach(([date, counts]) => {
           formattedData[date] = {
             date,
             resolucion: counts.t > 0 ? (counts.c / counts.t) * 100 : 0,
             cumplidas: counts.c,
             noRealizadas: counts.nr,
             suspendidas: counts.s,
             total: counts.t
           };
        });

        setData(formattedData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, month, celula]);

  if (!isOpen) return null;

  const monthIndex = MONTHS.indexOf(month);
  const year = 2026;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = new Date(year, monthIndex, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getDayColor = (val: number) => {
    if (val >= 75) return { bg: '#dcfce7', text: '#166534', sub: '#22c55e' };
    if (val >= 70) return { bg: '#fef9c3', text: '#854d0e', sub: '#eab308' };
    return { bg: '#fee2e2', text: '#991b1b', sub: '#ef4444' };
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let url = `/detalle-diario?date=${dateStr}`;
    if (celula) url += `&celula=${encodeURIComponent(celula)}`;
    router.push(url);
  };

  return (
    <>
      <div 
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          zIndex: 9999, transition: 'opacity 0.3s ease'
        }}
      />
      <div style={{
        position: 'fixed', 
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'calc(100% - 48px)', maxWidth: '500px', 
        backgroundColor: 'white', borderRadius: '32px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)',
        zIndex: 10000, overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
             <div style={{ backgroundColor: '#10b981', padding: '12px', borderRadius: '16px', color: 'white', boxShadow: '0 8px 12px -3px rgba(0, 0, 0, 0.2)' }}>
               <CalendarIcon size={24} strokeWidth={2.5} />
             </div>
             <div>
               <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', lineHeight: '1.2' }}>
                 Resolución diaria
               </h2>
               <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', marginTop: '4px' }}>
                 {celula ? celula : 'Distrito'} • {month}
               </div>
             </div>
          </div>
          <button onClick={onClose} style={{ padding: '8px', backgroundColor: 'white', borderRadius: '12px', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{ padding: '24px' }}>
           {loading ? (
             <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
               <Loader2 className="animate-spin" size={32} color="#10b981" />
               <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>Cargando datos diarios...</span>
             </div>
           ) : (
             <>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '12px' }}>
                 {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                   <span key={d} style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8' }}>{d}</span>
                 ))}
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
                 {days.map((d, i) => {
                   if (d === null) return <div key={`empty-${i}`} />;
                   
                   const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                   const dayData = data[dateStr];
                   const hasData = dayData && dayData.total > 0;
                   const colors = hasData ? getDayColor(dayData.resolucion) : { bg: '#f1f5f9', text: '#94a3b8', sub: '#cbd5e1' };

                   return (
                     <button
                       key={i}
                       title={hasData ? `Cumplidas: ${dayData.cumplidas} | No Realizadas: ${dayData.noRealizadas} | Suspendidas: ${dayData.suspendidas}` : 'Sin datos'}
                       onClick={() => hasData && handleDayClick(d)}
                       style={{
                         aspectRatio: '1',
                         padding: '6px',
                         borderRadius: '16px',
                         border: '1px solid transparent',
                         backgroundColor: colors.bg,
                         display: 'flex',
                         flexDirection: 'column',
                         alignItems: 'center',
                         justifyContent: 'center',
                         cursor: hasData ? 'pointer' : 'default',
                         transition: 'all 0.2s',
                         opacity: hasData ? 1 : 0.6
                       }}
                       onMouseEnter={(e) => { 
                         if (hasData) {
                           e.currentTarget.style.transform = 'scale(1.05)'; 
                           e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; 
                         }
                       }}
                       onMouseLeave={(e) => { 
                         if (hasData) {
                           e.currentTarget.style.transform = 'scale(1)'; 
                           e.currentTarget.style.boxShadow = 'none'; 
                         }
                       }}
                     >
                       <span style={{ fontSize: '16px', fontWeight: '950', color: hasData ? '#1e293b' : '#94a3b8' }}>{d}</span>
                       <span style={{ fontSize: '10px', fontWeight: '900', color: colors.text, marginTop: '2px' }}>
                         {hasData ? `${dayData.resolucion.toFixed(1)}%` : '–'}
                       </span>
                     </button>
                   );
                 })}
               </div>
             </>
           )}
        </div>
      </div>
    </>
  );
}
