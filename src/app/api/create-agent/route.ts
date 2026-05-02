/**
 * POST /api/create-agent
 *
 * Unified agent creation pipeline:
 *   1. Scrape public tweets via Apify
 *   2. Synthesize a validated structured persona via OpenAI
 *   3. Upload the persona brain to 0G Storage → get CID
 *   4. Mint the iNFT on Base → get tokenId + txHash
 *   5. Persist all metadata to the durable file-based store
 *
 * This is the single authoritative creation path. The legacy /api/generate
 * route is kept for backward compatibility but should be considered deprecated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeTweets } from '@/lib/twitter';
import { synthesizePersona } from '@/lib/persona';
import { uploadTo0G } from '@/lib/storage';
import { mintAgentNFT } from '@/lib/contract';
import { saveAgent } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { handle, ens, userAddress } = body as {
      handle?: string;
      ens?: string;
      userAddress?: string;
    };

    if (!handle || typeof handle !== 'string' || handle.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or invalid handle' }, { status: 400 });
    }

    const cleanHandle = handle.trim().replace(/^@/, '');

    // ------------------------------------------------------------------
    // Step 1: Scrape public tweets
    // ------------------------------------------------------------------
    console.log(`[create-agent] Step 1 — scraping tweets for @${cleanHandle}`);
    const { tweets, verification } = await scrapeTweets(cleanHandle, 100);

    if (!tweets || tweets.length === 0) {
      return NextResponse.json(
        { error: `No public tweets found for @${cleanHandle}. Cannot synthesize a persona.` },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------------
    // Step 2: Synthesize validated persona
    // ------------------------------------------------------------------
    console.log(`[create-agent] Step 2 — synthesizing persona from ${tweets.length} tweets`);
    const persona = await synthesizePersona(cleanHandle, tweets);

    // ------------------------------------------------------------------
    // Step 3: Upload brain to 0G Storage
    // ------------------------------------------------------------------
    console.log(`[create-agent] Step 3 — uploading brain to 0G Storage`);
    const cid = await uploadTo0G({ handle: cleanHandle, persona, tweets: tweets.slice(0, 50) });

    // ------------------------------------------------------------------
    // Step 4: Mint iNFT on Base
    // ------------------------------------------------------------------
    let tokenId = 0;
    let txHash = '0x0';
    const ownerAddress = userAddress ?? '';

    if (ownerAddress) {
      console.log(`[create-agent] Step 4 — minting iNFT to ${ownerAddress}`);
      const mintResult = await mintAgentNFT(ownerAddress as `0x${string}`, cid);
      tokenId = mintResult.tokenId;
      txHash = mintResult.txHash;
    } else {
      console.warn('[create-agent] Step 4 — no userAddress provided; skipping mint');
      // Assign a deterministic mock token ID based on handle for demo purposes
      tokenId = Math.abs(
        cleanHandle.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
      ) % 9000 + 1000;
      txHash = '0x' + Buffer.from(cleanHandle).toString('hex').padEnd(64, '0').slice(0, 64);
    }

    // ------------------------------------------------------------------
    // Step 5: Persist durably
    // ------------------------------------------------------------------
    console.log(`[create-agent] Step 5 — persisting agent record for @${cleanHandle}`);
    const now = new Date().toISOString();
    saveAgent({
      handle: cleanHandle,
      tokenId,
      cid,
      ownerAddress,
      txHash,
      persona,
      ens: typeof ens === 'string' && ens.trim() ? ens.trim() : undefined,
      createdAt: now,
      updatedAt: now,
      scrapeVerification: verification,
    });

    return NextResponse.json({
      success: true,
      handle: cleanHandle,
      tokenId,
      cid,
      txHash,
      persona,
      scrape: verification,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Something went wrong';
    console.error('[create-agent] Pipeline failed:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}