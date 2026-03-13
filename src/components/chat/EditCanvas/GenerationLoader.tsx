'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CreativeMode } from '@/lib/chat-context';
import { useBrand } from '@/lib/brand-context';
import styles from './EditCanvas.module.css';

const DOT_SPACING = 20;
const CENTER_RADIUS = 80;
const RING_WIDTH = 40;
const RIPPLE_INTERVAL_MS = 1500;
const RIPPLE_DURATION_MS = 3000;
const STEP_DURATION = 2800;

interface Ripple {
  startTime: number;
}

function getMessages(mode: CreativeMode, brandName: string): string[] {
  const brand = brandName || 'your brand';
  const templates: Record<string, string[]> = {
    imagine: [
      `Checking the ${brand} imagery style`,
      `Applying ${brand} content guidelines`,
      `Matching ${brand} visual identity`,
      `Generating for ${brand}`,
    ],
    product: [
      `Checking the ${brand} product style`,
      `Applying ${brand} shot guidelines`,
      `Setting up ${brand} product scene`,
      `Generating for ${brand}`,
    ],
    character: [
      `Checking the ${brand} character style`,
      `Applying ${brand} scene guidelines`,
      `Building ${brand} character scene`,
      `Generating for ${brand}`,
    ],
    create: [
      `Checking the ${brand} ad format`,
      `Applying ${brand} campaign style`,
      `Matching ${brand} ad guidelines`,
      `Generating for ${brand}`,
    ],
  };
  return templates[mode] ?? templates.imagine;
}

export default function GenerationLoader({ mode }: { mode: CreativeMode }) {
  const { activeBrand } = useBrand();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const lastRippleRef = useRef<number>(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [animState, setAnimState] = useState<'entering' | 'visible' | 'exiting'>('entering');

  const messages = useMemo(
    () => getMessages(mode, activeBrand?.name ?? 'your brand'),
    [mode, activeBrand?.name]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio ?? 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const draw = (now: number) => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy) + 100;

      if (now - lastRippleRef.current > RIPPLE_INTERVAL_MS) {
        ripplesRef.current.push({ startTime: now });
        lastRippleRef.current = now;
      }

      ripplesRef.current = ripplesRef.current.filter(
        (r) => now - r.startTime < RIPPLE_DURATION_MS
      );

      ctx.clearRect(0, 0, w, h);

      const dotRadius = 1;
      const maxDotRadius = 2;

      for (let x = 0; x <= w + DOT_SPACING; x += DOT_SPACING) {
        for (let y = 0; y <= h + DOT_SPACING; y += DOT_SPACING) {
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let opacity = 0.12;
          let radius = dotRadius;

          for (const ripple of ripplesRef.current) {
            const age = (now - ripple.startTime) / 1000;
            const ringPos = (age / (RIPPLE_DURATION_MS / 1000)) * maxDist;
            const proximity = Math.abs(dist - ringPos);
            if (proximity < RING_WIDTH) {
              const t = 1 - proximity / RING_WIDTH;
              const boost = t * t * 0.2;
              opacity = Math.min(0.45, opacity + boost);
              radius = dotRadius + (maxDotRadius - dotRadius) * t * 0.5;
            }
          }

          if (dist < CENTER_RADIUS) {
            const centerGlow = 1 - dist / CENTER_RADIUS;
            opacity = Math.min(0.35, opacity + centerGlow * 0.15);
            radius = Math.max(radius, dotRadius + 0.3);
          }

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(80, 80, 80, ${opacity})`;
          ctx.fill();
        }
      }

      const centerDots: { x: number; y: number }[] = [];
      for (let x = 0; x <= w + DOT_SPACING; x += DOT_SPACING) {
        for (let y = 0; y <= h + DOT_SPACING; y += DOT_SPACING) {
          const dx = x - cx;
          const dy = y - cy;
          if (Math.sqrt(dx * dx + dy * dy) < CENTER_RADIUS) {
            centerDots.push({ x, y });
          }
        }
      }

      const pulse = 0.5 + 0.3 * Math.sin(now * 0.003);
      ctx.strokeStyle = `rgba(100, 100, 100, ${0.12 * pulse})`;
      ctx.lineWidth = 1;

      for (let i = 0; i < centerDots.length; i++) {
        const a = centerDots[i];
        let nearest = 0;
        let nearestDist = Infinity;
        for (let j = 0; j < centerDots.length; j++) {
          if (i === j) continue;
          const b = centerDots[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < nearestDist && d < DOT_SPACING * 2.5) {
            nearestDist = d;
            nearest = j;
          }
        }
        if (nearestDist < Infinity) {
          const b = centerDots[nearest];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    setAnimState('entering');
    const enterTimer = setTimeout(() => setAnimState('visible'), 50);

    const interval = setInterval(() => {
      setAnimState('exiting');

      setTimeout(() => {
        setCurrentStep((prev) => (prev + 1) % messages.length);
        setAnimState('entering');

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimState('visible');
          });
        });
      }, 400);
    }, STEP_DURATION);

    return () => {
      clearTimeout(enterTimer);
      clearInterval(interval);
    };
  }, [messages.length]);

  return (
    <div ref={containerRef} className={styles.generationLoader}>
      <canvas
        ref={canvasRef}
        className={styles.generationCanvas}
        aria-hidden
      />
      <div className={styles.generationPill}>
        <div className={styles.generationLabelWrap}>
          <motion.span
            className={styles.generationMessage}
            animate={
              animState === 'entering'
                ? { opacity: 0, y: 6 }
                : animState === 'visible'
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: -6 }
            }
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            {messages[currentStep]}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
