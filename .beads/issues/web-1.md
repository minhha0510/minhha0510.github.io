# web-1: Project Foundation - Astro + Tailwind + Netlify Setup

**Status:** completed
**Priority:** critical
**Type:** epic
**Created:** 2026-01-23
**Blocks:** web-2, web-3, web-4, web-5, web-6, web-7, web-8, web-9, web-10, web-11, web-12

## Summary

Initialize the Astro project with Tailwind CSS and configure Netlify deployment. This is the foundational infrastructure that everything else depends on.

## Why This Matters

Per Building_plan_v3.md:
- "Astro ships zero JavaScript by default" - critical for <100KB page weight target
- "Netlify: Free tier covers 500 visitors. Serverless functions hide API keys. Built-in DDoS protection and CDN."
- This establishes the architecture that enables all subsequent features

## Acceptance Criteria

- [ ] Astro 5.x project initialized with static output mode
- [ ] Tailwind CSS configured with custom theme tokens (colors from v3 plan)
- [ ] Netlify deployment working via git push
- [ ] Security headers in netlify.toml (X-Frame-Options, CSP, etc.)
- [ ] Basic page template rendering correctly
- [ ] Lighthouse score baseline established

## Technical Notes

```bash
# Expected initialization commands
npm create astro@latest
npm install -D tailwindcss @astrojs/tailwind
npx astro add tailwind
```

Key netlify.toml security headers from plan:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Content-Security-Policy with strict rules
- Cache-Control for static assets (1 year immutable)

## File Structure Target

```
src/
  pages/           # Astro pages
  components/      # UI components
  layouts/         # Page layouts
  styles/          # Global CSS
netlify.toml       # Headers + redirects
```
