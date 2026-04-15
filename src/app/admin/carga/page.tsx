/**
 * Dashboard de Carga de Datos Admin
 * Actualizado con Sincronización de Técnicos y Smart Matching.
 */
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardCopy, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Info, 
  Table, 
  FileSpreadsheet, 
  UserCheck, 
  AlertTriangle, 
  Zap,
  Activity,
  ArrowRight
} from 'lucide-react';
import { normalizeName, parseTechnicianInput } from '@/lib/utils';

// --- Types ---
interface ProcessingSummary {
  total: number;
  processed: number;
  errors: string[];
  techniciansCreated: number;
  cellTotalsProcessed: number;
  kpisDetected: string[];
}

interface KpiMappingConfig {
  key: string;
  label: string;
  names: string[];
  type: 'percentage' | 'number';
}

const KPI_CONFIG: KpiMappingConfig[] = [
  { key: 'resolucion', label: 'Resolución', names: ['resolucion', 'resoluciones', 'res', 'res%', '% resolucion'], type: 'percentage' },
  { key: 'reitero', label: 'Reiteros', names: ['reitero', 'reiteros', 'rtr', 'ret', 'rtr%', '% reitero'], type: 'percentage' },
  { key: 'puntualidad', label: 'Puntualidad', names: ['puntualidad', 'punt', 'pnt', 'pnt%', '% puntualidad'], type: 'percentage' },
  { key: 'productividad', label: 'Productividad', names: ['productividad', 'prod', 'prd', 'prd%'], type: 'number' },
  { key: 'inicio', label: 'Inicio', names: ['inicio', 'ini', 'start', '% cump', '%cump', 'cump'], type: 'number' },
  { key: 'ok1', label: '1er OK', names: ['ok1', '1er ok', 'ok', 'ok1er', 'ok_1', 'calidad franqueo'], type: 'number' },
  { key: 'cierres', label: 'Cierres', names: ['cierre', 'cierres', 'cant cierres', 'can cierres', 'closing', 'q_franqueos', 'q_franqeo'], type: 'number' },
  { key: 'completadas', label: 'Completadas', names: ['completada', 'completadas', 'comp', 'comp%', 'compl', '% completadas', '%completadas'], type: 'number' },
  { key: 'no_encontrados', label: 'No Enc.', names: ['no encontrado', 'no encontrados', 'ne', 'n_e', '%no_encontrado', '%no_encontradas'], type: 'number' },
  { key: 'deriva_bajadas', label: 'Deriva Bajadas', names: ['deriva', 'bajadas', 'deriva bajadas', 'db', '% camb_bajada', '%camb_bajada'], type: 'number' },
];

export default function CargaAdminPage() {
  // 1. Hooks
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [pastedData, setPastedData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ProcessingSummary | null>(null);
  const [unidentified, setUnidentified] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearStatus, setClearStatus] = useState<string | null>(null);
  const [distritoKPIs, setDistritoKPIs] = useState({
    resolucion: '',
    reiteros: '',
    puntualidad: '',
    productividad: ''
  });
  const [distritoLoading, setDistritoLoading] = useState(false);
  const [distritoStatus, setDistritoStatus] = useState<string | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'resumen' | 'detalle'>('resumen');

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  // 2. Event Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === 'adornor' && pass === 'Bera4545') {
       setIsLoggedIn(true);
       setAuthError(false);
    } else {
       setAuthError(true);
    }
  };

  const parseNum = (val: string, type: 'percentage' | 'number'): number => {
    if (!val || val === "") return 0;
    const clean = val.replace('%', '').replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const findHeaderIdx = (headers: string[], names: string[]) => {
    return headers.findIndex(h => {
      const normalizedH = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      return names.some(name => normalizedH === name.toLowerCase());
    });
  };

  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleProcessActuaciones = async () => {
    if (!pastedData.trim()) return;
    setLoading(true);
    setSummary(null);
    const errors: string[] = [];
    let processedCount = 0;

    try {
      const initialRows = pastedData.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      const headerText = initialRows[0];
      // Robust separator detection
      let separator = '\t';
      if (headerText.includes('\t')) separator = '\t';
      else if (headerText.includes(';')) separator = ';';
      else if (headerText.includes('|')) separator = '|';
      else if (headerText.includes(',')) separator = ',';

      const headers = headerText.split(separator).map(c => c.trim().toUpperCase());

      const idxCelula = headers.findIndex(h => h.includes('CELULA'));
      const idxFecha = headers.findIndex(h => h.includes('FECHA') || h.includes('CITA'));
      const idxEstado = headers.findIndex(h => h.includes('ESTADO'));
      const idxRecurso = headers.findIndex(h => h.includes('RECURSO') || h.includes('TECNICO') || h.includes('AGENTE'));
      const idxResolucion = headers.findIndex(h => h.includes('RESOLUCION'));

      if (idxCelula === -1 || idxEstado === -1 || idxRecurso === -1) {
        throw new Error("No se detectaron las columnas necesarias (Célula, Estado, Recurso). Asegúrate de incluir la cabecera.");
      }

      const rows = initialRows.slice(1).map(line => line.split(separator).map(c => c.trim()));
      
      const toInsert = rows.map(row => {
        let rawDate = row[idxFecha] || selectedDate;
        // Normalización básica de fecha si viene en un formato extraño
        if (rawDate.includes('/')) {
          const parts = rawDate.split('/');
          if (parts[2]?.length === 4) rawDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        
        return {
          tx_celula: row[idxCelula]?.toUpperCase().replace(/_/g, ' ') || 'SIN CELULA',
          fecha_cita: rawDate,
          estado: row[idxEstado]?.toUpperCase() || 'DESCONOCIDO',
          recurso: row[idxRecurso] || 'SIN NOMBRE',
          resolucion: row[idxResolucion] || ''
        };
      }).filter(r => r.recurso !== 'SIN NOMBRE');

      if (toInsert.length > 0) {
        const { error } = await supabase.from('actuaciones').insert(toInsert);
        if (error) throw error;
        processedCount = toInsert.length;
      }

      setSummary({ 
        total: rows.length, 
        processed: processedCount, 
        errors: [], 
        techniciansCreated: 0, 
        cellTotalsProcessed: 0, 
        kpisDetected: ['Identificador', 'Célula', 'Fecha', 'Estado', 'Resolución'] 
      });
      setPastedData('');
      setPreviewData([]);

    } catch (err: any) {
      console.error(err);
      errors.push(`${err.message}`);
      setSummary({ total: 0, processed: 0, errors, techniciansCreated: 0, cellTotalsProcessed: 0, kpisDetected: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'detalle') {
      return handleProcessActuaciones();
    }
    if (!pastedData.trim() || !selectedDate) return;
    
    setLoading(true);
    setSummary(null);
    setUnidentified([]);
    const errors: string[] = [];
    const missingTechs: string[] = [];
    let processedCount = 0;
    let cellTotalsCount = 0;
    let autoCreatedCount = 0;
    const detectedKpis: string[] = [];

    try {
      const initialRows = pastedData.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // Encontrar fila de encabezado
      const headerIndex = initialRows.findIndex(row => {
           const v = row.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
           return v.includes('tecnico') || v.includes('agente') || v.includes('nombre');
      });

      if (headerIndex === -1) {
        errors.push("No se detectó la cabecera. Asegúrate de copiar los títulos de las columnas (Técnico, Productividad, etc).");
        setLoading(false);
        setSummary({ total: 0, processed: 0, errors, techniciansCreated: 0, cellTotalsProcessed: 0, kpisDetected: [] });
        return;
      }

      // Detectar el mejor separador de la cabecera
      const headerText = initialRows[headerIndex];
      let separator = '\t';
      const separators = ['\t', ';', ',', '  ']; 
      let maxCols = 0;
      
      separators.forEach(s => {
        const cols = headerText.split(s).length;
        if (cols > maxCols) {
          maxCols = cols;
          separator = s;
        }
      });

      const headers = headerText.split(separator).map(c => c.trim());
      const rawLines = initialRows.map(line => {
        let parts = line.split(separator).map(c => c.trim());
        if (parts.length < 2 && headers.length >= 2) {
            for (const s of separators) {
                const tryParts = line.split(s).map(c => c.trim());
                if (tryParts.length >= 2) {
                    parts = tryParts;
                    break;
                }
            }
        }
        return parts;
      });
      const tecnicoIdx = headers.findIndex(h => {
        const v = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return v === 'tecnico' || v === 'agente' || v === 'nombre' || v.includes('tecnico') || v.includes('agente');
      });
      const celulaIdx = headers.findIndex(h => ['celula', 'sector', 'grupo', 'unidad'].some(v => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(v)));
      
      const kpiIndices: Record<string, { idx: number, type: 'percentage' | 'number' }> = {};
      KPI_CONFIG.forEach(config => {
        const idx = headers.findIndex(h => {
          const normalizedH = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          return config.names.some(name => normalizedH === name.toLowerCase());
        });
        if (idx !== -1) {
          kpiIndices[config.key] = { idx, type: config.type };
          detectedKpis.push(config.label);
        }
      });

      setDetectedColumns(detectedKpis);

      if (tecnicoIdx === -1) {
        errors.push("Columna de identificador (Técnico/Agente) no encontrada en la fila de cabecera.");
        setLoading(false);
        setSummary({ total: 0, processed: 0, errors, techniciansCreated: 0, cellTotalsProcessed: 0, kpisDetected: [] });
        return;
      }

      const rowsToProcess = rawLines.slice(headerIndex + 1);
      
      for (const row of rowsToProcess) {
        try {
          const rawTecnico = row[tecnicoIdx] || "";
          if (!rawTecnico) continue;

          let rawCelula = celulaIdx !== -1 ? (row[celulaIdx] || null) : null;
          if (rawCelula) rawCelula = rawCelula.toUpperCase().replace(/_/g, ' ').trim();
          
          const kpiValues: Record<string, number> = {};
          Object.entries(kpiIndices).forEach(([key, { idx, type }]) => {
            if (row[idx]) kpiValues[key] = parseNum(row[idx], type);
          });

          const updatePayload: any = { ...kpiValues };
          if (rawCelula) updatePayload.celula = rawCelula;

          if (rawTecnico.toUpperCase().includes('TOTAL')) {
            const celulaName = rawCelula || rawTecnico.replace(/TOTAL\s+/i, '').trim();
            const { data: existingCell } = await supabase.from('metricas_celula').select('id').eq('celula', celulaName).eq('fecha', selectedDate).maybeSingle();
            if (existingCell) {
              await supabase.from('metricas_celula').update(updatePayload).eq('id', existingCell.id);
            } else {
              await supabase.from('metricas_celula').insert({ celula: celulaName, fecha: selectedDate, ...updatePayload });
            }
            cellTotalsCount++;
            processedCount++;
            continue;
          }

          const techInput = parseTechnicianInput(rawTecnico);
          let tecnicoId = null;

          if (techInput.dni) {
            const { data: t } = await supabase.from('tecnicos').select('id').eq('dni', techInput.dni).maybeSingle();
            if (t) tecnicoId = t.id;
          }

          if (!tecnicoId) {
            const { data: t } = await supabase.from('tecnicos').select('id').eq('nombre_normalizado', techInput.normalized).maybeSingle();
            if (t) tecnicoId = t.id;
          }

          if (!tecnicoId) {
            const { data: a } = await supabase.from('tecnico_alias').select('tecnico_id').eq('valor_original', rawTecnico).maybeSingle();
            if (a) tecnicoId = a.tecnico_id;
          }

          if (tecnicoId) {
            const { data: existingAlias } = await supabase.from('tecnico_alias').select('id').eq('tecnico_id', tecnicoId).eq('valor_original', rawTecnico).maybeSingle();
            if (!existingAlias) {
              await supabase.from('tecnico_alias').insert({ tecnico_id: tecnicoId, valor_original: rawTecnico, tipo: techInput.dni ? 'dni_nombre' : 'nombre' });
            }
            
            let cellToSave = rawCelula;
            if (!cellToSave) {
              const { data: lastMetric } = await supabase.from('metricas').select('celula').eq('tecnico_id', tecnicoId).not('celula', 'eq', 'DISTRITO').order('fecha', { ascending: false }).limit(1).maybeSingle();
              cellToSave = lastMetric?.celula || "DISTRITO";
            }

            const { data: existingMetric } = await supabase.from('metricas').select('id').eq('tecnico_id', tecnicoId).eq('fecha', selectedDate).maybeSingle();
            if (existingMetric) {
               await supabase.from('metricas').update({ celula: cellToSave, ...updatePayload }).eq('id', existingMetric.id);
            } else {
               await supabase.from('metricas').insert({ tecnico_id: tecnicoId, fecha: selectedDate, celula: cellToSave, ...updatePayload });
            }
            processedCount++;
          } else if (techInput.dni) {
            const { data: n, error: iErr } = await supabase.from('tecnicos').insert({
              dni: techInput.dni,
              nombre_normalizado: techInput.normalized,
              apellido: techInput.name.split(',')[0].trim(),
              nombre: techInput.name.split(',')[1]?.trim() || ""
            }).select('id').single();

            if (n) {
              autoCreatedCount++;
              await supabase.from('metricas').insert({
                tecnico_id: n.id,
                fecha: selectedDate,
                celula: rawCelula || "DISTRITO",
                ...updatePayload
              });
              processedCount++;
            }
          } else {
             if (!missingTechs.includes(rawTecnico)) missingTechs.push(rawTecnico);
          }
        } catch (innerError: any) {
           errors.push(`Fila "${row[tecnicoIdx]}": ${innerError.message}`);
        }
      }

      setSummary({ 
        total: rowsToProcess.length, 
        processed: processedCount, 
        errors, 
        techniciansCreated: autoCreatedCount, 
        cellTotalsProcessed: cellTotalsCount,
        kpisDetected: detectedKpis
      });
      setUnidentified(missingTechs);
      if (errors.length === 0 && processedCount > 0) setPastedData('');

    } catch (err: any) {
      console.error(err);
      errors.push(`Error crítico: ${err.message}`);
      setSummary({ total: 0, processed: 0, errors, techniciansCreated: 0, cellTotalsProcessed: 0, kpisDetected: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    setLoading(true);
    setClearStatus("Borrando...");
    try {
      if (activeTab === 'resumen') {
        await supabase.from('metricas').delete().eq('fecha', selectedDate);
        await supabase.from('metricas_celula').delete().eq('fecha', selectedDate);
      } else {
        await supabase.from('actuaciones').delete().eq('fecha_cita', selectedDate);
      }
      setClearStatus(`Datos de ${selectedDate} borrados exitosamente.`);
      setSummary(null);
      setShowClearConfirm(false);
    } catch (e) {
      setClearStatus("Error al borrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDistrito = async (e: React.FormEvent) => {
    e.preventDefault();
    setDistritoLoading(true);
    await supabase.from('indicadores_distrito').insert({
        resolucion: parseNum(distritoKPIs.resolucion, 'percentage'),
        reiteros: parseNum(distritoKPIs.reiteros, 'percentage'),
        puntualidad: parseNum(distritoKPIs.puntualidad, 'percentage'),
        productividad: parseNum(distritoKPIs.productividad, 'number'),
        updated_at: new Date().toISOString()
    });
    setDistritoStatus("Actualizado.");
    setTimeout(() => setDistritoStatus(null), 3000);
    setDistritoLoading(false);
  };

  if (!isLoggedIn) {
     return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px' }}>
            <div style={{ backgroundColor: 'white', padding: '48px', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', border: '1px solid #eef2f6', width: '100%', maxWidth: '420px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '72px', height: '72px', backgroundColor: '#019df4', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', margin: '0 auto 20px', boxShadow: '0 12px 20px -5px rgba(1, 157, 244, 0.4)' }}>
                        <Info size={36} />
                    </div>
                    <h2 style={{ fontSize: '28px', fontWeight: '950', color: '#1a1a1a', letterSpacing: '-1px' }}>Portal Admin</h2>
                    <p style={{ color: '#64748b', fontWeight: '700', marginTop: '4px' }}>Gestión de Datos Districtuales</p>
                </div>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input type="text" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Usuario" style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #eef2f6', fontWeight: '700', fontSize: '15px', outline: 'none' }} />
                    <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Contraseña" style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #eef2f6', fontWeight: '700', fontSize: '15px', outline: 'none' }} />
                    {authError && <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: '800', textAlign: 'center' }}>Credenciales incorrectas</p>}
                    <button type="submit" style={{ backgroundColor: '#1a171e', color: 'white', padding: '18px', borderRadius: '16px', border: 'none', fontWeight: '950', cursor: 'pointer', fontSize: '16px', marginTop: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>Iniciar Sesión</button>
                </form>
            </div>
        </div>
     );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '8px', backgroundColor: '#019df4', borderRadius: '10px', color: 'white' }}>
              <Zap size={20} fill="currentColor" />
            </div>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#019df4', letterSpacing: '1px', textTransform: 'uppercase' }}>Sistema de Carga Pro</span>
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: '950', color: '#1a1a1a', letterSpacing: '-2px', lineHeight: '1' }}>Sincronización Cloud</h1>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '28px', border: '1px solid #eef2f6' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '950', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#1a1a1a' }}>
                <ClipboardCopy size={22} color="#019df4" /> KPIs Districtuales
            </h2>
            <form onSubmit={handleUpdateDistrito} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { id: 'resolucion', label: 'RESOLUCIÓN %', placeholder: '76.2' },
                  { id: 'reiteros', label: 'REITEROS %', placeholder: '5.2' },
                  { id: 'puntualidad', label: 'PUNTUALIDAD %', placeholder: '84.4' },
                  { id: 'productividad', label: 'PRODUCTIVIDAD', placeholder: '5.5' },
                ].map(f => (
                  <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b' }}>{f.label}</label>
                      <input 
                        type="text" 
                        value={(distritoKPIs as any)[f.id]} 
                        onChange={(e) => setDistritoKPIs({...distritoKPIs, [f.id]: e.target.value})} 
                        style={{ padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', fontWeight: '800' }} 
                      />
                  </div>
                ))}
                <button type="submit" style={{ width: '100%', backgroundColor: '#1a171e', color: 'white', padding: '16px', borderRadius: '16px', fontWeight: '950' }}>
                    {distritoLoading ? "..." : "Actualizar Distrito"}
                </button>
            </form>
          </div>
          
          <div style={{ backgroundColor: '#fff1f2', padding: '24px', borderRadius: '24px', border: '1px solid #fecdd3' }}>
             <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#be123c', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} /> Zona de Peligro
             </h3>
             <p style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '16px', fontWeight: '700' }}>Borrar datos existentes para la fecha seleccionada ({selectedDate}).</p>
             {!showClearConfirm ? (
               <button onClick={() => setShowClearConfirm(true)} style={{ width: '100%', padding: '12px', backgroundColor: '#be123c', color: 'white', borderRadius: '12px', border: 'none', fontWeight: '900', fontSize: '13px' }}>Borrar Datos del Día</button>
             ) : (
               <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleClearData} style={{ flex: 1, padding: '12px', backgroundColor: '#e11d48', color: 'white', borderRadius: '12px', border: 'none', fontWeight: '900' }}>Confirmar</button>
                  <button onClick={() => setShowClearConfirm(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '900' }}>Canelar</button>
               </div>
             )}
             {clearStatus && <p style={{ marginTop: '12px', fontSize: '11px', fontWeight: '900', color: '#be123c', textAlign: 'center' }}>{clearStatus}</p>}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '32px', border: '1px solid #eef2f6' }}>
          <div style={{ display: 'flex', gap: '2px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '16px', marginBottom: '32px' }}>
             <button 
                onClick={() => setActiveTab('resumen')}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '12px', 
                  backgroundColor: activeTab === 'resumen' ? 'white' : 'transparent',
                  color: activeTab === 'resumen' ? '#019df4' : '#64748b',
                  fontWeight: '900',
                  boxShadow: activeTab === 'resumen' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
             >
               Resumen KPI
             </button>
             <button 
                onClick={() => setActiveTab('detalle')}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '12px', 
                  backgroundColor: activeTab === 'detalle' ? 'white' : 'transparent',
                  color: activeTab === 'detalle' ? '#019df4' : '#64748b',
                  fontWeight: '900',
                  boxShadow: activeTab === 'detalle' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
             >
               Detalle Actuaciones
             </button>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '950', color: '#1a1a1a', marginBottom: '8px' }}>
              {activeTab === 'resumen' ? 'Importación Resumen KPI' : 'Importación Detalle Diario'}
            </h2>
            <p style={{ color: '#64748b', fontWeight: '700' }}>
               {activeTab === 'resumen' 
                ? 'Reporte de productividad agregada por técnico.' 
                : 'Detalle individual de cada actuación realzada hoy.'}
            </p>
          </div>

          {activeTab === 'detalle' && (
            <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '16px', border: '1px solid #bae6fd', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#0369a1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 <Info size={14} /> Formato Requerido
              </h4>
              <p style={{ fontSize: '11px', color: '#0c4a6e', fontWeight: '700', fontFamily: 'monospace' }}>
                TX_CELULA [TAB] fecha_Cita [TAB] ESTADO [TAB] RECURSO [TAB] RESOLUCION
              </p>
            </div>
          )}

          <form onSubmit={handleProcessData}>
              <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '900', marginBottom: '12px' }}>
                      <Calendar size={18} color="#019df4" /> {activeTab === 'resumen' ? 'FECHA DE MÉTRICAS' : 'FECHA DE ACTUACIONES'}
                  </label>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: '100%', padding: '18px', borderRadius: '18px', border: '2px solid #f1f5f9', fontWeight: '800' }} />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                  <textarea 
                    value={pastedData} 
                    onChange={(e) => setPastedData(e.target.value)} 
                    placeholder={activeTab === 'resumen' 
                        ? "Pega aquí (Técnico, Productividad, Resolución...)" 
                        : "Pega aquí (Célula, Fecha, Estado, Recurso, Resolución...)"} 
                    style={{ width: '100%', height: '240px', padding: '20px', borderRadius: '20px', border: '2px solid #f1f5f9', fontFamily: 'monospace', fontSize: '12px' }} 
                  />
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: '#019df4', color: 'white', padding: '20px', borderRadius: '20px', fontWeight: '950', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(1, 157, 244, 0.3)' }}>
                  {loading ? "Procesando..." : `Sincronizar Cloud (${activeTab === 'resumen' ? 'KPIs' : 'Detalle'})`}
              </button>
          </form>

          {summary && (
              <div style={{ marginTop: '32px' }}>
                <div style={{ padding: '28px', backgroundColor: '#f0fdf4', borderRadius: '28px', border: '1px solid #dcfce7' }}>
                   <h3 style={{ fontWeight: '950', color: '#065f46', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} /> Carga Finalizada
                   </h3>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '12px', textAlign: 'center' }}>
                         <span style={{ display: 'block', fontSize: '20px', fontWeight: '950', color: '#065f46' }}>{summary.processed}</span>
                         <span style={{ fontSize: '10px', color: '#059669', fontWeight: '800' }}>PROCESADOS</span>
                      </div>
                      <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '12px', textAlign: 'center' }}>
                         <span style={{ display: 'block', fontSize: '20px', fontWeight: '950', color: '#065f46' }}>{summary.errors.length}</span>
                         <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: '800' }}>ERRORES</span>
                      </div>
                   </div>

                   {summary.errors.length > 0 && (
                     <div style={{ maxHeight: '150px', overflowY: 'auto', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
                        {summary.errors.map((err, i) => (
                          <p key={i} style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px', fontWeight: '700' }}>• {err}</p>
                        ))}
                     </div>
                   )}
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
