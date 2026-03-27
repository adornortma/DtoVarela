'use client';

import React from 'react';
import { 
  ArrowLeft, TrendingUp, AlertTriangle, CheckCircle, Activity, 
  User, ChevronRight, LayoutGrid 
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

export default function CellDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const cellName = decodeURIComponent(params.id);
  const technicians = mockWeeklyStats.filter(s => s.celula === cellName);

  return (
    <div style={{ padding: '48px 56px', backgroundColor: 'var(--background)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/" style={{ color: '#019df4', padding: '12px', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #eef2f6', display: 'flex' }}>
            <ArrowLeft size={24} />
          </Link>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#003366' }}>Célula: {cellName}</h1>
            <p style={{ color: '#64748b', fontSize: '15px' }}>Análisis Detalle de Técnicos (W12)</p>
          </div>
        </div>
        <div style={{ padding: '12px 24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eef2f6', color: '#003366', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LayoutGrid size={18} /> Resumen Operativo
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {technicians.map((tech) => {
          const classification = classifyTechnician(tech);
          
          return (
            <div key={tech.tecnico} style={{ 
              backgroundColor: '#fff', 
              padding: '24px 32px', 
              borderRadius: '24px', 
              border: '1px solid #eef2f6', 
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#019df4' }}>
                   <User size={28} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#003366' }}>{tech.tecnico}</h3>
                  <div style={{ 
                    padding: '4px 12px', 
                    borderRadius: '8px', 
                    backgroundColor: `${classification.color}20`, 
                    color: classification.color,
                    fontSize: '12px',
                    fontWeight: '900',
                    textAlign: 'center',
                    width: 'fit-content'
                  }}>
                    {classification.label.toUpperCase()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '32px', flex: 2 }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                   <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>REITEROS</span>
                   <span style={{ fontSize: '18px', fontWeight: '900', color: tech.reiteros > 15 ? '#ef4444' : '#003366' }}>{tech.reiteros}%</span>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                   <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>RESOLUCIÓN</span>
                   <span style={{ fontSize: '18px', fontWeight: '900', color: '#003366' }}>{tech.resolucion}%</span>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                   <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>PUNTUALIDAD</span>
                   <span style={{ fontSize: '18px', fontWeight: '900', color: '#003366' }}>{tech.puntualidad}%</span>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                   <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8' }}>PROD.</span>
                   <span style={{ fontSize: '18px', fontWeight: '900', color: '#003366' }}>{tech.productividad}</span>
                 </div>
              </div>

              <Link href={`/tecnicos/${tech.tecnico}`} style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#f8fafc', color: '#019df4', border: '1px solid #eef2f6', alignSelf: 'center' }}>
                <ChevronRight size={20} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
