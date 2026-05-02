/**
 * POST /api/chat
 *
 * Streams a chat response using the agent's synthesized persona as the system
 * prompt. The persona is always loaded from the durable file-based store (via
 * `getKBEntry`), never from browser storage.
 *
 * Chat messages are appended to the durable log after each exchange so the
 * self-learning update loop can consume them later.
 */

import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getKBEntry } from '@/lib/storage';
import { appendChatLog } from '@/lib/db';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, tokenId } = await req.json() as {
      messages: { role: string; content: string }[];
      tokenId: string;
    };

    // ------------------------------------------------------------------
    // Resolve agent brain from durable storage
    // ------------------------------------------------------------------
    let systemPrompt = 'You are a helpful AI assistant.';
    let resolvedHandle: string | null = null;

    const entry = await getKBEntry(tokenId);
    if (entry?.persona) {
      const p = entry.persona;
      systemPrompt = typeof p === 'string' ? p : (p.persona ?? systemPrompt);
      resolvedHandle = entry.handle ?? null;
    }

    console.log(
      `[chat] Loaded brain for tokenId=${tokenId}` +
        (resolvedHandle ? ` (@${resolvedHandle})` : ' (fallback persona)')
    );

    // ------------------------------------------------------------------
    // Stream response
    // ------------------------------------------------------------------
    const result = await streamText({
      model: openai('gpt-4o') as any,
      system: systemPrompt,
      messages: messages as any,
    });

    // ------------------------------------------------------------------
    // Persist chat log for future self-learning updates (fire-and-forget)
    // ------------------------------------------------------------------
    const now = new Date().toISOString();
    const userMessages = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: now,
      }));

    if (userMessages.length > 0) {
      try {
        appendChatLog(tokenId, userMessages);
      } catch (logErr) {
        console.warn('[chat] Failed to append chat log:', logErr);
      }
    }

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('[chat] API Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
