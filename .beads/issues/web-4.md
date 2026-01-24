# web-4: Convert Papers DOCX to Markdown

**Status:** completed
**Priority:** critical
**Type:** task
**Created:** 2026-01-23
**Blocked-by:** web-1
**Blocks:** web-5, web-10

## Summary

Convert the 3 research papers from DOCX format to clean, LLM-friendly markdown. Extract abstract + main body (intro, methods, results, discussion).

## Why This Matters

Per user requirement:
- "papers are located as @papers/ in docx file - might need to translate just the necessary part (abstract + main body - intro-method-results-discussion) into llm friendly format first"

Per Building_plan_v3.md:
- Papers will be chunked for RAG (800-1200 tokens per chunk)
- Need clean markdown with proper headers for TOC generation
- Metadata needed for attribution in chat responses

## Papers to Convert

1. `papers/5_ARIs_depression.docx` (82KB)
2. `papers/Hira_study.docx` (137KB)
3. `papers/NZ_study.docx` (117KB)

## Acceptance Criteria

- [ ] Each paper converted to markdown in `content/papers/`
- [ ] Frontmatter with title, authors, abstract, date
- [ ] Proper heading hierarchy (h2 for sections, h3 for subsections)
- [ ] Tables preserved as markdown tables
- [ ] Figures referenced with descriptive alt text
- [ ] Citations formatted consistently
- [ ] Reading time calculated and added to frontmatter

## Output Structure

```
content/
  papers/
    5-aris-depression.md
    hira-study.md
    nz-study.md
```

Each file format:
```markdown
---
title: "Paper Title"
authors: ["Author 1", "Author 2"]
date: "YYYY-MM-DD"
abstract: "Full abstract text..."
readingTime: X
---

## Abstract

[Full abstract]

## Introduction

[Content]

## Methods

[Content]

## Results

[Content]

## Discussion

[Content]

## References

[If needed for context]
```

## Conversion Notes

- Strip unnecessary formatting (headers, footers, page numbers)
- Preserve statistical notation and symbols
- Ensure tables are properly aligned
- Remove or describe figures appropriately
- Keep academic citation style intact for credibility
