'use client';

import Sidebar from "@/components/Sidebar";
import './globals.css';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Briefcase } from 'lucide-react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cargaDistrictSlug, setCargaDistrictSlug] = useState<string | null>(null);
  const pathname = usePathname();

  useState(() => {
    // Avoid SSR error, just hook state
  });

  React.useEffect(() => {
    const updateSlug = () => {
      if (typeof window !== 'undefined') {
        setCargaDistrictSlug(localStorage.getItem('selected_carga_district_slug'));
      }
    };
    updateSlug();
    window.addEventListener('carga_district_changed', updateSlug);
    return () => window.removeEventListener('carga_district_changed', updateSlug);
  }, []);

  const isBPPage = pathname?.startsWith('/seguimiento-bp');
  const isCargaPage = pathname === '/admin/carga-ocr';
  const activeDistrictSlug = isCargaPage ? (cargaDistrictSlug || 'lanus') : null;

  const isLanus = pathname === '/lanus' || pathname?.startsWith('/lanus/') || activeDistrictSlug === 'lanus';
  const isLomas = pathname === '/lomas' || pathname?.startsWith('/lomas/') || activeDistrictSlug === 'lomas';
  const isMontegrande = pathname === '/montegrande' || pathname?.startsWith('/montegrande/') || activeDistrictSlug === 'montegrande';

  let currentDistrictName = 'F. VARELA';
  let districtDisplayTitle = 'Varela';
  let districtDescription = 'Florencio Varela';

  if (isLanus) {
    currentDistrictName = 'LANÚS';
    districtDisplayTitle = 'Lanús';
    districtDescription = 'Lanús';
  } else if (isLomas) {
    currentDistrictName = 'LOMAS';
    districtDisplayTitle = 'Lomas';
    districtDescription = 'Lomas';
  } else if (isMontegrande) {
    currentDistrictName = 'MONTEGRANDE';
    districtDisplayTitle = 'Montegrande';
    districtDescription = 'Montegrande';
  }

  return (
    <html lang="es">
      <head>
        <title>{`KPI Distrito ${districtDisplayTitle} - Dashboard Operativo`}</title>
        <meta name="description" content={`Dashboard de indicadores de gestión para el distrito ${districtDescription}`} />
      </head>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
           {/* Sidebar (Desktop focus, drawer on mobile) */}
           {!isBPPage && <Sidebar isMobileOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}
           
           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              {/* Header Mobile (Only visible on max-width 767px) */}
              <header className="mobile-header" style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: 'white',
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                zIndex: 50
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ backgroundColor: 'var(--movistar-blue)', padding: '6px', borderRadius: '8px' }}>
                    <Briefcase size={20} color="white" />
                  </div>
                  <span style={{ fontWeight: '900', fontSize: '16px', letterSpacing: '0.5px', color: '#1e293b' }}>
                    DISTRITO {currentDistrictName}
                  </span>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    padding: '8px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569'
                  }}
                >
                  <Menu size={24} />
                </button>
              </header>

              <main style={{ 
                flex: 1, 
                backgroundColor: 'var(--background)', 
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                 <div style={{ 
                   width: '100%', 
                   maxWidth: isBPPage ? '100%' : '1400px', 
                   paddingRight: isBPPage ? '0' : '40px'
                 }}>
                    {children}
                 </div>
              </main>
           </div>
        </div>

        <style jsx global>{`
          .mobile-header {
            display: none;
          }
          @media (max-width: 767px) {
            .mobile-header {
              display: flex !important;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
