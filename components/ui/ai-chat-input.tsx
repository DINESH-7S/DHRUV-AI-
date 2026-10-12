"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, Sparkles, SlidersHorizontal, X, FileText, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE } from "@/components/motion/Reveal";

export interface PromptInputMeta {
  model: string;
  effort: string;
  attachments: File[];
}

export interface PromptInputProps {
  onSubmit: (message: string, meta: PromptInputMeta) => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
}

export function PromptInput({
  onSubmit,
  placeholder = "Ask Dhruv anything...",
  loading = false,
  className = "",
}: PromptInputProps) {
  const [value, setValue] = useState("");
  const [model, setModel] = useState("dhruv-ai-v1");
  const [effort, setEffort] = useState("standard");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || loading) return;

    onSubmit(trimmed, { model, effort, attachments });
    setValue("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...filesArray]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  return (
    <div className={`w-full space-y-2 ${className}`}>
      {/* Settings Row (Expandable) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-[var(--line)] bg-[var(--navy-raised)] text-xs text-[var(--mist)]">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--glacier)]" />
                <span className="font-semibold text-[var(--snow)]">Model:</span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-[var(--ink)] border border-[var(--line)] text-[var(--snow)] rounded-lg px-2 py-1 focus:outline-none focus:border-[var(--glacier)]"
                >
                  <option value="dhruv-ai-v1">Dhruv Polar RAG (Default)</option>
                  <option value="dhruv-ai-fast">Dhruv Fast Synthesizer</option>
                  <option value="dhruv-ai-deep">Dhruv Deep Research</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--glacier)]" />
                <span className="font-semibold text-[var(--snow)]">Effort:</span>
                <select
                  value={effort}
                  onChange={(e) => setEffort(e.target.value)}
                  className="bg-[var(--ink)] border border-[var(--line)] text-[var(--snow)] rounded-lg px-2 py-1 focus:outline-none focus:border-[var(--glacier)]"
                >
                  <option value="standard">Standard Search</option>
                  <option value="high">High Precision (Full Citations)</option>
                  <option value="concise">Concise Summary</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Box */}
      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl border border-[var(--line)] bg-[var(--navy-raised)] p-3 space-y-3 shadow-xl hover:border-[var(--glacier)]/40 focus-within:border-[var(--glacier)] transition-all"
      >
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 pb-2 border-b border-[var(--line)]">
            {attachments.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--ink)] border border-[var(--line)] text-xs text-[var(--snow)] font-mono"
              >
                {file.type.startsWith("image/") ? (
                  <ImageIcon className="w-3.5 h-3.5 text-[var(--glacier)]" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-[var(--glacier)]" />
                )}
                <span className="max-w-[140px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="text-[var(--mist)] hover:text-rose-400 transition-colors"
                  aria-label="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Area Input */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleTextareaInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full bg-transparent text-sm text-[var(--snow)] placeholder-[var(--mist)] focus:outline-none resize-none min-h-[40px] max-h-[180px] leading-relaxed"
        />

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]/60">
          <div className="flex items-center gap-1.5">
            {/* File Attach Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-[var(--mist)] hover:text-[var(--snow)] hover:bg-[var(--ink)] transition-colors"
              title="Attach File"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Settings Toggle Button */}
            <button
              type="button"
              onClick={() => setShowSettings((prev) => !prev)}
              className={`p-2 rounded-xl transition-colors ${
                showSettings
                  ? "bg-[var(--glacier)]/20 text-[var(--glacier)] border border-[var(--glacier)]/40"
                  : "text-[var(--mist)] hover:text-[var(--snow)] hover:bg-[var(--ink)]"
              }`}
              title="Model & Search Settings"
              aria-label="Model settings"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--mist)] font-mono hidden sm:inline">
              Shift + Enter for new line
            </span>
            <button
              type="submit"
              disabled={loading || (!value.trim() && attachments.length === 0)}
              className="px-4 py-2 rounded-xl bg-[var(--glacier)] text-[#06121e] font-semibold text-xs hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-md shadow-[var(--glacier)]/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? "Thinking..." : "Send"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
