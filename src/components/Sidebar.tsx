'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Home, Database, Briefcase, X, Menu, ClipboardCheck, Info } from 'lucide-react';
import React, { useState } from 'react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
  const pathname = usePathname();
  const [showInfo, setShowInfo] = useState(false);

  const navItems = [
    { name: 'KPIs Resolución', icon: <TrendingUp size={20} />, path: '/' },
    { name: 'Actividades TOA', icon: <ClipboardCheck size={20} />, path: '/actividades-toa' },
    { name: 'CARGA DE DATOS', icon: <Database size={20} />, path: '/admin/carga' },
  ];

  const sidebarContent = (
    <div style={{
      width: '260px',
      height: '100vh',
      backgroundColor: 'var(--movistar-blue)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      padding: '32px 20px',
      boxShadow: '4px 0 20px rgba(0, 51, 102, 0.1)',
      zIndex: 1000,
      position: 'relative'
    }}>
      {/* Drawer Close Button (Only Mobile) */}
      {isMobileOpen && (
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '16px',
            top: '24px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: 'white',
            padding: '8px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>
      )}

      <div style={{ marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
          <Briefcase size={24} color="var(--movistar-blue)" strokeWidth={2.5} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: '950', fontSize: '19px', letterSpacing: '0.5px', lineHeight: '1.1' }}>DISTRITO</span>
          <span style={{ fontSize: '11px', fontWeight: '800', opacity: '0.8', letterSpacing: '2px', color: '#e0f2fe' }}>F. VARELA</span>
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              onClick={onClose}
              style={{
                textDecoration: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px 18px',
                borderRadius: '16px',
                backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                fontWeight: isActive ? '900' : '600',
                fontSize: '13px',
                border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
              }}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>

      <button 
        onClick={() => setShowInfo(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          padding: '14px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          color: 'white',
          fontSize: '13px',
          fontWeight: '800',
          cursor: 'pointer',
          marginBottom: '12px',
          transition: 'all 0.2s'
        }}
      >
        <Info size={18} />
        Semaforización
      </button>

      <div style={{ 
        padding: '20px', 
        backgroundColor: 'rgba(255, 255, 255, 0.08)', 
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 10px #4ade80' }}></div>
          <span style={{ fontSize: '11px', fontWeight: '900', opacity: '0.9', letterSpacing: '0.5px' }}>SISTEMA ACTIVO</span>
        </div>
        <p style={{ fontSize: '11px', opacity: '0.6', fontWeight: '600' }}>v1.5.0 • Producción</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="desktop-sidebar">
        {sidebarContent}
      </div>

      {/* Mobile Drawer (Overlay) */}
      {isMobileOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 51, 102, 0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            animation: 'fadeIn 0.2s ease-out'
          }} 
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              animation: 'slideIn 0.3s cubic-bezier(0, 0, 0.2, 1)',
              height: '100%'
            }}
          >
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Modal Semaforización */}
      {showInfo && (
        <div 
          onClick={() => setShowInfo(false)}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            top: 0,
            backgroundColor: 'rgba(0, 51, 102, 0.4)',
            backdropFilter: 'blur(8px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: 'white',
              borderRadius: '32px',
              padding: '40px',
              maxHeight: '90vh',
              overflowY: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              animation: 'modalFadeIn 0.3s cubic-bezier(0, 0, 0.2, 1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-1.0px', marginBottom: '4px' }}>Semaforización</h2>
                <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Configuración de objetivos y rangos</p>
              </div>
              <button 
                onClick={() => setShowInfo(false)}
                style={{ 
                  padding: '12px', 
                  borderRadius: '16px', 
                  border: 'none', 
                  backgroundColor: '#f1f5f9', 
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <X size={24} color="#0f172a" strokeWidth={3} />
              </button>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 100px 100px', 
              gap: '12px', 
              padding: '0 0 12px 0',
              borderBottom: '2px solid #f1f5f9',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Indicador</span>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Objetivo</span>
              <span style={{ fontSize: '11px', fontWeight: '900', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Rango</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <section>
                <h3 style={{ fontSize: '12px', fontWeight: '950', color: 'var(--movistar-blue)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={14} /> KPIs Resolución
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Resolución', green: '≥ 75%', yellow: '70% - 74%' },
                    { label: 'Reiteros', green: '≤ 4.5%', yellow: '4.6% - 5%' },
                    { label: 'Puntualidad', green: '≥ 80%', yellow: '70% - 79%' },
                    { label: 'Productividad', green: '≥ 6.0', yellow: '5.0 - 5.9' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: '12px', fontSize: '14px', alignItems: 'center' }}>
                      <span style={{ fontWeight: '800', color: '#1e293b' }}>{row.label}</span>
                      <span style={{ backgroundColor: '#ecfdf5', padding: '8px 4px', borderRadius: '10px', textAlign: 'center', fontWeight: '900', color: '#059669', fontSize: '12px', border: '1px solid #10b98133' }}>{row.green}</span>
                      <span style={{ backgroundColor: '#fffbeb', padding: '8px 4px', borderRadius: '10px', textAlign: 'center', fontWeight: '900', color: '#d97706', fontSize: '12px', border: '1px solid #f59e0b33' }}>{row.yellow}</span>
                    </div>
                  ))}
                </div>
              </section>

              <div style={{ height: '1px', backgroundColor: '#e2e8f0' }}></div>

              <section>
                <h3 style={{ fontSize: '12px', fontWeight: '950', color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardCheck size={14} /> Actividades TOA
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Completadas', green: '≥ 75%', yellow: '70% - 74%' },
                    { label: 'Inicio', green: '≥ 80%', yellow: '71% - 79%' },
                    { label: '1er OK', green: '≥ 80%', yellow: '71% - 79%' },
                    { label: 'No encontrados', green: '≤ 4.9%', yellow: '5.0% - 6%' },
                    { label: 'Deriva Bajadas', green: '≤ 4.9%', yellow: '5.0% - 6%' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px', gap: '12px', fontSize: '14px', alignItems: 'center' }}>
                      <span style={{ fontWeight: '800', color: '#1e293b' }}>{row.label}</span>
                      <span style={{ backgroundColor: '#ecfdf5', padding: '8px 4px', borderRadius: '10px', textAlign: 'center', fontWeight: '900', color: '#059669', fontSize: '12px', border: '1px solid #10b98133' }}>{row.green}</span>
                      <span style={{ backgroundColor: '#fffbeb', padding: '8px 4px', borderRadius: '10px', textAlign: 'center', fontWeight: '900', color: '#d97706', fontSize: '12px', border: '1px solid #f59e0b33' }}>{row.yellow}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            
            <p style={{ marginTop: '24px', fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontWeight: '600' }}>
              Valores por debajo del rango amarillo se marcarán en <span style={{ color: '#ef4444' }}>rojo</span>.
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .desktop-sidebar {
          display: block;
          position: sticky;
          top: 0;
          flex-shrink: 0;
        }
        @media (max-width: 767px) {
          .desktop-sidebar {
            display: none !important;
          }
          body.sidebar-open {
            overflow: hidden;
          }
        }
      `}</style>
    </>
  );
};

export default Sidebar;
