/**
 * Shared pretext initialization module.
 * Handles font readiness, resize orchestration, and re-exports pretext APIs.
 * All feature scripts import from here instead of directly from @chenglou/pretext.
 */
import {
  prepare,
  prepareWithSegments,
  layout,
  walkLineRanges,
  layoutNextLine,
  layoutWithLines,
} from '@chenglou/pretext';

// Re-export pretext APIs
export {
  prepare,
  prepareWithSegments,
  layout,
  walkLineRanges,
  layoutNextLine,
  layoutWithLines,
};

// --- Font readiness ---

let fontReady = false;
const readyCallbacks: (() => void)[] = [];

/** Register a callback to run once Inter font is loaded and pretext is ready. */
export function onPretextReady(cb: () => void): void {
  if (fontReady) {
    cb();
    return;
  }
  readyCallbacks.push(cb);
}

async function init(): Promise<void> {
  try {
    await document.fonts.ready;
    // Verify Inter specifically is available
    if (document.fonts.check('16px Inter')) {
      fontReady = true;
      document.documentElement.setAttribute('data-pretext-ready', '');
      for (const cb of readyCallbacks) {
        cb();
      }
      readyCallbacks.length = 0;
    }
  } catch {
    // Canvas or font API unavailable — degrade gracefully
  }
}

init();

// --- Resize orchestration ---

type ResizeHandler = () => void;
const resizeHandlers: ResizeHandler[] = [];
let resizeTicking = false;

/** Register a handler called on window resize (RAF-debounced). */
export function onResize(handler: ResizeHandler): void {
  resizeHandlers.push(handler);
}

window.addEventListener('resize', () => {
  if (!resizeTicking) {
    requestAnimationFrame(() => {
      for (const handler of resizeHandlers) {
        handler();
      }
      resizeTicking = false;
    });
    resizeTicking = true;
  }
});

// --- Utilities ---

/** Build a pretext-compatible font string from a DOM element's computed styles. */
export function getFontString(el: HTMLElement): string {
  const styles = getComputedStyle(el);
  const weight = styles.fontWeight;
  const size = styles.fontSize; // e.g. "36px"
  return `${weight} ${size} Inter`;
}

/** Parse a CSS px value to a number. Returns 0 for non-px values. */
export function parsePx(value: string): number {
  if (value.endsWith('px')) {
    return parseFloat(value);
  }
  return 0;
}

/** Get computed line-height in px. Handles 'normal' and unitless values. */
export function getLineHeight(el: HTMLElement): number {
  const styles = getComputedStyle(el);
  const lh = styles.lineHeight;
  if (lh.endsWith('px')) {
    return parseFloat(lh);
  }
  // 'normal' or unitless multiplier
  const fontSize = parseFloat(styles.fontSize);
  const multiplier = lh === 'normal' ? 1.2 : parseFloat(lh);
  return fontSize * multiplier;
}
