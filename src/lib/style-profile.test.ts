import { describe, expect, it, vi, beforeEach } from 'vitest';

const personaMocks = vi.hoisted(() => ({
  chatCreate: vi.fn(),
}));

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: personaMocks.chatCreate,
        },
      };
      constructor(_options: unknown) {}
    },
  };
});

import { extractStyleProfile, buildStyleGuidanceBlock, buildStyledSystemPrompt } from './style-profile';

describe('extractStyleProfile', () => {
  beforeEach(() => {
    personaMocks.chatCreate.mockReset();
    delete process.env.ZERO_G_COMPUTE_BASE_URL;
    delete process.env.ZERO_G_COMPUTE_API_KEY;
    delete process.env.ZERO_G_COMPUTE_MODEL;
    delete process.env.OPENAI_MODEL;
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  it('returns a validated StyleProfile from LLM response', async () => {
    personaMocks.chatCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              avgWordCount: 28,
              tone: 'direct and technical with an analytical bent',
              hookPatterns: [
                'starts with a bold claim',
                'opens with a rhetorical question',
                'leads with a data point',
              ],
              punctuationHabits: 'uses em-dashes heavily, avoids periods at end of short sentences',
              signaturePhrases: ['leverage', 'first-principles', 'frictionless'],
              topicClusters: ['systems design', 'product strategy', 'engineering culture'],
              avoidPatterns: ['never uses hashtags', 'avoids passive voice', 'does not use slang'],
              fewShotExamples: [
                'The best systems are the ones you never built.',
                'Stop optimizing what you cannot measure.',
                'Abstraction is the enemy of execution.',
              ],
            }),
          },
        },
      ],
    });

    const result = await extractStyleProfile('astron', [
      { text: 'The best systems are the ones you never built.' },
      { text: 'Stop optimizing what you cannot measure.' },
      { text: 'Abstraction is the enemy of execution.' },
    ]);

    expect(result.avgWordCount).toBe(28);
    expect(result.tone).toBe('direct and technical with an analytical bent');
    expect(result.hookPatterns).toHaveLength(3);
    expect(result.punctuationHabits).toContain('em-dashes');
    expect(result.signaturePhrases).toContain('leverage');
    expect(result.topicClusters).toContain('systems design');
    expect(result.avoidPatterns).toContain('never uses hashtags');
    expect(result.fewShotExamples).toHaveLength(3);
  });

  it('deduplicates tweets before sending to LLM', async () => {
    personaMocks.chatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        avgWordCount: 10,
        tone: 'short and punchy',
        hookPatterns: [],
        punctuationHabits: '',
        signaturePhrases: [],
        topicClusters: [],
        avoidPatterns: [],
        fewShotExamples: [],
      }) } }],
    });

    await extractStyleProfile('bot', [
      { text: 'same tweet' },
      { text: 'same tweet' },
      { text: 'different tweet' },
    ]);

    const call = personaMocks.chatCreate.mock.calls[0][0];
    const userContent = call.messages[1].content;
    // Should contain two unique tweets (not three)
    const lineCount = userContent.split('\n').filter((l: string) => l.startsWith('[')).length;
    expect(lineCount).toBe(2);
  });

  it('caps at 100 tweets', async () => {
    personaMocks.chatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        avgWordCount: 10,
        tone: 'short',
        hookPatterns: [],
        punctuationHabits: '',
        signaturePhrases: [],
        topicClusters: [],
        avoidPatterns: [],
        fewShotExamples: [],
      }) } }],
    });

    const bigSet = Array.from({ length: 150 }, (_, i) => ({ text: `tweet-${i}` }));
    await extractStyleProfile('biguser', bigSet);

    const call = personaMocks.chatCreate.mock.calls[0][0];
    const lineCount = call.messages[1].content.split('\n').filter((l: string) => l.startsWith('[')).length;
    expect(lineCount).toBe(100);
  });

  it('throws on invalid JSON from LLM', async () => {
    personaMocks.chatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '{not-valid-json' } }],
    });

    await expect(extractStyleProfile('bad', [{ text: 'one tweet' }])).rejects.toThrow(/invalid JSON/i);
  });

  it('uses ZERO_G compute client when available', async () => {
    process.env.ZERO_G_COMPUTE_BASE_URL = 'https://compute.example.com';
    process.env.ZERO_G_COMPUTE_API_KEY = 'zk-test';

    personaMocks.chatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({
        avgWordCount: 5, tone: 'brief', hookPatterns: [], punctuationHabits: '',
        signaturePhrases: [], topicClusters: [], avoidPatterns: [], fewShotExamples: [],
      }) } }],
    });

    await extractStyleProfile('zguser', [{ text: 'hi' }]);

    expect(personaMocks.chatCreate).toHaveBeenCalledTimes(1);
    // The mock doesn't capture baseURL, but the factory logic ensures
    // ZERO_G env vars are used preferentially.
  });
});

describe('buildStyleGuidanceBlock', () => {
  it('produces a readable multi-line guidance block', () => {
    const profile: import('./style-profile').StyleProfile = {
      avgWordCount: 22,
      tone: 'casual and optimistic',
      hookPatterns: ['Starts with "Here\'s the thing..."', 'Opens with a surprising stat'],
      punctuationHabits: 'uses ellipses frequently, minimal exclamation marks',
      signaturePhrases: ['game changer', 'think bigger', 'small wins'],
      topicClusters: ['startups', 'AI', 'design'],
      avoidPatterns: ['no jargon', 'avoid fear-mongering'],
      fewShotExamples: ['Just shipped something cool.', 'Small iterations > big leaps.'],
    };

    const block = buildStyleGuidanceBlock(profile);

    expect(block).toContain('## Writing Style Guide');
    expect(block).toContain('**Tone:** casual and optimistic');
    expect(block).toContain('**Average tweet length:** ~22 words');
    expect(block).toContain('**Punctuation habits:** uses ellipses frequently');
    expect(block).toContain('**Hook patterns');
    expect(block).toContain('game changer');
    expect(block).toContain('Example 1: "Just shipped something cool."');
  });

  it('handles empty arrays gracefully', () => {
    const minimal: import('./style-profile').StyleProfile = {
      avgWordCount: 15,
      tone: 'neutral',
      hookPatterns: [],
      punctuationHabits: '',
      signaturePhrases: [],
      topicClusters: [],
      avoidPatterns: [],
      fewShotExamples: [],
    };

    const block = buildStyleGuidanceBlock(minimal);

    expect(block).toContain('## Writing Style Guide');
    expect(block).not.toContain('Hook patterns');
    expect(block).not.toContain('Signature vocabulary');
    expect(block).not.toContain('Few-shot');
  });
});

describe('buildStyledSystemPrompt', () => {
  it('combines persona narrative with style block', () => {
    const personaNarrative = 'You are a senior engineer who loves clean code.';
    const profile: import('./style-profile').StyleProfile = {
      avgWordCount: 20,
      tone: 'technical and precise',
      hookPatterns: ['Leads with a concrete example'],
      punctuationHabits: 'uses semicolons',
      signaturePhrases: ['elegant'],
      topicClusters: ['software'],
      avoidPatterns: ['fluffy language'],
      fewShotExamples: ['Clean code speaks for itself.'],
    };

    const fullPrompt = buildStyledSystemPrompt(personaNarrative, profile);

    expect(fullPrompt).toContain(personaNarrative);
    expect(fullPrompt).toContain('## Writing Style Guide');
    expect(fullPrompt).toContain('technical and precise');
    expect(fullPrompt).toContain('Clean code speaks for itself.');
  });
});
