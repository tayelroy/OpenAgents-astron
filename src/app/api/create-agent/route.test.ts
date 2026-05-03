import { beforeEach, describe, expect, it, vi } from 'vitest';

const scrapeTweets = vi.fn();
const synthesizePersona = vi.fn();
const uploadTo0G = vi.fn();
const mintAgentEnsSubdomain = vi.fn();
const saveScrapeArtifact = vi.fn();
const saveAgent = vi.fn();

vi.mock('@/lib/twitter', () => ({ scrapeTweets }));
vi.mock('@/lib/persona', () => ({ synthesizePersona }));
vi.mock('@/lib/storage', () => ({ uploadTo0G }));
vi.mock('@/lib/ens', () => ({
  buildAgentEnsName: (handle: string) => `${handle}.astron.eth`,
  mintAgentEnsSubdomain,
}));
vi.mock('@/lib/agent-records', () => ({ saveAgent }));
vi.mock('@/lib/scrape-artifacts', () => ({ saveScrapeArtifact }));

describe('/api/create-agent', () => {
  beforeEach(() => {
    scrapeTweets.mockReset();
    synthesizePersona.mockReset();
    uploadTo0G.mockReset();
    mintAgentEnsSubdomain.mockReset();
    saveScrapeArtifact.mockReset();
    saveAgent.mockReset();

    process.env.ENS_PUBLIC_RESOLVER_ADDRESS = '0x1111111111111111111111111111111111111111';
    process.env.ENS_REGISTRY_ADDRESS = '0x2222222222222222222222222222222222222222';
    process.env.ENS_RPC_URL = 'http://localhost:8545';
    process.env.ENS_PRIVATE_KEY = '0x' + '11'.repeat(32);
  });

  it('runs the happy path and persists the minted agent', async () => {
    scrapeTweets.mockResolvedValue({
      tweets: [{ text: 'tweet one' }],
      verification: { source: 'twitter-api', itemCount: 1, ok: true },
    });
    synthesizePersona.mockResolvedValue({
      persona: 'x'.repeat(40),
      tone: 'clear',
      topics: ['ai'],
    });
    uploadTo0G.mockResolvedValue('0xroot123');
    mintAgentEnsSubdomain.mockResolvedValue({
      ens: 'astron.astron.eth',
      registryTxHash: '0xensreg',
      resolverTxHash: '0xensres',
    });

    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/create-agent', {
      method: 'POST',
      body: JSON.stringify({
        handle: '@astron',
        userAddress: '0x1111111111111111111111111111111111111111',
      }),
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.tokenId).toBe(0);
    expect(json.cid).toBe('0xroot123');
    expect(json.ens).toBe('astron.astron.eth');
    expect(uploadTo0G).toHaveBeenCalledTimes(1);
    expect(uploadTo0G).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest: expect.objectContaining({
          kind: 'astron.brain-package',
          handle: 'astron',
          ens: 'astron.astron.eth',
        }),
        persona: expect.objectContaining({ tone: 'clear' }),
        memory: expect.objectContaining({
          summary: expect.any(String),
          recentTweets: expect.any(Array),
          knowledge: [],
        }),
        metadata: expect.objectContaining({
          ownerAddress: '0x1111111111111111111111111111111111111111',
          source: 'twitter-api',
        }),
      })
    );
    expect(saveAgent).toHaveBeenCalledTimes(1);
    expect(mintAgentEnsSubdomain).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: 'astron',
        ownerAddress: '0x1111111111111111111111111111111111111111',
      })
    );
  });

  it('rejects missing wallet addresses before minting', async () => {
    scrapeTweets.mockResolvedValue({
      tweets: [{ text: 'tweet one' }],
      verification: { source: 'twitter-api', itemCount: 1, ok: true },
    });
    synthesizePersona.mockResolvedValue({
      persona: 'x'.repeat(40),
      tone: 'clear',
      topics: ['ai'],
    });
    uploadTo0G.mockResolvedValue('0xroot123');

    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/create-agent', {
      method: 'POST',
      body: JSON.stringify({ handle: '@astron' }),
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/wallet address/i);
    expect(saveAgent).not.toHaveBeenCalled();
  });
});