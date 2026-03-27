'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, Settings, Cloud } from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { label: 'Evolución Semanal', icon: FileText, href: '/evolucion' },
  ];

  const adminItems = [
    { label: 'Umbrales', icon: Settings, href: '/umbrales' },
    { label: 'Carga de Datos', icon: Cloud, href: '/admin/carga' },
  ];

  return (
    <aside style={{
      width: '280px',
      height: '100vh',
      backgroundColor: 'var(--movistar-blue)',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '48px',
      position: 'sticky',
      top: 0,
      borderRight: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{
       display: 'flex',
       alignItems: 'center',
       gap: '12px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: 'white',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--movistar-blue)',
          fontWeight: '900',
          fontSize: '20px'
        }}>M</div>
        <span style={{
          fontFamily: 'var(--font-primary)',
          fontSize: '18px',
          fontWeight: '800',
          color: 'white',
          letterSpacing: '-0.5px'
        }}>
          KPI VARELA
        </span>
      </div>

      <nav style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: 'white',
              fontWeight: isActive ? '700' : '500',
              transition: 'all 0.2s',
              opacity: isActive ? 1 : 0.8
            }}>
              <item.icon size={20} />
              <span style={{ fontSize: '14px' }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)', marginBottom: '16px' }} />
        {adminItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: 'white',
              fontWeight: isActive ? '700' : '500',
              transition: 'all 0.2s',
              opacity: isActive ? 1 : 0.8
            }}>
              <item.icon size={20} />
              <span style={{ fontSize: '14px' }}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
