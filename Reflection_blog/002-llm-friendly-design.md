# Reflection: Designing for AI Assistants

**Date:** February 19, 2026  
**Context:** Improving LLM prompt buttons and adding AI-readable content

## The Problem

The original "Discuss with AI" buttons weren't working well:
1. Users didn't understand they just copied prompts to clipboard
2. The prompts were too generic and impersonal
3. There was no clear feedback when the prompt was copied
4. LLM crawlers had to parse the entire article to understand the content

## The Solution

### 1. Clearer Button Labels and Feedback
- Changed title to "💬 Discuss with AI" 
- Added description: "Click to copy a prompt for ChatGPT, Claude, or your preferred LLM"
- Button text changes to "Copied!" temporarily after clicking
- Added a feedback message below buttons confirming the copy

### 2. More Personalized Prompts

**Before:**
```
I'd like to discuss this blog post about pharmacoepidemiology research:
Title: "..."
URL: ...
Please: 1. Summarize... 2. Explain... 3. Discuss...
```

**After:**
```
Using what you know about me as a pharmacoepidemiologist researching 
medication safety, please help me understand this blog post deeply, 
step-by-step, and engagingly.

Article: "..."
Link: ...

Please:
1. Explain the key findings and why they matter for patients and clinicians
2. Walk through the methodology in an accessible way
3. Connect this to the broader context of 5-ARI research
4. Highlight any surprising or counterintuitive aspects
5. Suggest follow-up questions I should consider
```

The new prompt:
- Establishes the user's identity and expertise
- Asks for step-by-step, engaging explanation
- Requests connection to broader context
- Asks for follow-up suggestions

### 3. AI-Readable Section

Added a dedicated section at the bottom of each post:
```html
<section class="llm-section" aria-label="Machine-readable content summary">
```

This includes structured metadata:
- Article type and author info
- Original paper details
- Journal and DOI
- Tags and categories
- Summary paragraph
- Instructions for LLMs on tone and focus areas

This helps AI assistants understand:
- Who the author is
- What the content is about
- How to approach discussions about it
- The academic context

## Key Insights

### For Human Users:
- **Clarity beats cleverness**: Explicitly say what the button does
- **Immediate feedback**: Show that the action worked
- **Personalization**: Prompts should reflect the user's voice and needs

### For AI Assistants:
- **Structured data**: LLMs parse structured content better than prose
- **Context matters**: Tell the AI who the author is and what tone to use
- **Dedicated section**: A separate LLM section doesn't clutter the human reading experience

## Future Considerations

1. **Schema.org markup**: Could add JSON-LD for even better machine readability
2. **RSS feed**: For AI assistants that monitor content updates
3. **llms.txt**: A dedicated file explaining how to interpret the site's content
4. **Different prompt styles**: Let users choose between "Beginner", "Intermediate", "Expert" prompts

## The Lesson

Design for both humans AND AI assistants. As AI becomes part of how people consume content, making your content AI-readable is as important as making it human-readable. The two audiences have different needs:

- **Humans** want engaging prose, visual hierarchy, emotional connection
- **AI assistants** want structured data, clear context, explicit instructions

A good design serves both.
