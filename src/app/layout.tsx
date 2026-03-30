'use client';

import Sidebar from "@/components/Sidebar";
import './globals.css';
import { useState } from 'react';
import { Menu, Briefcase } from 'lucide-react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <html lang="es">
      <head>
        <title>KPI Distrito Varela - Dashboard Operativo</title>
        <meta name="description" content="Dashboard de indicadores de gestión para el distrito Florencio Varela" />
      </head>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
           {/* Sidebar (Desktop focus, drawer on mobile) */}
           <Sidebar isMobileOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
           
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
                    DISTRITO F. VARELA
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
                   maxWidth: '1400px', 
                   paddingRight: '40px'
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
