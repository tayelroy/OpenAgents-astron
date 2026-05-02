/**
 * 0G Storage layer + durable knowledge vault.
 *
 * - `uploadTo0G` / `fetchFrom0G` handle the 0G network interaction (mocked
 *   until the real SDK is available via npm).
 * - `putKBEntry` / `getKBEntry` now delegate to the file-based DB so records
 *   survive server restarts.
 */

import { getAgent, saveAgent, type AgentRecord } from './db';

// ---------------------------------------------------------------------------
// 0G Storage (mocked — replace with real SDK when available)
// ---------------------------------------------------------------------------

export async function uploadTo0G(data: unknown): Promise<string> {
  const payload = JSON.stringify(data, null, 2);
  console.log(`[0G Storage] Uploading ${Buffer.byteLength(payload, 'utf8')} bytes...`);

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Deterministic-ish mock CID derived from content hash
  const hash = Buffer.from(payload).toString('base64url').slice(0, 24);
  const cid = `bafybei${hash}`;

  console.log(`[0G Storage] Upload complete. CID: ${cid}`);
  return cid;
}

export async function fetchFrom0G(cid: string): Promise<unknown> {
  console.log(`[0G Storage] Fetching CID: ${cid}`);
  await new Promise((resolve) => setTimeout(resolve, 400));

  // In production this would pull from the 0G network.
  // For now, return null so callers fall back to the local DB record.
  return null;
}

// ---------------------------------------------------------------------------
// Knowledge vault (now backed by the durable file-based DB)
// ---------------------------------------------------------------------------

/** Shape accepted by putKBEntry — superset of legacy callers. */
export type KBEntryInput = {
  id: string;
  handle: string;
  persona: unknown;
  tweets?: unknown[];
  chunks?: unknown[];
  ens?: string;
  createdAt: number;
  /** New fields written by the unified generation pipeline. */
  tokenId?: number;
  cid?: string;
  ownerAddress?: string;
  txHash?: string;
  scrapeVerification?: object;
};

export async function putKBEntry(entry: KBEntryInput): Promise<void> {
  const persona = entry.persona as AgentRecord['persona'];
  const now = new Date().toISOString();

  const record: AgentRecord = {
    handle: entry.handle,
    tokenId: entry.tokenId ?? 0,
    cid: entry.cid ?? '',
    ownerAddress: entry.ownerAddress ?? '',
    txHash: entry.txHash ?? '',
    persona,
    ens: entry.ens,
    createdAt: new Date(entry.createdAt).toISOString(),
    updatedAt: now,
    scrapeVerification: entry.scrapeVerification ?? {},
  };

  saveAgent(record);
  console.log(`[KB] Persisted agent: ${entry.handle}`);
}

export async function getKBEntry(id: string): Promise<AgentRecord | null> {
  // id may be "persona:<handle>" (legacy) or just "<handle>" or a numeric tokenId string
  let handle = id;
  if (id.startsWith('persona:')) handle = id.slice('persona:'.length);

  const record = getAgent(handle);
  if (record) return record;

  // Fallback: numeric tokenId
  const numeric = parseInt(id, 10);
  if (!isNaN(numeric)) {
    // Lazy circular import avoided — getAgentByTokenId lives in db.ts
    const { getAgentByTokenId } = await import('./db');
    return getAgentByTokenId(numeric);
  }

  return null;
}