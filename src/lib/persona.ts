import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function synthesizePersona(handle: string, tweets: any[]) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY is missing. Returning mock persona.');
    return {
      persona: `You are an AI clone of @${handle}. You are extremely bullish on Web3 and on-chain AI.`,
      tone: "Confident, analytical, forward-looking",
      topics: ["Web3", "AI", "Crypto"]
    };
  }

  const tweetText = tweets.map(t => t.text).join('\n---\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an expert behavioral analyst. Analyze the following tweets from @${handle} and extract a "Persona System Prompt" that can be used to instruct an AI to act exactly like this user.
          
Output JSON exactly in this format:
{
  "persona": "Detailed system prompt string here",
  "tone": "Brief description of the tone",
  "topics": ["Array of topics"]
}`
        },
        {
          role: 'user',
          content: `Here are the tweets:\n\n${tweetText}`
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No content returned from LLM');
    
    return JSON.parse(content);
  } catch (error) {
    console.error('Error synthesizing persona:', error);
    throw new Error('Failed to synthesize persona');
  }
}
