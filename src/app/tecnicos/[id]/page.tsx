'use client';

import React from 'react';
import { 
  ArrowLeft, User, TrendingUp, AlertTriangle, CheckCircle, Activity, 
  MapPin, Calendar, ExternalLink, MessageSquare 
} from 'lucide-react';
import Link from 'next/link';
import { 
  getKPIStatus, defaultThresholds, classifyTechnician,
  TechnicianStats 
} from '@/lib/logic';
import { mockWeeklyStats } from '@/lib/data';

interface PageProps {
  params: { id: string };
}

export default function TechnicianDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const techName = decodeURIComponent(params.id);
  const stats = mockWeeklyStats.find(s => s.tecnico === techName);

  if (!stats) return <div style={{ padding: '48px', color: '#64748b' }}>Técnico no encontrado.</div>;

  const classification = classifyTechnician(stats);

  const kpis = [
    { label: 'Reiteros', value: stats.reiteros, unit: '%', target: '10%', icon: AlertTriangle, status: getKPIStatus('reiteros', stats.reiteros) },
    { label: 'Resolución', value: stats.resolucion, unit: '%', target: '90%', icon: TrendingUp, status: getKPIStatus('resolucion', stats.resolucion) },
    { label: 'Puntualidad', value: stats.puntualidad, unit: '%', target: '95%', icon: CheckCircle, status: getKPIStatus('puntualidad', stats.puntualidad) },
    { label: 'Productividad', value: stats.productividad, unit: '', target: '8.5', icon: Activity, status: getKPIStatus('productividad', stats.productividad) },
  ];

  return (
    <div style={{ padding: '48px 56px', backgroundColor: 'var(--background)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link href={`/celulas/${stats.celula}`} style={{ color: '#019df4', padding: '12px', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #eef2f6', display: 'flex' }}>
          <ArrowLeft size={24} />
        </Link>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#003366' }}>{techName}</h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>Perfil de Rendimiento Técnico</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
        {/* Profile Card */}
        <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '24px', border: '1px solid #eef2f6', display: 'flex', flexDirection: 'column', gap: '32px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)' }}>
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#019df4' }}>
                <User size={64} />
             </div>
             <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#003366' }}>{techName}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: '#64748b', marginTop: '4px' }}>
                   <MapPin size={16} /> {stats.celula}
                </div>
             </div>
             <div style={{ 
                padding: '8px 24px', 
                borderRadius: '12px', 
                backgroundColor: `${classification.color}15`, 
                color: classification.color,
                fontSize: '14px',
                fontWeight: '900'
              }}>
                {classification.label.toUpperCase()}
              </div>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '700' }}>Antigüedad</span>
                <span style={{ color: '#003366', fontSize: '14px', fontWeight: '800' }}>3 años (Mock)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '700' }}>Última Auditoría</span>
                <span style={{ color: '#003366', fontSize: '14px', fontWeight: '800' }}>12 Mar 2026</span>
              </div>
           </div>

           <button style={{ backgroundColor: '#019df4', color: '#fff', padding: '16px', borderRadius: '12px', fontWeight: '700', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
             <MessageSquare size={18} /> Iniciar Feedback
           </button>
        </div>

        {/* Detailed Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
             {kpis.map((kpi) => (
                <div key={kpi.label} style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #eef2f6', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>{kpi.label}</span>
                      <kpi.icon size={20} style={{ color: kpi.status === 'success' ? '#22c55e' : kpi.status === 'warning' ? '#fbbf24' : '#ef4444' }} />
                   </div>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '32px', fontWeight: '900', color: '#003366' }}>{kpi.value}{kpi.unit}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>vs {kpi.target}</span>
                   </div>
                   <div style={{ height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px' }}>
                      <div style={{ width: `${80}%`, height: '100%', backgroundColor: kpi.status === 'success' ? '#22c55e' : kpi.status === 'warning' ? '#fbbf24' : '#ef4444', borderRadius: '2px' }} />
                   </div>
                </div>
             ))}
           </div>

           {/* Insights Card */}
           <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '24px', border: '1px solid #eef2f6', flex: 1, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#003366', marginBottom: '24px' }}>Análisis Predictivo</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <div style={{ padding: '20px', borderRadius: '16px', backgroundColor: stats.reiteros > 15 ? '#fee2e2' : '#f0fdf4', border: `1px solid ${stats.reiteros > 15 ? '#fecaca' : '#dcfce7'}` }}>
                    <p style={{ color: stats.reiteros > 15 ? '#ef4444' : '#22c55e', fontWeight: '700', lineHeight: '1.6' }}>
                       {stats.reiteros > 15 
                         ? "El técnico presenta un desvío crítico en reiteros. Se recomienda auditoría de campo inmediata para revisar procedimientos de cierre." 
                         : "Rendimiento estable. Mantiene los indicadores dentro de los parámetros de calidad del distrito."}
                    </p>
                 </div>
                 <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ flex: 1, padding: '20px', borderRadius: '16px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>Fortaleza Principal</span>
                       <span style={{ fontSize: '15px', fontWeight: '900', color: '#003366' }}>Puntualidad Perfecta</span>
                    </div>
                    <div style={{ flex: 1, padding: '20px', borderRadius: '16px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>Oportunidad</span>
                       <span style={{ fontSize: '15px', fontWeight: '900', color: '#003366' }}>Calidad de Cierre</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
