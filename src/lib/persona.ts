import OpenAI from 'openai';
import type { PersonaPayload } from './db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// ---------------------------------------------------------------------------
// Persona schema validation
// ---------------------------------------------------------------------------

/** Validates that a raw LLM response matches PersonaPayload. */
function validatePersona(raw: unknown): PersonaPayload {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Persona synthesis returned a non-object value');
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.persona !== 'string' || obj.persona.trim().length < 20) {
    throw new Error('Persona field is missing or too short');
  }
  if (typeof obj.tone !== 'string' || obj.tone.trim().length === 0) {
    throw new Error('Tone field is missing');
  }
  if (!Array.isArray(obj.topics) || obj.topics.length === 0) {
    throw new Error('Topics field must be a non-empty array');
  }

  return {
    persona: obj.persona.trim(),
    tone: obj.tone.trim(),
    topics: (obj.topics as unknown[])
      .filter((t) => typeof t === 'string' && t.trim().length > 0)
      .map((t) => (t as string).trim()),
  };
}

// ---------------------------------------------------------------------------
// Persona synthesis
// ---------------------------------------------------------------------------

export async function synthesizePersona(
  handle: string,
  tweets: { text: string }[]
): Promise<PersonaPayload> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[Persona] OPENAI_API_KEY missing — returning validated mock persona.');
    return validatePersona({
      persona: `You are an AI clone of @${handle}. You communicate with authority on Web3, decentralized infrastructure, and on-chain AI. Mirror the tone and reasoning style evident in the provided tweets.`,
      tone: 'Confident, analytical, forward-looking',
      topics: ['Web3', 'On-chain AI', 'Crypto'],
    });
  }

  // Deduplicate and trim tweet text to stay under token limits
  const seen = new Set<string>();
  const uniqueTweets = tweets
    .map((t) => t.text?.trim())
    .filter((text): text is string => !!text && !seen.has(text) && !!seen.add(text))
    .slice(0, 150);

  const tweetText = uniqueTweets.join('\n---\n');

  const prompt = `You are an expert behavioral analyst.

Analyze the following tweets from @${handle} and extract a "Persona System Prompt" that can be used to instruct an AI to act exactly like this person.

Rules:
- Base the persona ONLY on evidence from the tweets.
- The "persona" field must be a detailed system prompt (≥ 100 words) describing voice, values, reasoning style, and recurring themes.
- The "tone" field must be a short phrase (3–8 words).
- The "topics" field must be an array of 3–8 strings.

Output VALID JSON in exactly this schema (no extra keys, no markdown fences):
{
  "persona": "string",
  "tone": "string",
  "topics": ["string"]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.3,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Tweets:\n\n${tweetText}` },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No content returned from LLM during persona synthesis');

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Persona synthesis returned invalid JSON: ${content.slice(0, 200)}`);
  }

  // Strict schema validation — throws if shape is wrong
  return validatePersona(parsed);
}

// Alias kept for backward compatibility
export const parsePersonaFromTweets = synthesizePersona;

// ---------------------------------------------------------------------------
// Contradiction Detection (stub — wired when wallet enrichment lands)
// ---------------------------------------------------------------------------

export type Contradiction = {
  type: 'source-vs-chain' | 'temporal' | 'rhetorical';
  severity: 'hint' | 'warning' | 'flag';
  source: string;
  detail: string;
};

export function detectContradictions(
  _persona: PersonaPayload,
  _walletState?: unknown
): Contradiction[] {
  return [];
}
