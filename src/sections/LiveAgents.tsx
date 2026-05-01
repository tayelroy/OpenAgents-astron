"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { agentsConfig } from '../config';

export default function LiveAgents() {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const items = itemRefs.current.filter(Boolean) as HTMLDivElement[];
      items.forEach((item) => gsap.set(item, { opacity: 0, y: 30 }));

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const idx = items.indexOf(entry.target as HTMLDivElement);
              gsap.to(entry.target, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                delay: (idx % 4) * 0.1,
                ease: 'power2.out',
              });
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: '0px 0px -20px 0px' }
      );

      items.forEach((item) => observer.observe(item));
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section
      id="agents"
      style={{
        padding: '140px 5vw 120px',
        background: '#02030A',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
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
          {agentsConfig.sectionLabel}
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: 1, background: 'rgba(0, 176, 255, 0.2)', marginBottom: 48 }} />

        {/* Title row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 24,
          marginBottom: 60,
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(28px, 3vw, 48px)',
              lineHeight: 1.1,
              letterSpacing: '-0.5px',
              color: '#ffffff',
              margin: '0 0 12px 0',
            }}>
              {agentsConfig.title}
            </h2>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 200,
              fontSize: 15,
              color: 'rgba(0, 176, 255, 0.7)',
              margin: 0,
            }}>
              {agentsConfig.subtitle}
            </p>
          </div>
        </div>

        {/* Agent grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
        }}>
          {agentsConfig.agents.map((agent, i) => (
            <div
              key={agent.tokenId}
              ref={(el) => { itemRefs.current[i] = el; }}
              onClick={() => router.push(`/chat/${agent.tokenId}`)}
              style={{
                borderBottom: '1px solid rgba(0, 176, 255, 0.1)',
                borderRight: i < agentsConfig.agents.length - 1 ? '1px solid rgba(0, 176, 255, 0.1)' : 'none',
                padding: '24px 20px',
                cursor: 'pointer',
                transition: 'background 0.3s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'rgba(0, 176, 255, 0.04)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              {/* Image */}
              <div style={{
                position: 'relative',
                overflow: 'hidden',
                marginBottom: 16,
                width: '100%',
                paddingBottom: '100%',
              }}>
                {agent.image && (
                  <img
                    src={agent.image}
                    alt={agent.name}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: 0.5,
                      filter: 'grayscale(100%)',
                      transition: 'opacity 700ms, filter 700ms, transform 700ms',
                      maxWidth: 'none',
                    }}
                    onMouseEnter={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.opacity = '1';
                      img.style.filter = 'grayscale(0%)';
                      img.style.transform = 'scale(1.04)';
                    }}
                    onMouseLeave={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.opacity = '0.5';
                      img.style.filter = 'grayscale(100%)';
                      img.style.transform = 'scale(1)';
                    }}
                    loading="lazy"
                  />
                )}
                {/* Chat badge */}
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'rgba(0, 230, 118, 0.15)',
                  border: '1px solid rgba(0, 230, 118, 0.3)',
                  padding: '3px 8px',
                  zIndex: 2,
                }}>
                  <span style={{
                    fontFamily: "'Space Grotesk', monospace",
                    fontSize: 9,
                    letterSpacing: '2px',
                    color: '#00E676',
                    textTransform: 'uppercase',
                  }}>
                    CHAT →
                  </span>
                </div>
              </div>

              {/* Handle */}
              <div style={{
                fontFamily: "'Space Grotesk', monospace",
                fontSize: 11,
                fontWeight: 300,
                letterSpacing: '1px',
                color: '#00E676',
                opacity: 0.6,
                marginBottom: 6,
              }}>
                {agent.handle}
              </div>

              {/* Name */}
              <h4 style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 400,
                fontSize: 18,
                color: '#ffffff',
                margin: '0 0 6px 0',
                lineHeight: 1.3,
              }}>
                {agent.name}
              </h4>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 200,
                  fontSize: 12,
                  color: '#00B0FF',
                  opacity: 0.7,
                }}>
                  {agent.discipline}
                </span>
                <span style={{
                  fontFamily: "'Space Grotesk', monospace",
                  fontSize: 11,
                  color: '#00E676',
                  opacity: 0.4,
                }}>
                  #{agent.tokenId}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
