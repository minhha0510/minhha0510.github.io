# Personal Website Implementation Roadmap

Generated: 2026-01-23

## Overview

This roadmap implements the academic website with RAG chat per Building_plan_v3.md.

**Goals Served:**
- Reading enjoyment: Dark/light theme, TOC navigation, reading progress, adjustable text
- Lightweight/responsive: Zero JS by default, mobile-first, <200KB pages
- Blazing fast: Static HTML, CDN delivery, in-memory vector search
- Secure: Server-side API proxy, rate limiting, CSP headers

**External dependencies:** 1 (DeepSeek API only)

---

## Dependency Graph

```
Phase 1: Foundation
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   web-1: Project Foundation (Astro + Tailwind + Netlify)   │
│   ═══════════════════════════════════════════════════════   │
│                           │                                 │
│         ┌─────────────────┼─────────────────┐               │
│         │                 │                 │               │
│         ▼                 ▼                 ▼               │
│     web-2             web-3             web-4               │
│     Theme             Mobile-First      Convert Papers      │
│     System            Layout            DOCX → MD           │
│         │                 │                 │               │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          ▼                 ▼                 ▼

Phase 2: Reading Experience
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      web-5                                  │
│                 Paper Page Template                         │
│                      │                                      │
│         ┌────────────┼────────────┐                         │
│         │            │            │                         │
│         ▼            ▼            ▼                         │
│     web-6        web-7        web-9                         │
│     TOC +        Progress     Reading                       │
│     Scroll Spy   Indicator    Time                          │
│         │            │                                      │
│         └────────────┘                                      │
│                │                                            │
│                ▼                                            │
│            web-8                                            │
│         Text Size +                                         │
│         Scroll Top                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Phase 3: RAG Chat
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   web-4 (Convert Papers) ──────────────────┐                │
│         │                                  │                │
│         ▼                                  │                │
│     web-10                                 │                │
│     Chunk Papers                           │                │
│         │                                  │                │
│         ▼                                  │                │
│     web-11                                 │                │
│     Generate Embeddings                    │                │
│     + Build Index                          │                │
│         │                                  │                │
│         ▼                                  │                │
│     web-12 ◄─────────────── web-1          │                │
│     Netlify Function                       │                │
│     (RAG Endpoint)                         │                │
│         │                                  │                │
│         ▼                                  │                │
│     web-13                                 │                │
│     Chat Widget                            │                │
│                                            │                │
└─────────────────────────────────────────────────────────────┘

Final
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     web-14 ◄─── web-1, web-2, web-3                         │
│     Home Page + Navigation                                  │
│                                                             │
│                    │                                        │
│                    ▼                                        │
│     web-15 ◄─── web-13, web-14                              │
│     Performance Testing                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Issue Summary

| ID | Title | Priority | Type | Blocks | Blocked By |
|----|-------|----------|------|--------|------------|
| web-1 | Project Foundation | critical | epic | 2,3,4,5,6,7,8,9,10,11,12 | - |
| web-2 | Dark/Light Theme | high | feature | 6 | 1 |
| web-3 | Mobile-First Layout | high | feature | 6,7 | 1 |
| web-4 | Convert Papers DOCX→MD | critical | task | 5,10 | 1 |
| web-5 | Paper Page Template | high | feature | 6,7 | 4 |
| web-6 | TOC with Scroll Spy | medium | feature | 8 | 2,3,5 |
| web-7 | Reading Progress Indicator | medium | feature | 8 | 3,5 |
| web-8 | Text Size + Scroll Top | low | feature | - | 6,7 |
| web-9 | Reading Time Display | low | feature | - | 1 |
| web-10 | Chunk Papers for RAG | high | task | 11 | 4 |
| web-11 | Generate Embeddings + Index | high | task | 12 | 10 |
| web-12 | Netlify Function (RAG) | critical | feature | 13 | 1,11 |
| web-13 | Chat Widget | high | feature | 15 | 12 |
| web-14 | Home Page + Navigation | medium | feature | 15 | 1,2,3 |
| web-15 | Performance Testing | medium | task | - | 13,14 |

---

## Implementation Order (Suggested)

**Critical Path (must complete in order):**
1. web-1 → web-4 → web-10 → web-11 → web-12 → web-13 → web-15

**Parallel Work Available:**
- After web-1: web-2, web-3, web-4, web-9 can run in parallel
- After web-4: web-5 and web-10 can run in parallel
- After web-5: web-6 and web-7 can run in parallel

**Recommended Start Order:**
1. web-1 (Foundation) - unlocks everything
2. web-4 (Convert Papers) - needed for both reading experience and RAG
3. web-2, web-3 in parallel (Theme + Layout)
4. web-5 (Paper Template)
5. web-10 → web-11 → web-12 → web-13 (RAG pipeline)
6. web-6, web-7, web-8, web-9 (Reading polish)
7. web-14 (Home Page)
8. web-15 (Final testing)

---

## Cost Summary

| Item | Cost |
|------|------|
| Hosting (Netlify) | $0 |
| Embeddings (OpenAI one-time) | ~$0.10 |
| DeepSeek API | $0.10-1.50/month |
| Domain (optional) | ~$12/year |
| **Total** | **< $2/month** |
