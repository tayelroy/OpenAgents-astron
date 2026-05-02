"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, AlertCircle, Wallet, ExternalLink } from "lucide-react";
import LiquidGlassButton from "@/components/LiquidGlassButton";
import StarfieldCanvas from "@/sections/StarfieldCanvas";

type Step = "identity" | "ingesting" | "synthesizing" | "uploading" | "minting" | "done" | "error";

type AgentResult = {
  handle: string;
  tokenId: number;
  cid: string;
  txHash: string;
  persona: { tone: string; topics: string[] };
  scrape: { source: string; itemCount: number; ok: boolean };
};

export default function CreateAgentPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [ens, setEns] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [step, setStep] = useState<Step>("identity");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);

  const stepLabels: Record<Step, string> = {
    identity: "Enter identity",
    ingesting: "Scraping X account",
    synthesizing: "Synthesizing persona",
    uploading: "Uploading to 0G Storage",
    minting: "Minting iNFT on Base",
    done: "Agent created",
    error: "Something went wrong",
  };

  const stepProgress: Step[] = ["identity", "ingesting", "synthesizing", "uploading", "minting", "done"];

  const currentStepIndex = stepProgress.indexOf(step);

  // Simulate step advancement during the long pipeline call
  const advanceSteps = async () => {
    const pipeline: Step[] = ["ingesting", "synthesizing", "uploading", "minting"];
    const delays = [400, 2000, 1500, 1000];
    for (let i = 0; i < pipeline.length; i++) {
      await new Promise((r) => setTimeout(r, delays[i]));
      setStep(pipeline[i]);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) return;

    setStep("ingesting");
    setErrorMessage("");
    setResult(null);

    // Start optimistic step animation in parallel with the API call
    const animationPromise = advanceSteps();

    try {
      const res = await fetch("/api/create-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: handle.trim().replace(/^@/, ""),
          ens: ens.trim() || undefined,
          userAddress: walletAddress.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Server error (${res.status})`);
      }

      const data = await res.json();

      // Wait for the animation to finish its current frame before jumping to done
      await animationPromise;

      setResult({
        handle: data.handle,
        tokenId: data.tokenId,
        cid: data.cid,
        txHash: data.txHash,
        persona: { tone: data.persona?.tone, topics: data.persona?.topics ?? [] },
        scrape: data.scrape,
      });
      setStep("done");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Something went wrong";
      console.error("Creation failed:", error);
      setStep("error");
      setErrorMessage(msg);
    }
  };

  // Auto-redirect to chat after brief preview
  useEffect(() => {
    if (step === "done" && result) {
      const timer = setTimeout(() => {
        router.push(`/chat/${result.tokenId}`);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step, result, router]);

  const isProcessing = ["ingesting", "synthesizing", "uploading", "minting"].includes(step);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#02030A", color: "#ffffff", display: "flex", flexDirection: "column" }}>
      <StarfieldCanvas />

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Header */}
        <header style={{
          height: 80,
          display: "flex",
          alignItems: "center",
          padding: "0 5vw",
          gap: 12,
          borderBottom: "1px solid rgba(0, 176, 255, 0.08)",
          background: "rgba(2, 3, 10, 0.75)",
          backdropFilter: "blur(8px)",
        }}>
          <Link
            href="/"
            style={{ padding: 6, color: "rgba(255, 255, 255, 0.4)", transition: "color 0.3s", display: "flex", alignItems: "center" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)"; }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </Link>
          <Link
            href="/"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 400, letterSpacing: "2px", color: "#00E676", textDecoration: "none" }}
          >
            ASTRON
          </Link>
        </header>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            {/* Progress indicator */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                {stepProgress.map((s, i) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 500,
                      transition: "all 0.5s",
                      background: step === s ? "#00B0FF" : currentStepIndex > i ? "rgba(0, 230, 118, 0.2)" : "rgba(255, 255, 255, 0.05)",
                      color: step === s ? "#ffffff" : currentStepIndex > i ? "#00E676" : "rgba(255, 255, 255, 0.3)",
                      border: step === s ? "2px solid rgba(0, 176, 255, 0.3)" : currentStepIndex > i ? "1px solid rgba(0, 230, 118, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
                      boxShadow: step === s ? "0 0 20px rgba(0, 176, 255, 0.3)" : "none",
                    }}>
                      {currentStepIndex > i ? <Check style={{ width: 14, height: 14 }} /> : i + 1}
                    </div>
                    {i < stepProgress.length - 1 && (
                      <div style={{
                        width: "clamp(20px, 3vw, 48px)",
                        height: 1,
                        transition: "all 0.5s",
                        background: currentStepIndex > i ? "rgba(0, 230, 118, 0.4)" : "rgba(255, 255, 255, 0.1)",
                      }} />
                    )}
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "rgba(255, 255, 255, 0.3)", textAlign: "center", marginTop: 8, letterSpacing: "0.5px" }}>
                {stepLabels[step]}
              </p>
            </div>

            {/* Step: Identity Form */}
            {step === "identity" && (
              <div>
                <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 400, color: "#ffffff", marginBottom: 8, letterSpacing: "1px" }}>
                  Create Your Agent
                </h1>
                <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.5)", marginBottom: 32, lineHeight: 1.6 }}>
                  Enter a public X handle. The agent will be synthesized from public tweets and minted as an iNFT on Base.
                </p>

                <form onSubmit={handleCreateAgent} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* X Handle */}
                  <div>
                    <label style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "rgba(255, 255, 255, 0.4)", marginBottom: 6, fontWeight: 500, letterSpacing: "0.5px" }}>
                      X / Twitter handle
                    </label>
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="@0xPolygon"
                      autoFocus
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: "#ffffff", outline: "none", transition: "all 0.3s", boxSizing: "border-box" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,176,255,0.5)"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    />
                  </div>

                  {/* Wallet address */}
                  <div>
                    <label style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "rgba(255, 255, 255, 0.4)", marginBottom: 6, fontWeight: 500, letterSpacing: "0.5px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Wallet style={{ width: 12, height: 12 }} />
                        Wallet address <span style={{ color: "rgba(255,255,255,0.2)" }}>(for minting)</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="0x..."
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: "#ffffff", outline: "none", transition: "all 0.3s", boxSizing: "border-box" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,230,118,0.5)"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    />
                  </div>

                  {/* ENS */}
                  <div>
                    <label style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "rgba(255, 255, 255, 0.4)", marginBottom: 6, fontWeight: 500, letterSpacing: "0.5px" }}>
                      ENS name <span style={{ color: "rgba(255,255,255,0.2)" }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={ens}
                      onChange={(e) => setEns(e.target.value)}
                      placeholder="vitalik.eth"
                      style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: "#ffffff", outline: "none", transition: "all 0.3s", boxSizing: "border-box" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,176,255,0.3)"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                    />
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <LiquidGlassButton type="submit" disabled={!handle.trim()}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                        Create Agent
                        <ArrowUpRight style={{ width: 14, height: 14 }} />
                      </span>
                    </LiquidGlassButton>
                  </div>
                </form>
              </div>
            )}

            {/* Step: Processing */}
            {isProcessing && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{ width: 64, height: 64, margin: "0 auto 24px", borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, rgba(0,230,118,0.18), rgba(0,176,255,0.10))", border: "1px solid rgba(0,176,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(0,176,255,0.18)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#00E676", borderRightColor: "#00B0FF", animation: "astron-spin 0.9s linear infinite" }} />
                </div>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: "#ffffff", marginBottom: 8 }}>
                  {stepLabels[step]}
                </h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
                  {step === "ingesting" && "Scraping public posts from X via Apify..."}
                  {step === "synthesizing" && "Composing a grounded persona from tweet patterns..."}
                  {step === "uploading" && "Pinning the agent brain to 0G Storage nodes..."}
                  {step === "minting" && "Submitting iNFT mint transaction on Base..."}
                </p>
              </div>
            )}

            {/* Step: Done */}
            {step === "done" && result && (
              <div style={{ padding: "24px 0" }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <div style={{ width: 64, height: 64, margin: "0 auto 16px", borderRadius: "50%", background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check style={{ width: 32, height: 32, color: "#00E676" }} />
                  </div>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: "#ffffff", marginBottom: 4 }}>
                    Agent Created
                  </h2>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
                    <span style={{ color: "#ffffff", fontWeight: 500 }}>@{result.handle}</span> is live on Astron.
                  </p>
                </div>

                {/* Metadata cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                  {/* Token ID */}
                  <div style={{ background: "rgba(0,176,255,0.06)", border: "1px solid rgba(0,176,255,0.15)", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.5px" }}>TOKEN ID</span>
                    <span style={{ fontSize: 14, color: "#8fd9ff", fontFamily: "monospace" }}>#{result.tokenId}</span>
                  </div>

                  {/* CID */}
                  <div style={{ background: "rgba(0,230,118,0.05)", border: "1px solid rgba(0,230,118,0.12)", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.5px", flexShrink: 0 }}>0G CID</span>
                    <span style={{ fontSize: 11, color: "#00E676", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.cid}</span>
                  </div>

                  {/* Tx Hash */}
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.5px", flexShrink: 0 }}>TX HASH</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.txHash}</span>
                  </div>

                  {/* Scrape source */}
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.5px" }}>SCRAPE</span>
                    <span style={{ fontSize: 12, color: result.scrape.ok ? "#00E676" : "#ef4444" }}>
                      {result.scrape.source.toUpperCase()} · {result.scrape.itemCount} tweets · {result.scrape.ok ? "✓" : "⚠"}
                    </span>
                  </div>

                  {/* Tone */}
                  {result.persona?.tone && (
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.5px" }}>TONE</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontStyle: "italic" }}>{result.persona.tone}</span>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", marginBottom: 20 }}>
                  Redirecting to chat in a moment…
                </p>

                <Link
                  href={`/chat/${result.tokenId}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "#00B0FF", transition: "color 0.3s", textDecoration: "none", width: "100%", justifyContent: "center" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(0,176,255,0.8)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#00B0FF"; }}
                >
                  Open chat now
                  <ExternalLink style={{ width: 14, height: 14 }} />
                </Link>
              </div>
            )}

            {/* Step: Error */}
            {step === "error" && (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ width: 64, height: 64, margin: "0 auto 24px", borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertCircle style={{ width: 32, height: 32, color: "#ef4444" }} />
                </div>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, color: "#ffffff", marginBottom: 8 }}>
                  Creation Failed
                </h2>
                <p style={{ fontSize: 14, color: "#ef4444", marginBottom: 24 }}>{errorMessage}</p>
                <button
                  onClick={() => setStep("identity")}
                  style={{ fontSize: 14, color: "#00B0FF", background: "none", border: "none", textDecoration: "underline", cursor: "pointer", transition: "color 0.3s" }}
                  onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = "rgba(0,176,255,0.8)"; }}
                  onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = "#00B0FF"; }}
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
