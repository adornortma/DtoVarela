'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { DesplieguesService } from '../services/supabase';

export default function FinalizadosPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const stats = await DesplieguesService.getDashboardStats();
      const finished = stats.items.filter((i: any) => i.is_finalizado);
      setItems(finished);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase();
    return item.numero_sigest?.toLowerCase().includes(q) || item.central?.toLowerCase().includes(q);
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <Link href="/despliegues" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
              <ArrowLeft size={20} />
              Volver a Activos
            </Link>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a' }}>
            Proyectos Finalizados
          </h1>
          <p style={{ color: '#64748b', fontWeight: '600', marginTop: '4px' }}>
            Histórico de SIGEST con el 100% de sus actividades completadas
          </p>
        </header>

        <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
              {filteredItems.length} proyectos terminados
            </h2>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Buscar SIGEST o Central..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <Loader2 className="animate-spin" size={32} color="#94a3b8" style={{ margin: '0 auto' }} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>
                    <th style={{ padding: '16px' }}>SIGEST</th>
                    <th style={{ padding: '16px' }}>CENTRAL / POLÍGONO</th>
                    <th style={{ padding: '16px' }}>CTOS</th>
                    <th style={{ padding: '16px' }}>INSTALADAS</th>
                    <th style={{ padding: '16px' }}>CERTIFICADAS</th>
                    <th style={{ padding: '16px' }}>AVANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px', fontWeight: '800', color: '#0f172a' }}>{item.numero_sigest}</td>
                      <td style={{ padding: '16px', fontWeight: '600', color: '#475569' }}>{item.central}</td>
                      <td style={{ padding: '16px', fontWeight: '700' }}>{item.total_ctos}</td>
                      <td style={{ padding: '16px', fontWeight: '700', color: '#047857' }}>{item.instaladas}</td>
                      <td style={{ padding: '16px', fontWeight: '700', color: '#0369a1' }}>{item.certificadas}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: '999px', fontWeight: '800', fontSize: '13px' }}>
                          100% Completado
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>
                        No se encontraron proyectos finalizados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
