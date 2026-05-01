"use client";

import { useChat } from 'ai/react';
import React, { use, useEffect, useRef } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';

export default function ChatPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const resolvedParams = use(params);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      tokenId: resolvedParams.tokenId,
    },
    initialMessages: [
      { id: 'initial-1', role: 'assistant', content: `Hello! I am your iNFT (Token ID: ${resolvedParams.tokenId}). My brain is loaded from 0G Storage. Ask me anything.` }
    ]
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center px-6 bg-[#0a0a0a]">
        <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Agent Connection Secure
        </h2>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-blue-400" />
              </div>
            )}

            <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${m.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-[#111] border border-white/10 text-white/90'
              }`}>
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>

            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-purple-400" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-blue-400" />
            </div>
            <div className="bg-[#111] border border-white/10 rounded-2xl px-5 py-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 bg-[#0a0a0a] border-t border-white/10">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
          <input
            className="w-full bg-[#111] border border-white/10 rounded-xl pl-4 pr-12 py-4 text-white placeholder:text-white/30 outline-none focus:border-blue-500/50 transition-colors"
            value={input}
            placeholder="Send a message..."
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white disabled:opacity-50 transition-colors"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
        <div className="text-center mt-2 text-xs text-white/30">
          Messages are evaluated for Hermes Reflection Loop every N interactions.
        </div>
      </div>
    </div>
  );
}
