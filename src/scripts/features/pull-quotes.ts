/**
 * Feature 2: Pull Quote / Key Finding Callout
 * Uses pretext to calculate exact text height for smooth entrance animation.
 */
import { onPretextReady, prepare, layout } from '../pretext-init';

const CONTEXT_FONT = '400 13.6px Inter'; // 0.85rem
const CONTEXT_LINE_HEIGHT = 20.4; // 13.6px * 1.5

function initPullQuotes(): void {
  const keyFindings = document.querySelectorAll<HTMLElement>('.key-finding');

  for (const finding of keyFindings) {
    const contextEl = finding.querySelector<HTMLElement>('.key-finding-context');
    if (!contextEl) continue;

    const text = contextEl.textContent || '';
    if (!text.trim()) continue;

    const prepared = prepare(text, CONTEXT_FONT);
    const contentWidth = contextEl.getBoundingClientRect().width;

    if (contentWidth > 0) {
      const result = layout(prepared, contentWidth, CONTEXT_LINE_HEIGHT);
      // Set precise height for any future animation use
      contextEl.style.minHeight = `${Math.ceil(result.height)}px`;
    }

    // Reveal with fade-in
    finding.style.opacity = '1';
  }
}

onPretextReady(initPullQuotes);
