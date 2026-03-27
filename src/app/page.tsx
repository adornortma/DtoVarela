'use client';

import React from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity,
  Calendar, ArrowUpRight, ArrowDownRight, Info, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import {
  getKPIStatus, defaultThresholds, generateInsights, classifyTechnician,
  TechnicianStats, getCellSummaries, KPIThresholds
} from '@/lib/logic';
import { mockWeeklyStats, mockPreviousWeek } from '@/lib/data';

const SmartHeader = ({ insights }: { insights: string[] }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    backgroundColor: '#fff',
    padding: '32px',
    borderRadius: '24px',
    border: '1px solid #eef2f6',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#003366' }}>Estado del Distrito</h2>
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ padding: '8px 16px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#ef4444', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> 1 célula crítica
        </div>
        <div style={{ padding: '8px 16px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#d97706', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
           <AlertTriangle size={16} /> 4 técnicos en riesgo
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {insights.map((insight, idx) => (
        <div key={idx} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: '#f8fafc',
          borderLeft: `4px solid ${idx === 0 ? '#ef4444' : '#019df4'}`,
          fontSize: '15px',
          fontWeight: '600',
          color: '#1e293b'
        }}>
          {insight}
        </div>
      ))}
    </div>
  </div>
);

const MetricCard = ({ title, value, status, icon: Icon, trend, target, unit = "%", reverse = false }: any) => {
  const isUp = trend > 0;
  const isGoodValue = reverse ? !isUp : isUp;
  const isGoodStatus = status === 'success';

  return (
    <div style={{
      backgroundColor: '#ffffff',
      padding: '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      flex: 1,
      borderRadius: '20px',
      border: `1px solid ${status === 'error' ? '#fee2e2' : status === 'warning' ? '#fef3c7' : '#eef2f6'}`,
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
           <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
           <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>Objetivo: {target}{unit}</span>
        </div>
        <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: isGoodStatus ? '#f0fdf4' : status === 'warning' ? '#fffbeb' : '#fee2e2' }}>
          <Icon size={18} style={{ color: isGoodStatus ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444' }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', margin: '8px 0' }}>
        <div style={{ fontSize: '40px', fontWeight: '900', color: '#003366' }}>{value}{unit}</div>
        {trend !== 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '14px',
            fontWeight: '800',
            color: isGoodValue ? '#22c55e' : '#ef4444'
          }}>
            {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {isUp ? '+' : ''}{trend}%
          </div>
        )}
      </div>
      <div style={{ height: '32px', display: 'flex', alignItems: 'flex-end' }}>
        <div style={{ width: '100%', height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px' }}>
           <div style={{ width: '100%', height: '100%', backgroundColor: isGoodStatus ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444', borderRadius: '2px' }} />
        </div>
      </div>
    </div>
  );
};

const SmartRanking = ({ stats }: { stats: TechnicianStats[] }) => {
  const cellSummaries = getCellSummaries(stats);

  return (
    <div style={{
      padding: '40px',
      backgroundColor: 'white',
      borderRadius: '24px',
      border: '1px solid #eef2f6',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '26px', fontWeight: '900', color: '#003366' }}>Prioridad de Intervención – Células</h3>
        <button style={{ backgroundColor: '#f1f5f9', padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', color: '#003366', border: '1px solid #e2e8f0' }}>Ver Análisis Técnico Histórico</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', padding: '20px', fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          <div style={{ flex: 1.5 }}>Célula</div>
          <div style={{ width: '120px', textAlign: 'right' }}>Reiteros (KPI)</div>
          <div style={{ width: '120px', textAlign: 'right' }}>Resolución</div>
          <div style={{ width: '150px', textAlign: 'right' }}>Estado</div>
        </div>
        {cellSummaries.map((cell, idx) => (
          <Link key={cell.name} href={`/celulas/${cell.name}`} style={{ 
            display: 'flex', 
            borderBottom: idx === cellSummaries.length - 1 ? 'none' : '1px solid #f8fafc', 
            padding: '32px 20px', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#1e293b', 
            alignItems: 'center',
            backgroundColor: idx % 2 === 0 ? 'transparent' : '#fcfdfe',
            textDecoration: 'none',
            cursor: 'pointer'
          }}>
            <div style={{ flex: 1.5 }}>
              <div style={{ fontWeight: '900', color: '#003366', fontSize: '20px' }}>{cell.name}</div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>{cell.criticals > 0 ? `${cell.criticals} técnicos requieren acción` : 'Operación estandarizada'}</div>
            </div>
            <div style={{ width: '120px', textAlign: 'right', fontWeight: '900', color: cell.status === 'error' ? '#ef4444' : '#22c55e' }}>{cell.reit}%</div>
            <div style={{ width: '120px', textAlign: 'right', fontWeight: '800' }}>{cell.res}%</div>
            <div style={{ width: '150px', textAlign: 'right' }}>
              <span style={{
                padding: '8px 20px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '900',
                backgroundColor: cell.status === 'error' ? '#fee2e2' : cell.status === 'warning' ? '#fef3c7' : '#f0fdf4',
                color: cell.status === 'error' ? '#ef4444' : cell.status === 'warning' ? '#d97706' : '#22c55e',
                textTransform: 'uppercase'
              }}>
                {cell.status === 'error' ? 'Crítico' : cell.status === 'warning' ? 'En Riesgo' : 'Controlado'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default function Home() {
  const insights = generateInsights(mockWeeklyStats);

  // Helper function to calculate averages
  const getAverage = (stats: TechnicianStats[], key: keyof TechnicianStats) => {
    return stats.reduce((acc, s) => acc + (s[key] as number), 0) / stats.length;
  };

  const avgReit = getAverage(mockWeeklyStats, 'reiteros');
  const avgRes = getAverage(mockWeeklyStats, 'resolucion');
  const avgPunt = getAverage(mockWeeklyStats, 'puntualidad');
  const avgProd = getAverage(mockWeeklyStats, 'productividad');

  const prevAvgReit = getAverage(mockPreviousWeek, 'reiteros');
  const prevAvgRes = getAverage(mockPreviousWeek, 'resolucion');
  const prevAvgPunt = getAverage(mockPreviousWeek, 'puntualidad');
  const prevAvgProd = getAverage(mockPreviousWeek, 'productividad');

  const getTrend = (curr: number, prev: number) => parseFloat((curr - prev).toFixed(1));

  return (
    <div style={{
      padding: '48px 56px',
      display: 'flex',
      flexDirection: 'column',
      gap: '40px',
      backgroundColor: 'var(--background)',
      minHeight: '100vh'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#003366', letterSpacing: '-1px' }}>Dashboard Operativo Distrito Varela</h1>
          <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '500' }}>Seguimiento Activo de Toma de Decisiones</p>
        </div>
        {/* Selector de periodo simplificado */}
        <div style={{ padding: '4px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eef2f6', display: 'flex', gap: '4px' }}>
          <button style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#019df4', color: '#fff', fontSize: '14px', fontWeight: '800' }}>W12 (Actual)</button>
          <button style={{ padding: '10px 20px', borderRadius: '8px', color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Histórico</button>
        </div>
      </div>

      <SmartHeader insights={insights} />

      <div style={{ display: 'flex', gap: '24px' }}>
        <MetricCard title="Reiteros" value={avgReit.toFixed(1)} trend={getTrend(avgReit, prevAvgReit)} target={defaultThresholds.reiteros.green} status={getKPIStatus('reiteros', avgReit)} icon={AlertTriangle} reverse={true} />
        <MetricCard title="Resolución" value={Math.round(avgRes)} trend={getTrend(avgRes, prevAvgRes)} target={defaultThresholds.resolucion.green} status={getKPIStatus('resolucion', avgRes)} icon={TrendingUp} />
        <MetricCard title="Puntualidad" value={Math.round(avgPunt)} trend={getTrend(avgPunt, prevAvgPunt)} target={defaultThresholds.puntualidad.green} status={getKPIStatus('puntualidad', avgPunt)} icon={CheckCircle} />
        <MetricCard title="Productividad" value={avgProd.toFixed(1)} trend={getTrend(avgProd, prevAvgProd)} target={defaultThresholds.productividad.green} unit="" status={getKPIStatus('productividad', avgProd)} icon={Activity} />
      </div>

      <SmartRanking stats={mockWeeklyStats} />
    </div>
  );
}
