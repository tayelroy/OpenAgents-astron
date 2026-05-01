"use client";

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { howItWorksConfig } from '../config';
import { useRouter } from 'next/navigation';

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const steps = stepRefs.current.filter(Boolean) as HTMLDivElement[];

      steps.forEach((step, i) => {
        gsap.set(step, { opacity: 0, y: 50 });
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                gsap.to(step, {
                  opacity: 1,
                  y: 0,
                  duration: 0.9,
                  delay: i * 0.12,
                  ease: 'power3.out',
                });
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        );
        observer.observe(step);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section
      id="how-it-works"
      style={{
        padding: '140px 5vw 120px',
        background: '#02030A',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Label */}
        <div style={{
          fontFamily: "'Space Grotesk', monospace",
          fontSize: 12,
          fontWeight: 300,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          color: '#00E676',
          opacity: 0.8,
          marginBottom: 24,
        }}>
          {howItWorksConfig.sectionLabel}
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: 1, background: 'rgba(0, 176, 255, 0.2)', marginBottom: 60 }} />

        {/* Title */}
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 400,
          fontSize: 'clamp(28px, 3.5vw, 52px)',
          lineHeight: 1.2,
          letterSpacing: '-0.5px',
          color: '#ffffff',
          margin: '0 0 80px 0',
          maxWidth: 680,
        }}>
          {howItWorksConfig.title}
        </h2>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {howItWorksConfig.steps.map((step, i) => (
            <div
              key={step.number}
              ref={(el) => { stepRefs.current[i] = el; }}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                gap: '40px',
                padding: '48px 0',
                borderBottom: i < howItWorksConfig.steps.length - 1
                  ? '1px solid rgba(0, 176, 255, 0.08)'
                  : 'none',
                alignItems: 'start',
              }}
            >
              {/* Step number */}
              <div style={{
                fontFamily: "'Space Grotesk', monospace",
                fontSize: 13,
                fontWeight: 300,
                color: '#00E676',
                opacity: 0.5,
                letterSpacing: '2px',
                paddingTop: 6,
              }}>
                {step.number}
              </div>

              {/* Content */}
              <div>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 400,
                  fontSize: 'clamp(24px, 2.8vw, 42px)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.5px',
                  color: '#ffffff',
                  margin: '0 0 20px 0',
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 200,
                  fontSize: 16,
                  lineHeight: 1.85,
                  color: '#dadada',
                  margin: '0 0 20px 0',
                  maxWidth: 580,
                }}>
                  {step.description}
                </p>
                <span style={{
                  display: 'inline-block',
                  fontFamily: "'Space Grotesk', monospace",
                  fontSize: 11,
                  fontWeight: 300,
                  letterSpacing: '2px',
                  color: '#00B0FF',
                  opacity: 0.6,
                  textTransform: 'uppercase',
                  border: '1px solid rgba(0, 176, 255, 0.2)',
                  padding: '4px 12px',
                }}>
                  {step.tag}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 80, display: 'flex', gap: 20, alignItems: 'center' }}>
          <button
            onClick={() => router.push('/studio')}
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 400,
              fontSize: 14,
              letterSpacing: '1px',
              color: '#02030A',
              background: '#00E676',
              border: 'none',
              padding: '14px 32px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#00B0FF';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = '#00E676';
            }}
          >
            CREATE YOUR AGENT
          </button>
          <a
            href="#agents"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 300,
              fontSize: 13,
              letterSpacing: '1px',
              color: '#dadada',
              textDecoration: 'none',
              opacity: 0.6,
              transition: 'opacity 0.3s ease',
            }}
            onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.opacity = '0.6'; }}
          >
            View live agents →
          </a>
        </div>
      </div>
    </section>
  );
}
