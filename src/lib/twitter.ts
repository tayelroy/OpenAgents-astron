import { ApifyClient } from 'apify-client';

// Initialize the ApifyClient with API token
const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN || '',
});

export async function scrapeTweets(handle: string, limit: number = 100) {
  if (!process.env.APIFY_API_TOKEN) {
    console.warn('APIFY_API_TOKEN is missing. Returning mock tweet data.');
    return mockTweets(handle);
  }

  try {
    // Calling an Apify actor for Twitter scraping, e.g. "quacker/twitter-scraper"
    const run = await client.actor('quacker/twitter-scraper').call({
      profiles: [handle],
      tweetsDesired: limit,
      addUserInfo: true,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return items.map((item: any) => ({
      text: item.full_text || item.text,
      createdAt: item.created_at,
      retweets: item.retweet_count,
      likes: item.favorite_count,
    }));
  } catch (error) {
    console.error('Error scraping tweets:', error);
    throw new Error('Failed to scrape tweets from Apify');
  }
}

function mockTweets(handle: string) {
  return [
    { text: `Just deployed a new protocol. Very bullish on on-chain AI.`, createdAt: new Date().toISOString() },
    { text: `Thinking about the hermes architecture... it changes everything.`, createdAt: new Date().toISOString() },
    { text: `If you aren't building in Web3 right now, what are you even doing?`, createdAt: new Date().toISOString() },
  ];
}
