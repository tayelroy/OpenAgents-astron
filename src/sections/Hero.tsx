"use client";

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StarfieldCanvas from './StarfieldCanvas';
import LiquidGlassButton from '../components/LiquidGlassButton';
import { heroConfig } from '../config';

export default function Hero() {
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [titleWidth, setTitleWidth] = useState<number>(0);

  useEffect(() => {
    const measure = () => {
      if (titleRef.current) setTitleWidth(titleRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  if (!heroConfig.title) {
    return null;
  }

  return (
    <section
      id="hero"
      style={{ position: 'relative', width: '100%', overflow: 'hidden', height: '100vh' }}
    >
      <StarfieldCanvas />
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          height: '100%',
          padding: '28vh 5vw 8vh',
        }}
      >
        <div>
          <h1
            ref={titleRef}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(48px, 6vw, 96px)',
              lineHeight: 1.0,
              letterSpacing: '8px',
              color: '#ffffff',
              textShadow: '0 4px 24px rgba(0, 230, 118, 0.3), 0 0 80px rgba(0, 176, 255, 0.15)',
              marginBottom: 'clamp(32px, 4vw, 56px)',
              width: 'fit-content',
            }}
          >
            {heroConfig.title}
          </h1>
          {heroConfig.subtitleLine1 && (
            <p
              style={{
                fontFamily: "'Space Grotesk', monospace",
                fontWeight: 200,
                fontSize: 'clamp(15px, 1.5vw, 22px)',
                lineHeight: 1.7,
                letterSpacing: '-0.3px',
                color: '#00B0FF',
                margin: '0 0 12px 0',
                width: titleWidth || 'auto',
                maxWidth: '100%',
                textShadow: '0 2px 12px rgba(0, 176, 255, 0.4)',
              }}
            >
              {heroConfig.subtitleLine1}
            </p>
          )}
          {heroConfig.subtitleLine2 && (
            <p
              style={{
                fontFamily: "'Space Grotesk', monospace",
                fontWeight: 200,
                fontSize: 'clamp(15px, 1.5vw, 22px)',
                lineHeight: 1.7,
                letterSpacing: '-0.3px',
                color: '#dadada',
                margin: 0,
                width: titleWidth || 'auto',
                maxWidth: '100%',
                textShadow: '0 2px 12px rgba(0,0,0,0.6)',
              }}
            >
              {heroConfig.subtitleLine2}
            </p>
          )}
        </div>

        {heroConfig.ctaText && (
          <div style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'auto' }}>
            <LiquidGlassButton
              onClick={() => {
                router.push('/create-agent');
              }}
            >
              {heroConfig.ctaText}
            </LiquidGlassButton>
          </div>
        )}
      </div>
    </section>
  );
}
