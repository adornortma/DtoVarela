'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Clipboard, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Save, 
  Plus, 
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

interface District {
  id: string;
  nombre: string;
  slug: string;
}

interface Cell {
  id: string;
  nombre: string;
  operativa: boolean;
}

interface ParsedRow {
  key: string; // unique temp key for react list
  name: string; // tech name or cell name
  productividad: number;
  resolucion: number;
  reiteros: number;
  tiempo_operativo: number;
  confidence: number;
  edited?: boolean; // track manual adjustments
}

const MONTHS_LIST = [
  { value: 1, name: 'Enero' },
  { value: 2, name: 'Febrero' },
  { value: 3, name: 'Marzo' },
  { value: 4, name: 'Abril' },
  { value: 5, name: 'Mayo' },
  { value: 6, name: 'Junio' },
  { value: 7, name: 'Julio' },
  { value: 8, name: 'Agosto' },
  { value: 9, name: 'Septiembre' },
  { value: 10, name: 'Octubre' },
  { value: 11, name: 'Noviembre' },
  { value: 12, name: 'Diciembre' },
];

export default function CargaTextoPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedDistrictSlug, setSelectedDistrictSlug] = useState<string>('');
  const [availableCells, setAvailableCells] = useState<Cell[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // Default Mayo
  const [selectedYear, setSelectedYear] = useState<number>(2026); // Default 2026
  
  const [pastedText, setPastedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [cargaType, setCargaType] = useState<'resumen_distrito' | 'detalle_celula'>('resumen_distrito');
  const [selectedCelula, setSelectedCelula] = useState<string>('');
  
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'warning' | null, msg: string }>({ type: null, msg: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [willReplace, setWillReplace] = useState(false);
  const [existingCargaId, setExistingCargaId] = useState<string | null>(null);

  const [mensualData, setMensualData] = useState({
    mes: 'Mayo',
    distrito: 'DISTRITO',
    resolucion: '',
    reiteros: '',
    puntualidad: '',
    productividad: '',
    tiempo_operativo: ''
  });
  const [mensualLoading, setMensualLoading] = useState(false);
  const [mensualStatus, setMensualStatus] = useState<{ type: 'success' | 'error' | null, msg: string }>({ type: null, msg: '' });

  // Fetch Districts on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      const { data } = await supabase.from('distritos').select('*').order('nombre');
      if (data && data.length > 0) {
        // Exclude varela from selectable districts
        const filtered = data.filter(d => d.slug !== 'varela');
        setDistricts(filtered);
        if (filtered.length > 0) {
          const savedSlug = localStorage.getItem('selected_carga_district_slug');
          const found = savedSlug ? filtered.find(d => d.slug === savedSlug) : null;
          if (found) {
            setSelectedDistrictId(found.id);
            setSelectedDistrictSlug(found.slug);
          } else {
            setSelectedDistrictId(filtered[0].id);
            setSelectedDistrictSlug(filtered[0].slug);
          }
        }
      }
    };
    fetchDistricts();
  }, []);

  // Sync slug and load cells when district changes
  useEffect(() => {
    const dist = districts.find(d => d.id === selectedDistrictId);
    if (dist) {
      setSelectedDistrictSlug(dist.slug);
      localStorage.setItem('selected_carga_district_slug', dist.slug);
      window.dispatchEvent(new Event('carga_district_changed'));
      fetchCells(dist.id);
    }
  }, [selectedDistrictId, districts]);

  const fetchCells = async (distId: string) => {
    const { data } = await supabase
      .from('celulas')
      .select('id, nombre, operativa')
      .eq('distrito_id', distId)
      .order('nombre');
    if (data) {
      setAvailableCells(data);
      if (data.length > 0) {
        const operative = data.filter(c => c.operativa);
        setSelectedCelula(operative.length > 0 ? operative[0].nombre : data[0].nombre);
      }
    }
  };

  // Helper to parse numbers and NA values to 0
  const parseValue = (valStr: string | undefined): number => {
    if (!valStr) return 0;
    const cleanVal = valStr.replace(/%/g, '').replace(/,/g, '.').trim();
    if (/^(n\/a|na|n\.a\.?)$/i.test(cleanVal)) {
      return 0;
    }
    const parsed = parseFloat(cleanVal);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Parse clipboard/pasted text
  const handleProcessText = () => {
    if (!pastedText.trim()) {
      setSaveStatus({ type: 'error', msg: 'Por favor, pega el texto de la tabla antes de procesar.' });
      return;
    }

    setIsProcessing(true);
    setSaveStatus({ type: null, msg: '' });

    try {
      const lines = pastedText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      const rows: ParsedRow[] = [];

      let headerIdxs = {
        name: -1,
        productividad: -1,
        resolucion: -1,
        reiteros: -1,
        tiempo_operativo: -1
      };

      let headerFound = false;
      let dataStartLine = 0;

      // Scan first few lines for header keywords
      for (let i = 0; i < Math.min(lines.length, 3); i++) {
        const line = lines[i];
        let cols = line.split(/\t/).map(p => p.trim());
        if (cols.length <= 1) {
          cols = line.split(/\s{2,}/).map(p => p.trim());
        }

        const hasHeaderKeywords = cols.some(col => 
          /nombre|prod|resol|reit|tiemp|oper|celu/i.test(col)
        );

        if (hasHeaderKeywords) {
          cols.forEach((col, idx) => {
            const cleanCol = col.toLowerCase();
            if (cleanCol.includes('nombre') || cleanCol.includes('técnico') || cleanCol.includes('tecnico') || cleanCol.includes('célula') || cleanCol.includes('celula')) {
              headerIdxs.name = idx;
            } else if (cleanCol.includes('prod') || cleanCol.includes('productividad')) {
              headerIdxs.productividad = idx;
            } else if (cleanCol.includes('resol') || cleanCol.includes('resolución')) {
              headerIdxs.resolucion = idx;
            } else if (cleanCol.includes('reit') || cleanCol.includes('reitero')) {
              headerIdxs.reiteros = idx;
            } else if (cleanCol.includes('tiemp') || cleanCol.includes('oper') || cleanCol.includes('tiempo operativo')) {
              headerIdxs.tiempo_operativo = idx;
            }
          });
          headerFound = true;
          dataStartLine = i + 1;
          break;
        }
      }

      // Default fallback ordering
      if (!headerFound) {
        headerIdxs = {
          name: 0,
          productividad: 1,
          resolucion: 2,
          reiteros: 3,
          tiempo_operativo: 4
        };
        dataStartLine = 0;
      }

      // Process data lines
      for (let i = dataStartLine; i < lines.length; i++) {
        const line = lines[i];
        
        let cols = line.split(/\t/).map(p => p.trim());
        if (cols.length <= 1) {
          cols = line.split(/\s{2,}/).map(p => p.trim());
        }
        
        // Single space fallback logic (with name parsing support)
        if (cols.length <= 1) {
          const parts = line.split(/\s+/).map(p => p.trim()).filter(p => p.length > 0);
          if (parts.length >= 4) {
            const numericParts: string[] = [];
            const nameParts: string[] = [];
            
            parts.forEach(part => {
              const cleanPart = part.replace(/%/g, '').replace(/,/g, '.');
              const isNum = !isNaN(parseFloat(cleanPart)) && /^\d+(\.\d+)?$/.test(cleanPart);
              const isNA = /^(n\/a|na|n\.a\.?)$/i.test(cleanPart);
              if (isNum || isNA) {
                numericParts.push(part);
              } else {
                nameParts.push(part);
              }
            });

            if (nameParts.length > 0 && numericParts.length >= 3) {
              cols = [nameParts.join(' '), ...numericParts];
              headerIdxs = {
                name: 0,
                productividad: 1,
                resolucion: 2,
                reiteros: 3,
                tiempo_operativo: 4
              };
            }
          }
        }

        if (cols.length > 0) {
          const nameVal = cols[headerIdxs.name] || '';
          if (nameVal && nameVal !== 'Nombre' && nameVal !== 'NOMBRE' && nameVal !== 'Técnico' && nameVal !== 'TECNICO') {
            const prod = headerIdxs.productividad !== -1 ? parseValue(cols[headerIdxs.productividad]) : 0;
            const resol = headerIdxs.resolucion !== -1 ? parseValue(cols[headerIdxs.resolucion]) : 0;
            const reit = headerIdxs.reiteros !== -1 ? parseValue(cols[headerIdxs.reiteros]) : 0;
            const to = headerIdxs.tiempo_operativo !== -1 ? parseValue(cols[headerIdxs.tiempo_operativo]) : 0;

            rows.push({
              key: `row-${i}-${Date.now()}`,
              name: nameVal.toUpperCase().replace(/[:;|]/g, '').trim(),
              productividad: prod,
              resolucion: resol,
              reiteros: reit,
              tiempo_operativo: to,
              confidence: 100
            });
          }
        }
      }

      setParsedData(rows);

      // Auto-detect load type
      if (rows.length > 0) {
        const cellNames = new Set(availableCells.map(c => c.nombre.toUpperCase()));
        let cellMatches = 0;
        rows.forEach(r => {
          if (cellNames.has(r.name.toUpperCase())) {
            cellMatches++;
          }
        });
        if (cellMatches >= rows.length / 2) {
          setCargaType('resumen_distrito');
        } else {
          setCargaType('detalle_celula');
        }
      }

      setSaveStatus({ type: 'success', msg: `Se interpretaron con éxito ${rows.length} filas.` });
    } catch (err: any) {
      console.error(err);
      setSaveStatus({ type: 'error', msg: `Error al procesar el texto: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Edit Preview Grid row
  const handleEditRow = (key: string, field: keyof ParsedRow, value: string | number) => {
    setParsedData(prev => prev.map(row => {
      if (row.key === key) {
        return { ...row, [field]: value, edited: true };
      }
      return row;
    }));
  };

  const handleAddRow = () => {
    setParsedData(prev => [
      ...prev,
      {
        key: `row-new-${Date.now()}`,
        name: 'NUEVO REGISTRO',
        productividad: 0,
        resolucion: 0,
        reiteros: 0,
        tiempo_operativo: 0,
        confidence: 100,
        edited: true
      }
    ]);
  };

  const handleRemoveRow = (key: string) => {
    setParsedData(prev => prev.filter(r => r.key !== key));
  };

  const getMonthName = (monthVal: number): string => {
    const match = MONTHS_LIST.find(m => m.value === monthVal);
    return match ? match.name : 'Mayo';
  };

  const checkAndInsertCell = async (cellName: string) => {
    const clean = cellName.toUpperCase().trim();
    if (!clean) return;
    const { data } = await supabase
      .from('celulas')
      .select('id')
      .eq('nombre', clean)
      .eq('distrito_id', selectedDistrictId)
      .maybeSingle();

    if (!data) {
      await supabase.from('celulas').insert({
        nombre: clean,
        distrito_id: selectedDistrictId,
        operativa: true
      });
    }
  };

  // Duplicate warning checks
  const handleCheckDuplicates = async () => {
    if (parsedData.length === 0) {
      setSaveStatus({ type: 'error', msg: 'No hay datos interpretados para guardar.' });
      return;
    }

    if (!selectedDistrictId) {
      setSaveStatus({ type: 'error', msg: 'Distrito no seleccionado.' });
      return;
    }
    if (cargaType === 'detalle_celula' && !selectedCelula) {
      setSaveStatus({ type: 'error', msg: 'Célula de destino no seleccionada.' });
      return;
    }

    setIsSaving(true);
    setSaveStatus({ type: null, msg: '' });

    try {
      let query = supabase
        .from('ocr_cargas')
        .select('id, uploaded_at')
        .eq('distrito_id', selectedDistrictId)
        .eq('mes', selectedMonth)
        .eq('anio', selectedYear);

      if (cargaType === 'detalle_celula') {
        query = query.eq('celula', selectedCelula);
      } else {
        query = query.is('celula', null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;

      if (data) {
        setExistingCargaId(data.id);
        setWillReplace(true);
      } else {
        setExistingCargaId(null);
        setWillReplace(false);
      }

      setShowConfirmModal(true);
      setIsSaving(false);
    } catch (err: any) {
      console.error(err);
      setSaveStatus({ type: 'error', msg: `Error de duplicidad: ${err.message}` });
      setIsSaving(false);
    }
  };

  // Final confirmation Save
  const executeSave = async (isReplace: boolean) => {
    setIsSaving(true);
    setShowConfirmModal(false);
    try {
      // 1. Log load raw details in ocr_cargas
      const payloadOcr = {
        distrito_id: selectedDistrictId,
        celula: cargaType === 'detalle_celula' ? selectedCelula : null,
        mes: selectedMonth,
        anio: selectedYear,
        imagen_url: null,
        ocr_raw: pastedText,
        datos_interpretados: parsedData.map(r => ({
          name: r.name,
          productividad: r.productividad,
          resolucion: r.resolucion,
          reiteros: r.reiteros,
          tiempo_operativo: r.tiempo_operativo
        })),
        ocr_confidence: 100,
        replaced_previous: isReplace,
        processing_status: 'confirmed'
      };

      if (isReplace && existingCargaId) {
        const { error } = await supabase
          .from('ocr_cargas')
          .update(payloadOcr)
          .eq('id', existingCargaId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ocr_cargas')
          .insert(payloadOcr);
        if (error) throw error;
      }

      // 2. Insert cell metrics or technician metrics
      const monthName = getMonthName(selectedMonth);

      if (cargaType === 'resumen_distrito') {
        for (const row of parsedData) {
          const isDistSummary = row.name.toUpperCase() === 'DISTRITO';
          const cellName = isDistSummary 
            ? (selectedDistrictSlug === 'varela' ? 'DISTRITO' : `DISTRITO_${selectedDistrictSlug.toUpperCase()}`) 
            : row.name.toUpperCase();

          if (!isDistSummary) {
            await checkAndInsertCell(cellName);
          }

          const updatePayload = {
            resolucion: row.resolucion,
            reiteros: row.reiteros,
            productividad: row.productividad,
            tiempo_operativo: row.tiempo_operativo,
            distrito_id: selectedDistrictId
          };

          const { data: existingMetric } = await supabase
            .from('metricas_mensuales')
            .select('id')
            .eq('celula', cellName)
            .eq('mes', monthName)
            .eq('distrito_id', selectedDistrictId)
            .is('tecnico_id', null)
            .maybeSingle();

          if (existingMetric) {
            const { error: updateError } = await supabase
              .from('metricas_mensuales')
              .update(updatePayload)
              .eq('id', existingMetric.id);
            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from('metricas_mensuales')
              .insert({
                celula: cellName,
                mes: monthName,
                ...updatePayload
              });
            if (insertError) throw insertError;
          }
        }
      } else {
        // Save detail of technicians
        for (const row of parsedData) {
          const cleanTechName = row.name.trim().toUpperCase();
          const [apellido, nombre] = cleanTechName.includes(',') 
            ? cleanTechName.split(',').map(s => s.trim()) 
            : [cleanTechName, ''];

          let tecnicoId = null;
          const normalName = cleanTechName.replace(/[^A-Z]/g, '');
          
          const { data: tech } = await supabase
            .from('tecnicos')
            .select('id')
            .ilike('nombre_normalizado', `%${normalName}%`)
            .limit(1)
            .maybeSingle();

          if (tech) {
            tecnicoId = tech.id;
          } else {
            const mockDni = 'TEMP-' + Math.floor(10000000 + Math.random() * 90000000);
            const { data: newTech } = await supabase
              .from('tecnicos')
              .insert({
                nombre: nombre || 'TÉCNICO',
                apellido: apellido,
                nombre_normalizado: normalName || 'TECNICO',
                dni: mockDni,
                distrito_id: selectedDistrictId
              })
              .select('id')
              .single();
            if (newTech) tecnicoId = newTech.id;
          }

          if (tecnicoId) {
            const updatePayload = {
              resolucion: row.resolucion,
              reiteros: row.reiteros,
              productividad: row.productividad,
              tiempo_operativo: row.tiempo_operativo,
              distrito_id: selectedDistrictId,
              celula: selectedCelula
            };

            const { data: existingMetric } = await supabase
              .from('metricas_mensuales')
              .select('id')
              .eq('tecnico_id', tecnicoId)
              .eq('mes', monthName)
              .eq('distrito_id', selectedDistrictId)
              .maybeSingle();

            if (existingMetric) {
              const { error: updateError } = await supabase
                .from('metricas_mensuales')
                .update(updatePayload)
                .eq('id', existingMetric.id);
              if (updateError) throw updateError;
            } else {
              const { error: insertError } = await supabase
                .from('metricas_mensuales')
                .insert({
                  tecnico_id: tecnicoId,
                  mes: monthName,
                  ...updatePayload
                });
              if (insertError) throw insertError;
            }
          }
        }
      }

      setSaveStatus({ type: 'success', msg: `¡Carga guardada con éxito! Se grabaron ${parsedData.length} registros.` });
      setPastedText('');
      setParsedData([]);
    } catch (err: any) {
      console.error(err);
      setSaveStatus({ type: 'error', msg: `Error al guardar carga: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProcessMensual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistrictId) return;
    setMensualLoading(true);
    setMensualStatus({ type: null, msg: '' });
    try {
      const { mes, distrito, resolucion, reiteros, puntualidad, productividad, tiempo_operativo } = mensualData;
      if (!mes || !distrito) throw new Error("Mes y Célula/Distrito son requeridos");
      
      const resVal = resolucion ? parseFloat(resolucion.replace(',', '.')) : null;
      const reiVal = reiteros ? parseFloat(reiteros.replace(',', '.')) : null;
      const punVal = puntualidad ? parseFloat(puntualidad.replace(',', '.')) : null;
      const proVal = productividad ? parseFloat(productividad.replace(',', '.')) : null;
      const toVal = tiempo_operativo ? parseFloat(tiempo_operativo.replace(',', '.')) : null;

      if (resVal !== null && (resVal < 0 || resVal > 100)) throw new Error("La Resolución debe estar entre 0 y 100");
      if (reiVal !== null && (reiVal < 0 || reiVal > 100)) throw new Error("Los Reiteros deben estar entre 0 y 100");
      if (punVal !== null && (punVal < 0 || punVal > 100)) throw new Error("La Puntualidad debe estar entre 0 y 100");
      if (proVal !== null && proVal < 0) throw new Error("La Productividad debe ser mayor o igual a 0");
      if (toVal !== null && (toVal < 0 || toVal > 100)) throw new Error("El Tiempo Operativo debe estar entre 0 y 100");

      const cleanUpdatePayload: any = {
        distrito_id: selectedDistrictId
      };
      if (resVal !== null) cleanUpdatePayload.resolucion = resVal;
      if (reiVal !== null) cleanUpdatePayload.reiteros = reiVal;
      if (punVal !== null) cleanUpdatePayload.puntualidad = punVal;
      if (proVal !== null) cleanUpdatePayload.productividad = proVal;
      if (toVal !== null) cleanUpdatePayload.tiempo_operativo = toVal;

      const dbCelula = distrito === 'DISTRITO'
        ? (selectedDistrictSlug === 'varela' ? 'DISTRITO' : `DISTRITO_${selectedDistrictSlug.toUpperCase()}`)
        : distrito;

      const { data: existingCell } = await supabase
        .from('metricas_mensuales')
        .select('id')
        .eq('celula', dbCelula)
        .eq('mes', mes)
        .eq('distrito_id', selectedDistrictId)
        .is('tecnico_id', null)
        .maybeSingle();

      let dbError = null;
      if (existingCell) {
         const { error } = await supabase.from('metricas_mensuales').update(cleanUpdatePayload).eq('id', existingCell.id);
         dbError = error;
      } else {
         const { error } = await supabase.from('metricas_mensuales').insert({ celula: dbCelula, mes, ...cleanUpdatePayload });
         dbError = error;
      }

      if (dbError) throw dbError;
      setMensualStatus({ type: 'success', msg: "✅ Totales mensuales guardados con éxito." });
      
      // Reset values
      setMensualData(prev => ({
        ...prev,
        resolucion: '',
        reiteros: '',
        puntualidad: '',
        productividad: '',
        tiempo_operativo: ''
      }));
      
      // Notify components if needed
      window.dispatchEvent(new Event('carga_district_changed'));
    } catch (err: any) {
      console.error(err);
      setMensualStatus({ type: 'error', msg: `❌ Error: ${err.message}` });
    } finally {
      setMensualLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 0', minHeight: '100vh', color: '#1e293b' }}>
      
      {/* Top Banner Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ backgroundColor: '#1e293b', padding: '8px', borderRadius: '10px', color: 'white' }}>
              <Clipboard size={20} />
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: '950', letterSpacing: '-1px' }}>Módulo de Carga por Copiar/Pegar</h1>
          </div>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>
            Piloto Lanús Sandbox — Pega directamente el texto o tablas copiadas de navegadores o Excel.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Side: Textarea & Preview Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Config card */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--movistar-blue)" /> Configuración de Carga
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Distrito Sandbox</label>
                <select
                  value={selectedDistrictId}
                  onChange={(e) => setSelectedDistrictId(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800', backgroundColor: 'white' }}
                >
                  {districts.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Periodo (Mes)</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800', backgroundColor: 'white' }}
                >
                  {MONTHS_LIST.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Año</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800', backgroundColor: 'white' }}
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tipo de Carga</label>
                <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                  <button
                    onClick={() => setCargaType('resumen_distrito')}
                    style={{ flex: 1, padding: '8px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '900', backgroundColor: cargaType === 'resumen_distrito' ? 'white' : 'transparent', color: cargaType === 'resumen_distrito' ? '#1e293b' : '#64748b', boxShadow: cargaType === 'resumen_distrito' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                  >
                    Resumen Distrito
                  </button>
                  <button
                    onClick={() => setCargaType('detalle_celula')}
                    style={{ flex: 1, padding: '8px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '900', backgroundColor: cargaType === 'detalle_celula' ? 'white' : 'transparent', color: cargaType === 'detalle_celula' ? '#1e293b' : '#64748b', boxShadow: cargaType === 'detalle_celula' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                  >
                    Detalle Célula
                  </button>
                </div>
              </div>

              {cargaType === 'detalle_celula' && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Célula Destino</label>
                  <select
                    value={selectedCelula}
                    onChange={(e) => setSelectedCelula(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800', backgroundColor: 'white' }}
                  >
                    {availableCells.map(c => <option key={c.id} value={c.nombre}>{c.nombre} {c.operativa === false ? '(NO OPERATIVA)' : ''}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Large Text Area */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '14px', fontWeight: '900', color: '#1e293b' }}>
                Copiar y Pegar Tabla
              </label>
              {pastedText && (
                <button
                  onClick={() => setPastedText('')}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={14} /> Limpiar
                </button>
              )}
            </div>

            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Pega acá el texto de la tabla (Soporta múltiples espacios, tabs de Excel y saltos de línea)..."
              style={{
                width: '100%',
                height: '180px',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'monospace',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--movistar-blue)'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleProcessText}
                disabled={isProcessing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'var(--movistar-blue)',
                  color: 'white',
                  fontWeight: '900',
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)'
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <Clipboard size={16} /> Procesar texto
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Parsed Preview Grid */}
          {parsedData.length > 0 && (
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '28px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '900' }}>Previsualización y Edición de Datos</h3>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                    Revisá, agregá o eliminá registros. Las filas corregidas manualmente se registran para la confirmación.
                  </p>
                </div>

                <button
                  onClick={handleAddRow}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '10px', backgroundColor: 'white', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                >
                  <Plus size={14} /> AGREGAR FILA
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '35%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '50px' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>{cargaType === 'resumen_distrito' ? 'Célula' : 'Nombre Técnico'}</th>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>Prod.</th>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>Resol. %</th>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>Reit. %</th>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '900', color: '#64748b' }}>T. Oper. %</th>
                      <th style={{ padding: '12px 16px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row) => {
                      const hasWarning = row.name === 'NUEVO REGISTRO' || !row.name || row.productividad < 0 || row.resolucion < 0 || row.reiteros < 0 || row.tiempo_operativo < 0;
                      return (
                        <tr 
                          key={row.key} 
                          style={{ 
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: hasWarning ? 'rgba(239, 68, 68, 0.02)' : 'transparent' 
                          }}
                        >
                          <td style={{ padding: '8px 16px' }}>
                            <input 
                              type="text" 
                              value={row.name} 
                              onChange={(e) => handleEditRow(row.key, 'name', e.target.value)}
                              style={{ 
                                width: '100%', 
                                padding: '8px 10px', 
                                borderRadius: '8px', 
                                border: hasWarning ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                fontSize: '13px', 
                                fontWeight: '800',
                                backgroundColor: hasWarning ? '#fef2f2' : 'white'
                              }} 
                            />
                          </td>
                          <td style={{ padding: '8px 16px' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              value={row.productividad} 
                              onChange={(e) => handleEditRow(row.key, 'productividad', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800' }} 
                            />
                          </td>
                          <td style={{ padding: '8px 16px' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              value={row.resolucion} 
                              onChange={(e) => handleEditRow(row.key, 'resolucion', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800' }} 
                            />
                          </td>
                          <td style={{ padding: '8px 16px' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              value={row.reiteros} 
                              onChange={(e) => handleEditRow(row.key, 'reiteros', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800' }} 
                            />
                          </td>
                          <td style={{ padding: '8px 16px' }}>
                            <input 
                              type="number" 
                              step="0.01"
                              value={row.tiempo_operativo} 
                              onChange={(e) => handleEditRow(row.key, 'tiempo_operativo', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800' }} 
                            />
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleRemoveRow(row.key)}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}
                              onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Save trigger button inside card */}
              <div style={{ padding: '20px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                <button
                  onClick={handleCheckDuplicates}
                  disabled={isSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: '900', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Guardando en Base...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Confirmar y Guardar Métricas
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Feedback message logs */}
          {saveStatus.type && (
            <div style={{ 
              borderRadius: '20px', 
              padding: '20px', 
              backgroundColor: saveStatus.type === 'success' ? '#ecfdf5' : saveStatus.type === 'error' ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${saveStatus.type === 'success' ? '#10b98133' : saveStatus.type === 'error' ? '#ef444433' : '#f59e0b33'}`,
              color: saveStatus.type === 'success' ? '#065f46' : saveStatus.type === 'error' ? '#991b1b' : '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              {saveStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              <span style={{ fontSize: '14px', fontWeight: '700' }}>{saveStatus.msg}</span>
            </div>
          )}

        </div>

        {/* Right Side: Instructions guide panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Manual monthly totals card */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ShieldCheck size={18} color="var(--movistar-blue)" /> Carga Manual de Totales
            </h3>
            
            <form onSubmit={handleProcessMensual} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Mes de Carga</label>
                <select
                  value={mensualData.mes}
                  onChange={(e) => setMensualData({...mensualData, mes: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800', backgroundColor: 'white' }}
                >
                  {MONTHS_LIST.map(m => (
                    <option key={m.value} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Entidad Operativa</label>
                <select 
                  value={mensualData.distrito}
                  onChange={(e) => setMensualData({...mensualData, distrito: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800', backgroundColor: 'white' }}
                >
                  <option value="DISTRITO">{`Total Distrito (Tarjetas Globales)`}</option>
                  {availableCells.map(c => (
                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Resolución (%)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 85.5"
                    value={mensualData.resolucion}
                    onChange={(e) => setMensualData({...mensualData, resolucion: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800' }}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Reiteros (%)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 4.2"
                    value={mensualData.reiteros}
                    onChange={(e) => setMensualData({...mensualData, reiteros: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Puntualidad (%)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 95.0"
                    value={mensualData.puntualidad}
                    onChange={(e) => setMensualData({...mensualData, puntualidad: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Productividad</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 6.0"
                    value={mensualData.productividad}
                    onChange={(e) => setMensualData({...mensualData, productividad: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tiempo Operativo (%)</label>
                <input 
                  type="text" 
                  placeholder="Ej: 70.0"
                  value={mensualData.tiempo_operativo}
                  onChange={(e) => setMensualData({...mensualData, tiempo_operativo: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '800' }}
                />
              </div>

              {mensualStatus.msg && (
                <div style={{ 
                  padding: '10px 14px', 
                  borderRadius: '10px', 
                  backgroundColor: mensualStatus.type === 'success' ? '#ecfdf5' : '#fef2f2', 
                  color: mensualStatus.type === 'success' ? '#065f46' : '#991b1b', 
                  fontWeight: '800',
                  fontSize: '12px'
                }}>
                  {mensualStatus.msg}
                </div>
              )}

              <button 
                type="submit" 
                disabled={mensualLoading} 
                style={{ 
                  width: '100%', 
                  backgroundColor: 'var(--movistar-blue)', 
                  color: 'white', 
                  padding: '12px', 
                  borderRadius: '12px', 
                  fontWeight: '900', 
                  fontSize: '13px',
                  cursor: 'pointer', 
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)' 
                }}
              >
                {mensualLoading ? "Guardando..." : "Guardar Totales Mensuales"}
              </button>
            </form>
          </div>

          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <HelpCircle size={18} color="var(--movistar-blue)" /> ¿Cómo funciona la Carga?
            </h3>
            
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '20px', margin: 0, fontSize: '13px', fontWeight: '700', color: '#475569' }}>
              <li>
                <strong>Copia de Excel o Web:</strong> Copia el bloque de datos de la tabla (incluyendo o no la fila de encabezados) y pegala directamente en el cuadro de texto.
              </li>
              <li>
                <strong>Soporte inteligente:</strong> El interpretador de texto procesa delimitaciones por tabulaciones, múltiples espacios y saltos de línea automáticamente.
              </li>
              <li>
                <strong>Auto-Mapping de NA:</strong> Cualquier ocurrencia de <em>n/a%</em>, <em>N/A</em> o similar es interpretada automáticamente como 0.
              </li>
              <li>
                <strong>Edición previa:</strong> Podrás corregir errores de tipeo, borrar filas de totales incorrectas, o agregar elementos a la tabla manualmente antes de guardar.
              </li>
            </ul>
          </div>

          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '24px', padding: '24px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '900', color: 'var(--movistar-blue)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Rangos Semaforización
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800' }}>
                <span>Productividad</span>
                <span style={{ color: '#059669' }}>🟢 ≥ 6.0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800' }}>
                <span>Resolución</span>
                <span style={{ color: '#059669' }}>🟢 ≥ 75%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800' }}>
                <span>Tiempo Operativo</span>
                <span style={{ color: '#059669' }}>🟢 ≥ 70%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800' }}>
                <span>Reiteros</span>
                <span style={{ color: '#059669' }}>🟢 ≤ 4.5%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '32px', padding: '40px',
            width: '100%', maxWidth: '550px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', gap: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--movistar-blue)' }}>
              <ShieldCheck size={32} />
              <h2 style={{ fontSize: '24px', fontWeight: '950', letterSpacing: '-0.5px', margin: 0 }}>Confirmar Guardado</h2>
            </div>
            
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#475569', lineHeight: '1.6', margin: 0 }}>
              Está guardando los KPIs de la célula {cargaType === 'detalle_celula' ? selectedCelula : 'Resumen Distrito'} para el mes de {getMonthName(selectedMonth).toUpperCase()} {selectedYear}. ¿Desea continuar?
            </p>

            <div style={{ 
              backgroundColor: '#f8fafc', 
              borderRadius: '20px', 
              padding: '20px', 
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800' }}>
                <span style={{ color: '#64748b' }}>Distrito:</span>
                <span style={{ color: '#1e293b' }}>{districts.find(d => d.id === selectedDistrictId)?.nombre || 'Lanús'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800' }}>
                <span style={{ color: '#64748b' }}>Célula:</span>
                <span style={{ color: '#1e293b' }}>{cargaType === 'detalle_celula' ? selectedCelula : 'Resumen Distrito'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800' }}>
                <span style={{ color: '#64748b' }}>Mes:</span>
                <span style={{ color: '#1e293b' }}>{getMonthName(selectedMonth)} {selectedYear}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800' }}>
                <span style={{ color: '#64748b' }}>Técnicos detectados:</span>
                <span style={{ color: '#1e293b' }}>{cargaType === 'detalle_celula' ? parsedData.length : 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800' }}>
                <span style={{ color: '#64748b' }}>Filas corregidas manualmente:</span>
                <span style={{ color: parsedData.filter(row => row.edited).length > 0 ? '#f59e0b' : '#1e293b' }}>
                  {parsedData.filter(row => row.edited).length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800' }}>
                <span style={{ color: '#64748b' }}>Reemplazará datos existentes:</span>
                <span style={{ color: willReplace ? '#f59e0b' : '#10b981' }}>
                  {willReplace ? 'SÍ' : 'NO'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              
              <button
                onClick={() => executeSave(willReplace)}
                style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--movistar-blue)', color: 'white', fontSize: '13px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)' }}
              >
                Confirmar guardado
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
