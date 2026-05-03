import { NextResponse } from 'next/server';
import { scrapeTweets } from '@/lib/twitter';
import { synthesizePersona } from '@/lib/persona';
import { uploadTo0G } from '@/lib/storage';
import { mintAgentNFT } from '@/lib/contract';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { handle, paymentVerified, userAddress } = body;

    if (!handle) {
      return NextResponse.json({ error: 'Twitter handle is required' }, { status: 400 });
    }

    // Phase 1: Require payment verification before onchain minting
    if (!paymentVerified) {
      // Typically we would respond with 402 Payment Required and the x402 header
      return new NextResponse(
        JSON.stringify({ error: 'Payment Required', message: 'Please complete x402 payment to proceed.' }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            // Mock x402 header containing the address, network, amount (e.g., 5 USDC on Base), and a challenge
            'WWW-Authenticate': 'x402 address="0x1234567890abcdef1234567890abcdef12345678", network="base", amount="5000000", token="USDC", challenge="mock_challenge_123"',
          },
        }
      );
    }

    // Phase 2: Data Scraping & Persona Synthesis
    console.log(`[Phase 2] Scraping tweets for @${handle}...`);
    const scrapeResult = await scrapeTweets(handle, 100);
    const { tweets, verification } = scrapeResult;

    if (!tweets || tweets.length === 0) {
      return NextResponse.json({ error: 'Unable to scrape tweets. User refunded.' }, { status: 404 });
    }

    console.log(`[Phase 2] Synthesizing persona for @${handle} from ${tweets.length} tweets...`);
    const personaData = await synthesizePersona(handle, tweets);

    // Phase 3: 0G Immutability & 0G iNFT Minting
    console.log(`[Phase 3] Uploading Persona System Prompt to 0G Storage...`);
    const cid = await uploadTo0G(personaData);

    if (!userAddress || typeof userAddress !== 'string' || !userAddress.startsWith('0x')) {
      return NextResponse.json(
        { error: 'A valid wallet address is required to mint the iNFT onchain' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Server-side minting is not supported. Please use /api/create-agent which orchestrates the full client-side mint flow.' },
      { status: 501 }
    );
  } catch (e: any) {
    console.error('Generation Error:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
