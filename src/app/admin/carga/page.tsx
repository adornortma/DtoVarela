/**
 * Dashboard de Carga de Datos Admin
 * Actualizado con Sincronización de Técnicos, Smart Matching y Separación por Distrito.
 */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  
  // District State
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedDistrictSlug, setSelectedDistrictSlug] = useState<string>('varela');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [availableCells, setAvailableCells] = useState<string[]>([]);

  const [distritoKPIs, setDistritoKPIs] = useState({
    resolucion: '',
    reiteros: '',
    puntualidad: '',
    productividad: ''
  });
  const [distritoLoading, setDistritoLoading] = useState(false);
  const [distritoStatus, setDistritoStatus] = useState<string | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'resumen' | 'detalle' | 'mensual'>('resumen');
  const [lluvia, setLluvia] = useState(false);
  const [mensualData, setMensualData] = useState({
    mes: 'Marzo',
    distrito: 'DISTRITO',
    resolucion: '',
    reiteros: '',
    puntualidad: '',
    productividad: ''
  });
  const [mensualLoading, setMensualLoading] = useState(false);
  const [mensualStatus, setMensualStatus] = useState<string | null>(null);

  // Initialize selectedDate
  useEffect(() => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Fetch rain status
  useEffect(() => {
    const fetchRain = async () => {
      const { data } = await supabase.from('dias_operativos').select('lluvia').eq('fecha', selectedDate).maybeSingle();
      setLluvia(data?.lluvia || false);
    };
    if (selectedDate) fetchRain();
  }, [selectedDate]);

  // Fetch Districts on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      const { data } = await supabase.from('distritos').select('*').order('nombre');
      if (data && data.length > 0) {
        setDistricts(data);
        const def = data.find(d => d.slug === 'varela') || data[0];
        if (def) {
          setSelectedDistrictSlug(def.slug);
          setSelectedDistrictId(def.id);
        }
      }
    };
    fetchDistricts();
  }, []);

  // Sync selectedDistrictId
  useEffect(() => {
    const dist = districts.find(d => d.slug === selectedDistrictSlug);
    if (dist) {
      setSelectedDistrictId(dist.id);
    }
  }, [selectedDistrictSlug, districts]);

  // Fetch available cells when district changes
  useEffect(() => {
    const fetchCells = async () => {
      if (!selectedDistrictId) return;
      const { data } = await supabase
        .from('celulas')
        .select('nombre')
        .eq('distrito_id', selectedDistrictId)
        .order('nombre');
      
      if (data && data.length > 0) {
        const cellNames = data.map(c => c.nombre);
        setAvailableCells(cellNames);
        setMensualData(m => ({ ...m, distrito: 'DISTRITO' }));
      } else if (selectedDistrictSlug === 'varela') {
        setAvailableCells(['BERAZATEGUI', 'BERNAL', 'QUILMES', 'RANELAGH', 'VARELA 1', 'VARELA 2']);
      } else {
        setAvailableCells([]);
      }
    };
    fetchCells();
  }, [selectedDistrictId, selectedDistrictSlug]);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === 'adornor' && pass === 'Bera4545') {
       setIsLoggedIn(true);
       setAuthError(false);
    } else {
       setAuthError(true);
    }
  };

  // Ensure Cell exists in DB
  const checkAndInsertCell = async (cell: string, distId: string) => {
    const cleanCell = cell.toUpperCase().trim();
    if (!cleanCell || cleanCell === 'DISTRITO') return;
    const { data } = await supabase.from('celulas').select('id').eq('nombre', cleanCell).eq('distrito_id', distId).maybeSingle();
    if (!data) {
      await supabase.from('celulas').insert({ nombre: cleanCell, distrito_id: distId });
      // Refresh available cells list
      const { data: updatedCells } = await supabase.from('celulas').select('nombre').eq('distrito_id', distId).order('nombre');
      if (updatedCells) {
        setAvailableCells(updatedCells.map(c => c.nombre));
      }
    }
  };

  // Process Carga Mensual Manual
  const handleProcessMensual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistrictId) return;
    setMensualLoading(true);
    setMensualStatus(null);
    try {
      const { mes, distrito, resolucion, reiteros, puntualidad, productividad } = mensualData;
      if (!mes || !distrito) throw new Error("Mes y Célula Operativa son requeridos");
      
      const resVal = resolucion ? parseFloat(resolucion.replace(',', '.')) : null;
      const reiVal = reiteros ? parseFloat(reiteros.replace(',', '.')) : null;
      const punVal = puntualidad ? parseFloat(puntualidad.replace(',', '.')) : null;
      const proVal = productividad ? parseFloat(productividad.replace(',', '.')) : null;

      if (resVal !== null && (resVal < 0 || resVal > 100)) throw new Error("La Resolución debe estar entre 0 y 100");
      if (reiVal !== null && (reiVal < 0 || reiVal > 100)) throw new Error("Los Reiteros deben estar entre 0 y 100");
      if (punVal !== null && (punVal < 0 || punVal > 100)) throw new Error("La Puntualidad debe estar entre 0 y 100");
      if (proVal !== null && proVal < 0) throw new Error("La Productividad debe ser mayor o igual a 0");

      const cleanUpdatePayload: any = {
        distrito_id: selectedDistrictId
      };
      if (resVal !== null) cleanUpdatePayload.resolucion = resVal;
      if (reiVal !== null) cleanUpdatePayload.reiteros = reiVal;
      if (punVal !== null) cleanUpdatePayload.puntualidad = punVal;
      if (proVal !== null) cleanUpdatePayload.productividad = proVal;

      // Auto-insert cell if it doesn't exist
      if (distrito !== 'DISTRITO') {
        await checkAndInsertCell(distrito, selectedDistrictId);
      }

      const { data: existingCell } = await supabase
        .from('metricas_mensuales')
        .select('id')
        .eq('celula', distrito)
        .eq('mes', mes)
        .eq('distrito_id', selectedDistrictId)
        .is('tecnico_id', null)
        .maybeSingle();

      let dbError = null;
      if (existingCell) {
         const { error } = await supabase.from('metricas_mensuales').update(cleanUpdatePayload).eq('id', existingCell.id);
         dbError = error;
      } else {
         const { error } = await supabase.from('metricas_mensuales').insert({ celula: distrito, mes, ...cleanUpdatePayload });
         dbError = error;
      }

      if (dbError) throw dbError;
      setMensualStatus("✅ Datos mensuales de Célula/Distrito guardados con éxito.");
      setTimeout(() => setMensualStatus(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMensualStatus(`❌ Error: ${err.message}`);
    } finally {
      setMensualLoading(false);
    }
  };

  const parseNum = (val: string, type: 'percentage' | 'number'): number => {
    if (!val || val === "") return 0;
    const clean = val.replace('%', '').replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Process pasted daily details (actuaciones)
  const handleProcessActuaciones = async () => {
    if (!pastedData.trim() || !selectedDistrictId) return;
    setLoading(true);
    setSummary(null);
    const errors: string[] = [];
    let processedCount = 0;

    try {
      const initialRows = pastedData.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      const headerText = initialRows[0];
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
        if (rawDate.includes('/')) {
          const parts = rawDate.split('/');
          if (parts[2]?.length === 4) rawDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        
        return {
          tx_celula: row[idxCelula]?.toUpperCase().replace(/_/g, ' ') || 'SIN CELULA',
          fecha_cita: rawDate,
          estado: row[idxEstado]?.toUpperCase() || 'DESCONOCIDO',
          recurso: row[idxRecurso] || 'SIN NOMBRE',
          resolucion: row[idxResolucion] || '',
          distrito_id: selectedDistrictId
        };
      }).filter(r => {
        const isCancelled = ['CANCELADO', 'CANCELADA', 'DESESTIMADO', 'RECHAZADO'].includes(r.estado);
        const isEmpty = r.recurso === 'SIN NOMBRE';
        return !isCancelled && !isEmpty;
      });

      if (toInsert.length > 0) {
        // Ensure cells are registered
        const uniqueCells = Array.from(new Set(toInsert.map(r => r.tx_celula)));
        for (const cell of uniqueCells) {
          await checkAndInsertCell(cell, selectedDistrictId);
        }

        const { error } = await supabase.from('actuaciones').insert(toInsert);
        if (error) throw error;
        
        await supabase.from('dias_operativos').upsert({ fecha: selectedDate, lluvia: lluvia });
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

    } catch (err: any) {
      console.error(err);
      errors.push(`${err.message}`);
      setSummary({ total: 0, processed: 0, errors, techniciansCreated: 0, cellTotalsProcessed: 0, kpisDetected: [] });
    } finally {
      setLoading(false);
    }
  };

  // Process pasted Excel metrics (resumen/mensual tabs)
  const handleProcessData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'detalle') {
      return handleProcessActuaciones();
    }
    if (!pastedData.trim() || !selectedDistrictId) return;
    if (activeTab !== 'mensual' && !selectedDate) return;
    
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
            if (row[idx] !== undefined && row[idx] !== null && row[idx] !== "") {
              kpiValues[key] = parseNum(row[idx], type);
            }
          });

          const updatePayload: any = { ...kpiValues, distrito_id: selectedDistrictId };
          if (rawCelula) updatePayload.celula = rawCelula;

          if (activeTab === 'mensual' && updatePayload.hasOwnProperty('reitero')) {
             updatePayload.reiteros = updatePayload.reitero;
             delete updatePayload.reitero;
          }

          if (rawCelula) {
             await checkAndInsertCell(rawCelula, selectedDistrictId);
          }

          if (rawTecnico.toUpperCase().includes('TOTAL')) {
            const celulaName = rawCelula || rawTecnico.replace(/TOTAL\s+/i, '').trim();
            await checkAndInsertCell(celulaName, selectedDistrictId);

            if (activeTab === 'mensual') {
              const { data: existingCell } = await supabase.from('metricas_mensuales').select('id').eq('celula', celulaName).eq('mes', mensualData.mes).eq('distrito_id', selectedDistrictId).is('tecnico_id', null).maybeSingle();
              if (existingCell) {
                await supabase.from('metricas_mensuales').update(updatePayload).eq('id', existingCell.id);
              } else {
                await supabase.from('metricas_mensuales').insert({ celula: celulaName, mes: mensualData.mes, ...updatePayload });
              }
            } else {
              const { data: existingCell } = await supabase.from('metricas_celula').select('id').eq('celula', celulaName).eq('fecha', selectedDate).eq('distrito_id', selectedDistrictId).maybeSingle();
              if (existingCell) {
                await supabase.from('metricas_celula').update(updatePayload).eq('id', existingCell.id);
              } else {
                await supabase.from('metricas_celula').insert({ celula: celulaName, fecha: selectedDate, ...updatePayload });
              }
            }
            cellTotalsCount++;
            processedCount++;
            continue;
          }

          const techInput = parseTechnicianInput(rawTecnico);
          let tecnicoId = null;

          // Lookup technicians strictly within the selected district
          if (techInput.dni) {
            const { data: t } = await supabase.from('tecnicos').select('id').eq('dni', techInput.dni).eq('distrito_id', selectedDistrictId).maybeSingle();
            if (t) tecnicoId = t.id;
          }

          if (!tecnicoId) {
            const { data: t } = await supabase.from('tecnicos').select('id').eq('nombre_normalizado', techInput.normalized).eq('distrito_id', selectedDistrictId).maybeSingle();
            if (t) tecnicoId = t.id;
          }

          if (!tecnicoId) {
            const { data: a } = await supabase
              .from('tecnico_alias')
              .select('tecnico_id, tecnicos!inner(distrito_id)')
              .eq('valor_original', rawTecnico)
              .eq('tecnicos.distrito_id', selectedDistrictId)
              .maybeSingle();
            if (a) tecnicoId = a.tecnico_id;
          }

          if (tecnicoId) {
            const { data: existingAlias } = await supabase.from('tecnico_alias').select('id').eq('tecnico_id', tecnicoId).eq('valor_original', rawTecnico).maybeSingle();
            if (!existingAlias) {
              await supabase.from('tecnico_alias').insert({ tecnico_id: tecnicoId, valor_original: rawTecnico, tipo: techInput.dni ? 'dni_nombre' : 'nombre' });
            }
            
            let cellToSave = rawCelula;
            if (!cellToSave) {
              const { data: lastMetric } = await supabase.from('metricas').select('celula').eq('tecnico_id', tecnicoId).eq('distrito_id', selectedDistrictId).not('celula', 'eq', 'DISTRITO').order('fecha', { ascending: false }).limit(1).maybeSingle();
              cellToSave = lastMetric?.celula || "DISTRITO";
            }

            const { data: existingMetric } = activeTab === 'mensual' 
              ? await supabase.from('metricas_mensuales').select('id').eq('tecnico_id', tecnicoId).eq('mes', mensualData.mes).eq('distrito_id', selectedDistrictId).maybeSingle()
              : await supabase.from('metricas').select('id').eq('tecnico_id', tecnicoId).eq('fecha', selectedDate).eq('distrito_id', selectedDistrictId).maybeSingle();

            if (existingMetric) {
                if (activeTab === 'mensual') {
                  await supabase.from('metricas_mensuales').update({ celula: cellToSave, ...updatePayload }).eq('id', existingMetric.id);
                } else {
                  await supabase.from('metricas').update({ celula: cellToSave, ...updatePayload }).eq('id', existingMetric.id);
                }
            } else {
                if (activeTab === 'mensual') {
                  await supabase.from('metricas_mensuales').insert({ tecnico_id: tecnicoId, mes: mensualData.mes, celula: cellToSave, ...updatePayload });
                } else {
                  await supabase.from('metricas').insert({ tecnico_id: tecnicoId, fecha: selectedDate, celula: cellToSave, ...updatePayload });
                }
            }
            processedCount++;
          } else if (techInput.dni) {
            // Auto create technician linked to correct district
            const { data: n } = await supabase.from('tecnicos').insert({
              dni: techInput.dni,
              nombre_normalizado: techInput.normalized,
              apellido: techInput.name.split(',')[0].trim(),
              nombre: techInput.name.split(',')[1]?.trim() || "",
              distrito_id: selectedDistrictId
            }).select('id').single();

            if (n) {
              autoCreatedCount++;
              if (activeTab === 'mensual') {
                await supabase.from('metricas_mensuales').insert({
                  tecnico_id: n.id,
                  mes: mensualData.mes,
                  celula: rawCelula || "DISTRITO",
                  ...updatePayload
                });
              } else {
                await supabase.from('metricas').insert({
                  tecnico_id: n.id,
                  fecha: selectedDate,
                  celula: rawCelula || "DISTRITO",
                  ...updatePayload
                });
              }
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
      if (errors.length === 0 && processedCount > 0) {
        await supabase.from('dias_operativos').upsert({ fecha: selectedDate, lluvia: lluvia });
        setPastedData('');
      }

    } catch (err: any) {
      console.error(err);
      errors.push(`Error crítico: ${err.message}`);
      setSummary({ total: 0, processed: 0, errors, techniciansCreated: 0, cellTotalsProcessed: 0, kpisDetected: [] });
    } finally {
      setLoading(false);
    }
  };

  // Clear data safely for the active district
  const handleClearData = async () => {
    if (!selectedDistrictId) return;
    setLoading(true);
    setClearStatus("Borrando...");
    try {
      if (activeTab === 'resumen') {
        await supabase.from('metricas').delete().eq('fecha', selectedDate).eq('distrito_id', selectedDistrictId);
        await supabase.from('metricas_celula').delete().eq('fecha', selectedDate).eq('distrito_id', selectedDistrictId);
      } else {
        await supabase.from('actuaciones').delete().eq('fecha_cita', selectedDate).eq('distrito_id', selectedDistrictId);
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

  // Update District default targets/KPIs
  const handleUpdateDistrito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistrictId) return;
    setDistritoLoading(true);
    await supabase.from('indicadores_distrito').insert({
        resolucion: parseNum(distritoKPIs.resolucion, 'percentage'),
        reiteros: parseNum(distritoKPIs.reiteros, 'percentage'),
        puntualidad: parseNum(distritoKPIs.puntualidad, 'percentage'),
        productividad: parseNum(distritoKPIs.productividad, 'number'),
        updated_at: new Date().toISOString(),
        distrito_id: selectedDistrictId
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
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '8px', backgroundColor: '#019df4', borderRadius: '10px', color: 'white' }}>
              <Zap size={20} fill="currentColor" />
            </div>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#019df4', letterSpacing: '1px', textTransform: 'uppercase' }}>Sistema de Carga Pro</span>
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: '950', color: '#1a1a1a', letterSpacing: '-2px', lineHeight: '1' }}>Sincronización Cloud</h1>
        </div>

        {/* Dynamic District Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seleccionar Distrito Activo</label>
          <select 
            value={selectedDistrictSlug} 
            onChange={(e) => setSelectedDistrictSlug(e.target.value)}
            style={{ padding: '10px 20px', borderRadius: '12px', border: '2px solid #eef2f6', fontWeight: '900', fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
          >
            {districts.map(d => (
              <option key={d.id} value={d.slug}>{d.nombre}</option>
            ))}
          </select>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '28px', border: '1px solid #eef2f6' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '950', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#1a1a1a' }}>
                <ClipboardCopy size={22} color="#019df4" /> KPIs Districtuales ({selectedDistrictSlug === 'varela' ? 'Varela' : 'Lanús'})
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
                {distritoStatus && (
                  <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#065f46', fontSize: '12px', fontWeight: '800', textAlign: 'center' }}>
                    {distritoStatus}
                  </div>
                )}
                <button type="submit" style={{ width: '100%', backgroundColor: '#1a171e', color: 'white', padding: '16px', borderRadius: '16px', fontWeight: '950', cursor: 'pointer' }}>
                    {distritoLoading ? "..." : "Actualizar Distrito"}
                </button>
            </form>
          </div>
          
          <div style={{ backgroundColor: '#fff1f2', padding: '24px', borderRadius: '24px', border: '1px solid #fecdd3' }}>
             <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#be123c', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} /> Zona de Peligro ({selectedDistrictSlug === 'varela' ? 'Varela' : 'Lanús'})
             </h3>
             <p style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '16px', fontWeight: '700' }}>Borrar datos existentes para la fecha seleccionada ({selectedDate}).</p>
             {!showClearConfirm ? (
               <button onClick={() => setShowClearConfirm(true)} style={{ width: '100%', padding: '12px', backgroundColor: '#be123c', color: 'white', borderRadius: '12px', border: 'none', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}>Borrar Datos del Día</button>
             ) : (
               <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleClearData} style={{ flex: 1, padding: '12px', backgroundColor: '#e11d48', color: 'white', borderRadius: '12px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>Confirmar</button>
                  <button onClick={() => setShowClearConfirm(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>Cancelar</button>
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
             <button 
                onClick={() => setActiveTab('mensual')}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '12px', 
                  backgroundColor: activeTab === 'mensual' ? 'white' : 'transparent',
                  color: activeTab === 'mensual' ? '#019df4' : '#64748b',
                  fontWeight: '900',
                  boxShadow: activeTab === 'mensual' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
             >
                Carga Mensual
             </button>
             <Link 
                href="/admin/nps"
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '12px', 
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  fontWeight: '900',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Carga NPS
              </Link>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '950', color: '#1a1a1a', marginBottom: '8px' }}>
              {activeTab === 'resumen' ? 'Importación Resumen KPI' : activeTab === 'detalle' ? 'Importación Detalle Diario' : 'Carga de KPIs Mensuales'}
            </h2>
            <p style={{ color: '#64748b', fontWeight: '700' }}>
               {activeTab === 'resumen' 
                ? 'Reporte de productividad agregada por técnico.' 
                : activeTab === 'detalle' ? 'Detalle individual de cada actuación realzada hoy.' : 'Carga de resultados cerrados de mes completo por Distrito.'}
            </p>
          </div>

          {activeTab === 'detalle' && (
            <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '16px', border: '1px solid #bae6fd', marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#0369a1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 <Info size={14} /> Formato Requerido
              </h4>
              <p style={{ fontSize: '11px', color: '#0c4a6e', fontWeight: '700', fontFamily: 'monospace', marginBottom: '4px' }}>
                TX_CELULA [TAB] fecha_Cita [TAB] ESTADO [TAB] RECURSO [TAB] RESOLUCION
              </p>
              <p style={{ fontSize: '10px', color: '#0369a1', fontWeight: '800' }}>
                * El sistema filtrará automáticamente estados: CANCELADO, DESESTIMADO o RECHAZADO y asociará los datos al distrito activo.
              </p>
            </div>
          )}

          {activeTab === 'mensual' ? (
            <>
              <form onSubmit={handleProcessData}>
                <div style={{ marginBottom: '24px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '900' }}>
                         MES DE MÉTRICAS (Aplica para ambos formularios)
                     </label>
                   </div>
                   <select 
                     value={mensualData.mes}
                     onChange={(e) => setMensualData({...mensualData, mes: e.target.value})}
                     style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', fontWeight: '900', fontSize: '14px', backgroundColor: '#f8fafc' }}
                   >
                     <option value="Marzo">Marzo</option>
                     <option value="Abril">Abril</option>
                     <option value="Mayo">Mayo</option>
                     <option value="Junio">Junio</option>
                     <option value="Julio">Julio</option>
                   </select>
                 </div>

                 <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b', marginBottom: '8px', display: 'block' }}>1. Carga Masiva de Técnicos (Pegar desde Excel)</label>
                     <textarea 
                       value={pastedData} 
                       onChange={(e) => setPastedData(e.target.value)} 
                       placeholder="Pega aquí (Técnico, Productividad, Resolución, Reiteros, Puntualidad...)" 
                       style={{ width: '100%', height: '240px', padding: '20px', borderRadius: '20px', border: '2px solid #f1f5f9', fontFamily: 'monospace', fontSize: '12px' }} 
                     />
                 </div>

                 <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: '#019df4', color: 'white', padding: '20px', borderRadius: '20px', fontWeight: '950', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(1, 157, 244, 0.3)', marginBottom: '40px' }}>
                     {loading ? "Procesando..." : "Sincronizar Cloud (KPIs Mensuales)"}
                 </button>
              </form>

              <div style={{ height: '1px', backgroundColor: '#e2e8f0', marginBottom: '40px' }} />

              <form onSubmit={handleProcessMensual}>
                <div style={{ marginBottom: '24px' }}>
                   <label style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b', marginBottom: '8px', display: 'block' }}>2. Carga Manual de Totales (Distrito / Células)</label>
                   <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '16px' }}>Usa este formulario para cargar las tarjetas globales que aparecen en la parte superior del Dashboard.</p>
                   
                   <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>Entidad Operativa ({selectedDistrictSlug === 'varela' ? 'Varela' : 'Lanús'})</label>
                      <select 
                        value={mensualData.distrito}
                        onChange={(e) => setMensualData({...mensualData, distrito: e.target.value})}
                        style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', fontWeight: '900', fontSize: '14px', backgroundColor: '#f8fafc' }}
                      >
                        <option value="DISTRITO">{`Total Distrito ${selectedDistrictSlug === 'varela' ? 'Varela' : 'Lanús'} (Tarjetas Globales)`}</option>
                        {availableCells.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                   </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                  <div>
                     <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>Resolución (%)</label>
                     <input 
                       type="text" 
                       placeholder="Ej: 85.5"
                       value={mensualData.resolucion}
                       onChange={(e) => setMensualData({...mensualData, resolucion: e.target.value})}
                       style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', fontWeight: '900', fontSize: '14px' }}
                     />
                  </div>
                  <div>
                     <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>Reiteros (%)</label>
                     <input 
                       type="text" 
                       placeholder="Ej: 12.3"
                       value={mensualData.reiteros}
                       onChange={(e) => setMensualData({...mensualData, reiteros: e.target.value})}
                       style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', fontWeight: '900', fontSize: '14px' }}
                     />
                  </div>
                  <div>
                     <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>Puntualidad (%)</label>
                     <input 
                       type="text" 
                       placeholder="Ej: 95.0"
                       value={mensualData.puntualidad}
                       onChange={(e) => setMensualData({...mensualData, puntualidad: e.target.value})}
                       style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', fontWeight: '900', fontSize: '14px' }}
                     />
                  </div>
                  <div>
                     <label style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', marginBottom: '8px', display: 'block' }}>Productividad</label>
                     <input 
                       type="text" 
                       placeholder="Ej: 4.2"
                       value={mensualData.productividad}
                       onChange={(e) => setMensualData({...mensualData, productividad: e.target.value})}
                       style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '2px solid #e2e8f0', fontWeight: '900', fontSize: '14px' }}
                     />
                  </div>
                </div>

                {mensualStatus && (
                   <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: mensualStatus.includes('✅') ? '#f0fdf4' : '#fef2f2', color: mensualStatus.includes('✅') ? '#166534' : '#991b1b', fontWeight: '800', marginBottom: '24px', textAlign: 'center' }}>
                      {mensualStatus}
                   </div>
                )}

                <button type="submit" disabled={mensualLoading} style={{ width: '100%', backgroundColor: '#1e293b', color: 'white', padding: '20px', borderRadius: '20px', fontWeight: '950', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0,0,0, 0.1)' }}>
                    {mensualLoading ? "Guardando..." : "Guardar Totales Mensuales"}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleProcessData}>
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '900' }}>
                          <Calendar size={18} color="#019df4" /> {activeTab === 'resumen' ? 'FECHA DE MÉTRICAS' : 'FECHA DE ACTUACIONES'}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', backgroundColor: lluvia ? '#e0f2fe' : '#f8fafc', padding: '6px 12px', borderRadius: '10px', border: lluvia ? '1px solid #bae6fd' : '1px solid #e2e8f0', transition: 'all 0.2s' }}>
                        <input type="checkbox" checked={lluvia} onChange={(e) => setLluvia(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                        <span style={{ fontSize: '12px', fontWeight: '800', color: lluvia ? '#0369a1' : '#64748b' }}>🌧️ Hubo lluvia hoy</span>
                      </label>
                    </div>
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
          )}

          {summary && (
              <div style={{ marginTop: '32px' }}>
                <div style={{ padding: '28px', backgroundColor: '#f0fdf4', borderRadius: '28px', border: '1px solid #dcfce7' }}>
                   <h3 style={{ fontWeight: '950', color: '#065f46', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} /> Carga Finalizada ({selectedDistrictSlug === 'varela' ? 'Varela' : 'Lanús'})
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
