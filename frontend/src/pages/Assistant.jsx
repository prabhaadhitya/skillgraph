import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Send, Trash2, Bot, User, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { sendChatMessage, getChatHistory, clearChatHistory } from '../services/aiService.js';

let messageSeq = 0;
function createTempId(prefix) {
  messageSeq += 1;
  return `${prefix}-${messageSeq}`;
}

const SUGGESTED_PROMPTS = [
  'Why should I learn SQL?',
  'I only have 2 months - what should I focus on?',
  'What if I switch to Data Scientist?',
];

export function Assistant() {
  const [searchParams] = useSearchParams();
  const rawQ = searchParams.get('q') || '';

  const [messages, setMessages] = useState([]);
  const [prevQ, setPrevQ] = useState(rawQ);
  const [inputMessage, setInputMessage] = useState(rawQ);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync state during render when URL ?q= param changes
  if (rawQ !== prevQ) {
    setPrevQ(rawQ);
    if (rawQ.trim()) {
      setInputMessage(rawQ.trim());
    }
  }

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input when URL ?q= is provided
  useEffect(() => {
    if (rawQ.trim()) {
      inputRef.current?.focus();
    }
  }, [rawQ]);

  // Load chat history on mount
  useEffect(() => {
    let active = true;
    getChatHistory(30)
      .then((res) => {
        if (active) {
          setMessages(res?.items || []);
          setInitialLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setInitialLoading(false);
          if (err?.status === 429) {
            setError('Too many requests. Slow down a little and try again in a minute.');
          } else if (err?.status === 502) {
            setError('Upstream AI service error (502). Please try again shortly.');
          }
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    if (text.length > 500) {
      setError('Message exceeds 500 characters.');
      return;
    }

    setError(null);
    setInputMessage('');

    // Optimistically append user message
    const tempUserMsg = {
      id: createTempId('temp-user'),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await sendChatMessage(text);
      const assistantMsg = {
        id: createTempId('assistant'),
        role: 'assistant',
        content: res.reply,
        intent: res.intent,
        grounding: res.grounding,
        meta: res.meta || {
          degraded: res.degraded,
          keySource: res.keySource,
          model: res.model,
        },
        degraded: Boolean(res.degraded),
        keySource: res.keySource || 'server',
        model: res.model,
        notice: res.notice,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if (err?.status === 429) {
        setError('Too many requests. Slow down a little and try again in a minute.');
      } else if (err?.status === 502) {
        setError('Upstream AI service error (502). Please check your key in Settings or try again shortly.');
      } else {
        setError(err?.message || 'Failed to send message.');
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear your chat history?')) return;
    try {
      await clearChatHistory();
      setMessages([]);
    } catch (err) {
      if (err?.status === 429) {
        setError('Too many requests. Slow down a little and try again in a minute.');
      } else {
        setError(err?.message || 'Failed to clear chat.');
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputMessage.trim().length <= 500) {
        handleSend();
      }
    }
  };

  const isOverLimit = inputMessage.length > 500;
  const isSendDisabled = !inputMessage.trim() || isOverLimit || loading;

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-5rem)] flex flex-col p-4 md:p-6 text-left font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-ink flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl md:text-2xl text-ink uppercase tracking-wide">
              AI ASSISTANT
            </h1>
            <Badge variant="brand">GROUNDED</Badge>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Answers strictly derived from your skills graph and learning path.
          </p>
        </div>

        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            CLEAR CHAT
          </Button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {initialLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-3/4" />
            <Skeleton className="h-20 w-1/2 ml-auto" />
            <Skeleton className="h-20 w-3/4" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="p-4 bg-brand-soft border-2 border-ink text-brand shadow-sm">
              <Bot className="w-10 h-10" />
            </div>
            <div className="max-w-md space-y-1">
              <h2 className="font-display text-lg text-ink uppercase tracking-wide">
                HOW CAN I HELP YOU TODAY?
              </h2>
              <p className="text-xs text-muted">
                Ask about prerequisite skills, your estimated career alignment, time-boxed learning
                plans, or explore alternative careers.
              </p>
            </div>

            {/* Suggested prompt chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="px-3 py-2 bg-surface hover:bg-paper border-2 border-ink text-xs font-bold text-ink cursor-pointer shadow-sm hover:shadow-md transition-all active:translate-x-0.5 active:translate-y-0.5 text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isDegraded = Boolean(msg.degraded ?? msg.meta?.degraded);
            const keySource = msg.keySource || msg.meta?.keySource;
            const groundingSkills = msg.grounding?.skills || [];
            const groundingCareers = msg.grounding?.careers || [];
            const groundingItems = Array.isArray(msg.grounding)
              ? msg.grounding
              : [...groundingSkills, ...groundingCareers];

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-none border-2 border-ink flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    isUser ? 'bg-ink text-white' : 'bg-brand text-white'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className="space-y-1.5 text-left">
                  <div
                    className={`p-4 border-2 border-ink shadow-sm text-sm leading-relaxed ${
                      isUser
                        ? 'bg-ink text-white font-medium'
                        : 'bg-surface text-ink'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Assistant Meta & Badges */}
                  {!isUser && (
                    <div className="space-y-1.5 px-1">
                      {/* Degraded Notice */}
                      {isDegraded && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-state-major">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Quick answer (AI is unavailable right now)</span>
                        </div>
                      )}

                      {/* Quota Notice with Link to Settings */}
                      {msg.notice && (
                        <div className="p-2 bg-paper border border-ink text-xs text-ink flex items-center justify-between gap-2">
                          <span>{msg.notice}</span>
                          <Link
                            to="/app/settings"
                            className="font-bold text-brand hover:underline flex-shrink-0"
                          >
                            Settings →
                          </Link>
                        </div>
                      )}

                      {/* Grounding and Key Tags */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-muted">
                        {groundingItems.length > 0 && (
                          <span data-testid="grounding-info">
                            grounded in:{' '}
                            <strong className="text-ink">
                              {groundingItems.join(', ')}
                            </strong>
                          </span>
                        )}

                        <Badge variant={keySource === 'user' ? 'mastered' : 'neutral'}>
                          {keySource === 'user' ? 'Your key' : 'Shared key'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center">
            <div className="w-8 h-8 rounded-none border-2 border-ink bg-brand text-white flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-surface border-2 border-ink shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-brand animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-brand animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-2 p-3 bg-state-missing/20 border-2 border-state-missing text-xs font-bold text-ink flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-ink font-bold hover:underline cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Input Form */}
      <div className="pt-2 flex-shrink-0">
        {/* Suggested chips above input when conversation has messages */}
        {messages.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase text-muted">Suggested:</span>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="px-2.5 py-1 bg-surface hover:bg-paper border border-ink text-xs font-bold text-ink cursor-pointer shadow-xs hover:shadow-sm transition-all disabled:opacity-50 text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative"
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your skills, learning path, or target career... (Press Enter to send)"
            disabled={loading}
            className="w-full p-3.5 pr-28 bg-surface border-2 border-ink font-sans text-sm text-ink placeholder:text-muted focus:outline-none focus:border-brand resize-none shadow-sm"
          />

          <div className="absolute right-3 bottom-3.5 flex items-center gap-2">
            <span
              className={`text-[11px] font-mono ${
                isOverLimit
                  ? 'text-state-missing font-bold'
                  : inputMessage.length >= 480
                    ? 'text-state-partial font-bold'
                    : 'text-muted'
              }`}
            >
              {inputMessage.length}/500
            </span>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSendDisabled}
              icon={<Send className="w-3.5 h-3.5" />}
            >
              SEND
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Assistant;
