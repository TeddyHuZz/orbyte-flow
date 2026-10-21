'use client';

import React from 'react';
import { ChatContact } from './sample-chats';
import { Search, ShieldCheck, ShieldAlert } from 'lucide-react';

interface ChatSidebarProps {
  contacts: ChatContact[];
  activeContactId: string;
  onSelectContact: (id: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  contacts,
  activeContactId,
  onSelectContact,
}) => {
  return (
    <div className="w-80 border-r border-zinc-800 bg-zinc-950/70 flex flex-col h-full flex-shrink-0">
      {/* Top Bar */}
      <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-xs font-bold text-white">
            ME
          </div>
          <span className="text-sm font-semibold text-zinc-200">Wholesale Admin</span>
        </div>
        <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-800/50 px-2 py-0.5 rounded-full">
          WhatsApp Web
        </span>
      </div>

      {/* Search Bar */}
      <div className="p-2.5 border-b border-zinc-800/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search or start new chat"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-600"
            readOnly
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
        {contacts.map((contact) => {
          const isActive = contact.id === activeContactId;
          return (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelectContact(contact.id)}
              className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                isActive
                  ? 'bg-zinc-800/90 border-l-4 border-emerald-500'
                  : 'hover:bg-zinc-900/60'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-11 h-11 rounded-full ${contact.avatarBg} flex items-center justify-center font-bold text-white text-sm flex-shrink-0`}
              >
                {contact.avatarText}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-sm font-semibold text-zinc-100 truncate">
                    {contact.name}
                  </h4>
                  <span className="text-[10px] text-zinc-500 flex-shrink-0">
                    {contact.lastTime}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs text-zinc-400 font-mono">
                    {contact.phone}
                  </span>
                  {contact.tinStatus === 'verified' ? (
                    <span className="inline-flex items-center text-[10px] text-emerald-400 gap-0.5" title={`TIN: ${contact.tin}`}>
                      <ShieldCheck className="w-3 h-3" />
                      <span>TIN</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] text-amber-400 gap-0.5" title="No TIN registered">
                      <ShieldAlert className="w-3 h-3" />
                      <span>No TIN</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 truncate">
                  {contact.lastMessage}
                </p>
              </div>

              {/* Unread badge */}
              {contact.unreadCount && contact.unreadCount > 0 ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-black font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-1">
                  {contact.unreadCount}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
