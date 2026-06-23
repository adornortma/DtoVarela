'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, 
  User, 
  BarChart3, 
  Table as TableIcon,
  Calendar,
  ChevronDown,
  Activity,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Info
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
  AreaChart,
  Area
} from 'recharts';

// --- Types ---
interface Technician {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
}

interface MetricasDiarias {
  fecha: string;
  resolucion: number | null;
  reitero: number | null;
  productividad: number | null;
  inicio: number | null;
  ok1: number | null;
  completadas: number | null;
  no_encontrados: number | null;
  deriva_bajadas: number | null;
  cierres: number | null;
}

interface MonthlyMetric {
  mes: string;
  resolucion: number;
  productividad: number;
  reiteros: number;
  no_encontrados: number;
  cierres: number;
  inicio: number;
  ok1: number;
  completadas: number;
  deriva_bajadas: number;
  nps: number;
  promotores: number;
  neutros: number;
  detractores: number;
  posicion: number;
}

const MONTH_NAMES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
  '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

export default function TechnicianHistoryPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = React.use(paramsPromise);
  const dniParam = params.id;

  const [loading, setLoading] = useState(true);
  const [tech, setTech] = useState<Technician | null>(null);
  const [currentCell, setCurrentCell] = useState<string>('');
  const [isVarela, setIsVarela] = useState<boolean>(false);
  const [varelaDistrictId, setVarelaDistrictId] = useState<string | null>(null);

  // Selector de Período State
  const [periodOption, setPeriodOption] = useState<'1m' | '3m' | '6m' | '1y' | 'custom'>('6m');
  const [dateFrom, setDateFrom] = useState<string>('2026-01-01');
  const [dateTo, setDateTo] = useState<string>('2026-06-30');

  // Database Data
  const [dailyMetrics, setDailyMetrics] = useState<MetricasDiarias[]>([]);
  const [priorMetrics, setPriorMetrics] = useState<MetricasDiarias[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [priorSurveys, setPriorSurveys] = useState<any[]>([]);
  const [allMonthlyRanks, setAllMonthlyRanks] = useState<{ [mes: string]: { [techId: string]: number } }>({});

  // View States
  const [viewModeSec2, setViewModeSec2] = useState<'chart' | 'table'>('chart');
  const [viewModeSec3, setViewModeSec3] = useState<'chart' | 'table'>('chart');
  const [activeSeries, setActiveSeries] = useState({
    resolucion: true,
    productividad: true,
    reiteros: false,
    no_encontrados: false
  });
  
  // NPS selected category detail filter
  const [npsFilter, setNpsFilter] = useState<'P' | 'N' | 'D' | null>(null);

  // 1. Initial configuration and validation
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // Find Varela district ID
        const { data: districtRec } = await supabase
          .from('distritos')
          .select('id')
          .eq('slug', 'varela')
          .maybeSingle();
        
        if (!districtRec) {
          setIsVarela(false);
          setLoading(false);
          return;
        }
        setVarelaDistrictId(districtRec.id);

        // Find technician by DNI
        const { data: techRec } = await supabase
          .from('tecnicos')
          .select('*')
          .eq('dni', dniParam)
          .maybeSingle();

        if (!techRec) {
          setIsVarela(false);
          setLoading(false);
          return;
        }

        // Check if tech belongs to Varela by looking up their cell or if they have any Varela metrics
        const { data: hasVarelaMetrics } = await supabase
          .from('metricas_mensuales')
          .select('celula')
          .eq('tecnico_id', techRec.id)
          .eq('distrito_id', districtRec.id)
          .limit(1);

        const { data: dailyCheck } = await supabase
          .from('metricas')
          .select('celula')
          .eq('tecnico_id', techRec.id)
          .eq('distrito_id', districtRec.id)
          .limit(1);

        if ((hasVarelaMetrics && hasVarelaMetrics.length > 0) || (dailyCheck && dailyCheck.length > 0)) {
          setIsVarela(true);
          setTech(techRec);
          const cellName = hasVarelaMetrics?.[0]?.celula || dailyCheck?.[0]?.celula || 'Varela';
          setCurrentCell(cellName);
          
          // Fetch historical positions (ranking) for all Varela technicians
          const { data: rankRecs } = await supabase
            .from('metricas_mensuales')
            .select('mes, tecnico_id, resolucion, productividad, reiteros')
            .eq('distrito_id', districtRec.id);
          
          if (rankRecs) {
            // Group by month and compute rank position based on Resolution
            const groupedByMonth: { [mes: string]: { techId: string, resolucion: number }[] } = {};
            rankRecs.forEach(r => {
              if (!groupedByMonth[r.mes]) groupedByMonth[r.mes] = [];
              groupedByMonth[r.mes].push({ techId: r.tecnico_id, resolucion: Number(r.resolucion) || 0 });
            });

            const rankMap: { [mes: string]: { [techId: string]: number } } = {};
            Object.entries(groupedByMonth).forEach(([mes, list]) => {
              // Sort descending by resolution to determine rank
              const sorted = [...list].sort((a, b) => b.resolucion - a.resolucion);
              rankMap[mes] = {};
              sorted.forEach((item, index) => {
                rankMap[mes][item.techId] = index + 1;
              });
            });
            setAllMonthlyRanks(rankMap);
          }
        } else {
          setIsVarela(false);
        }
      } catch (err) {
        console.error("Error initiating technician history dashboard:", err);
        setIsVarela(false);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [dniParam]);

  // Adjust dates when period option changes
  useEffect(() => {
    if (periodOption === 'custom') return;

    const today = new Date('2026-06-23'); // Fixed current local context date
    let start = new Date(today);
    
    if (periodOption === '1m') {
      start.setMonth(today.getMonth() - 1);
    } else if (periodOption === '3m') {
      start.setMonth(today.getMonth() - 3);
    } else if (periodOption === '6m') {
      start.setMonth(today.getMonth() - 6);
    } else if (periodOption === '1y') {
      start.setFullYear(today.getFullYear() - 1);
    }

    // Adjust boundaries to align with month limits for clean monthly breakdown
    const yFrom = start.getFullYear();
    const mFrom = String(start.getMonth() + 1).padStart(2, '0');
    const dFrom = '01'; // Align start to beginning of month

    const yTo = today.getFullYear();
    const mTo = String(today.getMonth() + 1).padStart(2, '0');
    const dTo = '30'; // Align end to month boundary (June 30 2026 in our database scope)

    setDateFrom(`${yFrom}-${mFrom}-${dFrom}`);
    setDateTo(`${yTo}-${mTo}-${dTo}`);
  }, [periodOption]);

  // 2. Fetch data based on selected range
  useEffect(() => {
    if (!tech || !varelaDistrictId) return;

    const loadRangeData = async () => {
      try {
        // Query daily metrics
        const { data: currentDaily } = await supabase
          .from('metricas')
          .select('*')
          .eq('tecnico_id', tech.id)
          .gte('fecha', dateFrom)
          .lte('fecha', dateTo)
          .order('fecha', { ascending: true });

        setDailyMetrics(currentDaily || []);

        // Compute prior equivalent period
        const dateStartObj = new Date(dateFrom);
        const dateEndObj = new Date(dateTo);
        const diffTime = Math.abs(dateEndObj.getTime() - dateStartObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const priorStartObj = new Date(dateStartObj);
        priorStartObj.setDate(priorStartObj.getDate() - diffDays);
        const priorEndObj = new Date(dateStartObj);
        priorEndObj.setDate(priorEndObj.getDate() - 1);

        const priorStartStr = priorStartObj.toISOString().split('T')[0];
        const priorEndStr = priorEndObj.toISOString().split('T')[0];

        const { data: priorDaily } = await supabase
          .from('metricas')
          .select('*')
          .eq('tecnico_id', tech.id)
          .gte('fecha', priorStartStr)
          .lte('fecha', priorEndStr);

        setPriorMetrics(priorDaily || []);

        // Query NPS surveys
        const { data: currentSurveys } = await supabase
          .from('nps_detalles')
          .select('*')
          .eq('dni_tecnico', tech.dni)
          .gte('fecha', dateFrom)
          .lte('fecha', dateTo);

        setSurveys(currentSurveys || []);

        const { data: oldSurveys } = await supabase
          .from('nps_detalles')
          .select('*')
          .eq('dni_tecnico', tech.dni)
          .gte('fecha', priorStartStr)
          .lte('fecha', priorEndStr);

        setPriorSurveys(oldSurveys || []);
      } catch (err) {
        console.error("Error loading period data:", err);
      }
    };

    loadRangeData();
  }, [tech, varelaDistrictId, dateFrom, dateTo]);

  // 3. Consolidated calculations
  const summaryKpis = useMemo(() => {
    // Current calculations
    const validRes = dailyMetrics.filter(m => m.resolucion !== null).map(m => Number(m.resolucion));
    const validProd = dailyMetrics.filter(m => m.productividad !== null).map(m => Number(m.productividad));
    const validReit = dailyMetrics.filter(m => m.reitero !== null).map(m => Number(m.reitero));
    const validNoEnc = dailyMetrics.filter(m => m.no_encontrados !== null).map(m => Number(m.no_encontrados));

    const curRes = validRes.length > 0 ? validRes.reduce((a, b) => a + b, 0) / validRes.length : null;
    const curProd = validProd.length > 0 ? validProd.reduce((a, b) => a + b, 0) / validProd.length : null;
    const curReit = validReit.length > 0 ? validReit.reduce((a, b) => a + b, 0) / validReit.length : null;
    const curNoEnc = validNoEnc.length > 0 ? validNoEnc.reduce((a, b) => a + b, 0) / validNoEnc.length : null;

    // NPS
    const npsTotal = surveys.length;
    const npsPromoters = surveys.filter(s => s.promotor === 1).length;
    const npsDetractors = surveys.filter(s => s.detractor === 1).length;
    const curNps = npsTotal > 0 ? Math.round(((npsPromoters - npsDetractors) / npsTotal) * 100) : null;

    // Prior calculations
    const pValidRes = priorMetrics.filter(m => m.resolucion !== null).map(m => Number(m.resolucion));
    const pValidProd = priorMetrics.filter(m => m.productividad !== null).map(m => Number(m.productividad));
    const pValidReit = priorMetrics.filter(m => m.reitero !== null).map(m => Number(m.reitero));
    const pValidNoEnc = priorMetrics.filter(m => m.no_encontrados !== null).map(m => Number(m.no_encontrados));

    const pRes = pValidRes.length > 0 ? pValidRes.reduce((a, b) => a + b, 0) / pValidRes.length : null;
    const pProd = pValidProd.length > 0 ? pValidProd.reduce((a, b) => a + b, 0) / pValidProd.length : null;
    const pReit = pValidReit.length > 0 ? pValidReit.reduce((a, b) => a + b, 0) / pValidReit.length : null;
    const pNoEnc = pValidNoEnc.length > 0 ? pValidNoEnc.reduce((a, b) => a + b, 0) / pValidNoEnc.length : null;

    // Prior NPS
    const pNpsTotal = priorSurveys.length;
    const pNpsPromoters = priorSurveys.filter(s => s.promotor === 1).length;
    const pNpsDetractors = priorSurveys.filter(s => s.detractor === 1).length;
    const pNps = pNpsTotal > 0 ? Math.round(((pNpsPromoters - pNpsDetractors) / pNpsTotal) * 100) : null;

    // Variations
    const varRes = curRes !== null && pRes !== null ? curRes - pRes : null;
    const varProd = curProd !== null && pProd !== null ? curProd - pProd : null;
    const varReit = curReit !== null && pReit !== null ? curReit - pReit : null;
    const varNoEnc = curNoEnc !== null && pNoEnc !== null ? curNoEnc - pNoEnc : null;
    const varNps = curNps !== null && pNps !== null ? curNps - pNps : null;

    return {
      resolucion: { val: curRes, diff: varRes },
      productividad: { val: curProd, diff: varProd },
      reiteros: { val: curReit, diff: varReit },
      noEncontrados: { val: curNoEnc, diff: varNoEnc },
      nps: { val: curNps, diff: varNps }
    };
  }, [dailyMetrics, priorMetrics, surveys, priorSurveys]);

  // Group daily data by month for dynamic monthly charts and tables
  const monthlyDataList = useMemo((): MonthlyMetric[] => {
    const map = new Map<string, {
      res: number[], prod: number[], reit: number[], noEnc: number[],
      inicio: number[], ok1: number[], comp: number[], divB: number[], cierres: number[],
      surveys: any[]
    }>();

    dailyMetrics.forEach(d => {
      const parts = d.fecha.split('-');
      const key = `${parts[1]}-${parts[0]}`; // MM-YYYY
      if (!map.has(key)) {
        map.set(key, {
          res: [], prod: [], reit: [], noEnc: [],
          inicio: [], ok1: [], comp: [], divB: [], cierres: [],
          surveys: []
        });
      }
      const entry = map.get(key)!;
      if (d.resolucion !== null) entry.res.push(Number(d.resolucion));
      if (d.productividad !== null) entry.prod.push(Number(d.productividad));
      if (d.reitero !== null) entry.reit.push(Number(d.reitero));
      if (d.no_encontrados !== null) entry.noEnc.push(Number(d.no_encontrados));

      if (d.inicio !== null) entry.inicio.push(Number(d.inicio));
      if (d.ok1 !== null) entry.ok1.push(Number(d.ok1));
      if (d.completadas !== null) entry.comp.push(Number(d.completadas));
      if (d.deriva_bajadas !== null) entry.divB.push(Number(d.deriva_bajadas));
      if (d.cierres !== null) entry.cierres.push(Number(d.cierres));
    });

    // Populate surveys to each month
    surveys.forEach(s => {
      const parts = s.fecha.split('-');
      const key = `${parts[1]}-${parts[0]}`; // MM-YYYY
      if (map.has(key)) {
        map.get(key)!.surveys.push(s);
      }
    });

    const list: MonthlyMetric[] = [];
    map.forEach((vals, key) => {
      const npsTotal = vals.surveys.length;
      const npsPromoters = vals.surveys.filter(s => s.promotor === 1).length;
      const npsDetractors = vals.surveys.filter(s => s.detractor === 1).length;
      const npsScore = npsTotal > 0 ? Math.round(((npsPromoters - npsDetractors) / npsTotal) * 100) : 0;

      // Extract month rank position
      const [m, y] = key.split('-');
      const monthName = MONTH_NAMES[m] || m;
      const fullMonthNameDB = `${monthName}`; // Like "Abril" or "Mayo" in MONTHS array of DB

      let rankingPos = 10; // Default fallback position if not found
      if (allMonthlyRanks[fullMonthNameDB] && tech && allMonthlyRanks[fullMonthNameDB][tech.id]) {
        rankingPos = allMonthlyRanks[fullMonthNameDB][tech.id];
      }

      list.push({
        mes: key,
        resolucion: vals.res.length > 0 ? Math.round(vals.res.reduce((a, b) => a + b, 0) / vals.res.length * 10) / 10 : 0,
        productividad: vals.prod.length > 0 ? Math.round(vals.prod.reduce((a, b) => a + b, 0) / vals.prod.length * 10) / 10 : 0,
        reiteros: vals.reit.length > 0 ? Math.round(vals.reit.reduce((a, b) => a + b, 0) / vals.reit.length * 10) / 10 : 0,
        no_encontrados: vals.noEnc.length > 0 ? Math.round(vals.noEnc.reduce((a, b) => a + b, 0) / vals.noEnc.length * 10) / 10 : 0,

        inicio: vals.inicio.length > 0 ? Math.round(vals.inicio.reduce((a, b) => a + b, 0) / vals.inicio.length * 10) / 10 : 0,
        ok1: vals.ok1.length > 0 ? Math.round(vals.ok1.reduce((a, b) => a + b, 0) / vals.ok1.length * 10) / 10 : 0,
        completadas: vals.comp.length > 0 ? Math.round(vals.comp.reduce((a, b) => a + b, 0) / vals.comp.length * 10) / 10 : 0,
        deriva_bajadas: vals.divB.length > 0 ? Math.round(vals.divB.reduce((a, b) => a + b, 0) / vals.divB.length * 10) / 10 : 0,
        cierres: vals.cierres.length > 0 ? Math.round(vals.cierres.reduce((a, b) => a + b, 0) / vals.cierres.length) : 0,

        nps: npsScore,
        promotores: npsPromoters,
        neutros: npsTotal - npsPromoters - npsDetractors,
        detractores: npsDetractors,
        posicion: rankingPos
      });
    });

    // Sort chronologically
    return list.sort((a, b) => {
      const [mA, yA] = a.mes.split('-').map(Number);
      const [mB, yB] = b.mes.split('-').map(Number);
      return yA !== yB ? yA - yB : mA - mB;
    });
  }, [dailyMetrics, surveys, allMonthlyRanks, tech]);

  // Section 3: TOA additional statistics
  const toaStats = useMemo(() => {
    if (monthlyDataList.length === 0) return { avgCierres: 0, maxCierres: 0, maxCierresLabel: 'N/A' };

    const closures = monthlyDataList.map(m => m.cierres);
    const avg = closures.reduce((a, b) => a + b, 0) / closures.length;

    let maxVal = 0;
    let maxLabel = 'N/A';
    monthlyDataList.forEach(m => {
      if (m.cierres > maxVal) {
        maxVal = m.cierres;
        const [monthNum, yearNum] = m.mes.split('-');
        maxLabel = `${MONTH_NAMES[monthNum] || monthNum} ${yearNum}`;
      }
    });

    return {
      avgCierres: Math.round(avg),
      maxCierres: maxVal,
      maxCierresLabel: maxLabel
    };
  }, [monthlyDataList]);

  // Section 4: NPS clicked segment details
  const filteredSurveyDetails = useMemo(() => {
    if (!npsFilter) return surveys;
    return surveys.filter(s => {
      if (npsFilter === 'P' && s.promotor === 1) return true;
      if (npsFilter === 'D' && s.detractor === 1) return true;
      if (npsFilter === 'N' && s.promotor !== 1 && s.detractor !== 1) return true;
      return false;
    });
  }, [surveys, npsFilter]);

  // Formatted date string for headers
  const dateRangeLabel = useMemo(() => {
    const formatDate = (str: string) => {
      if (!str) return '';
      const [y, m, d] = str.split('-');
      return `${d}/${m}/${y}`;
    };
    return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
  }, [dateFrom, dateTo]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center', color: '#64748b', fontWeight: '800' }}>
          Cargando Legajo Histórico...
        </div>
      </div>
    );
  }

  // Controlled access check
  if (!isVarela || !tech) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', border: '1px solid #cbd5e1', maxWidth: '450px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ fontSize: '18px', fontWeight: '950', color: '#0f172a', marginBottom: '10px' }}>Legajo No Disponible</h2>
          <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', lineHeight: '1.5', marginBottom: '24px' }}>
            El legajo no está disponible para este técnico. La consulta histórica se encuentra habilitada de forma exclusiva para técnicos del Distrito Varela.
          </p>
          <Link href="/ranking-tecnicos" style={{ textDecoration: 'none', backgroundColor: '#1e293b', color: 'white', padding: '12px 24px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={14} /> VOLVER AL RANKING
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '32px 48px', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* 1. Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <Link href="/ranking-tecnicos" style={{ display: 'flex', padding: '10px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#0f172a', transition: 'all 0.2s' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Consolidado Histórico Operativo</span>
          <h1 style={{ fontSize: '22px', fontWeight: '950', color: '#0f172a', margin: '2px 0 0 0', letterSpacing: '-0.5px' }}>
            Legajo Histórico del Técnico
          </h1>
        </div>
      </div>

      {/* 2. Encabezado de Técnico */}
      <div style={{ backgroundColor: 'white', padding: '24px 32px', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <User size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '950', margin: 0, color: '#0f172a' }}>
              {tech.apellido.toUpperCase()}, {tech.nombre.toUpperCase()}
            </h2>
            <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
              <span>DNI: <strong>{tech.dni}</strong></span>
              <span>Distrito: <strong>Varela</strong></span>
              <span>Célula: <strong>{currentCell}</strong></span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Período Seleccionado</span>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '8px' }}>
            📅 {dateRangeLabel}
          </span>
        </div>
      </div>

      {/* 3. Selector de Período */}
      <div style={{ backgroundColor: 'white', padding: '16px 24px', borderRadius: '16px', border: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '32px' }}>
        <span style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rango de Consulta:</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { val: '1m', label: 'Último Mes' },
            { val: '3m', label: 'Últimos 3 Meses' },
            { val: '6m', label: 'Últimos 6 Meses' },
            { val: '1y', label: 'Último Año' },
            { val: 'custom', label: 'Personalizado' }
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setPeriodOption(opt.val as any)}
              style={{
                padding: '8px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                border: periodOption === opt.val ? '1px solid #1e293b' : '1px solid #e2e8f0',
                backgroundColor: periodOption === opt.val ? '#1e293b' : 'white',
                color: periodOption === opt.val ? 'white' : '#64748b',
                transition: 'all 0.2s'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {periodOption === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700' }}
            />
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>a</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: '700' }}
            />
          </div>
        )}
      </div>

      {/* --- SECCIÓN 1: RESUMEN DEL PERÍODO --- */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', paddingLeft: '4px' }}>
          Resumen del Período
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          
          {/* Tarjeta Resolución */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
            <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Resolución</p>
            <h4 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', margin: '0 0 6px 0' }}>
              {summaryKpis.resolucion.val !== null ? `${summaryKpis.resolucion.val.toFixed(1)}%` : 'N/A'}
            </h4>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569' }}>
              {summaryKpis.resolucion.diff !== null ? `${summaryKpis.resolucion.diff >= 0 ? '+' : ''}${summaryKpis.resolucion.diff.toFixed(1)}% vs anterior` : 'Sin datos previos'}
            </span>
          </div>

          {/* Tarjeta Productividad */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
            <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Productividad</p>
            <h4 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', margin: '0 0 6px 0' }}>
              {summaryKpis.productividad.val !== null ? `${summaryKpis.productividad.val.toFixed(2)}` : 'N/A'}
            </h4>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569' }}>
              {summaryKpis.productividad.diff !== null ? `${summaryKpis.productividad.diff >= 0 ? '+' : ''}${summaryKpis.productividad.diff.toFixed(2)} vs anterior` : 'Sin datos previos'}
            </span>
          </div>

          {/* Tarjeta Reiteros */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
            <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>Reiteros</p>
            <h4 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', margin: '0 0 6px 0' }}>
              {summaryKpis.reiteros.val !== null ? `${summaryKpis.reiteros.val.toFixed(1)}%` : 'N/A'}
            </h4>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569' }}>
              {summaryKpis.reiteros.diff !== null ? `${summaryKpis.reiteros.diff >= 0 ? '+' : ''}${summaryKpis.reiteros.diff.toFixed(1)}% vs anterior` : 'Sin datos previos'}
            </span>
          </div>

          {/* Tarjeta No Encontrados */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
            <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>No Encontrados</p>
            <h4 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', margin: '0 0 6px 0' }}>
              {summaryKpis.noEncontrados.val !== null ? `${summaryKpis.noEncontrados.val.toFixed(1)}%` : 'N/A'}
            </h4>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569' }}>
              {summaryKpis.noEncontrados.diff !== null ? `${summaryKpis.noEncontrados.diff >= 0 ? '+' : ''}${summaryKpis.noEncontrados.diff.toFixed(1)}% vs anterior` : 'Sin datos previos'}
            </span>
          </div>

          {/* Tarjeta NPS */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
            <p style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', margin: '0 0 4px 0' }}>NPS</p>
            <h4 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', margin: '0 0 6px 0' }}>
              {summaryKpis.nps.val !== null ? `${summaryKpis.nps.val} pts` : 'N/A'}
            </h4>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569' }}>
              {summaryKpis.nps.diff !== null ? `${summaryKpis.nps.diff >= 0 ? '+' : ''}${summaryKpis.nps.diff} pts vs anterior` : 'Sin datos previos'}
            </span>
          </div>

        </div>
      </div>

      {/* --- SECCIÓN 2: RENDIMIENTO HISTÓRICO --- */}
      <div style={{ backgroundColor: 'white', padding: '24px 32px', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="#0f172a" />
            <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Rendimiento Histórico Mensual
            </h3>
          </div>
          
          {/* Toggle Views */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setViewModeSec2('chart')}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                backgroundColor: viewModeSec2 === 'chart' ? 'white' : 'transparent',
                color: viewModeSec2 === 'chart' ? '#0f172a' : '#64748b',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <BarChart3 size={12} /> Gráfico
            </button>
            <button
              onClick={() => setViewModeSec2('table')}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                backgroundColor: viewModeSec2 === 'table' ? 'white' : 'transparent',
                color: viewModeSec2 === 'table' ? '#0f172a' : '#64748b',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <TableIcon size={12} /> Tabla
            </button>
          </div>
        </div>

        {/* Series Filter Checkboxes */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px', backgroundColor: '#f8fafc', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          {[
            { key: 'resolucion', label: 'Resolución', color: '#3B82F6' },
            { key: 'productividad', label: 'Productividad', color: '#10B981' },
            { key: 'reiteros', label: 'Reiteros', color: '#F59E0B' },
            { key: 'no_encontrados', label: 'No Encontrados', color: '#EF4444' }
          ].map(s => (
            <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '800', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={(activeSeries as any)[s.key]}
                onChange={() => setActiveSeries(prev => ({ ...prev, [s.key]: !(prev as any)[s.key] }))}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color }} />
              {s.label}
            </label>
          ))}
        </div>

        {viewModeSec2 === 'chart' ? (
          <div style={{ height: '280px', width: '100%' }}>
            {monthlyDataList.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '12px', fontWeight: '700' }}>
                Sin datos suficientes para graficar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyDataList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', fontWeight: '700' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '800' }} />
                  {activeSeries.resolucion && <Line type="monotone" dataKey="resolucion" name="Resolución (%)" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />}
                  {activeSeries.productividad && <Line type="monotone" dataKey="productividad" name="Productividad" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />}
                  {activeSeries.reiteros && <Line type="monotone" dataKey="reiteros" name="Reiteros (%)" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />}
                  {activeSeries.no_encontrados && <Line type="monotone" dataKey="no_encontrados" name="No Encontrados (%)" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} />}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Mes</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Resolución</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Productividad</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Reiteros</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>No Encontrados</th>
                </tr>
              </thead>
              <tbody>
                {monthlyDataList.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '800' }}>{m.mes}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>{m.resolucion}%</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>{m.productividad}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>{m.reiteros}%</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>{m.no_encontrados}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- SECCIÓN 3: ACTIVIDAD TOA --- */}
      <div style={{ backgroundColor: 'white', padding: '24px 32px', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="#019df4" />
            <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Actividad TOA
            </h3>
          </div>

          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setViewModeSec3('chart')}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                backgroundColor: viewModeSec3 === 'chart' ? 'white' : 'transparent',
                color: viewModeSec3 === 'chart' ? '#0f172a' : '#64748b',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <BarChart3 size={12} /> Gráfico
            </button>
            <button
              onClick={() => setViewModeSec3('table')}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                backgroundColor: viewModeSec3 === 'table' ? 'white' : 'transparent',
                color: viewModeSec3 === 'table' ? '#0f172a' : '#64748b',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <TableIcon size={12} /> Tabla
            </button>
          </div>
        </div>

        {/* TOA Stats Summary Row */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '14px 20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Promedio Mensual Cierres</span>
            <span style={{ fontSize: '16px', fontWeight: '950', color: '#0f172a', display: 'block', marginTop: '2px' }}>{toaStats.avgCierres} cierres</span>
          </div>
          <div style={{ backgroundColor: '#f8fafc', padding: '14px 20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '9px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Máximo Mensual Registrado</span>
            <span style={{ fontSize: '16px', fontWeight: '950', color: '#0f172a', display: 'block', marginTop: '2px' }}>
              {toaStats.maxCierres} cierres <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>({toaStats.maxCierresLabel})</span>
            </span>
          </div>
        </div>

        {viewModeSec3 === 'chart' ? (
          <div style={{ height: '260px', width: '100%' }}>
            {monthlyDataList.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '12px', fontWeight: '700' }}>
                Sin datos suficientes para graficar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyDataList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', fontWeight: '700' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '800' }} />
                  <Bar dataKey="cierres" name="Cierres" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={25} />
                  <Line type="monotone" dataKey="completadas" name="Completadas" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="no_encontrados" name="No Encontradas" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Mes</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Inicio</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>1er OK</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Completadas</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>No Encontrados</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Deriva Bajadas</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Cierres</th>
                </tr>
              </thead>
              <tbody>
                {monthlyDataList.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '800' }}>{m.mes}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>{m.inicio}%</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>{m.ok1}%</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>{m.completadas}%</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>{m.no_encontrados}%</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>{m.deriva_bajadas}%</td>
                    <td style={{ padding: '12px 16px', fontWeight: '800' }}>{m.cierres}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- SECCIÓN 4: SATISFACCIÓN NPS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', alignItems: 'start', marginBottom: '32px' }}>
        
        {/* NPS Monthly History */}
        <div style={{ backgroundColor: 'white', padding: '24px 32px', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <MessageSquare size={16} color="#10B981" />
            <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              Evolución NPS del Técnico
            </h3>
          </div>

          <div style={{ height: '220px', width: '100%', marginBottom: '20px' }}>
            {monthlyDataList.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '12px', fontWeight: '700' }}>
                Sin datos suficientes para graficar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyDataList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis domain={[-100, 100]} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', fontWeight: '700' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: '800' }} />
                  <Bar dataKey="nps" name="NPS (pts)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={25} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* NPS Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Mes</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>NPS</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Promotores</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Neutros</th>
                  <th style={{ padding: '12px 16px', fontWeight: '900' }}>Detractores</th>
                </tr>
              </thead>
              <tbody>
                {monthlyDataList.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '800' }}>{m.mes}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '900', color: '#0f172a' }}>{m.nps} pts</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#10B981' }}>{m.promotores}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#f59e0b' }}>{m.neutros}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: '#ef4444' }}>{m.detractores}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed survey selector and details list */}
        <div style={{ backgroundColor: 'white', padding: '24px 32px', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>
            Filtro de Encuestas Detalladas
          </span>

          {/* Selector buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              onClick={() => setNpsFilter(npsFilter === 'P' ? null : 'P')}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                border: npsFilter === 'P' ? '2px solid #10B981' : '1px solid #cbd5e1',
                backgroundColor: npsFilter === 'P' ? '#ecfdf5' : 'white',
                color: '#10B981',
                textAlign: 'center', transition: 'all 0.2s'
              }}
            >
              Promotores ({surveys.filter(s => s.promotor === 1).length})
            </button>
            <button
              onClick={() => setNpsFilter(npsFilter === 'N' ? null : 'N')}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                border: npsFilter === 'N' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                backgroundColor: npsFilter === 'N' ? '#fff7ed' : 'white',
                color: '#f59e0b',
                textAlign: 'center', transition: 'all 0.2s'
              }}
            >
              Neutros ({surveys.filter(s => s.promotor !== 1 && s.detractor !== 1).length})
            </button>
            <button
              onClick={() => setNpsFilter(npsFilter === 'D' ? null : 'D')}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                border: npsFilter === 'D' ? '2px solid #ef4444' : '1px solid #cbd5e1',
                backgroundColor: npsFilter === 'D' ? '#fef2f2' : 'white',
                color: '#ef4444',
                textAlign: 'center', transition: 'all 0.2s'
              }}
            >
              Detractores ({surveys.filter(s => s.detractor === 1).length})
            </button>
          </div>

          {/* List display */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '310px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {surveys.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '12px', fontWeight: '700' }}>
                Sin encuestas para el período seleccionado
              </div>
            ) : filteredSurveyDetails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '12px', fontWeight: '700' }}>
                Sin registros para esta categoría en el período
              </div>
            ) : (
              filteredSurveyDetails.map((s, idx) => {
                const isProm = s.promotor === 1;
                const isDet = s.detractor === 1;
                const scoreColor = isProm ? '#10B981' : isDet ? '#ef4444' : '#f59e0b';
                const scoreBg = isProm ? '#ecfdf5' : isDet ? '#fef2f2' : '#fff7ed';

                return (
                  <div key={idx} style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8' }}>
                        ID: {s.access_id} • {new Date(s.fecha).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: '900', backgroundColor: scoreBg, color: scoreColor, padding: '2px 6px', borderRadius: '4px' }}>
                        Score: {s.recomendacion}
                      </span>
                    </div>
                    {s.obs_recomendacion ? (
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#334155', margin: 0, lineHeight: '1.4' }}>
                        "{s.obs_recomendacion}"
                      </p>
                    ) : (
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
                        Sin comentarios registrados
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* --- SECCIÓN 5: EVOLUCIÓN DE POSICIÓN (RANKING INVERTIDO) --- */}
      <div style={{ backgroundColor: 'white', padding: '24px 32px', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <TrendingUp size={16} color="#3B82F6" />
          <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            Evolución de Posición en el Ranking
          </h3>
        </div>

        <div style={{ height: '240px', width: '100%' }}>
          {monthlyDataList.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '12px', fontWeight: '700' }}>
              Sin datos suficientes para graficar
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyDataList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rankGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                {/* Invert the Y axis so Rank #1 is at the top */}
                <YAxis reversed domain={[1, 'dataMax + 2']} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', fontWeight: '700' }} />
                <Area type="monotone" dataKey="posicion" name="Posición en Ranking" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#rankGradient)" dot={{ r: 4, fill: '#3B82F6' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', backgroundColor: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <Info size={14} color="#64748b" />
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
            La escala vertical del gráfico de ranking está invertida: los valores inferiores representan un mejor desempeño relativo mensual en el Distrito Varela.
          </span>
        </div>
      </div>

    </div>
  );
}
