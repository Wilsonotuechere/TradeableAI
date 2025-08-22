import { Router } from "express";
import { CustomAPIError } from "../utils/errors";
import {
  multiModelService,
  ModelResponse,
  EnsembleResponse,
} from "../services/multi-model-ai-service";
import { determineMessageIntent } from "../utils/message-intent";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { binanceClient } from "../services/binance-service";
import newsClient from "../services/news-service";
import { twitterService } from "../services/twitter-service";
import { callGeminiAPI, generateChatPrompt } from "../services/gemini-service";
import { aiConfigManager } from "../config/ai-ensemble-config";
import { asyncHandler } from "../utils/async-handler";

// Define types for our chat system
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ChatHistory {
  id: string;
  title: string;
  createdAt: Date;
  userId: string | null;
  category: string;
  messages: ChatMessage[];
}

interface MarketContext {
  topCoins: any[];
  topCoin: any;
  stats: any;
  recentNews: any[];
  socialTrends: any[];
  marketTrend: "bullish" | "bearish" | "neutral";
  timestamp: string;
}

const router = Router();

// Helper function to gather market context
async function gatherMarketContext() {
  try {
    const [marketData, marketStats, newsData, twitterData] = await Promise.all([
      binanceClient.getMarketData(),
      binanceClient.getMarketStats(),
      newsClient.fetchCryptoNews().catch(() => storage.getNewsArticles()),
      twitterService.getSentiment("MARKET").catch(() => ({
        symbol: "MARKET",
        sentiment: "neutral",
        score: 0.5,
        volume: 0,
        timestamp: new Date().toISOString(),
        topTweets: [],
      })),
    ]);

    return {
      topCoins: marketData.slice(0, 5),
      topCoin: marketData[0],
      stats: marketStats,
      recentNews: newsData?.slice(0, 5) || [],
      socialTrends: twitterData.topTweets.slice(0, 3),
      marketTrend:
        marketStats.btcDominance.replace("%", "") > "50"
          ? "bullish"
          : "bearish",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.warn("Failed to fetch real-time context, using fallback:", error);
    const [coins, stats] = await Promise.all([
      storage.getMarketData(),
      storage.getMarketStats(),
    ]);
    return {
      topCoins: coins.slice(0, 5),
      topCoin: coins[0],
      stats,
      recentNews: [],
      socialTrends: [],
      marketTrend: "neutral",
      timestamp: new Date().toISOString(),
    };
  }
}

// Enhanced chat route with multi-model AI ensemble
router.post(
  "/enhanced",
  asyncHandler(async (req, res) => {
    const { message, conversationId, preferences } = req.body;

    if (!message || typeof message !== "string") {
      throw new CustomAPIError("Message is required", 400, "INVALID_REQUEST", {
        required: ["message"],
      });
    }

    try {
      console.log("Generating enhanced multi-model AI response...");

      const intent = determineMessageIntent(message);
      console.log(`Message intent: ${intent}`);

      const marketContext = await gatherMarketContext();

      // Get optimal configuration based on message intent and context
      const queryAnalysis = {
        isTechnicalQuery:
          intent.includes("technical") || intent.includes("chart"),
        isSentimentQuery:
          intent.includes("sentiment") || intent.includes("feeling"),
        isEducationalQuery:
          intent.includes("explain") || intent.includes("what is"),
        complexity:
          intent.includes("complex") || intent.includes("detailed")
            ? "high"
            : "medium",
        urgency:
          intent.includes("urgent") || intent.includes("quick")
            ? "high"
            : "normal",
      };

      const optimalConfig =
        aiConfigManager.getOptimalConfiguration(queryAnalysis);

      const modelOptions = {
        useGemini: optimalConfig.enabledModels.includes("gemini"),
        useFinancialBert: optimalConfig.enabledModels.includes("finbert"),
        useCryptoBert: optimalConfig.enabledModels.includes("cryptobert"),
        useNewsAnalysis: optimalConfig.enabledModels.includes("newsRoberta"),
        weightingStrategy:
          preferences?.aiStrategy ||
          (optimalConfig.strategy as "confidence" | "equal" | "performance"),
      };

      console.log("Model configuration:", {
        ...modelOptions,
        timeout: optimalConfig.timeout,
        expectedCost: optimalConfig.expectedCost,
      });

      const ensembleResult = await multiModelService.generateEnsembleResponse(
        message,
        marketContext,
        modelOptions
      );

      const response = {
        id: randomUUID(),
        role: "assistant" as const,
        content: ensembleResult.finalResponse,
        timestamp: new Date().toISOString(),
        intent,
        metadata: {
          aiEnsemble: {
            modelsUsed: ensembleResult.modelContributions.map(
              (m: ModelResponse) => m.source
            ),
            consensusScore: ensembleResult.consensusScore,
            processingTime: ensembleResult.totalProcessingTime,
            methodology: ensembleResult.methodology,
            confidence: Math.max(
              ...ensembleResult.modelContributions.map(
                (m: ModelResponse) => m.confidence
              )
            ),
          },
          marketContext: {
            primaryCoin: marketContext.topCoin?.symbol,
            marketTrend: marketContext.marketTrend,
            dataFreshness:
              Date.now() - new Date(marketContext.timestamp).getTime(),
          },
        },
      };

      // Update performance metrics for each model
      const now = new Date();
      ensembleResult.modelContributions.forEach(
        (contribution: ModelResponse) => {
          aiConfigManager.updatePerformanceMetrics(contribution.source, {
            responseTime: contribution.processingTime,
            confidence: contribution.confidence,
            timestamp: now,
          });
        }
      );

      console.log(`Enhanced AI Response Generated:
      - Models: ${ensembleResult.modelContributions.length}
      - Consensus: ${(ensembleResult.consensusScore * 100).toFixed(1)}%
      - Processing: ${ensembleResult.totalProcessingTime}ms
      - Intent: ${intent}`);

      res.json({
        success: true,
        data: {
          message: response,
          ensembleDetails: {
            modelBreakdown: ensembleResult.modelContributions.map(
              (m: ModelResponse) => ({
                model: m.source,
                confidence: `${(m.confidence * 100).toFixed(1)}%`,
                processingTime: `${m.processingTime}ms`,
                strengths: m.data.strengths || [],
              })
            ),
            qualityMetrics: {
              consensusScore: `${(ensembleResult.consensusScore * 100).toFixed(
                1
              )}%`,
              totalProcessingTime: `${ensembleResult.totalProcessingTime}ms`,
              modelsConsulted: ensembleResult.modelContributions.length,
            },
          },
        },
      });
    } catch (error) {
      console.error("Enhanced chat error:", error);

      try {
        console.log("Falling back to single-model response...");
        const marketContext = await gatherMarketContext();
        const fallbackPrompt = generateChatPrompt(message, marketContext);
        const aiResponse = await callGeminiAPI(fallbackPrompt);

        const fallbackResponse = {
          id: randomUUID(),
          role: "assistant" as const,
          content: aiResponse,
          timestamp: new Date().toISOString(),
          metadata: {
            fallback: true,
            originalError:
              error instanceof Error ? error.message : "Unknown error",
          },
        };

        res.json({
          success: true,
          data: { message: fallbackResponse },
          warning: "Using single-model fallback due to ensemble service issues",
        });
      } catch (fallbackError) {
        throw new CustomAPIError(
          "Failed to generate AI response",
          503,
          "AI_RESPONSE_FAILED",
          {
            originalError:
              error instanceof Error ? error.message : "Unknown error",
            fallbackError:
              fallbackError instanceof Error
                ? fallbackError.message
                : "Unknown error",
            suggestion: "Try rephrasing your message or try again later",
          }
        );
      }
    }
  })
);

// Model performance tracking endpoint
router.get(
  "/models/performance",
  asyncHandler(async (req, res) => {
    const config = aiConfigManager.getConfiguration();

    const modelInfo = {
      availableModels: Object.entries(config.models).map(([key, model]) => {
        const performance = aiConfigManager.getModelPerformance(key);
        return {
          name: model.name,
          type:
            key === "gemini"
              ? "Large Language Model"
              : model.endpoint?.split("/")[1] || "AI Model",
          strengths: model.strengths,
          avgConfidence: performance.averageConfidence
            ? `${(performance.averageConfidence * 100).toFixed(1)}%`
            : "No data",
          avgResponseTime: performance.averageResponseTime
            ? `${performance.averageResponseTime}ms`
            : "No data",
          useCases: model.optimalUseCases,
          enabled: model.enabled,
          costPerRequest: `$${model.costPerRequest.toFixed(4)}`,
          rateLimit: `${model.rateLimit.requestsPerMinute}/min`,
        };
      }),
      ensembleStrategies: Object.entries(config.strategies).map(
        ([key, strategy]) => ({
          name: strategy.name,
          description: strategy.description,
          recommended:
            strategy.requireMinimumModels === 2
              ? "Fast responses"
              : strategy.requireMinimumModels >= 4
              ? "High accuracy needs"
              : "General use",
          consensusThreshold: `${(strategy.consensusThreshold * 100).toFixed(
            1
          )}%`,
          maxProcessingTime: `${strategy.maxProcessingTime}ms`,
        })
      ),
      currentConfiguration: {
        defaultStrategy: config.defaultStrategy,
        maxModels: config.globalSettings.maxConcurrentRequests,
        timeoutMs: config.globalSettings.globalTimeout,
        fallbackEnabled: config.globalSettings.enableFallbacks,
        costOptimization: config.costManagement.enableCostOptimization,
        dailyBudgetLimit: `$${config.costManagement.dailyBudgetLimit.toFixed(
          2
        )}`,
      },
    };

    res.json({
      success: true,
      data: modelInfo,
    });
  })
);

// Chat history with AI insights
router.get(
  "/history/:conversationId",
  asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { includeInsights = false } = req.query;

    try {
      const conversation = (await storage.getChatHistory(
        conversationId
      )) as unknown as ChatHistory;

      if (!conversation || !Array.isArray(conversation.messages)) {
        return res.json({
          success: true,
          data: {
            messages: [],
            insights: { message: "No conversation history found" },
          },
        });
      }

      const history = conversation.messages as ChatMessage[];
      let insights = null;

      if (includeInsights === "true" && history.length > 0) {
        const conversationSummary = history
          .map((msg: ChatMessage) => `${msg.role}: ${msg.content}`)
          .join("\n");

        const insightPrompt = `
      Analyze this crypto trading conversation and provide insights:

      ${conversationSummary}

      Provide:
      1. Main topics discussed
      2. User's experience level
      3. Investment interests
      4. Risk tolerance indicators
      5. Common questions
      6. Learning recommendations

      Format as structured JSON.
      `;

        try {
          const aiInsights = await callGeminiAPI(insightPrompt);
          insights = {
            generatedAt: new Date().toISOString(),
            analysis: aiInsights,
            messageCount: history.length,
          };
        } catch (insightError) {
          console.warn(
            "Failed to generate conversation insights:",
            insightError
          );
          insights = {
            error: "Unable to generate insights at this time",
            messageCount: history.length,
          };
        }
      }

      const lastMessage = history[history.length - 1];

      res.json({
        success: true,
        data: {
          conversationId,
          messages: history,
          messageCount: history.length,
          lastActivity:
            lastMessage?.timestamp || conversation.createdAt.toISOString(),
          insights,
        },
      });
    } catch (error) {
      throw new CustomAPIError(
        "Failed to retrieve conversation history",
        500,
        "HISTORY_RETRIEVAL_FAILED",
        { conversationId }
      );
    }
  })
);

// Get all chat histories
router.get(
  "/history",
  asyncHandler(async (req, res) => {
    try {
      // Fetch chat histories from your storage
      const histories = await storage.getChatHistory();

      res.json({
        success: true,
        data: histories,
      });
    } catch (error) {
      console.error("Failed to fetch chat histories:", error);
      throw new CustomAPIError(
        "Failed to fetch chat histories",
        500,
        "CHAT_HISTORY_ERROR"
      );
    }
  })
);

// Health check endpoint
router.get(
  "/models/health",
  asyncHandler(async (req, res) => {
    const healthChecks = [];

    try {
      const geminiStart = Date.now();
      await callGeminiAPI("Test query for health check");
      healthChecks.push({
        service: "Gemini-2.0-Flash",
        status: "healthy",
        responseTime: Date.now() - geminiStart,
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      healthChecks.push({
        service: "Gemini-2.0-Flash",
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        lastChecked: new Date().toISOString(),
      });
    }

    const healthyServices = healthChecks.filter(
      (hc) => hc.status === "healthy"
    ).length;
    const totalServices = healthChecks.length;
    const overallHealth = (healthyServices / totalServices) * 100;

    res.json({
      success: true,
      data: {
        overallHealth: `${overallHealth.toFixed(1)}%`,
        servicesHealthy: `${healthyServices}/${totalServices}`,
        services: healthChecks,
        recommendedAction:
          overallHealth < 50
            ? "Multiple AI services are down. Consider maintenance mode."
            : overallHealth < 80
            ? "Some AI services are degraded. Monitor closely."
            : "All systems operating normally.",
        timestamp: new Date().toISOString(),
      },
    });
  })
);

export default router;
