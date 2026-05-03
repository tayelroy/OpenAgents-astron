/**
 * Durable file-based agent records.
 *
 * This module owns agent identity, CID/token mappings, and ownership lookups.
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const AGENTS_DIR = path.join(DATA_DIR, 'agents');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(AGENTS_DIR)) fs.mkdirSync(AGENTS_DIR, { recursive: true });
}

export type PersonaPayload = {
  /** Detailed system prompt. */
  persona: string;
  /** Brief tone description. */
  tone: string;
  /** Array of primary topics. */
  topics: string[];
  /**
   * Structured style profile extracted from the author's tweets.
   * Injected into every chat / generation system prompt to ensure the agent
   * reliably mimics the author's voice, hooks, vocabulary, and punctuation.
   */
  styleProfile?: import('./style-profile').StyleProfile;
};

export type AgentRecord = {
  /** Lowercase Twitter/X handle, no @. Primary key. */
  handle: string;
  /** On-chain token ID returned by the mint call. */
  tokenId: number;
  /** 0G CID for the current brain. Updated when the brain is refreshed. */
  cid: string;
  /** Wallet address of the iNFT owner. */
  ownerAddress: string;
  /** Mint transaction hash. */
  txHash: string;
  /** Structured persona produced by the synthesis step. */
  persona: PersonaPayload;
  /** ENS name or address hint (optional). */
  ens?: string;
  /** ISO timestamp of creation. */
  createdAt: string;
  /** ISO timestamp of last brain refresh. */
  updatedAt: string;
  /** Scrape verification metadata. */
  scrapeVerification: object;
};

function agentPath(handle: string) {
  const safe = handle.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return path.join(AGENTS_DIR, `${safe}.json`);
}

export function saveAgent(record: AgentRecord): void {
  ensureDirs();
  fs.writeFileSync(agentPath(record.handle), JSON.stringify(record, null, 2), 'utf8');
}

export function getAgent(handle: string): AgentRecord | null {
  ensureDirs();
  const filePath = agentPath(handle);
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as AgentRecord;
  } catch {
    return null;
  }
}

export function getAgentByTokenId(tokenId: number): AgentRecord | null {
  ensureDirs();
  const files = fs.readdirSync(AGENTS_DIR).filter((file) => file.endsWith('.json'));

  for (const file of files) {
    try {
      const record = JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8')) as AgentRecord;
      if (record.tokenId === tokenId) return record;
    } catch {
      // skip corrupt file
    }
  }

  return null;
}

export function getAgentsByOwner(ownerAddress: string): AgentRecord[] {
  ensureDirs();
  const lower = ownerAddress.toLowerCase();
  const files = fs.readdirSync(AGENTS_DIR).filter((file) => file.endsWith('.json'));
  const results: AgentRecord[] = [];

  for (const file of files) {
    try {
      const record = JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8')) as AgentRecord;
      if (record.ownerAddress.toLowerCase() === lower) results.push(record);
    } catch {
      // skip corrupt file
    }
  }

  return results;
}

export function getAllAgents(): AgentRecord[] {
  ensureDirs();
  const files = fs.readdirSync(AGENTS_DIR).filter((file) => file.endsWith('.json'));
  const results: AgentRecord[] = [];

  for (const file of files) {
    try {
      results.push(JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8')) as AgentRecord);
    } catch {
      // skip corrupt file
    }
  }

  return results;
}