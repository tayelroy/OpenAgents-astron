export type TweetRecord = {
  text: string;
  createdAt?: string;
  retweets?: number;
  likes?: number;
};

export type TweetScrapeResult = {
  tweets: TweetRecord[];
  verification: {
    source: 'twitter-api';
    ok: boolean;
    handle: string;
    limit: number;
    itemCount: number;
    endpoint?: string;
    nextToken?: string;
    error?: string;
  };
};

export async function scrapeTweets(handle: string, limit: number = 100): Promise<TweetScrapeResult> {
  const bearerToken = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) {
    throw new Error('X_BEARER_TOKEN (or TWITTER_BEARER_TOKEN) is missing');
  }

  try {
    const endpoint = new URL('https://api.twitter.com/2/tweets/search/all');
    endpoint.searchParams.set('query', `from:${handle} -is:retweet -is:reply`);
    endpoint.searchParams.set('max_results', '100');
    endpoint.searchParams.set('tweet.fields', 'created_at,public_metrics');

    const tweets: TweetRecord[] = [];
    let nextToken: string | undefined;

    while (tweets.length < limit) {
      const pageUrl = new URL(endpoint.toString());
      if (nextToken) {
        pageUrl.searchParams.set('next_token', nextToken);
      }

      const response = await fetch(pageUrl.toString(), {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `Twitter API request failed (${response.status}): ${body || response.statusText}`
        );
      }

      const payload = await response.json();
      const items = Array.isArray(payload?.data) ? payload.data : [];

      for (const item of items) {
        const referencedTweets = Array.isArray(item?.referenced_tweets) ? item.referenced_tweets : [];
        const isRetweet = referencedTweets.some((ref: any) => ref?.type === 'retweeted');
        const isReply = referencedTweets.some((ref: any) => ref?.type === 'replied_to');
        if (isRetweet || isReply) {
          continue;
        }

        tweets.push({
          text: item.text,
          createdAt: item.created_at,
          retweets: item.public_metrics?.retweet_count,
          likes: item.public_metrics?.like_count,
        });

        if (tweets.length >= limit) {
          break;
        }
      }

      nextToken = payload?.meta?.next_token;
      if (!nextToken || items.length === 0) {
        break;
      }
    }

    return {
      tweets,
      verification: {
        source: 'twitter-api',
        ok: true,
        handle,
        limit,
        itemCount: tweets.length,
        endpoint: 'https://api.twitter.com/2/tweets/search/all',
        nextToken,
      },
    };
  } catch (error) {
    console.error('Error scraping tweets:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to scrape tweets from Twitter API');
  }
}
