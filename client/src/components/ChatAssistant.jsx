import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const SESSION_KEY_STORAGE = 'kalaconnect.chat.session_key';

const QUICK_PROMPTS = [
  'Show me pottery under ₹1,000',
  'Handwoven silk textiles',
  'Eco-friendly home décor gifts',
  'Brass and metal art',
];

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Namaste! 🙏 I am your KalaConnect craft guide. Looking for authentic Indian handmade crafts? Ask me anything or try one of the prompts below!',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState(() => localStorage.getItem(SESSION_KEY_STORAGE) || '');
  const [aiNotice, setAiNotice] = useState('');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (sessionKey) {
      localStorage.setItem(SESSION_KEY_STORAGE, sessionKey);
    }
  }, [sessionKey]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  async function handleSend(userMsg) {
    const text = (userMsg || input).trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setAiNotice('');

    try {
      const res = await api.post('/chat', {
        message: text,
        session_key: sessionKey || undefined,
      });

      if (res.data.session_key) {
        setSessionKey(res.data.session_key);
      }

      if (res.data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', text: res.data.reply }]);
      }

      if (res.data.ai_error) {
        setAiNotice('Note: Running on rule-based recommendations.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Unable to reach assistant right now.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `I'm having a bit of trouble: ${msg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    if (sessionKey) {
      api.delete(`/chat?session_key=${sessionKey}`).catch(() => {});
    }
    localStorage.removeItem(SESSION_KEY_STORAGE);
    setSessionKey('');
    setMessages([
      {
        role: 'assistant',
        text: 'Namaste! Fresh conversation started. What crafts can I discover for you?',
      },
    ]);
  }

  // Parse text into regular text and clickable product links
  function renderMessageText(text) {
    // Look for markdown links or /products/:id paths
    const linkRegex = /(\/products\/\d+)/g;
    const parts = text.split(linkRegex);

    return parts.map((part, i) => {
      if (part.match(/^\/products\/\d+$/)) {
        return (
          <Link
            key={i}
            to={part}
            onClick={() => setIsOpen(false)}
            className="font-bold underline text-madder hover:text-ink transition-colors"
          >
            {part}
          </Link>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen ? (
          <button
            type="button"
            id="chat-assistant-open"
            onClick={() => setIsOpen(true)}
            aria-label="Open AI Shopping Assistant"
            className="flex items-center gap-2 rounded-full bg-madder px-4 py-3 text-white shadow-xl hover:bg-madder/90 active:scale-95 transition-all duration-200"
          >
            <span className="text-xl">✨</span>
            <span className="text-sm font-semibold tracking-wide">Craft Assistant</span>
          </button>
        ) : null}
      </div>

      {/* Chat Window Drawer / Floating Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[580px] w-[92vw] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-stone/20 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone/15 bg-ink px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-sm font-bold">
                ✨
              </span>
              <div>
                <p className="text-sm font-bold leading-none">KalaCraft AI</p>
                <p className="text-[11px] text-stone-300">Your Indian Handmade Advisor</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                title="Clear chat"
                className="text-stone-300 hover:text-white text-xs px-2 py-1 rounded transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                id="chat-assistant-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close Assistant"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Notice banner if any */}
          {aiNotice && (
            <div className="bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800 border-b border-amber-200">
              {aiNotice}
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-cream/30">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-line shadow-xs ${
                    m.role === 'user'
                      ? 'bg-madder text-white rounded-br-xs'
                      : 'bg-white text-ink border border-stone/15 rounded-bl-xs'
                  }`}
                >
                  {renderMessageText(m.text)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-stone text-xs bg-white px-3 py-2 rounded-xl w-fit border border-stone/15">
                <span className="inline-block h-2 w-2 animate-ping rounded-full bg-madder" />
                <span>Finding authentic crafts...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="border-t border-stone/10 bg-white px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-stone font-semibold mb-1">
                Suggestions
              </p>
              <div className="flex flex-wrap gap-1">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="rounded-full bg-stone/5 hover:bg-stone/10 border border-stone/20 px-2 py-0.5 text-[11px] text-ink transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-stone/15 bg-white p-3"
          >
            <input
              type="text"
              id="chat-assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about pottery, sarees, brass..."
              className="flex-1 rounded-xl border border-stone/25 px-3 py-2 text-xs focus:border-madder focus:outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              id="chat-assistant-submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-madder text-white hover:bg-madder/90 disabled:opacity-40 transition-colors"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
