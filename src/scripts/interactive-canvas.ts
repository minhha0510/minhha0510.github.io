/**
 * Interactive Canvas — Green Scenery, Running Dog, Steve Jobs Quote
 *
 * - Background: Ghibli-style illustration loaded as image
 * - Dog: Starts idle in corner. Click on dog to "take him for a walk"
 * - Text: Pretext layoutNextLine + Canvas fillText, reflows around dog
 * - Per-character distortion near dog
 * - Cherry blossom petals on mouse move
 */
import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext';
import type { PreparedTextWithSegments, LayoutCursor } from '@chenglou/pretext';
import { carveTextLineSlots, getRectIntervalsForBand } from './wrap-geometry';

// ─── Content ───────────────────────────────────────────────────────────────

const PARAGRAPHS = [
  'I grow little of the food I eat, and of the little I do grow I did not breed or perfect the seeds.',
  'I do not make any of my own clothing.',
  'I speak a language I did not invent or refine.',
  'I did not discover the mathematics I use.',
  'I am protected by freedoms and laws I did not conceive of or legislate, and do not enforce or adjudicate.',
  'I am moved by music I did not create myself.',
  'When I needed medical attention, I was helpless to help myself survive.',
  'I did not invent the transistor, the microprocessor, object oriented programming, or most of the technology I work with.',
  'I love and admire my species, living and dead, and am totally dependent on them for my life and well being.',
];

// ─── Canvas ────────────────────────────────────────────────────────────────

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const hint = document.getElementById('hint');

let W = 0, H = 0, dpr = 1;
let pageWidth = 0, pageHeight = 0, pageX = 0, pageY = 0;
let fontSize = 18, lineHeight = 32, margin = 50;
let font = '';

// ─── Background image ──────────────────────────────────────────────────────

const bgImage = new Image();
bgImage.src = '/images/interactive-bg.png';
let bgLoaded = false;
bgImage.onload = () => { bgLoaded = true; };

function drawBackground(): void {
  if (bgLoaded) {
    // Draw image in "cover" mode — fill canvas, crop to fit
    const imgRatio = bgImage.width / bgImage.height;
    const canvasRatio = W / H;
    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (canvasRatio > imgRatio) {
      drawW = W;
      drawH = W / imgRatio;
      drawX = 0;
      drawY = (H - drawH) / 2;
    } else {
      drawH = H;
      drawW = H * imgRatio;
      drawX = (W - drawW) / 2;
      drawY = 0;
    }

    ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);
  } else {
    // Fallback gradient while image loads
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.6, '#b8d8b0');
    grad.addColorStop(1, '#3a8a3a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
}

// ─── Prepared text ─────────────────────────────────────────────────────────

let preparedParagraphs: PreparedTextWithSegments[] = [];

function prepareText(): void {
  font = `${fontSize}px Inter`;
  preparedParagraphs = PARAGRAPHS.map(p => prepareWithSegments(p, font));
}

// ─── Dog sprite sheet ──────────────────────────────────────────────────────

// Sprite regions in the combined image (approximate crops from the trios PNG)
// Image is roughly square. Running=top-left, Sitting=top-right, Lying=bottom-center
const SPRITE_REGIONS = {
  running: { sx: 0, sy: 0, sw: 0.5, sh: 0.55 },       // top-left quadrant
  sitting: { sx: 0.48, sy: 0, sw: 0.52, sh: 0.58 },    // top-right quadrant
  lying:   { sx: 0.15, sy: 0.52, sw: 0.7, sh: 0.48 },  // bottom-center
};

const dogSprite = new Image();
dogSprite.src = '/images/dog-sprites.png';
let spriteLoaded = false;
dogSprite.onload = () => { spriteLoaded = true; };

// ─── Dog state ─────────────────────────────────────────────────────────────

interface Dog {
  x: number; y: number;
  homeX: number; homeY: number;
  size: number;          // display size (width) in px
  phase: number;
  walking: boolean;
  pulsePhase: number;
}

const dog: Dog = {
  x: 0, y: 0, homeX: 0, homeY: 0,
  size: 80, phase: 0,
  walking: false, pulsePhase: 0,
};

let cursorX = -9999, cursorY = -9999;
let lastMoveTime = -Infinity;
const IDLE_TIMEOUT = 2500;

function updateDog(now: number): boolean {
  dog.phase = now * 0.004;
  dog.pulsePhase = now * 0.003;

  if (!dog.walking) {
    const prevX = dog.x, prevY = dog.y;
    dog.x += (dog.homeX - dog.x) * 0.05;
    dog.y += (dog.homeY - dog.y) * 0.05;
    return Math.abs(dog.x - prevX) > 0.01 || Math.abs(dog.y - prevY) > 0.01;
  }

  const idle = now - lastMoveTime > IDLE_TIMEOUT;

  if (idle) {
    dog.x += (dog.homeX - dog.x) * 0.06;
    dog.y += (dog.homeY - dog.y) * 0.06;
    if (Math.abs(dog.x - dog.homeX) < 2 && Math.abs(dog.y - dog.homeY) < 2) {
      dog.walking = false;
      dog.x = dog.homeX;
      dog.y = dog.homeY;
      if (hint) {
        hint.textContent = 'Click Buddy again to take him for a walk!';
        hint.style.opacity = '1';
        setTimeout(() => { if (hint) hint.style.opacity = '0'; }, 3000);
      }
    }
    return true;
  }

  const prevX = dog.x, prevY = dog.y;
  dog.x += (cursorX - dog.x) * 0.08;
  dog.y += (cursorY - dog.y) * 0.08;

  const dx = dog.x - prevX, dy = dog.y - prevY;
  return dx * dx + dy * dy > 0.01;
}

function drawDog(): void {
  const { x, y, size, walking, pulsePhase, phase } = dog;
  const bob = Math.sin(phase) * 2;

  // Pick sprite pose
  const speed = dog.walking ? Math.abs(cursorX - dog.x) + Math.abs(cursorY - dog.y) : 0;
  const pose = !walking ? 'sitting' : speed > 5 ? 'running' : 'sitting';
  const region = SPRITE_REGIONS[pose];

  // Idle pulse glow
  if (!walking) {
    const pulse = 0.12 + Math.sin(pulsePhase) * 0.08;
    ctx.fillStyle = `rgba(212, 168, 67, ${pulse})`;
    ctx.beginPath();
    ctx.arc(x, y + bob, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  if (spriteLoaded) {
    const imgW = dogSprite.width;
    const imgH = dogSprite.height;
    const srcX = region.sx * imgW;
    const srcY = region.sy * imgH;
    const srcW = region.sw * imgW;
    const srcH = region.sh * imgH;

    // Draw sprite centered on dog position
    const aspect = srcW / srcH;
    const drawW = size;
    const drawH = size / aspect;

    // Flip horizontally if dog is moving left
    const movingLeft = walking && cursorX < dog.x;

    ctx.save();
    ctx.translate(x, y + bob);
    if (movingLeft) ctx.scale(-1, 1);
    ctx.drawImage(
      dogSprite,
      srcX, srcY, srcW, srcH,
      -drawW / 2, -drawH / 2, drawW, drawH,
    );
    ctx.restore();
  } else {
    // Fallback circle while sprite loads
    ctx.fillStyle = '#d4a843';
    ctx.beginPath();
    ctx.arc(x, y + bob, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.35 + bob, size * 0.4, size * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // "Click me" label when idle
  if (!walking) {
    ctx.font = `${Math.max(10, fontSize * 0.6)}px Inter`;
    ctx.fillStyle = 'rgba(42, 26, 10, 0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Click me!', x, y + size * 0.4 + bob);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }
}

function getDogRect(): { x: number; y: number; width: number; height: number } | null {
  if (!dog.walking) return null;
  const pad = 12;
  const halfW = dog.size * 0.5 + pad;
  const halfH = dog.size * 0.4 + pad;
  return {
    x: dog.x - halfW,
    y: dog.y - halfH,
    width: halfW * 2,
    height: halfH * 2,
  };
}

function hitTestDog(px: number, py: number): boolean {
  const dx = px - dog.x;
  const dy = py - dog.y;
  return dx * dx + dy * dy < (dog.size * 0.6) ** 2;
}

// ─── Text layout ───────────────────────────────────────────────────────────

interface TextLine { text: string; x: number; y: number }
let textLines: TextLine[] = [];
let dirty = true;

function layoutText(): void {
  const lines: TextLine[] = [];
  let y = pageY + margin;
  const dogRect = getDogRect();

  for (const prepared of preparedParagraphs) {
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let safety = 100;

    while (safety-- > 0) {
      if (y > pageY + pageHeight - margin * 2) break;

      let slotLeft = pageX + margin;
      let slotRight = pageX + pageWidth - margin;

      if (dogRect) {
        const blocked = getRectIntervalsForBand([dogRect], y, y + lineHeight, 14, 6);
        const slots = carveTextLineSlots({ left: slotLeft, right: slotRight }, blocked);
        if (slots.length === 0) { y += lineHeight; continue; }
        let best = slots[0]!;
        for (let i = 1; i < slots.length; i++) {
          if ((slots[i]!.right - slots[i]!.left) > (best.right - best.left)) best = slots[i]!;
        }
        slotLeft = best.left;
        slotRight = best.right;
      }

      const slotWidth = slotRight - slotLeft;
      if (slotWidth < 30) { y += lineHeight; continue; }

      const line = layoutNextLine(prepared, cursor, slotWidth);
      if (!line) break;

      lines.push({ text: line.text, x: slotLeft, y });
      cursor = line.end;
      y += lineHeight;
    }

    y += lineHeight * 0.5; // paragraph gap
  }

  textLines = lines;
  dirty = false;
}

// ─── Text rendering with per-character distortion ──────────────────────────

function drawText(): void {
  ctx.font = font;
  ctx.textBaseline = 'top';

  const distRadius = dog.walking ? dog.size * 2.5 : 0;

  for (const line of textLines) {
    const lineMidY = line.y + fontSize * 0.5;

    if (!dog.walking) {
      ctx.fillStyle = '#2a1a0a';
      ctx.globalAlpha = 1;
      ctx.fillText(line.text, line.x, line.y);
      continue;
    }

    const roughDist = Math.sqrt((line.x + 50 - dog.x) ** 2 + (lineMidY - dog.y) ** 2);

    if (roughDist > distRadius + 150) {
      ctx.fillStyle = '#2a1a0a';
      ctx.globalAlpha = 1;
      ctx.fillText(line.text, line.x, line.y);
      continue;
    }

    // Per-character distortion
    let charX = line.x;
    for (let i = 0; i < line.text.length; i++) {
      const ch = line.text[i]!;
      const charW = ctx.measureText(ch).width;
      const cx = charX + charW / 2;
      const dx = cx - dog.x;
      const dy = lineMidY - dog.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const strength = Math.max(0, 1 - dist / distRadius);

      if (strength > 0.005) {
        const nx = dist > 0 ? dx / dist : 0;
        const ny = dist > 0 ? dy / dist : 0;
        ctx.save();
        ctx.globalAlpha = Math.max(0.15, 1 - strength * 0.7);
        ctx.translate(charX + nx * strength * 30, line.y + ny * strength * 18);
        ctx.rotate(strength * (nx > 0 ? 1 : -1) * 0.8);
        const r = Math.round(42 + strength * 160);
        const g = Math.round(26 + strength * 70);
        const b = Math.round(10 + strength * 5);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      } else {
        ctx.fillStyle = '#2a1a0a';
        ctx.globalAlpha = 1;
        ctx.fillText(ch, charX, line.y);
      }
      charX += charW;
    }
  }
  ctx.globalAlpha = 1;
}

// ─── Petals ────────────────────────────────────────────────────────────────

interface Petal {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; rotV: number;
  size: number; alpha: number; life: number;
  isPetal: boolean; char?: string;
}

const petals: Petal[] = [];
let lastSpawnX = -9999, lastSpawnY = -9999;

function spawnPetals(x: number, y: number): void {
  for (let i = 0; i < 1 + Math.floor(Math.random() * 2); i++) {
    const isPetal = Math.random() > 0.25;
    petals.push({
      x, y,
      vx: (Math.random() - 0.5) * 2.5,
      vy: (Math.random() - 0.5) * 2.5 - 0.8,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.1,
      size: isPetal ? 3 + Math.random() * 3 : 0,
      alpha: 0.7 + Math.random() * 0.3,
      life: 50 + Math.floor(Math.random() * 40),
      isPetal,
      char: isPetal ? undefined : '.:+-=*#@&~'[Math.floor(Math.random() * 10)],
    });
  }
}

function updatePetals(): void {
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i]!;
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.025; p.vx *= 0.995;
    p.rot += p.rotV; p.alpha -= 0.01; p.life--;
    if (p.life <= 0 || p.alpha <= 0) petals.splice(i, 1);
  }
}

function drawPetals(): void {
  for (const p of petals) {
    ctx.globalAlpha = Math.max(0, p.alpha);
    if (p.isPetal) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = '#ffb7c5';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#d73a49';
      ctx.font = '9px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.char!, p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

// ─── Events ────────────────────────────────────────────────────────────────

canvas.addEventListener('pointerdown', (e) => {
  const px = e.clientX, py = e.clientY;

  if (hitTestDog(px, py)) {
    if (!dog.walking) {
      // Activate walking mode
      dog.walking = true;
      lastMoveTime = performance.now();
      if (hint) hint.style.opacity = '0';
    }
  }
  e.preventDefault();
});

canvas.addEventListener('pointermove', (e) => {
  cursorX = e.clientX;
  cursorY = e.clientY;

  if (dog.walking) {
    lastMoveTime = performance.now();
    dirty = true;
  }

  // Petal trail
  const dx = cursorX - lastSpawnX;
  const dy = cursorY - lastSpawnY;
  if (dx * dx + dy * dy > 150) {
    spawnPetals(cursorX, cursorY);
    lastSpawnX = cursorX;
    lastSpawnY = cursorY;
  }

  // Cursor style
  if (hitTestDog(cursorX, cursorY)) {
    canvas.style.cursor = dog.walking ? 'default' : 'pointer';
  } else {
    canvas.style.cursor = 'default';
  }
});

canvas.addEventListener('pointerleave', () => {
  cursorX = dog.homeX;
  cursorY = dog.homeY;
  if (dog.walking) lastMoveTime = -Infinity; // trigger return
});

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0]!;
  cursorX = t.clientX;
  cursorY = t.clientY;
  if (dog.walking) { lastMoveTime = performance.now(); dirty = true; }
  const dx = cursorX - lastSpawnX;
  const dy = cursorY - lastSpawnY;
  if (dx * dx + dy * dy > 150) {
    spawnPetals(cursorX, cursorY);
    lastSpawnX = cursorX; lastSpawnY = cursorY;
  }
}, { passive: false });
canvas.addEventListener('touchend', () => {
  if (dog.walking) lastMoveTime = -Infinity;
});

// ─── Resize ────────────────────────────────────────────────────────────────

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  pageWidth = Math.min(W - 40, 720);
  pageHeight = Math.min(H - 40, 960);
  pageX = Math.round((W - pageWidth) / 2);
  pageY = Math.round(Math.max(20, (H - pageHeight) / 2));

  fontSize = Math.max(14, Math.min(21, pageWidth * 0.028));
  lineHeight = Math.round(fontSize * 1.75);
  margin = Math.max(16, Math.min(40, pageWidth * 0.05));

  dog.size = Math.max(60, Math.min(100, pageWidth * 0.12));
  dog.homeX = pageX + pageWidth - margin - dog.size * 0.6;
  dog.homeY = pageY + margin + dog.size * 0.5;

  prepareText();
  dirty = true;
}

window.addEventListener('resize', resize);

// ─── Main loop ─────────────────────────────────────────────────────────────

function frame(now: number): void {
  const dogMoved = updateDog(now);
  updatePetals();
  if (dogMoved) dirty = true;
  if (dirty) layoutText();

  // Background
  drawBackground();

  // Semi-transparent text panel
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  const r = 12;
  ctx.beginPath();
  ctx.moveTo(pageX + r, pageY);
  ctx.lineTo(pageX + pageWidth - r, pageY);
  ctx.quadraticCurveTo(pageX + pageWidth, pageY, pageX + pageWidth, pageY + r);
  ctx.lineTo(pageX + pageWidth, pageY + pageHeight - r);
  ctx.quadraticCurveTo(pageX + pageWidth, pageY + pageHeight, pageX + pageWidth - r, pageY + pageHeight);
  ctx.lineTo(pageX + r, pageY + pageHeight);
  ctx.quadraticCurveTo(pageX, pageY + pageHeight, pageX, pageY + pageHeight - r);
  ctx.lineTo(pageX, pageY + r);
  ctx.quadraticCurveTo(pageX, pageY, pageX + r, pageY);
  ctx.closePath();
  ctx.fill();

  // Text
  drawText();

  // Dog
  drawDog();

  // Petals
  drawPetals();

  // Attribution
  ctx.font = `italic ${Math.max(11, fontSize * 0.65)}px Inter`;
  ctx.fillStyle = 'rgba(42, 26, 10, 0.4)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('— Steve Jobs', W / 2, pageY + pageHeight - 8);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const hasMotion = dogMoved || petals.length > 0;
  if (hasMotion) {
    requestAnimationFrame(frame);
  } else {
    setTimeout(() => requestAnimationFrame(frame), 80);
  }
}

// ─── Init ──────────────────────────────────────────────────────────────────

document.fonts.ready.then(() => {
  resize();
  dog.x = dog.homeX;
  dog.y = dog.homeY;
  dirty = true;
  requestAnimationFrame(frame);
});
