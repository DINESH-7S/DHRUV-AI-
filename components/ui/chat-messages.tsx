"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Markdown from "@/components/shared/Markdown";

export interface ChatMessageCitation {
  n: number;
  title: string;
  href: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp?: string;
  citations?: ChatMessageCitation[];
}

export interface ChatMessagesProps {
  messages?: ChatMessage[];
  autoPlay?: boolean;
  autoPlayDelay?: number;
  typingDuration?: number;
  showReplay?: boolean;
  interactive?: boolean;
  className?: string;
  onSendMessage?: (content: string) => void;
  title?: string;
  subtitle?: string;
  placeholder?: string;
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "assistant",
    content:
      "Hello! I'm your Dhruv AI assistant. How can I help you explore India's polar research and expeditions today?",
  },
  {
    id: "2",
    sender: "user",
    content: "What was Dakshin Gangotri?",
  },
  {
    id: "3",
    sender: "assistant",
    content:
      "Dakshin Gangotri was India's first scientific base station established in Antarctica during the 1983-84 expedition. It served as an ice station and was later superseded by Maitri station in 1989.",
  },
  {
    id: "4",
    sender: "user",
    content: "Which active research stations does India operate currently?",
  },
  {
    id: "5",
    sender: "assistant",
    content:
      "India operates Maitri (1989) and Bharati (2012) in Antarctica, Himadri (2008) in Svalbard, Arctic, and Himansh in the high-altitude Himalayas.",
  },
];

function TypingIndicator({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-[var(--line)] bg-[var(--navy-raised)] px-4 py-3 shadow-md",
        className,
      )}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-[var(--glacier)]"
          animate={{ opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}

function MessageBubble({
  message,
}: {
  message: ChatMessage;
  isLast?: boolean;
}) {
  const isUser = message.sender === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("flex items-end gap-2 max-w-[88%]", isUser && "flex-row-reverse")}>
        {!isUser && (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--glacier)]/15 border border-[var(--glacier)]/30 text-[var(--glacier)] mb-1">
            <Sparkles className="size-3.5 text-[var(--glacier)]" />
          </div>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-[var(--glacier)]/20 border border-[var(--glacier)]/40 text-[var(--snow)] shadow-[0_4px_16px_rgba(91,191,230,0.12)]"
              : "rounded-tl-sm border border-[var(--line)] bg-[var(--navy-raised)] text-[var(--snow)] shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="space-y-2">
              <Markdown>{message.content}</Markdown>
              {message.citations && message.citations.length > 0 && (
                <div className="pt-2 mt-2 border-t border-[var(--line)] space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--glacier)]">Sources</p>
                  <div className="flex flex-wrap gap-1.5">
                    {message.citations.map((c) => (
                      <a
                        key={c.n}
                        href={c.href}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--ink)] border border-[var(--line)] text-[10px] text-[var(--glacier)] hover:border-[var(--glacier)]/50 transition-colors"
                      >
                        <span className="font-semibold">[{c.n}]</span>
                        <span className="truncate max-w-[180px]">{c.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ChatMessages({
  messages = DEFAULT_MESSAGES,
  autoPlay = false,
  autoPlayDelay = 1800,
  typingDuration = 1400,
  showReplay = true,
  interactive = true,
  className,
  onSendMessage,
  title = "Dhruv AI Assistant",
  subtitle = "Always here to help",
  placeholder = "Ask Dhruv AI...",
}: ChatMessagesProps) {
  const [visibleCount, setVisibleCount] = useState(
    autoPlay ? 0 : messages.length,
  );
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoPlaying = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  const revealNext = useCallback(
    async (index: number) => {
      if (index >= chatMessages.length) {
        isAutoPlaying.current = false;
        return;
      }

      const message = chatMessages[index];

      if (message.sender === "assistant") {
        setIsTyping(true);
        await new Promise((r) => setTimeout(r, typingDuration));
        setIsTyping(false);
      }

      setVisibleCount(index + 1);
      await new Promise((r) => setTimeout(r, 100));
      scrollToBottom();

      await new Promise((r) =>
        setTimeout(
          r,
          autoPlayDelay -
            (message.sender === "assistant" ? typingDuration : 0) -
            100,
        ),
      );

      if (isAutoPlaying.current) {
        revealNext(index + 1);
      }
    },
    [chatMessages, autoPlayDelay, typingDuration, scrollToBottom],
  );

  const replay = useCallback(() => {
    setVisibleCount(0);
    setChatMessages(messages);
    isAutoPlaying.current = true;
    setTimeout(() => revealNext(0), 100);
  }, [messages, revealNext]);

  useEffect(() => {
    setChatMessages(messages);
    if (autoPlay) {
      setVisibleCount(0);
      isAutoPlaying.current = true;
      const timer = setTimeout(() => revealNext(0), 500);
      return () => {
        clearTimeout(timer);
        isAutoPlaying.current = false;
      };
    } else {
      setVisibleCount(messages.length);
    }
  }, [messages, autoPlay, revealNext]);

  useEffect(() => {
    scrollToBottom();
  }, [visibleCount, isTyping, scrollToBottom]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || !interactive) return;

    const query = inputValue.trim();
    setInputValue("");

    if (onSendMessage) {
      onSendMessage(query);
      return;
    }

    const newMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: query,
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setVisibleCount((prev) => prev + 1);

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const assistantReply: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        content:
          "That's a great question! Explore the Ask Dhruv page or explore archive for full citations and detailed scientific research.",
      };
      setChatMessages((prev) => [...prev, assistantReply]);
      setVisibleCount((prev) => prev + 1);
    }, typingDuration);
  }, [inputValue, interactive, onSendMessage, typingDuration]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 bg-[var(--ink)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--glacier)]/20 border border-[var(--glacier)]/40 text-[var(--glacier)]">
            <Sparkles className="size-4 text-[var(--glacier)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--snow)]">{title}</h3>
            <p className="text-xs text-[var(--mist)]">{subtitle}</p>
          </div>
        </div>
        {showReplay && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={replay}
            aria-label="Replay conversation"
            className="flex items-center gap-1.5 rounded-lg bg-[var(--line)]/20 px-3 py-1.5 text-xs text-[var(--mist)] transition-colors hover:bg-[var(--line)] hover:text-[var(--snow)]"
          >
            <RotateCcw className="size-3.5" />
            Replay
          </motion.button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {chatMessages.slice(0, visibleCount).map((message, i) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={i === visibleCount - 1}
          />
        ))}

        <AnimatePresence>{isTyping && <TypingIndicator />}</AnimatePresence>
      </div>

      {/* Input */}
      <div className="border-t border-[var(--line)] p-3 bg-[var(--ink)]">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--navy-raised)] px-4 py-2 backdrop-blur-sm focus-within:border-[var(--glacier)]">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!interactive}
            placeholder={
              interactive
                ? placeholder
                : "Demo mode - replay to watch again"
            }
            aria-label={
              interactive ? "Type your message" : "Chat input (demo mode)"
            }
            className="flex-1 bg-transparent text-sm text-[var(--snow)] outline-none placeholder:text-[var(--mist)] disabled:cursor-not-allowed"
          />
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleSend}
            disabled={!interactive || !inputValue.trim()}
            aria-label="Send message"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              interactive && inputValue.trim()
                ? "bg-[var(--glacier)] text-[#06121e] hover:opacity-90 font-bold"
                : "bg-[var(--line)]/30 text-[var(--mist)]/40",
            )}
          >
            <Send className="size-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default ChatMessages;
