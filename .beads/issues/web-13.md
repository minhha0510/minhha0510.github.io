# web-13: Chat Widget Component

**Status:** completed
**Priority:** high
**Type:** feature
**Created:** 2026-01-23
**Completed:** 2026-01-23
**Blocked-by:** web-12

## Summary

Create React chat widget that loads via client:idle, handles user input, and displays streaming responses.

## Why This Matters

Per Building_plan_v3.md:
- "Chat widget (React, loads via client:idle)" - Phase 3 requirement
- Islands architecture: only this component needs JavaScript
- Streaming display for responsive UX
- Must not block initial page load

## Acceptance Criteria

### Loading
- [x] Loads via client:idle (after page renders)
- [x] Small bundle size (< 20KB gzipped) - 3.31 KB gzipped
- [x] Shows minimal placeholder before hydration
- [x] Works with theme system

### UI
- [x] Chat bubble/button to open widget
- [x] Input field for questions
- [x] Message history display
- [x] Streaming response rendering
- [x] Loading indicator during response
- [x] Error handling with user-friendly messages

### Functionality
- [x] Calls /.netlify/functions/chat endpoint
- [x] Handles streaming responses
- [x] Keyboard support (Enter to send)
- [x] Mobile-friendly (full-width on small screens)
- [x] Accessible (ARIA labels, focus management)

## Technical Implementation

```astro
---
// In page template
import ChatWidget from '../components/ChatWidget.jsx';
---

<ChatWidget client:idle />
```

React component structure:
```jsx
// src/components/ChatWidget.jsx
import { useState, useRef } from 'react';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const query = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) throw new Error('Request failed');

      // Handle streaming response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = content;
          return updated;
        });
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="chat-toggle"
        aria-label="Open chat"
      >
        💬
      </button>
    );
  }

  return (
    <div className="chat-widget">
      <header className="chat-header">
        <span>Ask about my research</span>
        <button onClick={() => setIsOpen(false)} aria-label="Close chat">×</button>
      </header>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            {m.content}
          </div>
        ))}
        {isLoading && <div className="loading">Thinking...</div>}
      </div>
      <form onSubmit={handleSubmit} className="chat-input">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

## Styling Notes

- Fixed position: bottom-right corner
- Elevated background (--bg-elevated)
- Border-radius for friendly appearance
- Shadow for depth
- Responsive: expands on mobile
- Theme-aware colors

## Bundle Considerations

- Use Preact instead of React for smaller bundle
- Or stick with React if already in project
- Minimal dependencies (no UI library needed)
