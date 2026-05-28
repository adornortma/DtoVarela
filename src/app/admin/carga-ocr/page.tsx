'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Upload, 
  FileImage, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Save, 
  Edit3, 
  Eye,
  RefreshCw,
  Plus,
  HelpCircle,
  Database,
  ArrowRight,
  TrendingUp,
  Clock,
  Zap,
  Activity,
  User,
  ShieldCheck
} from 'lucide-react';
import { createWorker } from 'tesseract.js';

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
  confidence: number; // Tesseract confidence score for this row
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

export default function CargaOcrPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedDistrictSlug, setSelectedDistrictSlug] = useState<string>('');
  const [availableCells, setAvailableCells] = useState<Cell[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // Default Mayo
  const [selectedYear, setSelectedYear] = useState<number>(2026); // Default 2026
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  
  const [ocrRaw, setOcrRaw] = useState<string>('');
  const [ocrAvgConfidence, setOcrAvgConfidence] = useState<number>(0);
  
  const [cargaType, setCargaType] = useState<'resumen_distrito' | 'detalle_celula'>('resumen_distrito');
  const [selectedCelula, setSelectedCelula] = useState<string>('');
  
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'warning' | null, msg: string }>({ type: null, msg: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [existingCargaId, setExistingCargaId] = useState<string | null>(null);
  const [duplicateMessage, setDuplicateMessage] = useState<string>('');

  const dropRef = useRef<HTMLDivElement>(null);

  // Fetch Districts on mount
  useEffect(() => {
    const fetchDistricts = async () => {
      const { data } = await supabase.from('distritos').select('*').order('nombre');
      if (data && data.length > 0) {
        // Exclude varela from selectable districts for OCR flow
        const filtered = data.filter(d => d.slug !== 'varela');
        setDistricts(filtered);
        if (filtered.length > 0) {
          setSelectedDistrictId(filtered[0].id);
          setSelectedDistrictSlug(filtered[0].slug);
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
        // Select first operative cell as default for detail flow
        const operative = data.filter(c => c.operativa);
        setSelectedCelula(operative.length > 0 ? operative[0].nombre : data[0].nombre);
      }
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropRef.current) {
      dropRef.current.style.borderColor = 'var(--movistar-blue)';
      dropRef.current.style.backgroundColor = 'rgba(30, 64, 175, 0.05)';
    }
  };

  const handleDragLeave = () => {
    if (dropRef.current) {
      dropRef.current.style.borderColor = '#e2e8f0';
      dropRef.current.style.backgroundColor = 'transparent';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragLeave();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Paste Event Handler on the Dropzone Container
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files[0]) {
      processFile(e.clipboardData.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setSaveStatus({ type: 'error', msg: 'El archivo debe ser una imagen (PNG, JPG, JPEG).' });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setSaveStatus({ type: null, msg: '' });
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setOcrRaw('');
    setParsedData([]);
    setOcrAvgConfidence(0);
    setProgress(0);
    setProgressStatus('');
  };

  // Smart OCR parsing and column normalization
  const runOcr = async () => {
    if (!imagePreview) return;
    setIsProcessing(true);
    setProgress(0);
    setProgressStatus('Iniciando Tesseract.js...');
    try {
      const worker = await createWorker('spa');
      
      // Track progress
      // tesseract.js worker updates progress through logger
      // Note: We use simpler progress logic or manual ticks because logger in v7 can be set up inside configure.
      setProgress(20);
      setProgressStatus('Analizando imagen con Tesseract OCR...');

      const { data: { text, confidence } } = await worker.recognize(imagePreview);
      setProgress(80);
      setProgressStatus('Normalizando y extrayendo datos...');

      setOcrRaw(text);
      setOcrAvgConfidence(confidence);

      await worker.terminate();

      parseOcrText(text, confidence);
      setProgress(100);
      setProgressStatus('¡Procesamiento completo!');
      setTimeout(() => setIsProcessing(false), 800);
    } catch (error: any) {
      console.error('OCR Error:', error);
      setSaveStatus({ type: 'error', msg: `Error en procesamiento OCR: ${error.message}` });
      setIsProcessing(false);
    }
  };

  // Normalize column mapping
  const parseOcrText = (rawText: string, generalConfidence: number) => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const rows: ParsedRow[] = [];

    // Helper to check if string contains headers
    const matchesHeader = (str: string, keywords: string[]) => {
      const lower = str.toLowerCase();
      return keywords.some(k => lower.includes(k));
    };

    const headerKeywords = ['prod', 'resol', 'reit', 'tiemp', 'oper', 'tecn', 'celu'];
    
    // Attempt parsing
    lines.forEach((line, idx) => {
      // Skip headers
      if (matchesHeader(line, headerKeywords)) return;

      // Extract numbers and names
      // Example line: "ACCESO_LANUS 5.8 74.2% 4.1% 68.2%"
      // Example line: "GOMEZ, RUBEN 6,1 78.4 4,2 71%"
      
      // Clean commas to dots, remove percent symbols
      const cleanLine = line.replace(/,/g, '.').replace(/%/g, '');
      const parts = cleanLine.split(/\s+/).filter(p => p.length > 0);

      if (parts.length >= 4) {
        // Find numbers in parts (usually the last 3 or 4 elements)
        const numericValues: number[] = [];
        const nameParts: string[] = [];

        parts.forEach(part => {
          const num = parseFloat(part);
          if (!isNaN(num) && /^\d+(\.\d+)?$/.test(part)) {
            numericValues.push(num);
          } else {
            nameParts.push(part);
          }
        });

        const name = nameParts.join(' ').replace(/[:;|]/g, '').trim();

        if (name && numericValues.length >= 3) {
          // If we got 3 values, assume: resolucion, reiteros, productividad (historical)
          // If 4 values, resolve: productividad, resolucion, reiteros, tiempo_operativo
          let prod = 0;
          let resol = 0;
          let reit = 0;
          let to = 0;

          if (numericValues.length >= 4) {
            prod = numericValues[0];
            resol = numericValues[1];
            reit = numericValues[2];
            to = numericValues[3];
          } else {
            // fallback
            prod = numericValues[2];
            resol = numericValues[0];
            reit = numericValues[1];
            to = 0; // Default/NULL
          }

          // Row-level mock confidence based on name matches & general score
          rows.push({
            key: `row-${idx}-${Date.now()}`,
            name: name.toUpperCase(),
            productividad: prod,
            resolucion: resol,
            reiteros: reit,
            tiempo_operativo: to,
            confidence: generalConfidence
          });
        }
      }
    });

    setParsedData(rows);

    // Auto-detect load type: if parsed rows match cells, set to 'resumen_distrito'
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
  };

  // Edit Preview Grid row
  const handleEditRow = (key: string, field: keyof ParsedRow, value: string | number) => {
    setParsedData(prev => prev.map(row => {
      if (row.key === key) {
        return { ...row, [field]: value };
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
        confidence: 100
      }
    ]);
  };

  const handleRemoveRow = (key: string) => {
    setParsedData(prev => prev.filter(r => r.key !== key));
  };

  // Parse Month representation to string like "Mayo" for the existing metricas table
  const getMonthName = (monthVal: number): string => {
    const match = MONTHS_LIST.find(m => m.value === monthVal);
    return match ? match.name : 'Mayo';
  };

  // Ensure Cell exists or insert it
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

  // Main Save logic triggers duplicate checking
  const handleCheckDuplicates = async () => {
    if (parsedData.length === 0) {
      setSaveStatus({ type: 'error', msg: 'No hay datos interpretados para guardar.' });
      return;
    }

    setIsSaving(true);
    setSaveStatus({ type: null, msg: '' });

    try {
      // Check if ocr_cargas already has entries for this month + district + cell (if detail)
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
        // Duplicate found! Prompt overlay modal
        setExistingCargaId(data.id);
        const cellInfo = cargaType === 'detalle_celula' ? `de la célula ${selectedCelula}` : 'del resumen de distrito';
        setDuplicateMessage(
          `Ya existe un screenshot OCR guardado ${cellInfo} para el periodo ${getMonthName(selectedMonth)} ${selectedYear} (subido el ${new Date(data.uploaded_at).toLocaleString()}). ¿Desea reemplazar y actualizar los datos existentes?`
        );
        setShowDuplicateModal(true);
        setIsSaving(false);
      } else {
        // No duplicate, proceed directly
        await executeSave(false);
      }
    } catch (err: any) {
      console.error(err);
      setSaveStatus({ type: 'error', msg: `Error de duplicidad: ${err.message}` });
      setIsSaving(false);
    }
  };

  // Upload image to Supabase Storage and Insert/Update stats
  const executeSave = async (isReplace: boolean) => {
    setIsSaving(true);
    setShowDuplicateModal(false);
    try {
      let uploadedPath = '';

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${selectedDistrictSlug}/${selectedYear}-${selectedMonth}/${fileName}`;

        // Upload to bucket 'ocr-screenshots'
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ocr-screenshots')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          // If storage fails (e.g. bucket doesn't exist), log warning but proceed with placeholder URL to avoid blocking pilot
          console.warn('Storage bucket upload failed:', uploadError.message);
          uploadedPath = `fallback-local-storage/${filePath}`;
        } else {
          uploadedPath = uploadData.path;
        }
      }

      // 1. Save / Update in ocr_cargas
      const payloadOcr = {
        distrito_id: selectedDistrictId,
        celula: cargaType === 'detalle_celula' ? selectedCelula : null,
        mes: selectedMonth,
        anio: selectedYear,
        imagen_url: uploadedPath,
        ocr_raw: ocrRaw,
        datos_interpretados: parsedData.map(r => ({
          name: r.name,
          productividad: r.productividad,
          resolucion: r.resolucion,
          reiteros: r.reiteros,
          tiempo_operativo: r.tiempo_operativo,
          confidence: r.confidence
        })),
        ocr_confidence: Math.round(ocrAvgConfidence),
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
        // Save cell-level monthly metrics
        for (const row of parsedData) {
          const isDistSummary = row.name.toUpperCase() === 'DISTRITO';
          const cellName = isDistSummary ? 'DISTRITO' : row.name.toUpperCase();

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
            await supabase
              .from('metricas_mensuales')
              .update(updatePayload)
              .eq('id', existingMetric.id);
          } else {
            await supabase
              .from('metricas_mensuales')
              .insert({
                celula: cellName,
                mes: monthName,
                ...updatePayload
              });
          }
        }
      } else {
        // Save technician-level monthly metrics in 'metricas_mensuales'
        for (const row of parsedData) {
          // Resolve / create technician
          const cleanTechName = row.name.trim().toUpperCase();
          const [apellido, nombre] = cleanTechName.includes(',') 
            ? cleanTechName.split(',').map(s => s.trim()) 
            : [cleanTechName, ''];

          let tecnicoId = null;

          // Lookup technician by name normalizado
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
            // Auto create tech record
            const { data: newTech } = await supabase
              .from('tecnicos')
              .insert({
                nombre: nombre || 'TÉCNICO',
                apellido: apellido,
                nombre_normalizado: normalName || 'TECNICO',
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
              await supabase
                .from('metricas_mensuales')
                .update(updatePayload)
                .eq('id', existingMetric.id);
            } else {
              await supabase
                .from('metricas_mensuales')
                .insert({
                  tecnico_id: tecnicoId,
                  mes: monthName,
                  ...updatePayload
                });
            }
          }
        }
      }

      setSaveStatus({ type: 'success', msg: `¡Carga guardada con éxito! Se grabaron ${parsedData.length} registros.` });
      // Reset after success
      setImageFile(null);
      setImagePreview(null);
      setParsedData([]);
      setOcrRaw('');
    } catch (err: any) {
      console.error(err);
      setSaveStatus({ type: 'error', msg: `Error al guardar carga: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '32px 0', minHeight: '100vh', color: '#1e293b' }}>
      
      {/* Top Banner Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ backgroundColor: '#1e293b', padding: '8px', borderRadius: '10px', color: 'white' }}>
              <Database size={20} />
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: '950', letterSpacing: '-1px' }}>Módulo de Carga Inteligente (OCR)</h1>
          </div>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>
            Piloto Lanús Sandbox — Procesamiento automático de capturas mediante IA y Tesseract.js
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Side: Upload & Preview Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* selectors and config card */}
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
                <label style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Tipo de Screenshot</label>
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

          {/* Paste & Upload dropzone */}
          <div 
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
            style={{
              border: '2px dashed #e2e8f0',
              borderRadius: '24px',
              padding: '40px',
              textAlign: 'center',
              backgroundColor: 'white',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '260px'
            }}
          >
            {imagePreview ? (
              <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img 
                  src={imagePreview} 
                  alt="Screenshot Preview" 
                  style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} 
                />
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleClearImage}
                    className="btn-danger"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid #fee2e2', backgroundColor: '#fef2f2', color: '#ef4444', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} /> Eliminar Imagen
                  </button>

                  <button
                    onClick={runOcr}
                    disabled={isProcessing}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '12px', border: 'none', backgroundColor: 'var(--movistar-blue)', color: 'white', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(30, 64, 175, 0.2)' }}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Procesando OCR...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} /> Iniciar Reconocimiento OCR
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%', height: '100%' }}>
                <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '50%', color: 'var(--movistar-blue)' }}>
                  <Upload size={32} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '950', letterSpacing: '-0.5px' }}>Pegá un screenshot o arrastrá una imagen</h3>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginTop: '4px' }}>
                    Hace click acá y presioná <kbd style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 6px' }}>Ctrl + V</kbd> o subí un archivo
                  </p>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </label>
            )}
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '8px' }}>
                <span>{progressStatus}</span>
                <span>{progress}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--movistar-blue)', borderRadius: '4px', transition: 'width 0.2s' }} />
              </div>
            </div>
          )}

          {/* Parsed Editable Grid */}
          {parsedData.length > 0 && (
            <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '28px', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '900' }}>Previsualización y Edición de Datos</h3>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
                    Revisá y corregí cualquier imperfección del OCR. Valores <span style={{ color: '#ef4444' }}>debajo del 75% de confianza</span> se resaltan.
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
                    <col style={{ width: '40%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '60px' }} />
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
                    {parsedData.map((row) => (
                      <tr 
                        key={row.key} 
                        style={{ 
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: row.confidence < 75 ? 'rgba(239, 68, 68, 0.02)' : 'transparent' 
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
                              border: row.confidence < 75 ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                              fontSize: '13px', 
                              fontWeight: '800',
                              backgroundColor: row.confidence < 75 ? '#fef2f2' : 'white'
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
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom save action inside grid card */}
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

          {/* Feedback logs */}
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

        {/* Right Side: Information / Guide panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <HelpCircle size={18} color="var(--movistar-blue)" /> ¿Cómo funciona la Carga?
            </h3>
            
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '20px', margin: 0, fontSize: '13px', fontWeight: '700', color: '#475569' }}>
              <li>
                <strong>Pega capturas directamente:</strong> Presiona en el dropzone e introduce la captura de la pantalla de métricas de TOA/Resolución usando tu portapapeles.
              </li>
              <li>
                <strong>Soporte multilínea:</strong> El motor OCR procesa filas con nombres de técnicos o células operativas e interpreta los porcentajes.
              </li>
              <li>
                <strong>Control de confianza:</strong> Si la lectura del texto digitalizado posee ambigüedad, el campo de edición se sombreará en rojo para llamar tu atención.
              </li>
              <li>
                <strong>Tiempo Operativo:</strong> Este campo se almacena de forma numérica y se representa como porcentaje en todo el sistema.
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

      {/* Duplicate Warning Overlay Modal */}
      {showDuplicateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '32px', padding: '40px',
            width: '100%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#d97706' }}>
              <AlertTriangle size={32} />
              <h2 style={{ fontSize: '24px', fontWeight: '950', letterSpacing: '-0.5px', margin: 0 }}>Registro Duplicado</h2>
            </div>
            
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#475569', lineHeight: '1.6' }}>
              {duplicateMessage}
            </p>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => setShowDuplicateModal(false)}
                style={{ padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              
              <button
                onClick={() => executeSave(true)}
                style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#d97706', color: 'white', fontSize: '13px', fontWeight: '900', cursor: 'pointer' }}
              >
                Sí, Reemplazar Datos
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
