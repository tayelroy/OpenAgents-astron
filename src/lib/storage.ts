/**
 * 0G Storage layer + durable knowledge vault.
 *
 * - `uploadTo0G` / `fetchFrom0G` use the 0G Storage TS SDK.
 * - `putKBEntry` / `getKBEntry` delegate to the file-based record stores so
 *   records survive server restarts.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { getAgent, getAgentByTokenId, saveAgent, type AgentRecord } from './agent-records';

// ---------------------------------------------------------------------------
// 0G Storage (real SDK)
// ---------------------------------------------------------------------------

export async function uploadTo0G(data: unknown): Promise<string> {
  const payload = JSON.stringify(data, null, 2);
  console.log(`[0G Storage] Uploading ${Buffer.byteLength(payload, 'utf8')} bytes...`);

  const rpcUrl = process.env.ZERO_G_RPC_URL || 'https://evmrpc-testnet.0g.ai';
  const indexerUrl = process.env.ZERO_G_STORAGE_INDEXER_URL || 'https://indexer-storage-testnet-turbo.0g.ai';
  const privateKey = process.env.ZERO_G_STORAGE_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('ZERO_G_STORAGE_PRIVATE_KEY is missing');
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astron-0g-'));
  const filePath = path.join(tmpDir, 'payload.json');
  fs.writeFileSync(filePath, payload, 'utf8');

  try {
    const [{ ZgFile, Indexer }, { ethers }] = await Promise.all([
      import('@0gfoundation/0g-storage-ts-sdk'),
      import('ethers'),
    ]);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const indexer = new Indexer(indexerUrl);

    const file = await ZgFile.fromFilePath(filePath);
    await file.merkleTree();

    const [tx, uploadErr] = await indexer.upload(file, rpcUrl, signer);
    await file.close();

    if (uploadErr) {
      throw uploadErr;
    }

    const uploadResult = tx as unknown as {
      rootHash?: string;
      rootHashes?: string[];
    };

    const cid = uploadResult.rootHashes?.[0] || uploadResult.rootHash;
    if (!cid) {
      throw new Error('0G upload succeeded but did not return a CID/root hash');
    }

    console.log(`[0G Storage] Upload complete. CID: ${cid}`);
    return cid;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore temp cleanup failures
    }
  }
}

export async function fetchFrom0G(cid: string): Promise<unknown> {
  console.log(`[0G Storage] Fetching CID: ${cid}`);
  const rpcUrl = process.env.ZERO_G_RPC_URL || 'https://evmrpc-testnet.0g.ai';
  const indexerUrl = process.env.ZERO_G_STORAGE_INDEXER_URL || 'https://indexer-storage-testnet-turbo.0g.ai';

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astron-0g-fetch-'));
  const outputPath = path.join(tmpDir, 'payload.json');

  try {
    const { Indexer } = await import('@0gfoundation/0g-storage-ts-sdk');
    const indexer = new Indexer(indexerUrl);
    const downloadErr = await indexer.download(cid, outputPath, true);
    if (downloadErr) {
      throw downloadErr;
    }

    return JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore temp cleanup failures
    }
  }
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
    return getAgentByTokenId(numeric);
  }

  return null;
}