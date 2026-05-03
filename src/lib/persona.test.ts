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

import { synthesizePersona } from './persona';

describe('synthesizePersona', () => {
  beforeEach(() => {
    personaMocks.chatCreate.mockReset();
    delete process.env.ZERO_G_COMPUTE_BASE_URL;
    delete process.env.ZERO_G_COMPUTE_API_KEY;
    delete process.env.ZERO_G_COMPUTE_MODEL;
    delete process.env.OPENAI_MODEL;
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  it('deduplicates tweets and returns a validated persona payload', async () => {
    personaMocks.chatCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              persona: 'A thoughtful, technical, and opinionated operator who writes in a clear, concise style with a strong preference for practical systems, disciplined execution, and direct language. They value leverage, product quality, fast feedback loops, and strong abstractions, while remaining grounded in concrete outcomes. Their thinking is structured and they tend to reduce complexity into actionable steps. They speak with confidence, but they stay precise and avoid fluff.',
              tone: 'direct and technical',
              topics: ['systems', 'product', 'execution'],
            }),
          },
        },
      ],
    });

    const result = await synthesizePersona('astron', [
      { text: 'ship it' },
      { text: 'ship it' },
      { text: 'build better systems' },
    ]);

    expect(result.tone).toBe('direct and technical');
    expect(result.topics).toEqual(['systems', 'product', 'execution']);
    // Two LLM calls are made in parallel: one for persona synthesis, one for style profile extraction
    expect(personaMocks.chatCreate).toHaveBeenCalledTimes(2);
    const call = personaMocks.chatCreate.mock.calls[0][0];
    expect(call.messages[1].content).toContain('ship it');
    expect(call.messages[1].content).toContain('build better systems');
  });

  it('rejects invalid JSON responses', async () => {
    // First call = persona synthesis (broken JSON), second call = style extraction (fails silently)
    personaMocks.chatCreate
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{not-json' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({
          avgWordCount: 10, tone: 'neutral', hookPatterns: [], punctuationHabits: '',
          signaturePhrases: [], topicClusters: [], avoidPatterns: [], fewShotExamples: [],
        }) } }],
      });

    await expect(
      synthesizePersona('astron', [{ text: 'one tweet with substance' }])
    ).rejects.toThrow(/invalid JSON/i);
  });
});