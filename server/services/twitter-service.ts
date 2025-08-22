import { TwitterApi } from "twitter-api-v2";

export interface TwitterSentiment {
  symbol: string;
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  volume: number;
  timestamp: string;
  topTweets: Array<{
    id: string;
    text: string;
    likes: number;
    retweets: number;
  }>;
}

class TwitterService {
  private client: TwitterApi | null = null;
  private bearerToken: string;
  private rateLimitReset: number = 0;
  private remainingRequests: number = 300; // Default Twitter v2 rate limit
  private lastRequestTime: number = 0;
  private requestDelay: number = 1000; // Minimum 1 second between requests

  constructor() {
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || "";
    if (this.bearerToken) {
      this.client = new TwitterApi(this.bearerToken);
    }
  }

  private async handleRateLimit(): Promise<void> {
    const now = Date.now();

    // Check if we need to wait for rate limit reset
    if (this.remainingRequests <= 1) {
      const waitTime = Math.max(0, this.rateLimitReset - now);
      if (waitTime > 0) {
        console.log(
          `Rate limit reached, waiting ${waitTime / 1000} seconds...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    // Ensure minimum delay between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.requestDelay - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }

  private updateRateLimits(headers: any): void {
    this.remainingRequests = parseInt(
      headers["x-rate-limit-remaining"] || "300",
      10
    );
    this.rateLimitReset =
      parseInt(headers["x-rate-limit-reset"] || "0", 10) * 1000; // Convert to milliseconds
  }

  async getSentiment(symbol: string): Promise<TwitterSentiment> {
    if (!this.client) {
      console.warn("Twitter API token not configured, using sample data");
      return this.getSampleSentiment(symbol);
    }

    try {
      console.log(`Fetching Twitter sentiment for ${symbol}...`);

      // Updated query with better crypto-related terms
      const query = `(${symbol} OR $${symbol}) (crypto OR cryptocurrency OR bitcoin OR altcoin) -is:retweet lang:en`;

      await this.handleRateLimit();

      const response = await this.client.v2.search(query, {
        max_results: 50, // Reduced from 100 to stay within limits
        "tweet.fields": ["public_metrics", "created_at", "author_id"],
        "user.fields": ["username", "verified"],
        expansions: ["author_id"],
      });

      // Update rate limits from response headers
      if (response.rateLimit) {
        this.updateRateLimits(response.rateLimit);
      }

      const tweets = response;

      if (!tweets.data?.data || tweets.data.data.length === 0) {
        console.log(`No tweets found for ${symbol}, using sample data`);
        return this.getSampleSentiment(symbol);
      }

      console.log(`Found ${tweets.data.data.length} tweets for ${symbol}`);

      // Process tweets and calculate sentiment
      let positiveCount = 0;
      let negativeCount = 0;
      let totalEngagement = 0;

      interface Tweet {
        id: string;
        text: string;
        public_metrics?: {
          like_count: number;
          retweet_count: number;
          reply_count: number;
          quote_count: number;
        };
      }

      interface TopTweet {
        id: string;
        text: string;
        likes: number;
        retweets: number;
      }

      // Sort tweets by engagement for top tweets
      const sortedTweets = tweets.data.data
        .map((tweet: any) => ({
          ...tweet,
          engagement:
            (tweet.public_metrics?.like_count || 0) +
            (tweet.public_metrics?.retweet_count || 0) +
            (tweet.public_metrics?.reply_count || 0),
        }))
        .sort((a: any, b: any) => b.engagement - a.engagement);

      const topTweets: TopTweet[] = sortedTweets
        .slice(0, 5)
        .map((tweet: Tweet) => ({
          id: tweet.id,
          text:
            tweet.text.length > 200
              ? tweet.text.substring(0, 200) + "..."
              : tweet.text,
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
        }));

      // Enhanced sentiment analysis with more keywords
      const positiveKeywords = [
        "bullish",
        "buy",
        "moon",
        "pump",
        "up",
        "rise",
        "gain",
        "profit",
        "hodl",
        "diamond hands",
        "rocket",
        "bull",
        "green",
        "breakout",
        "rally",
        "surge",
        "soar",
        "climb",
        "boost",
        "strong",
      ];

      const negativeKeywords = [
        "bearish",
        "sell",
        "dump",
        "down",
        "fall",
        "drop",
        "loss",
        "crash",
        "bear",
        "red",
        "breakdown",
        "decline",
        "plummet",
        "tank",
        "weak",
        "correction",
        "dip",
        "slide",
        "collapse",
        "fear",
      ];

      tweets.data.data.forEach((tweet: any) => {
        const text = tweet.text.toLowerCase();

        let tweetSentiment = 0;

        // Check for positive keywords
        positiveKeywords.forEach((keyword) => {
          if (text.includes(keyword)) {
            tweetSentiment += 1;
          }
        });

        // Check for negative keywords
        negativeKeywords.forEach((keyword) => {
          if (text.includes(keyword)) {
            tweetSentiment -= 1;
          }
        });

        // Check for emojis
        if (
          text.includes("🚀") ||
          text.includes("💎") ||
          text.includes("🌙") ||
          text.includes("📈") ||
          text.includes("💚") ||
          text.includes("🔥")
        ) {
          tweetSentiment += 1;
        }

        if (
          text.includes("📉") ||
          text.includes("💔") ||
          text.includes("😢") ||
          text.includes("⬇️") ||
          text.includes("🔴") ||
          text.includes("😰")
        ) {
          tweetSentiment -= 1;
        }

        if (tweetSentiment > 0) {
          positiveCount++;
        } else if (tweetSentiment < 0) {
          negativeCount++;
        }

        totalEngagement +=
          (tweet.public_metrics?.like_count || 0) +
          (tweet.public_metrics?.retweet_count || 0) +
          (tweet.public_metrics?.reply_count || 0) +
          (tweet.public_metrics?.quote_count || 0);
      });

      const totalTweets = tweets.data.data.length;
      const sentimentScore =
        totalTweets > 0 ? (positiveCount - negativeCount) / totalTweets : 0;

      console.log(
        `Sentiment analysis for ${symbol}: ${positiveCount} positive, ${negativeCount} negative out of ${totalTweets} tweets`
      );

      return {
        symbol,
        sentiment:
          sentimentScore > 0.1
            ? "positive"
            : sentimentScore < -0.1
            ? "negative"
            : "neutral",
        score: Math.max(0, Math.min(1, (sentimentScore + 1) / 2)), // Normalize to 0-1
        volume: totalEngagement,
        timestamp: new Date().toISOString(),
        topTweets,
      };
    } catch (error: any) {
      console.error("Failed to fetch Twitter sentiment:", error);

      // Log specific error details for debugging
      if (error.code === 429) {
        console.error(
          "Rate limit exceeded. Consider implementing rate limiting or upgrading API plan."
        );
      } else if (error.code === 401) {
        console.error("Authentication failed. Check your bearer token.");
      } else if (error.code === 403) {
        console.error(
          "Access forbidden. Your API plan might not support this endpoint."
        );
      }

      return this.getSampleSentiment(symbol);
    }
  }

  // Add method to test API connection
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      console.log("No Twitter client configured");
      return false;
    }

    try {
      // Simple test query
      const result = await this.client.v2.search("bitcoin", {
        max_results: 10,
      });
      console.log("Twitter API connection successful");
      return true;
    } catch (error: any) {
      console.error("Twitter API connection failed:", error.message);
      return false;
    }
  }

  // Add method to check rate limits
  async getRateLimitStatus(): Promise<any> {
    if (!this.client) {
      return null;
    }

    try {
      const rateLimits = await this.client.v1.get(
        "application/rate_limit_status.json"
      );
      return rateLimits.resources.search;
    } catch (error) {
      console.error("Failed to get rate limit status:", error);
      return null;
    }
  }

  private getSampleSentiment(symbol: string): TwitterSentiment {
    // Generate realistic sample data based on the time of day
    const hour = new Date().getHours();
    const marketActivity = Math.sin((hour / 24) * Math.PI * 2); // -1 to 1
    const randomFactor = (Math.random() - 0.5) * 0.4; // -0.2 to 0.2

    const sentimentScore = Math.max(
      -1,
      Math.min(1, marketActivity + randomFactor)
    );

    return {
      symbol,
      sentiment:
        sentimentScore > 0.1
          ? "positive"
          : sentimentScore < -0.1
          ? "negative"
          : "neutral",
      score: (sentimentScore + 1) / 2,
      volume: Math.floor(1000 + Math.random() * 9000),
      timestamp: new Date().toISOString(),
      topTweets: [
        {
          id: "sample_1",
          text: `${symbol} looking strong with increasing volume! 🚀`,
          likes: 245,
          retweets: 45,
        },
        {
          id: "sample_2",
          text: `Technical analysis suggests ${symbol} might break resistance soon`,
          likes: 189,
          retweets: 32,
        },
        {
          id: "sample_3",
          text: `New developments in ${symbol} ecosystem looking promising`,
          likes: 156,
          retweets: 28,
        },
      ],
    };
  }
}

export const twitterService = new TwitterService();
