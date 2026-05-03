/**
 * GET /api/ownership/[tokenId]?wallet=0x...
 *
 * Verifies whether the given wallet owns the specified iNFT token.
 *
 * Resolution order:
 *   1. On-chain check via the iNFT contract (when INFT_CONTRACT_ADDRESS is set)
 *   2. Durable DB fallback (ownerAddress field in the persisted agent record)
 *
 * Returns:
 *   { verified: boolean, ownerAddress: string | null, handle: string | null }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAgent, getAgentByTokenId } from '@/lib/agent-records';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const resolvedParams = await params;
  const { tokenId } = resolvedParams;
  const wallet = req.nextUrl.searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json(
      { error: 'wallet query parameter is required' },
      { status: 400 }
    );
  }

  const numericTokenId = parseInt(tokenId, 10);
  if (isNaN(numericTokenId)) {
    // tokenId might be a handle string — look up by handle
    const agent = getAgent(tokenId);
    if (!agent) {
      return NextResponse.json({ verified: false, ownerAddress: null, handle: null });
    }
    const verified = agent.ownerAddress.toLowerCase() === wallet.toLowerCase();
    return NextResponse.json({
      verified,
      ownerAddress: agent.ownerAddress,
      handle: agent.handle,
      cid: agent.cid,
      tokenId: agent.tokenId,
    });
  }

  // ------------------------------------------------------------------
  // On-chain ownership check
  // ------------------------------------------------------------------
  if (
    process.env.INFT_CONTRACT_ADDRESS &&
    process.env.INFT_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000'
  ) {
    try {
      const { createPublicClient, http, parseAbi } = await import('viem');

      const viemClient = createPublicClient({
        chain: {
          id: Number(process.env.ZERO_G_CHAIN_ID || 16601),
          name: '0G Testnet',
          nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
          rpcUrls: {
            default: { http: [process.env.ZERO_G_CHAIN_RPC_URL || 'https://evmrpc-testnet.0g.ai'] },
            public: { http: [process.env.ZERO_G_CHAIN_RPC_URL || 'https://evmrpc-testnet.0g.ai'] },
          },
        },
        transport: http(process.env.ZERO_G_CHAIN_RPC_URL || 'https://evmrpc-testnet.0g.ai'),
      });

      const abi = parseAbi(['function ownerOf(uint256 tokenId) view returns (address)']);

      const onChainOwner = (await viemClient.readContract({
        address: process.env.INFT_CONTRACT_ADDRESS as `0x${string}`,
        abi,
        functionName: 'ownerOf',
        args: [BigInt(numericTokenId)],
      })) as string;

      const verified = onChainOwner.toLowerCase() === wallet.toLowerCase();
      return NextResponse.json({ verified, ownerAddress: onChainOwner, handle: null });
    } catch (err) {
      console.warn('[ownership] On-chain check failed, falling back to DB:', err);
    }
  }

  // ------------------------------------------------------------------
  // Durable DB fallback
  // ------------------------------------------------------------------
  const agent = getAgentByTokenId(numericTokenId);
  if (!agent) {
    return NextResponse.json({ verified: false, ownerAddress: null, handle: null });
  }

  const verified = agent.ownerAddress.toLowerCase() === wallet.toLowerCase();
  return NextResponse.json({
    verified,
    ownerAddress: agent.ownerAddress,
    handle: agent.handle,
    cid: agent.cid,
    tokenId: agent.tokenId,
  });
}
