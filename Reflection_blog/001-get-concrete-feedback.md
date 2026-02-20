# Reflection: The Power of Concrete Feedback

**Date:** February 19, 2026  
**Context:** Building a research blog website with Astro

## The Problem

I was working on styling improvements for the research blog - adding CSS imports, fixing SVG icon sizing, and ensuring dark mode worked correctly. The code looked correct, and the build succeeded without errors. Everything seemed fine.

## The Blind Spot

However, I was "working in the dark" - making changes to the code without actually seeing the rendered output. The project was configured with:
- CSS variables in `global.css`
- SVG icons in the footer
- Dark/light theme toggle

But I couldn't verify if any of it was actually working correctly just by looking at the code.

## The Solution: Playwright

After installing Playwright, I wrote a simple script to:
1. Build the website
2. Serve it locally
3. Capture screenshots in both light and dark modes

## What I Discovered

The screenshots immediately revealed several issues:

1. **Missing CSS import** - The `global.css` file was never imported in `Layout.astro`, so all CSS variables were undefined. The site rendered with default browser styles.

2. **Oversized SVG icons** - The GitHub and email icons in the footer were rendering at full viewport width instead of 20x20px. This was because Tailwind's purge was removing the CSS rules, and the SVGs had no explicit sizing.

3. **Dark mode not applying** - Without the CSS variables, the `[data-theme="dark"]` selectors had no effect.

## The Fixes

With visual confirmation of the problems, fixing them was straightforward:

```astro
// Added to Layout.astro
import '../styles/global.css';
```

```astro
// Added explicit dimensions to SVGs
<svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20">
```

## The Lesson

**Get concrete feedback as fast as possible.**

Whether it's:
- Screenshots of a website
- Sample outputs from a data pipeline
- Rendered previews of documents
- Test results from code changes

Don't rely solely on code review or successful builds. You need to see the actual output to catch issues that static analysis misses.

## Future Applications

This principle applies beyond web development:
- **Data projects:** Generate sample outputs and visualizations early
- **Writing:** Render the final formatted output, not just raw markdown
- **APIs:** Make test calls and inspect the actual responses
- **Configuration:** Validate that changes produce the expected behavior

The goal is to shorten the feedback loop between making a change and seeing its effect.

## Tools That Help

- **Web:** Playwright, Puppeteer, Cypress
- **Data:** Jupyter notebooks, quick plotting scripts
- **Documents:** Live reload previews
- **APIs:** curl, httpie, Postman, or simple test scripts

Build your feedback loop into your workflow from the start, not as an afterthought.
