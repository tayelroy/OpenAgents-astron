"use client";

import { useRouter } from 'next/navigation';
import StarfieldCanvas from './StarfieldCanvas';
import { siteConfig, capabilityDetailConfig } from '../config';

const SLUGS = Object.keys(capabilityDetailConfig.capabilities);

interface CapabilityDetailProps {
  slug: string;
}

export default function CapabilityDetail({ slug }: CapabilityDetailProps) {
  const router = useRouter();
  const data = slug ? capabilityDetailConfig.capabilities[slug] : null;

  if (!data) {
    return (
      <div style={{ background: '#02030A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#dadada', fontFamily: "'Inter', sans-serif" }}>{capabilityDetailConfig.notFoundText || 'Not found.'}</p>
      </div>
    );
  }

  const currentIndex = SLUGS.indexOf(slug!);
  const prevSlug = currentIndex > 0 ? SLUGS[currentIndex - 1] : null;
  const nextSlug = currentIndex < SLUGS.length - 1 ? SLUGS[currentIndex + 1] : null;

  return (
    <div style={{ background: '#02030A', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* Starfield background */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0, opacity: 0.4 }}>
        <StarfieldCanvas />
      </div>

      {/* Back nav */}
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
          backgroundColor: 'rgba(2, 3, 10, 0.9)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(0, 176, 255, 0.08)',
        }}
      >
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); router.push('/'); }}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: '2px',
            color: '#00E676',
            textDecoration: 'none',
          }}
        >
          {siteConfig.brandName}
        </a>
        {capabilityDetailConfig.backLinkText && (
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); router.push('/'); }}
            className="nav-link"
          >
            {capabilityDetailConfig.backLinkText}
          </a>
        )}
      </nav>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Hero */}
        <section style={{ padding: '180px 5vw 100px', maxWidth: 860, margin: '0 auto' }}>
          {capabilityDetailConfig.sectionLabel && (
            <div
              style={{
                fontFamily: "'Space Grotesk', monospace",
                fontSize: 12,
                fontWeight: 300,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: '#00E676',
                opacity: 0.6,
                marginBottom: 24,
              }}
            >
              {capabilityDetailConfig.sectionLabel}
            </div>
          )}
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 400,
              fontSize: 'clamp(40px, 5vw, 72px)',
              lineHeight: 1.1,
              letterSpacing: '-1.5px',
              color: '#ffffff',
              margin: '0 0 24px 0',
              textShadow: '0 0 40px rgba(0, 176, 255, 0.2)',
            }}
          >
            {data.title}
          </h1>
          {data.subtitle && (
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                fontSize: 18,
                lineHeight: 1.6,
                color: 'rgba(0, 176, 255, 0.8)',
                margin: 0,
                maxWidth: 540,
              }}
            >
              {data.subtitle}
            </p>
          )}
        </section>

        {/* Divider */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 5vw' }}>
          <div style={{ width: '100%', height: 1, background: 'rgba(0, 176, 255, 0.12)' }} />
        </div>

        {/* Article body */}
        <article style={{ padding: '80px 5vw', maxWidth: 860, margin: '0 auto' }}>
          {data.paragraphs.map((p, i) => (
            <p
              key={i}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 200,
                fontSize: 16,
                lineHeight: 1.9,
                color: '#dadada',
                marginBottom: i < data.paragraphs.length - 1 ? 32 : 0,
              }}
            >
              {p}
            </p>
          ))}
        </article>

        {/* Prev / Next navigation */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 5vw 120px' }}>
          <div style={{ width: '100%', height: 1, background: 'rgba(0, 176, 255, 0.08)', marginBottom: 40 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {prevSlug ? (
              <a
                href={`/capability/${prevSlug}`}
                onClick={(e) => { e.preventDefault(); router.push(`/capability/${prevSlug}`); window.scrollTo(0, 0); }}
                className="nav-link"
                style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                <span style={{ fontSize: 11, opacity: 0.4, letterSpacing: '2px', textTransform: 'uppercase' }}>{capabilityDetailConfig.prevLabel}</span>
                <span>{capabilityDetailConfig.capabilities[prevSlug].title}</span>
              </a>
            ) : <div />}
            {nextSlug ? (
              <a
                href={`/capability/${nextSlug}`}
                onClick={(e) => { e.preventDefault(); router.push(`/capability/${nextSlug}`); window.scrollTo(0, 0); }}
                className="nav-link"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, textAlign: 'right' }}
              >
                <span style={{ fontSize: 11, opacity: 0.4, letterSpacing: '2px', textTransform: 'uppercase' }}>{capabilityDetailConfig.nextLabel}</span>
                <span>{capabilityDetailConfig.capabilities[nextSlug].title}</span>
              </a>
            ) : <div />}
          </div>
        </div>
      </div>
    </div>
  );
}
