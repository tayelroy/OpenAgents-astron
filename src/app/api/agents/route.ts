/**
 * GET /api/agents?owner=0x...
 *
 * Returns all agent records owned by a given wallet address.
 * Falls back to all agents when no owner filter is specified (for demo sidebar).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllAgents, getAgentsByOwner } from '@/lib/agent-records';

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get('owner');

  const agents = owner ? getAgentsByOwner(owner) : getAllAgents();

  return NextResponse.json(
    agents.map((a) => ({
      handle: a.handle,
      tokenId: a.tokenId,
      cid: a.cid,
      ownerAddress: a.ownerAddress,
      txHash: a.txHash,
      persona: {
        tone: a.persona.tone,
        topics: a.persona.topics,
      },
      ens: a.ens,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }))
  );
}
