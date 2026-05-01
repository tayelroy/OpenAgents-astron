"use client";

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
  pulseRate: number;
  pulsePhase: number;
}

interface ConstellationLine {
  starA: number;
  starB: number;
  opacity: number;
}

function initStarfield(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrameId = 0;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STAR_COUNT = 300;
  const CONSTELLATION_LINES = 40;
  const GRID_PULSE_SPEED = 0.3;

  let stars: Star[] = [];
  let constellationLines: ConstellationLine[] = [];
  let time = 0;
  let mouseX = -1;
  let mouseY = -1;

  function createStars() {
    stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 2 + 0.5,
      size: Math.random() * 1.5 + 0.5,
      brightness: Math.random() * 0.6 + 0.4,
      pulseRate: Math.random() * 2 + 1,
      pulsePhase: Math.random() * Math.PI * 2,
    }));
  }

  function createConstellationLines() {
    constellationLines = [];
    for (let i = 0; i < CONSTELLATION_LINES; i++) {
      const starA = Math.floor(Math.random() * STAR_COUNT);
      let starB = Math.floor(Math.random() * STAR_COUNT);
      while (starB === starA) {
        starB = Math.floor(Math.random() * STAR_COUNT);
      }
      constellationLines.push({
        starA,
        starB,
        opacity: Math.random() * 0.15 + 0.05,
      });
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createStars();
    createConstellationLines();
  }

  function drawGrid() {
    const gridSpacing = 80;
    const pulsePhase = time * GRID_PULSE_SPEED;

    for (let x = 0; x <= width; x += gridSpacing) {
      const alpha = 0.03 + Math.sin(x * 0.01 + pulsePhase) * 0.015;
      ctx.strokeStyle = `rgba(0, 176, 255, ${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSpacing) {
      const alpha = 0.03 + Math.sin(y * 0.01 + pulsePhase) * 0.015;
      ctx.strokeStyle = `rgba(0, 176, 255, ${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawStars() {
    for (const star of stars) {
      const pulse = prefersReduced
        ? 1
        : 0.7 + 0.3 * Math.sin(time * star.pulseRate + star.pulsePhase);
      const alpha = star.brightness * pulse;

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * star.z * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`;
      ctx.fill();

      if (star.z > 1.8) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * star.z * 1.5, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size * star.z * 1.5
        );
        gradient.addColorStop(0, `rgba(200, 220, 255, ${alpha * 0.3})`);
        gradient.addColorStop(1, 'rgba(200, 220, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }
  }

  function drawConstellationLines() {
    for (const line of constellationLines) {
      const starA = stars[line.starA];
      const starB = stars[line.starB];
      if (!starA || !starB) continue;

      const pulse = prefersReduced
        ? 1
        : 0.5 + 0.5 * Math.sin(time * 0.5 + line.starA * 0.1);

      ctx.beginPath();
      ctx.moveTo(starA.x, starA.y);
      ctx.lineTo(starB.x, starB.y);
      ctx.strokeStyle = `rgba(0, 176, 255, ${line.opacity * pulse})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  function drawMouseInteraction() {
    if (mouseX < 0 || mouseY < 0) return;

    const radius = 120;
    const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, radius);
    gradient.addColorStop(0, 'rgba(0, 230, 118, 0.06)');
    gradient.addColorStop(1, 'rgba(0, 230, 118, 0)');
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    for (const star of stars) {
      const dx = star.x - mouseX;
      const dy = star.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        const brightness = (1 - dist / radius) * 0.8;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 230, 118, ${brightness})`;
        ctx.fill();
      }
    }
  }

  let lastTime = 0;

  function render(timestamp: number) {
    const dt = Math.min((timestamp - (lastTime || timestamp)) / 1000, 0.05);
    lastTime = timestamp;

    if (!prefersReduced) {
      time += dt;
    }

    ctx.clearRect(0, 0, width, height);

    // Deep space black background
    ctx.fillStyle = '#02030A';
    ctx.fillRect(0, 0, width, height);

    // Subtle nebula glow in corners
    const nebulaGrad = ctx.createRadialGradient(
      width * 0.8, height * 0.3, 0,
      width * 0.8, height * 0.3, width * 0.5
    );
    nebulaGrad.addColorStop(0, 'rgba(58, 123, 247, 0.04)');
    nebulaGrad.addColorStop(1, 'rgba(58, 123, 247, 0)');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, width, height);

    const nebulaGrad2 = ctx.createRadialGradient(
      width * 0.2, height * 0.7, 0,
      width * 0.2, height * 0.7, width * 0.4
    );
    nebulaGrad2.addColorStop(0, 'rgba(0, 176, 255, 0.03)');
    nebulaGrad2.addColorStop(1, 'rgba(0, 176, 255, 0)');
    ctx.fillStyle = nebulaGrad2;
    ctx.fillRect(0, 0, width, height);

    drawGrid();
    drawConstellationLines();
    drawStars();
    drawMouseInteraction();

    animationFrameId = requestAnimationFrame(render);
  }

  function handleMouseMove(e: MouseEvent) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function handleMouseLeave() {
    mouseX = -1;
    mouseY = -1;
  }

  window.addEventListener('resize', resize);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);

  resize();
  animationFrameId = requestAnimationFrame(render);

  return () => {
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
    cancelAnimationFrame(animationFrameId);
  };
}

export default function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cleanup = initStarfield(canvasRef.current);
    return cleanup;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
      }}
    />
  );
}
