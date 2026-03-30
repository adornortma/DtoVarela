'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Home, Database, Briefcase, X, Menu } from 'lucide-react';
import React from 'react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Evolución Semanal', icon: <TrendingUp size={20} />, path: '/' },
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

      <div style={{ 
        padding: '20px', 
        backgroundColor: 'rgba(255, 255, 255, 0.08)', 
        borderRadius: '20px',
        marginTop: 'auto',
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

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
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
