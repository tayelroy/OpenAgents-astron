/**
 * POST /api/chat
 *
 * Streams a chat response using the agent's synthesized persona + style profile
 * as the system prompt. The persona and optional style profile are always
 * loaded from the durable file-based store (via `getKBEntry`).
 *
 * When a style profile is present, its structured guidance (tone, hooks,
 * vocabulary, few-shot examples) is injected alongside the persona narrative
 * to produce replies that faithfully mimic the author's voice.
 *
 * Chat messages are appended to the durable log after each exchange so the
 * self-learning update loop can consume them later.
 */

import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getKBEntry } from '@/lib/storage';
import { appendChatLog } from '@/lib/db';
import { buildStyledSystemPrompt } from '@/lib/style-profile';

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
      const personaNarrative = typeof p === 'string' ? p : (p.persona ?? null);
      if (personaNarrative) {
        // If a style profile is attached, combine it with the persona narrative.
        if (p.styleProfile && Array.isArray(p.styleProfile.fewShotExamples)) {
          systemPrompt = buildStyledSystemPrompt(personaNarrative, p.styleProfile);
        } else {
          systemPrompt = personaNarrative;
        }
      }
      resolvedHandle = entry.handle ?? null;
    }

    console.log(
      `[chat] Loaded brain for tokenId=${tokenId}` +
        (resolvedHandle ? ` (@${resolvedHandle})` : ' (fallback persona)')
    );

    // Log whether style guidance was applied (useful for debugging).
    if (typeof entry?.persona === 'object' && entry.persona !== null && entry.persona.styleProfile) {
      const sp = entry.persona.styleProfile;
      const exampleCount = Array.isArray(sp?.fewShotExamples) ? sp.fewShotExamples.length : 0;
      console.log(`[chat] Style guidance active — ${exampleCount} few-shot examples embedded.`);
    }

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
