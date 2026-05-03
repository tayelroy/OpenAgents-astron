import { config as loadEnv } from 'dotenv';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

loadEnv({ path: path.join(process.cwd(), '.env') });

const viemMocks = vi.hoisted(() => ({
  readContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  request: vi.fn(),
}));

vi.mock('viem', async () => {
  const actual = await vi.importActual<typeof import('viem')>('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: viemMocks.readContract,
      waitForTransactionReceipt: viemMocks.waitForTransactionReceipt,
    })),
  };
});

describe('mintAgentNFT integration', () => {
  it('mints an iNFT and extracts the token ID from the receipt', async () => {
    viemMocks.readContract.mockResolvedValue(BigInt('1000000000000000'));
    viemMocks.waitForTransactionReceipt.mockResolvedValue({
      logs: [
        {
          topics: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
            '0x0000000000000000000000003333333333333333333333333333333333333333',
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000000000000000000000000001',
          ],
        },
      ],
      blockNumber: BigInt(123),
    });

    const ethereum = {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') {
          return null;
        }
        if (method === 'eth_estimateGas') {
          return '0x5208';
        }
        if (method === 'eth_sendTransaction') {
          return '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        }
        throw new Error(`Unexpected method: ${method}`);
      }),
    };

    const { mintAgentNFT } = await import('./contract');
    const recipient = '0x3333333333333333333333333333333333333333' as `0x${string}`;
    const cid = '0xroot123';

    const result = await mintAgentNFT({ recipient, cid, ethereum });

    expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.tokenId).toEqual(expect.any(Number));
    expect(result.tokenId).toBeGreaterThan(0);
    expect(viemMocks.readContract).toHaveBeenCalledTimes(1);
    expect(ethereum.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'eth_estimateGas',
        params: [
          expect.objectContaining({
            value: '0x38d7ea4c68000',
          }),
        ],
      })
    );
  });

  it('throws when the contract address is not configured', async () => {
    const original = process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS;
    process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS = '';
    vi.resetModules();

    const { mintAgentNFT } = await import('./contract');

    await expect(
      mintAgentNFT({ recipient: '0x3333333333333333333333333333333333333333' as `0x${string}`, cid: '0xroot123' })
    ).rejects.toThrow(/INFT_CONTRACT_ADDRESS/i);

    process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS = original;
  });
});