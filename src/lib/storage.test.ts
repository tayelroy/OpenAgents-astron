import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fetchFrom0G, putKBEntry, uploadTo0G } from './storage';

const storageMocks = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  downloadMock: vi.fn(),
  fromFilePathMock: vi.fn(),
  merkleTreeMock: vi.fn(),
  closeMock: vi.fn(),
}));

vi.mock('@0gfoundation/0g-storage-ts-sdk', () => {
  class Indexer {
    upload = storageMocks.uploadMock;
    download = storageMocks.downloadMock;
    constructor(_url: string) {}
  }

  const ZgFile = {
    fromFilePath: storageMocks.fromFilePathMock,
  };

  return { ZgFile, Indexer };
});

vi.mock('ethers', () => {
  class JsonRpcProvider {
    constructor(_url: string) {}
  }
  class Wallet {
    address = '0xabc';
    constructor(_privateKey: string, _provider: JsonRpcProvider) {}
  }

  return { ethers: { JsonRpcProvider, Wallet } };
});

vi.mock('./agent-records', async () => {
  const actual = await vi.importActual<typeof import('./agent-records')>('./agent-records');
  return {
    ...actual,
    saveAgent: vi.fn(),
  };
});

describe('0G storage', () => {
  beforeEach(() => {
    storageMocks.uploadMock.mockReset();
    storageMocks.downloadMock.mockReset();
    storageMocks.fromFilePathMock.mockReset();
    storageMocks.merkleTreeMock.mockReset();
    storageMocks.closeMock.mockReset();
    process.env.ZERO_G_STORAGE_PRIVATE_KEY = '0x1111111111111111111111111111111111111111111111111111111111111111';
    process.env.ZERO_G_RPC_URL = 'https://evmrpc-testnet.0g.ai';
    process.env.ZERO_G_STORAGE_INDEXER_URL = 'https://indexer-storage-testnet-turbo.0g.ai';

    storageMocks.fromFilePathMock.mockResolvedValue({
      merkleTree: storageMocks.merkleTreeMock.mockResolvedValue(undefined),
      close: storageMocks.closeMock.mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    delete process.env.ZERO_G_STORAGE_PRIVATE_KEY;
    delete process.env.ZERO_G_RPC_URL;
    delete process.env.ZERO_G_STORAGE_INDEXER_URL;
  });

  it('uploads JSON payloads and returns the root hash', async () => {
    storageMocks.uploadMock.mockResolvedValueOnce([
      { rootHash: '0xroot123' },
      null,
    ]);

    const cid = await uploadTo0G({ hello: 'world' });

    expect(cid).toBe('0xroot123');
    expect(storageMocks.uploadMock).toHaveBeenCalledTimes(1);
  });

  it('downloads and parses JSON payloads', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astron-storage-test-'));
    const outputPath = path.join(tempDir, 'payload.json');
    fs.writeFileSync(outputPath, JSON.stringify({ ok: true }), 'utf8');

    storageMocks.downloadMock.mockImplementation(async (_cid: string, filePath: string) => {
      fs.copyFileSync(outputPath, filePath);
      return undefined;
    });

    const payload = await fetchFrom0G('0xroot123');
    expect(payload).toEqual({ ok: true });

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('persists agent entries into the durable store', async () => {
    const { saveAgent } = await import('./agent-records');
    await putKBEntry({
      id: 'persona:astron',
      handle: 'astron',
      persona: { persona: 'x'.repeat(20), tone: 'calm', topics: ['ai'] },
      createdAt: Date.now(),
      tokenId: 7,
      cid: '0xroot123',
      ownerAddress: '0xabc',
      txHash: '0xtx',
      ens: 'Astron.agent.eth',
      scrapeVerification: { source: 'twitter-api' },
    });

    expect(saveAgent).toHaveBeenCalledTimes(1);
  });
});