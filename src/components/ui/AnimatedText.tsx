'use client';

import React, { useEffect, useState } from 'react';

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number; // base delay in ms
  variant?: 'word' | 'character';
}

export default function AnimatedText({ text, className = '', delay = 0, variant = 'word' }: AnimatedTextProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  if (variant === 'word') {
    const words = text.split(' ');
    return (
      <span className={`inline-block overflow-hidden pb-1 ${className}`}>
        {words.map((word, idx) => (
          <span
            key={idx}
            className="inline-block translate-y-full opacity-0 transition-all duration-700 ease-out mr-[0.25em]"
            style={{
              transform: mounted ? 'translateY(0)' : 'translateY(100%)',
              opacity: mounted ? 1 : 0,
              transitionDelay: `${delay + idx * 75}ms`,
            }}
          >
            {word}
          </span>
        ))}
      </span>
    );
  }

  const chars = Array.from(text);
  return (
    <span className={`inline-block overflow-hidden pb-1 ${className}`}>
      {chars.map((char, idx) => (
        <span
          key={idx}
          className="inline-block translate-y-full opacity-0 transition-all duration-500 ease-out"
          style={{
            transform: mounted ? 'translateY(0)' : 'translateY(100%)',
            opacity: mounted ? 1 : 0,
            transitionDelay: `${delay + idx * 20}ms`,
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
