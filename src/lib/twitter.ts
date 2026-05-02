export type TweetRecord = {
  text: string;
  createdAt?: string;
  retweets?: number;
  likes?: number;
};

export type TweetScrapeResult = {
  tweets: TweetRecord[];
  verification: {
    source: 'apify' | 'mock';
    ok: boolean;
    handle: string;
    limit: number;
    itemCount: number;
    actor?: string;
    datasetId?: string;
    runId?: string;
    error?: string;
  };
};

export async function scrapeTweets(handle: string, limit: number = 100): Promise<TweetScrapeResult> {
  // Dynamic import to prevent Turbopack from resolving Node.js built-ins at bundle time
  const { ApifyClient } = await import('apify-client');
  const client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN || '',
  });
  if (!process.env.APIFY_API_TOKEN) {
    console.warn('APIFY_API_TOKEN is missing. Returning mock tweet data.');
    const tweets = mockTweets(handle);
    return {
      tweets,
      verification: {
        source: 'mock',
        ok: true,
        handle,
        limit,
        itemCount: tweets.length,
      },
    };
  }

  try {
    // Calling the configured Apify actor for Twitter scraping
    const actorId = '61RPP7dywgiy0JPD0';
    const run = await client.actor(actorId).call({
      profiles: [handle],
      tweetsDesired: limit,
      addUserInfo: true,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const tweets = items.map((item: any) => ({
      text: item.full_text || item.text,
      createdAt: item.created_at,
      retweets: item.retweet_count,
      likes: item.favorite_count,
    }));

    return {
      tweets,
      verification: {
        source: 'apify',
        ok: true,
        handle,
        limit,
        itemCount: items.length,
        actor: actorId,
        datasetId: run.defaultDatasetId,
        runId: run.id,
      },
    };
  } catch (error) {
    console.error('Error scraping tweets:', error);
    const mock = mockTweets(handle);
    return {
      tweets: mock,
      verification: {
        source: 'mock',
        ok: false,
        handle,
        limit,
        itemCount: mock.length,
        error: error instanceof Error ? error.message : 'Failed to scrape tweets from Apify',
      },
    };
  }
}

function mockTweets(handle: string): TweetRecord[] {
  return [
    { text: `Just deployed a new protocol. Very bullish on on-chain AI.`, createdAt: new Date().toISOString() },
    { text: `Thinking about the hermes architecture... it changes everything.`, createdAt: new Date().toISOString() },
    { text: `If you aren't building in Web3 right now, what are you even doing?`, createdAt: new Date().toISOString() },
  ];
}
