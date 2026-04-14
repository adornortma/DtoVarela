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
        zIndex: 9999 
      }}
    >
      <div 
        onClick={toggleTooltip}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.15)';
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.backgroundColor = '#bae6fd';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.opacity = '0.8';
            e.currentTarget.style.backgroundColor = '#e0f2fe';
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
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)',
          border: '1.5px solid #0284c7'
        }}
        title="Días de lluvia"
      >
        <CloudRain size={16} strokeWidth={2.5} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          right: '-8px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          minWidth: '200px',
          zIndex: 9999,
          border: '2px solid #0284c7',
          animation: 'tooltipFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          <div style={{ 
            backgroundColor: '#f0f9ff',
            padding: '12px 16px',
            borderBottom: '1px solid #e0f2fe',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CloudRain size={14} color="#0284c7" strokeWidth={3} />
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '900', 
              color: '#0369a1', 
              textTransform: 'uppercase', 
              letterSpacing: '1px'
            }}>
              Días de lluvia
            </span>
          </div>
          
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {days.map((day, idx) => (
              <div 
                key={idx} 
                style={{ 
                  fontSize: '13px', 
                  fontWeight: '800', 
                  color: '#1e293b',
                  padding: '6px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                {day}
              </div>
            ))}
          </div>
          
          {/* Arrow pointing up */}
          <div style={{
            position: 'absolute',
            top: '-7px',
            right: '18px',
            width: '12px',
            height: '12px',
            backgroundColor: 'white',
            transform: 'rotate(45deg)',
            borderLeft: '2px solid #0284c7',
            borderTop: '2px solid #0284c7',
            zIndex: -1
          }} />
          
          <style jsx>{`
            @keyframes tooltipFadeIn {
              from { opacity: 0; transform: translateY(-10px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
