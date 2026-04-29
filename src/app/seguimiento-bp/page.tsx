'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Activity,
  History,
  X,
  ClipboardList,
  User,
  BarChart3,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
  LayoutDashboard,
  Hammer,
  ArrowUpRight,
  Filter,
  ChevronDown,
  Save,
  Plus,
  CloudRain,
  MessageSquare,
  ArrowRight,
  Clock,
  Zap,
  List,
  CalendarDays,
  FileEdit,
  RotateCcw,
  Minus,
  Search,
  BarChart,
  Info,
  Lock,
  ShieldCheck,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  ArrowLeft
} from 'lucide-react';

// --- Types ---
type WeeklyLoadStatus = 'full' | 'partial' | 'empty';
type AnalyticMode = 'current' | 'compare-week' | 'last-4-weeks' | 'monthly';
type TimeScale = 'weekly' | 'monthly';
const ALL_MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

interface UserSession {
  usuario: string;
  rol: 'FULL' | 'LIDER';
  distrito: string;
  celula: string | string[] | null;
}

interface BPAlarmData {
  pt: number;
  ft: number;
  ta: number;
  ma: number;
  te: number;
  rt: number;
  ne: number;
  tea: number;
}

interface BPAntecedente {
  id: string;
  titulo: string;
  fecha: string;
  descripcion: string;
}

interface WeeklyKPI {
  id: string;
  weekLabel: string;
  dateRange: string;
  monthLabel: string;
  pdi: number;
  prod_equivalente: number;
  resolucion: number;
  reitero: number;
  status: WeeklyLoadStatus;
  alarms: BPAlarmData | null;
  observation?: string;
  locked?: boolean;
  updated_at?: string;
}

interface BPAction {
  id: string;
  weekLabel: string;
  dateRange: string;
  observation: string;
  date: string;
}

interface TechnicianSession {
  id: string;
  techName: string;
  dni: string;
  cell: string;
  district: string;
  status: 'critico' | 'seguimiento' | 'mejora';
  history: WeeklyKPI[];
  actions: BPAction[];
  antecedentes: BPAntecedente[];
}

const GLOSSARY = {
  PDI: 'Índice de desempeño individual',
  PROD: 'Productividad Equivalente',
  RESO: 'Índice de Resolución',
  REIT: 'Índice de Reiteros',
  PT: 'Primera Tarde',
  FT: 'Fin Temprano',
  TA: 'Tiempo Almuerzo',
  MA: 'Momento Almuerzo',
  TE: 'Tiempo de Ejecución',
  RT: 'Retrabajo',
  NE: 'No Efectiva',
  TEA: 'Tiempo Entre Actuaciones'
} as const;

// --- Utils ---
const getSemaforo = (value: number, kpi: string) => {
  if (kpi === 'resolucion') {
    if (value >= 75) return { color: '#064e3b', bg: '#bbf7d0', label: 'Objetivo OK', border: '#86efac' };
    if (value >= 70) return { color: '#78350f', bg: '#fef08a', label: 'En Umbral', border: '#fde047' };
    return { color: '#7f1d1d', bg: '#fecaca', label: 'Crítico', border: '#fca5a5' };
  }
  if (kpi === 'reite' || kpi === 'reitero') {
    if (value <= 4.5) return { color: '#064e3b', bg: '#bbf7d0', label: 'Objetivo OK', border: '#86efac' };
    if (value <= 5.0) return { color: '#78350f', bg: '#fef08a', label: 'En Umbral', border: '#fde047' };
    return { color: '#7f1d1d', bg: '#fecaca', label: 'Crítico', border: '#fca5a5' };
  }
  if (kpi === 'pdi') {
    if (value >= 100) return { color: '#064e3b', bg: '#bbf7d0', label: 'Objetivo OK', border: '#86efac' };
    if (value >= 90) return { color: '#78350f', bg: '#fef08a', label: 'En Umbral', border: '#fde047' };
    return { color: '#7f1d1d', bg: '#fecaca', label: 'Crítico', border: '#fca5a5' };
  }
  if (kpi === 'prod_equivalente') {
    if (value >= 6.0) return { color: '#064e3b', bg: '#bbf7d0', label: 'Objetivo OK', border: '#86efac' };
    if (value >= 5.0) return { color: '#78350f', bg: '#fef08a', label: 'En Umbral', border: '#fde047' };
    return { color: '#7f1d1d', bg: '#fecaca', label: 'Crítico', border: '#fca5a5' };
  }
  return { color: '#374151', bg: '#f3f4f6', label: 'N/A', border: '#e5e7eb' };
};

// --- Auth Components ---

const LoginForm = ({ onLogin }: { onLogin: (session: UserSession) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedUser = username.toUpperCase();
      const { data, error: dbError } = await supabase
        .from('usuarios')
        .select('*')
        .ilike('usuario', normalizedUser)
        .single();

      if (dbError || !data) {
        throw new Error('Usuario no encontrado');
      }

      if (data.pass !== password) {
        throw new Error('Contraseña incorrecta');
      }

      const session: UserSession = {
        usuario: data.usuario,
        rol: data.rol as 'FULL' | 'LIDER',
        distrito: data.distrito,
        celula: data.celula
      };

      localStorage.setItem('bp_session', JSON.stringify(session));
      onLogin(session);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E2E8F0', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '32px', padding: '48px', boxShadow: '0 25px 60px rgba(0,0,0,0.12)', border: '1px solid #CBD5E1' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#1C1F23', color: 'white', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '1000', color: '#111827', letterSpacing: '-1px' }}>Acceso Seguimiento BP</h2>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '8px', fontWeight: '800' }}>Ingresá tus credenciales</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '1000', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.8px', paddingLeft: '4px' }}>Usuario</label>
            <input 
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder=""
              required
              style={{ width: '100%', padding: '16px 20px', borderRadius: '16px', border: '2px solid #E2E8F0', fontSize: '15px', fontWeight: '800', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
              onFocus={e => e.currentTarget.style.borderColor = '#019df4'}
              onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '1000', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.8px', paddingLeft: '4px' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder=""
                required
                style={{ width: '100%', padding: '16px 50px 16px 20px', borderRadius: '16px', border: '2px solid #E2E8F0', fontSize: '15px', fontWeight: '800', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.currentTarget.style.borderColor = '#019df4'}
                onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
              />
              <button 
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', color: '#7F1D1D', fontSize: '13px', fontWeight: '800' }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '18px', 
              borderRadius: '16px', 
              backgroundColor: loading ? '#94A3B8' : '#1C1F23', 
              color: 'white', 
              fontSize: '15px', 
              fontWeight: '950', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px',
              transition: 'all 0.2s'
            }}
          >
            {loading ? <Activity className="animate-spin" size={20} /> : <><LogIn size={18} /> Ingresar</>}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Components ---

const StatCard = ({ title, value, previousValue, kpiKey }: { title: string, value: string | number, previousValue: number, kpiKey: string }) => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const variation = numValue - previousValue;
  const isPositiveMetric = ['resolucion', 'pdi', 'prod_equivalente'].includes(kpiKey);
  const isUp = variation > 0;
  const trendColor = isUp === isPositiveMetric ? '#064e3b' : '#7f1d1d';
  const semaforo = getSemaforo(numValue, kpiKey);

  return (
    <div style={{ backgroundColor: semaforo.bg, borderRadius: '24px', padding: '24px', border: `1px solid ${semaforo.border}`, borderBottomWidth: '3px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: '800', color: semaforo.color, textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.8 }}>{title}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <h4 style={{ fontSize: '40px', fontWeight: '1000', color: semaforo.color, margin: 0, letterSpacing: '-1px' }}>{kpiKey !== 'prod_equivalente' ? `${numValue.toFixed(1)}%` : numValue.toFixed(2)}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: trendColor }}>
          {isUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          <span style={{ fontSize: '15px', fontWeight: '900' }}>{variation === 0 ? '0%' : `${Math.abs(variation).toFixed(1)}%`}</span>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({ title, icon: Icon, children }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ backgroundColor: '#1C1F23', padding: '12px', borderRadius: '16px', color: 'white' }}><Icon size={22} /></div>
      <h2 style={{ fontSize: '22px', fontWeight: '1000', color: '#1C1F23', letterSpacing: '-0.5px' }}>{title}</h2>
    </div>
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>{children}</div>
  </div>
);

const SubsectionHeader = ({ title, icon: Icon }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #F3F7FB', paddingBottom: '10px' }}>
    <Icon size={18} color="#1C1F23" />
    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1C1F23', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</span>
  </div>
);

const ViewToggle = ({ options, active, onChange }: any) => (
  <div style={{ display: 'flex', backgroundColor: '#F3F7FB', padding: '5px', borderRadius: '16px' }}>
    {options.map((opt: any) => (
      <button
        key={String(opt.value)}
        onClick={() => onChange(opt.value)}
        style={{
          padding: '10px 20px', borderRadius: '12px', border: 'none',
          backgroundColor: active === opt.value ? 'white' : 'transparent',
          color: active === opt.value ? '#1C1F23' : '#5B6470',
          fontSize: '13px', fontWeight: '800', boxShadow: active === opt.value ? '0 4px 10px rgba(0,0,0,0.06)' : 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {opt.icon && <opt.icon size={15} />}
        {opt.label}
      </button>
    ))}
  </div>
);

// --- Table Components ---

const InlineInput = ({ value, onChange, placeholder, style = {}, step = "0.1" }: any) => (
  <input
    type="number"
    step={step}
    value={value}
    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    placeholder={placeholder}
    style={{
      width: '100%',
      padding: '12px 10px',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      textAlign: 'center',
      fontSize: '15px',
      fontWeight: '1000',
      outline: 'none',
      backgroundColor: '#FFFFFF',
      color: '#1C1F23',
      transition: 'all 0.2s',
      ...style
    }}
    onFocus={(e) => {
      e.currentTarget.style.borderColor = '#019df4';
      e.currentTarget.style.backgroundColor = '#FFFFFF';
      e.target.select();
    }}
    onBlur={(e) => {
      e.currentTarget.style.borderColor = '#e2e8f0';
    }}
  />
);

// --- Utils ---
const getWeekRange = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const formatDateRange = (start: Date, end: Date) => {
  const f = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  return `${f(start)} - ${f(end)}`;
};

// --- Alarms Dashboard ---
const AlarmsAnalyticalDashboard = ({ history, mode }: { history: WeeklyKPI[], mode: AnalyticMode }) => {
  const activeWeek = history[0];
  const prevWeek = history[1];

  const keys = ['pt', 'ft', 'ta', 'ma', 'te', 'rt', 'ne', 'tea'] as const;
  const labels: Record<string, string> = { pt: 'PT', ft: 'FT', ta: 'TA', ma: 'MA', te: 'TE', rt: 'RT', ne: 'NE', tea: 'TEA' };

  // Hierarchy colors for 4-week mode
  const fourWeekColors = [
    '#019df4', // Week 0 (Current) - Most Recent (Rightmost)
    '#7dd3fc', // Week -1
    '#bae6fd', // Week -2
    '#e2e8f0'  // Week -3 (Oldest - Leftmost)
  ];

  // --- Data processing ---
  const getComparisonData = (cur: BPAlarmData | null, prev: BPAlarmData | null) => {
    return keys.map(k => {
      const c = cur ? cur[k] : 0;
      const p = prev ? prev[k] : 0;
      return { key: k, label: labels[k], cur: c, prev: p, diff: c - p };
    });
  };

  const getMonthlyData = () => {
    const months = [...new Set(history.map(w => w.monthLabel))];
    const curMonth = months[0];
    const prevMonth = months[1];

    const aggregate = (mLabel: string) => {
      const weeks = history.filter(w => w.monthLabel === mLabel);
      const totals = { pt: 0, ft: 0, ta: 0, ma: 0, te: 0, rt: 0, ne: 0, tea: 0 };
      weeks.forEach(w => {
        if (w.alarms) {
          keys.forEach(k => totals[k] += (w.alarms![k] || 0));
        }
      });
      return totals;
    };

    const curTotals = aggregate(curMonth);
    const prevTotals = prevMonth ? aggregate(prevMonth) : null;

    return {
      curLabel: curMonth,
      prevLabel: prevMonth || 'N/A',
      data: getComparisonData(curTotals, prevTotals)
    };
  };

  const getLast4WeeksAlarms = (k: keyof BPAlarmData) => {
    return history.slice(0, 4).reverse().map(w => w.alarms ? w.alarms[k] : 0);
  };

  // --- Summary Logic ---
  const renderSummary = () => {
    let relevant: any[] = [];
    let title = "Detección de cambios relevantes";

    if (mode === 'current' || mode === 'compare-week') {
      relevant = getComparisonData(activeWeek?.alarms || null, prevWeek?.alarms || null)
        .filter(d => d.diff !== 0)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 3);
    } else if (mode === 'monthly') {
      const mData = getMonthlyData();
      relevant = mData.data.filter(d => d.diff !== 0)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 3);
      title = `Comparativa Mensual: ${mData.curLabel} vs ${mData.prevLabel}`;
    } else if (mode === 'last-4-weeks') {
      relevant = keys.map(k => {
        const vals = getLast4WeeksAlarms(k);
        const diff = vals[vals.length - 1] - vals[0];
        return { label: labels[k], diff, key: k };
      }).filter(d => d.diff !== 0).slice(0, 3);
      title = "Tendencias en últimas 4 semanas";
    }

    return (
      <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '950', color: '#4B5563', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
          <div style={{ display: 'flex', gap: '32px' }}>
            {relevant.length > 0 ? relevant.map(r => (
              <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: '950', color: '#1F2937' }}>{r.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: r.diff > 0 ? '#ef4444' : r.diff < 0 ? '#10b981' : '#6B7280', fontWeight: '950', fontSize: '15px' }}>
                  {r.diff > 0 ? <TrendingUp size={16} /> : r.diff < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                  {Math.abs(r.diff)}
                </div>
              </div>
            )) : <span style={{ fontSize: '14px', fontStyle: 'italic', color: '#6B7280' }}>Sin variaciones detectadas</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {mode === 'last-4-weeks' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: fourWeekColors[3] }} />
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>W-3</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: fourWeekColors[2] }} />
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>W-2</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: fourWeekColors[1] }} />
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>W-1</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: fourWeekColors[0] }} />
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>Actual</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: '#019df4' }} />
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b' }}>Actual</span>
              </div>
              {['compare-week', 'monthly'].includes(mode) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: '#e2e8f0' }} />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b' }}>Anterior</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // --- Specific Chart Renderers ---
  const renderBars = (data: any[]) => {
    const maxVal = Math.max(...data.map(d => Math.max(d.cur, d.prev, 5)));
    return (
      <div style={{ padding: '0 20px 0 40px', position: 'relative' }}>
        {/* Y-Axis Scale Labels */}
        {[0, 25, 50, 75, 100].map(p => (
          <div key={p} style={{ position: 'absolute', left: 0, top: `${100 - p}%`, transform: 'translateY(-50%)', fontSize: '10px', fontWeight: '900', color: '#94a3b8' }}>
            {Math.round((p / 100) * maxVal)}
          </div>
        ))}

        {/* Horizontal Grid Lines */}
        {[0, 25, 50, 75, 100].map(p => (
          <div key={p} style={{ position: 'absolute', left: '30px', right: 0, top: `${100 - p}%`, borderTop: '1px solid #f8fafc', height: 0 }} />
        ))}

        <div style={{ height: '320px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '24px', position: 'relative', zIndex: 1 }}>
          {data.map(d => (
            <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', height: '100%', position: 'relative' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '4px', width: '100%' }}>
                {(mode === 'compare-week' || mode === 'monthly') && (
                  <div style={{ width: '50%', height: `${(d.prev / maxVal) * 100}%`, backgroundColor: '#e2e8f0', borderRadius: '6px 6px 2px 2px', transition: 'all 0.6s' }} />
                )}
                <div style={{ width: (mode === 'compare-week' || mode === 'monthly') ? '50%' : '100%', height: `${(d.cur / maxVal) * 100}%`, backgroundColor: '#019df4', borderRadius: '6px 6px 2px 2px', transition: 'all 0.6s', boxShadow: '0 4px 12px rgba(1, 157, 244, 0.1)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '950', color: '#1F2937' }}>{d.cur}</div>
                <div style={{ fontSize: '11px', fontWeight: '950', color: '#6B7280', marginTop: '4px' }}>{d.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const render4WeekGroupedBars = () => {
    const last4 = history.slice(0, 4).reverse(); // From oldest to newest
    const maxVal = Math.max(...keys.map(k => Math.max(...last4.map(w => w.alarms ? w.alarms[k] : 0))), 5);

    return (
      <div style={{ padding: '0 20px 0 40px', position: 'relative' }}>
        {/* Y-Axis Scale Labels */}
        {[0, 25, 50, 75, 100].map(p => (
          <div key={p} style={{ position: 'absolute', left: 0, top: `${100 - p}%`, transform: 'translateY(-50%)', fontSize: '10px', fontWeight: '900', color: '#94a3b8' }}>
            {Math.round((p / 100) * maxVal)}
          </div>
        ))}

        {/* Horizontal Grid Lines */}
        {[0, 25, 50, 75, 100].map(p => (
          <div key={p} style={{ position: 'absolute', left: '30px', right: 0, top: `${100 - p}%`, borderTop: '1px solid #f8fafc', height: 0 }} />
        ))}

        <div style={{ height: '350px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '32px', position: 'relative', zIndex: 1 }}>
          {keys.map(k => (
            <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%' }}>
                {last4.map((w, idx) => {
                  const val = w.alarms ? w.alarms[k] : 0;
                  // Map idx (0: oldest, 3: newest) to colors (3: oldest, 0: newest)
                  const colorIdx = 3 - idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: '25%',
                        height: `${(val / maxVal) * 100}%`,
                        backgroundColor: fourWeekColors[colorIdx],
                        borderRadius: '3px 3px 1px 1px',
                        transition: 'all 0.8s'
                      }}
                      title={`${w.weekLabel}: ${val}`}
                    />
                  );
                })}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '15px', fontWeight: '950', color: '#1F2937' }}>{last4[3].alarms ? last4[3].alarms[k] : 0}</div>
                <div style={{ fontSize: '11px', fontWeight: '950', color: '#6B7280', marginTop: '4px' }}>{labels[k]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDateContext = () => {
    if (mode === 'current') return <div style={{ marginBottom: '24px', fontSize: '14px', fontWeight: '800', color: '#4B5563' }}>Semana actual: <span style={{ color: '#019df4' }}>{activeWeek?.weekLabel}</span></div>;
    if (mode === 'compare-week') return (
      <div style={{ marginBottom: '24px', fontSize: '14px', fontWeight: '800', color: '#4B5563', display: 'flex', gap: '16px' }}>
        <div>Semana actual: <span style={{ color: '#019df4' }}>{activeWeek?.weekLabel}</span></div>
        <div style={{ color: '#6B7280' }}>vs</div>
        <div>Semana anterior: <span style={{ color: '#6B7280' }}>{prevWeek?.weekLabel}</span></div>
      </div>
    );
    if (mode === 'last-4-weeks') {
      const range = history.slice(0, 4).reverse().map(w => w.weekLabel.split(' - ')[0]).join(' · ');
      return <div style={{ marginBottom: '24px', fontSize: '14px', fontWeight: '800', color: '#4B5563' }}>Últimas 4 semanas: <span style={{ color: '#019df4' }}>{range}</span></div>;
    }
    if (mode === 'monthly') {
      const m = getMonthlyData();
      return <div style={{ marginBottom: '24px', fontSize: '14px', fontWeight: '800', color: '#4B5563' }}>Mensual: <span style={{ color: '#019df4' }}>{m.curLabel}</span> vs <span style={{ color: '#6B7280' }}>{m.prevLabel}</span></div>;
    }
    return null;
  };

  return (
    <div style={{ padding: '32px' }}>
      {renderDateContext()}
      {renderSummary()}
      <div style={{ marginTop: '20px' }}>
        {mode === 'current' && renderBars(getComparisonData(activeWeek?.alarms || null, null))}
        {mode === 'compare-week' && renderBars(getComparisonData(activeWeek?.alarms || null, prevWeek?.alarms || null))}
        {mode === 'monthly' && renderBars(getMonthlyData().data)}
        {mode === 'last-4-weeks' && render4WeekGroupedBars()}
      </div>
    </div>
  );
};

// --- Modal and BottomSheet Components ---

const StatItem = ({ label, value, kpiKey }: { label: string, value: number, kpiKey: string }) => {
  const semaforo = getSemaforo(value, kpiKey);
  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: `1px solid ${semaforo.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <p style={{ fontSize: '12px', fontWeight: '800', color: '#5B6470', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
      <div style={{ fontSize: '22px', fontWeight: '1000', color: semaforo.color }}>{kpiKey === 'prod_equivalente' ? value.toFixed(2) : `${value.toFixed(1)}%`}</div>
    </div>
  );
};

const AlarmRow = ({ label, value }: { label: string, value: number }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
    <span style={{ fontSize: '14px', fontWeight: '800', color: '#5B6470' }}>{label}</span>
    <span style={{ fontSize: '15px', fontWeight: '1000', color: '#1C1F23' }}>{value}</span>
  </div>
);

const AlarmsModal = ({ week, onClose, onSave }: any) => {
  const [data, setData] = useState<BPAlarmData>(week.alarms || { pt: 0, ft: 0, ta: 0, ma: 0, te: 0, rt: 0, ne: 0, tea: 0 });
  const [kpiData, setKpiData] = useState({ pdi: week.pdi, prod_equivalente: week.prod_equivalente, resolucion: week.resolucion, reitero: week.reitero });
  
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '32px', width: '90%', maxWidth: '600px', padding: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: '950' }}>Edición Semanal</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <SubsectionHeader title="Indicadores KPI" icon={Zap} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          {['PDI', 'PROD_EQUIVALENTE', 'RESOLUCION', 'REITERO'].map(k => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: '950', color: '#64748b' }}>{k.replace('_', ' ')}</label>
              <input 
                type="number" 
                step="0.1"
                value={(kpiData as any)[k.toLowerCase()]} 
                onChange={(e) => setKpiData({ ...kpiData, [k.toLowerCase()]: parseFloat(e.target.value) || 0 })} 
                style={{ padding: '12px', borderRadius: '12px', border: '1.5px solid #f1f5f9', outline: 'none' }} 
              />
            </div>
          ))}
        </div>

        <SubsectionHeader title="Alarmas Operativas" icon={AlertCircle} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {Object.keys(data).map(k => (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: '950', color: '#64748b' }}>{k.toUpperCase()}</label>
              <input 
                type="number" 
                value={(data as any)[k]} 
                onChange={(e) => setData({ ...data, [k]: parseInt(e.target.value) || 0 })} 
                style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #f1f5f9', outline: 'none', fontSize: '13px' }} 
              />
            </div>
          ))}
        </div>

        <button onClick={() => onSave(data, week.dateRange, kpiData)} style={{ width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: '#019df4', color: 'white', fontWeight: '950', border: 'none', cursor: 'pointer' }}>Guardar Todo</button>
      </div>
    </div>
  );
};

const SnapshotBottomSheet = ({ week, onClose }: { week: WeeklyKPI, onClose: () => void }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.2)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '32px', width: '90%', maxWidth: '600px', padding: '40px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '32px', right: '32px', border: 'none', background: 'none', cursor: 'pointer' }}><X size={24} /></button>
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: '950', color: '#0f172a' }}>Snapshot Semanal</h3>
          <p style={{ color: '#64748b', fontWeight: '800' }}>Semana: {week.weekLabel}</p>
        </div>

        <div style={{ gridTemplateColumns: 'repeat(4, 1fr)', display: 'grid', gap: '16px', marginBottom: '40px' }}>
          <StatItem label="PDI" value={week.pdi} kpiKey="pdi" />
          <StatItem label="Prod. equivalente" value={week.prod_equivalente} kpiKey="prod_equivalente" />
          <StatItem label="Resolución" value={week.resolucion} kpiKey="resolucion" />
          <StatItem label="Reiteros" value={week.reitero} kpiKey="reitero" />
        </div>

        <div>
          <SubsectionHeader title="Alarmas Registradas" icon={AlertTriangle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            <div>
              <AlarmRow label="PT (Productividad Total)" value={week.alarms?.pt || 0} />
              <AlarmRow label="FT (Faltas Totales)" value={week.alarms?.ft || 0} />
              <AlarmRow label="TA (Tareas Atrasadas)" value={week.alarms?.ta || 0} />
              <AlarmRow label="MA (Malas Atenciones)" value={week.alarms?.ma || 0} />
            </div>
            <div>
              <AlarmRow label="TE (Tiempos Excedidos)" value={week.alarms?.te || 0} />
              <AlarmRow label="RT (Reiteros Críticos)" value={week.alarms?.rt || 0} />
              <AlarmRow label="NE (No Encontrados)" value={week.alarms?.ne || 0} />
              <AlarmRow label="TEA (Tareas por Agenda)" value={week.alarms?.tea || 0} />
            </div>
          </div>
        </div>

        {week.observation && (
          <div style={{ marginTop: '32px', padding: '24px', backgroundColor: '#f0f9ff', borderRadius: '24px', border: '1px solid #bae6fd' }}>
            <p style={{ fontSize: '11px', fontWeight: '950', color: '#0369a1', textTransform: 'uppercase', marginBottom: '8px' }}>Observación del Líder</p>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#1e293b' }}>{week.observation}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Tracking Component ---

// --- Directory Components ---

const STRUCTURE = [
  {
    distrito: "LANUS",
    celulas: [
      { nombre: "GM LANUS", tecnicos: [{ name: "ESCOBAR FEDERICO", role: "GM" }] },
      { nombre: "GM LOMAS", tecnicos: [{ name: "GARCIA, CARLOS FACUNDO", role: "GM" }, { name: "FERREIRA QUIÑONEZ, DAVID", role: "GM" }] },
      { nombre: "PIÑEYRO", tecnicos: [{ name: "ORTIGOZA, EMMANUEL JAVIER", role: "REVISADOR" }] },
      { nombre: "SARANDI", tecnicos: [{ name: "FALCON, AGUSTIN ALEJANDRO", role: "REVISADOR" }, { name: "TORRES, CHRISTIAN NICOLAS", role: "REVISADOR" }] },
      { nombre: "MS LANUS", tecnicos: [{ name: "JAIME, MARCELO RAUL", role: "EMPALMADOR" }, { name: "PARED, JUAN MANUEL", role: "EMPALMADOR" }, { name: "RIOS RADO, EMILIO", role: "EMPALMADOR" }] }
    ]
  },
  {
    distrito: "MONTE GRANDE",
    celulas: [
      { nombre: "BURZACO", tecnicos: [{ name: "ARIAS BERNARDO", role: "REVISADOR" }, { name: "SALINAS LUCIANO", role: "REVISADOR" }] },
      { nombre: "LONGCHAMPS", tecnicos: [{ name: "DIANA PABLO", role: "REVISADOR" }] },
      { nombre: "MS MONTE GRANDE", tecnicos: [{ name: "FIGUEREDO CARLOS", role: "EMPALMADOR" }, { name: "FERNANDEZ FACUNDO", role: "EMPALMADOR" }] }
    ]
  },
  {
    distrito: "VARELA",
    celulas: [
      { nombre: "MS VARELA", tecnicos: [{ name: "MUÑOZ DIEGO ANGEL", role: "EMPALMADOR" }, { name: "PERNARGIG JULIO", role: "EMPALMADOR" }] },
      { nombre: "RANELAGH", tecnicos: [{ name: "SEGOVIA JAVIER ANDRES", role: "REVISADOR" }, { name: "STELLA SERGIO LEONEL", role: "REVISADOR" }] }
    ]
  }
];

const ManageTechBottomSheet = ({ onClose }: { onClose: () => void }) => {
  const [tab, setTab] = useState<'add' | 'remove'>('add');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  
  const [formData, setFormData] = useState({
    nombre: '', apellido: '', dni: '',
    distrito: '', celula: '', lider: '', funcion: ''
  });
  const [leaders, setLeaders] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('usuarios').select('usuario').eq('rol', 'LIDER').then(({ data }) => {
      if (data) setLeaders(data);
    });
  }, []);

  const distritosDisponibles = STRUCTURE.map(d => d.distrito);
  const celulasDisponibles = formData.distrito 
    ? STRUCTURE.find(d => d.distrito === formData.distrito)?.celulas.map(c => c.nombre) || []
    : [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const nombreNormalizado = `${formData.apellido.trim().toUpperCase()}, ${formData.nombre.trim().toUpperCase()}`;
      
      const { data: techData, error } = await supabase.from('tecnicos').insert({
        dni: formData.dni,
        nombre: formData.nombre.trim().toUpperCase(),
        apellido: formData.apellido.trim().toUpperCase(),
        nombre_normalizado: nombreNormalizado
      }).select('id').single();

      if (error) {
        if (error.code === '23505') throw new Error('El DNI ya se encuentra registrado.');
        throw error;
      }

      if (techData && techData.id) {
        await supabase.from('tecnico_alias').insert({
          tecnico_id: techData.id,
          valor_original: JSON.stringify({ distrito: formData.distrito, celula: formData.celula, lider: formData.lider, funcion: formData.funcion }),
          tipo: 'metadata_assignment'
        });
      }
      
      setMsg({ text: 'Técnico agregado correctamente. Refrescá la página para verlo en la lista.', type: 'success' });
      setFormData({ nombre: '', apellido: '', dni: '', distrito: '', celula: '', lider: '', funcion: '' });
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al agregar', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const { data, error: findErr } = await supabase.from('tecnicos').select('*').eq('dni', formData.dni).single();
      if (!data) throw new Error('No se encontró un técnico con ese DNI.');
      
      const { error } = await supabase.from('tecnicos').delete().eq('dni', formData.dni);
      if (error) throw error;
      
      setMsg({ text: 'Técnico eliminado de la BD correctamente.', type: 'success' });
      setFormData({ ...formData, dni: '' });
    } catch (err: any) {
      setMsg({ text: err.message || 'Error al eliminar', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '24px', width: '100%', maxWidth: '600px', padding: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: '950', letterSpacing: '-0.5px' }}>Gestión de Técnicos</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px' }}>
          <button 
            onClick={() => { setTab('add'); setMsg({text:'', type:''}); }}
            style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: tab === 'add' ? '#019df4' : 'transparent', color: tab === 'add' ? 'white' : '#64748b', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s' }}
          >Agregar Técnico</button>
          <button 
            onClick={() => { setTab('remove'); setMsg({text:'', type:''}); }}
            style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: tab === 'remove' ? '#ef4444' : 'transparent', color: tab === 'remove' ? 'white' : '#64748b', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s' }}
          >Quitar Técnico</button>
        </div>

        {msg.text && (
          <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', backgroundColor: msg.type === 'error' ? '#fef2f2' : '#f0fdf4', color: msg.type === 'error' ? '#991b1b' : '#166534', fontWeight: '800', fontSize: '14px', border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#bbf7d0'}` }}>
            {msg.text}
          </div>
        )}

        {tab === 'add' ? (
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Nombre</label>
                <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '14px', fontWeight: '800' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Apellido</label>
                <input required type="text" value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '14px', fontWeight: '800' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>DNI (IMPORTANTE: Se usará como ID único)</label>
              <input required type="number" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '14px', fontWeight: '800' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Distrito</label>
                <select required value={formData.distrito} onChange={e => setFormData({...formData, distrito: e.target.value, celula: ''})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '14px', fontWeight: '800' }}>
                  <option value="" disabled>Seleccione Distrito</option>
                  {distritosDisponibles.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Célula</label>
                <select required value={formData.celula} onChange={e => setFormData({...formData, celula: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '14px', fontWeight: '800' }} disabled={!formData.distrito}>
                  <option value="" disabled>Seleccione Célula</option>
                  {celulasDisponibles.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Líder a Cargo</label>
                <select required value={formData.lider} onChange={e => setFormData({...formData, lider: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '14px', fontWeight: '800' }}>
                  <option value="" disabled>Seleccione Líder</option>
                  {leaders.map(l => (
                    <option key={l.usuario} value={l.usuario}>{l.usuario}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>Función</label>
                <select required value={formData.funcion} onChange={e => setFormData({...formData, funcion: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '14px', fontWeight: '800' }}>
                  <option value="" disabled>Seleccione Función</option>
                  <option value="TÉCNICO">Técnico</option>
                  <option value="EMPALMADOR">Empalmador</option>
                  <option value="GM">GM</option>
                  <option value="REVISADOR">Revisador</option>
                </select>
              </div>
            </div>
            <button disabled={loading} type="submit" style={{ marginTop: '16px', width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: '#019df4', color: 'white', fontWeight: '950', fontSize: '15px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Guardando...' : 'Agregar Técnico'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRemove} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>DNI del Técnico a Eliminar</label>
              <input required type="number" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '14px', fontWeight: '800' }} />
            </div>
            <button disabled={loading} type="submit" style={{ marginTop: '16px', width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: '#ef4444', color: 'white', fontWeight: '950', fontSize: '15px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Eliminando...' : 'Eliminar Técnico'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const BPDirectory = ({ user, onLogout }: { user: UserSession, onLogout: () => void }) => {
  const [techMapping, setTechMapping] = useState<Record<string, string>>({});
  const [dbTecnicos, setDbTecnicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTechManager, setShowTechManager] = useState(false);

  const filteredStructure = useMemo(() => {
    let baseStructure = JSON.parse(JSON.stringify(STRUCTURE)) as typeof STRUCTURE;

    if (dbTecnicos.length > 0) {
      dbTecnicos.forEach(dbTech => {
        const assignmentStr = dbTech.tecnico_alias?.find((a: any) => a.tipo === 'metadata_assignment')?.valor_original;
        if (assignmentStr) {
          try {
            const assignment = JSON.parse(assignmentStr);
            const distIndex = baseStructure.findIndex(d => d.distrito === assignment.distrito);
            if (distIndex !== -1) {
              const celIndex = baseStructure[distIndex].celulas.findIndex(c => c.nombre === assignment.celula);
              if (celIndex !== -1) {
                const name1 = `${dbTech.apellido}, ${dbTech.nombre}`.toUpperCase();
                // Check if not already in structure
                const exists = baseStructure[distIndex].celulas[celIndex].tecnicos.some(t => t.name.replace(/\s+/g,'') === name1.replace(/\s+/g,''));
                if (!exists) {
                  baseStructure[distIndex].celulas[celIndex].tecnicos.push({
                    name: name1,
                    role: assignment.funcion || 'REVISADOR' // Default
                  });
                }
              }
            }
          } catch (e) {
            // ignore JSON parse error
          }
        }
      });
    }

    baseStructure = baseStructure.map(dist => ({
      ...dist,
      celulas: user.rol === 'LIDER' 
        ? dist.celulas.filter(cel => {
            if (!user.celula) return false;
            const allowed = Array.isArray(user.celula) 
              ? user.celula 
              : user.celula.split(',').map(c => c.trim().toUpperCase());
            return allowed.includes(cel.nombre.toUpperCase());
          })
        : dist.celulas
    })).filter(dist => dist.celulas.length > 0);

    return baseStructure;
  }, [user, dbTecnicos]);

  useEffect(() => {
    const fetchDnis = async () => {
      const { data } = await supabase.from('tecnicos').select('id, nombre, apellido, dni, nombre_normalizado, tecnico_alias(tipo, valor_original)');
      if (data) {
        setDbTecnicos(data);
        const mapping: Record<string, string> = {};
        data.forEach(t => {
          const fullName = `${t.apellido}, ${t.nombre}`.toUpperCase();
          const altName = `${t.apellido} ${t.nombre}`.toUpperCase();
          mapping[fullName] = t.dni;
          mapping[altName] = t.dni;
        });
        setTechMapping(mapping);
      }
      setLoading(false);
    };
    fetchDnis();
  }, []);

  const getRoleStyle = (role: string) => {
    switch (role.toUpperCase()) {
      case 'GM':
        return { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' }; // Azules más saturados
      case 'REVISADOR':
      case 'REVISOR':
        return { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' }; // Violetas más saturados
      case 'EMPALMADOR':
        return { bg: '#ccfbf1', color: '#0f766e', border: '#99f6e4' }; // Teals más saturados
      default:
        return { bg: '#f1f5f9', color: '#334155', border: '#e2e8f0' };
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Activity size={48} className="animate-spin" color="#019df4" />
    </div>
  );

  return (
    <div style={{ backgroundColor: '#F3F7FB', minHeight: '100vh', width: '100%', padding: '60px 20px' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ position: 'relative', marginBottom: '64px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '8px', backgroundColor: user.rol === 'FULL' ? '#1C1F23' : '#019df4', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <span style={{ fontSize: '12px', fontWeight: '1000', color: '#1C1F23' }}>{user.usuario}</span>
            <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>{user.rol}</span>
          </div>
          <button 
            onClick={onLogout}
            title="Cerrar Sesión"
            style={{ marginLeft: '8px', padding: '6px', backgroundColor: '#FEF2F2', border: 'none', borderRadius: '8px', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <LogOut size={14} />
          </button>
        </div>
        <h1 style={{ fontSize: '42px', fontWeight: '1000', color: '#111827', letterSpacing: '-1.8px', marginBottom: '12px' }}>Seguimiento BP</h1>
        {user.rol === 'FULL' && (
          <button 
            onClick={() => setShowTechManager(true)}
            style={{ padding: '10px 20px', borderRadius: '14px', border: 'none', backgroundColor: '#1C1F23', color: 'white', fontWeight: '900', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginTop: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            <Plus size={16} /> Gestionar Técnicos
          </button>
        )}
      </div>

      {showTechManager && <ManageTechBottomSheet onClose={() => setShowTechManager(false)} />}

      {filteredStructure.map(dist => (
        <div key={dist.distrito} style={{ marginBottom: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
            <div style={{ height: '3px', flex: 1, backgroundColor: '#E5E7EB', borderRadius: '4px' }}></div>
            <h2 style={{ fontSize: '28px', fontWeight: '1000', color: '#111827', letterSpacing: '-0.7px' }}>{dist.distrito}</h2>
            <div style={{ height: '3px', flex: 1, backgroundColor: '#E5E7EB', borderRadius: '4px' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '56px', paddingLeft: '12px' }}>
            {dist.celulas.map(cel => (
              <div key={cel.nombre}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', paddingBottom: '14px', borderBottom: '2.5px solid #E5E7EB' }}>
                  <LayoutDashboard size={22} color="#019df4" />
                  <h3 style={{ fontSize: '17px', fontWeight: '1000', color: '#374151', textTransform: 'uppercase', letterSpacing: '1.2px' }}>{cel.nombre}</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '34px' }}>
                  {cel.tecnicos.map(tech => {
                    const dni = techMapping[tech.name.toUpperCase()];
                    const rs = getRoleStyle(tech.role);
                    return (
                      <a 
                        key={tech.name}
                        href={dni ? `/seguimiento-bp?dni=${dni}` : '#'}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '20px 28px', 
                          backgroundColor: '#FFFFFF', 
                          borderRadius: '24px', 
                          border: '1px solid #E5EAF0',
                          textDecoration: 'none',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                          marginBottom: '4px',
                          cursor: 'pointer'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)';
                          e.currentTarget.style.borderColor = '#019df4';
                          const arrow = e.currentTarget.querySelector('.cta-arrow') as HTMLElement;
                          if (arrow) {
                            arrow.style.backgroundColor = '#019df4';
                            arrow.style.color = 'white';
                          }
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                          e.currentTarget.style.borderColor = '#E5EAF0';
                          const arrow = e.currentTarget.querySelector('.cta-arrow') as HTMLElement;
                          if (arrow) {
                            arrow.style.backgroundColor = '#E7F0FF';
                            arrow.style.color = '#019df4';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '16px', backgroundColor: '#F3F7FB', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0' }}>
                            <User size={22} color="#1C1F23" />
                          </div>
                          <span style={{ fontSize: '17px', fontWeight: '1000', color: '#1C1F23', letterSpacing: '-0.4px' }}>{tech.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '950', 
                            padding: '6px 14px', 
                            borderRadius: '99px', 
                            backgroundColor: rs.bg, 
                            color: rs.color, 
                            border: `1px solid ${rs.border}`,
                            letterSpacing: '0.6px'
                          }}>
                            {tech.role}
                          </span>
                          <div className="cta-arrow" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#E7F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#019df4', transition: 'all 0.3s' }}>
                            <ArrowRight size={18} />
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};

// --- Main Tracking Component ---

function BPTrackingContent() {
  const searchParams = useSearchParams();
  const dni = searchParams.get('dni');

  const logActivity = async (params: { tecnico_id: string, accion: 'view' | 'edit' | 'create', campo?: string, valor_anterior?: string, valor_nuevo?: string }) => {
    try {
      const saved = localStorage.getItem('bp_session');
      if (!saved) return;
      const userSession = JSON.parse(saved);
      await supabase.from('seguimiento_bp_log').insert({
        ...params,
        usuario: userSession.usuario,
        fecha: new Date().toISOString()
      });
    } catch (err) {
      console.error('Logging error:', err);
    }
  };

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserSession | null>(null);
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);
  const [kpiScale, setKpiScale] = useState<'weekly' | 'monthly'>('weekly');
  const [kpiView, setKpiView] = useState<'table' | 'chart'>('table');
  const [alarmScale, setAlarmScale] = useState<'weekly' | 'monthly'>('weekly');
  const [alarmView, setAlarmView] = useState<'table' | 'chart'>('table');
  const [alarmMode, setAlarmMode] = useState<AnalyticMode>('current');
  const [selectedSnapshot, setSelectedSnapshot] = useState<WeeklyKPI | null>(null);
  const [showAntecedenteModal, setShowAntecedenteModal] = useState(false);
  const [antForm, setAntForm] = useState({ titulo: '', fecha: new Date().toISOString().split('T')[0], descripcion: '' });
  const [isAntExpanded, setIsAntExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'actions' | 'logs'>('data');
  const [observationText, setObservationText] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [tempRowData, setTempRowData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showNewTrackingModal, setShowNewTrackingModal] = useState(false);
  const [trackingDate, setTrackingDate] = useState(new Date().toISOString().split('T')[0]);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bp_session');
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error loading session:', err);
      localStorage.removeItem('bp_session');
    }
    setAuthChecked(true);
  }, []);

  const fetchData = async () => {
    if (!dni) return;
    setLoading(true);
    try {
      const { data: tech } = await supabase.from('tecnicos').select('*').eq('dni', dni).single();
      if (!tech) return;

      const now = new Date();
      const weeks: any[] = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - (i * 7));
        weeks.push(await fetchWeekData(tech.id, d));
      }

      const months: any[] = [];
      const currentMonth = now.getMonth();
      for (let i = 0; i <= currentMonth; i++) {
        const dateObj = new Date(now.getFullYear(), i, 1);
        const mData = await fetchWeekData(tech.id, dateObj, true);
        
        if (mData.status === 'full') {
          months.push(mData);
        } else {
          const mLabel = ALL_MONTHS[dateObj.getMonth()];
          const weeksInMonth = weeks.filter((w: any) => w.monthLabel === mLabel);
          const weeksWithData = weeksInMonth.filter((w: any) => w.status === 'full');
          const count = weeksWithData.length || 1;
          
          const ak = ['pt', 'ft', 'ta', 'ma', 'te', 'rt', 'ne', 'tea'];
          const alarmSums: any = {};
          ak.forEach(key => alarmSums[key] = weeksInMonth.reduce((acc: number, w: any) => acc + (w.alarms ? (w.alarms as any)[key] : 0), 0));

          months.push({
            id: `avg-${mLabel}`,
            isMonthly: true,
            isAverage: true,
            weekLabel: `${mLabel[0]}${mLabel.slice(1).toLowerCase()} ${now.getFullYear()}`,
            dateRange: mData.dateRange,
            pdi: weeksWithData.reduce((acc: number, w: any) => acc + (w.pdi || 0), 0) / count,
            prod_equivalente: weeksWithData.reduce((acc: number, w: any) => acc + (w.prod_equivalente || 0), 0) / count,
            resolucion: weeksWithData.reduce((acc: number, w: any) => acc + (w.resolucion || 0), 0) / count,
            reitero: weeksWithData.reduce((acc: number, w: any) => acc + (w.reitero || 0), 0) / count,
            alarms: alarmSums,
            status: 'partial'
          });
        }
      }

      const { data: tracking } = await supabase.from('seguimiento_bp').select('*').eq('tecnico_id', tech.id).eq('confirmado', true).order('fecha_inicio', { ascending: false });
      const { data: antData } = await supabase.from('antecedentes_bp').select('*').eq('tecnico_id', tech.id).order('fecha', { ascending: false });

      let orgInfo = { district: 'N/A', cell: 'N/A', role: 'Técnico' };
      const normalize = (s: string) => s.toUpperCase().replace(/,/g, '').split(/\s+/).filter(Boolean).sort().join(' ');
      const techDBName = normalize(`${tech.nombre} ${tech.apellido}`);

      for (const dist of STRUCTURE) {
        for (const cel of dist.celulas) {
          const matchedTech = cel.tecnicos.find(t => normalize(t.name) === techDBName);
          if (matchedTech) {
            orgInfo = { district: dist.distrito, cell: cel.nombre, role: matchedTech.role };
            break;
          }
        }
      }

      if (orgInfo.district === 'N/A') {
        const { data: aliasData } = await supabase
          .from('tecnico_alias')
          .select('valor_original')
          .eq('tecnico_id', tech.id)
          .eq('tipo', 'metadata_assignment')
          .maybeSingle();

        if (aliasData && aliasData.valor_original) {
          try {
            const parsed = JSON.parse(aliasData.valor_original);
            if (parsed.distrito && parsed.celula) {
              orgInfo = { district: parsed.distrito, cell: parsed.celula, role: parsed.funcion || 'Técnico' };
            }
          } catch (e) {
            console.error('Error parsing metadata assignment', e);
          }
        }
      }

      if (user?.rol === 'LIDER') {
        const allowed = !user.celula ? [] : (Array.isArray(user.celula) ? user.celula : user.celula.split(',').map(c => c.trim().toUpperCase()));
        if (!allowed.includes(orgInfo.cell.toUpperCase())) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }

      setSession({
        id: tech.id,
        techName: `${tech.nombre} ${tech.apellido}`,
        dni: tech.dni,
        cell: orgInfo.cell,
        district: orgInfo.district,
        role: orgInfo.role,
        status: 'seguimiento',
        history: weeks,
        actions: (tracking || []).map((t: any) => ({
          id: t.id,
          weekLabel: formatDateRange(new Date(t.fecha_inicio), new Date(t.fecha_fin)),
          dateRange: t.fecha_inicio,
          observation: t.observacion_lider,
          date: new Date(t.fecha_confirmacion).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        })),
        antecedentes: (antData || []).map((a: any) => ({ id: a.id, titulo: a.titulo, fecha: a.fecha, descripcion: a.descripcion }))
      });
      setMonthlyHistory(months.reverse());
      
      // Fetch Audit Logs only for ADORNO
      const savedSession = localStorage.getItem('bp_session');
      if (savedSession) {
        const userObj = JSON.parse(savedSession);
        if (userObj.usuario?.trim().toUpperCase() === 'ADORNO') {
          const { data: logsData } = await supabase
            .from('seguimiento_bp_log')
            .select('*')
            .eq('tecnico_id', tech.id)
            .order('fecha', { ascending: false })
            .limit(50);
          setAuditLogs(logsData || []);
        }
      }
      
      // Log View Event
      logActivity({
        tecnico_id: tech.id,
        accion: 'view'
      });

      } catch (err) { 
      console.error('Critical fetchData error:', err); 
      setSession({ 
        id: 'error', 
        techName: 'Error de carga', 
        dni: dni || '', 
        cell: 'N/A', district: 'N/A', role: 'N/A', status: 'critico', 
        history: [], actions: [], antecedentes: [] 
      });
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    if (!authChecked) return;
    setAccessDenied(false);
    if (dni && user) {
      fetchData(); 
    } else {
      setLoading(false);
    }
  }, [dni, user, authChecked]);

  const activeWeek = session?.history[0];

  useEffect(() => {
    if (activeWeek) setObservationText(activeWeek.observation || '');
  }, [activeWeek]);

  const handleLogout = () => {
    localStorage.removeItem('bp_session');
    setUser(null);
    window.location.href = '/seguimiento-bp';
  };

  if (!authChecked) return null;
  if (!user) return <LoginForm onLogin={setUser} />;

  const fetchWeekData = async (techId: string, date: Date, isMonthly: boolean = false) => {
    const { start, end } = getWeekRange(date);
    const startStr = isMonthly ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01` : start.toISOString().split('T')[0];
    const endStr = isMonthly ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-28` : end.toISOString().split('T')[0];

    const { data: tracking } = await supabase.from('seguimiento_bp')
      .select('*')
      .eq('tecnico_id', techId)
      .eq('fecha_inicio', startStr)
      .eq('es_mensual', isMonthly)
      .maybeSingle();

    return {
      id: isMonthly ? `monthly-${startStr}` : Math.random().toString(36).substr(2, 9),
      isMonthly,
      weekLabel: isMonthly 
        ? `${ALL_MONTHS[date.getMonth()]} ${date.getFullYear()}`
        : formatDateRange(start, end),
      dateRange: startStr,
      monthLabel: ALL_MONTHS[date.getMonth()],
      pdi: tracking?.kpi_pdi || 0,
      prod_equivalente: tracking?.kpi_prod_equiv || 0,
      resolucion: tracking?.kpi_resolucion || 0,
      reitero: tracking?.kpi_reitero || 0,
      status: (tracking?.estado_carga || 'empty') as WeeklyLoadStatus,
      alarms: tracking ? {
        pt: tracking.alarma_pt, ft: tracking.alarma_ft, ta: tracking.alarma_ta, ma: tracking.alarma_ma,
        te: tracking.alarma_te, rt: tracking.alarma_rt, ne: tracking.alarma_ne, tea: tracking.alarma_tea
      } : null,
      observation: tracking?.observacion_lider || '',
      locked: tracking?.confirmado || false,
      updated_at: tracking?.fecha_confirmacion
    };
  };


  const handleSaveAlarms = async (data: BPAlarmData, date: string, kpiData?: any, isMonthlyOverride: boolean = false) => {
    if (!session) return;
    
    let startStr = date;
    let endStr = date;

    if (!isMonthlyOverride) {
      const [year, month, day] = date.split('-').map(Number);
      const safeDate = new Date(year, month - 1, day);
      const { start, end } = getWeekRange(safeDate);
      startStr = start.toISOString().split('T')[0];
      endStr = end.toISOString().split('T')[0];
    }
    
    const payload: any = {
      tecnico_id: session.id,
      fecha_inicio: startStr,
      fecha_fin: endStr,
      alarma_pt: data.pt, alarma_ft: data.ft, alarma_ta: data.ta, alarma_ma: data.ma,
      alarma_te: data.te, alarma_rt: data.rt, alarma_ne: data.ne, alarma_tea: data.tea,
      estado_carga: 'full',
      confirmado: true,
      es_mensual: isMonthlyOverride,
      fecha_confirmacion: new Date().toISOString()
    };

    if (kpiData) {
      payload.kpi_pdi = kpiData.pdi;
      payload.kpi_prod_equiv = kpiData.prod_equivalente;
      payload.kpi_resolucion = kpiData.resolucion;
      payload.kpi_reitero = kpiData.reitero;
    }

    const { data: current } = await supabase
      .from('seguimiento_bp')
      .select('*')
      .eq('tecnico_id', session.id)
      .eq('fecha_inicio', startStr)
      .eq('es_mensual', isMonthlyOverride)
      .maybeSingle();

    const { error } = await supabase.from('seguimiento_bp').upsert(payload, { 
      onConflict: 'tecnico_id, fecha_inicio, es_mensual' 
    });

    if (error) {
      console.error('Error saving:', error);
      alert('Error al guardar: ' + error.message);
    } else {
      // Log Edit/Create Event
      if (!current) {
        logActivity({
          tecnico_id: session.id,
          accion: 'create'
        });
      } else {
        const fieldsToLog = [
          'alarma_pt', 'alarma_ft', 'alarma_ta', 'alarma_ma', 
          'alarma_te', 'alarma_rt', 'alarma_ne', 'alarma_tea',
          'kpi_pdi', 'kpi_prod_equiv', 'kpi_resolucion', 'kpi_reitero',
          'observacion_lider'
        ];
        
        const logs: any[] = [];
        fieldsToLog.forEach(field => {
          const oldValue = current[field];
          const newValue = payload[field];
          // Simple comparison, handles null/undefined as well
          if (String(oldValue) !== String(newValue) && newValue !== undefined) {
            logs.push({
              tecnico_id: session.id,
              accion: 'edit',
              campo: field,
              valor_anterior: oldValue !== null ? String(oldValue) : '',
              valor_nuevo: String(newValue)
            });
          }
        });

        if (logs.length > 0) {
          const saved = localStorage.getItem('bp_session');
          if (saved) {
            const userSession = JSON.parse(saved);
            const enrichedLogs = logs.map(l => ({
              ...l,
              usuario: userSession.usuario,
              fecha: new Date().toISOString()
            }));
            supabase.from('seguimiento_bp_log').insert(enrichedLogs).then(({error: logErr}) => {
              if (logErr) console.error('Error batch logging:', logErr);
            });
          }
        }
      }
      await fetchData(); // Refresh entire state
    }
  };

  const handleConfirmCheck = async () => {
    if (!session || !activeWeek) return;
    const confirm = window.confirm("¿Estás seguro?");
    if (!confirm) return;
    const { start, end } = getWeekRange(new Date(activeWeek.dateRange));
    const startStr = start.toISOString().split('T')[0];

    const { data: current } = await supabase
      .from('seguimiento_bp')
      .select('*')
      .eq('tecnico_id', session.id)
      .eq('fecha_inicio', startStr)
      .maybeSingle();

    const { error } = await supabase.from('seguimiento_bp').upsert({
      tecnico_id: session.id,
      fecha_inicio: startStr,
      fecha_fin: end.toISOString().split('T')[0],
      observacion_lider: observationText,
      confirmado: true,
      fecha_confirmacion: new Date().toISOString()
    }, { onConflict: 'tecnico_id, fecha_inicio' });

    if (error) alert('Error: ' + error.message);
    else { 
      // Log Confirm action
      logActivity({
        tecnico_id: session.id,
        accion: 'edit',
        campo: 'confirmado',
        valor_anterior: current?.confirmado ? 'true' : 'false',
        valor_nuevo: 'true'
      });
      
      if (current?.observacion_lider !== observationText) {
        logActivity({
          tecnico_id: session.id,
          accion: 'edit',
          campo: 'observacion_lider',
          valor_anterior: current?.observacion_lider || '',
          valor_nuevo: observationText
        });
      }

      alert('Guardado!'); 
      fetchData(); 
    }
  };

  const handleInlineEditStart = (row: WeeklyKPI) => {
    setEditingRowId(row.id);
    setTempRowData({
      pdi: row.pdi,
      prod_equivalente: row.prod_equivalente,
      resolucion: row.resolucion,
      reitero: row.reitero,
      pt: row.alarms?.pt || 0,
      ft: row.alarms?.ft || 0,
      ta: row.alarms?.ta || 0,
      ma: row.alarms?.ma || 0,
      te: row.alarms?.te || 0,
      rt: row.alarms?.rt || 0,
      ne: row.alarms?.ne || 0,
      tea: row.alarms?.tea || 0
    });
  };

  const handleInlineSave = async (dateRange: string, isMonthly: boolean = false) => {
    if (!session || !tempRowData) return;
    
    const alarmsPayload: BPAlarmData = {
      pt: tempRowData.pt, ft: tempRowData.ft, ta: tempRowData.ta, ma: tempRowData.ma,
      te: tempRowData.te, rt: tempRowData.rt, ne: tempRowData.ne, tea: tempRowData.tea
    };
    const kpiPayload = {
      pdi: tempRowData.pdi,
      prod_equivalente: tempRowData.prod_equivalente,
      resolucion: tempRowData.resolucion,
      reitero: tempRowData.reitero
    };

    await handleSaveAlarms(alarmsPayload, dateRange, kpiPayload, isMonthly);
    setEditingRowId(null);
    setTempRowData(null);
  };

  const handleAddAntecedente = async () => {
    if (!antForm.titulo || !antForm.descripcion) return alert('Campos obligatorios');
    const { error } = await supabase.from('antecedentes_bp').insert({
      tecnico_id: session?.id,
      titulo: antForm.titulo,
      fecha: antForm.fecha,
      descripcion: antForm.descripcion
    });
    if (error) alert('Error: ' + error.message);
    else { 
      // Log creation of antecedent
      logActivity({
        tecnico_id: session?.id,
        accion: 'create',
        campo: 'antecedente',
        valor_nuevo: antForm.titulo
      });

      setShowAntecedenteModal(false); 
      setAntForm({ titulo: '', fecha: new Date().toISOString().split('T')[0], descripcion: '' }); 
      fetchData(); 
    }
  };

  const openSnapshot = async (dateRange: string) => {
    let week = session?.history.find((w: any) => w.dateRange === dateRange);
    if (!week && session) week = await fetchWeekData(session.id, new Date(dateRange));
    if (week) setSelectedSnapshot(week);
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Activity size={48} className="animate-spin" color="#019df4" />
        <p style={{ marginTop: '16px', fontWeight: '950', color: '#1F2937' }}>Cargando expediente...</p>
      </div>
    </div>
  );

  if (!dni) {
    if (!user) return null;
    return <BPDirectory user={user} onLogout={handleLogout} />;
  }

  if (accessDenied) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2' }}>
      <div style={{ textAlign: 'center', padding: '48px', backgroundColor: 'white', borderRadius: '32px', boxShadow: '0 20px 50px rgba(239, 68, 68, 0.1)', border: '1px solid #FECACA', maxWidth: '400px' }}>
        <div style={{ width: '64px', height: '64px', backgroundColor: '#EF4444', color: 'white', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <AlertTriangle size={32} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '1000', color: '#111827', marginBottom: '12px' }}>Acceso Denegado</h2>
        <p style={{ color: '#6B7280', fontSize: '15px', fontWeight: '800', lineHeight: '1.6' }}>No tenés permisos para visualizar técnicos fuera de tu célula ({user?.celula}).</p>
        <button onClick={() => window.location.href = '/seguimiento-bp'} style={{ marginTop: '32px', width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: '#1C1F23', color: 'white', border: 'none', fontWeight: '950', cursor: 'pointer' }}>Volver al Directorio</button>
      </div>
    </div>
  );

  if (!session) return <div>No se encontró información.</div>;

  const prevWeekRow = session.history[1] || session.history[0];

  return (
    <div style={{ backgroundColor: '#E2E8F0', minHeight: '100vh', padding: '24px 24px 120px 24px', width: '100%', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow-x: hidden; width: 100%; }
        html { width: 100%; overflow-x: hidden; }
      `}</style>
      
      <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%' }}>

      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '13px', fontWeight: '800' }}>
            <span>Panel</span><ChevronRight size={14} />
            <span style={{ color: '#019df4', fontWeight: '950' }}>BP Detalle</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 16px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: user?.rol === 'FULL' ? '#1C1F23' : '#019df4', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: '1000', color: '#1C1F23' }}>{user?.usuario}</span>
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>{user?.rol}</span>
              </div>
              <button 
                onClick={handleLogout}
                title="Cerrar Sesión"
                style={{ marginLeft: '12px', padding: '6px', backgroundColor: '#FEF2F2', border: 'none', borderRadius: '8px', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <LogOut size={16} />
              </button>
            </div>
            <a href="/seguimiento-bp" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: '#4F46E5', 
              textDecoration: 'none', 
              fontSize: '13px', 
              fontWeight: '1000', 
              padding: '10px 20px', 
              borderRadius: '16px', 
              backgroundColor: '#EEF2FF', 
              border: '2px solid #4F46E5', 
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.1)'
            }}>
              <ArrowLeft size={16} strokeWidth={3} /> Volver al listado
            </a>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={30} />
            </div>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#1F2937', letterSpacing: '-1.5px', margin: 0 }}>{session.techName}</h1>
              <p style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#111827', fontWeight: '950' }}>DNI: {session.dni}</span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span>Distrito: <strong style={{ color: '#111827', fontWeight: '950' }}>{session.district}</strong></span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span>Célula: <strong style={{ color: '#111827', fontWeight: '950' }}>{session.cell}</strong></span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span>Función: <strong style={{ color: '#019df4', fontWeight: '1000' }}>{session.role}</strong></span>
              </p>
            </div>
          </div>
          <ViewToggle 
            options={[
              { value: 'data', label: 'SEGUIMIENTO', icon: Activity }, 
              { value: 'actions', label: 'HISTORIAL', icon: History },
              ...(user?.usuario?.trim().toUpperCase() === 'ADORNO' ? [{ value: 'logs', label: 'AUDITORÍA', icon: ShieldCheck }] : [])
            ]} 
            active={activeTab} 
            onChange={setActiveTab} 
          />
        </div>
      </header>

      {activeTab === 'data' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

          <section>
            <SectionHeader title="KPIs ACTUALES" icon={Zap} />
            <div style={{ display: 'flex', gap: '20px' }}>
              <StatCard title="PDI %" value={activeWeek?.pdi || 0} previousValue={prevWeekRow?.pdi || 0} kpiKey="pdi" />
              <StatCard title="Prod. equivalente" value={activeWeek?.prod_equivalente || 0} previousValue={prevWeekRow?.prod_equivalente || 0} kpiKey="prod_equivalente" />
              <StatCard title="Resolución %" value={activeWeek?.resolucion || 0} previousValue={prevWeekRow?.resolucion || 0} kpiKey="resolucion" />
              <StatCard title="Reiteros %" value={activeWeek?.reitero || 0} previousValue={prevWeekRow?.reitero || 0} kpiKey="reitero" />
            </div>
          </section>

          <section>
            <SectionHeader title="TABLA DE GESTIÓN OPERATIVA" icon={List}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div className="glossary-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'help' }}>
                    <Info size={20} color="#019df4" />
                    <div className="glossary-popup" style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '12px',
                      width: '280px',
                      backgroundColor: '#1C1F23',
                      color: 'white',
                      padding: '20px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '800',
                      zIndex: 100,
                      display: 'none',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                      lineHeight: '1.6',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ color: '#019df4', marginBottom: '10px', fontWeight: '1000', fontSize: '13px', letterSpacing: '0.5px' }}>GLOSARIO DE INDICADORES</div>
                      {Object.entries(GLOSSARY).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: '6px', display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          <span style={{ color: '#019df4', minWidth: '40px', fontWeight: '1000' }}>{k}:</span>
                          <span style={{ color: '#E5E7EB' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ViewToggle options={[{ value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensual' }]} active={kpiScale} onChange={setKpiScale} />
                  {/* Chart analysis toggle removed per user request */}
                </div>
            </SectionHeader>
            <style>{`
              .glossary-container:hover .glossary-popup { display: block !important; }
            `}</style>

            <div style={{ backgroundColor: 'white', borderRadius: '24px', border: '1px solid #94A3B8', overflowX: 'auto', padding: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                  <thead style={{ backgroundColor: '#F8FAFC' }}>
                    <tr>
                      <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '12px', color: '#1C1F23', fontWeight: '700', borderRadius: '12px 0 0 12px', borderBottom: '1px solid #E5E7EB', width: '220px' }}>SEMANA</th>
                      {['PDI', 'PROD.', 'RESO.', 'REIT.'].map(h => (
                        <th key={h} title={GLOSSARY[h.replace('.', '') as keyof typeof GLOSSARY]} style={{ padding: '14px 6px', textAlign: 'center', fontSize: '12px', color: '#1C1F23', fontWeight: '700', borderBottom: '1px solid #E5E7EB', cursor: 'help', width: '110px' }}>
                           <span style={{ borderBottom: '1.5px dotted #CBD5E1' }}>{h}</span>
                        </th>
                      ))}
                      {['PT', 'FT', 'TA', 'MA', 'TE', 'RT', 'NE', 'TEA'].map(h => (
                        <th key={h} title={GLOSSARY[h as keyof typeof GLOSSARY]} style={{ padding: '14px 6px', textAlign: 'center', fontSize: '12px', color: '#1C1F23', fontWeight: '700', borderBottom: '1px solid #E5E7EB', cursor: 'help', width: '75px' }}>
                           <span style={{ borderBottom: '1.5px dotted #CBD5E1' }}>{h}</span>
                        </th>
                      ))}
                      <th style={{ padding: '14px 10px', textAlign: 'center', fontSize: '12px', color: '#1C1F23', fontWeight: '700', borderBottom: '1px solid #E5E7EB', width: '150px' }}>ULT. MODIFICACIÓN</th>
                      <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', color: '#1C1F23', fontWeight: '700', borderRadius: '0 12px 12px 0', borderBottom: '1px solid #E5E7EB', width: '180px' }}>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(kpiScale === 'weekly' ? session.history : monthlyHistory).map((row: any, idx: number) => {
                      const isEditing = editingRowId === row.id;
                      const label = row.weekLabel;
                      const kpiVals = [row.pdi, row.prod_equivalente, row.resolucion, row.reitero];
                      const alarms = row.alarms;
                      const alarmKeys = ['pt', 'ft', 'ta', 'ma', 'te', 'rt', 'ne', 'tea'];
                      const lastUpdate = row.updated_at || row.lastUpdated;
                      const isZebra = idx % 2 === 0;
                      
                      let dotColor = '#cbd5e1';
                      if (lastUpdate) {
                        const diffDays = Math.floor((new Date().getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays < 7) dotColor = '#10b981';
                        else if (diffDays < 14) dotColor = '#f59e0b';
                        else dotColor = '#ef4444';
                      }

                      const getStatusLabel = (val: number) => {
                        if (val === 1) return { text: 'OK', bg: '#bbf7d0', color: '#064e3b', border: '#86efac' };
                        if (val === 2) return { text: 'REG', bg: '#fef08a', color: '#78350f', border: '#fde047' };
                        if (val === 3) return { text: 'MAL', bg: '#fecaca', color: '#7f1d1d', border: '#fca5a5' };
                        return { text: '—', bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
                      };

                      return (
                        <tr key={row.id} style={{ backgroundColor: isEditing ? '#f0f9ff' : (isZebra ? '#F9FAFB' : 'transparent'), transition: 'background-color 0.2s' }}>
                          <td style={{ padding: '16px', borderLeft: '1px solid #f1f5f9', borderRadius: '12px 0 0 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ fontWeight: '1000', color: '#1C1F23', fontSize: '14px' }}>{label}</div>
                            </div>
                          </td>

                          {kpiVals.map((v: any, i: number) => {
                            const sem = getSemaforo(v || 0, ['pdi', 'prod_equivalente', 'resolucion', 'reitero'][i]);
                            return (
                              <td key={i} style={{ padding: '10px 4px', textAlign: 'center', width: '110px' }}>
                                {isEditing ? (
                                  <InlineInput 
                                    value={tempRowData[['pdi', 'prod_equivalente', 'resolucion', 'reitero'][i]]} 
                                    onChange={(val: number) => setTempRowData({...tempRowData, [['pdi', 'prod_equivalente', 'resolucion', 'reitero'][i]]: val})}
                                    step="0.1"
                                  />
                                ) : (
                                  <div style={{ 
                                    backgroundColor: sem.bg, 
                                    color: sem.color, 
                                    padding: '10px 4px', 
                                    borderRadius: '10px', 
                                    fontWeight: '1000', 
                                    fontSize: '14px',
                                    border: `1px solid ${sem.border}`
                                  }}>{i === 1 ? (v || 0).toFixed(2) : `${(v || 0).toFixed(1)}%`}</div>
                                )}
                              </td>
                            );
                          })}

                          {alarmKeys.map((k, i) => (
                            <td key={k} style={{ padding: '8px 4px', textAlign: 'center', width: '70px' }}>
                               {isEditing && row.isMonthly ? (
                                 <select
                                   value={tempRowData[k]}
                                   onChange={e => setTempRowData({...tempRowData, [k]: Number(e.target.value)})}
                                   style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #e2e8f0', fontSize: '14px', fontWeight: '900' }}
                                 >
                                   <option value="0">—</option>
                                   <option value="1">OK</option>
                                   <option value="2">REG</option>
                                   <option value="3">MAL</option>
                                 </select>
                               ) : isEditing && !row.isMonthly ? (
                                  <InlineInput 
                                    value={tempRowData[k]} 
                                    onChange={(val: number) => setTempRowData({...tempRowData, [k]: val})}
                                    step="1"
                                  />
                               ) : (
                                 row.isMonthly && !row.isAverage ? (
                                   <div style={{ 
                                     backgroundColor: getStatusLabel(alarms ? alarms[k] : 0).bg,
                                     color: getStatusLabel(alarms ? alarms[k] : 0).color,
                                     padding: '10px 4px', 
                                     borderRadius: '10px', 
                                     fontSize: '13px', 
                                     fontWeight: '1000',
                                     border: `1px solid ${getStatusLabel(alarms ? alarms[k] : 0).border}`
                                   }}>
                                     {getStatusLabel(alarms ? alarms[k] : 0).text}
                                   </div>
                                 ) : (
                                   <div style={{ fontWeight: '1000', fontSize: '14px', color: alarms ? '#1C1F23' : '#94a3b8' }}>{alarms ? (alarms as any)[k] : '0'}</div>
                                 )
                               )}
                            </td>
                          ))}

                          <td style={{ padding: '10px 8px', textAlign: 'center', width: '150px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dotColor }}></div>
                                 <span style={{ fontSize: '13px', fontWeight: '800', color: '#5B6470' }}>
                                   {lastUpdate ? new Date(lastUpdate).toLocaleDateString() : 'Pendiente'}
                                 </span>
                             </div>
                          </td>

                          <td style={{ padding: '10px 16px', textAlign: 'right', borderRight: '1px solid #f1f5f9', borderRadius: '0 12px 12px 0', width: '180px' }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => handleInlineSave(row.dateRange, row.isMonthly)}
                                  style={{ padding: '10px 16px', backgroundColor: '#059669', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '1000', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' }}
                                >
                                  <Save size={16} /> GUARDAR
                                </button>
                                <button
                                  onClick={() => { setEditingRowId(null); setTempRowData(null); }}
                                  style={{ padding: '10px 16px', backgroundColor: '#f3f4f6', color: '#dc2626', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '1000', fontSize: '12px' }}
                                >
                                  CANCELAR
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleInlineEditStart(row)} 
                                style={{ 
                                  backgroundColor: '#FFFFFF', 
                                  border: '2px solid #019df4', 
                                  color: '#019df4', 
                                  padding: '12px 20px', 
                                  borderRadius: '14px', 
                                  fontSize: '12px', 
                                  fontWeight: '1000', 
                                  cursor: 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px', 
                                  marginLeft: 'auto',
                                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                  boxShadow: '0 4px 10px rgba(1, 157, 244, 0.05)'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = '#019df4';
                                  e.currentTarget.style.color = '#FFFFFF';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                  e.currentTarget.style.boxShadow = '0 6px 15px rgba(1, 157, 244, 0.2)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                                  e.currentTarget.style.color = '#019df4';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(1, 157, 244, 0.05)';
                                }}
                              >
                                <FileEdit size={16} /> EDITAR {row.isMonthly ? 'MES' : 'FILA'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          </section>

          <section style={{ backgroundColor: 'white', padding: '40px', borderRadius: '32px', border: '2px solid #64748B', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
            <SectionHeader title={`CHECK SEMANAL - ${activeWeek?.dateRange || 'Pendiente'}`} icon={MessageSquare} />
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#334155', marginBottom: '12px' }}>Observaciones</label>
              <textarea rows={4} value={observationText} onChange={(e) => setObservationText(e.target.value)} style={{ width: '100%', padding: '20px', borderRadius: '16px', border: '2px solid #334155', backgroundColor: '#F8FAFC', outline: 'none', color: '#1E293B', fontSize: '15px', fontWeight: '500' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleConfirmCheck} style={{ backgroundColor: '#0ea5e9', color: 'white', padding: '16px 32px', borderRadius: '16px', fontWeight: '950', border: 'none', cursor: 'pointer' }}>Guardar Check</button>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'actions' && (
        <div style={{ width: '100%', position: 'relative' }}>
          {/* Timeline Sidebar Header */}
          <div style={{ marginBottom: '48px', backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div onClick={() => setIsAntExpanded(!isAntExpanded)} style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: '#f1f5f9', padding: '10px', borderRadius: '12px' }}>
                  <History size={20} color="#0f172a" />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '950', color: '#1F2937' }}>ANTECEDENTES</h3>
              </div>
              <div style={{ color: '#4B5563', transition: 'transform 0.3s', transform: isAntExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                <ChevronDown size={20} />
              </div>
            </div>
            {isAntExpanded && (
              <div style={{ padding: '0 32px 32px 32px', borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
                {session.antecedentes.map((ant: any) => (
                  <div key={ant.id} style={{ padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: '950', color: '#0f172a', marginBottom: '4px' }}>{ant.titulo}</div>
                      <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>{ant.descripcion}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: '24px' }}>{ant.fecha}</div>
                  </div>
                ))}
                <button onClick={() => setShowAntecedenteModal(true)} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2.5px dashed #cbd5e1', backgroundColor: 'transparent', color: '#64748b', fontWeight: '900', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>+ Agregar Nuevo Antecedente</button>
              </div>
            )}
          </div>

          <SectionHeader title="HISTORIAL DE SEGUIMIENTO" icon={ClipboardList}>
            <button
              onClick={() => setShowNewTrackingModal(true)}
              style={{ backgroundColor: '#019df4', color: 'white', padding: '12px 24px', borderRadius: '16px', fontWeight: '950', fontSize: '13px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(1, 157, 244, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> + Registrar Seguimiento
            </button>
          </SectionHeader>

          {/* Timeline Container */}
          <div style={{ position: 'relative', paddingLeft: '48px', marginTop: '40px' }}>
            {/* Vertical Line */}
            <div style={{ position: 'absolute', left: '16px', top: '10px', bottom: '10px', width: '3px', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />

            {session.actions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                <p style={{ color: '#64748b', fontWeight: '800' }}>Aún no hay registros de seguimiento para este técnico.</p>
              </div>
            ) : session.actions.map((a: any, idx: number) => {
              const isFirst = idx === 0;
              // Prepare for status color logic (using Resolucion as proxy for demonstration)
              const weekData = session.history.find((w: any) => w.dateRange === a.dateRange);
              const statusColor = weekData ? getSemaforo(weekData.resolucion, 'resolucion').color : '#019df4';

              return (
                <div key={a.id} style={{ position: 'relative', marginBottom: '48px' }}>
                  {/* Point on timeline */}
                  <div style={{
                    position: 'absolute',
                    left: '-40px',
                    top: '32px',
                    width: '18px',
                    height: '18px',
                    backgroundColor: isFirst ? '#019df4' : 'white',
                    border: `4px solid ${isFirst ? '#bfdbfe' : '#e2e8f0'}`,
                    borderRadius: '50%',
                    zIndex: 1,
                    boxShadow: isFirst ? '0 0 0 4px rgba(1, 157, 244, 0.1)' : 'none'
                  }} />

                  <div style={{
                    backgroundColor: isFirst ? '#f0f9ff' : 'white',
                    borderRadius: '28px',
                    padding: '32px',
                    border: `1px solid ${isFirst ? '#bae6fd' : '#e2e8f0'}`,
                    borderLeft: `6px solid ${isFirst ? '#019df4' : statusColor}`,
                    flex: 1,
                    boxShadow: isFirst ? '0 10px 30px rgba(1, 157, 244, 0.08)' : '0 4px 20px rgba(0,0,0,0.02)',
                    transition: 'transform 0.2s',
                    cursor: 'default'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isFirst ? '#e0f2fe' : '#f1f5f9', padding: '6px 14px', borderRadius: '10px', width: 'fit-content' }}>
                          <CalendarDays size={14} color={isFirst ? '#0369a1' : '#64748b'} />
                          <span style={{ fontSize: '11px', fontWeight: '950', color: isFirst ? '#0369a1' : '#475569', letterSpacing: '0.3px' }}>
                            {a.weekLabel}
                          </span>
                        </div>
                        <button
                          onClick={() => openSnapshot(a.dateRange)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#019df4',
                            border: '1.5px solid #e0f2fe',
                            backgroundColor: 'white',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '950',
                            cursor: 'pointer',
                            width: 'fit-content',
                            boxShadow: '0 2px 6px rgba(1, 157, 244, 0.05)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <BarChart size={14} /> Ver Snapshot Analítico
                        </button>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '950', color: '#1e293b' }}>
                          {a.date.split(' ')[0]} {/* Date */}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>
                          {a.date.split(' ').slice(1).join(' ')} {/* Time */}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      padding: '20px',
                      backgroundColor: isFirst ? 'rgba(255,255,255,0.5)' : '#f8fafc',
                      borderRadius: '18px',
                      border: `1px solid ${isFirst ? '#bae6fd' : '#f1f5f9'}`
                    }}>
                      <p style={{ margin: 0, fontSize: '15px', color: '#334155', lineHeight: '1.6', fontWeight: '500' }}>
                        {a.observation}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedSnapshot && <SnapshotBottomSheet week={selectedSnapshot} onClose={() => setSelectedSnapshot(null)} />}
      {showAntecedenteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 10006, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '32px', padding: '40px', width: '450px' }}>
            <h2 style={{ marginBottom: '24px' }}>Agregar Antecedente</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" placeholder="Título (ej: Cambio de Zona)" value={antForm.titulo} onChange={e => setAntForm({ ...antForm, titulo: e.target.value })} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
              <input type="date" value={antForm.fecha} onChange={e => setAntForm({ ...antForm, fecha: e.target.value })} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }} />
              <textarea placeholder="Descripción detallada..." value={antForm.descripcion} onChange={e => setAntForm({ ...antForm, descripcion: e.target.value })} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }} rows={4} />
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
              <button onClick={() => setShowAntecedenteModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white' }}>Cancelar</button>
              <button onClick={handleAddAntecedente} style={{ flex: 1, padding: '16px', backgroundColor: '#019df4', color: 'white', borderRadius: '16px', border: 'none' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showNewTrackingModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', zIndex: 10007, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ 
            backgroundColor: 'white', 
            borderTopLeftRadius: '40px', 
            borderTopRightRadius: '40px', 
            width: '100%', 
            maxWidth: '800px', 
            padding: '40px 48px', 
            boxShadow: '0 -10px 40px rgba(0,0,0,0.1)', 
            animation: 'slideUp 0.3s ease-out',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
              <div>
                <h3 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1px' }}>Registrar Nuevo Seguimiento</h3>
                <p style={{ color: '#64748b', fontWeight: '800', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarDays size={16} /> 
                  Confirmación de desempeño para el periodo seleccionado
                </p>
              </div>
              <button 
                onClick={() => setShowNewTrackingModal(false)} 
                style={{ backgroundColor: '#f1f5f9', border: 'none', padding: '12px', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '950', color: '#64748b', textTransform: 'uppercase' }}>Fecha del Seguimiento</label>
                  <input 
                    type="date" 
                    value={trackingDate} 
                    onChange={(e) => setTrackingDate(e.target.value)} 
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #f1f5f9', outline: 'none', fontWeight: '900', color: '#0f172a', boxSizing: 'border-box' }}
                  />
               </div>
               <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: '950', color: '#94a3b8', textTransform: 'uppercase' }}>Periodo Identificado</span>
                  <div style={{ fontSize: '15px', fontWeight: '950', color: '#019df4', marginTop: '4px' }}>
                    {(() => {
                      const d = new Date(trackingDate + 'T12:00:00');
                      const { start, end } = getWeekRange(d);
                      return formatDateRange(start, end);
                    })()}
                  </div>
               </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
               <SubsectionHeader title="Obs. del Líder / Feedback Técnico" icon={MessageSquare} />
               <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                 <textarea 
                   rows={5} 
                   value={observationText} 
                   onChange={(e) => setObservationText(e.target.value)} 
                   placeholder="Escribe aquí el resumen del feedback o hito del técnico..."
                   style={{ 
                     width: '100%', 
                     padding: '24px', 
                     borderRadius: '24px', 
                     border: '2px solid #e0f2fe', 
                     outline: 'none', 
                     fontSize: '15px', 
                     lineHeight: '1.6', 
                     color: '#1e293b',
                     boxSizing: 'border-box',
                     display: 'block',
                     fontFamily: 'inherit'
                   }} 
                 />
               </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
               <button 
                 onClick={() => setShowNewTrackingModal(false)} 
                 style={{ flex: 1, padding: '20px', borderRadius: '24px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', fontWeight: '950', cursor: 'pointer', transition: 'all 0.2s' }}
               >
                 Cancelar
               </button>
               <button 
                 onClick={async () => {
                   const targetDate = new Date(trackingDate + 'T12:00:00');
                   const { start } = getWeekRange(targetDate);
                   const startStr = start.toISOString().split('T')[0];
                   
                   const { error } = await supabase.from('seguimiento_bp').upsert({
                     tecnico_id: session.id,
                     fecha_inicio: startStr,
                     fecha_fin: new Date(new Date(start).setDate(start.getDate() + 6)).toISOString().split('T')[0],
                     observacion_lider: observationText,
                     fecha_confirmacion: new Date().toISOString(),
                     es_mensual: false 
                   }, { onConflict: 'tecnico_id, fecha_inicio, es_mensual' });

                   if (error) alert('Error al guardar: ' + error.message);
                   else {
                     setShowNewTrackingModal(false);
                     fetchData();
                   }
                 }} 
                 style={{ 
                   flex: 2, 
                   padding: '20px', 
                   borderRadius: '24px', 
                   backgroundColor: '#019df4', 
                   color: 'white', 
                   border: 'none', 
                   fontWeight: '950', 
                   cursor: 'pointer', 
                   boxShadow: '0 8px 25px rgba(1, 157, 244, 0.3)',
                   transition: 'all 0.2s'
                 }}
               >
                 Publicar Seguimiento
               </button>
            </div>
          </div>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {activeTab === 'logs' && user?.usuario?.trim().toUpperCase() === 'ADORNO' && (
        <div style={{ width: '100%' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '40px', marginBottom: '48px' }}>
            <SectionHeader title="AUDITORÍA DE CAMBIOS (ACCESO EXCLUSIVO)" icon={ShieldCheck} />
            <div style={{ marginTop: '32px' }}>
              {auditLogs.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
                  <p style={{ color: '#64748b', fontWeight: '800', fontSize: '15px' }}>No hay registros de auditoría para este técnico.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {auditLogs.map((log) => (
                    <div key={log.id} style={{ 
                      padding: '24px', 
                      borderRadius: '24px', 
                      border: '1px solid #f1f5f9', 
                      backgroundColor: '#f8fafc', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontWeight: '950', color: '#019df4', fontSize: '15px' }}>{log.usuario}</span>
                          <span style={{ 
                            fontSize: '10px', 
                            backgroundColor: log.accion === 'edit' ? '#fef3c7' : (log.accion === 'view' ? '#e0f2fe' : '#dcfce7'),
                            color: log.accion === 'edit' ? '#92400e' : (log.accion === 'view' ? '#0369a1' : '#166534'),
                            padding: '4px 12px',
                            borderRadius: '99px',
                            fontWeight: '950',
                            letterSpacing: '0.5px'
                          }}>{log.accion.toUpperCase()}</span>
                          {log.campo && <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '800' }}>• {log.campo}</span>}
                        </div>
                        {(log.valor_anterior || log.valor_nuevo) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', marginTop: '8px' }}>
                            {log.valor_anterior && (
                              <div style={{ fontSize: '13px', color: '#64748b' }}>
                                <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>ANTERIOR</span>
                                <span style={{ fontWeight: '800', color: '#ef4444' }}>{log.valor_anterior}</span>
                              </div>
                            )}
                            {log.valor_anterior && log.valor_nuevo && <ChevronRight size={16} color="#cbd5e1" />}
                            {log.valor_nuevo && (
                              <div style={{ fontSize: '13px', color: '#64748b' }}>
                                <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>NUEVO</span>
                                <span style={{ fontWeight: '800', color: '#10b981' }}>{log.valor_nuevo}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '120px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '950', color: '#1e293b' }}>
                          {new Date(log.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#94a3b8', marginTop: '4px' }}>
                          {new Date(log.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export function BPTrackingPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <BPTrackingContent />
    </Suspense>
  );
}

export default BPTrackingPage;
