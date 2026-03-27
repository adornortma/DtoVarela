'use client';

import React, { useState } from 'react';
import { Save, RefreshCcw, Info } from 'lucide-react';
import { defaultThresholds } from '@/lib/logic';

export default function ThresholdsPage() {
  const [thresholds, setThresholds] = useState(defaultThresholds);

  const handleSave = () => {
    alert('Configuración guardada (Mock)');
  };

  const handleReset = () => {
    setThresholds(defaultThresholds);
  };

  return (
    <div style={{ padding: '48px 56px', backgroundColor: 'var(--background)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#003366' }}>Configuración de Umbrales</h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>Define los límites operativos para la semaforización del distrito.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
            <RefreshCcw size={18} /> Restaurar Defaults
          </button>
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', backgroundColor: '#019df4', color: '#fff', fontWeight: '700', border: 'none' }}>
            <Save size={18} /> Guardar Cambios
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {Object.entries(thresholds).map(([key, value]) => (
          <div key={key} style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #eef2f6', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#019df4' }}>
                 <Info size={20} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#003366', textTransform: 'capitalize' }}>{key}</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 <label style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>Objetivo (Verde: {key === 'reiteros' ? 'Menor a' : 'Mayor a'})</label>
                 <input 
                  type="number" 
                  value={value.green} 
                  style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', fontWeight: '700' }} 
                 />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 <label style={{ fontSize: '14px', fontWeight: '700', color: '#64748b' }}>Tolerancia (Amarillo: {key === 'reiteros' ? 'Menor a' : 'Mayor a'})</label>
                 <input 
                  type="number" 
                  value={value.yellow} 
                  style={{ padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', fontWeight: '700' }} 
                 />
               </div>
            </div>
            <p style={{ marginTop: '24px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
              Los valores por fuera de la tolerancia se marcarán automáticamente como <strong>Críticos (Rojo)</strong>.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
