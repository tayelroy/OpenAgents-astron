"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, MessageSquare, PlusCircle, Wallet, LogOut, RefreshCw } from "lucide-react";

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
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#00E676]/20 bg-[#00E676]/10 shadow-[0_0_28px_rgba(0,230,118,0.08)]">
                <Bot className="w-5 h-5 text-[#00E676]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Agent Vault</p>
                <h3 className="truncate text-sm font-medium text-white/90" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  My Agents
                </h3>
              </div>
            </div>
            <button
              onClick={() => loadAgents(walletAddress)}
              disabled={loadingAgents}
              title="Refresh agent list"
              className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-white/40 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80"
            >
              <RefreshCw className={`w-4 h-4 ${loadingAgents ? "animate-spin text-[#00E676]" : ""}`} />
            </button>
            <Link href="/create-agent" title="Create new agent" className="rounded-full border border-white/10 bg-white/[0.03] p-2 transition-all hover:border-[#00E676]/30 hover:bg-[#00E676]/10">
              <PlusCircle className="w-4 h-4 text-white/50 transition-colors hover:text-[#00E676]" />
            </Link>
          </div>
        </div>

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
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      @{agent.handle}
                    </p>
                    <span className={`text-[10px] uppercase tracking-[0.24em] ${isActive ? "text-[#00E676]" : "text-white/25"}`}>
                      #{agent.tokenId}
                    </span>
                  </div>
                  <div className="mt-1 h-px w-full bg-white/[0.06]" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Wallet footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
          {walletAddress ? (
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#00E676",
                    boxShadow: "0 0 8px rgba(0,230,118,0.8)",
                    flexShrink: 0,
                  }}
                />
                <span className="text-xs text-white/55 font-mono truncate">{shortAddr}</span>
              </div>
              <button
                onClick={disconnectWallet}
                title="Disconnect wallet"
                className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-white/30 transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white/70"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={walletConnecting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-xs text-white/60 transition-all hover:border-[#00E676]/30 hover:bg-[#00E676]/10 hover:text-[#00E676]"
            >
              <Wallet className="w-4 h-4" />
              {walletConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 relative overflow-hidden">{children}</main>
    </div>
  );
}
