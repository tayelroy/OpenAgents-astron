/**
 * POST /api/create-agent
 *
 * Unified agent creation pipeline:
 *   1. Scrape public tweets via the Twitter API
 *   2. Synthesize a validated structured persona via OpenAI or 0G Compute
 *   3. Upload the persona brain to 0G Storage → get CID
 *   4. Persist all metadata to the durable file-based store
 *
 * This is the single authoritative creation path. The legacy /api/generate
 * route is kept for backward compatibility but should be considered deprecated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgentPipeline } from '@/lib/agent-creation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createAgentPipeline(body as { handle?: string; userAddress?: string });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Something went wrong';
    console.error('[create-agent] Pipeline failed:', error);

    if (msg === 'Missing or invalid handle' || msg === 'A valid wallet address is required to mint the iNFT onchain') {
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}