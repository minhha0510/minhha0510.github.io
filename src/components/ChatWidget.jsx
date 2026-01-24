import { useState, useRef, useEffect } from 'react';

/**
 * Chat widget component for asking questions about research.
 * Designed to be loaded with client:idle for lazy hydration.
 */
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const query = input.trim();
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setIsLoading(true);

    try {
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${res.status}`);
      }

      // Handle streaming response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let content = '';

      // Add empty assistant message to update
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content };
          return updated;
        });
      }

      // Handle empty response
      if (!content.trim()) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: "I don't have enough information to answer that question."
          };
          return updated;
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'Something went wrong');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  // Styles using CSS variables for theme compatibility
  const styles = {
    container: {
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 1000,
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    },
    toggleButton: {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      backgroundColor: 'var(--accent)',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transition: 'transform 0.2s, box-shadow 0.2s',
    },
    panel: {
      position: 'absolute',
      bottom: '0',
      right: '0',
      width: '100%',
      maxWidth: '400px',
      maxHeight: '500px',
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 1rem',
      borderBottom: '1px solid var(--border)',
      backgroundColor: 'var(--bg-elevated)',
    },
    headerTitle: {
      fontWeight: '600',
      fontSize: '0.95rem',
      color: 'var(--text)',
      margin: 0,
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '0.25rem',
      color: 'var(--text-muted)',
      fontSize: '1.5rem',
      lineHeight: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'auto',
      minWidth: 'auto',
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      transition: 'background-color 0.15s',
    },
    messagesContainer: {
      flex: 1,
      overflowY: 'auto',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      minHeight: '200px',
      maxHeight: '350px',
    },
    message: {
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      maxWidth: '85%',
      wordWrap: 'break-word',
      lineHeight: 1.5,
      fontSize: '0.9rem',
    },
    userMessage: {
      backgroundColor: 'var(--accent)',
      color: '#fff',
      alignSelf: 'flex-end',
      marginLeft: 'auto',
    },
    assistantMessage: {
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      alignSelf: 'flex-start',
      border: '1px solid var(--border)',
    },
    errorMessage: {
      backgroundColor: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fecaca',
    },
    loadingIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      color: 'var(--text-muted)',
      fontSize: '0.875rem',
      padding: '0.5rem 0',
    },
    loadingDot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: 'var(--accent)',
      animation: 'chatPulse 1s infinite',
    },
    form: {
      display: 'flex',
      gap: '0.5rem',
      padding: '0.75rem 1rem',
      borderTop: '1px solid var(--border)',
      backgroundColor: 'var(--bg-elevated)',
    },
    input: {
      flex: 1,
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      backgroundColor: 'var(--bg)',
      color: 'var(--text)',
      fontSize: '0.9rem',
      outline: 'none',
      minHeight: 'auto',
      transition: 'border-color 0.15s',
    },
    sendButton: {
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      backgroundColor: 'var(--accent)',
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '0.9rem',
      transition: 'opacity 0.15s',
      minHeight: 'auto',
      minWidth: 'auto',
    },
    emptyState: {
      textAlign: 'center',
      color: 'var(--text-muted)',
      padding: '2rem 1rem',
      fontSize: '0.9rem',
    },
    placeholder: {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
    },
  };

  // Chat icon SVG
  const ChatIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );

  // Close icon SVG
  const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  // Send icon SVG
  const SendIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );

  return (
    <>
      {/* Keyframe animation for loading dots */}
      <style>{`
        @keyframes chatPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        .chat-loading-dot:nth-child(2) { animation-delay: 0.15s; }
        .chat-loading-dot:nth-child(3) { animation-delay: 0.3s; }
        @media (max-width: 639px) {
          .chat-widget-panel {
            position: fixed !important;
            bottom: 0 !important;
            right: 0 !important;
            left: 0 !important;
            max-width: 100% !important;
            max-height: 100vh !important;
            height: 100vh !important;
            border-radius: 0 !important;
          }
          .chat-widget-container {
            bottom: 0 !important;
            right: 0 !important;
          }
        }
      `}</style>

      <div style={styles.container} className="chat-widget-container">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            style={styles.toggleButton}
            aria-label="Open chat"
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
          >
            <ChatIcon />
          </button>
        ) : (
          <div
            style={styles.panel}
            className="chat-widget-panel"
            role="dialog"
            aria-label="Chat with AI assistant"
            aria-modal="true"
          >
            <header style={styles.header}>
              <h2 style={styles.headerTitle}>Ask about my research</h2>
              <button
                onClick={() => setIsOpen(false)}
                style={styles.closeButton}
                aria-label="Close chat"
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <CloseIcon />
              </button>
            </header>

            <div style={styles.messagesContainer} role="log" aria-live="polite">
              {messages.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>Ask me anything about my research, papers, or projects!</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.message,
                      ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
                      ...(msg.isError ? styles.errorMessage : {}),
                    }}
                    role={msg.role === 'assistant' ? 'status' : undefined}
                  >
                    {msg.content || (msg.role === 'assistant' && isLoading ? '' : msg.content)}
                  </div>
                ))
              )}
              {isLoading && (
                <div style={styles.loadingIndicator} aria-label="Loading response">
                  <div style={styles.loadingDot} className="chat-loading-dot"></div>
                  <div style={styles.loadingDot} className="chat-loading-dot"></div>
                  <div style={styles.loadingDot} className="chat-loading-dot"></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={isLoading}
                style={{
                  ...styles.input,
                  opacity: isLoading ? 0.6 : 1,
                }}
                aria-label="Type your question"
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  ...styles.sendButton,
                  opacity: isLoading || !input.trim() ? 0.6 : 1,
                  cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                }}
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
