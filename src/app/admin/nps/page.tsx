'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardCopy, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Table, 
  FileSpreadsheet,
  Trash2
} from 'lucide-react';

interface ProcessingSummary {
  total: number;
  processed: number;
  errors: string[];
}

export default function NPSAdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [authError, setAuthError] = useState(false);

  const [activeTab, setActiveTab] = useState<'agregado' | 'detalles'>('agregado');
  const [pastedData, setPastedData] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ProcessingSummary | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (user === 'adornor' && pass === 'Bera4545') {
      setIsLoggedIn(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const parseData = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return null;

    const headerText = lines[0];
    let separator = '\t';
    if (headerText.includes('\t')) separator = '\t';
    else if (headerText.includes(';')) separator = ';';
    else if (headerText.includes('|')) separator = '|';
    else if (headerText.includes(',')) separator = ',';

    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => line.split(separator).map(cell => cell.trim()));

    return { headers, rows };
  };

  const handleProcessAgregado = async (headers: string[], rows: string[][]) => {
    const dataToInsert = rows.map(row => {
      const mesIdx = headers.indexOf('mes');
      const distritoIdx = headers.indexOf('distrito');
      const celulaIdx = headers.indexOf('celula');
      const npsIdx = headers.indexOf('nps');
      const totalIdx = headers.indexOf('total_encuestas');

      if (mesIdx === -1 || npsIdx === -1) throw new Error('Faltan columnas críticas (mes, nps)');

      return {
        mes: row[mesIdx],
        distrito: row[distritoIdx] || 'VARELA',
        celula: row[celulaIdx] || null,
        nps: parseFloat(row[npsIdx].replace(',', '.')),
        total_encuestas: parseInt(row[totalIdx] || '0')
      };
    });

    const { error } = await supabase.from('nps_agregado').upsert(dataToInsert, { onConflict: 'mes, distrito, celula' });
    if (error) throw error;
    return dataToInsert.length;
  };

  const handleProcessDetalles = async (headers: string[], rows: string[][]) => {
    // Prioritize variants in order
    const getIdx = (variants: string[]) => {
      for (const variant of variants) {
        const idx = headers.findIndex(h => h.includes(variant));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const accessIdIdx = getIdx(['access', 'id']);
    const fechaIdx = getIdx(['fecha', 'cita', 'date']);
    const celulaIdx = getIdx(['celula', 'tx_celula', 'unidad']);
    const dniIdx = getIdx(['dni', 'documento', 'legajo']);
    const nombreIdx = getIdx(['nombre', 'agente', 'apellido', 'tecnico']);
    const recIdx = getIdx(['recomendacion', 'score']);
    const cordIdx = getIdx(['cordialidad']);
    const promIdx = getIdx(['promotor']);
    const detrIdx = getIdx(['detractor']);
    const obsRecIdx = getIdx(['obs_recomendacion', 'comentario', 'observacion']);
    const obsWappIdx = getIdx(['obs_wapp', 'whatsapp']);
    const obsResIdx = getIdx(['obs_resoluci', 'descargo', 'gestion']);

    if (accessIdIdx === -1 || fechaIdx === -1) {
      throw new Error(`Faltan columnas críticas. Detectadas: ${headers.join(', ')}`);
    }

    const dataToInsert = rows.map(row => {
      let fechaRaw = row[fechaIdx] || '';
      let fechaIso = fechaRaw;

      // Robust date parsing (DD/MM/YYYY HH:MM)
      if (fechaRaw.includes('/')) {
        // Split by any whitespace (space, tab, etc.)
        const parts = fechaRaw.split(/\s+/);
        const dateParts = parts[0].split('/');
        
        if (dateParts.length === 3) {
          let [day, month, year] = dateParts;
          day = day.padStart(2, '0');
          month = month.padStart(2, '0');
          
          // Handle 2-digit years
          if (year.length === 2) year = '20' + year;
          
          const time = parts[1] || '00:00';
          // Ensure time is HH:MM:SS
          const timeParts = time.split(':');
          const hh = (timeParts[0] || '00').padStart(2, '0');
          const mm = (timeParts[1] || '00').padStart(2, '0');
          const ss = (timeParts[2] || '00').padStart(2, '0');
          
          fechaIso = `${year}-${month}-${day}T${hh}:${mm}:${ss}`;
        }
      } else if (fechaRaw && !isNaN(Date.parse(fechaRaw))) {
        fechaIso = new Date(fechaRaw).toISOString();
      }

      return {
        access_id: row[accessIdIdx],
        fecha: fechaIso,
        tx_celula: celulaIdx !== -1 ? row[celulaIdx] : 'SIN CELULA',
        dni_tecnico: dniIdx !== -1 ? row[dniIdx] : null,
        nombre_tecnico: nombreIdx !== -1 ? row[nombreIdx] : null,
        recomendacion: recIdx !== -1 ? parseInt(row[recIdx] || '0') : 0,
        cordialidad_tecnico: cordIdx !== -1 ? parseInt(row[cordIdx] || '0') : 0,
        promotor: promIdx !== -1 ? parseInt(row[promIdx] || '0') : 0,
        detractor: detrIdx !== -1 ? parseInt(row[detrIdx] || '0') : 0,
        obs_recomendacion: obsRecIdx !== -1 ? row[obsRecIdx] : null,
        obs_wapp: obsWappIdx !== -1 ? row[obsWappIdx] : null,
        obs_resoluci: obsResIdx !== -1 ? row[obsResIdx] : null
      };
    });

    const { error } = await supabase.from('nps_detalles').upsert(dataToInsert, { onConflict: 'access_id' });
    if (error) throw error;
    return dataToInsert.length;
  };

  const handleUpload = async () => {
    if (!pastedData.trim()) return;
    setLoading(true);
    setSummary(null);

    try {
      const parsed = parseData(pastedData);
      if (!parsed) throw new Error('No se detectaron datos válidos');

      let count = 0;
      if (activeTab === 'agregado') {
        count = await handleProcessAgregado(parsed.headers, parsed.rows);
      } else {
        count = await handleProcessDetalles(parsed.headers, parsed.rows);
      }

      setSummary({ total: parsed.rows.length, processed: count, errors: [] });
      setPastedData('');
    } catch (err: any) {
      console.error(err);
      setSummary({ total: 0, processed: 0, errors: [err.message] });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '24px', textAlign: 'center' }}>NPS Admin Login</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" value={user} onChange={(e) => setUser(e.target.value)} placeholder="Usuario" style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Contraseña" style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
            {authError && <p style={{ color: 'red', textAlign: 'center' }}>Error de acceso</p>}
            <button type="submit" style={{ padding: '12px', backgroundColor: '#000', color: '#fff', borderRadius: '12px', fontWeight: '900' }}>Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '950', letterSpacing: '-1px' }}>Carga de Datos NPS</h1>
        <p style={{ color: '#64748b', fontWeight: '600' }}>Importación de datos desde Excel para el Dashboard de Encuestas.</p>
      </header>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button 
          onClick={() => { setActiveTab('agregado'); setSummary(null); }}
          style={{ 
            flex: 1, padding: '16px', borderRadius: '16px', fontWeight: '900', 
            backgroundColor: activeTab === 'agregado' ? '#019df4' : 'white',
            color: activeTab === 'agregado' ? 'white' : '#64748b',
            border: activeTab === 'agregado' ? 'none' : '1px solid #e2e8f0'
          }}
        >
          Resumen NPS (Agregado)
        </button>
        <button 
          onClick={() => { setActiveTab('detalles'); setSummary(null); }}
          style={{ 
            flex: 1, padding: '16px', borderRadius: '16px', fontWeight: '900',
            backgroundColor: activeTab === 'detalles' ? '#019df4' : 'white',
            color: activeTab === 'detalles' ? 'white' : '#64748b',
            border: activeTab === 'detalles' ? 'none' : '1px solid #e2e8f0'
          }}
        >
          Detalle Encuestas (Crudo)
        </button>
      </div>

      <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #eef2f6' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '16px' }}>
          {activeTab === 'agregado' ? 'Pegar Dataset Agregado' : 'Pegar Dataset Detalle'}
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
          {activeTab === 'agregado' 
            ? 'Columnas requeridas: mes (MM-YYYY), distrito, celula, nps, total_encuestas'
            : 'Columnas requeridas: access_id, fecha, tx_celula, dni_tecnico, nombre_tecnico, recomendacion, cordialidad_tecnico, promotor, detractor, obs_recomendacion, obs_wapp, obs_resoluci'
          }
        </p>

        <textarea 
          value={pastedData}
          onChange={(e) => setPastedData(e.target.value)}
          placeholder="Pega aquí los datos desde Excel (incluyendo cabeceras)..."
          style={{ 
            width: '100%', height: '300px', padding: '20px', borderRadius: '16px', 
            border: '2px solid #f1f5f9', fontFamily: 'monospace', fontSize: '13px',
            marginBottom: '24px'
          }}
        />

        <button 
          onClick={handleUpload}
          disabled={loading || !pastedData}
          style={{ 
            width: '100%', padding: '18px', backgroundColor: '#000', color: '#fff', 
            borderRadius: '16px', fontWeight: '950', cursor: 'pointer',
            opacity: loading || !pastedData ? 0.6 : 1
          }}
        >
          {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Procesar e Importar Datos'}
        </button>

        {summary && (
          <div style={{ marginTop: '24px', padding: '20px', borderRadius: '16px', backgroundColor: summary.errors.length > 0 ? '#fef2f2' : '#f0fdf4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {summary.errors.length > 0 ? <AlertCircle color="red" /> : <CheckCircle2 color="green" />}
              <div>
                <p style={{ fontWeight: '900' }}>{summary.errors.length > 0 ? 'Error en la importación' : 'Importación finalizada'}</p>
                <p style={{ fontSize: '14px' }}>Procesados: {summary.processed} de {summary.total} filas.</p>
              </div>
            </div>
            {summary.errors.map((err, i) => (
              <p key={i} style={{ fontSize: '12px', color: 'red', marginTop: '8px' }}>{err}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
