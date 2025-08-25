import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatHistorySchema, ChatMessage } from "@shared/schema";
import newsRoutes from "./routes/news";
import chatRoutes from "./routes/chat";
import marketRoutes from "./routes/market";

// Simple in-memory cache
class SimpleCache {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();

  set(key: string, data: any, ttlMs: number = 300000) {
    // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  getSize() {
    return this.cache.size;
  }
}

const cache = new SimpleCache();
import {
  TechnicalIndicators,
  MarketAnalysis,
  MarketSentiment,
  NewsAnalysis,
  SocialAnalysis,
  InvestmentRecommendation,
  InvestmentAnalysisResponse,
} from "@shared/types/market-analysis";
import { randomUUID } from "crypto";
import {
  binanceClient,
  coinGeckoClient,
  newsClient,
  sentimentClient,
  twitterClient,
  aiClient,
} from "./api-clients";
import { determineMessageIntent } from "./utils/message-intent";
import { callGeminiAPI, generateChatPrompt } from "./services/gemini-service";
import { generateMarketAnalysis } from "./services/market-analysis-service";

// Helper functions for fallback data
function getBasePriceForSymbol(symbol: string): number {
  const prices: Record<string, number> = {
    BTC: 65000,
    BTCUSDT: 65000,
    ETH: 3500,
    ETHUSDT: 3500,
    BNB: 550,
    BNBUSDT: 550,
    SOL: 180,
    SOLUSDT: 180,
    XRP: 0.65,
    XRPUSDT: 0.65,
    DOGE: 0.18,
    DOGEUSDT: 0.18,
    ADA: 0.55,
    ADAUSDT: 0.55,
    MATIC: 0.92,
    MATICUSDT: 0.92,
    DOT: 8.5,
    DOTUSDT: 8.5,
    AVAX: 42,
    AVAXUSDT: 42,
  };
  return prices[symbol.toUpperCase()] || 100;
}

function generateSampleCandles(
  basePrice: number,
  count: number
): Array<{
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}> {
  const candles = [];
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  let currentPrice = basePrice;

  for (let i = count - 1; i >= 0; i--) {
    const time = now - i * hourMs;
    const volatility = 0.02; // 2% volatility
    const change = (Math.random() - 0.5) * volatility;

    const open = currentPrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.random() * 1000000 + 500000;

    candles.push({ time, open, high, low, close, volume });
    currentPrice = close;
  }

  return candles;
}
import { investmentAnalysisService } from "./services/investment-analysis-service";

// Error handling class for API errors
class CustomAPIError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details?: any
  ) {
    super(message);
    this.name = "CustomAPIError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Global error handler middleware
function errorHandler(
  err: Error | CustomAPIError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("Error:", err);

  if (err instanceof CustomAPIError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
      },
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    success: false,
    error: {
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
  });
}

// Async route handler wrapper
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Cache middleware
const cacheMiddleware = (ttlMs: number = 300000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.method}:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      console.log(`Cache hit: ${key}`);
      return res.json({
        ...cached,
        cached: true,
        cacheTimestamp: new Date().toISOString(),
      });
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode === 200 && data.success) {
        cache.set(key, data, ttlMs);
        console.log(`Cached response: ${key}`);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    const startTime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.json({
      status: "ok",
      uptime: startTime,
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
      },
      cache: {
        size: cache.getSize(),
        entries: cache.getSize(),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Market data routes with caching
  app.get(
    "/api/market",
    cacheMiddleware(180000), // 3 minutes cache
    asyncHandler(async (req, res) => {
      console.log("Fetching real market data from Binance...");

      try {
        const startTime = Date.now();
        const [realMarketData, realMarketStats] = await Promise.all([
          binanceClient.getTopCryptocurrencies(20),
          binanceClient.getMarketStats(),
        ]);

        const duration = Date.now() - startTime;
        console.log(`Market data fetched in ${duration}ms`);

        if (!realMarketData?.length) {
          throw new CustomAPIError(
            "No market data available",
            503,
            "NO_MARKET_DATA"
          );
        }

        res.json({
          success: true,
          data: {
            coins: realMarketData,
            stats: realMarketStats,
            dataSource: "Real-time market data",
            lastUpdated: new Date().toISOString(),
            responseTime: duration,
          },
        });
      } catch (error) {
        console.error("Market data error:", error);

        try {
          const fallbackData = await storage.getMarketData();
          const fallbackStats = await storage.getMarketStats();

          if (!fallbackData?.length) {
            throw new CustomAPIError(
              "No market data available",
              503,
              "NO_MARKET_DATA"
            );
          }

          res.json({
            success: true,
            data: {
              coins: fallbackData,
              stats: fallbackStats,
              dataSource: "Fallback data",
              lastUpdated: new Date().toISOString(),
            },
            warning: "Using cached data due to API connectivity issues",
          });
        } catch (fallbackError) {
          throw new CustomAPIError(
            "Failed to fetch market data",
            503,
            "MARKET_DATA_UNAVAILABLE",
            {
              originalError:
                error instanceof Error ? error.message : "Unknown error",
              suggestion: "Try again later or check your connection",
            }
          );
        }
      }
    })
  );

  // Market Data Chart routes
  app.get(
    "/api/market/data",
    asyncHandler(async (req, res) => {
      const { symbol, interval = "1h", limit = "100" } = req.query;

      if (!symbol) {
        throw new CustomAPIError("Symbol is required", 400, "INVALID_REQUEST", {
          required: ["symbol"],
        });
      }

      try {
        const candleData = (await binanceClient.getKlines({
          symbol: symbol as string,
          interval: interval as string,
          limit: parseInt(limit as string),
        })) as [number, string, string, string, string, string][];

        const candles = candleData.map((candle) => ({
          time: candle[0],
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5]),
        }));

        const closePrices = candles.map((c) => c.close);

        // Calculate indicators
        const rsi = calculateRSI(closePrices).pop() || 50;
        const sma20 =
          calculateSMA(closePrices, 20).pop() ||
          closePrices[closePrices.length - 1];

        const priceChange24h =
          ((closePrices[closePrices.length - 1] - closePrices[0]) /
            closePrices[0]) *
          100;
        const volumeChange24h =
          ((candles[candles.length - 1].volume - candles[0].volume) /
            candles[0].volume) *
          100;

        res.json({
          success: true,
          data: {
            symbol: symbol as string,
            interval: interval as string,
            candles,
            indicators: {
              rsi,
              sma20,
              priceChange24h,
              volumeChange24h,
            },
            lastUpdated: new Date().toISOString(),
          },
        });
      } catch (error) {
        // Generate realistic sample chart data when Binance API fails
        const basePrice = getBasePriceForSymbol(symbol as string);
        const candles = generateSampleCandles(
          basePrice,
          parseInt(limit as string)
        );
        const closePrices = candles.map((c) => c.close);

        const rsi = calculateRSI(closePrices).pop() || 50;
        const sma20 =
          calculateSMA(closePrices, 20).pop() ||
          closePrices[closePrices.length - 1];

        const priceChange24h =
          ((closePrices[closePrices.length - 1] - closePrices[0]) /
            closePrices[0]) *
          100;
        const volumeChange24h = Math.random() * 20 - 10; // Random volume change

        res.json({
          success: true,
          data: {
            symbol: symbol as string,
            interval: interval as string,
            candles,
            indicators: {
              rsi,
              sma20,
              priceChange24h,
              volumeChange24h,
            },
            lastUpdated: new Date().toISOString(),
          },
          warning: "Using sample data due to API restrictions",
        });
      }
    })
  );

  // Market Analysis routes
  app.get(
    "/api/market/analysis/:symbol",
    asyncHandler(async (req, res) => {
      const { symbol } = req.params;

      if (!symbol) {
        throw new CustomAPIError("Symbol is required", 400, "INVALID_REQUEST", {
          required: ["symbol"],
        });
      }

      try {
        // Get market data for the specific coin
        let marketData, coin;
        try {
          marketData = await binanceClient.getTopCryptocurrencies();
          coin = marketData.find((c) => c.symbol === symbol);
        } catch (binanceError) {
          // Use CoinGecko as fallback when Binance API is unavailable
          marketData = await coinGeckoClient.getTopCryptocurrencies();
          coin = marketData.find((c) => c.symbol === symbol);
        }

        if (!coin) {
          throw new CustomAPIError(
            "Cryptocurrency not found",
            404,
            "COIN_NOT_FOUND"
          );
        }

        // Generate market analysis
        const analysis = await generateMarketAnalysis(coin);

        res.json({
          success: true,
          data: analysis,
        });
      } catch (error) {
        throw new CustomAPIError(
          "Failed to generate market analysis",
          503,
          "ANALYSIS_FAILED",
          {
            originalError:
              error instanceof Error ? error.message : "Unknown error",
            suggestion:
              "Try refreshing or selecting a different cryptocurrency",
          }
        );
      }
    })
  );

  // Social Sentiment routes
  app.get(
    "/api/social/sentiment",
    asyncHandler(async (req, res) => {
      try {
        console.log("Fetching social sentiment data from Twitter API...");
        const topics = await twitterClient.getTrendingCryptoTopics();

        res.json({
          success: true,
          data: {
            topics: topics.map((topic) => ({
              topic: topic.topic,
              mentions: topic.mentions,
              sentiment: topic.sentiment,
              recentTweets: topic.recentTweets.map((tweet) => ({
                text: tweet.text,
                createdAt: tweet.createdAt,
              })),
            })),
            totalMentions: topics.reduce((sum, t) => sum + t.mentions, 0),
            overallSentiment: {
              positive: topics.filter((t) => t.sentiment === "positive").length,
              negative: topics.filter((t) => t.sentiment === "negative").length,
              neutral: topics.filter((t) => t.sentiment === "neutral").length,
              total: topics.length,
              dominantSentiment: ["positive", "negative", "neutral"].reduce(
                (a, b) =>
                  topics.filter((t) => t.sentiment === a).length >
                  topics.filter((t) => t.sentiment === b).length
                    ? a
                    : b
              ),
            },
          },
        });
      } catch (error) {
        console.warn("Social API failed:", error);
        try {
          const socialData = await storage.getSocialData();
          if (!socialData?.topics) {
            throw new CustomAPIError(
              "No social data available",
              503,
              "NO_SOCIAL_DATA"
            );
          }
          res.json({
            success: true,
            data: socialData,
            source: "fallback",
          });
        } catch (fallbackError) {
          throw new CustomAPIError(
            "Failed to fetch social sentiment data",
            503,
            "SOCIAL_DATA_UNAVAILABLE",
            {
              originalError:
                error instanceof Error ? error.message : "Unknown error",
              suggestion: "Try again later or check your connection",
            }
          );
        }
      }
    })
  ),
    // News routes
    app.get(
      "/api/news",
      asyncHandler(async (req, res) => {
        try {
          console.log("Fetching real news data from News API...");
          const newsArticles = await newsClient.getCryptoNews();
          const sentiment = await sentimentClient.calculateOverallSentiment(
            newsArticles
          );

          const articles = await Promise.all(
            newsArticles.slice(0, 8).map(async (article) => {
              const sentimentResult = await sentimentClient.analyzeSentiment(
                article.title
              );
              return {
                ...article,
                sentiment: sentimentResult,
                createdAt: new Date(),
              };
            })
          );

          const totalCount = articles.length;
          const analyzedCount = articles.filter((a) => a.sentiment).length;

          res.json({
            success: true,
            data: {
              articles: articles.map((article) => ({
                ...article,
                aiSentiment: {
                  label:
                    typeof article.sentiment === "string"
                      ? article.sentiment
                      : "neutral",
                  score: 0.7,
                  confidence: 0.7,
                },
              })),
              totalCount,
              analyzedCount,
              overallSentiment: sentiment,
            },
          });
        } catch (error) {
          console.warn("News API failed, falling back to stored data:", error);

          try {
            const articles = await storage.getNewsArticles();
            const sentiment = await storage.getSentimentData();

            if (!articles?.length) {
              throw new CustomAPIError(
                "No news data available",
                503,
                "NO_NEWS_DATA"
              );
            }

            const totalCount = articles.length;
            const analyzedCount = articles.filter((a) => a.sentiment).length;

            res.json({
              success: true,
              data: {
                articles: articles.map((article) => ({
                  ...article,
                  aiSentiment: {
                    label:
                      typeof article.sentiment === "string"
                        ? article.sentiment
                        : "neutral",
                    score: 0.5,
                    confidence: 0.5,
                  },
                })),
                totalCount,
                analyzedCount,
                overallSentiment: sentiment,
                source: "fallback",
              },
            });
          } catch (fallbackError) {
            throw new CustomAPIError(
              "Failed to fetch news data",
              503,
              "NEWS_UNAVAILABLE",
              {
                originalError:
                  error instanceof Error ? error.message : "Unknown error",
                suggestion: "Try again later or check your connection",
              }
            );
          }
        }
      })
    );

  // Investment Analysis routes
  app.post(
    "/api/investment-analysis",
    asyncHandler(async (req, res) => {
      const { amount, timeframe, riskLevel } = req.body;

      if (!amount || typeof amount !== "number" || amount <= 0) {
        throw new CustomAPIError(
          "Valid investment amount is required",
          400,
          "INVALID_REQUEST",
          { required: ["amount"], details: "Amount must be a positive number" }
        );
      }

      if (!timeframe || !["short", "medium", "long"].includes(timeframe)) {
        throw new CustomAPIError(
          "Valid timeframe is required",
          400,
          "INVALID_REQUEST",
          {
            required: ["timeframe"],
            details: "Timeframe must be short, medium, or long",
          }
        );
      }

      try {
        const response =
          await investmentAnalysisService.analyzeInvestmentOptions(
            amount,
            timeframe,
            req.body.preferences
          );

        res.json({
          success: true,
          data: response,
        });
      } catch (error) {
        throw new CustomAPIError(
          "Failed to generate investment analysis",
          503,
          "ANALYSIS_FAILED",
          {
            originalError:
              error instanceof Error ? error.message : "Unknown error",
            suggestion: "Try again later or adjust your parameters",
          }
        );
      }
    })
  );

  // Chat routes
  app.post(
    "/api/chat",
    asyncHandler(async (req, res) => {
      const { message, conversationId } = req.body;

      if (!message || typeof message !== "string") {
        throw new CustomAPIError(
          "Message is required",
          400,
          "INVALID_REQUEST",
          { required: ["message"] }
        );
      }

      try {
        console.log("Generating AI response with market context...");
        let marketContext;

        try {
          const [marketData, marketStats] = await Promise.all([
            binanceClient.getTopCryptocurrencies(),
            binanceClient.getMarketStats(),
          ]);

          marketContext = {
            topCoin: marketData[0],
            stats: marketStats,
            coins: marketData.slice(0, 3),
          };
        } catch (contextError) {
          console.warn(
            "Failed to fetch real-time market context:",
            contextError
          );
          const [coins, stats] = await Promise.all([
            storage.getMarketData(),
            storage.getMarketStats(),
          ]);
          marketContext = {
            topCoin: coins[0],
            stats,
            coins: coins.slice(0, 3),
          };
        }

        const chatPrompt = generateChatPrompt(message, marketContext);
        const aiResponse = await callGeminiAPI(chatPrompt);

        const response: ChatMessage = {
          id: randomUUID(),
          role: "assistant",
          content: aiResponse,
          timestamp: new Date().toISOString(),
          intent: determineMessageIntent(message),
        };

        res.json({
          success: true,
          data: { message: response },
        });
      } catch (error) {
        throw new CustomAPIError(
          "Failed to generate response",
          503,
          "AI_RESPONSE_FAILED",
          {
            originalError:
              error instanceof Error ? error.message : "Unknown error",
            suggestion: "Try rephrasing your message",
          }
        );
      }
    })
  );

  // Cache management endpoints
  app.post("/api/cache/clear", (req, res) => {
    cache.clear();
    res.json({
      success: true,
      message: "Cache cleared successfully",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/cache/stats", (req, res) => {
    res.json({
      success: true,
      data: {
        size: cache.getSize(),
        entries: cache.getSize(),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API routes
  app.use("/api", newsRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/market", marketRoutes);

  // Register error handling middleware last
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions for market analysis
function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(prices[i]);
      continue;
    }
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) {
    return new Array(prices.length).fill(50);
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    gains.push(difference > 0 ? difference : 0);
    losses.push(difference < 0 ? -difference : 0);
  }

  const rsi: number[] = [];
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

  rsi.push(100 - 100 / (1 + avgGain / avgLoss));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      rsi.push(100 - 100 / (1 + avgGain / avgLoss));
    }
  }

  return [...new Array(period).fill(50), ...rsi];
}
