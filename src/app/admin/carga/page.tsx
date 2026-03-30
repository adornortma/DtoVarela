'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardCopy, Calendar, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';

interface ProcessingSummary {
  total: number;
  processed: number;
  errors: string[];
  techniciansCreated: number;
  cellTotalsProcessed: number;
}

export default function CargaAdminPage() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authError, setAuthError] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pastedData, setPastedData] = useState<string>('');
  const [pastedCellData, setPastedCellData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ProcessingSummary | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearStatus, setClearStatus] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === 'adornor' && pass === 'Bera4545') {
       setIsLoggedIn(true);
       setAuthError(false);
    } else {
       setAuthError(true);
    }
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
                    <p style={{ color: '#666', fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>Solo personal autorizado</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usuario</label>
                        <input 
                            type="text" 
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            placeholder="Usuario"
                            style={{ padding: '16px', borderRadius: '12px', border: '2px solid #eef2f6', outline: 'none', fontWeight: '700', color: '#1a1a1a' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contraseña</label>
                        <input 
                            type="password" 
                            value={pass}
                            // @ts-ignore
                            onChange={(e) => setPass(e.target.value)}
                            placeholder="••••••••"
                            style={{ padding: '16px', borderRadius: '12px', border: '2px solid #eef2f6', outline: 'none', fontWeight: '700', color: '#1a1a1a' }}
                        />
                    </div>
                    {authError && (
                        <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '800', textAlign: 'center' }}>Credenciales incorrectas</p>
                    )}
                    <button 
                        type="submit"
                        style={{ backgroundColor: 'var(--movistar-blue)', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontSize: '16px', fontWeight: '950', cursor: 'pointer', marginTop: '8px', boxShadow: '0 10px 15px -3px rgba(1, 157, 244, 0.2)' }}
                    >
                        Ingresar
                    </button>
                </form>
            </div>
        </div>
     );
  }

  // Check if Supabase is configured
  const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isSupabaseConfigured) {
    return (
      <div style={{ padding: '60px 40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '24px', padding: '40px' }}>
          <AlertCircle size={48} color="#f97316" style={{ marginBottom: '20px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#7c2d12', marginBottom: '12px' }}>Configuración Necesaria</h1>
          <p style={{ color: '#9a3412', fontWeight: '600', marginBottom: '24px' }}>
            Las variables de entorno de Supabase no están configuradas. Por favor agrega <strong>NEXT_PUBLIC_SUPABASE_URL</strong> y <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> a tu archivo .env.local.
          </p>
        </div>
      </div>
    );
  }

  // Helper: Extract Info from "APELLIDO, NOMBRE (DNI-XXXXXXXX)" or just "APELLIDO, NOMBRE"
  const parseTechnician = (input: string) => {
    // Try with DNI first
    const dniRegex = /^([^,]+),\s*([^(]+?)\s*\(DNI-([0-9]+)\)$/;
    const dniMatch = input.match(dniRegex);
    if (dniMatch) {
      return {
        apellido: dniMatch[1].trim(),
        nombre: dniMatch[2].trim(),
        dni: dniMatch[3].trim()
      };
    }
    // Try without DNI
    const nameRegex = /^([^,]+),\s*(.+)$/;
    const nameMatch = input.match(nameRegex);
    if (nameMatch) {
      return {
        apellido: nameMatch[1].trim(),
        nombre: nameMatch[2].trim(),
        dni: null
      };
    }
    return null;
  };

  // Helper: Convert string percentage "12,5" to number 12.5
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
    const errors: string[] = [];
    let processedCount = 0;
    let newTechsCount = 0;
    let cellTotalsCount = 0;

    try {
      // 1. Process Technician Data (if present)
      if (pastedData.trim()) {
        const rawLines = pastedData.split('\n').map(line => line.split('\t').map(c => c.trim()));
        const headerIndex = rawLines.findIndex(row => 
          row.some(cell => {
             const v = cell.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
             return v.includes('tecnico') || v === 'agente' || v === 'nombre';
          })
        );

        if (headerIndex === -1) {
          errors.push("No se encontró la columna 'Técnico' en los datos de Técnicos pegados.");
        } else {
          const headers = rawLines[headerIndex];
          const getCol = (variants: string[]) => headers.findIndex(h => 
              variants.some(v => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === v.toLowerCase())
          );

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
            const rowNum = headerIndex + i + 2;

            const rawTecnico = row[colIdx.tecnico] || "";
            const rawReitero = colIdx.reitero !== -1 ? (row[colIdx.reitero] || "0") : "0";
            const rawResolucion = colIdx.resolucion !== -1 ? (row[colIdx.resolucion] || "0") : "0";
            const rawCelula = colIdx.celula !== -1 ? (row[colIdx.celula] || "DISTRITO") : "DISTRITO";
            const rawPuntualidad = colIdx.puntualidad !== -1 ? (row[colIdx.puntualidad] || "0") : "0";
            const rawProductividad = colIdx.productividad !== -1 ? (row[colIdx.productividad] || "0") : "0";

            const reitero = parsePercent(rawReitero);
            const resolucion = parsePercent(rawResolucion);
            const puntualidad = parsePercent(rawPuntualidad);
            const productividad = parsePercent(rawProductividad);

            // Handle Cell Totals inside Technician Data if present
            if (rawTecnico.toUpperCase().includes('TOTAL')) {
              const celulaName = rawCelula || rawTecnico.replace(/TOTAL\s+/i, '').trim();
              const { error: cellErr } = await supabase
                .from('metricas_celula')
                .upsert({
                  celula: celulaName,
                  fecha: selectedDate,
                  reitero,
                  resolucion,
                  puntualidad,
                  productividad
                }, { onConflict: 'celula, fecha' });

              if (cellErr) errors.push(`Datos Técnicos Fila ${rowNum}: Error al guardar total de célula (${celulaName}).`);
              else { cellTotalsCount++; processedCount++; }
              continue;
            }

            const techInfo = parseTechnician(rawTecnico);
            if (!techInfo) {
              errors.push(`Fila ${rowNum}: Formato técnico inválido ("${rawTecnico}").`);
              continue;
            }

            // Technician Logic
            let tecnicoId = "";
            let query = supabase.from('tecnicos').select('id');
            if (techInfo.dni) query = query.eq('dni', techInfo.dni);
            else query = query.eq('nombre', techInfo.nombre).eq('apellido', techInfo.apellido);

            const { data: existingTech } = await query.maybeSingle();

            if (existingTech) tecnicoId = existingTech.id;
            else {
              const { data: newTech, error: insErr } = await supabase
                .from('tecnicos')
                .insert({ nombre: techInfo.nombre, apellido: techInfo.apellido, dni: techInfo.dni })
                .select().single();
              if (insErr) { errors.push(`Fila ${rowNum}: Error al crear técnico.`); continue; }
              tecnicoId = newTech.id;
              newTechsCount++;
            }

            const { error: metErr } = await supabase
              .from('metricas')
              .insert({ tecnico_id: tecnicoId, fecha: selectedDate, reitero, resolucion, puntualidad, productividad, celula: rawCelula });

            if (metErr) { errors.push(`Fila ${rowNum}: Error al guardar métricas.`); continue; }
            processedCount++;
          }
        }
      }

      // 2. Process Cell Totals Data (if present)
      if (pastedCellData.trim()) {
        const cellLines = pastedCellData.split('\n').filter(l => l.trim());
        for (const line of cellLines) {
           const cells = line.split('\t').map(c => c.trim());
           if (cells.length < 5) continue;
           
           const rawTecnico = cells[0];
           if (!rawTecnico.toUpperCase().includes('TOTAL')) continue;
           
           const celulaName = rawTecnico.replace(/TOTAL\s+/i, '').trim();
           const resolucion = parsePercent(cells[1]);
           const reitero = parsePercent(cells[2]);
           const productividad = parsePercent(cells[3]);
           const puntualidad = parsePercent(cells[4]);

           const { error: cellErr } = await supabase
             .from('metricas_celula')
             .upsert({
               celula: celulaName,
               fecha: selectedDate,
               reitero,
               resolucion,
               puntualidad,
               productividad
             }, { onConflict: 'celula, fecha' });

           if (cellErr) errors.push(`Carga Células: Error en ${celulaName}.`);
           else {
             cellTotalsCount++;
             processedCount++;
           }
        }
      }

      setSummary({
        total: (pastedData.trim() ? 1 : 0) + (pastedCellData.trim() ? 1 : 0),
        processed: processedCount,
        errors,
        techniciansCreated: newTechsCount,
        cellTotalsProcessed: cellTotalsCount
      });

    } catch (err) {
      console.error(err);
      errors.push("Error crítico al procesar el texto pegado.");
      setSummary({ total: 0, processed: 0, errors, techniciansCreated: 0, cellTotalsProcessed: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    setLoading(true);
    setClearStatus("Borrando...");
    
    try {
      await supabase
        .from('metricas')
        .delete()
        .eq('fecha', selectedDate);
      
      await supabase
        .from('metricas_celula')
        .delete()
        .eq('fecha', selectedDate);

      setClearStatus(`Éxito: Datos de la semana borrados.`);
      setSummary(null);
      setShowClearConfirm(false);
    } catch (e) {
      setClearStatus("Error de conexión al borrar.");
    } finally {
      setLoading(false);
    }
  };

  const [distritoKPIs, setDistritoKPIs] = useState({
    resolucion: '',
    reiteros: '',
    puntualidad: '',
    productividad: ''
  });
  const [distritoLoading, setDistritoLoading] = useState(false);
  const [distritoStatus, setDistritoStatus] = useState<string | null>(null);

  const handleUpdateDistrito = async (e: React.FormEvent) => {
    e.preventDefault();
    setDistritoLoading(true);
    setDistritoStatus(null);

    const { error } = await supabase
      .from('indicadores_distrito')
      .insert({
        resolucion: parsePercent(distritoKPIs.resolucion),
        reiteros: parsePercent(distritoKPIs.reiteros),
        puntualidad: parsePercent(distritoKPIs.puntualidad),
        productividad: parsePercent(distritoKPIs.productividad),
        updated_at: new Date().toISOString()
      });

    if (error) {
      setDistritoStatus("Error: No se pudieron guardar los indicadores.");
    } else {
      setDistritoStatus("Éxito: Indicadores del distrito actualizados.");
    }
    setDistritoLoading(false);
  };

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto', fontFamily: 'var(--font-manrope)' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#1a1a1a', letterSpacing: '-1px' }}>Sincronización Cloud</h1>
        <p style={{ color: '#666', fontWeight: '600' }}>Carga de KPIs mediante pegado directo desde Excel.</p>
      </header>

      {/* NUEVA SECCIÓN: KPIs DEL DISTRITO */}
      <div style={{ 
          backgroundColor: 'white', 
          padding: '32px', 
          borderRadius: '24px', 
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
          border: '1px solid #eef2f6',
          marginBottom: '32px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1a1a1a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardCopy size={20} color="var(--movistar-blue)" />
            KPIs del Distrito
        </h2>
        <form onSubmit={handleUpdateDistrito} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b' }}>RESOLUCIÓN (%)</label>
                <input 
                    type="text" 
                    value={distritoKPIs.resolucion}
                    onChange={(e) => setDistritoKPIs({...distritoKPIs, resolucion: e.target.value})}
                    placeholder="76,21"
                    style={{ padding: '12px', borderRadius: '10px', border: '2px solid #eef2f6', fontWeight: '700' }}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b' }}>REITEROS (%)</label>
                <input 
                    type="text" 
                    value={distritoKPIs.reiteros}
                    onChange={(e) => setDistritoKPIs({...distritoKPIs, reiteros: e.target.value})}
                    placeholder="5,21"
                    style={{ padding: '12px', borderRadius: '10px', border: '2px solid #eef2f6', fontWeight: '700' }}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b' }}>PUNTUALIDAD (%)</label>
                <input 
                    type="text" 
                    value={distritoKPIs.puntualidad}
                    onChange={(e) => setDistritoKPIs({...distritoKPIs, puntualidad: e.target.value})}
                    placeholder="84,4"
                    style={{ padding: '12px', borderRadius: '10px', border: '2px solid #eef2f6', fontWeight: '700' }}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b' }}>PRODUCTIVIDAD</label>
                <input 
                    type="text" 
                    value={distritoKPIs.productividad}
                    onChange={(e) => setDistritoKPIs({...distritoKPIs, productividad: e.target.value})}
                    placeholder="5,51"
                    style={{ padding: '12px', borderRadius: '10px', border: '2px solid #eef2f6', fontWeight: '700' }}
                />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
                <button 
                    type="submit" 
                    disabled={distritoLoading}
                    style={{ 
                        width: '100%', 
                        backgroundColor: distritoLoading ? '#e2e8f0' : '#1a1a1a', 
                        color: 'white', 
                        padding: '14px', 
                        borderRadius: '12px', 
                        border: 'none', 
                        fontWeight: '900', 
                        cursor: 'pointer' 
                    }}
                >
                    {distritoLoading ? "Actualizando..." : "Actualizar Indicadores del Distrito"}
                </button>
                {distritoStatus && (
                    <p style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '800', color: distritoStatus.includes('Error') ? '#ef4444' : '#16a34a' }}>
                        {distritoStatus}
                    </p>
                )}
            </div>
        </form>
      </div>

      <div style={{ 
          backgroundColor: 'white', 
          padding: '32px', 
          borderRadius: '24px', 
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
          border: '1px solid #eef2f6'
      }}>
        <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '16px', border: '1px solid #e0f2fe' }}>
            <Info size={20} color="var(--movistar-blue)" />
            <p style={{ fontSize: '13px', color: '#0369a1', fontWeight: '700' }}>
                Instrucciones: Selecciona tus datos en Excel, cópialos (Ctrl+C) y pégalos en el cuadro de abajo.
            </p>
        </div>

        <form onSubmit={handleProcessData}>
            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '900', color: '#334155', marginBottom: '12px' }}>
                    <Calendar size={18} color="var(--movistar-blue)" />
                    Fecha de la Semana
                </label>
                <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '2px solid #eef2f6',
                        outline: 'none',
                        fontWeight: '700',
                        fontSize: '15px'
                    }}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginBottom: '32px' }}>
                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '900', color: '#334155', marginBottom: '12px' }}>
                        <ClipboardCopy size={18} color="var(--movistar-blue)" />
                        Datos Técnicos (Individuales)
                    </label>
                    <textarea 
                        value={pastedData}
                        onChange={(e) => setPastedData(e.target.value)}
                        placeholder="Pega técnicos aquí..."
                        style={{
                            width: '100%',
                            height: '240px',
                            padding: '20px',
                            borderRadius: '16px',
                            border: '2px solid #eef2f6',
                            resize: 'none',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            outline: 'none',
                            backgroundColor: '#fbfcfd'
                        }}
                    />
                </div>
                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '900', color: '#334155', marginBottom: '12px' }}>
                        <ClipboardCopy size={18} color="var(--movistar-blue)" />
                        Totales de Célula (KPIs)
                    </label>
                    <textarea 
                        value={pastedCellData}
                        onChange={(e) => setPastedCellData(e.target.value)}
                        placeholder="TOTAL BERAZATEGUI 79,58 6,88 5,42 83,93..."
                        style={{
                            width: '100%',
                            height: '240px',
                            padding: '20px',
                            borderRadius: '16px',
                            border: '2px solid #eef2f6',
                            resize: 'none',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            outline: 'none',
                            backgroundColor: '#fbfcfd'
                        }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                    type="submit"
                    disabled={loading || (!pastedData.trim() && !pastedCellData.trim())}
                    style={{
                        flex: 2,
                        backgroundColor: (loading || (!pastedData.trim() && !pastedCellData.trim())) ? '#e2e8f0' : 'var(--movistar-blue)',
                        color: 'white',
                        padding: '20px',
                        borderRadius: '16px',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: '950',
                        cursor: (loading || (!pastedData.trim() && !pastedCellData.trim())) ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        transition: 'all 0.3s'
                    }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={24} />
                            Procesando...
                        </>
                    ) : "Procesar y Sincronizar"}
                </button>

                {showClearConfirm ? (
                    <button 
                        type="button"
                        onClick={handleClearData}
                        disabled={loading}
                        style={{
                            flex: 1,
                            backgroundColor: '#ef4444',
                            color: 'white',
                            padding: '20px',
                            borderRadius: '16px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: '900',
                            cursor: loading ? 'default' : 'pointer',
                            transition: 'all 0.3s',
                            boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)'
                        }}
                    >
                        {loading ? "Borrando..." : "SÍ, BORRAR TODO"}
                    </button>
                ) : (
                    <button 
                        type="button"
                        onClick={() => setShowClearConfirm(true)}
                        disabled={loading}
                        style={{
                            flex: 1,
                            backgroundColor: 'white',
                            color: '#ef4444',
                            padding: '20px',
                            borderRadius: '16px',
                            border: '2px solid #fee2e2',
                            fontSize: '14px',
                            fontWeight: '800',
                            cursor: loading ? 'default' : 'pointer',
                            transition: 'all 0.3s'
                        }}
                    >
                        Limpiar Semana
                    </button>
                )}
            </div>
            {clearStatus && (
                <div style={{ 
                    marginTop: '16px', 
                    padding: '12px', 
                    borderRadius: '12px', 
                    fontSize: '13px', 
                    fontWeight: '700',
                    textAlign: 'center',
                    backgroundColor: clearStatus.includes('Error') ? '#fef2f2' : '#f0fdf4',
                    color: clearStatus.includes('Error') ? '#ef4444' : '#16a34a',
                    border: `1px solid ${clearStatus.includes('Error') ? '#fee2e2' : '#dcfce7'}`
                }}>
                    {clearStatus}
                </div>
            )}
        </form>
      </div>

      {summary && (
          <div style={{ marginTop: '40px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#1a1a1a', marginBottom: '20px' }}>Resumen de Carga</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #eef2f6' }}>
                      <p style={{ color: '#666', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>Procesados</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={20} color="#10b981" />
                          <span style={{ fontSize: '24px', fontWeight: '950' }}>{summary.processed}</span>
                      </div>
                  </div>
                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #eef2f6' }}>
                      <p style={{ color: '#666', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>Totales de Célula</p>
                      <span style={{ fontSize: '24px', fontWeight: '950' }}>{summary.cellTotalsProcessed}</span>
                  </div>
                  <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #eef2f6' }}>
                      <p style={{ color: '#666', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>Errores</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: summary.errors.length > 0 ? '#ef4444' : '#10b981' }}>
                          <AlertCircle size={20} />
                          <span style={{ fontSize: '24px', fontWeight: '950' }}>{summary.errors.length}</span>
                      </div>
                  </div>
              </div>

              {summary.errors.length > 0 && (
                  <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '16px', padding: '24px' }}>
                      <h4 style={{ color: '#b91c1c', fontWeight: '900', fontSize: '14px', marginBottom: '12px' }}>Errores Detectados</h4>
                      <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                          {summary.errors.map((err, i) => (
                              <li key={i} style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'flex', gap: '8px' }}>
                                  <span>•</span> {err}
                              </li>
                          ))}
                      </ul>
                  </div>
              )}
          </div>
      )}

      <style jsx global>{`
          .animate-spin {
              animation: spin 1s linear infinite;
          }
          @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
          }
      `}</style>
    </div>
  );
}
