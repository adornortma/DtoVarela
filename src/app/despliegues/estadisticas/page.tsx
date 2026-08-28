'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, BarChart2, Filter, Building2 } from 'lucide-react';
import { DesplieguesService } from '../services/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function EstadisticasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState('');

  const [granularidad, setGranularidad] = useState<'dia' | 'semana' | 'mes'>('semana');
  const [centralFilter, setCentralFilter] = useState<string>('Todas');
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await DesplieguesService.getEstadisticasEvolucion();
        setData(result);
      } catch (err: any) {
        console.error('Error fetching stats:', err);
        setError('Error al cargar las estadísticas');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const centralOptions = useMemo(() => {
    const uniques = new Set(data.map(d => d.central));
    return ['Todas', ...Array.from(uniques).sort()];
  }, [data]);

  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  const formatearFecha = (fechaIso: string, gran: string) => {
    const d = new Date(fechaIso);
    if (gran === 'mes') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    if (gran === 'semana') {
      return `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '0')}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const { kpiHoy, kpiSemana, kpiMes } = useMemo(() => {
    let hoy = 0, semana = 0, mes = 0;
    const now = new Date();
    const todayStr = formatearFecha(now.toISOString(), 'dia');
    const thisWeekStr = formatearFecha(now.toISOString(), 'semana');
    const thisMonthStr = formatearFecha(now.toISOString(), 'mes');

    data.forEach(act => {
      if (!act.fecha_estado) return;
      const dStr = formatearFecha(act.fecha_estado, 'dia');
      const wStr = formatearFecha(act.fecha_estado, 'semana');
      const mStr = formatearFecha(act.fecha_estado, 'mes');

      if (dStr === todayStr) hoy++;
      if (wStr === thisWeekStr) semana++;
      if (mStr === thisMonthStr) mes++;
    });

    return { kpiHoy: hoy, kpiSemana: semana, kpiMes: mes };
  }, [data]);

  const chartData = useMemo(() => {
    let filtered = data;
    if (centralFilter !== 'Todas') {
      filtered = filtered.filter(d => d.central === centralFilter);
    }

    const grouped: Record<string, { name: string; Instalacion: number; Certificacion: number; timestamp: number }> = {};

    filtered.forEach(act => {
      if (!act.fecha_estado) return;
      const key = formatearFecha(act.fecha_estado, granularidad);
      if (!grouped[key]) {
        grouped[key] = { 
          name: key, 
          Instalacion: 0, 
          Certificacion: 0,
          timestamp: new Date(act.fecha_estado).getTime()
        };
      }
      if (act.tipo === 'Instalación') {
        grouped[key].Instalacion++;
      } else {
        grouped[key].Certificacion++;
      }
    });

    return Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp);
  }, [data, granularidad, centralFilter]);

  if (loading) {
    return (
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Loader2 className="animate-spin" size={24} color="#2563eb" />
          <h1 style={{ margin: 0 }}>Cargando Estadísticas...</h1>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.back()} style={{ border: 'none', background: '#f1f5f9', borderRadius: '12px', cursor: 'pointer', padding: '8px' }}>
          <ChevronLeft size={24} color="#475569" />
        </button>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart2 color="#2563eb" size={32} /> Evolución de Despliegues
          </h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {
          [ { label: 'Hoy', value: kpiHoy, bg: '#eff6ff', color: '#1d4ed8' },
            { label: 'Esta Semana', value: kpiSemana, bg: '#fef2f2', color: '#b91c1c' },
            { label: 'Este Mes', value: kpiMes, bg: '#f0fdf4', color: '#15803d' }
          ].map((kpi, idx) => (
            <div key={idx} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: #64748b', textTransform: 'uppercase' }}>{kpi.label}</span>
              <div style={{ fontSize: '40px', fontWeight: '900', color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
              <span style={{ fontSize: '14px', color: #94a3b8', fontWeight: '500' }}>Actividades completadas</span>
            </div>
          ))
        }
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Actividades en el Tiempo</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <Building2 size={16} color="#64748b" />
              <select value={centralFilter} onChange={(e) => setCentralFilter(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontWeight: 600 }}>
                {centralOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <Filter size={16} color="#64748b" />
              <select value={granularidad} onChange={(e) => setGranularidad(e.target.value as any)} style={{ border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', fontWeight: 600 }}>
                <option value="dia">Ver por Día</option>
                <option value="semana">Ver por Semana</option>
                <option value="mes">Ver por Mes</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: '400px' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} labelStyle={{ fontWeight: '900', color: '#0f172a', marginBottom: '8px' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Bar dataKey="Instalacion" name="Instalación CTO" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Certificacion" name="Certificación CTO" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              No hay actividades completadas para mostrar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
