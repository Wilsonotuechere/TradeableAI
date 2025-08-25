import fetch, { Response, RequestInit } from "node-fetch";
import type { BinanceTickerResponse, BinanceError } from "../types/binance";
import {
  analyzeMultipleTexts,
  calculateOverallSentiment,
  SentimentResult,
  KeywordSentimentResult,
  SentimentAnalysisError,
} from "./huggingface-service";

// Custom error class for market analysis
export class MarketAnalysisError extends Error {
  public errorCode: string;
  public statusCode: number;
  public details?: unknown;

  constructor(
    message: string,
    errorCode: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message);
    this.name = "MarketAnalysisError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface ExtendedSentimentResult extends SentimentResult {
  method: string;
  confidence: number;
}

// Type guard for BinanceError
function isBinanceError(error: unknown): error is BinanceError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as BinanceError).code === "string" &&
    "message" in error &&
    typeof (error as BinanceError).message === "string"
  );
}

interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: string;
}

interface NewsArticle {
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  source: string;
}

interface MarketAnalysis {
  coin: {
    symbol: string;
    name: string;
    price: number;
    priceChange24h: number;
    volume24h: number;
    marketCap: number;
  };
  technicalAnalysis: {
    rsi: number;
    macd: {
      value: number;
      signal: number;
      histogram: number;
    };
    movingAverages: {
      sma20: number;
      sma50: number;
      sma200: number;
    };
  };
  aiAnalysis: string;
  timestamp: string;
}

// Configuration
const BINANCE_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000,
  baseUrl: "https://api.binance.com",
};

const NEWS_CONFIG = {
  timeout: 15000,
  maxArticles: 5,
};

/**
 * Fetch data with retry logic and timeout handling
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries: number = BINANCE_CONFIG.retries
): Promise<T> {
  let lastError: Error = new Error("Request failed");
  let timeoutId: NodeJS.Timeout | undefined;
  const controller = new AbortController();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      timeoutId = setTimeout(() => controller.abort(), BINANCE_CONFIG.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "User-Agent": "TradingApp/1.0",
          Accept: "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new MarketAnalysisError(
          `HTTP error! status: ${response.status} - ${response.statusText}`,
          "API_ERROR",
          response.status
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        lastError = error;

        const isRetryableError =
          error.name === "AbortError" ||
          (error instanceof MarketAnalysisError && error.statusCode >= 500) ||
          ("code" in error &&
            typeof error.code === "string" &&
            ["UND_ERR_CONNECT_TIMEOUT", "ECONNRESET", "ENOTFOUND"].includes(
              error.code
            ));

        if (attempt < retries && isRetryableError) {
          const delay = BINANCE_CONFIG.retryDelay * Math.pow(2, attempt);
          console.warn(
            `Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
            error.message
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Get market data from Binance API
 */
export async function getBinanceMarketData(
  symbol: string = "BTCUSDT"
): Promise<MarketData> {
  try {
    console.log(`Fetching real market data from Binance for ${symbol}...`);

    const url = `${
      BINANCE_CONFIG.baseUrl
    }/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`;
    const data = await fetchWithRetry<BinanceTickerResponse>(url);

    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChange),
      volume24h: parseFloat(data.volume),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Market data error:", error);
    if (error instanceof MarketAnalysisError) {
      throw error;
    }
    if (isBinanceError(error)) {
      throw new MarketAnalysisError(
        `Failed to fetch market data for ${symbol}: ${error.message}`,
        "BINANCE_ERROR",
        500,
        { binanceCode: error.code }
      );
    }
    throw new MarketAnalysisError(
      `Failed to fetch market data for ${symbol}`,
      "UNKNOWN_ERROR",
      500,
      error
    );
  }
}

/**
 * Get cryptocurrency news (mock implementation - replace with real news API)
 */
async function getCryptoNews(coin: string): Promise<NewsArticle[]> {
  try {
    // This is a mock implementation. Replace with actual news API like:
    // - CryptoNews API
    // - NewsAPI.org
    // - CoinGecko News API
    // - Alpha Vantage News API

    const mockNews: NewsArticle[] = [
      {
        title: `${coin} shows strong momentum amid institutional adoption`,
        content: `Recent market analysis suggests that ${coin} is experiencing bullish momentum driven by increased institutional interest. Major corporations have announced significant investments in cryptocurrency infrastructure, leading to positive sentiment among traders and investors.`,
        url: `https://example.com/news/${coin.toLowerCase()}-momentum`,
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        source: "CryptoDaily",
      },
      {
        title: `Technical analysis: ${coin} breaks key resistance level`,
        content: `${coin} has successfully broken through a critical resistance level at recent trading sessions. Technical indicators suggest continued upward movement, with analysts setting higher price targets for the coming weeks.`,
        url: `https://example.com/news/${coin.toLowerCase()}-technical`,
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        source: "TradingView",
      },
      {
        title: `Regulatory clarity boosts ${coin} market confidence`,
        content: `Recent regulatory developments have provided much-needed clarity for the cryptocurrency sector. This positive regulatory environment is expected to drive further adoption and institutional investment in ${coin} and other digital assets.`,
        url: `https://example.com/news/${coin.toLowerCase()}-regulation`,
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        source: "CoinDesk",
      },
    ];

    return mockNews.slice(0, NEWS_CONFIG.maxArticles);
  } catch (error) {
    console.error("Error fetching crypto news:", error);
    return [];
  }
}

/**
 * Analyze news sentiment for a specific coin
 */
async function analyzeNewsForCoin(coin: string): Promise<{
  overallSentiment: string;
  confidence: number;
  breakdown: any;
  articles: any[];
}> {
  try {
    const newsArticles = await getCryptoNews(coin);

    if (newsArticles.length === 0) {
      console.log("No news articles found, returning neutral sentiment");
      return {
        overallSentiment: "neutral",
        confidence: 0.5,
        breakdown: {
          positive: 0,
          negative: 0,
          neutral: 1,
          total: 1,
          averageConfidence: 0.5,
        },
        articles: [],
      };
    }

    // Extract text content for sentiment analysis
    const textsToAnalyze = newsArticles.map((article) =>
      `${article.title} ${article.content}`.substring(0, 500)
    );

    // Analyze all articles in parallel
    const sentimentResults = await analyzeMultipleTexts(textsToAnalyze, 3);

    // Combine articles with their sentiment analysis
    const analyzedArticles = newsArticles.map((article, index) => ({
      ...article,
      sentiment: sentimentResults[index]?.sentiment || "neutral",
      confidence: sentimentResults[index]?.confidence || 0.5,
      method: "ai",
    }));

    // Calculate overall sentiment
    const overallAnalysis = calculateOverallSentiment(sentimentResults);

    return {
      overallSentiment: overallAnalysis.sentiment,
      confidence: overallAnalysis.confidence,
      breakdown: overallAnalysis.breakdown,
      articles: analyzedArticles,
    };
  } catch (error) {
    console.error("Error in news sentiment analysis:", error);
    return {
      overallSentiment: "neutral",
      confidence: 0.3,
      breakdown: {
        positive: 0,
        negative: 0,
        neutral: 1,
        total: 1,
        averageConfidence: 0.3,
      },
      articles: [],
    };
  }
}

/**
 * Calculate technical indicators
 */
function calculateTechnicalIndicators(marketData: MarketData): {
  support: number;
  resistance: number;
  trend: string;
} {
  const { price, high24h, low24h, change24h } = marketData;

  // Simple technical analysis calculations
  const support = low24h * 0.98; // 2% below 24h low
  const resistance = high24h * 1.02; // 2% above 24h high

  let trend = "neutral";
  if (change24h > price * 0.03) {
    // More than 3% gain
    trend = "bullish";
  } else if (change24h < -price * 0.03) {
    // More than 3% loss
    trend = "bearish";
  }

  return {
    support: Math.round(support * 100) / 100,
    resistance: Math.round(resistance * 100) / 100,
    trend,
  };
}

/**
 * Generate comprehensive market analysis
 */
function generateAIAnalysis(
  symbol: string,
  newsAnalysis: any,
  technicalAnalysis: any,
  percentChange24h: number
): string {
  const sentiment = newsAnalysis?.overallSentiment || "neutral";
  const trend = technicalAnalysis?.trend || "sideways";
  const strength = Math.abs(percentChange24h);

  const marketCondition = percentChange24h >= 0 ? "bullish" : "bearish";
  const sentimentDescription =
    sentiment === "positive"
      ? "positive"
      : sentiment === "negative"
      ? "negative"
      : "neutral";

  return `${symbol} Analysis Summary:

Market Sentiment: The overall market sentiment for ${symbol} is ${sentimentDescription} with a ${marketCondition} bias. News analysis indicates ${
    newsAnalysis?.articles?.length || 0
  } recent significant developments affecting the asset's performance.

Technical Outlook: The market is showing a ${trend} trend with ${strength.toFixed(
    1
  )}% price movement in the last 24 hours. Key support levels are established around $${technicalAnalysis.support.toFixed(
    2
  )}, while resistance is observed at $${technicalAnalysis.resistance.toFixed(
    2
  )}.

Market Structure: Current price action suggests ${
    percentChange24h >= 0
      ? "upward momentum with potential for continuation"
      : "downward pressure with possible consolidation needed"
  }. Volume profiles indicate ${
    strength > 5 ? "strong" : strength > 2 ? "moderate" : "normal"
  } market participation.

Risk Assessment: Given the current ${marketCondition} market conditions and ${sentimentDescription} sentiment, the asset presents a ${
    strength > 5 ? "high" : strength > 2 ? "moderate" : "low"
  } risk profile. Traders should consider position sizing and risk management accordingly.

Trading Considerations:
• Sentiment: ${sentimentDescription.toUpperCase()}
• Trend: ${trend.toUpperCase()}
• Volatility: ${strength > 5 ? "HIGH" : strength > 2 ? "MODERATE" : "LOW"}
• Key Levels: Support at $${technicalAnalysis.support.toFixed(
    2
  )}, Resistance at $${technicalAnalysis.resistance.toFixed(2)}

Always conduct your own research and consider multiple factors before making trading decisions.`;
}

export async function generateMarketAnalysis(coinInfo: {
  symbol: string;
  name: string;
  price: string;
  priceChangePercent24h: string;
  volume24h: string;
  marketCap: string;
}): Promise<{
  coin: {
    symbol: string;
    name: string;
    price: number;
    priceChange24h: number;
    volume24h: number;
    marketCap: number;
  };
  technicalAnalysis: {
    rsi: number;
    macd: {
      value: number;
      signal: number;
      histogram: number;
    };
    movingAverages: {
      sma20: number;
      sma50: number;
      sma200: number;
    };
  };
  aiAnalysis: string;
  timestamp: string;
}> {
  try {
    if (!coinInfo?.symbol) {
      throw new MarketAnalysisError(
        "Invalid coin info: symbol is required",
        "INVALID_COIN",
        400
      );
    }

    console.log(`Generating market analysis for ${coinInfo.symbol}...`);

    // Get market data and news analysis with fallbacks
    let marketData;
    let newsAnalysis;

    try {
      [marketData, newsAnalysis] = await Promise.all([
        getBinanceMarketData(coinInfo.symbol + "USDT"),
        analyzeNewsForCoin(coinInfo.symbol),
      ]);
    } catch (error) {
      console.log(
        `Using fallback data for ${coinInfo.symbol} due to API restrictions`
      );
      // Use fallback data when APIs fail
      marketData = {
        symbol: coinInfo.symbol,
        price: parseFloat(coinInfo.price),
        change24h: parseFloat(coinInfo.priceChangePercent24h),
        volume24h: parseFloat(coinInfo.volume24h),
        high24h: parseFloat(coinInfo.price) * 1.05,
        low24h: parseFloat(coinInfo.price) * 0.95,
        timestamp: new Date().toISOString(),
      };
      newsAnalysis = {
        overallSentiment: "neutral" as const,
        sentiment: "neutral" as const,
        confidence: 0.5,
        summary: "No recent news analysis available due to API limitations.",
        articles: [],
      };
    }

    // Calculate percentage change
    const percentChange24h = parseFloat(coinInfo.priceChangePercent24h);

    // Calculate RSI and other technical indicators
    const technicalAnalysis = calculateTechnicalIndicators(marketData);
    const macd = {
      value: percentChange24h > 0 ? 0.5 : -0.5,
      signal: 0,
      histogram: percentChange24h / 100,
    };

    const analysis = {
      coin: {
        symbol: coinInfo.symbol,
        name: coinInfo.name,
        price: parseFloat(coinInfo.price),
        priceChange24h: percentChange24h,
        volume24h: parseFloat(coinInfo.volume24h),
        marketCap: parseFloat(coinInfo.marketCap),
      },
      technicalAnalysis: {
        rsi: 50 + percentChange24h, // Simplified RSI calculation
        macd,
        movingAverages: {
          sma20: technicalAnalysis.support,
          sma50: marketData.price,
          sma200: technicalAnalysis.resistance,
        },
      },
      aiAnalysis: generateAIAnalysis(
        coinInfo.symbol,
        newsAnalysis,
        technicalAnalysis,
        percentChange24h
      ),
      timestamp: new Date().toISOString(),
    };

    console.log(`Market analysis completed for ${coinInfo.symbol}`);
    return analysis;
  } catch (error) {
    console.error("Error generating market analysis:", error);
    if (error instanceof MarketAnalysisError) {
      throw error;
    }
    throw new MarketAnalysisError(
      `Failed to generate market analysis for ${coinInfo.symbol}`,
      "ANALYSIS_ERROR",
      500,
      error
    );
  }
}

/**
 * Helper function to get coin full name
 */
function getCoinName(symbol: string): string {
  const coinNames = {
    BTC: "Bitcoin",
    ETH: "Ethereum",
    BNB: "Binance Coin",
    ADA: "Cardano",
    SOL: "Solana",
    XRP: "Ripple",
    DOT: "Polkadot",
    DOGE: "Dogecoin",
    AVAX: "Avalanche",
    MATIC: "Polygon",
  };

  const uppercaseSymbol = symbol.toUpperCase() as keyof typeof coinNames;
  return coinNames[uppercaseSymbol] || uppercaseSymbol;
}

/**
 * Get multiple coins analysis (for portfolio view)
 */
export async function getMultiCoinAnalysis(
  coins: Array<{
    symbol: string;
    name: string;
    price: string;
    priceChangePercent24h: string;
    volume24h: string;
    marketCap: string;
  }>
): Promise<MarketAnalysis[]> {
  try {
    if (!Array.isArray(coins) || coins.length === 0) {
      throw new MarketAnalysisError(
        "Invalid input: coins array must not be empty",
        "INVALID_INPUT",
        400
      );
    }

    // Process coins in parallel with limited concurrency
    const maxConcurrency = 3;
    const results: MarketAnalysis[] = [];

    for (let i = 0; i < coins.length; i += maxConcurrency) {
      const batch = coins.slice(i, i + maxConcurrency);
      const batchPromises = batch.map((coinInfo) =>
        generateMarketAnalysis(coinInfo)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          console.error(`Failed to analyze ${batch[index]}:`, result.reason);
        }
      });
    }

    return results;
  } catch (error) {
    console.error("Error in multi-coin analysis:", error);
    throw error;
  }
}

export { MarketData, NewsArticle, MarketAnalysis };
