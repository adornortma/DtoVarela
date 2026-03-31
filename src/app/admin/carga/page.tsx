'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardCopy, Calendar, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { normalizeName, parseTechnicianInput } from '@/lib/utils';

interface ProcessingSummary {
  total: number;
  processed: number;
  errors: string[];
  techniciansCreated: number;
  cellTotalsProcessed: number;
}

export default function CargaAdminPage() {
  // 1. Hooks
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [pastedData, setPastedData] = useState<string>('');
  const [pastedCellData, setPastedCellData] = useState<string>('');
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

  const parsePercent = (val: string): number | null => {
    if (!val || val === "") return 0;
    const clean = val.replace('%', '').replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const handleProcessData = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!pastedData.trim() && !pastedCellData.trim()) || !selectedDate) return;
    setLoading(true);
    setSummary(null);
    setUnidentified([]);
    const errors: string[] = [];
    const missingTechs: string[] = [];
    let processedCount = 0;
    let cellTotalsCount = 0;

    try {
      if (pastedData.trim()) {
        const rawLines = pastedData.split('\n').map(line => line.split('\t').map(c => c.trim()));
        const headerIndex = rawLines.findIndex(row => row.some(cell => {
             const v = cell.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
             return v.includes('tecnico') || v === 'agente' || v === 'nombre';
        }));

        if (headerIndex === -1) {
          errors.push("No se encontró la columna 'Técnico'.");
        } else {
          const headers = rawLines[headerIndex];
          const getCol = (variants: string[]) => headers.findIndex(h => variants.some(v => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === v.toLowerCase()));
          const colIdx = {
              tecnico: getCol(['tecnico', 'nombre', 'agente']),
              reitero: getCol(['reitero', 'reiteros', 'rtr']),
              resolucion: getCol(['resolucion', 'resoluciones', 'res']),
              celula: getCol(['celula', 'sector', 'grupo', 'unidad']),
              puntualidad: getCol(['puntualidad', 'punt', 'pnt']),
              productividad: getCol(['productividad', 'prod', 'prd'])
          };
          const rowsToProcess = rawLines.slice(headerIndex + 1).filter(row => row.length > 1 && row[colIdx.tecnico]);
          for (let i = 0; i < rowsToProcess.length; i++) {
            const row = rowsToProcess[i];
            const rawTecnico = row[colIdx.tecnico] || "";
            const reitero = parsePercent(colIdx.reitero !== -1 ? (row[colIdx.reitero] || "0") : "0");
            const resolucion = parsePercent(colIdx.resolucion !== -1 ? (row[colIdx.resolucion] || "0") : "0");
            const rawCelula = colIdx.celula !== -1 ? (row[colIdx.celula] || "DISTRITO") : "DISTRITO";
            const puntualidad = parsePercent(colIdx.puntualidad !== -1 ? (row[colIdx.puntualidad] || "0") : "0");
            const productividad = parsePercent(colIdx.productividad !== -1 ? (row[colIdx.productividad] || "0") : "0");

            if (rawTecnico.toUpperCase().includes('TOTAL')) {
              const celulaName = rawCelula || rawTecnico.replace(/TOTAL\s+/i, '').trim();
              await supabase.from('metricas_celula').upsert({ celula: celulaName, fecha: selectedDate, reitero, resolucion, puntualidad, productividad }, { onConflict: 'celula, fecha' });
              cellTotalsCount++; processedCount++; continue;
            }

            const techInput = parseTechnicianInput(rawTecnico);
            let tecnicoId = null;

            // ESTRATEGIA DE IDENTIFICACIÓN
            // 1. Prioridad: DNI (si existe)
            if (techInput.dni) {
              const { data: t } = await supabase.from('tecnicos').select('id, nombre_normalizado').eq('dni', techInput.dni).maybeSingle();
              if (t) {
                tecnicoId = t.id;
                // Auto-curación: Si no tiene nombre normalizado (registros viejos), lo actualizamos
                if (!t.nombre_normalizado) {
                  await supabase.from('tecnicos').update({ nombre_normalizado: techInput.normalized }).eq('id', t.id);
                }
              }
            }

            // 2. Si no se encontró por DNI: Nombre Normalizado
            if (!tecnicoId) {
              const { data: t } = await supabase.from('tecnicos').select('id').eq('nombre_normalizado', techInput.normalized).maybeSingle();
              if (t) tecnicoId = t.id;
            }

            // 3. Fallback: Buscar en historial de Alias
            if (!tecnicoId) {
              const { data: a } = await supabase.from('tecnico_alias').select('tecnico_id').eq('valor_original', rawTecnico).maybeSingle();
              if (a) tecnicoId = a.tecnico_id;
            }

            if (tecnicoId) {
              // Registro de Alias (para aprendizaje del sistema)
              await supabase.from('tecnico_alias').upsert({ 
                tecnico_id: tecnicoId, 
                valor_original: rawTecnico, 
                tipo: techInput.dni ? 'dni_nombre' : 'nombre' 
              }, { onConflict: 'tecnico_id, valor_original' });
              
              await supabase.from('metricas').insert({ 
                tecnico_id: tecnicoId, 
                fecha: selectedDate, 
                reitero, 
                resolucion, 
                puntualidad, 
                productividad, 
                celula: rawCelula 
              });
              processedCount++;
            } else {
              // REGISTRO PARA REVISIÓN MANUAL
              if (!missingTechs.includes(rawTecnico)) missingTechs.push(rawTecnico);
            }
          }
        }
      }
      if (pastedCellData.trim()) {
        const cellLines = pastedCellData.split('\n').filter(l => l.trim());
        for (const line of cellLines) {
           const cells = line.split('\t').map(c => c.trim());
           if (cells.length < 5 || !cells[0].toUpperCase().includes('TOTAL')) continue;
           const celulaName = cells[0].replace(/TOTAL\s+/i, '').trim();
           await supabase.from('metricas_celula').upsert({ celula: celulaName, fecha: selectedDate, resolucion: parsePercent(cells[1]), reitero: parsePercent(cells[2]), productividad: parsePercent(cells[3]), puntualidad: parsePercent(cells[4]) }, { onConflict: 'celula, fecha' });
           cellTotalsCount++; processedCount++;
        }
      }
      setSummary({ total: 0, processed: processedCount, errors, techniciansCreated: 0, cellTotalsProcessed: cellTotalsCount });
      setUnidentified(missingTechs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    setLoading(true);
    setClearStatus("Borrando...");
    try {
      await supabase.from('metricas').delete().eq('fecha', selectedDate);
      await supabase.from('metricas_celula').delete().eq('fecha', selectedDate);
      setClearStatus(`Éxito.`);
      setSummary(null);
      setShowClearConfirm(false);
    } catch (e) {
      setClearStatus("Error.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDistrito = async (e: React.FormEvent) => {
    e.preventDefault();
    setDistritoLoading(true);
    const { error } = await supabase.from('indicadores_distrito').insert({
        resolucion: parsePercent(distritoKPIs.resolucion),
        reiteros: parsePercent(distritoKPIs.reiteros),
        puntualidad: parsePercent(distritoKPIs.puntualidad),
        productividad: parsePercent(distritoKPIs.productividad),
        updated_at: new Date().toISOString()
    });
    setDistritoStatus(error ? "Error al guardar." : "Indicadores actualizados.");
    setDistritoLoading(false);
  };

  if (!isLoggedIn) {
     return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px' }}>
            <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #eef2f6', width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--movistar-blue)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', margin: '0 auto 16px', boxShadow: '0 10px 15px -3px rgba(1, 157, 244, 0.3)' }}>
                        <Info size={32} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#1a1a1a', letterSpacing: '-1px' }}>Acceso Restringido</h2>
                </div>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <input type="text" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Usuario" style={{ padding: '16px', borderRadius: '12px', border: '2px solid #eef2f6', fontWeight: '700' }} />
                    <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" style={{ padding: '16px', borderRadius: '12px', border: '2px solid #eef2f6', fontWeight: '700' }} />
                    {authError && <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '800', textAlign: 'center' }}>Incorrecto</p>}
                    <button type="submit" style={{ backgroundColor: 'var(--movistar-blue)', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '950', cursor: 'pointer' }}>Ingresar</button>
                </form>
            </div>
        </div>
     );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '950' }}>Sincronización Cloud</h1>
        <p style={{ color: '#666', fontWeight: '600' }}>Carga de KPIs districtuales y técnicos.</p>
      </header>

      <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardCopy size={20} color="var(--movistar-blue)" /> KPIs del Distrito
        </h2>
        <form onSubmit={handleUpdateDistrito} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900' }}>RESOLUCIÓN (%)</label>
                <input type="text" value={distritoKPIs.resolucion} onChange={(e) => setDistritoKPIs({...distritoKPIs, resolucion: e.target.value})} placeholder="76,21" style={{ padding: '12px', borderRadius: '10px', border: '2px solid #eef2f6', fontWeight: '700' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900' }}>REITEROS (%)</label>
                <input type="text" value={distritoKPIs.reiteros} onChange={(e) => setDistritoKPIs({...distritoKPIs, reiteros: e.target.value})} placeholder="5,21" style={{ padding: '12px', borderRadius: '10px', border: '2px solid #eef2f6', fontWeight: '700' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900' }}>PUNTUALIDAD (%)</label>
                <input type="text" value={distritoKPIs.puntualidad} onChange={(e) => setDistritoKPIs({...distritoKPIs, puntualidad: e.target.value})} placeholder="84,4" style={{ padding: '12px', borderRadius: '10px', border: '2px solid #eef2f6', fontWeight: '700' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900' }}>PRODUCTIVIDAD</label>
                <input type="text" value={distritoKPIs.productividad} onChange={(e) => setDistritoKPIs({...distritoKPIs, productividad: e.target.value})} placeholder="5,51" style={{ padding: '12px', borderRadius: '10px', border: '2px solid #eef2f6', fontWeight: '700' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
                <button type="submit" disabled={distritoLoading} style={{ width: '100%', backgroundColor: distritoLoading ? '#e2e8f0' : '#1a1a1a', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>
                    {distritoLoading ? "Actualizando..." : "Actualizar Indicadores del Distrito"}
                </button>
                {distritoStatus && <p style={{ marginTop: '12px', textAlign: 'center', fontWeight: '800' }}>{distritoStatus}</p>}
            </div>
        </form>
      </div>

      <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }}>
        <form onSubmit={handleProcessData}>
            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '900', marginBottom: '12px' }}>
                    <Calendar size={18} color="var(--movistar-blue)" /> Fecha de la Semana
                </label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #eef2f6', fontWeight: '700' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                <textarea value={pastedData} onChange={(e) => setPastedData(e.target.value)} placeholder="Pega datos técnicos aquí..." style={{ width: '100%', height: '180px', padding: '16px', borderRadius: '12px', border: '2px solid #eef2f6' }} />
                <textarea value={pastedCellData} onChange={(e) => setPastedCellData(e.target.value)} placeholder="Pega totales de células aquí..." style={{ width: '100%', height: '180px', padding: '16px', borderRadius: '12px', border: '2px solid #eef2f6' }} />
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
                <button type="submit" disabled={loading} style={{ flex: 2, backgroundColor: loading ? '#e2e8f0' : 'var(--movistar-blue)', color: 'white', padding: '20px', borderRadius: '16px', border: 'none', fontWeight: '950', cursor: 'pointer' }}>
                   {loading ? "Sincronizando..." : "Sincronizar Datos"}
                </button>
                <button type="button" onClick={() => setShowClearConfirm(true)} style={{ flex: 1, backgroundColor: 'white', color: '#ef4444', border: '2px solid #fee2e2', borderRadius: '16px', fontWeight: '800', cursor: 'pointer' }}>
                   Limpiar Semana
                </button>
            </div>
            {showClearConfirm && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button onClick={handleClearData} style={{ backgroundColor: '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: '900' }}>Confirmar BORRADO TOTAL</button>
                </div>
            )}
        </form>

        {unidentified.length > 0 && (
            <div style={{ marginTop: '32px', padding: '24px', backgroundColor: '#fff7ed', borderRadius: '16px', border: '1px solid #ffedd5' }}>
                <h3 style={{ fontWeight: '900', color: '#9a3412', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={20} /> Intervención Requerida
                </h3>
                <p style={{ fontSize: '14px', color: '#c2410c', marginBottom: '16px', fontWeight: '600' }}>
                    Los siguientes técnicos no pudieron ser identificados automáticamente. Por favor, verifique si su DNI o nombre normalizado existen en el sistema.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {unidentified.map((tech, idx) => (
                        <span key={idx} style={{ backgroundColor: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: '1px solid #fed7aa', color: '#9a3412' }}>
                            {tech}
                        </span>
                    ))}
                </div>
            </div>
        )}

        {summary && (
            <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '16px' }}>
                <h3 style={{ fontWeight: '900' }}>Éxito: Datos Procesados</h3>
                <p>Registros correctamente vinculados: {summary.processed}</p>
                {clearStatus && <p style={{ fontSize: '12px', color: '#666' }}>{clearStatus}</p>}
            </div>
        )}
      </div>
    </div>
  );
}
