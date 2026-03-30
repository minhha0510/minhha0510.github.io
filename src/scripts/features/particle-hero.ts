/**
 * Feature A: Particle Name Ripple
 * Canvas particle system that renders "Minh-Ha Nguyen" as ASCII character particles.
 * Mouse proximity creates ripple/repulsion effect. Characters spring back when mouse leaves.
 */

const SPRING = 0.04;
const DAMP = 0.88;
const MOUSE_RADIUS = 120;
const MOUSE_STRENGTH = 8;
const SAMPLE_GAP = 4;
const CHARSET = '.:+-=*#@&~<>{}[]|/\\';
const CHAR_SIZE = 6;
const AMBIENT_RATIO = 0.12;
const AMBIENT_MIN = 25;

interface Particle {
  x: number; y: number;
  tx: number; ty: number;
  vx: number; vy: number;
  char: string;
  alpha: number;
  targetAlpha: number;
  isText: boolean;
  phase: number;
  delay: number;
}

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let mouseX = -9999;
let mouseY = -9999;
let animId = 0;
let accentColor = '#d73a49';
let startTime = 0;

function randomChar(): string {
  return CHARSET[Math.floor(Math.random() * CHARSET.length)]!;
}

function sampleTextPixels(
  text: string, font: string, w: number, h: number, yOffset: number
): Array<{ x: number; y: number }> {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const oc = off.getContext('2d')!;
  oc.font = font;
  oc.fillStyle = '#fff';
  oc.textBaseline = 'middle';
  // Center horizontally
  const metrics = oc.measureText(text);
  const tx = (w - metrics.width) / 2;
  oc.fillText(text, tx, yOffset);
  const img = oc.getImageData(0, 0, w, h);
  const positions: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < h; y += SAMPLE_GAP) {
    for (let x = 0; x < w; x += SAMPLE_GAP) {
      const i = (y * w + x) * 4;
      if (img.data[i + 3]! > 128) {
        positions.push({ x, y });
      }
    }
  }
  return positions;
}

function createParticles(positions: Array<{ x: number; y: number }>, w: number, h: number): Particle[] {
  const result: Particle[] = [];
  for (const pos of positions) {
    result.push({
      x: pos.x + (Math.random() - 0.5) * w * 0.4,
      y: pos.y + (Math.random() - 0.5) * h * 2,
      tx: pos.x, ty: pos.y,
      vx: 0, vy: 0,
      char: randomChar(),
      alpha: 0,
      targetAlpha: 0.8 + Math.random() * 0.2,
      isText: true,
      phase: Math.random() * Math.PI * 2,
      delay: (pos.x / w) * 1.0,
    });
  }
  // Ambient particles
  const ambientCount = Math.max(AMBIENT_MIN, Math.floor(result.length * AMBIENT_RATIO));
  for (let i = 0; i < ambientCount; i++) {
    const px = Math.random() * w;
    const py = Math.random() * h;
    result.push({
      x: px, y: py, tx: px, ty: py,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      char: randomChar(),
      alpha: 0,
      targetAlpha: 0.04 + Math.random() * 0.06,
      isText: false,
      phase: Math.random() * Math.PI * 2,
      delay: Math.random() * 0.5,
    });
  }
  return result;
}

function frame(now: number): void {
  if (!ctx || !canvas) return;
  const elapsed = (now - startTime) / 1000;
  const w = canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
  const h = canvas.height / (Math.min(window.devicePixelRatio || 1, 2));

  ctx.clearRect(0, 0, w, h);
  ctx.font = `500 ${CHAR_SIZE}px "Inter", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accentColor;

  for (const p of particles) {
    const t = Math.max(0, elapsed - p.delay);
    if (p.isText && t < 0.01) {
      ctx.globalAlpha = 0.02;
      ctx.fillText(p.char, p.x, p.y);
      continue;
    }

    // Spring
    p.vx += (p.tx - p.x) * SPRING;
    p.vy += (p.ty - p.y) * SPRING;

    // Mouse repulsion
    const dx = p.x - mouseX;
    const dy = p.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MOUSE_RADIUS && dist > 0) {
      const f = ((1 - dist / MOUSE_RADIUS) ** 2) * MOUSE_STRENGTH;
      p.vx += (dx / dist) * f;
      p.vy += (dy / dist) * f;
    }

    p.vx *= DAMP;
    p.vy *= DAMP;
    p.x += p.vx;
    p.y += p.vy;

    // Alpha animation
    if (p.isText) {
      p.alpha = p.targetAlpha + Math.sin(elapsed * 0.8 + p.phase) * 0.08;
      if (t < 0.8 || Math.random() < 0.0008) {
        p.char = randomChar();
      }
    } else {
      p.alpha += (p.targetAlpha - p.alpha) * 0.04;
      p.tx += (Math.random() - 0.5) * 0.2;
      p.ty += (Math.random() - 0.5) * 0.2;
      if (p.x < -20) p.x = p.tx = w + 10;
      if (p.x > w + 20) p.x = p.tx = -10;
      if (p.y < -20) p.y = p.ty = h + 10;
      if (p.y > h + 20) p.y = p.ty = -10;
      if (Math.random() < 0.003) p.char = randomChar();
    }

    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillText(p.char, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  animId = requestAnimationFrame(frame);
}

function readAccentColor(): void {
  accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim() || '#d73a49';
}

function init(): void {
  canvas = document.getElementById('particle-hero-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Skip on mobile
  if (window.innerWidth <= 640) return;

  ctx = canvas.getContext('2d');
  if (!ctx) return;

  const heroEl = canvas.closest('.particle-hero') as HTMLElement;
  const parentW = heroEl.parentElement?.offsetWidth || 720;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  readAccentColor();

  // Observe theme changes
  const themeObs = new MutationObserver(readAccentColor);
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  document.fonts.ready.then(() => {
    // Compute font size to fill ~70% of container width for the name
    const tmp = document.createElement('canvas').getContext('2d')!;
    const baseSize = 60;
    tmp.font = `700 ${baseSize}px Inter`;
    const nameWidth = tmp.measureText('Minh-Ha Nguyen').width;
    const scaledSize = Math.floor(baseSize * (parentW * 0.7) / nameWidth);

    // Height: name + subtitle
    const totalH = Math.ceil(scaledSize * 2.2);

    canvas!.style.width = `${parentW}px`;
    canvas!.style.height = `${totalH}px`;
    canvas!.width = parentW * dpr;
    canvas!.height = totalH * dpr;
    ctx!.scale(dpr, dpr);

    // Sample name pixels
    const nameFont = `700 ${scaledSize}px Inter`;
    const namePositions = sampleTextPixels('Minh-Ha Nguyen', nameFont, parentW, totalH, scaledSize * 0.5);

    // Sample subtitle pixels
    const subSize = Math.floor(scaledSize * 0.4);
    const subFont = `400 ${subSize}px Inter`;
    const subPositions = sampleTextPixels('Research Blog', subFont, parentW, totalH, scaledSize * 1.3);

    const allPositions = [...namePositions, ...subPositions];
    particles = createParticles(allPositions, parentW, totalH);

    // Mark as ready
    heroEl.setAttribute('data-particle-ready', '');

    // Mouse tracking
    const onMove = (e: MouseEvent) => {
      const r = canvas!.getBoundingClientRect();
      mouseX = e.clientX - r.left;
      mouseY = e.clientY - r.top;
    };
    const onLeave = () => { mouseX = -9999; mouseY = -9999; };
    const onTouchMove = (e: TouchEvent) => {
      const r = canvas!.getBoundingClientRect();
      const t = e.touches[0]!;
      mouseX = t.clientX - r.left;
      mouseY = t.clientY - r.top;
    };
    const onTouchEnd = () => { mouseX = -9999; mouseY = -9999; };

    canvas!.addEventListener('mousemove', onMove, { passive: true });
    canvas!.addEventListener('mouseleave', onLeave);
    canvas!.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas!.addEventListener('touchend', onTouchEnd);

    startTime = performance.now();
    animId = requestAnimationFrame(frame);

    // Cleanup
    window.addEventListener('pagehide', () => {
      cancelAnimationFrame(animId);
      themeObs.disconnect();
    });
  });
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
