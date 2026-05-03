"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AgentSummary = {
  handle: string;
  tokenId: number;
  cid: string;
  ownerAddress: string;
  persona: { tone: string; topics: string[] };
  createdAt: string;
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);

  // ------------------------------------------------------------------
  // Wallet connection (EIP-1193)
  // ------------------------------------------------------------------
  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) {
      alert("No wallet detected. Please install MetaMask or a compatible wallet.");
      return;
    }
    setWalletConnecting(true);
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      if (accounts[0]) setWalletAddress(accounts[0]);
    } catch (err) {
      console.warn("Wallet connection rejected:", err);
    } finally {
      setWalletConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setAgents([]);
  }, []);

  // On mount: check if a wallet is already connected
  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return;

    eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts[0]) setWalletAddress(accounts[0]);
    });

    const handleAccountsChanged = (accounts: string[]) => {
      setWalletAddress(accounts[0] ?? null);
      if (!accounts[0]) setAgents([]);
    };
    eth.on("accountsChanged", handleAccountsChanged);
    return () => eth.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  // ------------------------------------------------------------------
  // Load agents from server whenever wallet changes
  // ------------------------------------------------------------------
  const loadAgents = useCallback(async (owner: string | null) => {
    setLoadingAgents(true);
    try {
      const url = owner
        ? `/api/agents?owner=${encodeURIComponent(owner)}`
        : "/api/agents";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch {
      setAgents([]);
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    loadAgents(walletAddress);
  }, [walletAddress, loadAgents]);

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  return (
    <div
      className="flex h-screen w-screen overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(circle at top, rgba(0,176,255,0.10), transparent 35%), linear-gradient(180deg, rgba(2,3,10,1) 0%, rgba(2,3,10,0.98) 100%)",
      }}
    >
      {/* Sidebar */}
      <aside className="w-72 flex flex-col flex-shrink-0 border-r border-white/10 bg-[rgba(2,3,10,0.78)] backdrop-blur-2xl shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)]">
        {/* Agent list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.length === 0 && !loadingAgents && (
            <div className="mx-1 mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-center shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/25">No agents found</p>
              <p className="mt-2 text-xs leading-relaxed text-white/35">
              {walletAddress
                ? "No agents found for this wallet."
                : "Connect a wallet to see your agents, or browse all."}
              </p>
            </div>
          )}
          {loadingAgents && (
            <div className="mx-1 mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-center shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#00E676]" />
              <p className="text-xs text-white/35">Loading agents…</p>
            </div>
          )}
          {agents.map((agent) => {
            const id = String(agent.tokenId);
            const isActive = pathname === `/chat/${id}`;
            return (
              <Link
                key={id}
                href={`/chat/${id}`}
                className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-300 ${
                  isActive
                    ? "border-[#00E676]/25 bg-[linear-gradient(180deg,rgba(0,230,118,0.14),rgba(255,255,255,0.03))] text-white shadow-[0_12px_40px_rgba(0,230,118,0.08)]"
                    : "border-white/10 bg-white/[0.02] text-white/72 hover:border-white/15 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
                  isActive
                    ? "border-[#00E676]/25 bg-[#00E676]/10 text-[#00E676]"
                    : "border-white/10 bg-white/[0.03] text-white/55 group-hover:border-white/15 group-hover:bg-white/[0.05]"
                }`}>
                </div>
                <div className="min-w-0 flex-1">

                  <div className="mt-1 h-px w-full bg-white/[0.06]" />
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 relative overflow-hidden">{children}</main>
    </div>
  );
}
