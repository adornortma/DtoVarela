'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CloudRain } from 'lucide-react';

interface WeatherIndicatorProps {
  days: string[];
}

export default function WeatherIndicator({ days }: WeatherIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'absolute', 
        top: '8px', 
        right: '8px', 
        zIndex: 20 
      }}
    >
      <div 
        onClick={toggleTooltip}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.15)';
            e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.opacity = '0.8';
        }}
        style={{ 
          cursor: 'pointer',
          backgroundColor: '#e0f2fe',
          padding: '6px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0284c7',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: 0.8,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          border: '1px solid rgba(2, 132, 199, 0.1)'
        }}
        title="Días de lluvia"
      >
        <CloudRain size={16} strokeWidth={2.5} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          marginTop: '8px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          padding: '16px',
          minWidth: '180px',
          zIndex: 50,
          border: '1px solid #e2e8f0',
          animation: 'tooltipFadeIn 0.2s ease-out'
        }}>
          <div style={{ 
            fontSize: '10px', 
            fontWeight: '900', 
            color: '#64748b', 
            textTransform: 'uppercase', 
            letterSpacing: '1px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <CloudRain size={12} />
            Días de lluvia
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {days.map((day, idx) => (
              <div 
                key={idx} 
                style={{ 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: '#1e293b',
                  padding: '4px 0',
                  borderBottom: idx === days.length - 1 ? 'none' : '1px solid #f1f5f9'
                }}
              >
                {day}
              </div>
            ))}
          </div>
          
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            top: '-5px',
            right: '12px',
            width: '10px',
            height: '10px',
            backgroundColor: 'white',
            transform: 'rotate(45deg)',
            borderTop: '1px solid #e2e8f0',
            borderLeft: '1px solid #e2e8f0'
          }} />
          
          <style jsx>{`
            @keyframes tooltipFadeIn {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
