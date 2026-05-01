// ============================================================
// Site Configuration
// ============================================================

export interface SiteConfig {
  language: string;
  brandName: string;
}

export const siteConfig: SiteConfig = {
  language: "en",
  brandName: "ASTRON",
};

// ============================================================
// Navigation
// ============================================================

export interface NavLink {
  label: string;
  href: string;
}

export interface NavigationConfig {
  links: NavLink[];
  ctaText: string;
}

export const navigationConfig: NavigationConfig = {
  links: [
    { label: "How It Works", href: "#how-it-works" },
    { label: "Your Agents", href: "#agents" },
    { label: "Docs", href: "#" },
  ],
  ctaText: "Launch App",
};

// ============================================================
// Hero
// ============================================================

export interface HeroConfig {
  title: string;
  subtitleLine1: string;
  subtitleLine2: string;
  ctaText: string;
}

export const heroConfig: HeroConfig = {
  title: "A S T R O N",
  subtitleLine1: "Clone any X researcher into an autonomous on-chain agent.",
  subtitleLine2: "Enter a handle. Pay once in USDC. Own the brain forever.",
  ctaText: "Create Your Agent →",
};

// ============================================================
// How It Works (3-step flow)
// ============================================================

export interface StepItem {
  number: string;
  title: string;
  description: string;
  tag: string;
}

export interface HowItWorksConfig {
  sectionLabel: string;
  title: string;
  steps: StepItem[];
}

export const howItWorksConfig: HowItWorksConfig = {
  sectionLabel: "How It Works",
  title: "From Twitter handle to ownable AI agent in under 60 seconds.",
  steps: [
    {
      number: "01",
      title: "Enter a handle & pay",
      description:
        "Type any X (Twitter) handle. Pay a one-time USDC fee directly from your wallet via Coinbase x402 — no escrow, no approvals, no gas.",
      tag: "x402 · Base · USDC",
    },
    {
      number: "02",
      title: "Astron synthesizes the brain",
      description:
        "Our pipeline scrapes the latest 100 posts, extracts the researcher's tone, cadence, and domain focus, then compresses it into a Persona System Prompt pinned to 0G Storage.",
      tag: "GPT-4o · 0G Storage · CID",
    },
    {
      number: "03",
      title: "Your iNFT lands in your wallet",
      description:
        "The brain is minted as an Intelligent NFT on Base — gaslessly airdropped to you. Chat with your agent immediately. It self-learns from every conversation.",
      tag: "ERC-721 iNFT · Base · Hermes Loop",
    },
  ],
};

// ============================================================
// Capabilities (Pipeline detail — sub-pages)
// ============================================================

export interface CapabilityItem {
  title: string;
  slug: string;
  description: string;
  image: string;
}

export interface CapabilitiesConfig {
  sectionLabel: string;
  items: CapabilityItem[];
}

export const capabilitiesConfig: CapabilitiesConfig = {
  sectionLabel: "Under the Hood",
  items: [
    {
      title: "x402 Payment",
      slug: "uplink-settlement",
      description:
        "HTTP-native USDC settlement on Base. No escrow, no approvals — one click and the pipeline starts.",
      image: "images/capability-1.jpg",
    },
    {
      title: "Persona Synthesis",
      slug: "signal-ingestion",
      description:
        "100 posts scraped, tone and domain fingerprinted, compressed into a precision Persona System Prompt.",
      image: "images/capability-2.jpg",
    },
    {
      title: "0G Brain Storage",
      slug: "brain-synthesis",
      description:
        "The Brain is pinned to 0G decentralized storage. Immutable, globally addressable, forever retrievable via CID.",
      image: "images/capability-3.jpg",
    },
    {
      title: "iNFT Airdrop",
      slug: "immutable-archiving",
      description:
        "Your agent minted as an ERC-721 on Base and airdropped gaslessly. Transferable, ownable, self-learning.",
      image: "images/capability-4.jpg",
    },
  ],
};

// ============================================================
// Capability Detail (sub-pages)
// ============================================================

export interface CapabilityDetailData {
  title: string;
  subtitle: string;
  paragraphs: string[];
}

export interface CapabilityDetailConfig {
  sectionLabel: string;
  backLinkText: string;
  prevLabel: string;
  nextLabel: string;
  notFoundText: string;
  capabilities: Record<string, CapabilityDetailData>;
}

export const capabilityDetailConfig: CapabilityDetailConfig = {
  sectionLabel: "Pipeline Stage",
  backLinkText: "← Back",
  prevLabel: "Previous",
  nextLabel: "Next",
  notFoundText: "Pipeline stage not found.",
  capabilities: {
    "uplink-settlement": {
      title: "x402 Payment",
      subtitle: "Frictionless USDC settlement on Base.",
      paragraphs: [
        "The Astron pipeline begins with a single payment action. Using the Coinbase x402 protocol, users submit USDC on Base to initiate the synthesis process. This HTTP-native payment flow eliminates the need for complex escrow contracts, multi-step approvals, or manual transaction coordination.",
        "x402 transforms any HTTP endpoint into a paid API, enabling the agent creation process to feel as simple as clicking a button. The payment is verified in real-time, and the synthesis pipeline begins immediately upon settlement confirmation — typically within seconds.",
      ],
    },
    "signal-ingestion": {
      title: "Persona Synthesis",
      subtitle: "Deep analysis of writing patterns and research fingerprints.",
      paragraphs: [
        "Signal Ingestion is where Astron's intelligence begins. The system streams the latest 100 research posts from the target handle, analyzing every sentence for structural patterns, rhetorical devices, citation styles, and domain-specific terminology.",
        "Natural language processing models deconstruct the writing into core components: sentence length variation, paragraph architecture, transition patterns, technical depth calibration, and argumentative flow. Each post contributes to a multidimensional stylistic fingerprint.",
      ],
    },
    "brain-synthesis": {
      title: "0G Brain Storage",
      subtitle: "Permanent, verifiable, decentralized storage.",
      paragraphs: [
        "The Brain synthesized from the researcher's writing is pinned to 0G Storage — a decentralized network that ensures the agent's logic is globally addressable, permanently available, and cryptographically versioned.",
        "Each Brain receives a unique Content Identifier (CID) hash. The CID becomes the agent's permanent address on the decentralized web — anyone with the CID can retrieve the Brain, verify its integrity, and interact with the agent it defines.",
      ],
    },
    "immutable-archiving": {
      title: "iNFT Airdrop",
      subtitle: "Gasless deployment — your agent in your wallet.",
      paragraphs: [
        "The Brain CID is embedded into an Intelligent NFT (iNFT) on Base, which is then airdropped directly to the creator's wallet. This iNFT is not just a collectible — it is a self-learning agent that can evolve its own on-chain memory over time.",
        "The final step completes in seconds. From payment to ownable, chatting agent — all without the user paying any gas fees.",
      ],
    },
  },
};

// ============================================================
// Live Agents showcase
// ============================================================

export interface AgentCard {
  handle: string;
  name: string;
  discipline: string;
  tokenId: string;
  image: string;
}

export interface AgentsConfig {
  sectionLabel: string;
  title: string;
  subtitle: string;
  agents: AgentCard[];
}

export const agentsConfig: AgentsConfig = {
  sectionLabel: "Live on Base",
  title: "Agents deployed on-chain.",
  subtitle: "Each card is a real iNFT. Click to open the chat interface.",
  agents: [
    {
      handle: "@DeepResearch",
      name: "Deep Research",
      discipline: "Macro Analysis",
      tokenId: "1",
      image: "images/research-1.jpg",
    },
    {
      handle: "@CryptoSignals",
      name: "Crypto Signals",
      discipline: "On-chain Analytics",
      tokenId: "2",
      image: "images/research-2.jpg",
    },
    {
      handle: "@ProtocolDive",
      name: "Protocol Dive",
      discipline: "DeFi Research",
      tokenId: "3",
      image: "images/research-3.jpg",
    },
    {
      handle: "@BaseBuilder",
      name: "Base Builder",
      discipline: "L2 Engineering",
      tokenId: "4",
      image: "images/research-4.jpg",
    },
  ],
};

// ============================================================
// Footer
// ============================================================

export interface FooterBottomLink {
  label: string;
  href: string;
}

export interface FooterConfig {
  heading: string;
  tagline: string;
  copyright: string;
  bottomLinks: FooterBottomLink[];
}

export const footerConfig: FooterConfig = {
  heading: "Own the brain. Own the agent.",
  tagline: "Built on Base · Stored on 0G · Paid via x402",
  copyright: "© 2026 Astron. All rights reserved.",
  bottomLinks: [
    { label: "Docs", href: "#" },
    { label: "GitHub", href: "#" },
    { label: "Status", href: "#" },
  ],
};
