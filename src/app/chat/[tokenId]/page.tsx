"use client";

import { useChat } from "ai/react";
import React, { use, useEffect, useRef, useState, useCallback } from "react";
import { Send, User, Bot, Loader2, ArrowLeft, Wallet, Lock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import StarfieldCanvas from "@/sections/StarfieldCanvas";

type OwnershipStatus = "checking" | "verified" | "denied" | "no-wallet" | "error";

export default function ChatPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const resolvedParams = use(params);
  const { tokenId } = resolvedParams;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------------
  // Wallet + ownership state
  // ------------------------------------------------------------------
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [ownershipStatus, setOwnershipStatus] = useState<OwnershipStatus>("no-wallet");
  const [agentHandle, setAgentHandle] = useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);

  // Check if a wallet is already connected on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) return;

    eth.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts[0]) setWalletAddress(accounts[0]);
    });

    const handleAccountsChanged = (accounts: string[]) => {
      setWalletAddress(accounts[0] ?? null);
    };
    eth.on("accountsChanged", handleAccountsChanged);
    return () => eth.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined") return;
    const eth = (window as any).ethereum;
    if (!eth) {
      alert("No wallet detected. Please install MetaMask or a compatible wallet.");
      return;
    }
    setConnectingWallet(true);
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      if (accounts[0]) setWalletAddress(accounts[0]);
    } catch (err) {
      console.warn("Wallet connection rejected:", err);
    } finally {
      setConnectingWallet(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // Ownership verification
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!walletAddress) {
      setOwnershipStatus("no-wallet");
      return;
    }

    setOwnershipStatus("checking");

    fetch(`/api/ownership/${encodeURIComponent(tokenId)}?wallet=${encodeURIComponent(walletAddress)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { verified: boolean; handle?: string | null }) => {
        setOwnershipStatus(data.verified ? "verified" : "denied");
        if (data.handle) setAgentHandle(data.handle);
      })
      .catch((err) => {
        console.error("[ownership] Verification request failed:", err);
        setOwnershipStatus("error");
      });
  }, [walletAddress, tokenId]);

  // ------------------------------------------------------------------
  // Chat (only active when ownership is verified)
  // ------------------------------------------------------------------
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: { tokenId },
    initialMessages: [
      {
        id: "initial-1",
        role: "assistant",
        content: agentHandle
          ? `Hello. I am the agent for @${agentHandle} (Token #${tokenId}). My brain is loaded from 0G Storage. Ask me anything.`
          : `Hello. I am iNFT #${tokenId}. My brain is loaded from 0G Storage. Ask me anything.`,
      },
    ],
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ------------------------------------------------------------------
  // Gate UI
  // ------------------------------------------------------------------
  const renderGate = () => {
    if (ownershipStatus === "verified") return null;

    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 20,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "rgba(2, 3, 10, 0.92)", backdropFilter: "blur(12px)",
        padding: 32,
      }}>
        {ownershipStatus === "no-wallet" && (
          <>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(0,176,255,0.1)", border: "1px solid rgba(0,176,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Wallet style={{ width: 28, height: 28, color: "#00B0FF" }} />
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Connect Your Wallet</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", maxWidth: 360, marginBottom: 28, lineHeight: 1.6 }}>
              Chat access is gated by iNFT ownership. Connect the wallet that holds token #{tokenId} to continue.
            </p>
            <button
              onClick={connectWallet}
              disabled={connectingWallet}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 12,
                background: "linear-gradient(135deg, rgba(0,176,255,0.2), rgba(0,230,118,0.1))",
                border: "1px solid rgba(0,176,255,0.3)",
                color: "#fff", fontSize: 14, cursor: connectingWallet ? "not-allowed" : "pointer",
                transition: "all 0.3s",
              }}
            >
              <Wallet style={{ width: 16, height: 16 }} />
              {connectingWallet ? "Connecting…" : "Connect Wallet"}
            </button>
          </>
        )}

        {ownershipStatus === "checking" && (
          <>
            <Loader2 style={{ width: 40, height: 40, color: "#00B0FF", marginBottom: 16, animation: "astron-spin 1s linear infinite" }} />
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Verifying ownership on-chain…</p>
          </>
        )}

        {ownershipStatus === "denied" && (
          <>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Lock style={{ width: 28, height: 28, color: "#ef4444" }} />
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Access Denied</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", maxWidth: 360, marginBottom: 8, lineHeight: 1.6 }}>
              The connected wallet does not own iNFT #{tokenId}. Only the verified owner can use this chat.
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 28, fontFamily: "monospace" }}>
              {walletAddress}
            </p>
            <Link
              href="/"
              style={{ fontSize: 14, color: "#00B0FF", textDecoration: "none" }}
            >
              ← Back to Astron
            </Link>
          </>
        )}

        {ownershipStatus === "error" && (
          <>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <AlertTriangle style={{ width: 28, height: 28, color: "#fbbf24" }} />
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: "#fff", marginBottom: 8 }}>Verification Error</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", textAlign: "center", maxWidth: 360, marginBottom: 24, lineHeight: 1.6 }}>
              Could not verify ownership. Check your connection and try again.
            </p>
            <button
              onClick={() => setOwnershipStatus("checking")}
              style={{ fontSize: 14, color: "#00B0FF", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Retry
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", background: "#02030A", color: "#ffffff" }}>
      <StarfieldCanvas />

      {/* Ownership gate overlay */}
      {renderGate()}

      <div style={{
        position: "relative", zIndex: 10, display: "flex", minHeight: "100vh", flexDirection: "column",
        background: "radial-gradient(circle at top, rgba(0, 176, 255, 0.08), transparent 34%), linear-gradient(180deg, rgba(2, 3, 10, 0.18) 0%, rgba(2, 3, 10, 0.72) 100%)",
      }}>
        {/* Header */}
        <header style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(2, 3, 10, 0.75)", backdropFilter: "blur(12px)" }}>
          <div style={{ margin: "0 auto", display: "flex", height: 64, maxWidth: 1152, alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link
                href="/"
                style={{ padding: 6, color: "rgba(255, 255, 255, 0.4)", transition: "color 0.3s", display: "flex", alignItems: "center" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)"; }}
              >
                <ArrowLeft style={{ width: 16, height: 16 }} />
              </Link>
              <div style={{ display: "flex", height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "1px solid rgba(0, 230, 118, 0.25)", background: "rgba(0, 230, 118, 0.1)", boxShadow: "0 0 32px rgba(0, 230, 118, 0.12)" }}>
                <Bot style={{ height: 20, width: 20, color: "#00E676" }} />
              </div>
              {agentHandle && (
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", fontFamily: "'Space Grotesk', sans-serif" }}>
                  @{agentHandle}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 999, border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.05)", padding: "6px 12px", fontSize: 11, color: "rgba(255, 255, 255, 0.45)" }}>
              <span style={{ height: 8, width: 8, borderRadius: "50%", background: ownershipStatus === "verified" ? "#00E676" : "#ef4444", boxShadow: ownershipStatus === "verified" ? "0 0 16px rgba(0, 230, 118, 0.8)" : "none" }} />
              {ownershipStatus === "verified" ? `Token #${tokenId} · Verified` : `Token #${tokenId}`}
            </div>
          </div>
        </header>

        {/* Main */}
        <main style={{ margin: "0 auto", display: "flex", width: "100%", maxWidth: 1152, flex: 1, flexDirection: "column", padding: "20px 16px 24px" }}>
          <section style={{ display: "flex", minHeight: "calc(100vh - 136px)", flex: 1, flexDirection: "column", overflow: "hidden", borderRadius: 28, border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.03)", boxShadow: "0 20px 80px rgba(0, 0, 0, 0.45)", backdropFilter: "blur(24px)" }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", padding: "12px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 999, border: "1px solid rgba(0, 176, 255, 0.2)", background: "rgba(0, 176, 255, 0.1)", padding: "6px 12px", fontSize: 11, color: "#8fd9ff" }}>
                <span style={{ height: 6, width: 6, borderRadius: "50%", background: "#00B0FF", boxShadow: "0 0 12px rgba(0, 176, 255, 0.9)" }} />
                Live
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ display: "flex", gap: 16, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    {m.role === "assistant" && (
                      <div style={{ display: "flex", height: 36, width: 36, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "1px solid rgba(0, 176, 255, 0.2)", background: "rgba(0, 176, 255, 0.1)", boxShadow: "0 0 24px rgba(0, 176, 255, 0.08)" }}>
                        <Bot style={{ height: 20, width: 20, color: "#00B0FF" }} />
                      </div>
                    )}
                    <div style={{ maxWidth: "88%", borderRadius: 24, padding: "12px 16px", fontSize: 14, lineHeight: 1.6, border: m.role === "user" ? "1px solid rgba(0, 230, 118, 0.2)" : "1px solid rgba(255, 255, 255, 0.1)", background: m.role === "user" ? "#00E676" : "rgba(11, 18, 32, 0.8)", color: m.role === "user" ? "#02030A" : "rgba(255, 255, 255, 0.88)", boxShadow: m.role === "user" ? "0 12px 40px rgba(0, 230, 118, 0.14)" : "0 12px 40px rgba(0, 0, 0, 0.22)" }}>
                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{m.content}</div>
                    </div>
                    {m.role === "user" && (
                      <div style={{ display: "flex", height: 36, width: 36, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "1px solid rgba(0, 230, 118, 0.2)", background: "rgba(0, 230, 118, 0.1)", boxShadow: "0 0 24px rgba(0, 230, 118, 0.08)" }}>
                        <User style={{ height: 20, width: 20, color: "#00E676" }} />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ display: "flex", height: 36, width: 36, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "1px solid rgba(0, 176, 255, 0.2)", background: "rgba(0, 176, 255, 0.1)" }}>
                      <Bot style={{ height: 20, width: 20, color: "#00B0FF" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 24, border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(11, 18, 32, 0.8)", padding: "12px 16px", boxShadow: "0 12px 40px rgba(0, 0, 0, 0.22)" }}>
                      <div className="animate-bounce" style={{ height: 8, width: 8, borderRadius: "50%", background: "#00B0FF" }} />
                      <div className="animate-bounce" style={{ height: 8, width: 8, borderRadius: "50%", background: "#00B0FF", animationDelay: "150ms" }} />
                      <div className="animate-bounce" style={{ height: 8, width: 8, borderRadius: "50%", background: "#00B0FF", animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(2, 3, 10, 0.8)", padding: "16px 24px", backdropFilter: "blur(12px)" }}>
              <form onSubmit={handleSubmit} style={{ position: "relative", margin: "0 auto", maxWidth: 896 }}>
                <input
                  style={{ width: "100%", borderRadius: 16, border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.04)", padding: "16px 56px 16px 16px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: "#ffffff", outline: "none", transition: "all 0.3s", boxSizing: "border-box" }}
                  value={input}
                  placeholder={ownershipStatus === "verified" ? "Transmit a message to the agent…" : "Connect wallet to chat…"}
                  onChange={handleInputChange}
                  disabled={isLoading || ownershipStatus !== "verified"}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0, 176, 255, 0.5)"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)"; }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || ownershipStatus !== "verified"}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", borderRadius: 12, border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.05)", padding: 12, color: "#ffffff", transition: "all 0.3s", cursor: (isLoading || !input.trim() || ownershipStatus !== "verified") ? "not-allowed" : "pointer", opacity: (isLoading || !input.trim() || ownershipStatus !== "verified") ? 0.5 : 1 }}
                  onMouseEnter={(e) => { if (!isLoading && input.trim()) { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; }}
                >
                  {isLoading ? <Loader2 style={{ height: 20, width: 20 }} className="animate-spin" /> : <Send style={{ height: 20, width: 20 }} />}
                </button>
              </form>
              <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, letterSpacing: "0.24em", color: "rgba(255, 255, 255, 0.28)" }}>
                Chat logs feed the agent&rsquo;s self-learning update loop.
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
