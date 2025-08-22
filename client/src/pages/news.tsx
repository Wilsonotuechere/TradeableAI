import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  RefreshCw,
  Newspaper,
  TrendingUp,
  TrendingDown,
  Brain,
  Clock,
  Twitter,
  MessageCircle,
  MessageSquare,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import GlassCard from "@/components/ui/glass-card";
import { formatDistanceToNow } from "date-fns";
import NewsSection from "@/components/news/NewsSection";

export default function News() {
  const [refreshingNews, setRefreshingNews] = useState(false);

  interface NewsData {
    data: {
      articles: any[];
      totalCount: number;
      analyzedCount: number;
      overallSentiment?: {
        positive: number;
        negative: number;
        neutral: number;
        total: number;
        dominantSentiment: string;
      };
    };
  }

  interface SocialData {
    data: {
      topics: Array<{
        topic: string;
        mentions: number;
        sentiment: "positive" | "negative" | "neutral";
        recentTweets: Array<{ text: string; createdAt: string }>;
      }>;
      totalMentions: number;
      overallSentiment: {
        positive: number;
        negative: number;
        neutral: number;
        total: number;
        dominantSentiment: string;
      };
    };
  }

  const {
    data: newsData,
    isLoading: newsLoading,
    error: newsError,
    refetch: refetchNews,
  } = useQuery<NewsData>({
    queryKey: ["/api/news"],
    refetchInterval: 300000, // Refresh every 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Add social data query
  const {
    data: socialData,
    isLoading: socialLoading,
    error: socialError,
    refetch: refetchSocial,
  } = useQuery<SocialData>({
    queryKey: ["/api/social/sentiment"],
    refetchInterval: 300000, // Refresh every 5 minutes
    retry: 2,
  });

  const handleRefresh = async () => {
    try {
      setRefreshingNews(true);
      await Promise.all([refetchNews(), refetchSocial()]);
    } catch (refreshError) {
      console.error("Error refreshing data:", refreshError);
    } finally {
      setRefreshingNews(false);
    }
  };

  if (newsLoading || socialLoading) {
    return (
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div
              className="h-8 bg-white/10 rounded mb-4"
              data-testid="loading-news"
            ></div>
            <div className="grid gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-white/10 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getErrorDetails = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isAPIError =
      message.includes("NEWS_API_KEY") ||
      message.includes("HUGGINGFACE_API_KEY") ||
      message.includes("TWITTER_BEARER_TOKEN");
    return { message, isAPIError };
  };

  if (newsError && socialError) {
    // Both services failed
    return (
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <GlassCard className="p-8 text-center">
            <div className="text-red-400 mb-3">
              Services temporarily unavailable
            </div>
            <p className="text-cool-gray">
              Unable to fetch news and social media data. Please try again
              later.
            </p>
          </GlassCard>
        </div>
      </div>
    );
  }

  // Process news data
  const articles = newsData?.data?.articles || [];
  const totalCount = newsData?.data?.totalCount || 0;
  const analyzedCount = newsData?.data?.analyzedCount || 0;

  // Show news error if only news failed
  const showNewsError = newsError && !socialError;
  const { message: newsErrorMessage, isAPIError: isNewsAPIError } =
    getErrorDetails(newsError);

  // Show social error if only social failed
  const showSocialError = socialError && !newsError;
  const { message: socialErrorMessage, isAPIError: isSocialAPIError } =
    getErrorDetails(socialError);

  // Calculate sentiment overview
  const sentimentCounts = articles.reduce(
    (acc, article) => {
      if (article.aiSentiment) {
        acc[article.aiSentiment.label]++;
      }
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 }
  );

  const totalAnalyzed = Object.values(sentimentCounts).reduce<number>(
    (a: number, b: unknown) => a + (b as number),
    0
  );

  return (
    <div className="pt-20">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-grotesk font-bold text-3xl mb-2">
                Crypto News & Sentiment
              </h1>
              <p className="text-cool-gray">
                Latest cryptocurrency news with AI-powered sentiment analysis
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshingNews}
              data-testid="button-refresh-news"
              className="bg-electric/20 border-electric/30 text-electric hover:bg-electric/30"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  refreshingNews ? "animate-spin" : ""
                }`}
              />
              {refreshingNews ? "Analyzing..." : "Refresh News"}
            </Button>
          </div>
        </div>

        {/* Sentiment Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cool-gray">Total Articles</span>
              <Newspaper className="text-electric" size={20} />
            </div>
            <div
              className="font-mono font-semibold text-2xl text-white"
              data-testid="text-total-articles"
            >
              {totalCount}
            </div>
            <div className="text-cool-gray text-sm">
              {analyzedCount} analyzed
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cool-gray">Positive</span>
              <TrendingUp className="text-emerald" size={20} />
            </div>
            <div
              className="font-mono font-semibold text-2xl text-emerald"
              data-testid="text-positive-count"
            >
              {sentimentCounts.positive}
            </div>
            <div className="text-cool-gray text-sm">
              {totalAnalyzed > 0
                ? `${Math.round(
                    (sentimentCounts.positive / totalAnalyzed) * 100
                  )}%`
                : "0%"}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cool-gray">Negative</span>
              <TrendingDown className="text-red-400" size={20} />
            </div>
            <div
              className="font-mono font-semibold text-2xl text-red-400"
              data-testid="text-negative-count"
            >
              {sentimentCounts.negative}
            </div>
            <div className="text-cool-gray text-sm">
              {totalAnalyzed > 0
                ? `${Math.round(
                    (sentimentCounts.negative / totalAnalyzed) * 100
                  )}%`
                : "0%"}
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cool-gray">Neutral</span>
              <Brain className="text-amber" size={20} />
            </div>
            <div
              className="font-mono font-semibold text-2xl text-amber"
              data-testid="text-neutral-count"
            >
              {sentimentCounts.neutral}
            </div>
            <div className="text-cool-gray text-sm">
              {totalAnalyzed > 0
                ? `${Math.round(
                    (sentimentCounts.neutral / totalAnalyzed) * 100
                  )}%`
                : "0%"}
            </div>
          </GlassCard>
        </div>

        {/* Social Sentiment */}
        {showSocialError ? (
          <GlassCard className="p-6 mb-8">
            <div className="flex items-center mb-4">
              <Twitter className="h-5 w-5 mr-2 text-electric" />
              <h2 className="font-grotesk font-semibold text-xl">
                Social Media Sentiment
              </h2>
            </div>
            <div className="text-red-400 mb-2">Unable to fetch social data</div>
            <p className="text-cool-gray">
              {isSocialAPIError
                ? "Social media service is temporarily unavailable. Please try again later."
                : socialErrorMessage}
            </p>
          </GlassCard>
        ) : (
          socialData?.data?.topics &&
          socialData.data.topics.length > 0 && (
            <div className="mb-8">
              <h2 className="font-grotesk font-semibold text-xl mb-4 flex items-center">
                <Twitter className="h-5 w-5 mr-2 text-electric" />
                Social Media Sentiment
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {socialData.data.topics.map((topic, index) => (
                  <GlassCard key={topic.topic} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Hash className="h-4 w-4 text-electric" />
                        <span className="font-medium text-white">
                          {topic.topic}
                        </span>
                      </div>
                      <Badge
                        className={`${
                          topic.sentiment === "positive"
                            ? "bg-emerald/20 text-emerald border-emerald/30"
                            : topic.sentiment === "negative"
                            ? "bg-red-400/20 text-red-400 border-red-400/30"
                            : "bg-amber/20 text-amber border-amber/30"
                        }`}
                      >
                        {topic.sentiment.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="text-2xl font-mono font-semibold mb-2">
                      {new Intl.NumberFormat().format(topic.mentions)}
                    </div>
                    <div className="text-cool-gray text-sm mb-4">mentions</div>

                    {/* Recent Tweets */}
                    <div className="space-y-3">
                      {topic.recentTweets?.map((tweet, i) => (
                        <div key={i} className="text-sm">
                          <div className="flex items-start space-x-2">
                            <MessageSquare className="h-3 w-3 text-electric mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-cool-gray leading-relaxed">
                                {tweet.text}
                              </p>
                              <span className="text-xs text-cool-gray/70">
                                {formatDistanceToNow(
                                  new Date(tweet.createdAt),
                                  {
                                    addSuffix: true,
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                ))}
              </div>

              {/* Social Sentiment Summary */}
              <div className="mt-4 text-center">
                <p className="text-cool-gray/70 text-sm">
                  Analyzed{" "}
                  {new Intl.NumberFormat().format(
                    socialData.data.totalMentions
                  )}{" "}
                  social media mentions • Overall sentiment:{" "}
                  {socialData.data.overallSentiment.dominantSentiment}• Last
                  updated: {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          )
        )}

        {/* News Articles */}
        <div>
          {showNewsError ? (
            <GlassCard className="p-8 text-center">
              <div className="text-red-400 mb-3">Unable to fetch news data</div>
              <p className="text-cool-gray">
                {isNewsAPIError
                  ? "News service is temporarily unavailable. Please try again later."
                  : newsErrorMessage}
              </p>
            </GlassCard>
          ) : articles.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Newspaper className="h-16 w-16 mx-auto text-cool-gray/50 mb-4" />
              <p className="text-cool-gray mb-4">No news articles available</p>
              <p className="text-cool-gray/70 text-sm">
                News data will appear here when available from our sources
              </p>
            </GlassCard>
          ) : (
            <NewsSection
              articles={articles.map((article) => ({
                id: article.id,
                title: article.title,
                content: article.content,
                source: article.source,
                publishedAt: article.publishedAt,
                url: article.url,
                urlToImage: article.urlToImage,
                sourceName: article.sourceName,
                aiSentiment: article.aiSentiment, // Include the sentiment data
              }))}
            />
          )}
        </div>

        {/* Footer Info */}
        {!showNewsError && articles.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-cool-gray/70 text-sm">
              Showing {articles.length} of {totalCount} articles • Real-time
              sentiment analysis powered by AI • Last updated:{" "}
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
