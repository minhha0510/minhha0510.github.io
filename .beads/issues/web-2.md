# web-2: Dark/Light Theme System

**Status:** completed
**Priority:** high
**Type:** feature
**Created:** 2026-01-23
**Blocked-by:** web-1
**Blocks:** web-6

## Summary

Implement theme switching with CSS custom properties and localStorage persistence. Prevent flash of wrong theme on page load.

## Why This Matters

Per Building_plan_v3.md goals:
- "Reading enjoyment: Dark/light theme" - first listed user experience goal
- Respects user's system preference (prefers-color-scheme)
- Persists choice across sessions
- No flash of unstyled content (FOUC)

## Acceptance Criteria

- [ ] CSS variables defined for both themes (--bg, --bg-elevated, --text, --text-muted, --accent, --border)
- [ ] Theme toggle button with sun/moon icons
- [ ] localStorage persistence working
- [ ] System preference detection (prefers-color-scheme)
- [ ] No flash on page load (inline script in <head>)
- [ ] Smooth transitions between themes

## Technical Implementation

From v3 plan - CSS variables:
```css
:root {
  --bg: #F5F0E8;
  --bg-elevated: #FFFFFF;
  --text: #1A1A1A;
  --text-muted: #6B6B6B;
  --accent: #007AFF;
  --border: rgba(0,0,0,0.1);
}

[data-theme="dark"] {
  --bg: #1C1B1A;
  --bg-elevated: #2D2B28;
  --text: #F0EDE8;
  --text-muted: #8A867F;
  --accent: #0A84FF;
  --border: rgba(255,255,255,0.1);
}
```

Flash prevention (inline in <head>):
```html
<script>
  const theme = localStorage.getItem('theme') ||
    (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
</script>
```

## Design Notes

- Light theme: Warm cream (#F5F0E8) - comfortable for reading
- Dark theme: Warm dark (#1C1B1A) - not pure black, easier on eyes
- Accent blue differs slightly between themes for optimal contrast
