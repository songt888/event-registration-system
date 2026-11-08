import { useEffect, useRef } from 'react';

// Sparkle trail behind the mouse, as in the Y2K showcase. Decorative only: off on touch screens and with reduced motion,
// never covers anything (pointer-events: none), and the loop sleeps when no sparkle is alive.
type Spark = { x: number; y: number; vx: number; vy: number; life: number; hue: number; size: number };

export function Sparkles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (!canvas || reduced.matches || matchMedia('(pointer: coarse)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(devicePixelRatio, 2);
    const sparks: Spark[] = [];
    let raf = 0;
    let lastX = -1;
    let lastY = -1;

    const resize = () => {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const star = (s: Spark) => {
      const r = s.size * s.life;
      ctx.fillStyle = `hsla(${s.hue}, 100%, 75%, ${s.life})`;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const rr = i % 2 ? r * 0.35 : r;
        ctx.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr);
      }
      ctx.fill();
    };
    const tick = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.03;
        s.life -= 0.025;
        if (s.life <= 0) sparks.splice(i, 1);
        else star(s);
      }
      raf = sparks.length ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      const d = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      if (d < 6 || sparks.length > 80) return;
      sparks.push({
        x: e.clientX,
        y: e.clientY,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        life: 1,
        hue: [190, 320, 80][Math.floor(Math.random() * 3)],
        size: 4 + Math.random() * 4,
      });
      if (!raf) raf = requestAnimationFrame(tick);
    };

    resize();
    addEventListener('resize', resize);
    addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={ref} className="sparkles" aria-hidden="true" />;
}
