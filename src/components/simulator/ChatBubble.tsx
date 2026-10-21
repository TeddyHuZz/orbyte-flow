'use client';

import React from 'react';
import { ChatMessage } from './sample-chats';
import { Sparkles, Command } from 'lucide-react';

interface ChatBubbleProps {
  message: ChatMessage;
  onExtract: (text: string) => void;
  isExtracting?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  onExtract,
  isExtracting = false,
}) => {
  const isUser = message.sender === 'user';

  const handleQuickExtract = () => {
    onExtract(message.text);
  };

  return (
    <div className={`flex flex-col mb-3 ${isUser ? 'items-end' : 'items-start'} group relative`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl shadow-sm text-sm transition-all ${
          isUser
            ? 'bg-emerald-900/70 border border-emerald-700/50 text-emerald-50 rounded-tr-none'
            : 'bg-zinc-800/90 border border-zinc-700/60 text-zinc-100 rounded-tl-none'
        }`}
      >
        {/* Message Content */}
        <p className="whitespace-pre-wrap select-text leading-relaxed">
          {message.text}
        </p>

        {/* Timestamp */}
        <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-zinc-400">
          <span>{message.timestamp}</span>
        </div>

        {/* 1-Click Floating Quick Action for Order Messages */}
        {message.isOrderMessage && !isUser && (
          <div className="mt-2.5 pt-2 border-t border-zinc-700/60 flex items-center justify-between gap-2">
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Order detected
            </span>
            <button
              type="button"
              onClick={handleQuickExtract}
              disabled={isExtracting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Extract with Orbyte</span>
              <span className="text-[10px] opacity-75 font-mono ml-0.5">(Alt+O)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
