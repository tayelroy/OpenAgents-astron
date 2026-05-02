"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { siteConfig, navigationConfig } from '../config';

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 80,
        padding: '0 5vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: scrolled ? 'rgba(2, 3, 10, 0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(8px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0, 176, 255, 0.08)' : 'none',
        transition: 'background-color 0.5s ease, border-color 0.5s ease',
      }}
    >
      {/* Brand */}
      <a
        href="#hero"
        onClick={(e) => handleAnchor(e, '#hero')}
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: '2px',
          color: '#00E676',
          textDecoration: 'none',
          textShadow: scrolled ? 'none' : '0 0 20px rgba(0, 230, 118, 0.4)',
        }}
      >
        {siteConfig.brandName}
      </a>

      {/* Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        {navigationConfig.links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            onClick={(e) => handleAnchor(e, link.href)}
            className="nav-link"
          >
            {link.label}
          </a>
        ))}

        {/* CTA button */}
        <button
          onClick={() => router.push('/create-agent')}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 400,
            fontSize: 13,
            letterSpacing: '1px',
            color: '#02030A',
            background: '#00E676',
            border: 'none',
            padding: '9px 22px',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = '#00B0FF'; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = '#00E676'; }}
        >
          {navigationConfig.ctaText}
        </button>
      </div>
    </nav>
  );
}
