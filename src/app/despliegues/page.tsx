'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, Database, Briefcase, ChevronRight, Loader2, ClipboardList, X, ExternalLink, UserCheck, Settings
} from 'lucide-react';
import { DesplieguesService } from './services/supabase';
import { Sigest } from './types';
import ActivityManagementDialog from './components/ActivityManagementDialog';

export default function DesplieguesTrackingPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Sigest[]>([]);
  const [dashboardItems, setDashboardItems] = useState<{
    id: string;
    numero_sigest: string;
    central: string;
    total_ctos: number;
    instaladas: number;
    certificadas: number;
    progreso: number;
    tiene_observadas: boolean;
  }[]>([]);
  const [summaryStats, setSummaryStats] = useState<{
    totalSigests: number;
    totalInstalledCtos: number;
    installPendientes: number;
    installObservadas: number;
    certPendientes: number;
    certObservadas: number;
    listSigests: any[];
    listInstalled: any[];
    listInstallPendientes: any[];
    listInstallObservadas: any[];
    listCertPendientes: any[];
    listCertObservadas: any[];
  } | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetTitle, setBottomSheetTitle] = useState('');
  const [bottomSheetType, setBottomSheetType] = useState<'sigests' | 'ctos'>('ctos');
  const [bottomSheetData, setBottomSheetData] = useState<any[]>([]);
  const [sortField, setSortField] = useState<'numero_sigest' | 'central' | 'estado' | 'instaladas' | 'certificadas' | 'progreso' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [filterAssignable, setFilterAssignable] = useState(false);
  const [filterAssigned, setFilterAssigned] = useState(false);
  const [showInstalacion, setShowInstalacion] = useState(true);
  const [showCertificacion, setShowCertificacion] = useState(true);
  const [expandedSigestIds, setExpandedSigestIds] = useState<string[]>([]);
  
  // Dialog state
  const [selectedActivityForDialog, setSelectedActivityForDialog] = useState<{ ctoId: string, sigestId: string, tipoActividad: 'instalacion' | 'certificacion' } | null>(null);
  const [finishedCount, setFinishedCount] = useState(0);

  const toggleExpandSigest = (sigestId: string) => {
    setExpandedSigestIds(prev => 
      prev.includes(sigestId) ? prev.filter(id => id !== sigestId) : [...prev, sigestId]
    );
  };
  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const stats = await DesplieguesService.getDashboardStats();
      const active = stats.items.filter((i: any) => !i.is_finalizado);
      const finished = stats.items.filter((i: any) => i.is_finalizado);
      setDashboardItems(active);
      setFinishedCount(finished.length);
      setSummaryStats(stats.summary);
    } catch (e) {
      console.error('Error loading dashboard stats:', e);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleSort = (field: 'numero_sigest' | 'central' | 'estado' | 'instaladas' | 'certificadas' | 'progreso') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = React.useMemo(() => {
    if (!sortField) return dashboardItems;
    return [...dashboardItems].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'numero_sigest') {
        aVal = a.numero_sigest;
        bVal = b.numero_sigest;
      } else if (sortField === 'central') {
        aVal = a.central;
        bVal = b.central;
      } else if (sortField === 'estado') {
        const getStatusRank = (item: typeof a) => {
          if (item.progreso === 100) return 3;
          if (item.progreso === 0) return 0;
          if (item.tiene_observadas) return 2;
          return 1;
        };
        aVal = getStatusRank(a);
        bVal = getStatusRank(b);
      } else if (sortField === 'instaladas') {
        aVal = a.instaladas;
        bVal = b.instaladas;
      } else if (sortField === 'certificadas') {
        aVal = a.certificadas;
        bVal = b.certificadas;
      } else if (sortField === 'progreso') {
        aVal = a.progreso;
        bVal = b.progreso;
      }

      if (aVal === bVal) return 0;
      const modifier = sortDirection === 'asc' ? 1 : -1;
      return aVal > bVal ? modifier : -modifier;
    });
  }, [dashboardItems, sortField, sortDirection]);

  const unassignedActivities = React.useMemo(() => {
    if (!summaryStats) return [];
    
    // Rule 1: Only pending activities are assignable (Observed ones are NOT assignable)
    let unassignedInst: any[] = [];
    if (showInstalacion) {
      unassignedInst = (summaryStats.listInstallPendientes || [])
        .filter((item: any) => !item.tecnico_asignado)
        .map((item: any) => ({ ...item, tipo: 'Instalación: Pendiente' }));
    }
      
    // Rule 2: Certification is ONLY assignable if the corresponding CTO installation is completed
    let unassignedCert: any[] = [];
    if (showCertificacion) {
      const installedCtoIds = new Set((summaryStats.listInstalled || []).map((c: any) => c.id));
      unassignedCert = (summaryStats.listCertPendientes || [])
        .filter((item: any) => !item.tecnico_asignado && installedCtoIds.has(item.id))
        .map((item: any) => ({ ...item, tipo: 'Certificación: Pendiente' }));
    }

    return [...unassignedInst, ...unassignedCert];
  }, [summaryStats, showInstalacion, showCertificacion]);

  const assignableSigestIds = React.useMemo(() => {
    const ids = new Set(unassignedActivities.map(act => act.sigest_id));
    return Array.from(ids);
  }, [unassignedActivities]);

  const assignedActivities = React.useMemo(() => {
    if (!summaryStats) return [];
    
    const listInst = summaryStats.listInstallPendientes || [];
    const listInstObs = summaryStats.listInstallObservadas || [];
    const listCert = summaryStats.listCertPendientes || [];
    const listCertObs = summaryStats.listCertObservadas || [];
    
    const combined: any[] = [];
    if (showInstalacion) {
      combined.push(...listInst, ...listInstObs);
    }
    if (showCertificacion) {
      combined.push(...listCert, ...listCertObs);
    }
    
    return combined.filter((item: any) => {
      return !!item.tecnico_asignado;
    }).map((item: any) => {
      const isInstall = listInst.some(x => x.id === item.id) || listInstObs.some(x => x.id === item.id);
      return {
        ...item,
        tipo: isInstall ? 'Instalación' : 'Certificación'
      };
    });
  }, [summaryStats, showInstalacion, showCertificacion]);

  const assignedSigestIds = React.useMemo(() => {
    const ids = new Set(assignedActivities.map(act => act.sigest_id));
    return Array.from(ids);
  }, [assignedActivities]);

  const filteredDashboardItems = React.useMemo(() => {
    let items = sortedItems;
    if (filterAssignable) {
      items = items.filter(item => assignableSigestIds.includes(item.id));
    } else if (filterAssigned) {
      items = items.filter(item => assignedSigestIds.includes(item.id));
    }
    return items;
  }, [sortedItems, filterAssignable, filterAssigned, assignableSigestIds, assignedSigestIds]);

  useEffect(() => {
    loadDashboard();
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
        router.push(`/despliegues/${results[0].id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      
      {/* Top Search bar & navigation */}
      <header style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Briefcase size={28} color="#2563eb" />
              <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.0px' }}>
                Seguimiento de Despliegues FTTH
              </h1>
            </div>
            <p style={{ color: '#64748b', fontWeight: '600', marginTop: '4px' }}>
              Consola operativa para la gestión de materiales y avance de CTOs
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/despliegues/finalizados" style={{
              backgroundColor: 'white',
              color: '#334155',
              padding: '12px 20px',
              borderRadius: '16px',
              fontWeight: '800',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
              📁 Finalizados ({finishedCount})
            </Link>
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
              <Settings size={18} /> Administrar SIGESTs
            </Link>
          </div>
        </div>

        {/* Summary Stats Cards */}
        {summaryStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '8px', marginBottom: '8px' }}>
            <div 
              onClick={() => {
                setBottomSheetTitle("SIGESTs Asignados");
                setBottomSheetType("sigests");
                setBottomSheetData(summaryStats.listSigests || []);
                setShowBottomSheet(true);
              }}
              style={{ backgroundColor: 'white', borderRadius: '18px', padding: '16px 20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: '11px', fontWeight: '850', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SIGESTs Asignados</span>
              <span style={{ fontSize: '26px', fontWeight: '950', color: '#0f172a' }}>{summaryStats.totalSigests}</span>
            </div>
            <div 
              onClick={() => {
                setBottomSheetTitle("CTOs Instaladas");
                setBottomSheetType("ctos");
                setBottomSheetData(summaryStats.listInstalled || []);
                setShowBottomSheet(true);
              }}
              style={{ backgroundColor: 'white', borderRadius: '18px', padding: '16px 20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: '11px', fontWeight: '850', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CTOs Instaladas</span>
              <span style={{ fontSize: '26px', fontWeight: '950', color: '#2563eb' }}>{summaryStats.totalInstalledCtos}</span>
            </div>
            <div 
              onClick={() => {
                setBottomSheetTitle("Instalación: Pendientes");
                setBottomSheetType("ctos");
                setBottomSheetData(summaryStats.listInstallPendientes || []);
                setShowBottomSheet(true);
              }}
              style={{ backgroundColor: 'white', borderRadius: '18px', padding: '16px 20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: '11px', fontWeight: '850', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Instalación: Pendientes</span>
              <span style={{ fontSize: '26px', fontWeight: '950', color: '#b45309' }}>{summaryStats.installPendientes}</span>
            </div>
            <div 
              onClick={() => {
                setBottomSheetTitle("Instalación: Observadas");
                setBottomSheetType("ctos");
                setBottomSheetData(summaryStats.listInstallObservadas || []);
                setShowBottomSheet(true);
              }}
              style={{ backgroundColor: 'white', borderRadius: '18px', padding: '16px 20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: '11px', fontWeight: '850', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Instalación: Observadas</span>
              <span style={{ fontSize: '26px', fontWeight: '950', color: '#dc2626' }}>{summaryStats.installObservadas}</span>
            </div>
            <div 
              onClick={() => {
                setBottomSheetTitle("Certificación: Pendientes");
                setBottomSheetType("ctos");
                setBottomSheetData(summaryStats.listCertPendientes || []);
                setShowBottomSheet(true);
              }}
              style={{ backgroundColor: 'white', borderRadius: '18px', padding: '16px 20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: '11px', fontWeight: '850', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Certificación: Pendientes</span>
              <span style={{ fontSize: '26px', fontWeight: '950', color: '#0284c7' }}>{summaryStats.certPendientes}</span>
            </div>
            <div 
              onClick={() => {
                setBottomSheetTitle("Certificación: Observadas");
                setBottomSheetType("ctos");
                setBottomSheetData(summaryStats.listCertObservadas || []);
                setShowBottomSheet(true);
              }}
              style={{ backgroundColor: 'white', borderRadius: '18px', padding: '16px 20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontSize: '11px', fontWeight: '850', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Certificación: Observadas</span>
              <span style={{ fontSize: '26px', fontWeight: '950', color: '#7c3aed' }}>{summaryStats.certObservadas}</span>
            </div>
          </div>
        )}

        {/* Search Input Box */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '700px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por SIGEST, código de CTO, dirección o central..."
              style={{
                width: '100%', padding: '14px 16px 14px 48px', borderRadius: '16px', border: '1px solid #e2e8f0',
                fontSize: '16px', outline: 'none', fontWeight: '600', color: '#0f172a', backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)', boxSizing: 'border-box'
              }}
            />
          </div>
          <button 
            type="submit"
            style={{
              backgroundColor: '#2563eb', color: 'white', padding: '0 28px', borderRadius: '16px',
              fontWeight: '800', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', flexShrink: 0, minWidth: '110px',
              justifyContent: 'center'
            }}
          >
            {loadingSearch ? <Loader2 className="animate-spin" size={16} /> : 'Buscar'}
          </button>
        </form>

        {/* Filters and Toggle options */}
        <div style={{
          display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', width: '100%', marginTop: '8px',
          backgroundColor: '#f8fafc', padding: '14px 20px', borderRadius: '16px', border: '1px solid #e2e8f0',
          boxSizing: 'border-box'
        }}>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/despliegues/asignados" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '850',
              textDecoration: 'none',
              backgroundColor: 'white',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <ClipboardList size={15} />
              <span>Resumen asignado</span>
            </Link>

            {/* Asignable Filter */}
            <button
              onClick={() => {
                setFilterAssignable(prev => !prev);
                setFilterAssigned(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '850',
                cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent',
                backgroundColor: filterAssignable ? '#fffbeb' : '#f1f5f9',
                color: filterAssignable ? '#b45309' : '#475569',
                borderColor: filterAssignable ? '#fde68a' : '#e2e8f0',
                boxShadow: filterAssignable ? '0 4px 12px rgba(180, 83, 9, 0.1)' : 'none'
              }}
            >
              <UserCheck size={15} />
              <span>Asignable ({unassignedActivities.length} act. sin asignar)</span>
              {filterAssignable && (
                <span style={{
                  backgroundColor: '#b45309', color: 'white', fontSize: '10px',
                  padding: '2px 6px', borderRadius: '50%', fontWeight: '900'
                }}>✓</span>
              )}
            </button>

            {/* Asignados Filter */}
            <button
              onClick={() => {
                setFilterAssigned(prev => !prev);
                setFilterAssignable(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '850',
                cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent',
                backgroundColor: filterAssigned ? '#eff6ff' : '#f1f5f9',
                color: filterAssigned ? '#1e3a8a' : '#475569',
                borderColor: filterAssigned ? '#bfdbfe' : '#e2e8f0',
                boxShadow: filterAssigned ? '0 4px 12px rgba(30, 58, 138, 0.1)' : 'none'
              }}
            >
              <Database size={15} />
              <span>Asignados ({assignedActivities.length})</span>
              {filterAssigned && (
                <span style={{
                  backgroundColor: '#1e3a8a', color: 'white', fontSize: '10px',
                  padding: '2px 6px', borderRadius: '50%', fontWeight: '900'
                }}>✓</span>
              )}
            </button>
          </div>

          {/* Separator Line */}
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>

          {/* Activity checkboxes */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '850', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ver Tipo:</span>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '800', color: '#334155', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={showInstalacion} 
                onChange={e => setShowInstalacion(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
              />
              <span>Instalación CTO</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '800', color: '#334155', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={showCertificacion} 
                onChange={e => setShowCertificacion(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#7c3aed', cursor: 'pointer' }}
              />
              <span>Certificación CTO</span>
            </label>
          </div>
        </div>

        {/* Search Results selection */}
        {searchResults.length > 0 && (
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
            padding: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            <p style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Resultados encontrados ({searchResults.length}):</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {searchResults.map(s => (
                <button
                  key={s.id}
                  onClick={() => router.push(`/despliegues/${s.id}`)}
                  style={{
                    padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '15px', fontWeight: '700', color: '#1e293b', display: 'flex', gap: '8px', alignItems: 'center'
                  }}
                >
                  <span>SIGEST {s.numero_sigest}</span>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>({s.central})</span>
                  <ChevronRight size={14} color="#94a3b8" />
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Master Summary Dashboard Table */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={20} color="#2563eb" /> Centrales y Polígonos de Despliegue
        </h3>
        
        {loadingDashboard ? (
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', display: 'flex', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
            <Loader2 className="animate-spin" size={24} color="#2563eb" />
          </div>
        ) : dashboardItems.length === 0 ? (
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', textAlign: 'center', border: '1px solid #f1f5f9', color: '#64748b' }}>
            No hay SIGESTs cargados en el sistema.
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ width: '40px', padding: '12px 16px' }}></th>
                  <th 
                    onClick={() => handleSort('numero_sigest')}
                    style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Número SIGEST {sortField === 'numero_sigest' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                  <th 
                    onClick={() => handleSort('central')}
                    style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Central {sortField === 'central' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                  <th 
                    onClick={() => handleSort('estado')}
                    style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Estado {sortField === 'estado' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                  <th 
                    onClick={() => handleSort('instaladas')}
                    style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Instaladas / Totales {sortField === 'instaladas' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                  <th 
                    onClick={() => handleSort('certificadas')}
                    style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Certificadas / Totales {sortField === 'certificadas' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                  <th 
                    onClick={() => handleSort('progreso')}
                    style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', width: '200px', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Avance Central {sortField === 'progreso' ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDashboardItems.map(item => {
                  const sigestUnassigned = unassignedActivities.filter(act => act.sigest_id === item.id);
                  const sigestAssigned = assignedActivities.filter(act => act.sigest_id === item.id);
                  
                  const drawerActivities = filterAssigned ? sigestAssigned : sigestUnassigned;
                  const hasDrawerActivities = drawerActivities.length > 0;
                  const isExpanded = expandedSigestIds.includes(item.id);

                  return (
                    <React.Fragment key={item.id}>
                      <tr 
                        onClick={() => router.push(`/despliegues/${item.id}`)}
                        style={{ 
                          borderBottom: '1px solid #f1f5f9', 
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          backgroundColor: isExpanded ? '#f8fafc' : 'transparent'
                        }}
                        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '16px', width: '40px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          {hasDrawerActivities && (
                            <button 
                              onClick={() => toggleExpandSigest(item.id)}
                              style={{
                                border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px',
                                color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '6px', transform: isExpanded ? 'rotate(90deg)' : 'none',
                                transition: 'transform 0.2s, background-color 0.2s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <ChevronRight size={16} />
                            </button>
                          )}
                        </td>
                        <td style={{ padding: '16px', fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>
                          {item.numero_sigest}
                        </td>
                        <td style={{ padding: '16px', color: '#475569', fontSize: '15px', fontWeight: '700' }}>
                          {item.central}
                        </td>
                        <td style={{ padding: '16px' }}>
                          {item.progreso === 100 ? (
                            <span style={{
                              display: 'inline-block', backgroundColor: '#ecfdf5', color: '#047857',
                              padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '850',
                              border: '1px solid #a7f3d0', textTransform: 'uppercase'
                            }}>
                              Finalizado
                            </span>
                          ) : item.progreso === 0 ? (
                            <span style={{
                              display: 'inline-block', backgroundColor: '#fffbeb', color: '#b45309',
                              padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '850',
                              border: '1px solid #fde68a', textTransform: 'uppercase'
                            }}>
                              Pendiente
                            </span>
                          ) : item.tiene_observadas ? (
                            <span style={{
                              display: 'inline-block', backgroundColor: '#fef2f2', color: '#dc2626',
                              padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '850',
                              border: '1px solid #fecaca', textTransform: 'uppercase'
                            }}>
                              Con reparos pendientes
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-block', backgroundColor: '#eff6ff', color: '#1d4ed8',
                              padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '850',
                              border: '1px solid #bfdbfe', textTransform: 'uppercase'
                            }}>
                              Iniciado
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px', color: '#475569', fontSize: '15px', fontWeight: '700' }}>
                          <span style={{ color: '#16a34a', fontWeight: '800' }}>{item.instaladas}</span> / {item.total_ctos}
                        </td>
                        <td style={{ padding: '16px', color: '#475569', fontSize: '15px', fontWeight: '700' }}>
                          <span style={{ color: '#0369a1', fontWeight: '800' }}>{item.certificadas}</span> / {item.total_ctos}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${item.progreso}%`, backgroundColor: '#2563eb', borderRadius: '10px' }}></div>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: '#2563eb', minWidth: '35px', textAlign: 'right' }}>{item.progreso}%</span>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && hasDrawerActivities && (
                        <tr style={{ backgroundColor: '#f8fafc' }} onClick={e => e.stopPropagation()}>
                          <td colSpan={7} style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: '850', color: filterAssigned ? '#2563eb' : '#b45309', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {filterAssigned ? `📅 Actividades asignadas (${drawerActivities.length}):` : `⚠️ Actividades sin asignar (${drawerActivities.length}):`}
                              </span>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginTop: '6px' }}>
                                {drawerActivities.map((act, idx) => (
                                  <div 
                                    key={idx} 
                                    onClick={() => {
                                      const isInstalar = act.tipo.toLowerCase().includes('instalaci');
                                      setSelectedActivityForDialog({
                                        ctoId: act.id,
                                        sigestId: act.sigest_id,
                                        tipoActividad: isInstalar ? 'instalacion' : 'certificacion'
                                      });
                                    }}
                                    style={{ 
                                      backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', 
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.01)', cursor: 'pointer', transition: 'all 0.2s' 
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'none'; }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontWeight: '850', color: '#0f172a', fontSize: '13px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '6px' }}>{act.codigo}</span>
                                      <span style={{
                                        fontSize: '10px', fontWeight: '850', padding: '3px 8px', borderRadius: '8px',
                                        backgroundColor: filterAssigned ? '#eff6ff' : (act.tipo.includes('Observada') ? '#fef2f2' : '#fffbeb'),
                                        color: filterAssigned ? '#1e3a8a' : (act.tipo.includes('Observada') ? '#dc2626' : '#b45309'),
                                        border: filterAssigned ? '1px solid #bfdbfe' : (act.tipo.includes('Observada') ? '1px solid #fee2e2' : '1px solid #fde68a')
                                      }}>
                                        {filterAssigned ? `${act.tipo}: Asignada` : act.tipo}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#475569', fontWeight: '700', marginTop: '6px' }}>Dir: {act.direccion}</div>
                                    {filterAssigned && act.tecnico_asignado && (
                                      <div style={{ fontSize: '11px', color: '#1e3a8a', fontWeight: '800', marginTop: '6px', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                                        Téc: {act.tecnico_asignado}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bottom Sheet Modal */}
      {showBottomSheet && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'opacity 0.3s ease-in-out', padding: '20px'
        }} onClick={() => setShowBottomSheet(false)}>
          <div style={{
            width: '100%', maxWidth: '850px', backgroundColor: 'white',
            borderRadius: '24px',
            padding: '24px', maxHeight: '85vh', overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', gap: '20px',
            animation: 'modalScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '950', color: '#0f172a', margin: 0 }}>
                {bottomSheetTitle} ({bottomSheetData.length})
              </h2>
              <button 
                onClick={() => setShowBottomSheet(false)}
                style={{ border: 'none', background: '#f1f5f9', cursor: 'pointer', padding: '6px', borderRadius: '50%', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bottomSheetData.length === 0 ? (
                <div style={{ padding: '40px 0', textTransform: 'uppercase', fontSize: '12px', fontWeight: '800', color: '#64748b', textAlign: 'center' }}>
                  No hay elementos para mostrar.
                </div>
              ) : bottomSheetType === 'sigests' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bottomSheetData.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setShowBottomSheet(false);
                        router.push(`/despliegues/${item.id}`);
                      }}
                      style={{
                        padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <div>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>SIGEST: {item.numero_sigest}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Central: {item.central} | Cajas: {item.total_ctos}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '900', color: '#2563eb' }}>{item.progreso}%</span>
                        <ExternalLink size={14} color="#2563eb" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bottomSheetData.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => {
                        setShowBottomSheet(false);
                        router.push(`/despliegues/${item.sigest_id}`);
                      }}
                      style={{
                        padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s',
                        gap: '12px'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px', backgroundColor: '#e2e8f0', padding: '3px 8px', borderRadius: '6px' }}>{item.codigo}</span>
                          <span style={{ fontSize: '12px', fontWeight: '850', color: '#64748b' }}>SIGEST: {item.sigest_numero} ({item.central})</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: '700', marginTop: '6px' }}>Dirección: {item.direccion || 'Sin dirección registrada'}</div>
                        {item.pelo_cto && <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Pelo: {item.pelo_cto}</div>}

                        {/* Assignment info badge */}
                        {item.tecnico_asignado ? (
                          <div style={{
                            marginTop: '8px', fontSize: '11px', fontWeight: '800', color: '#1e3a8a',
                            backgroundColor: '#eff6ff', padding: '6px 10px', borderRadius: '8px',
                            border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '4px',
                            marginRight: '8px'
                          }}>
                            <span>Asignado a: {item.tecnico_asignado} {item.fecha_asignacion ? `(${new Date(item.fecha_asignacion).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })})` : ''}</span>
                          </div>
                        ) : (
                          <div style={{
                            marginTop: '8px', fontSize: '11px', fontWeight: '800', color: '#b45309',
                            backgroundColor: '#fffbeb', padding: '6px 10px', borderRadius: '8px',
                            border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px',
                            marginRight: '8px'
                          }}>
                            <span>Sin asignar</span>
                          </div>
                        )}
                        
                        {(item.observaciones || item.act_observaciones) && (
                          <div style={{
                            marginTop: '8px', fontSize: '12px', fontWeight: '800', color: '#dc2626',
                            backgroundColor: '#fef2f2', padding: '6px 10px', borderRadius: '8px',
                            border: '1px solid #fee2e2', display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <span>Obs: {item.observaciones || item.act_observaciones}</span>
                          </div>
                        )}
                      </div>
                      <ExternalLink size={14} color="#2563eb" style={{ flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Management Dialog */}
      {selectedActivityForDialog && (
        <ActivityManagementDialog
          isOpen={true}
          onClose={() => setSelectedActivityForDialog(null)}
          ctoId={selectedActivityForDialog.ctoId}
          sigestId={selectedActivityForDialog.sigestId}
          tipoActividad={selectedActivityForDialog.tipoActividad}
          usuario="Admin" // or whoever is logged in. In [id]/page.tsx they used 'Invitado' if no user
          onSaved={() => {
            loadDashboard(); // Refresh data!
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes modalScale {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
}
