'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, Database, Briefcase, Plus, Wrench, CheckCircle, 
  Clock, AlertTriangle, Eye, History, Camera, User, ClipboardList, 
  Sparkles, Sliders, ChevronRight, X, Loader2, RefreshCw, Trash2
} from 'lucide-react';
import { DesplieguesService } from './services/supabase';
import { 
  Sigest, Cto, Actividad, Estado, TipoActividad, Material, 
  ActividadMaterial, Foto, HistorialDespliegue, SigestStats 
} from './types';

export default function DesplieguesTrackingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Sigest[]>([]);
  const [selectedSigest, setSelectedSigest] = useState<Sigest | null>(null);
  
  // Data for the active SIGEST
  const [ctos, setCtos] = useState<Cto[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [materialesActividad, setMaterialesActividad] = useState<ActividadMaterial[]>([]);
  const [fotosActividad, setFotosActividad] = useState<Foto[]>([]);
  const [historialActividad, setHistorialActividad] = useState<HistorialDespliegue[]>([]);
  
  // Catalogs
  const [estados, setEstados] = useState<Estado[]>([]);
  const [tiposActividad, setTiposActividad] = useState<TipoActividad[]>([]);
  const [materialesCatalogo, setMaterialesCatalogo] = useState<Material[]>([]);

  // Loading states
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  // Active user session
  const [usuario, setUsuario] = useState('Invitado');

  // Dialog states
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showCertDialog, setShowCertDialog] = useState(false);
  const [showStatusSimpleDialog, setShowStatusSimpleDialog] = useState(false);
  const [selectedActivityForEdit, setSelectedActivityForEdit] = useState<Actividad | null>(null);

  // Form states for installation
  const [installTecnico, setInstallTecnico] = useState('');
  const [installObservaciones, setInstallObservaciones] = useState('');
  const [installUseCaja, setInstallUseCaja] = useState(true);
  const [installUseDrop, setInstallUseDrop] = useState(false);
  const [installDropLength, setInstallDropLength] = useState('Drop 75 mts'); // Must match material names
  const [installDropOrigen, setInstallDropOrigen] = useState('Preparado de fábrica');
  const [installFotos, setInstallFotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Form states for certification
  const [certTecnico, setCertTecnico] = useState('');
  const [certObservaciones, setCertObservaciones] = useState('');
  const [certFotos, setCertFotos] = useState<File[]>([]);

  // Form states for general simple state transition (Pending, In process, Observed)
  const [simpleEstadoId, setSimpleEstadoId] = useState('');
  const [simpleObservaciones, setSimpleObservaciones] = useState('');
  const [simpleTecnico, setSimpleTecnico] = useState('');

  // Timeline / Lightbox state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTargetCto, setHistoryTargetCto] = useState<Cto | null>(null);
  const [historyList, setHistoryList] = useState<HistorialDespliegue[]>([]);
  
  const [showLightboxModal, setShowLightboxModal] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<Foto[]>([]);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(0);

  // Load catalogs on mount
  useEffect(() => {
    const saved = localStorage.getItem('bp_session');
    if (saved) {
      try {
        const userObj = JSON.parse(saved);
        if (userObj.usuario) setUsuario(userObj.usuario);
      } catch (e) {
        console.error(e);
      }
    }
    
    const loadCatalogs = async () => {
      try {
        const [estData, tipData, matData] = await Promise.all([
          DesplieguesService.getEstados(),
          DesplieguesService.getTiposActividad(),
          DesplieguesService.getMateriales()
        ]);
        setEstados(estData);
        setTiposActividad(tipData);
        setMaterialesCatalogo(matData);
      } catch (e) {
        console.error('Error loading catalogs:', e);
      }
    };
    loadCatalogs();
  }, []);

  // Quick initial load of first SIGEST to populate screen
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const allSigests = await DesplieguesService.getSigests();
        if (allSigests.length > 0) {
          loadSigestData(allSigests[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchInitial();
  }, []);

  // Search handler
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoadingSearch(true);
    try {
      const results = await DesplieguesService.searchSigest(searchQuery);
      setSearchResults(results);
      if (results.length === 1) {
        loadSigestData(results[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSearch(false);
    }
  };

  // Load full details for a SIGEST
  const loadSigestData = async (sigest: Sigest) => {
    setSelectedSigest(sigest);
    setSearchResults([]);
    setSearchQuery('');
    setLoadingDetail(true);

    try {
      // 1. Fetch CTOs
      const ctosList = await DesplieguesService.getCtosBySigest(sigest.id);
      setCtos(ctosList);

      if (ctosList.length > 0) {
        const ctoIds = ctosList.map(c => c.id);
        
        // 2. Fetch activities, materials, photos, history
        const [actList, matList, fotList, histList] = await Promise.all([
          DesplieguesService.getActividadesByCtoIds(ctoIds),
          DesplieguesService.getActividadMateriales(ctoIds), // Note: we fetch by activity ids, we will resolve them
          DesplieguesService.getActividadFotos(ctoIds),
          DesplieguesService.getHistorialByActividades(ctoIds)
        ]);

        // Fix to pass activity ids correctly
        const activityIds = actList.map(a => a.id);
        const resolvedMaterials = await DesplieguesService.getActividadMateriales(activityIds);
        const resolvedPhotos = await DesplieguesService.getActividadFotos(activityIds);
        const resolvedHistory = await DesplieguesService.getHistorialByActividades(activityIds);

        setActividades(actList);
        setMaterialesActividad(resolvedMaterials);
        setFotosActividad(resolvedPhotos);
        setHistorialActividad(resolvedHistory);
      } else {
        setActividades([]);
        setMaterialesActividad([]);
        setFotosActividad([]);
        setHistorialActividad([]);
      }
    } catch (err) {
      console.error('Error loading SIGEST details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Dynamically calculate stats for active SIGEST
  const stats = React.useMemo<SigestStats | null>(() => {
    if (!selectedSigest) return null;

    const totalCtos = ctos.length;
    let instaladas = 0;
    let certificadas = 0;
    let pendientes = 0;

    // Map through activities
    actividades.forEach(act => {
      const isCompletado = act.despliegues_estados?.nombre.toLowerCase() === 'completado';
      const tipoNombre = act.despliegues_tipos_actividad?.nombre.toLowerCase();

      if (isCompletado) {
        if (tipoNombre?.includes('instalar')) instaladas++;
        if (tipoNombre?.includes('certificar')) certificadas++;
      } else {
        pendientes++;
      }
    });

    const totalActivities = actividades.length;
    const completedActivities = totalActivities - pendientes;
    const avancePorcentaje = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

    let estadoGeneral: 'No iniciado' | 'En ejecución' | 'Finalizado' = 'No iniciado';
    if (totalActivities > 0) {
      if (completedActivities === totalActivities) {
        estadoGeneral = 'Finalizado';
      } else if (completedActivities > 0 || actividades.some(a => a.despliegues_estados?.nombre.toLowerCase() !== 'pendiente')) {
        estadoGeneral = 'En ejecución';
      }
    }

    return {
      numero_sigest: selectedSigest.numero_sigest,
      poligono: selectedSigest.poligono,
      totalCtos,
      instaladas,
      certificadas,
      pendientes: totalCtos * 2 - (instaladas + certificadas),
      avancePorcentaje,
      estadoGeneral
    };
  }, [selectedSigest, ctos, actividades]);

  // Dynamically calculate materials stats
  const materialsSummary = React.useMemo(() => {
    let cajasUsed = 0;
    let drop75 = 0;
    let drop125 = 0;
    let drop175 = 0;
    let preparadoFabrica = 0;
    let preparadoTecnico = 0;

    materialesActividad.forEach(am => {
      const matNombre = am.materiales?.nombre;
      if (matNombre === 'Caja CTO') cajasUsed += am.cantidad;
      if (matNombre === 'Drop 75 mts') drop75 += am.cantidad;
      if (matNombre === 'Drop 125 mts') drop125 += am.cantidad;
      if (matNombre === 'Drop 175 mts') drop175 += am.cantidad;

      if (matNombre?.toLowerCase().includes('drop')) {
        if (am.origen === 'Preparado de fábrica') preparadoFabrica += am.cantidad;
        if (am.origen === 'Preparado por técnico') preparadoTecnico += am.cantidad;
      }
    });

    return { cajasUsed, drop75, drop125, drop175, preparadoFabrica, preparadoTecnico };
  }, [materialesActividad]);

  // Open status modal
  const handleOpenStatusDialog = (cto: Cto, act: Actividad, targetStatusNombre: string) => {
    setSelectedActivityForEdit(act);
    
    const isCompleted = targetStatusNombre.toLowerCase() === 'completado';
    const isInstalar = act.despliegues_tipos_actividad?.nombre.toLowerCase().includes('instalar');

    if (isCompleted) {
      if (isInstalar) {
        setInstallTecnico(act.tecnico_nombre || '');
        setInstallObservaciones(act.observaciones || '');
        setInstallUseCaja(true);
        setInstallUseDrop(false);
        setInstallFotos([]);
        setShowInstallDialog(true);
      } else {
        setCertTecnico(act.tecnico_nombre || '');
        setCertObservaciones(act.observaciones || '');
        setCertFotos([]);
        setShowCertDialog(true);
      }
    } else {
      // Pending, In process, Observed
      const targetState = estados.find(e => e.nombre.toLowerCase() === targetStatusNombre.toLowerCase());
      setSimpleEstadoId(targetState?.id || '');
      setSimpleObservaciones(act.observaciones || '');
      setSimpleTecnico(act.tecnico_nombre || '');
      setShowStatusSimpleDialog(true);
    }
  };

  // Upload multiple images helper
  const handleUploadPhotos = async (activityId: string, files: File[], currentStatus: string) => {
    if (files.length === 0) return;
    setUploadingPhotos(true);
    try {
      for (const file of files) {
        const publicUrl = await DesplieguesService.uploadFoto(file, usuario);
        await DesplieguesService.addFoto(activityId, publicUrl, usuario, currentStatus);
      }
    } catch (e) {
      console.error(e);
      alert('Error al subir algunas fotografías');
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Submit Installation Completed Dialog
  const handleSaveInstallCompleted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityForEdit) return;
    
    setSavingAction(true);
    try {
      const completedState = estados.find(e => e.nombre.toLowerCase() === 'completado');
      if (!completedState) throw new Error('Estado completado no encontrado');

      // 1. Update activity status, technician and notes
      await DesplieguesService.updateActividad(
        selectedActivityForEdit.id,
        completedState.id,
        installTecnico,
        installObservaciones,
        usuario,
        selectedActivityForEdit.despliegues_estados?.nombre || 'Pendiente',
        'Completado'
      );

      // 2. Register materials
      const materialsToSave: { material_id: string; cantidad: number; origen: string | null }[] = [];
      
      if (installUseCaja) {
        const cajaMat = materialesCatalogo.find(m => m.nombre === 'Caja CTO');
        if (cajaMat) {
          materialsToSave.push({ material_id: cajaMat.id, cantidad: 1, origen: null });
        }
      }

      if (installUseDrop) {
        const dropMat = materialesCatalogo.find(m => m.nombre === installDropLength);
        if (dropMat) {
          materialsToSave.push({ material_id: dropMat.id, cantidad: 1, origen: installDropOrigen });
        }
      }

      await DesplieguesService.saveActividadMateriales(selectedActivityForEdit.id, materialsToSave);

      // 3. Upload photos if any
      await handleUploadPhotos(selectedActivityForEdit.id, installFotos, 'Completado');

      // 4. Reload data
      if (selectedSigest) await loadSigestData(selectedSigest);
      setShowInstallDialog(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al completar la instalación');
    } finally {
      setSavingAction(false);
    }
  };

  // Submit Certification Completed Dialog
  const handleSaveCertCompleted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityForEdit) return;

    setSavingAction(true);
    try {
      const completedState = estados.find(e => e.nombre.toLowerCase() === 'completado');
      if (!completedState) throw new Error('Estado completado no encontrado');

      // 1. Update activity
      await DesplieguesService.updateActividad(
        selectedActivityForEdit.id,
        completedState.id,
        certTecnico,
        certObservaciones,
        usuario,
        selectedActivityForEdit.despliegues_estados?.nombre || 'Pendiente',
        'Completado'
      );

      // 2. Upload photos
      await handleUploadPhotos(selectedActivityForEdit.id, certFotos, 'Completado');

      // 3. Reload
      if (selectedSigest) await loadSigestData(selectedSigest);
      setShowCertDialog(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al completar la certificación');
    } finally {
      setSavingAction(false);
    }
  };

  // Submit simple state change
  const handleSaveSimpleStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityForEdit || !simpleEstadoId) return;

    setSavingAction(true);
    try {
      const targetState = estados.find(e => e.id === simpleEstadoId);
      if (!targetState) throw new Error('Estado destino no encontrado');

      await DesplieguesService.updateActividad(
        selectedActivityForEdit.id,
        simpleEstadoId,
        simpleTecnico || null,
        simpleObservaciones || null,
        usuario,
        selectedActivityForEdit.despliegues_estados?.nombre || 'Pendiente',
        targetState.nombre
      );

      if (selectedSigest) await loadSigestData(selectedSigest);
      setShowStatusSimpleDialog(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al cambiar estado');
    } finally {
      setSavingAction(false);
    }
  };

  // Open Photos lightbox gallery for a CTO
  const handleOpenPhotos = (cto: Cto) => {
    const ctoActs = actividades.filter(a => a.cto_id === cto.id).map(a => a.id);
    const photos = fotosActividad.filter(f => ctoActs.includes(f.actividad_id));
    
    if (photos.length === 0) {
      alert('Esta CTO no posee fotografías cargadas.');
      return;
    }

    setLightboxPhotos(photos);
    setActiveLightboxIndex(0);
    setShowLightboxModal(true);
  };

  // Open History Timeline modal for a CTO
  const handleOpenHistory = (cto: Cto) => {
    const ctoActs = actividades.filter(a => a.cto_id === cto.id).map(a => a.id);
    const history = historialActividad.filter(h => ctoActs.includes(h.actividad_id));

    setHistoryTargetCto(cto);
    setHistoryList(history);
    setShowHistoryModal(true);
  };

  // Delete a photograph
  const handleDeletePhoto = async (photoId: string, activityId: string, currentStatus: string) => {
    if (!confirm('¿Desea eliminar esta fotografía de evidencia?')) return;
    try {
      await DesplieguesService.deleteFoto(photoId, activityId, usuario, currentStatus);
      setLightboxPhotos(lightboxPhotos.filter(p => p.id !== photoId));
      if (selectedSigest) await loadSigestData(selectedSigest);
    } catch (e) {
      console.error(e);
      alert('Error al eliminar la fotografía');
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* Top Search bar & navigation */}
      <header style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Briefcase size={28} color="#019df4" />
              <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.0px' }}>
                Seguimiento de Despliegues FTTH
              </h1>
            </div>
            <p style={{ color: '#64748b', fontWeight: '600', marginTop: '4px' }}>
              Consola operativa para la gestión de materiales y avance de CTOs
            </p>
          </div>
          
          <Link href="/despliegues/admin" style={{
            backgroundColor: '#003366',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '16px',
            fontWeight: '800',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 51, 102, 0.15)'
          }}>
            <Database size={16} /> Modo Admin / CRUD
          </Link>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '700px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por SIGEST, código de CTO, dirección o polígono..."
              style={{
                width: '100%', padding: '14px 16px 14px 48px', borderRadius: '16px', border: '1px solid #e2e8f0',
                fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}
            />
          </div>
          <button 
            type="submit"
            style={{
              backgroundColor: '#019df4', color: 'white', padding: '0 28px', borderRadius: '16px',
              fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(1, 157, 244, 0.2)', flexShrink: 0, minWidth: '110px',
              justifyContent: 'center'
            }}
          >
            {loadingSearch ? <Loader2 className="animate-spin" size={16} /> : 'Buscar'}
          </button>
        </form>

        {/* Search Results selection */}
        {searchResults.length > 0 && (
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
            padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            <p style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Resultados encontrados ({searchResults.length}):</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {searchResults.map(s => (
                <button
                  key={s.id}
                  onClick={() => loadSigestData(s)}
                  style={{
                    padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'flex', gap: '8px', alignItems: 'center'
                  }}
                >
                  <span>SIGEST {s.numero_sigest}</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>({s.poligono})</span>
                  <ChevronRight size={14} color="#94a3b8" />
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Detail Area */}
      {loadingDetail ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 0', gap: '16px' }}>
          <Loader2 className="animate-spin" size={40} color="#019df4" />
          <p style={{ color: '#64748b', fontWeight: '700' }}>Cargando información del despliegue...</p>
        </div>
      ) : stats ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SIGEST Info Header card */}
          <div style={{ 
            backgroundColor: 'white', borderRadius: '24px', padding: '24px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9',
            display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  backgroundColor: 
                    stats.estadoGeneral === 'Finalizado' ? '#dcfce7' : 
                    stats.estadoGeneral === 'En ejecución' ? '#fef3c7' : '#f1f5f9',
                  color: 
                    stats.estadoGeneral === 'Finalizado' ? '#15803d' : 
                    stats.estadoGeneral === 'En ejecución' ? '#b45309' : '#475569',
                  padding: '6px 12px', borderRadius: '20px', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase'
                }}>
                  {stats.estadoGeneral}
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>SIGEST: {stats.numero_sigest}</h2>
              </div>
              <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', marginTop: '6px' }}>
                Polígono de Despliegue: <strong style={{ color: '#0f172a' }}>{stats.poligono}</strong> | Cajas CTO totales: <strong>{stats.totalCtos}</strong>
              </p>

              {/* Progress Bar */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '800', marginBottom: '8px' }}>
                  <span style={{ color: '#475569' }}>Avance Real del Despliegue</span>
                  <span style={{ color: '#019df4' }}>{stats.avancePorcentaje}%</span>
                </div>
                <div style={{ height: '10px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${stats.avancePorcentaje}%`, backgroundColor: '#019df4', borderRadius: '10px', transition: 'width 0.4s' }}></div>
                </div>
              </div>
            </div>

            {/* Quick counters grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '16px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                <p style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a' }}>{stats.instaladas}</p>
                <p style={{ fontSize: '10px', color: '#166534', fontWeight: '850', textTransform: 'uppercase', marginTop: '2px' }}>Instaladas</p>
              </div>
              <div style={{ backgroundColor: '#f0f9ff', padding: '14px', borderRadius: '16px', border: '1px solid #bae6fd', textAlign: 'center' }}>
                <p style={{ fontSize: '20px', fontWeight: '900', color: '#0369a1' }}>{stats.certificadas}</p>
                <p style={{ fontSize: '10px', color: '#0369a1', fontWeight: '850', textTransform: 'uppercase', marginTop: '2px' }}>Certificadas</p>
              </div>
              <div style={{ backgroundColor: '#fffbeb', padding: '14px', borderRadius: '16px', border: '1px solid #fef3c7', textAlign: 'center' }}>
                <p style={{ fontSize: '20px', fontWeight: '900', color: '#d97706' }}>{stats.pendientes}</p>
                <p style={{ fontSize: '10px', color: '#92400e', fontWeight: '850', textTransform: 'uppercase', marginTop: '2px' }}>Pendientes</p>
              </div>
            </div>
          </div>

          {/* Materials Summary box */}
          <div style={{
            backgroundColor: 'white', borderRadius: '24px', padding: '24px', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={18} color="#019df4" /> Resumen Operativo de Materiales Consumidos
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Cajas CTO Utilizadas</span>
                <p style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{materialsSummary.cajasUsed}</p>
              </div>
              
              <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Consumo Drop Fibra</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>75 mts:</span> <strong style={{ color: '#0f172a' }}>{materialsSummary.drop75}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>125 mts:</span> <strong style={{ color: '#0f172a' }}>{materialsSummary.drop125}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>175 mts:</span> <strong style={{ color: '#0f172a' }}>{materialsSummary.drop175}</strong>
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Preparación de Drops</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>De fábrica:</span> <strong style={{ color: '#16a34a' }}>{materialsSummary.preparadoFabrica}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Por técnico:</span> <strong style={{ color: '#ea580c' }}>{materialsSummary.preparadoTecnico}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTO list Cards representation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={20} color="#019df4" /> Detalle de Cajas CTO
            </h3>

            {ctos.length === 0 ? (
              <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                <p style={{ color: '#64748b', fontWeight: '600' }}>No hay cajas CTO asociadas a este SIGEST.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(430px, 1fr))', gap: '20px' }}>
                {ctos.map(cto => {
                  // Resolve activities for this CTO
                  const ctoActs = actividades.filter(a => a.cto_id === cto.id);
                  const installAct = ctoActs.find(a => a.despliegues_tipos_actividad?.nombre.toLowerCase().includes('instalar'));
                  const certAct = ctoActs.find(a => a.despliegues_tipos_actividad?.nombre.toLowerCase().includes('certificar'));

                  // Code references
                  const installCode = cto.codigo;
                  // Dynamic replacement for certification visual rendering
                  const certCode = cto.codigo.replace(/_1$/, '_5');

                  const renderActivityStateBadge = (act: Actividad | undefined) => {
                    if (!act) return <span style={{ fontSize: '11px', color: '#94a3b8' }}>N/A</span>;
                    const estNombre = act.despliegues_estados?.nombre || 'Pendiente';
                    const estColor = act.despliegues_estados?.color_hex || '#64748b';
                    
                    return (
                      <span style={{
                        backgroundColor: `${estColor}12`,
                        color: estColor,
                        border: `1px solid ${estColor}33`,
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '800'
                      }}>
                        {estNombre}
                      </span>
                    );
                  };

                  return (
                    <div 
                      key={cto.id}
                      style={{
                        backgroundColor: 'white', borderRadius: '20px', padding: '20px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px'
                      }}
                    >
                      {/* Card Top Title & Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ backgroundColor: '#f0f9ff', color: '#019df4', fontWeight: '900', fontSize: '14px', padding: '4px 8px', borderRadius: '8px' }}>
                              {cto.codigo}
                            </span>
                          </div>
                          <p style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginTop: '6px' }}>
                            {cto.direccion}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => handleOpenPhotos(cto)}
                            style={{
                              padding: '8px 12px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#475569',
                              fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e2e8f0'
                            }}
                          >
                            <Camera size={14} /> Fotos
                          </button>
                          <button 
                            onClick={() => handleOpenHistory(cto)}
                            style={{
                              padding: '8px 12px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#475569',
                              fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e2e8f0'
                            }}
                          >
                            <History size={14} /> Historial
                          </button>
                        </div>
                      </div>

                      {/* Card Activities Tracking detail */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '14px' }}>
                        
                        {/* Actividad 1: Instalar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '850', color: '#0f172a' }}>Instalar CTO</span>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Ref: {installCode}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {renderActivityStateBadge(installAct)}
                            
                            {installAct && (
                              <div style={{ position: 'relative' }}>
                                <select
                                  value={installAct.despliegues_estados?.nombre}
                                  onChange={(e) => handleOpenStatusDialog(cto, installAct, e.target.value)}
                                  style={{
                                    appearance: 'none', backgroundColor: 'white', border: '1px solid #e2e8f0',
                                    borderRadius: '8px', padding: '4px 24px 4px 8px', fontSize: '11px', fontWeight: '800',
                                    color: '#475569', cursor: 'pointer', outline: 'none'
                                  }}
                                >
                                  {estados.map(est => (
                                    <option key={est.id} value={est.nombre}>{est.nombre}</option>
                                  ))}
                                </select>
                                <ChevronRight size={10} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none', color: '#94a3b8' }} />
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ height: '1px', backgroundColor: '#e2e8f0' }}></div>

                        {/* Actividad 2: Certificar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '850', color: '#0f172a' }}>Certificar CTO</span>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Ref: {certCode}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {renderActivityStateBadge(certAct)}
                            
                            {certAct && (
                              <div style={{ position: 'relative' }}>
                                <select
                                  value={certAct.despliegues_estados?.nombre}
                                  onChange={(e) => handleOpenStatusDialog(cto, certAct, e.target.value)}
                                  style={{
                                    appearance: 'none', backgroundColor: 'white', border: '1px solid #e2e8f0',
                                    borderRadius: '8px', padding: '4px 24px 4px 8px', fontSize: '11px', fontWeight: '800',
                                    color: '#475569', cursor: 'pointer', outline: 'none'
                                  }}
                                >
                                  {estados.map(est => (
                                    <option key={est.id} value={est.nombre}>{est.nombre}</option>
                                  ))}
                                </select>
                                <ChevronRight size={10} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none', color: '#94a3b8' }} />
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '80px 20px', borderRadius: '24px', textAlign: 'center', border: '1px solid #f1f5f9', color: '#94a3b8' }}>
          <Briefcase size={56} style={{ margin: '0 auto 16px' }} />
          <p style={{ fontWeight: '800', fontSize: '16px', color: '#475569' }}>Consola de Despliegues</p>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Busque un número de SIGEST, polígono o código CTO en la parte superior para visualizar el avance.</p>
        </div>
      )}

      {/* DIALOG COMPLETAR INSTALACION */}
      {showInstallDialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 51, 102, 0.4)', backdropFilter: 'blur(8px)',
          zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '500px', backgroundColor: 'white',
            borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a' }}>Completar Instalación</h3>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Registre materiales, técnico y evidencia</p>
              </div>
              <button onClick={() => setShowInstallDialog(false)} style={{ padding: '6px', cursor: 'pointer' }}>
                <X size={20} color="#0f172a" />
              </button>
            </div>
            
            <form onSubmit={handleSaveInstallCompleted} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Material: Caja CTO */}
              <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="installUseCaja"
                    checked={installUseCaja}
                    onChange={(e) => setInstallUseCaja(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="installUseCaja" style={{ fontSize: '13px', fontWeight: '850', color: '#0f172a', cursor: 'pointer' }}>
                    Registrar Caja CTO
                  </label>
                </div>
                {installUseCaja && (
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', paddingLeft: '26px' }}>
                    Cantidad por defecto: 1 unidad.
                  </p>
                )}
              </div>

              {/* Material: Drop Fibra */}
              <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: installUseDrop ? '14px' : 0 }}>
                  <input 
                    type="checkbox" 
                    id="installUseDrop"
                    checked={installUseDrop}
                    onChange={(e) => setInstallUseDrop(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="installUseDrop" style={{ fontSize: '13px', fontWeight: '850', color: '#0f172a', cursor: 'pointer' }}>
                    Registrar Drop Fibra
                  </label>
                </div>

                {installUseDrop && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '26px', borderLeft: '2px solid #019df4' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Longitud del Drop</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {['Drop 75 mts', 'Drop 125 mts', 'Drop 175 mts'].map(len => (
                          <button
                            key={len}
                            type="button"
                            onClick={() => setInstallDropLength(len)}
                            style={{
                              flex: 1, padding: '8px', fontSize: '12px', fontWeight: '700', borderRadius: '8px',
                              backgroundColor: installDropLength === len ? '#019df4' : 'white',
                              color: installDropLength === len ? 'white' : '#475569',
                              border: installDropLength === len ? '1px solid #019df4' : '1px solid #e2e8f0'
                            }}
                          >
                            {len.replace('Drop ', '')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Origen del Drop</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {['Preparado de fábrica', 'Preparado por técnico'].map(orig => (
                          <button
                            key={orig}
                            type="button"
                            onClick={() => setInstallDropOrigen(orig)}
                            style={{
                              flex: 1, padding: '8px', fontSize: '11px', fontWeight: '700', borderRadius: '8px',
                              backgroundColor: installDropOrigen === orig ? '#019df4' : 'white',
                              color: installDropOrigen === orig ? 'white' : '#475569',
                              border: installDropOrigen === orig ? '1px solid #019df4' : '1px solid #e2e8f0'
                            }}
                          >
                            {orig}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tecnico que realizo */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Técnico que realizó la instalación</label>
                <input 
                  type="text" 
                  value={installTecnico}
                  onChange={e => setInstallTecnico(e.target.value)}
                  placeholder="Nombre y apellido del técnico..."
                  required
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a'
                  }}
                />
              </div>

              {/* Fotografías */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Evidencia Fotográfica (Opcional)</label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files) {
                      setInstallFotos(Array.from(e.target.files));
                    }
                  }}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '12px', border: '1px dashed #cbd5e1',
                    fontSize: '13px', outline: 'none', cursor: 'pointer'
                  }}
                />
                {installFotos.length > 0 && (
                  <p style={{ fontSize: '12px', color: '#019df4', marginTop: '4px', fontWeight: '700' }}>
                    {installFotos.length} archivo(s) seleccionado(s)
                  </p>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Observaciones</label>
                <textarea 
                  rows={3}
                  value={installObservaciones}
                  onChange={e => setInstallObservaciones(e.target.value)}
                  placeholder="Detalles u observaciones de la instalación..."
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a'
                  }}
                />
              </div>

              <button 
                type="submit"
                disabled={savingAction || uploadingPhotos}
                style={{
                  backgroundColor: '#019df4', color: 'white', padding: '14px', borderRadius: '12px',
                  fontWeight: '800', fontSize: '14px', cursor: 'pointer', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px'
                }}
              >
                {(savingAction || uploadingPhotos) ? <Loader2 className="animate-spin" size={16} /> : 'Guardar y Completar'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* DIALOG COMPLETAR CERTIFICACION */}
      {showCertDialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 51, 102, 0.4)', backdropFilter: 'blur(8px)',
          zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '480px', backgroundColor: 'white',
            borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a' }}>Completar Certificación</h3>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Registre el técnico y la evidencia de certificación</p>
              </div>
              <button onClick={() => setShowCertDialog(false)} style={{ padding: '6px', cursor: 'pointer' }}>
                <X size={20} color="#0f172a" />
              </button>
            </div>
            
            <form onSubmit={handleSaveCertCompleted} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Tecnico que certifico */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Técnico que certificó</label>
                <input 
                  type="text" 
                  value={certTecnico}
                  onChange={e => setCertTecnico(e.target.value)}
                  placeholder="Nombre y apellido del técnico..."
                  required
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a'
                  }}
                />
              </div>

              {/* Fotografías */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Evidencia Fotográfica (Opcional)</label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files) {
                      setCertFotos(Array.from(e.target.files));
                    }
                  }}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '12px', border: '1px dashed #cbd5e1',
                    fontSize: '13px', outline: 'none', cursor: 'pointer'
                  }}
                />
                {certFotos.length > 0 && (
                  <p style={{ fontSize: '12px', color: '#019df4', marginTop: '4px', fontWeight: '700' }}>
                    {certFotos.length} archivo(s) seleccionado(s)
                  </p>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Observaciones</label>
                <textarea 
                  rows={3}
                  value={certObservaciones}
                  onChange={e => setCertObservaciones(e.target.value)}
                  placeholder="Observaciones o notas de certificación..."
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a'
                  }}
                />
              </div>

              <button 
                type="submit"
                disabled={savingAction}
                style={{
                  backgroundColor: '#019df4', color: 'white', padding: '14px', borderRadius: '12px',
                  fontWeight: '800', fontSize: '14px', cursor: 'pointer', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px'
                }}
              >
                {savingAction ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Certificación'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* DIALOG CAMBIO ESTADO SIMPLE */}
      {showStatusSimpleDialog && (
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
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '950', color: '#0f172a' }}>Modificar Estado de Actividad</h3>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Cambiar a pendiente, en proceso u observado</p>
              </div>
              <button onClick={() => setShowStatusSimpleDialog(false)} style={{ padding: '6px', cursor: 'pointer' }}>
                <X size={20} color="#0f172a" />
              </button>
            </div>
            
            <form onSubmit={handleSaveSimpleStatus} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Estado selector */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Seleccione Estado</label>
                <select
                  value={simpleEstadoId}
                  onChange={e => setSimpleEstadoId(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', backgroundColor: 'white'
                  }}
                >
                  <option value="" disabled>Seleccione un estado...</option>
                  {estados.map(est => (
                    <option key={est.id} value={est.id}>{est.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Tecnico */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Técnico Asignado (Opcional)</label>
                <input 
                  type="text" 
                  value={simpleTecnico}
                  onChange={e => setSimpleTecnico(e.target.value)}
                  placeholder="Nombre del técnico..."
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a'
                  }}
                />
              </div>

              {/* Observaciones */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Observaciones / Motivo</label>
                <textarea 
                  rows={3}
                  value={simpleObservaciones}
                  onChange={e => setSimpleObservaciones(e.target.value)}
                  placeholder="Ingrese el motivo u observaciones de la modificación..."
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a'
                  }}
                />
              </div>

              <button 
                type="submit"
                disabled={savingAction}
                style={{
                  backgroundColor: '#019df4', color: 'white', padding: '14px', borderRadius: '12px',
                  fontWeight: '800', fontSize: '14px', cursor: 'pointer', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px'
                }}
              >
                {savingAction ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Estado'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX DE FOTOS */}
      {showLightboxModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(10px)',
          zIndex: 4000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          {/* Lightbox header */}
          <div style={{
            position: 'absolute', top: '24px', left: '24px', right: '24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white'
          }}>
            <div>
              <p style={{ fontWeight: '800', fontSize: '16px' }}>Evidencia Fotográfica</p>
              <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px', fontWeight: '600' }}>
                Subido por: {lightboxPhotos[activeLightboxIndex]?.usuario} | {new Date(lightboxPhotos[activeLightboxIndex]?.fecha_subida).toLocaleString('es-AR')}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button 
                onClick={() => handleDeletePhoto(lightboxPhotos[activeLightboxIndex].id, lightboxPhotos[activeLightboxIndex].actividad_id, 'Completado')}
                style={{
                  padding: '8px 12px', backgroundColor: '#dc2626', color: 'white',
                  borderRadius: '10px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <Trash2 size={14} /> Eliminar
              </button>

              <button 
                onClick={() => setShowLightboxModal(false)}
                style={{
                  padding: '8px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white',
                  borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex'
                }}
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Lightbox Content image */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '40px', maxWidth: '90%', maxHeight: '75vh' }}>
            {lightboxPhotos.length > 1 && (
              <button 
                onClick={() => setActiveLightboxIndex((activeLightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length)}
                style={{
                  padding: '16px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white',
                  borderRadius: '50%', fontSize: '20px', fontWeight: 'bold'
                }}
              >
                &larr;
              </button>
            )}

            <img 
              src={lightboxPhotos[activeLightboxIndex]?.url} 
              alt="Evidencia" 
              style={{
                maxWidth: '70vw', maxHeight: '70vh', objectFit: 'contain', 
                borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}
            />

            {lightboxPhotos.length > 1 && (
              <button 
                onClick={() => setActiveLightboxIndex((activeLightboxIndex + 1) % lightboxPhotos.length)}
                style={{
                  padding: '16px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white',
                  borderRadius: '50%', fontSize: '20px', fontWeight: 'bold'
                }}
              >
                &rarr;
              </button>
            )}
          </div>

          {/* Indicators */}
          <div style={{ marginTop: '24px', color: 'white', fontSize: '13px', fontWeight: '750' }}>
            {activeLightboxIndex + 1} de {lightboxPhotos.length}
          </div>
        </div>
      )}

      {/* TIMELINE HISTORIAL */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 51, 102, 0.4)', backdropFilter: 'blur(8px)',
          zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '500px', backgroundColor: 'white',
            borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a' }}>Historial Operativo</h3>
                {historyTargetCto && (
                  <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                    CTO: {historyTargetCto.codigo} | {historyTargetCto.direccion}
                  </p>
                )}
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ padding: '6px', cursor: 'pointer' }}>
                <X size={20} color="#0f172a" />
              </button>
            </div>

            {historyList.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '20px', fontSize: '14px', fontWeight: '600' }}>
                No hay modificaciones registradas para esta CTO.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '20px' }}>
                {/* Vertical Line */}
                <div style={{
                  position: 'absolute', left: '4px', top: '8px', bottom: '8px', width: '2px', backgroundColor: '#e2e8f0'
                }}></div>

                {historyList.map((hist, index) => {
                  const dateStr = new Date(hist.fecha).toLocaleString('es-AR');
                  
                  return (
                    <div key={hist.id} style={{ position: 'relative' }}>
                      {/* Circle node on timeline */}
                      <div style={{
                        position: 'absolute', left: '-20px', top: '4px', width: '10px', height: '10px',
                        borderRadius: '50%', backgroundColor: '#019df4', border: '2px solid white',
                        boxShadow: '0 0 0 2px #019df433'
                      }}></div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800' }}>
                          <span style={{ color: '#019df4' }}>{hist.usuario}</span>
                          <span style={{ color: '#94a3b8' }}>{dateStr}</span>
                        </div>
                        
                        <p style={{ fontSize: '13px', fontWeight: '750', color: '#1e293b', marginTop: '6px' }}>
                          Acción: <span style={{ color: '#475569', fontWeight: '800' }}>{hist.accion}</span>
                        </p>

                        {hist.accion === 'CAMBIO_ESTADO' && (
                          <p style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginTop: '2px' }}>
                            Tránsito: <strong style={{ color: '#64748b' }}>{hist.estado_anterior}</strong> &rarr; <strong style={{ color: '#10b981' }}>{hist.estado_nuevo}</strong>
                          </p>
                        )}

                        {hist.observaciones && (
                          <p style={{ fontSize: '12px', fontStyle: 'italic', color: '#64748b', marginTop: '6px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #cbd5e1' }}>
                            &ldquo;{hist.observaciones}&rdquo;
                          </p>
                        )}

                        {index < historyList.length - 1 && (
                          <div style={{ height: '1px', backgroundColor: '#f1f5f9', marginTop: '16px' }}></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
