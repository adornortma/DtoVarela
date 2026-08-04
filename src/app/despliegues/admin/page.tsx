'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Trash2, Edit3, Upload, Loader2, 
  Database, Briefcase, RefreshCw, X, AlertCircle, FileText, CheckCircle2
} from 'lucide-react';
import { DesplieguesService } from '../services/supabase';
import { Sigest, Cto } from '../types';

export default function DesplieguesAdminPage() {
  const [sigests, setSigests] = useState<Sigest[]>([]);
  const [selectedSigest, setSelectedSigest] = useState<Sigest | null>(null);
  const [ctos, setCtos] = useState<Cto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCtos, setLoadingCtos] = useState(false);
  const [user, setUser] = useState<string>('Admin');

  // Modales y formularios
  const [showSigestModal, setShowSigestModal] = useState(false);
  const [editingSigest, setEditingSigest] = useState<Sigest | null>(null);
  const [sigestNumero, setSigestNumero] = useState('');
  const [sigestCentral, setSigestCentral] = useState('');
  const [sigestTipo, setSigestTipo] = useState<'balanceado' | 'desbalanceado'>('balanceado');
  const [sigestMaterials, setSigestMaterials] = useState<{
    requerido: Record<string, number>;
    entregado: Record<string, number>;
  }>({ requerido: {}, entregado: {} });

  const [showCtoModal, setShowCtoModal] = useState(false);
  const [editingCto, setEditingCto] = useState<Cto | null>(null);
  const [ctoCodigo, setCtoCodigo] = useState('');
  const [ctoDireccion, setCtoDireccion] = useState('');
  const [ctoPeloCto, setCtoPeloCto] = useState('');

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [importingBulk, setImportingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    processed: number;
    success: number;
    duplicates: string[];
    errors: string[];
  } | null>(null);

  useEffect(() => {
    // Intentar leer la sesión existente
    const saved = localStorage.getItem('bp_session');
    if (saved) {
      try {
        const userObj = JSON.parse(saved);
        if (userObj.usuario) {
          setUser(userObj.usuario);
        }
      } catch (e) {
        console.error('Error parsing session:', e);
      }
    }
    fetchSigests();
  }, []);

  const fetchSigests = async () => {
    setLoading(true);
    try {
      const data = await DesplieguesService.getSigests();
      setSigests(data);
    } catch (err) {
      console.error('Error fetching SIGESTs:', err);
      alert('Error al cargar la lista de SIGESTs');
    } finally {
      setLoading(false);
    }
  };

  const loadCtos = async (sigest: Sigest) => {
    setSelectedSigest(sigest);
    setLoadingCtos(true);
    try {
      const data = await DesplieguesService.getCtosBySigest(sigest.id);
      setCtos(data);
    } catch (err) {
      console.error('Error fetching CTOs:', err);
      alert('Error al cargar las CTOs');
    } finally {
      setLoadingCtos(false);
    }
  };

  // SIGEST handlers
  const handleOpenSigestModal = (sigest: Sigest | null = null) => {
    if (sigest) {
      setEditingSigest(sigest);
      setSigestNumero(sigest.numero_sigest);
      setSigestCentral(sigest.central);
      setSigestTipo(sigest.tipo || 'balanceado');
      setSigestMaterials({
        requerido: (sigest.material_requerido as Record<string, number>) || {},
        entregado: (sigest.material_entregado as Record<string, number>) || {}
      });
    } else {
      setEditingSigest(null);
      setSigestNumero('');
      setSigestCentral('');
      setSigestTipo('balanceado');
      setSigestMaterials({ requerido: {}, entregado: {} });
    }
    setShowSigestModal(true);
  };

  const handleSaveSigest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sigestNumero.trim() || !sigestCentral.trim()) return;

    try {
      if (editingSigest) {
        const updated = await DesplieguesService.updateSigest(
          editingSigest.id,
          sigestNumero,
          sigestCentral,
          user,
          sigestTipo,
          sigestMaterials.requerido,
          sigestMaterials.entregado
        );
        setSigests(sigests.map(s => s.id === updated.id ? updated : s));
        if (selectedSigest?.id === updated.id) {
          setSelectedSigest(updated);
        }
      } else {
        const created = await DesplieguesService.createSigest(
          sigestNumero,
          sigestCentral,
          user,
          sigestTipo,
          sigestMaterials.requerido,
          sigestMaterials.entregado
        );
        setSigests([...sigests, created]);
      }
      setShowSigestModal(false);
    } catch (err: any) {
      console.error('Error saving SIGEST:', err);
      alert(err.message || 'Error al guardar el SIGEST');
    }
  };

  const handleDeleteSigest = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este SIGEST? Se eliminarán todas las CTOs y actividades asociadas de forma permanente.')) return;
    try {
      await DesplieguesService.deleteSigest(id);
      setSigests(sigests.filter(s => s.id !== id));
      if (selectedSigest?.id === id) {
        setSelectedSigest(null);
        setCtos([]);
      }
    } catch (err) {
      console.error('Error deleting SIGEST:', err);
      alert('Error al eliminar el SIGEST');
    }
  };

  // CTO handlers
  const handleOpenCtoModal = (cto: Cto | null = null) => {
    if (cto) {
      setEditingCto(cto);
      setCtoCodigo(cto.codigo);
      setCtoDireccion(cto.direccion);
      setCtoPeloCto(cto.pelo_cto || '');
    } else {
      setEditingCto(null);
      setCtoCodigo('');
      setCtoDireccion('');
      setCtoPeloCto('');
    }
    setShowCtoModal(true);
  };

  const handleSaveCto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSigest) return;
    if (!ctoCodigo.trim()) return;

    // Client-side uniqueness validation
    const codeExists = ctos.some(c => 
      c.codigo.toLowerCase().trim() === ctoCodigo.toLowerCase().trim() && 
      c.id !== editingCto?.id
    );
    if (codeExists) {
      alert('Esta CTO ya está registrada en este SIGEST.');
      return;
    }

    try {
      const direccionValue = ctoDireccion ? ctoDireccion.trim() : '';
      const peloCtoValue = ctoPeloCto ? ctoPeloCto.trim() : '';
      if (editingCto) {
        const updated = await DesplieguesService.updateCto(
          editingCto.id,
          ctoCodigo,
          direccionValue,
          user,
          peloCtoValue
        );
        setCtos(ctos.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await DesplieguesService.createCto(
          selectedSigest.id,
          ctoCodigo,
          direccionValue,
          user,
          peloCtoValue
        );
        setCtos([...ctos, created]);
      }
      setShowCtoModal(false);
    } catch (err: any) {
      console.error('Error saving CTO:', err);
      if (err.message && err.message.includes('unique')) {
        alert('Error: Ya existe una CTO con este código registrada en este SIGEST.');
      } else {
        alert(err.message || 'Error al guardar la CTO. El código debe ser único por SIGEST.');
      }
    }
  };

  const handleDeleteCto = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta CTO? Se perderán todas sus actividades, fotos y materiales de forma permanente.')) return;
    try {
      await DesplieguesService.deleteCto(id);
      setCtos(ctos.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting CTO:', err);
      alert('Error al eliminar la CTO');
    }
  };

  // Bulk paste excel processing
  const handleProcessBulk = async () => {
    if (!selectedSigest || !bulkText.trim()) return;
    
    setImportingBulk(true);
    try {
      const lines = bulkText.split('\n');
      const duplicates: string[] = [];
      const errors: string[] = [];
      const validItems: { codigo: string; direccion: string; peloCto: string }[] = [];
      let processedCount = 0;

      // Get current ctos list to validate duplicates
      const currentCodes = new Set(ctos.map(c => c.codigo.toLowerCase()));
      // Keep track of codes we are planning to insert in this batch to detect duplicates in the pasted text
      const batchCodes = new Set<string>();

      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        processedCount++;
        // Split by tab first, fallback to multiple spaces
        const parts = trimmed.split('\t');
        let codigo = '';
        let direccion = '';
        let peloCto = '';

        if (parts.length >= 2) {
          codigo = parts[0]?.trim() || '';
          direccion = parts[1]?.trim() || '';
          peloCto = parts[2]?.trim() || '';
        } else {
          const spaceParts = trimmed.split(/\s{2,}/);
          codigo = spaceParts[0]?.trim() || '';
          direccion = spaceParts[1]?.trim() || '';
          peloCto = spaceParts[2]?.trim() || '';
        }

        if (!codigo) {
          errors.push(`Línea ${processedCount}: Código vacío`);
          continue;
        }

        const codigoLower = codigo.toLowerCase().trim();
        if (currentCodes.has(codigoLower) || batchCodes.has(codigoLower)) {
          duplicates.push(codigo);
          continue;
        }

        batchCodes.add(codigoLower);
        validItems.push({ codigo, direccion, peloCto });
      }

      let successCount = 0;
      if (validItems.length > 0) {
        const results = await Promise.all(
          validItems.map(async (item) => {
            try {
              await DesplieguesService.createCto(selectedSigest.id, item.codigo, item.direccion, user, item.peloCto);
              return { success: true, codigo: item.codigo };
            } catch (err: any) {
              console.error(err);
              return { success: false, codigo: item.codigo, error: err.message || 'Error al guardar' };
            }
          })
        );

        results.forEach((r) => {
          if (r.success) {
            successCount++;
          } else {
            errors.push(`${r.codigo}: ${r.error}`);
          }
        });
      }

      setBulkResult({
        processed: processedCount,
        success: successCount,
        duplicates,
        errors
      });

      // Refresh CTO list
      const updatedCtos = await DesplieguesService.getCtosBySigest(selectedSigest.id);
      setCtos(updatedCtos);
    } catch (e: any) {
      console.error(e);
      alert('Error durante el proceso de importación: ' + (e.message || e));
    } finally {
      setImportingBulk(false);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* Header */}
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/despliegues" style={{
            backgroundColor: 'white',
            padding: '12px',
            borderRadius: '16px',
            color: '#64748b',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Database size={28} color="#019df4" />
              <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1px' }}>
                Administración de Despliegues
              </h1>
            </div>
            <p style={{ color: '#64748b', fontWeight: '600', marginTop: '4px' }}>
              Creación y edición de SIGESTs, CTOs y generación masiva de actividades
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: SIGESTs */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Listado de SIGEST</h2>
            <button 
              onClick={() => handleOpenSigestModal()}
              style={{
                backgroundColor: '#019df4',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 10px rgba(1, 157, 244, 0.2)'
              }}
            >
              <Plus size={16} /> Nuevo
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 className="animate-spin" size={24} color="#019df4" />
            </div>
          ) : sigests.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px', fontSize: '14px' }}>
              No hay despliegues creados.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sigests.map(sigest => {
                const isSelected = selectedSigest?.id === sigest.id;
                return (
                  <div 
                    key={sigest.id}
                    onClick={() => loadCtos(sigest)}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      backgroundColor: isSelected ? 'rgba(1, 157, 244, 0.05)' : '#f8fafc',
                      border: isSelected ? '2px solid #019df4' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>
                        {sigest.numero_sigest}
                      </p>
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>
                        Central: {sigest.central}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => handleOpenSigestModal(sigest)}
                        style={{ padding: '6px', color: '#64748b', borderRadius: '8px', backgroundColor: 'white', border: '1px solid #e2e8f0' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSigest(sigest.id)}
                        style={{ padding: '6px', color: '#ef4444', borderRadius: '8px', backgroundColor: 'white', border: '1px solid #fee2e2' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected SIGEST CTOs */}
        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', minHeight: '400px' }}>
          {selectedSigest ? (
            <div>
              {/* Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                    CTOs del SIGEST: {selectedSigest.numero_sigest}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                    Central: {selectedSigest.central} | Total registradas: {ctos.length}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setBulkResult(null);
                      setBulkText('');
                      setShowBulkModal(true);
                    }}
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontWeight: '700',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <Upload size={16} /> Importar Excel
                  </button>
                  <button
                    onClick={() => handleOpenCtoModal()}
                    style={{
                      backgroundColor: '#019df4',
                      color: 'white',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontWeight: '700',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 10px rgba(1, 157, 244, 0.2)'
                    }}
                  >
                    <Plus size={16} /> Agregar CTO
                  </button>
                </div>
              </div>

              {/* CTO List */}
              {loadingCtos ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
                  <Loader2 className="animate-spin" size={32} color="#019df4" />
                </div>
              ) : ctos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <FileText size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                  <p style={{ color: '#64748b', fontWeight: '600' }}>Este SIGEST no tiene CTOs registradas</p>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Utilice el botón de agregar o importar masivamente.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {ctos.map(cto => (
                    <div 
                      key={cto.id}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontWeight: '800',
                            fontSize: '12px'
                          }}>
                            {cto.codigo}
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              onClick={() => handleOpenCtoModal(cto)}
                              style={{ padding: '6px', color: '#475569', borderRadius: '8px', backgroundColor: 'white', border: '1px solid #e2e8f0' }}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCto(cto.id)}
                              style={{ padding: '6px', color: '#ef4444', borderRadius: '8px', backgroundColor: 'white', border: '1px solid #fee2e2' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b', marginTop: '10px' }}>
                          {cto.direccion || 'Sin dirección'}
                        </p>
                        {cto.pelo_cto && (
                          <p style={{ fontSize: '11px', fontWeight: '850', color: '#019df4', marginTop: '4px' }}>
                            Pelo/CTO: {cto.pelo_cto}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#94a3b8' }}>
              <Briefcase size={48} style={{ marginBottom: '16px' }} />
              <p style={{ fontWeight: '700', fontSize: '15px' }}>Seleccione un SIGEST</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Para ver, editar e importar sus cajas de CTO y actividades.</p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL SIGEST */}
      {showSigestModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 51, 102, 0.4)', backdropFilter: 'blur(8px)',
          zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '450px', backgroundColor: 'white',
            borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                {editingSigest ? 'Editar SIGEST' : 'Nuevo SIGEST'}
              </h3>
              <button onClick={() => setShowSigestModal(false)} style={{ padding: '6px', cursor: 'pointer' }}>
                <X size={20} color="#0f172a" />
              </button>
            </div>
            <form onSubmit={handleSaveSigest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Número SIGEST
                </label>
                <input 
                  type="text" 
                  value={sigestNumero}
                  onChange={e => setSigestNumero(e.target.value)}
                  placeholder=""
                  required
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', boxSizing: 'border-box'
                  }}
                />
              </div>
               <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Central
                </label>
                <input 
                  type="text" 
                  value={sigestCentral}
                  onChange={e => setSigestCentral(e.target.value)}
                  placeholder=""
                  required
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Tipo de Polígono
                </label>
                <select
                  value={sigestTipo}
                  onChange={e => setSigestTipo(e.target.value as any)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', backgroundColor: 'white',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="balanceado">Balanceado</option>
                  <option value="desbalanceado">Desbalanceado</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Cantidades de Materiales (Requerido / Entregado)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {(sigestTipo === 'balanceado' 
                    ? ['Caja CTO', 'Drop 75 mts', 'Drop 125 mts', 'Drop 175 mts']
                    : ['CTO 70/30', 'CTO 50/50', 'CTO COMÚN', 'Drop 75 mts', 'Drop 125 mts', 'Drop 175 mts']
                  ).map(matName => (
                    <div key={matName} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ flex: 1.5, fontSize: '13px', fontWeight: '750', color: '#0f172a' }}>{matName}</span>
                      <div style={{ flex: 1, display: 'flex', gap: '6px' }}>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="Req"
                          value={sigestMaterials.requerido[matName] ?? ''}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setSigestMaterials(prev => ({
                              ...prev,
                              requerido: { ...prev.requerido, [matName]: val }
                            }));
                          }}
                          style={{
                            width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0',
                            fontSize: '13px', outline: 'none', fontWeight: '600', color: '#0f172a', boxSizing: 'border-box', textAlign: 'center'
                          }}
                        />
                        <input 
                          type="number" 
                          min="0"
                          placeholder="Ent"
                          value={sigestMaterials.entregado[matName] ?? ''}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setSigestMaterials(prev => ({
                              ...prev,
                              entregado: { ...prev.entregado, [matName]: val }
                            }));
                          }}
                          style={{
                            width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0',
                            fontSize: '13px', outline: 'none', fontWeight: '600', color: '#0f172a', boxSizing: 'border-box', textAlign: 'center'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button 
                type="submit"
                style={{
                  backgroundColor: '#019df4', color: 'white', padding: '14px', borderRadius: '12px',
                  fontWeight: '800', fontSize: '14px', marginTop: '8px', cursor: 'pointer', textAlign: 'center'
                }}
              >
                {editingSigest ? 'Guardar Cambios' : 'Crear SIGEST'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CTO */}
      {showCtoModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 51, 102, 0.4)', backdropFilter: 'blur(8px)',
          zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '450px', backgroundColor: 'white',
            borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                {editingCto ? 'Editar CTO' : 'Agregar CTO'}
              </h3>
              <button onClick={() => setShowCtoModal(false)} style={{ padding: '6px', cursor: 'pointer' }}>
                <X size={20} color="#0f172a" />
              </button>
            </div>
            <form onSubmit={handleSaveCto} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Código de la CTO
                </label>
                <input 
                  type="text" 
                  value={ctoCodigo}
                  onChange={e => setCtoCodigo(e.target.value)}
                  placeholder=""
                  required
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  Debe terminar en <strong>_1</strong> para autogenerar las actividades correctamente.
                </span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Dirección
                </label>
                <input 
                  type="text" 
                  value={ctoDireccion}
                  onChange={e => setCtoDireccion(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Pelo/CTO (ej. 23-5)
                </label>
                <input 
                  type="text" 
                  value={ctoPeloCto}
                  onChange={e => setCtoPeloCto(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', boxSizing: 'border-box'
                  }}
                />
              </div>
              <button 
                type="submit"
                style={{
                  backgroundColor: '#019df4', color: 'white', padding: '14px', borderRadius: '12px',
                  fontWeight: '800', fontSize: '14px', marginTop: '8px', cursor: 'pointer', textAlign: 'center'
                }}
              >
                {editingCto ? 'Guardar Cambios' : 'Agregar CTO'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BULK PASTE */}
      {showBulkModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 51, 102, 0.4)', backdropFilter: 'blur(8px)',
          zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '650px', backgroundColor: 'white',
            borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                  Importar CTOs (Masivo)
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>
                  Pegue un listado de códigos de CTO (uno por línea) o copie columnas directo de Excel.
                </p>
              </div>
              <button onClick={() => setShowBulkModal(false)} style={{ padding: '6px', cursor: 'pointer' }}>
                <X size={20} color="#0f172a" />
              </button>
            </div>

            {!bulkResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Códigos de CTO o columnas de Excel
                  </label>
                  <textarea
                    rows={8}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    placeholder="Ejemplo solo códigos:&#10;6560110503_1&#10;6560112505_1&#10;&#10;Ejemplo columnas de Excel (Código [Tab] Dirección [Tab] Pelo):&#10;6560110503_1    Calle 141    23-5"
                    style={{
                      width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0',
                      fontSize: '13px', outline: 'none', fontWeight: '600', color: '#0f172a', fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button 
                  onClick={handleProcessBulk}
                  disabled={importingBulk}
                  style={{
                    backgroundColor: '#019df4', color: 'white', padding: '14px', borderRadius: '12px',
                    fontWeight: '800', fontSize: '14px', cursor: importingBulk ? 'not-allowed' : 'pointer', textAlign: 'center',
                    display: 'flex', justifyContent: 'center', gap: '8px', opacity: importingBulk ? 0.7 : 1
                  }}
                >
                  {importingBulk ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Procesando...
                    </>
                  ) : (
                    'Procesar Importación'
                  )}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '24px', fontWeight: '900', color: '#16a34a' }}>{bulkResult.success}</p>
                    <p style={{ fontSize: '12px', color: '#166534', fontWeight: '800', textTransform: 'uppercase', marginTop: '4px' }}>Creadas OK</p>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '24px', fontWeight: '900', color: '#d97706' }}>{bulkResult.duplicates.length}</p>
                    <p style={{ fontSize: '12px', color: '#92400e', fontWeight: '800', textTransform: 'uppercase', marginTop: '4px' }}>Duplicados</p>
                  </div>
                  <div style={{ flex: 1, backgroundColor: '#fef2f2', border: '1px solid #fee2e2', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '24px', fontWeight: '900', color: '#dc2626' }}>{bulkResult.errors.length}</p>
                    <p style={{ fontSize: '12px', color: '#991b1b', fontWeight: '800', textTransform: 'uppercase', marginTop: '4px' }}>Errores</p>
                  </div>
                </div>

                {bulkResult.duplicates.length > 0 && (
                  <div style={{ border: '1px solid #fef3c7', backgroundColor: '#fffbeb', borderRadius: '12px', padding: '12px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '800', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={16} /> Códigos Duplicados (Omitidos):
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {bulkResult.duplicates.map((dup, i) => (
                        <span key={i} style={{ fontSize: '11px', backgroundColor: 'white', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '6px', color: '#b45309', fontWeight: '700' }}>
                          {dup}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {bulkResult.errors.length > 0 && (
                  <div style={{ border: '1px solid #fee2e2', backgroundColor: '#fef2f2', borderRadius: '12px', padding: '12px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={16} /> Errores de Procesamiento:
                    </p>
                    <ul style={{ fontSize: '12px', color: '#c53030', listStyleType: 'disc', paddingLeft: '20px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {bulkResult.errors.map((err, i) => (
                        <li key={i} style={{ fontWeight: '600' }}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button 
                  onClick={() => setShowBulkModal(false)}
                  style={{
                    backgroundColor: '#475569', color: 'white', padding: '12px', borderRadius: '12px',
                    fontWeight: '800', fontSize: '14px', cursor: 'pointer', textAlign: 'center', marginTop: '10px'
                  }}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
