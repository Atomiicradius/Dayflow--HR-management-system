'use client';

import React, { useState, useEffect } from 'react';

interface SalaryChartProps {
  base: number;
  allowances: number;
  deductions: number;
}

export default function SalaryChart({ base, allowances, deductions }: SalaryChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartMounted, setChartMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setChartMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  const total = base + allowances + deductions;
  if (total === 0) return null;

  const data = [
    { label: 'Base Salary', value: base, color: '#1A3D63' },
    { label: 'Allowances', value: allowances, color: '#4A7FA7' },
    { label: 'Deductions (Tax/PF)', value: deductions, color: '#e11d48' }
  ];

  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  
  let accumulatedPercent = 0;

  const formatPercent = (val: number) => {
    return ((val / total) * 100).toFixed(1) + '%';
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-around gap-6 animate-fade-in-up">
      
      {/* SVG Donut Chart */}
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {data.map((item, idx) => {
            const percent = item.value / total;
            const targetOffset = circumference - percent * circumference;
            const strokeDashoffset = chartMounted ? targetOffset : circumference;
            const rotationOffset = (accumulatedPercent / total) * 360;
            accumulatedPercent += item.value;

            const isHovered = hoveredIndex === idx;

            return (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="cursor-pointer origin-center"
                style={{
                  transform: `rotate(${rotationOffset}deg)`,
                  transition: 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1), stroke-width 0.3s ease',
                }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>
        
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {hoveredIndex !== null ? (
            <>
              <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">
                {data[hoveredIndex].label.split(' ')[0]}
              </span>
              <span className="text-sm font-bold text-[#0A1931] mt-1">
                {formatPercent(data[hoveredIndex].value)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">
                Total Gross
              </span>
              <span className="text-sm font-extrabold text-[#0A1931] mt-1">
                {formatCurrency(base + allowances)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-3 w-full">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Structure Details</h4>
        {data.map((item, idx) => (
          <div
            key={item.label}
            className={`flex items-center justify-between p-2 rounded-lg transition-all ${
              hoveredIndex === idx ? 'bg-slate-50 border border-slate-200' : 'border border-transparent'
            }`}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="flex items-center space-x-2.5">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-semibold text-slate-700">{item.label}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-[#0A1931] block">{formatCurrency(item.value)}</span>
              <span className="text-[10px] text-slate-400 block">{formatPercent(item.value)}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
