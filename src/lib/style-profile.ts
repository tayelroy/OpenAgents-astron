/**
 * Style Profile Extraction
 *
 * Implements the "Style Profile (The Secret Weapon)" step from the fine-tuning
 * architecture:
 *
 *   1. Run an LLM analysis pass over the raw tweets to extract quantitative and
 *      qualitative style signals.
 *   2. Return a `StyleProfile` that can be injected into every generation /
 *      chat prompt so the agent reliably mimics the author's voice.
 *
 * The profile is intentionally separate from the `PersonaPayload` so it can be
 * updated independently (e.g. when new tweets are scraped) without invalidating
 * the persona narrative.
 */

import OpenAI from 'openai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StyleProfile = {
  /** Average tweet length in words (approximate). */
  avgWordCount: number;
  /** Overall tone description (e.g. "aggressive and ironic"). */
  tone: string;
  /** Common sentence openers / hook patterns. */
  hookPatterns: string[];
  /** Punctuation habits (e.g. "uses em-dashes heavily, avoids periods"). */
  punctuationHabits: string;
  /** Recurring phrases or signature vocabulary. */
  signaturePhrases: string[];
  /** Primary topic clusters. */
  topicClusters: string[];
  /** Things to explicitly avoid (negative style examples). */
  avoidPatterns: string[];
  /** Up to 20 representative tweets chosen as few-shot examples. */
  fewShotExamples: string[];
};

// ---------------------------------------------------------------------------
// Client factory (mirrors persona.ts)
// ---------------------------------------------------------------------------

function getStyleClient() {
  const zeroGBaseUrl = process.env.ZERO_G_COMPUTE_BASE_URL;
  const zeroGApiKey = process.env.ZERO_G_COMPUTE_API_KEY;

  if (zeroGBaseUrl && zeroGApiKey) {
    return new OpenAI({ apiKey: zeroGApiKey, baseURL: zeroGBaseUrl });
  }

  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  throw new Error(
    'Either ZERO_G_COMPUTE_BASE_URL + ZERO_G_COMPUTE_API_KEY or OPENAI_API_KEY must be set'
  );
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateStyleProfile(raw: unknown): StyleProfile {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Style profile extraction returned a non-object value');
  }
  const obj = raw as Record<string, unknown>;

  const avgWordCount =
    typeof obj.avgWordCount === 'number' ? obj.avgWordCount : 20;
  const tone =
    typeof obj.tone === 'string' && obj.tone.trim().length > 0
      ? obj.tone.trim()
      : 'neutral';
  const hookPatterns = Array.isArray(obj.hookPatterns)
    ? (obj.hookPatterns as unknown[])
        .filter((x) => typeof x === 'string')
        .map((x) => (x as string).trim())
    : [];
  const punctuationHabits =
    typeof obj.punctuationHabits === 'string'
      ? obj.punctuationHabits.trim()
      : '';
  const signaturePhrases = Array.isArray(obj.signaturePhrases)
    ? (obj.signaturePhrases as unknown[])
        .filter((x) => typeof x === 'string')
        .map((x) => (x as string).trim())
    : [];
  const topicClusters = Array.isArray(obj.topicClusters)
    ? (obj.topicClusters as unknown[])
        .filter((x) => typeof x === 'string')
        .map((x) => (x as string).trim())
    : [];
  const avoidPatterns = Array.isArray(obj.avoidPatterns)
    ? (obj.avoidPatterns as unknown[])
        .filter((x) => typeof x === 'string')
        .map((x) => (x as string).trim())
    : [];
  const fewShotExamples = Array.isArray(obj.fewShotExamples)
    ? (obj.fewShotExamples as unknown[])
        .filter((x) => typeof x === 'string')
        .map((x) => (x as string).trim())
        .slice(0, 20)
    : [];

  return {
    avgWordCount,
    tone,
    hookPatterns,
    punctuationHabits,
    signaturePhrases,
    topicClusters,
    avoidPatterns,
    fewShotExamples,
  };
}

// ---------------------------------------------------------------------------
// Main extraction function
// ---------------------------------------------------------------------------

/**
 * Analyzes up to 100 tweets and returns a `StyleProfile` that captures the
 * author's writing style in a structured, injectable form.
 */
export async function extractStyleProfile(
  handle: string,
  tweets: { text: string }[]
): Promise<StyleProfile> {
  const openai = getStyleClient();

  // Deduplicate and cap at 100
  const seen = new Set<string>();
  const uniqueTweets = tweets
    .map((t) => t.text?.trim())
    .filter(
      (text): text is string =>
        !!text && !seen.has(text) && !!seen.add(text)
    )
    .slice(0, 100);

  const tweetText = uniqueTweets.map((t, i) => `[${i + 1}] ${t}`).join('\n');

  const systemPrompt = `You are a writing-style analyst specializing in social media voice.

Analyze the following tweets from @${handle} and extract a precise style profile.

Output VALID JSON in exactly this schema (no extra keys, no markdown fences):
{
  "avgWordCount": <number — average words per tweet>,
  "tone": "<string — 3-8 words describing overall tone>",
  "hookPatterns": ["<string>", ...],
  "punctuationHabits": "<string — describe punctuation tendencies>",
  "signaturePhrases": ["<string>", ...],
  "topicClusters": ["<string>", ...],
  "avoidPatterns": ["<string — things this author never does>", ...],
  "fewShotExamples": ["<verbatim tweet text>", ...]
}

Rules:
- hookPatterns: list 3-6 common sentence-opener or hook styles (e.g. "starts with a bold claim", "opens with a rhetorical question")
- signaturePhrases: list up to 8 recurring words, phrases, or vocabulary choices
- topicClusters: list 3-8 primary topic areas
- avoidPatterns: list 3-5 things this author clearly avoids (e.g. "never uses hashtags", "avoids passive voice")
- fewShotExamples: pick the 15-20 most representative tweets verbatim — prioritise variety across topics and hook styles
- avgWordCount: compute from the provided tweets`;

  const response = await openai.chat.completions.create({
    model:
      process.env.ZERO_G_COMPUTE_MODEL ||
      process.env.OPENAI_MODEL ||
      'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Tweets from @${handle}:\n\n${tweetText}` },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content returned from LLM during style profile extraction');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      `Style profile extraction returned invalid JSON: ${content.slice(0, 200)}`
    );
  }

  return validateStyleProfile(parsed);
}

// ---------------------------------------------------------------------------
// Prompt injection helpers
// ---------------------------------------------------------------------------

/**
 * Builds the style-guidance block that is injected into every system prompt.
 * This is the "secret weapon" — it makes the agent reliably mimic the author's
 * voice even when the topic is new.
 */
export function buildStyleGuidanceBlock(profile: StyleProfile): string {
  const lines: string[] = [
    '## Writing Style Guide',
    '',
    `**Tone:** ${profile.tone}`,
    `**Average tweet length:** ~${profile.avgWordCount} words`,
    `**Punctuation habits:** ${profile.punctuationHabits}`,
    '',
  ];

  if (profile.hookPatterns.length > 0) {
    lines.push('**Hook patterns (use these to open responses):**');
    profile.hookPatterns.forEach((h) => lines.push(`- ${h}`));
    lines.push('');
  }

  if (profile.signaturePhrases.length > 0) {
    lines.push('**Signature vocabulary / phrases:**');
    profile.signaturePhrases.forEach((p) => lines.push(`- ${p}`));
    lines.push('');
  }

  if (profile.topicClusters.length > 0) {
    lines.push(`**Core topics:** ${profile.topicClusters.join(', ')}`);
    lines.push('');
  }

  if (profile.avoidPatterns.length > 0) {
    lines.push('**Avoid (things this author never does):**');
    profile.avoidPatterns.forEach((a) => lines.push(`- ${a}`));
    lines.push('');
  }

  if (profile.fewShotExamples.length > 0) {
    lines.push('**Representative writing examples (study and replicate this voice exactly):**');
    profile.fewShotExamples.forEach((ex, i) =>
      lines.push(`Example ${i + 1}: "${ex}"`)
    );
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Composes the full system prompt for chat by combining the persona narrative
 * with the style guidance block.
 */
export function buildStyledSystemPrompt(
  personaNarrative: string,
  styleProfile: StyleProfile
): string {
  const styleBlock = buildStyleGuidanceBlock(styleProfile);
  return `${personaNarrative}\n\n${styleBlock}`;
}
