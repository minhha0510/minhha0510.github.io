/**
 * Feature 4: Smooth Collapsible Sections
 * Wraps each H2 section in the prose content into collapsible accordions.
 * Uses DOM scrollHeight for height measurement (not pretext — rich HTML content).
 */

interface AccordionSection {
  heading: HTMLElement;
  content: HTMLElement;
  expanded: boolean;
}

let sections: AccordionSection[] = [];

function createChevronSVG(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.classList.add('accordion-chevron');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M9 5l7 7-7 7');
  svg.appendChild(path);
  return svg;
}

function toggleSection(section: AccordionSection): void {
  section.expanded = !section.expanded;

  if (section.expanded) {
    // Expand: measure scrollHeight, set it, then clear after transition
    section.content.style.height = `${section.content.scrollHeight}px`;
    section.heading.parentElement?.classList.remove('collapsed');
    section.heading.setAttribute('aria-expanded', 'true');

    const onTransitionEnd = (): void => {
      section.content.removeEventListener('transitionend', onTransitionEnd);
      if (section.expanded) {
        section.content.style.height = 'auto';
      }
    };
    section.content.addEventListener('transitionend', onTransitionEnd);
  } else {
    // Collapse: set current height explicitly, then transition to 0
    section.content.style.height = `${section.content.scrollHeight}px`;
    // Force reflow so the browser registers the explicit height
    section.content.offsetHeight; // eslint-disable-line @typescript-eslint/no-unused-expressions
    section.content.style.height = '0px';
    section.heading.parentElement?.classList.add('collapsed');
    section.heading.setAttribute('aria-expanded', 'false');
  }
}

function init(): void {
  const proseEl = document.querySelector('.prose');
  if (!proseEl) return;

  const h2s = proseEl.querySelectorAll<HTMLElement>('h2');
  if (h2s.length === 0) return;

  for (let i = 0; i < h2s.length; i++) {
    const h2 = h2s[i];
    const sectionId = `section-${i}`;

    // Collect all siblings between this H2 and the next one
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'accordion-section-content';
    contentWrapper.id = sectionId;

    let sibling = h2.nextElementSibling;
    const nextH2 = h2s[i + 1] || null;
    const siblings: Element[] = [];

    while (sibling && sibling !== nextH2) {
      siblings.push(sibling);
      sibling = sibling.nextElementSibling;
    }

    // Wrap content in the accordion container
    if (siblings.length > 0) {
      h2.parentElement!.insertBefore(contentWrapper, siblings[0]);
      for (const s of siblings) {
        contentWrapper.appendChild(s);
      }
    }

    // Wrap H2 + content in a section element
    const sectionWrapper = document.createElement('div');
    sectionWrapper.className = 'accordion-section';
    h2.parentElement!.insertBefore(sectionWrapper, h2);
    sectionWrapper.appendChild(h2);
    sectionWrapper.appendChild(contentWrapper);

    // Style the H2 as a toggle
    h2.classList.add('accordion-heading');
    h2.setAttribute('role', 'button');
    h2.setAttribute('tabindex', '0');
    h2.setAttribute('aria-expanded', 'true');
    h2.setAttribute('aria-controls', sectionId);
    h2.appendChild(createChevronSVG());

    const section: AccordionSection = {
      heading: h2,
      content: contentWrapper,
      expanded: true,
    };

    sections.push(section);

    // Click handler
    h2.addEventListener('click', (e) => {
      // Don't toggle if user clicked on a link inside the heading
      if ((e.target as HTMLElement).closest('a')) return;
      toggleSection(section);
    });

    // Keyboard handler
    h2.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSection(section);
      }
    });
  }
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
