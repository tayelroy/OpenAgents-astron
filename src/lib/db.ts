/**
 * Durable file-based agent store.
 *
 * Replaces the in-memory KB Map with JSON files written to .data/ so records
 * survive server restarts. This is the single source of truth for agent
 * identity, CID/token mappings, and chat logs until a real DB is wired.
 *
 * Directory layout:
 *   .data/agents/<handle>.json   – one file per agent
 *   .data/chatlogs/<tokenId>/<ts>.jsonl – one file per session
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const AGENTS_DIR = path.join(DATA_DIR, 'agents');
const CHATLOGS_DIR = path.join(DATA_DIR, 'chatlogs');

function ensureDirs() {
  for (const dir of [DATA_DIR, AGENTS_DIR, CHATLOGS_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Agent record schema
// ---------------------------------------------------------------------------

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

export type PersonaPayload = {
  /** Detailed system prompt. */
  persona: string;
  /** Brief tone description. */
  tone: string;
  /** Array of primary topics. */
  topics: string[];
};

// ---------------------------------------------------------------------------
// Agent CRUD
// ---------------------------------------------------------------------------

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
  const p = agentPath(handle);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as AgentRecord;
  } catch {
    return null;
  }
}

export function getAgentByTokenId(tokenId: number): AgentRecord | null {
  ensureDirs();
  const files = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    try {
      const rec = JSON.parse(
        fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8')
      ) as AgentRecord;
      if (rec.tokenId === tokenId) return rec;
    } catch {
      // skip corrupt file
    }
  }
  return null;
}

/** Return all agent records owned by a wallet address (case-insensitive). */
export function getAgentsByOwner(ownerAddress: string): AgentRecord[] {
  ensureDirs();
  const lower = ownerAddress.toLowerCase();
  const files = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.json'));
  const results: AgentRecord[] = [];
  for (const file of files) {
    try {
      const rec = JSON.parse(
        fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8')
      ) as AgentRecord;
      if (rec.ownerAddress.toLowerCase() === lower) results.push(rec);
    } catch {
      // skip corrupt file
    }
  }
  return results;
}

/** Return all agent records. */
export function getAllAgents(): AgentRecord[] {
  ensureDirs();
  const files = fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.json'));
  const results: AgentRecord[] = [];
  for (const file of files) {
    try {
      results.push(
        JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8')) as AgentRecord
      );
    } catch {
      // skip corrupt file
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Chat log persistence
// ---------------------------------------------------------------------------

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export function appendChatLog(tokenId: string | number, messages: ChatMessage[]): void {
  ensureDirs();
  const dir = path.join(CHATLOGS_DIR, String(tokenId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, `${Date.now()}.jsonl`);
  const lines = messages.map((m) => JSON.stringify(m)).join('\n');
  fs.writeFileSync(file, lines, 'utf8');
}

export function getChatLogs(tokenId: string | number): ChatMessage[] {
  ensureDirs();
  const dir = path.join(CHATLOGS_DIR, String(tokenId));
  if (!fs.existsSync(dir)) return [];

  const results: ChatMessage[] = [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const line of raw.split('\n').filter(Boolean)) {
      try {
        results.push(JSON.parse(line) as ChatMessage);
      } catch {
        // skip
      }
    }
  }
  return results;
}
