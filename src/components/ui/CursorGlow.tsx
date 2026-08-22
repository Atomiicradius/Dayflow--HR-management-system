'use client';

import React, { useEffect, useState } from 'react';

export default function CursorGlow() {
  const [position, setPosition] = useState({ x: -200, y: -200 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute w-[240px] h-[240px] rounded-full bg-primary/5 blur-3xl opacity-70"
        style={{
          left: `${position.x - 120}px`,
          top: `${position.y - 120}px`,
          transition: 'left 0.8s cubic-bezier(0.075, 0.82, 0.165, 1), top 0.8s cubic-bezier(0.075, 0.82, 0.165, 1)',
        }}
      />
    </div>
  );
}
