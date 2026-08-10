/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Lock, 
  ShieldCheck, 
  KeyRound, 
  CheckCheck, 
  User, 
  Search,
  Sparkles
} from 'lucide-react';
import { UserAccount, DirectConversation, DirectMessage } from '../types';
import { INITIAL_CONVERSATIONS } from '../data/mockData';

interface MessagesViewProps {
  currentUser: UserAccount;
  onViewUserProfile?: (username: string) => void;
}

export default function MessagesView({ currentUser, onViewUserProfile }: MessagesViewProps) {
  const [conversations, setConversations] = useState<DirectConversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>(INITIAL_CONVERSATIONS[0].id);
  const [messageText, setMessageText] = useState('');

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const newMsg: DirectMessage = {
      id: `msg_${Date.now()}`,
      senderUsername: currentUser.username,
      content: messageText.trim(),
      timestamp: 'Just now',
      isRead: true,
      encryptedKey: `0x${Math.random().toString(16).substring(2, 10)}...`
    };

    setConversations(prev => 
      prev.map(c => {
        if (c.id === activeConvId) {
          return {
            ...c,
            lastMessage: newMsg.content,
            lastTimestamp: 'Just now',
            messages: [...c.messages, newMsg]
          };
        }
        return c;
      })
    );

    setMessageText('');
  };

  return (
    <div className="h-[calc(100vh-120px)] grid grid-cols-1 md:grid-cols-3 gap-4 text-left py-2" id="messages-view-container">
      
      {/* CONVERSATIONS LIST SIDE PANEL */}
      <div className="bg-[#0d091f]/80 border border-violet-500/20 rounded-3xl p-4 backdrop-blur-2xl flex flex-col justify-between overflow-hidden shadow-xl">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-400" />
              Direct Relays
            </h3>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-500/30">
              <Lock className="w-2.5 h-2.5" /> E2E
            </span>
          </div>

          {/* Conversations */}
          <div className="space-y-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    isActive 
                      ? 'bg-gradient-to-r from-violet-600/30 to-indigo-600/20 border-violet-400/40 text-white shadow-md' 
                      : 'bg-black/20 hover:bg-black/40 border-white/5 text-white/70'
                  }`}
                >
                  <img src={conv.peerAvatar} alt={conv.peerUsername} className="w-10 h-10 rounded-full object-cover border border-violet-400/30" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white truncate">@{conv.peerUsername}</h4>
                      <span className="text-[9px] text-white/40">{conv.lastTimestamp}</span>
                    </div>
                    <p className="text-[11px] text-white/60 truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Security Footer */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-[10px] text-white/40 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <span>Messages are encrypted with ephemeral Diffie-Hellman keys. Zero server logs.</span>
        </div>
      </div>

      {/* CHAT WINDOW MAIN PANEL */}
      <div className="md:col-span-2 bg-[#0d091f]/80 border border-violet-500/20 rounded-3xl p-4 sm:p-5 backdrop-blur-2xl flex flex-col justify-between overflow-hidden shadow-xl">
        
        {/* Chat Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => onViewUserProfile?.(activeConv.peerUsername)}
            className="flex items-center gap-3 text-left hover:opacity-85 transition-opacity cursor-pointer group/peer"
          >
            <img src={activeConv.peerAvatar} alt={activeConv.peerUsername} className="w-9 h-9 rounded-full object-cover border border-violet-400/40 group-hover/peer:border-violet-300" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 group-hover/peer:text-violet-300 group-hover/peer:underline">
                @{activeConv.peerUsername}
                <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              </h3>
              <span className="text-[9.5px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Onion-Routed Tunnel Active
              </span>
            </div>
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto space-y-3 py-4 custom-scrollbar pr-1">
          {activeConv.messages.map((m) => {
            const isSelf = m.senderUsername === currentUser.username;
            return (
              <div 
                key={m.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[80%] p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  isSelf 
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-400/30 shadow-md rounded-tr-none' 
                    : 'bg-black/40 text-white/90 border-white/10 rounded-tl-none'
                }`}>
                  <p>{m.content}</p>
                  <div className="flex items-center justify-end gap-1.5 mt-1 text-[8.5px] text-white/50 font-mono">
                    <span>{m.timestamp}</span>
                    <CheckCheck className="w-3 h-3 text-cyan-300" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-white/10">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={`Encrypted reply to @${activeConv.peerUsername}...`}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={!messageText.trim()}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>

      </div>

    </div>
  );
}
