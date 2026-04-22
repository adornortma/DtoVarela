'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Search,
  History,
  FileEdit,
  Eye,
  PlusCircle,
  ChevronRight,
  Filter,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AuditoriaGlobalPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    const saved = localStorage.getItem('bp_session');
    if (saved) {
      const userObj = JSON.parse(saved);
      if (userObj.usuario?.trim().toUpperCase() === 'ADORNO') {
        setUser(userObj);
        fetchLogs();
      } else {
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('seguimiento_bp_log')
        .select('*, tecnicos(nombre, apellido, dni)')
        .order('fecha', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.usuario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.campo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${log.tecnicos?.nombre} ${log.tecnicos?.apellido}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.accion === filterAction;
    
    return matchesSearch && matchesAction;
  });

  if (!user) return null;

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link href="/" style={{ 
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
                <ShieldCheck size={28} color="#019df4" />
                <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.2px' }}>Auditoría Global</h1>
              </div>
              <p style={{ color: '#64748b', fontWeight: '700', marginTop: '4px' }}>Registro de toda la actividad del sistema Seguimiento BP</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
             <button 
              onClick={fetchLogs}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0', 
                borderRadius: '14px', 
                fontSize: '14px', 
                fontWeight: '800', 
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
             >
               <History size={16} />
               Actualizar
             </button>
          </div>
        </header>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '32px', 
          border: '1px solid #e2e8f0', 
          padding: '32px', 
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar por técnico, usuario o campo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '14px 14px 14px 48px', 
                  borderRadius: '16px', 
                  border: '1px solid #e2e8f0', 
                  backgroundColor: '#f8fafc',
                  fontSize: '14px',
                  fontWeight: '700',
                  outline: 'none',
                  color: '#1e293b'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '16px' }}>
              <button 
                onClick={() => setFilterAction('all')}
                style={{ 
                  padding: '10px 16px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  fontSize: '12px', 
                  fontWeight: '900', 
                  backgroundColor: filterAction === 'all' ? 'white' : 'transparent',
                  color: filterAction === 'all' ? '#0f172a' : '#64748b',
                  boxShadow: filterAction === 'all' ? '0 4px 8px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >TODOS</button>
              <button 
                onClick={() => setFilterAction('view')}
                style={{ 
                  padding: '10px 16px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  fontSize: '12px', 
                  fontWeight: '900', 
                  backgroundColor: filterAction === 'view' ? 'white' : 'transparent',
                  color: filterAction === 'view' ? '#0f172a' : '#64748b',
                  boxShadow: filterAction === 'view' ? '0 4px 8px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >VISTAS</button>
              <button 
                onClick={() => setFilterAction('edit')}
                style={{ 
                  padding: '10px 16px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  fontSize: '12px', 
                  fontWeight: '900', 
                  backgroundColor: filterAction === 'edit' ? 'white' : 'transparent',
                  color: filterAction === 'edit' ? '#0f172a' : '#64748b',
                  boxShadow: filterAction === 'edit' ? '0 4px 8px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >EDICIONES</button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '100px', textAlign: 'center' }}>
              <Loader2 className="animate-spin" size={40} color="#019df4" style={{ margin: '0 auto' }} />
              <p style={{ marginTop: '16px', color: '#64748b', fontWeight: '800' }}>Cargando registros...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '80px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
              <p style={{ color: '#64748b', fontWeight: '800', fontSize: '16px' }}>No se encontraron registros que coincidan con la búsqueda.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredLogs.map((log) => {
                const techName = log.tecnicos ? `${log.tecnicos.apellido}, ${log.tecnicos.nombre}` : 'Técnico Desconocido';
                
                return (
                  <div key={log.id} style={{ 
                    padding: '24px', 
                    borderRadius: '24px', 
                    border: '1px solid #f1f5f9', 
                    backgroundColor: '#f8fafc', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    transition: 'transform 0.2s'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '950', color: '#0f172a', fontSize: '16px' }}>{techName}</span>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>DNI: {log.tecnicos?.dni || 'N/A'}</span>
                        </div>
                        <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 4px' }}></div>
                        <span style={{ fontWeight: '800', color: '#019df4', fontSize: '14px' }}>{log.usuario}</span>
                        <span style={{ 
                          fontSize: '10px', 
                          backgroundColor: log.accion === 'edit' ? '#fef3c7' : (log.accion === 'view' ? '#e0f2fe' : '#dcfce7'),
                          color: log.accion === 'edit' ? '#92400e' : (log.accion === 'view' ? '#0369a1' : '#166534'),
                          padding: '4px 12px',
                          borderRadius: '99px',
                          fontWeight: '950',
                          letterSpacing: '0.5px'
                        }}>{log.accion.toUpperCase()}</span>
                      </div>
                      
                      {log.campo && (
                         <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '800' }}>Campo: <span style={{ color: '#1e293b' }}>{log.campo}</span></span>
                         </div>
                      )}

                      {(log.valor_anterior || log.valor_nuevo) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'white', padding: '12px 16px', borderRadius: '12px', border: '1px solid #f1f5f9', marginTop: '12px' }}>
                          {log.valor_anterior && (
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                              <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>ANTERIOR</span>
                              <span style={{ fontWeight: '800', color: '#ef4444' }}>{log.valor_anterior}</span>
                            </div>
                          )}
                          {log.valor_anterior && log.valor_nuevo && <ChevronRight size={16} color="#cbd5e1" />}
                          {log.valor_nuevo && (
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                              <span style={{ fontSize: '11px', fontWeight: '950', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>NUEVO</span>
                              <span style={{ fontWeight: '800', color: '#10b981' }}>{log.valor_nuevo}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ textAlign: 'right', minWidth: '150px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '950', color: '#1e293b' }}>
                        {new Date(log.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#94a3b8', marginTop: '4px' }}>
                        {new Date(log.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      
                      <Link 
                        href={`/tecnicos/${log.tecnicos?.dni}`}
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          marginTop: '12px', 
                          fontSize: '11px', 
                          fontWeight: '950', 
                          color: '#019df4', 
                          textDecoration: 'none',
                          border: '1px solid #019df433',
                          padding: '4px 10px',
                          borderRadius: '8px'
                        }}
                      >
                        VER TÉCNICO <ArrowLeft size={12} style={{ transform: 'rotate(180deg)' }} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

