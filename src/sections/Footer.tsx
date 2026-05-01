"use client";

import { useRouter } from 'next/navigation';
import { footerConfig } from '../config';

export default function Footer() {
  const router = useRouter();

  return (
    <footer
      id="footer"
      style={{
        padding: '120px 5vw 60px',
        background: '#02030A',
        position: 'relative',
        zIndex: 2,
        borderTop: '1px solid rgba(0, 176, 255, 0.15)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Heading */}
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 400,
            fontSize: 'clamp(36px, 4.5vw, 72px)',
            lineHeight: 1.1,
            letterSpacing: '-1px',
            color: '#ffffff',
            margin: '0 0 24px 0',
            textShadow: '0 0 50px rgba(0, 230, 118, 0.15)',
          }}
        >
          {footerConfig.heading}
        </h2>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "'Space Grotesk', monospace",
            fontWeight: 300,
            fontSize: 13,
            letterSpacing: '2px',
            color: '#00B0FF',
            opacity: 0.6,
            margin: '0 0 80px 0',
            textTransform: 'uppercase',
          }}
        >
          {footerConfig.tagline}
        </p>

        {/* CTA */}
        <button
          onClick={() => router.push('/studio')}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 400,
            fontSize: 15,
            letterSpacing: '1px',
            color: '#02030A',
            background: '#00E676',
            border: 'none',
            padding: '16px 40px',
            cursor: 'pointer',
            marginBottom: 100,
            transition: 'background 0.3s ease',
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#00B0FF'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#00E676'; }}
        >
          CREATE YOUR AGENT →
        </button>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: 24,
            borderTop: '1px solid rgba(0, 176, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 200,
              fontSize: 12,
              color: '#dadada',
              opacity: 0.4,
            }}
          >
            {footerConfig.copyright}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {footerConfig.bottomLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 200,
                  fontSize: 12,
                  color: '#dadada',
                  opacity: 0.4,
                  textDecoration: 'none',
                  transition: 'opacity 0.3s',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.8'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.4'; }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
