/**
 * Feature 3: Balanced Post Titles
 * Uses pretext binary search to find the tightest width that maintains
 * the same line count, eliminating orphan words on the last line.
 */
import { onPretextReady, onResize, prepare, layout, getFontString, getLineHeight } from '../pretext-init';
import type { PreparedText } from '@chenglou/pretext';

let titleEl: HTMLElement | null = null;
let prepared: PreparedText | null = null;
let font = '';
let lineHeight = 0;

function balanceTitle(): void {
  if (!titleEl || !prepared) return;

  const containerWidth = titleEl.parentElement?.getBoundingClientRect().width ?? 720;

  const baseline = layout(prepared, containerWidth, lineHeight);

  // Single-line titles don't need balancing
  if (baseline.lineCount <= 1) {
    titleEl.style.maxWidth = '';
    return;
  }

  // Binary search for minimum width that keeps the same line count
  let lo = 1;
  let hi = Math.ceil(containerWidth);

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const result = layout(prepared, mid, lineHeight);
    if (result.lineCount <= baseline.lineCount) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  titleEl.style.maxWidth = `${lo}px`;
  titleEl.style.marginLeft = 'auto';
  titleEl.style.marginRight = 'auto';
}

function initBalancedTitles(): void {
  titleEl = document.getElementById('post-title');
  if (!titleEl) return;

  const text = titleEl.textContent || '';
  if (!text.trim()) return;

  font = getFontString(titleEl);
  lineHeight = getLineHeight(titleEl);
  prepared = prepare(text, font);

  balanceTitle();
}

onPretextReady(() => {
  initBalancedTitles();
  onResize(() => {
    // Font size may change on resize (responsive), so re-read
    if (titleEl) {
      const newFont = getFontString(titleEl);
      if (newFont !== font) {
        font = newFont;
        lineHeight = getLineHeight(titleEl);
        prepared = prepare(titleEl.textContent || '', font);
      }
    }
    balanceTitle();
  });
});
