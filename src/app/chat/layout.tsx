"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, MessageSquare, PlusCircle } from 'lucide-react';

const mockOwnedNFTs = [
  { id: '1', handle: 'elonmusk' },
  { id: '2', handle: 'vitalikbuterin' },
];

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0a0a0a] flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-lg">My iNFTs</span>
          </div>
          <Link href="/">
            <PlusCircle className="w-5 h-5 text-white/50 hover:text-white transition-colors" />
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {mockOwnedNFTs.map((nft) => {
            const isActive = pathname === `/chat/${nft.id}`;
            return (
              <Link 
                key={nft.id} 
                href={`/chat/${nft.id}`}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5 text-white/70'}`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium truncate">@{nft.handle}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/10 text-xs text-white/30 text-center">
          Connected: 0x123...4567
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 relative">
        {children}
      </main>
    </div>
  );
}
