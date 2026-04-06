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
  { key: 'inicio', label: 'Inicio', names: ['inicio', 'ini', 'start', '%cump', 'cump'], type: 'number' },
  { key: 'ok1', label: '1er OK', names: ['ok1', '1er ok', 'ok', 'ok1er', 'ok_1', 'calidad franqueo'], type: 'number' },
  { key: 'cierres', label: 'Cierres', names: ['cierre', 'cierres', 'cant cierres', 'can cierres', 'closing', 'q_franqeo'], type: 'number' },
  { key: 'completadas', label: 'Completadas', names: ['completada', 'completadas', 'comp', 'comp%', 'compl', '%completadas'], type: 'number' },
  { key: 'no_encontrados', label: 'No Enc.', names: ['no encontrado', 'no encontrados', 'ne', 'n_e', '%no_encontradas'], type: 'number' },
  { key: 'deriva_bajadas', label: 'Deriva Bajadas', names: ['deriva', 'bajadas', 'deriva bajadas', 'db', '%camb_bajada'], type: 'number' },
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

  useEffect(() => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  const findHeaderIdx = (headers: string[], config: KpiMappingConfig) => {
    return headers.findIndex(h => {
      const normalizedH = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      return config.names.some(name => normalizedH === name.toLowerCase());
    });
  };

  const handleProcessData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedData.trim() || !selectedDate) return;
    
    setLoading(true);
    setSummary(null);
    setUnidentified([]);
    const errors: string[] = [];
    const missingTechs: string[] = [];
    let processedCount = 0;
    let cellTotalsCount = 0;
    const detectedKpis: string[] = [];

    try {
      const rawLines = pastedData.split('\n').map(line => line.split('\t').map(c => c.trim()));
      
      // Encontrar fila de encabezado
      const headerIndex = rawLines.findIndex(row => row.some(cell => {
           const v = cell.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
           return v.includes('tecnico') || v === 'agente' || v === 'nombre';
      }));

      if (headerIndex === -1) {
        errors.push("No se encontró la columna 'Técnico'. Verifique que los datos incluyan encabezados.");
        setLoading(false);
        return;
      }

      const headers = rawLines[headerIndex];
      const tecnicoIdx = headers.findIndex(h => ['tecnico', 'nombre', 'agente'].some(v => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(v)));
      const celulaIdx = headers.findIndex(h => ['celula', 'sector', 'grupo', 'unidad'].some(v => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(v)));
      
      // Mapear KPIs dinámicamente
      const kpiIndices: Record<string, { idx: number, type: 'percentage' | 'number' }> = {};
      KPI_CONFIG.forEach(config => {
        const idx = findHeaderIdx(headers, config);
        if (idx !== -1) {
          kpiIndices[config.key] = { idx, type: config.type };
          detectedKpis.push(config.label);
        }
      });

      setDetectedColumns(detectedKpis);

      const rowsToProcess = rawLines.slice(headerIndex + 1).filter(row => row.length > 1 && row[tecnicoIdx]);

      for (const row of rowsToProcess) {
        const rawTecnico = row[tecnicoIdx] || "";
        const rawCelula = celulaIdx !== -1 ? (row[celulaIdx] || null) : null;
        
        // Extraer valores de KPIs detectados
        const kpiValues: Record<string, number> = {};
        Object.entries(kpiIndices).forEach(([key, { idx, type }]) => {
          kpiValues[key] = parseNum(row[idx], type);
        });

        const updatePayload: any = { ...kpiValues };
        if (rawCelula) updatePayload.celula = rawCelula;

        // Caso: Fila de Totales de Célula
        if (rawTecnico.toUpperCase().includes('TOTAL')) {
          const celulaName = rawCelula || rawTecnico.replace(/TOTAL\s+/i, '').trim();
          await supabase.from('metricas_celula').upsert({ 
            celula: celulaName, 
            fecha: selectedDate, 
            ...updatePayload 
          }, { onConflict: 'celula, fecha' });
          cellTotalsCount++;
          processedCount++;
          continue;
        }

        // Identificación del técnico
        const techInput = parseTechnicianInput(rawTecnico);
        let tecnicoId = null;
        let dbCelula = null;

        // Intentar encontrar al técnico y su célula pre-cargada
        let tData = null;
        if (techInput.dni) {
          const { data: t } = await supabase.from('tecnicos').select('id, nombre_normalizado, celula').eq('dni', techInput.dni).maybeSingle();
          tData = t;
        }

        if (!tData) {
          const { data: t } = await supabase.from('tecnicos').select('id, nombre_normalizado, celula').eq('nombre_normalizado', techInput.normalized).maybeSingle();
          tData = t;
        }

        if (tData) {
          tecnicoId = tData.id;
          dbCelula = tData.celula;
          if (!tData.nombre_normalizado) await supabase.from('tecnicos').update({ nombre_normalizado: techInput.normalized }).eq('id', tData.id);
        }

        // 3. Alias
        if (!tecnicoId) {
          const { data: a } = await supabase.from('tecnico_alias').select('tecnico_id').eq('valor_original', rawTecnico).maybeSingle();
          if (a) {
            tecnicoId = a.tecnico_id;
            // Buscar la célula si se encontró por alias
            const { data: t } = await supabase.from('tecnicos').select('celula').eq('id', tecnicoId).maybeSingle();
            if (t) dbCelula = t.celula;
          }
        }

        if (tecnicoId) {
          // Guardar Alias para aprendizaje
          await supabase.from('tecnico_alias').upsert({ 
            tecnico_id: tecnicoId, 
            valor_original: rawTecnico, 
            tipo: techInput.dni ? 'dni_nombre' : 'nombre' 
          }, { onConflict: 'tecnico_id, valor_original' });
          
          const finalCelula = rawCelula || dbCelula || "DISTRITO";
          const finalPayload = { ...updatePayload, celula: finalCelula };

          // Insertar métricas
          await supabase.from('metricas').upsert({ 
            tecnico_id: tecnicoId, 
            fecha: selectedDate, 
            ...finalPayload
          }, { onConflict: 'tecnico_id, fecha' });
          
          processedCount++;
        } else if (techInput.dni) {
          // AUTO-CREACIÓN: Si trae DNI pero no existe en la DB, lo creamos ahora mismo
          const { data: newTech } = await supabase.from('tecnicos').insert({
            dni: techInput.dni,
            nombre_normalizado: techInput.normalized,
            apellido: techInput.name.split(',')[0].trim(),
            nombre: techInput.name.split(',')[1]?.trim() || "",
            celula: rawCelula || "DISTRITO"
          }).select('id').single();

          if (newTech) {
            tecnicoId = newTech.id;
            // Proceder a insertar la métrica para el nuevo técnico
            const finalCelula = rawCelula || "DISTRITO";
            await supabase.from('metricas').upsert({ 
              tecnico_id: tecnicoId, 
              fecha: selectedDate, 
              celula: finalCelula,
              ...updatePayload
            }, { onConflict: 'tecnico_id, fecha' });
            processedCount++;
          }
        } else {
          if (!missingTechs.includes(rawTecnico)) missingTechs.push(rawTecnico);
        }
      }

      setSummary({ 
        total: rowsToProcess.length, 
        processed: processedCount, 
        errors, 
        techniciansCreated: 0, 
        cellTotalsProcessed: cellTotalsCount,
        kpisDetected: detectedKpis
      });
      setUnidentified(missingTechs);
      setPastedData(''); // Limpiar al finalizar con éxito
    } catch (err) {
      console.error(err);
      errors.push("Error inesperado procesando los datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    setLoading(true);
    setClearStatus("Borrando...");
    try {
      const { error: e1 } = await supabase.from('metricas').delete().eq('fecha', selectedDate);
      const { error: e2 } = await supabase.from('metricas_celula').delete().eq('fecha', selectedDate);
      if (e1 || e2) throw new Error("Error deletion");
      
      setClearStatus(`Semana ${selectedDate} borrada exitosamente.`);
      setSummary(null);
      setShowClearConfirm(false);
    } catch (e) {
      setClearStatus("Error al intentar borrar los datos.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDistrito = async (e: React.FormEvent) => {
    e.preventDefault();
    setDistritoLoading(true);
    const { error } = await supabase.from('indicadores_distrito').insert({
        resolucion: parseNum(distritoKPIs.resolucion, 'percentage'),
        reiteros: parseNum(distritoKPIs.reiteros, 'percentage'),
        puntualidad: parseNum(distritoKPIs.puntualidad, 'percentage'),
        productividad: parseNum(distritoKPIs.productividad, 'number'),
        updated_at: new Date().toISOString()
    });
    setDistritoStatus(error ? "Error al guardar los indicadores." : "Indicadores del distrito actualizados con éxito.");
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
                    <div style={{ position: 'relative' }}>
                        <input type="text" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Usuario" style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #eef2f6', fontWeight: '700', fontSize: '15px', outline: 'none' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Contraseña" style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #eef2f6', fontWeight: '700', fontSize: '15px', outline: 'none' }} />
                    </div>
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
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#64748b', fontWeight: '800', fontSize: '14px' }}>Varela Dto. / Operaciones</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
        
        {/* Columna Izquierda: Distrito */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '28px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', border: '1px solid #eef2f6' }}>
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
                      <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', letterSpacing: '0.5px' }}>{f.label}</label>
                      <input 
                        type="text" 
                        value={(distritoKPIs as any)[f.id]} 
                        onChange={(e) => setDistritoKPIs({...distritoKPIs, [f.id]: e.target.value})} 
                        placeholder={f.placeholder} 
                        style={{ padding: '14px', borderRadius: '14px', border: '2px solid #f1f5f9', fontWeight: '800', fontSize: '15px' }} 
                      />
                  </div>
                ))}
                <button type="submit" disabled={distritoLoading} style={{ width: '100%', backgroundColor: '#1a171e', color: 'white', padding: '16px', borderRadius: '16px', border: 'none', fontWeight: '950', cursor: 'pointer', marginTop: '8px' }}>
                    {distritoLoading ? <Loader2 className="animate-spin" /> : "Actualizar Distrito"}
                </button>
                {distritoStatus && <p style={{ textAlign: 'center', fontWeight: '800', fontSize: '13px', color: '#10b981' }}>{distritoStatus}</p>}
            </form>
          </div>

          {/* Estado de la Conexión */}
          <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>Base de Datos Conectada</span>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Carga Masiva */}
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)', border: '1px solid #eef2f6' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '950', color: '#1a1a1a', letterSpacing: '-0.5px', marginBottom: '8px' }}>Importación Inteligente</h2>
            <p style={{ color: '#64748b', fontWeight: '700', fontSize: '15px' }}>Pega filas de Excel o TOA directamente. El sistema detectará las columnas automáticamente.</p>
          </div>

          <form onSubmit={handleProcessData}>
              <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '900', color: '#1e293b', marginBottom: '12px' }}>
                      <Calendar size={18} color="#019df4" /> SEMANA DE TRABAJO
                  </label>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: '100%', padding: '18px', borderRadius: '18px', border: '2px solid #f1f5f9', fontWeight: '800', fontSize: '16px', cursor: 'pointer' }} />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>
                        <FileSpreadsheet size={18} color="#019df4" /> DATOS DE EXCEL / TOA
                    </label>
                    <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', backgroundColor: '#f1f5f9', borderRadius: '8px', color: '#64748b' }}>SOPORTA +10 KPIs</span>
                  </div>
                  <textarea 
                    value={pastedData} 
                    onChange={(e) => setPastedData(e.target.value)} 
                    placeholder="Pega las columnas (incluyendo los títulos) aquí..." 
                    style={{ width: '100%', height: '240px', padding: '20px', borderRadius: '20px', border: '2px solid #f1f5f9', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace', resize: 'vertical' }} 
                  />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                  <button type="submit" disabled={loading || !pastedData.trim()} style={{ flex: 2, backgroundColor: loading || !pastedData.trim() ? '#f1f5f9' : '#019df4', color: loading || !pastedData.trim() ? '#94a3b8' : 'white', padding: '20px', borderRadius: '20px', border: 'none', fontWeight: '950', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: pastedData.trim() ? '0 10px 15px -3px rgba(1, 157, 244, 0.3)' : 'none' }}>
                     {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                           <Loader2 className="animate-spin" /> Procesando...
                        </div>
                     ) : "Sincronizar Cloud"}
                  </button>
                  <button type="button" onClick={() => setShowClearConfirm(!showClearConfirm)} style={{ flex: 1, backgroundColor: 'white', color: '#ef4444', border: '2px solid #fee2e2', borderRadius: '20px', fontWeight: '900', cursor: 'pointer' }}>
                     Limpiar Semana
                  </button>
              </div>

              {showClearConfirm && (
                  <div style={{ marginTop: '20px', padding: '24px', backgroundColor: '#fef2f2', borderRadius: '24px', border: '2px solid #fee2e2', textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }}>
                      <AlertTriangle size={32} color="#ef4444" style={{ margin: '0 auto 12px' }} />
                      <p style={{ fontWeight: '950', color: '#991b1b', fontSize: '16px', marginBottom: '16px' }}>¿Confirmas borrar todos los registros?</p>
                      <button onClick={handleClearData} style={{ backgroundColor: '#ef4444', color: 'white', padding: '14px 28px', borderRadius: '14px', border: 'none', fontWeight: '950', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)' }}>SÍ, BORRAR TODO</button>
                      <p style={{ color: '#ef4444', fontSize: '12px', fontWeight: '800', marginTop: '12px' }}>Esta acción no se puede deshacer.</p>
                  </div>
              )}
          </form>

          {/* Resumen Post-Procesamiento */}
          {summary && (
              <div style={{ marginTop: '32px', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ padding: '28px', backgroundColor: '#f0fdf4', borderRadius: '28px', border: '1px solid #dcfce7' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ padding: '8px', backgroundColor: '#10b981', borderRadius: '10px', color: 'white' }}>
                        <UserCheck size={20} />
                      </div>
                      <h3 style={{ fontWeight: '950', color: '#065f46', fontSize: '18px' }}>Sincronización Exitosa</h3>
                   </div>
                   
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '16px', textAlign: 'center' }}>
                         <span style={{ display: 'block', fontSize: '24px', fontWeight: '950', color: '#065f46' }}>{summary.processed}</span>
                         <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', textTransform: 'uppercase' }}>TÉCNICOS</span>
                      </div>
                      <div style={{ padding: '16px', backgroundColor: 'white', borderRadius: '16px', textAlign: 'center' }}>
                         <span style={{ display: 'block', fontSize: '24px', fontWeight: '950', color: '#065f46' }}>{summary.cellTotalsProcessed}</span>
                         <span style={{ fontSize: '11px', fontWeight: '800', color: '#059669', textTransform: 'uppercase' }}>TOTALES CÉLULA</span>
                      </div>
                   </div>

                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '900', color: '#059669' }}>KPIS DETECTADOS:</span>
                      {summary.kpisDetected.map((kpi, idx) => (
                        <span key={idx} style={{ backgroundColor: '#dcfce7', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '950', color: '#065f46' }}>
                          {kpi}
                        </span>
                      ))}
                   </div>
                </div>

                {unidentified.length > 0 && (
                    <div style={{ marginTop: '24px', padding: '28px', backgroundColor: '#fff7ed', borderRadius: '28px', border: '1px solid #ffedd5' }}>
                        <h3 style={{ fontWeight: '950', color: '#9a3412', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '17px' }}>
                            <AlertCircle size={22} /> Intervención Requerida
                        </h3>
                        <p style={{ fontSize: '14px', color: '#c2410c', marginBottom: '20px', fontWeight: '700', lineHeight: '1.4' }}>
                            Los siguientes {unidentified.length} registros no están registrados en el maestro de técnicos. Deberás darlos de alta o corregir el alias.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {unidentified.map((tech, idx) => (
                                <div key={idx} style={{ backgroundColor: 'white', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '800', border: '1px solid #fed7aa', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {tech} <ArrowRight size={14} /> <span style={{ color: '#ea580c' }}>Verificar DB</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>
          )}
          
          {clearStatus && (
            <div style={{ marginTop: '20px', textAlign: 'center', padding: '12px', borderRadius: '12px', backgroundColor: '#f1f5f9', fontWeight: '800', fontSize: '13px' }}>
              {clearStatus}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
