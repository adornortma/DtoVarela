'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, Database, Briefcase, ChevronRight, Loader2, ClipboardList, X, ExternalLink
} from 'lucide-react';
import { DesplieguesService } from './services/supabase';
import { Sigest } from './types';

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
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const stats = await DesplieguesService.getDashboardStats();
      setDashboardItems(stats.items);
      setSummaryStats(stats.summary);
    } catch (e) {
      console.error('Error loading dashboard stats:', e);
    } finally {
      setLoadingDashboard(false);
    }
  };

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
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Número SIGEST</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Central</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Estado</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Instaladas / Totales</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Certificadas / Totales</th>
                  <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', width: '200px' }}>Avance Central</th>
                </tr>
              </thead>
              <tbody>
                {dashboardItems.map(item => {
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => router.push(`/despliegues/${item.id}`)}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9', 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
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
          zIndex: 999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          transition: 'opacity 0.3s ease-in-out'
        }} onClick={() => setShowBottomSheet(false)}>
          <div style={{
            width: '100%', maxWidth: '850px', backgroundColor: 'white',
            borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            padding: '24px', maxHeight: '75vh', overflowY: 'auto',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.15)', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', gap: '20px',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
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

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
