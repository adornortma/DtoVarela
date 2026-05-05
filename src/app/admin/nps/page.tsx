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
        distrito: row[distritoIdx] || 'DISTRITO',
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
    const dataToInsert = rows.map(row => {
      const accessIdIdx = headers.indexOf('access_id');
      const fechaIdx = headers.indexOf('fecha');
      const celulaIdx = headers.indexOf('tx_celula');
      const dniIdx = headers.indexOf('dni_tecnico');
      const nombreIdx = headers.indexOf('nombre_tecnico');
      const recIdx = headers.indexOf('recomendacion');
      const cordIdx = headers.indexOf('cordialidad_tecnico');
      const promIdx = headers.indexOf('promotor');
      const detrIdx = headers.indexOf('detractor');
      const obsRecIdx = headers.indexOf('obs_recomendacion');
      const obsWappIdx = headers.indexOf('obs_wapp');
      const obsResIdx = headers.indexOf('obs_resoluci');

      if (accessIdIdx === -1 || fechaIdx === -1) throw new Error('Faltan columnas críticas (access_id, fecha)');

      // Handle Excel date format or string date
      let fecha = row[fechaIdx];
      if (!isNaN(Date.parse(fecha))) {
        fecha = new Date(fecha).toISOString();
      }

      return {
        access_id: row[accessIdIdx],
        fecha: fecha,
        tx_celula: row[celulaIdx] || 'SIN CELULA',
        dni_tecnico: row[dniIdx] || null,
        nombre_tecnico: row[nombreIdx] || null,
        recomendacion: parseInt(row[recIdx] || '0'),
        cordialidad_tecnico: parseInt(row[cordIdx] || '0'),
        promotor: parseInt(row[promIdx] || '0'),
        detractor: parseInt(row[detrIdx] || '0'),
        obs_recomendacion: row[obsRecIdx] || null,
        obs_wapp: row[obsWappIdx] || null,
        obs_resoluci: row[obsResIdx] || null
      };
    });

    // Chunking to avoid large request limits if necessary, but upsert handles moderate sizes
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
