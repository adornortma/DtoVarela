'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, Database, Briefcase, ChevronRight, Loader2, ClipboardList
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
  }[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const loadDashboard = async () => {
    setLoadingDashboard(true);
    try {
      const stats = await DesplieguesService.getDashboardStats();
      setDashboardItems(stats);
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
              placeholder="Buscar por SIGEST, código de CTO, dirección o central..."
              style={{
                width: '100%', padding: '14px 16px 14px 48px', borderRadius: '16px', border: '1px solid #e2e8f0',
                fontSize: '14px', outline: 'none', fontWeight: '600', color: '#0f172a', backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)', boxSizing: 'border-box'
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
                  onClick={() => router.push(`/despliegues/${s.id}`)}
                  style={{
                    padding: '8px 12px', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '13px', fontWeight: '700', color: '#1e293b', display: 'flex', gap: '8px', alignItems: 'center'
                  }}
                >
                  <span>SIGEST {s.numero_sigest}</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>({s.central})</span>
                  <ChevronRight size={14} color="#94a3b8" />
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Master Summary Dashboard Table */}
      <section style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={20} color="#019df4" /> Centrales y Polígonos de Despliegue
        </h3>
        
        {loadingDashboard ? (
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '24px', display: 'flex', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
            <Loader2 className="animate-spin" size={24} color="#019df4" />
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
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Número SIGEST</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Central</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Instaladas / Totales</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Certificadas / Totales</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', width: '200px' }}>Avance Central</th>
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
                      <td style={{ padding: '16px', fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>
                        {item.numero_sigest}
                      </td>
                      <td style={{ padding: '16px', color: '#475569', fontSize: '13px', fontWeight: '700' }}>
                        {item.central}
                      </td>
                      <td style={{ padding: '16px', color: '#475569', fontSize: '13px', fontWeight: '700' }}>
                        <span style={{ color: '#16a34a', fontWeight: '800' }}>{item.instaladas}</span> / {item.total_ctos}
                      </td>
                      <td style={{ padding: '16px', color: '#475569', fontSize: '13px', fontWeight: '700' }}>
                        <span style={{ color: '#0369a1', fontWeight: '800' }}>{item.certificadas}</span> / {item.total_ctos}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '8px', backgroundColor: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${item.progreso}%`, backgroundColor: '#019df4', borderRadius: '10px' }}></div>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '800', color: '#019df4', minWidth: '35px', textAlign: 'right' }}>{item.progreso}%</span>
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

    </div>
  );
}
