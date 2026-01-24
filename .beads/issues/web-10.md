# web-10: Chunk Papers for RAG

**Status:** completed
**Priority:** high
**Type:** task
**Created:** 2026-01-23
**Blocked-by:** web-4
**Blocks:** web-11

## Summary

Split markdown papers into semantic chunks suitable for RAG retrieval. Chunks should be 800-1200 tokens with logical boundaries.

## Why This Matters

Per Building_plan_v3.md:
- "Chunk papers (800-1200 tokens per chunk)" - Phase 3 requirement
- Chunks must preserve semantic meaning for accurate retrieval
- Section boundaries provide natural split points
- Metadata needed for attribution in responses

## Acceptance Criteria

- [ ] Script to process all markdown papers
- [ ] Chunks target 800-1200 tokens
- [ ] Split on markdown headers (##, ###)
- [ ] Preserve section context in each chunk
- [ ] Include metadata: paper title, section, chunk index
- [ ] Output to content/chunks.json
- [ ] Handle edge cases (very long/short sections)

## Output Format

```json
// content/chunks.json
[
  {
    "id": "5-aris-depression-intro-0",
    "paper": "5-aris-depression",
    "paperTitle": "5 ARIs and Depression",
    "section": "Introduction",
    "chunkIndex": 0,
    "text": "Full chunk text here..."
  },
  ...
]
```

## Chunking Strategy

1. Parse markdown into AST
2. Group content by h2/h3 sections
3. If section > 1200 tokens, split at paragraph boundaries
4. If section < 400 tokens, merge with adjacent section
5. Prepend section header to each chunk for context
6. Add paper title as prefix for disambiguation

Example chunk format:
```
Paper: 5 ARIs and Depression
Section: Methods - Study Design

[Actual content of that section...]
```

## Script Location

```
scripts/
  chunk-papers.js
```

## Technical Notes

- Use marked or remark for markdown parsing
- Token count approximation: words * 1.3
- Or use tiktoken for accurate count
- Overlap not strictly needed with semantic boundaries
