'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SAMPLE_CONTACTS, ChatContact } from './sample-chats';
import { ChatSidebar } from './ChatSidebar';
import { ChatBubble } from './ChatBubble';
import {
  Sparkles,
  Send,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  ShieldCheck,
  ShieldAlert,
  Command,
} from 'lucide-react';

interface WhatsAppViewProps {
  onExtractText: (text: string, contact?: ChatContact) => void;
  isExtracting?: boolean;
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({
  onExtractText,
  isExtracting = false,
}) => {
  const [contacts, setContacts] = useState<ChatContact[]>(SAMPLE_CONTACTS);
  const [activeContactId, setActiveContactId] = useState<string>('c1');
  const [customInput, setCustomInput] = useState<string>('');
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const activeContact = contacts.find((c) => c.id === activeContactId) || contacts[0];

  // Handle text selection in chat
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 3) {
        setSelectedText(text);
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (rect) {
          setSelectionPosition({
            x: Math.min(window.innerWidth - 220, Math.max(10, rect.left + rect.width / 2 - 100)),
            y: Math.max(10, rect.top - 44),
          });
        }
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Global Alt + O hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'o' || e.key === 'O' || e.code === 'KeyO')) {
        e.preventDefault();
        // Priority 1: Current highlighted text
        if (selectedText) {
          onExtractText(selectedText, activeContact);
        } else {
          // Priority 2: Latest order message in active chat
          const latestOrderMsg = [...activeContact.messages]
            .reverse()
            .find((m) => m.isOrderMessage || m.sender === 'contact');
          if (latestOrderMsg) {
            onExtractText(latestOrderMsg.text, activeContact);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedText, activeContact, onExtractText]);

  // Send custom chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'contact' as const,
      text: customInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOrderMessage: true,
    };

    setContacts((prev) =>
      prev.map((c) =>
        c.id === activeContactId
          ? {
              ...c,
              lastMessage: newMsg.text,
              lastTime: newMsg.timestamp,
              messages: [...c.messages, newMsg],
            }
          : c
      )
    );
    setCustomInput('');
  };

  const handleTriggerQuickScenario = (contactId: string, orderText: string) => {
    setActiveContactId(contactId);
    const targetContact = contacts.find((c) => c.id === contactId);
    onExtractText(orderText, targetContact);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Quick Demo Scenarios Ribbon */}
      <div className="bg-zinc-900/90 border-b border-zinc-800 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs flex-shrink-0">
        <div className="flex items-center gap-2 text-zinc-400 font-medium whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Demo Scenarios:</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              handleTriggerQuickScenario(
                'c1',
                'Boss, order 15 carton Milo, 5 tin susu pekat, 10 bag beras jasmine 10kg. Deliver to PJ site by Friday afternoon ya.'
              )
            }
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors whitespace-nowrap text-[11px]"
          >
            #1 Ah Seng (Manglish / In-Stock)
          </button>
          <button
            type="button"
            onClick={() =>
              handleTriggerQuickScenario(
                'c2',
                'Bagi 12 botol minyak masak seri murni 5kg dan nak tambah 20 papan telur gred A. Tolong hantar esok pagi before lunch crowd.'
              )
            }
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors whitespace-nowrap text-[11px]"
          >
            #2 Maju Curry (Low Stock Alert)
          </button>
          <button
            type="button"
            onClick={() =>
              handleTriggerQuickScenario(
                'c3',
                'Need 8 carton Nescafe Classic 200g and 25 carton Milo 1kg. Need official invoice for claims.'
              )
            }
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors whitespace-nowrap text-[11px]"
          >
            #3 Jaya Hardware (Missing TIN Alert)
          </button>
        </div>
      </div>

      {/* Main WhatsApp Window: Sidebar + Chat Stream */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ChatSidebar
          contacts={contacts}
          activeContactId={activeContactId}
          onSelectContact={setActiveContactId}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-zinc-950/90 relative">
          {/* WhatsApp Header */}
          <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full ${activeContact.avatarBg} flex items-center justify-center font-bold text-white text-sm`}
              >
                {activeContact.avatarText}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {activeContact.name}
                  </h3>
                  {activeContact.tinStatus === 'verified' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                      <ShieldCheck className="w-3 h-3" />
                      TIN: {activeContact.tin}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800/50">
                      <ShieldAlert className="w-3 h-3" />
                      Missing LHDN TIN
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">{activeContact.businessType}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-zinc-400">
              <Phone className="w-4 h-4 cursor-pointer hover:text-zinc-200" />
              <Video className="w-4 h-4 cursor-pointer hover:text-zinc-200" />
              <div className="h-4 w-px bg-zinc-800" />
              <MoreVertical className="w-4 h-4 cursor-pointer hover:text-zinc-200" />
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]"
          >
            <div className="text-center my-3">
              <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-zinc-900/90 text-zinc-400 border border-zinc-800 shadow-sm">
                Today
              </span>
            </div>

            {activeContact.messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                onExtract={(text) => onExtractText(text, activeContact)}
                isExtracting={isExtracting}
              />
            ))}
          </div>

          {/* WhatsApp Typing Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center gap-2 flex-shrink-0"
          >
            <Smile className="w-5 h-5 text-zinc-500 cursor-pointer hover:text-zinc-300" />
            <Paperclip className="w-5 h-5 text-zinc-500 cursor-pointer hover:text-zinc-300" />
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Type customer message or order (e.g. 'Order 10 carton milo, deliver tomorrow')..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Floating Selection Tooltip when text is highlighted */}
      {selectedText && selectionPosition && (
        <div
          style={{ top: `${selectionPosition.y}px`, left: `${selectionPosition.x}px` }}
          className="fixed z-40 animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            type="button"
            onClick={() => onExtractText(selectedText, activeContact)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xl shadow-emerald-950/60 border border-emerald-400/30 transition-transform hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Extract with Orbyte</span>
            <span className="text-[10px] opacity-80 font-mono">(Alt+O)</span>
          </button>
        </div>
      )}
    </div>
  );
};
