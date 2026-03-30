/**
 * Feature 6: Section-Aware Reading Progress
 * Detects which H2 section is currently visible and displays its name
 * next to the reading progress bar. Uses DOM offsetTop (not pretext).
 */

interface Section {
  top: number;
  name: string;
}

let sections: Section[] = [];
let sectionNameEl: HTMLElement | null = null;
let lastSection = '';

function cacheSectionPositions(): void {
  const headings = document.querySelectorAll<HTMLElement>('.prose h2');
  sections = Array.from(headings).map((h2) => ({
    top: h2.offsetTop,
    name: h2.textContent?.trim() || '',
  }));
}

function updateSectionName(): void {
  if (!sectionNameEl || sections.length === 0) return;

  const scrollY = window.scrollY + 100; // offset for header
  let current = '';

  for (let i = sections.length - 1; i >= 0; i--) {
    if (scrollY >= sections[i].top) {
      current = sections[i].name;
      break;
    }
  }

  if (current !== lastSection) {
    lastSection = current;
    sectionNameEl.textContent = current;
    sectionNameEl.classList.toggle('visible', current !== '');
  }
}

function init(): void {
  // Only run on post pages (pages with .prose h2 elements)
  const hasProseHeadings = document.querySelector('.prose h2');
  if (!hasProseHeadings) return;

  sectionNameEl = document.getElementById('section-name');
  if (!sectionNameEl) return;

  cacheSectionPositions();

  // Hook into the existing scroll handler pattern (RAF debounced)
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateSectionName();
        ticking = false;
      });
      ticking = true;
    }
  });

  // Recache positions on resize (content reflows)
  window.addEventListener('resize', () => {
    requestAnimationFrame(cacheSectionPositions);
  });
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
