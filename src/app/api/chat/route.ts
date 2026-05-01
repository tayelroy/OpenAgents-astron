import { openai } from '@ai-sdk/openai';
import { streamText, Message } from 'ai';
import { fetchFrom0G } from '@/lib/storage';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, tokenId } = await req.json();

    // 1. Resolve tokenId to CID (Mocked DB/Contract lookup for MVP)
    const mockCidLookup: Record<string, string> = {
      '1': 'bafybeigdyrxg',
      '2': 'bafybeimock2'
    };
    const cid = mockCidLookup[tokenId as string] || 'bafybeigdyrxg';

    // 2. Fetch the "Brain" / Persona System Prompt from 0G Storage
    const brainContext = await fetchFrom0G(cid);

    // 3. Proxy to LLM using Vercel AI SDK for real-time streaming
    const result = await streamText({
      model: openai('gpt-4o') as any,
      system: brainContext.persona || 'You are a helpful AI assistant.',
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
