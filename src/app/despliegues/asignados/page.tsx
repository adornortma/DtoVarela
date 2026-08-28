'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DesplieguesService } from '../services/supabase';
import { 
  ArrowLeft, Search, User, Filter, CheckCircle, Clock, AlertTriangle, AlertCircle, X, ChevronRight, Briefcase, ClipboardList, Plus, Loader2
} from 'lucide-react';

// Data types from getAsignadosData
interface AsignadoAct {
  id: string;
  tecnico_asignado: string | null;
  fecha_asignacion: string | null;
  estado: string;
  tipo: string;
  observaciones: string | null;
  cto_id: string;
  cto_codigo: string;
  cto_direccion: string;
  sigest_id: string;
  sigest_numero: string;
  sigest_central: string;
}

function TechnicianSelector({ 
  value, 
  onChange, 
  technicians, 
  placeholder = "Seleccionar técnico...",
  size = "default"
}: { 
  value: string; 
  onChange: (v: string) => void; 
  technicians: string[]; 
  placeholder?: string;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = technicians.filter(t => t.toLowerCase().includes(search.toLowerCase()));
  const isSm = size === "sm";

  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setSearch('');
        }}
        style={{
          width: '100%', 
          padding: isSm ? '4px 8px' : '10px 14px', 
          borderRadius: isSm ? '6px' : '10px', 
          border: '1px solid #cbd5e1',
          fontSize: isSm ? '11px' : '13px', 
          fontWeight: isSm ? '600' : '700', 
          color: value ? '#0f172a' : '#94a3b8',
          backgroundColor: 'white', textAlign: 'left', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer'
        }}
      >
        <span>{value || placeholder}</span>
        {value ? (
          <span style={{ fontSize: isSm ? '12px' : '14px', color: '#10b981' }}>✓</span>
        ) : (
          <ChevronRight size={12} style={{ transform: open ? 'rotate(270deg)' : 'rotate(90deg)', transition: 'transform 0.2s' }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
          backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 5000,
          display: 'flex', flexDirection: 'column', maxHeight: '250px', overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <input
              autoFocus
              type="text"
              placeholder="🔍 Buscar técnico..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0',
                fontSize: '13px', fontWeight: '600', color: '#0f172a', boxSizing: 'border-box',
                outline: 'none', backgroundColor: '#f8fafc'
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filtered.length === 0 && !search.trim() ? (
              <div style={{ padding: '12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>No hay técnicos</div>
            ) : (
              <>
                {filtered.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onChange(t);
                      setOpen(false);
                    }}
                    style={{
                      width: '100%', padding: '8px 12px', border: 'none', backgroundColor: 'transparent',
                      textAlign: 'left', fontSize: '13px', fontWeight: '700', color: '#334155',
                      cursor: 'pointer', borderRadius: '6px', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {t}
                    {value === t && <span style={{ color: '#10b981' }}>✓</span>}
                  </button>
                ))}
                {search.trim() && !technicians.some(t => t.toLowerCase() === search.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(search.trim().toUpperCase());
                      setOpen(false);
                    }}
                    style={{
                      width: '100%', padding: '8px 12px', border: 'none', backgroundColor: 'transparent',
                      textAlign: 'left', fontSize: '13px', fontWeight: '800', color: '#2563eb',
                      cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px',
                      borderTop: filtered.length > 0 ? '1px solid #e2e8f0' : 'none', marginTop: filtered.length > 0 ? '4px' : '0'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Plus size={14} /> Asignar "{search.trim().toUpperCase()}"
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResumenAsignadoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actividades, setActividades] = useState<AsignadoAct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection state
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  
  // Detail filters
  const [filterTipo, setFilterTipo] = useState('Todas');
  const [filterEstado, setFilterEstado] = useState('Todos');

  // Bulk assignment state for "Sin asignar"
  const [selectedSinAsignar, setSelectedSinAsignar] = useState<string[]>([]);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkTechName, setBulkTechName] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await DesplieguesService.getAsignadosData();
      setActividades(data);
    } catch (err) {
      console.error(err);
      alert('Error cargando los datos.');
    } finally {
      setLoading(false);
    }
  };

  const { techMap, sinAsignarList, summary } = useMemo(() => {
    const map = new Map<string, AsignadoAct[]>();
    const sinAsig: AsignadoAct[] = [];
    const sum = { totalInst: 0, totalCert: 0, unassigned: 0, assigned: 0 };
    
    actividades.forEach(act => {
      const isInst = act.tipo.toLowerCase().includes('instalar');
      const isCert = act.tipo.toLowerCase().includes('certificar');
      
      if (act.tecnico_asignado) {
        sum.assigned++;
        if (isInst) sum.totalInst++;
        if (isCert) sum.totalCert++;

        const t = act.tecnico_asignado.toUpperCase();
        if (!map.has(t)) map.set(t, []);
        map.get(t)!.push(act);
      } else {
        const isCompletado = act.estado.toLowerCase() === 'completado';
        if (!isCompletado) {
          sum.unassigned++;
          sinAsig.push(act);
        }
      }
    });

    return { techMap: map, sinAsignarList: sinAsig, summary: sum };
  }, [actividades]);

  const uniqueTechnicians = Array.from(techMap.keys()).sort();

  const filteredTechs = useMemo(() => {
    const result: { name: string, acts: AsignadoAct[] }[] = [];
    const searchLower = searchTerm.toLowerCase();

    for (const [name, acts] of techMap.entries()) {
      const matchesName = name.toLowerCase().includes(searchLower);
      const actsMatch = acts.some(a => 
        a.sigest_numero.toLowerCase().includes(searchLower) ||
        a.cto_codigo.toLowerCase().includes(searchLower) ||
        a.cto_direccion.toLowerCase().includes(searchLower) ||
        a.sigest_central.toLowerCase().includes(searchLower)
      );
      
      if (matchesName || actsMatch) {
        result.push({ name, acts });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [techMap, searchTerm]);

  // Detail View Component
  if (selectedTech) {
    const isSinAsignar = selectedTech === 'SIN_ASIGNAR';
    const currentName = isSinAsignar ? 'Sin Asignar' : selectedTech;
    let list = isSinAsignar ? sinAsignarList : techMap.get(selectedTech) || [];
    
    // Filter detail list
    list = list.filter(a => {
      if (filterTipo !== 'Todas') {
        const isInst = a.tipo.toLowerCase().includes('instalar');
        if (filterTipo === 'Instalación' && !isInst) return false;
        if (filterTipo === 'Certificación' && isInst) return false;
      }
      if (filterEstado !== 'Todos') {
        if (a.estado.toLowerCase() !== filterEstado.toLowerCase()) return false;
      }
      return true;
    });

    const completed = list.filter(a => a.estado.toLowerCase() === 'completado').length;
    const progress = list.length > 0 ? Math.round((completed / list.length) * 100) : 0;

    const handleBulkAssign = async () => {
      if (!bulkTechName.trim() || selectedSinAsignar.length === 0) return;
      setSavingAssign(true);
      try {
        const usuario = localStorage.getItem('usuario_nombre') || 'Sistema';
        const targets = sinAsignarList.filter(a => selectedSinAsignar.includes(a.id));
        for (const act of targets) {
          await DesplieguesService.assignActividad(act.id, bulkTechName.trim(), usuario, null);
        }
        alert('Actividades asignadas exitosamente');
        setShowBulkAssignModal(false);
        setSelectedSinAsignar([]);
        await loadData();
      } catch (err) {
        console.error(err);
        alert('Error al asignar');
      } finally {
        setSavingAssign(false);
      }
    };

    return (
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <button 
          onClick={() => { setSelectedTech(null); setSelectedSinAsignar([]); setFilterTipo('Todas'); setFilterEstado('Todos'); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px', marginBottom: '24px' }}
        >
          <ArrowLeft size={16} /> Volver al Resumen
        </button>

        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', marginBottom: '16px' }}>{currentName}</h2>
          
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>TOTAL ACTIVIDADES</p>
              <p style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>{list.length}</p>
            </div>
            {!isSinAsignar && (
              <>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>COMPLETADAS</p>
                  <p style={{ fontSize: '24px', fontWeight: '900', color: '#10b981' }}>{completed}</p>
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>AVANCE</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{progress}%</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* List & Filters */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}>
                <option value="Todas">Todas las Actividades</option>
                <option value="Instalación">Instalación</option>
                <option value="Certificación">Certificación</option>
              </select>
              <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}>
                <option value="Todos">Todos los Estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En proceso">En proceso</option>
                <option value="Observado">Observado</option>
                <option value="Completado">Completado</option>
              </select>
            </div>
            {isSinAsignar && selectedSinAsignar.length > 0 && (
              <button 
                onClick={() => setShowBulkAssignModal(true)}
                style={{ backgroundColor: '#2563eb', color: 'white', padding: '10px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', border: 'none', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}
              >
                <User size={16} /> Asignar {selectedSinAsignar.length} actividades
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  {isSinAsignar && (
                    <th style={{ padding: '12px', width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedSinAsignar.length === list.length && list.length > 0}
                        onChange={e => {
                          if (e.target.checked) setSelectedSinAsignar(list.map(a => a.id));
                          else setSelectedSinAsignar([]);
                        }}
                      />
                    </th>
                  )}
                  <th style={{ padding: '12px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>SIGEST</th>
                  <th style={{ padding: '12px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>CTO</th>
                  <th style={{ padding: '12px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>DIRECCIÓN</th>
                  <th style={{ padding: '12px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>ACTIVIDAD</th>
                  <th style={{ padding: '12px', fontSize: '12px', color: '#64748b', fontWeight: '800' }}>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {list.map(act => (
                  <tr key={act.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {isSinAsignar && (
                      <td style={{ padding: '12px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedSinAsignar.includes(act.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedSinAsignar(prev => [...prev, act.id]);
                            else setSelectedSinAsignar(prev => prev.filter(id => id !== act.id));
                          }}
                        />
                      </td>
                    )}
                    <td style={{ padding: '12px' }}>
                      <Link href={`/despliegues/${act.sigest_id}`} style={{ color: '#2563eb', fontWeight: '700', textDecoration: 'none' }}>
                        {act.sigest_numero}
                      </Link>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>{act.cto_codigo}</td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#475569' }}>{act.cto_direccion}</td>
                    <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>{act.tipo}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800',
                        backgroundColor: act.estado.toLowerCase() === 'completado' ? '#dcfce7' : act.estado.toLowerCase() === 'observado' ? '#fee2e2' : '#fef3c7',
                        color: act.estado.toLowerCase() === 'completado' ? '#166534' : act.estado.toLowerCase() === 'observado' ? '#991b1b' : '#92400e'
                      }}>
                        {act.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={isSinAsignar ? 6 : 5} style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                      No se encontraron actividades
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bulk Assign Modal for Sin Asignar */}
        {showBulkAssignModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Asignar {selectedSinAsignar.length} actividades</h3>
              <TechnicianSelector 
                value={bulkTechName} 
                onChange={setBulkTechName} 
                technicians={uniqueTechnicians}
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  onClick={handleBulkAssign}
                  disabled={savingAssign || !bulkTechName.trim()}
                  style={{ flex: 1, backgroundColor: '#2563eb', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: '700', border: 'none', cursor: 'pointer' }}
                >
                  {savingAssign ? 'Guardando...' : 'Asignar'}
                </button>
                <button 
                  onClick={() => setShowBulkAssignModal(false)}
                  disabled={savingAssign}
                  style={{ flex: 1, backgroundColor: 'transparent', color: '#64748b', padding: '12px', borderRadius: '8px', fontWeight: '700', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main Summary View
  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ClipboardList size={28} color="#2563eb" />
            <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.0px' }}>
              Resumen Asignado
            </h1>
          </div>
          <p style={{ color: '#64748b', fontWeight: '600', marginTop: '4px' }}>
            Estado de tareas por técnico y actividades pendientes de asignación
          </p>
        </div>
        <Link href="/despliegues" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontWeight: '700', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Volver a Despliegues
        </Link>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 size={32} className="animate-spin" color="#2563eb" /></div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Técnicos asignados</p>
              <p style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{uniqueTechnicians.length}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Instalaciones</p>
              <p style={{ fontSize: '32px', fontWeight: '900', color: '#2563eb' }}>{summary.totalInst}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Certificaciones</p>
              <p style={{ fontSize: '32px', fontWeight: '900', color: '#7c3aed' }}>{summary.totalCert}</p>
            </div>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <p style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Total actividades</p>
              <p style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{summary.assigned}</p>
            </div>
            <div 
              onClick={() => setSelectedTech('SIN_ASIGNAR')}
              style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '16px', border: '1px solid #fecaca', cursor: 'pointer' }}
            >
              <p style={{ fontSize: '12px', fontWeight: '800', color: '#991b1b', textTransform: 'uppercase' }}>Sin Asignar</p>
              <p style={{ fontSize: '32px', fontWeight: '900', color: '#b91c1c' }}>{summary.unassigned}</p>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ position: 'relative', maxWidth: '500px' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Buscar técnico, SIGEST, CTO, polígono..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px', border: '1px solid #cbd5e1',
                  fontSize: '14px', fontWeight: '600', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Technicians Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filteredTechs.map(({ name, acts }) => {
              const inst = acts.filter(a => a.tipo.toLowerCase().includes('instalar')).length;
              const cert = acts.filter(a => a.tipo.toLowerCase().includes('certificar')).length;
              
              const pendientes = acts.filter(a => a.estado.toLowerCase() === 'pendiente').length;
              const proceso = acts.filter(a => a.estado.toLowerCase() === 'en proceso').length;
              const completadas = acts.filter(a => a.estado.toLowerCase() === 'completado').length;
              const observadas = acts.filter(a => a.estado.toLowerCase() === 'observado').length;
              
              const progress = acts.length > 0 ? Math.round((completadas / acts.length) * 100) : 0;

              return (
                <div 
                  key={name}
                  onClick={() => setSelectedTech(name)}
                  style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {name}
                    <ChevronRight size={16} color="#cbd5e1" />
                  </h3>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ASIGNADAS</p>
                      <p style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{acts.length}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>INST/CERT</p>
                      <p style={{ fontSize: '14px', fontWeight: '800', color: '#475569', marginTop: '3px' }}>{inst} / {cert}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} color="#f59e0b" /><span style={{ fontSize: '12px', fontWeight: '600' }}>Pendiente: {pendientes}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={12} color="#3b82f6" /><span style={{ fontSize: '12px', fontWeight: '600' }}>Proceso: {proceso}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={12} color="#10b981" /><span style={{ fontSize: '12px', fontWeight: '600' }}>Completado: {completadas}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={12} color="#ef4444" /><span style={{ fontSize: '12px', fontWeight: '600' }}>Observado: {observadas}</span></div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b' }}>AVANCE</span>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981' }}>{progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#10b981' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
