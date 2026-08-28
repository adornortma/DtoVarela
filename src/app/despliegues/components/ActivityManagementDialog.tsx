import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { DesplieguesService } from '../services/supabase';
import { Actividad, Cto, Sigest, Estado, Material } from '../types';

interface ActivityManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ctoId: string;
  sigestId: string;
  tipoActividad: 'instalacion' | 'certificacion';
  usuario: string;
  onSaved: () => void;
  // Optional pre-loaded data if called from [id]/page.tsx
  preloadedActivity?: Actividad;
  preloadedCto?: Cto;
  preloadedSigest?: Sigest;
  preloadedEstados?: Estado[];
  preloadedMateriales?: Material[];
  // If provided, bypasses the "Estado" selector inside the modal and uses this target state
  initialTargetStateId?: string; 
}

export default function ActivityManagementDialog({
  isOpen,
  onClose,
  ctoId,
  sigestId,
  tipoActividad,
  usuario,
  onSaved,
  preloadedActivity,
  preloadedCto,
  preloadedSigest,
  preloadedEstados,
  preloadedMateriales,
  initialTargetStateId
}: ActivityManagementDialogProps) {
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [cto, setCto] = useState<Cto | null>(null);
  const [sigest, setSigest] = useState<Sigest | null>(null);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [materialesCatalogo, setMaterialesCatalogo] = useState<Material[]>([]);

  const [selectedEstadoId, setSelectedEstadoId] = useState<string>('');

  // Form states - Install
  const [installUseCaja, setInstallUseCaja] = useState(true);
  const [installCtoType, setInstallCtoType] = useState('CTO COMÚN');
  const [installUseDrop, setInstallUseDrop] = useState(false);
  const [installDropLength, setInstallDropLength] = useState('Drop 75 mts');
  const [installDropOrigen, setInstallDropOrigen] = useState('Preparado de fábrica');
  
  // Form states - Common/Cert/Simple
  const [tecnico, setTecnico] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;
    
    const loadData = async () => {
      setLoading(true);
      try {
        let act = preloadedActivity;
        let c = preloadedCto;
        let s = preloadedSigest;
        let ests = preloadedEstados;
        let mats = preloadedMateriales;

        if (!ests || ests.length === 0) ests = await DesplieguesService.getEstados();
        if (!mats || mats.length === 0) mats = await DesplieguesService.getMateriales();
        
        if (!c) {
          const allCtos = await DesplieguesService.getCtosBySigest(sigestId);
          c = allCtos.find(x => x.id === ctoId);
          if (!c) throw new Error("CTO no encontrada");
        }
        
        if (!s) {
          const allSigests = await DesplieguesService.getSigests();
          s = allSigests.find(x => x.id === c?.sigest_id);
          if (!s) throw new Error("SIGEST no encontrado");
        }

        if (!act) {
          const acts = await DesplieguesService.getActividadesByCtoIds([ctoId]);
          const sufijo = tipoActividad === 'instalacion' ? 'instalar' : 'certificar';
          act = acts.find(a => 
            a.cto_id === ctoId && 
            (a.despliegues_tipos_actividad as any)?.nombre.toLowerCase().includes(sufijo)
          );
          if (!act) throw new Error("Actividad no encontrada");
        }

        if (isMounted) {
          setEstados(ests);
          setMaterialesCatalogo(mats);
          setCto(c);
          setSigest(s);
          setActividad(act);
          
          const initialStatusId = initialTargetStateId || act.estado_id;
          setSelectedEstadoId(initialStatusId);
          setTecnico(act.tecnico_nombre || act.tecnico_asignado || '');
          setObservaciones(act.observaciones || '');
          setFotos([]);
          setInstallUseCaja(true);
          setInstallUseDrop(false);
        }
      } catch (err) {
        console.error(err);
        alert("Error cargando los datos de la actividad.");
        onClose();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [isOpen, ctoId, sigestId, tipoActividad, initialTargetStateId]);

  const targetState = estados.find(e => e.id === selectedEstadoId);
  const isCompletedSelected = targetState?.nombre.toLowerCase() === 'completado';
  const isInstalar = tipoActividad === 'instalacion';

  const handleUploadPhotos = async (activityId: string, files: File[], currentStatus: string) => {
    if (files.length === 0) return;
    
    const MAX_SIZE_MB = 15;
    for (const file of files) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error('El archivo ' + file.name + ' supera el limite de ' + MAX_SIZE_MB + 'MB.');
      }
    }

    setUploadingPhotos(true);
    try {
      for (const file of files) {
        const publicUrl = await DesplieguesService.uploadFoto(file, usuario);
        await DesplieguesService.addFoto(activityId, publicUrl, usuario, currentStatus);
      }
    } catch (e: any) {
      console.error(e);
      alert('Error al subir fotografía: ' + (e.message || ''));
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actividad || !selectedEstadoId) return;

    setSaving(true);
    try {
      if (!targetState) throw new Error('Estado destino no encontrado');

      // ACTUALIZAR ESTADO ACTIVIDAD
      await DesplieguesService.updateActividad(
        actividad.id,
        selectedEstadoId,
        tecnico || null,
        observaciones || null,
        usuario,
        (actividad.despliegues_estados as any)?.nombre || 'Pendiente',
        targetState.nombre
      );

      // SI ESTA COMPLETADO Y ES INSTALACION, ACTUALIZAR MATERIALES
      if (isCompletedSelected && isInstalar) {
        const materialsToSave: { material_id: string; cantidad: number; origen: string | null }[] = [];
        
        if (installUseCaja) {
          const targetCtoName = sigest?.tipo === 'desbalanceado' ? installCtoType : 'Caja CTO';
          let cajaMat = materialesCatalogo.find(m => m.nombre === targetCtoName);
          if (cajaMat) {
            materialsToSave.push({ material_id: cajaMat.id, cantidad: 1, origen: null });
          }
        }

        if (installUseDrop) {
          let dropMat = materialesCatalogo.find(m => m.nombre === installDropLength);
          if (dropMat) {
            materialsToSave.push({ material_id: dropMat.id, cantidad: 1, origen: installDropOrigen });
          }
        }

        if (materialsToSave.length > 0) {
          await DesplieguesService.saveActividadMateriales(actividad.id, materialsToSave);
        }
      } else if (!isCompletedSelected && cto && observaciones) {
         await DesplieguesService.updateCto(
           cto.id,
           cto.codigo,
           cto.direccion || '',
           usuario,
           cto.pelo_cto || undefined,
           observaciones
         );
      }

      // SUBIR FOTOS
      if (fotos.length > 0) {
        await handleUploadPhotos(actividad.id, fotos, targetState.nombre);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Ocurrió un error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 51, 102, 0.4)', backdropFilter: 'blur(8px)',
      zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '500px', backgroundColor: 'white',
        borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a' }}>
              {loading ? 'Cargando...' : 'Gestionar ' + (isInstalar ? 'Instalación' : 'Certificación')}
            </h3>
            {!loading && cto && (
              <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>
                CTO: {cto.codigo} | {cto.direccion}
              </p>
            )}
          </div>
          <button onClick={onClose} disabled={loading || saving} style={{ padding: '6px', cursor: 'pointer', border: 'none', background: 'transparent' }}>
            <X size={20} color="#0f172a" />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="animate-spin" size={32} color="#019df4" />
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {!initialTargetStateId && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Estado</label>
                <select
                  value={selectedEstadoId}
                  onChange={e => setSelectedEstadoId(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                    fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', backgroundColor: 'white', boxSizing: 'border-box'
                  }}
                >
                  <option value="" disabled>Seleccione un estado...</option>
                  {estados.filter(e => ['pendiente', 'en proceso', 'completado', 'observado'].includes(e.nombre.toLowerCase())).map(est => (
                    <option key={est.id} value={est.id}>{est.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {isCompletedSelected && isInstalar && (
              <>
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
                    <div style={{ marginTop: '8px', paddingLeft: '26px' }}>
                      {sigest?.tipo === 'desbalanceado' && (
                        <div>
                          <span style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Tipo de CTO (Desbalanceado)</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {['CTO 70/30', 'CTO 50/50', 'CTO COMÚN'].map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setInstallCtoType(type)}
                                style={{
                                  flex: 1, padding: '8px', fontSize: '11px', fontWeight: '705', borderRadius: '8px',
                                  backgroundColor: installCtoType === type ? '#019df4' : 'white',
                                  color: installCtoType === type ? 'white' : '#475569',
                                  border: installCtoType === type ? '1px solid #019df4' : '1px solid #e2e8f0'
                                }}
                              >
                                {type.replace('CTO ', '')}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                Técnico {isCompletedSelected ? (isInstalar ? 'que instaló' : 'que certificó') : 'Asignado (Opcional)'}
              </label>
              <input 
                type="text" 
                value={tecnico}
                onChange={e => setTecnico(e.target.value)}
                placeholder="Nombre del técnico..."
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                  fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                Evidencia Fotográfica (Opcional)
              </label>
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={e => {
                  if (e.target.files) {
                    setFotos(Array.from(e.target.files));
                  }
                }}
                style={{
                  width: '100%', padding: '10px', borderRadius: '12px', border: '1px dashed #cbd5e1',
                  fontSize: '13px', outline: 'none', cursor: 'pointer', boxSizing: 'border-box'
                }}
              />
              {fotos.length > 0 && (
                <p style={{ fontSize: '12px', color: '#019df4', marginTop: '4px', fontWeight: '700' }}>
                  {fotos.length} archivo(s) seleccionado(s)
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '850', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Observaciones</label>
              <textarea 
                rows={3}
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Detalles u observaciones..."
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0',
                  fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', boxSizing: 'border-box'
                }}
              />
            </div>

            <button 
              type="submit"
              disabled={saving || uploadingPhotos || !selectedEstadoId}
              style={{
                backgroundColor: '#019df4', color: 'white', padding: '14px', borderRadius: '12px',
                fontWeight: '800', fontSize: '14px', cursor: 'pointer', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px', border: 'none'
              }}
            >
              {(saving || uploadingPhotos) ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Actividad'}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}
