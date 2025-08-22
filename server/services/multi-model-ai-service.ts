import { callGeminiAPI } from "./gemini-service";
import { analyzeSentiment } from "./huggingface-service";
import env from "../config/env";

interface ModelResponse {
  source: string;
  confidence: number;
  data: any;
  processingTime: number;
}

interface EnsembleResponse {
  finalResponse: string;
  modelContributions: ModelResponse[];
  consensusScore: number;
  totalProcessingTime: number;
  methodology: string;
}

// Hugging Face model configurations
const HF_MODELS = {
  FINANCIAL_BERT: "ProsusAI/finbert",
  CRYPTO_SENTIMENT: "ElKulako/cryptobert",
  MARKET_ANALYSIS: "microsoft/DialoGPT-medium",
  TECHNICAL_ANALYSIS: "facebook/blenderbot-400M-distill",
  NEWS_CLASSIFICATION: "cardiffnlp/twitter-roberta-base-sentiment-latest",
} as const;

class MultiModelAIService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api-inference.huggingface.co/models";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Main ensemble method that coordinates multiple AI models
   */
  async generateEnsembleResponse(
    query: string,
    marketContext: any,
    options: {
      useGemini?: boolean;
      useFinancialBert?: boolean;
      useCryptoBert?: boolean;
      useNewsAnalysis?: boolean;
      weightingStrategy?: "confidence" | "equal" | "performance";
    } = {}
  ): Promise<EnsembleResponse> {
    const startTime = Date.now();
    const modelResponses: ModelResponse[] = [];

    try {
      if (!this.apiKey) {
        throw new Error("HUGGINGFACE_API_KEY is not configured");
      }

      const {
        useGemini = true,
        useFinancialBert = true,
        useCryptoBert = true,
        useNewsAnalysis = true,
        weightingStrategy = "confidence",
      } = options;

      console.log("Starting ensemble analysis with configuration:", {
        useGemini,
        useFinancialBert,
        useCryptoBert,
        useNewsAnalysis,
        weightingStrategy,
      });

      const modelPromises = [];

      // 1. Gemini Analysis (Primary reasoning)
      if (useGemini) {
        modelPromises.push(this.getGeminiAnalysis(query, marketContext));
      }

      // 2. FinBERT Analysis (Financial sentiment)
      if (useFinancialBert) {
        modelPromises.push(
          this.getFinancialSentimentAnalysis(query, marketContext)
        );
      }

      // 3. CryptoBERT Analysis (Crypto-specific sentiment)
      if (useCryptoBert) {
        modelPromises.push(
          this.getCryptoSentimentAnalysis(query, marketContext)
        );
      }

      // 4. News Analysis (Market news interpretation)
      if (useNewsAnalysis) {
        modelPromises.push(this.getNewsAnalysis(query, marketContext));
      }

      // 5. Technical Pattern Recognition
      modelPromises.push(this.getTechnicalAnalysis(query, marketContext));

      console.log(`Initiating ${modelPromises.length} model analyses...`);

      const results = await Promise.allSettled(modelPromises);

      let hasValidResponse = false;
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          modelResponses.push(result.value);
          hasValidResponse = true;
          console.log(`Model ${index} succeeded:`, {
            source: result.value.source,
            confidence: result.value.confidence,
            processingTime: result.value.processingTime,
          });
        } else {
          console.warn(`Model ${index} failed:`, {
            error:
              result.reason instanceof Error
                ? result.reason.message
                : result.reason,
            stack:
              result.reason instanceof Error ? result.reason.stack : undefined,
          });
        }
      });

      if (!hasValidResponse) {
        console.error("All models failed to generate a response");
        return {
          finalResponse:
            "I apologize, but I couldn't generate a comprehensive analysis due to technical difficulties. Please try again.",
          modelContributions: [],
          consensusScore: 0,
          totalProcessingTime: Date.now() - startTime,
          methodology: "No models were able to generate a response",
        };
      }

      console.log(
        `Successfully received ${modelResponses.length} model responses`
      );

      const finalResponse = await this.synthesizeResponses(
        modelResponses,
        query,
        weightingStrategy
      );

      const totalTime = Date.now() - startTime;
      const consensusScore = this.calculateConsensusScore(modelResponses);
      const methodology = this.explainMethodology(
        modelResponses,
        weightingStrategy
      );

      console.log("Ensemble analysis complete:", {
        modelsResponded: modelResponses.length,
        consensusScore,
        totalTime,
      });

      return {
        finalResponse,
        modelContributions: modelResponses,
        consensusScore,
        totalProcessingTime: totalTime,
        methodology,
      };
    } catch (error) {
      console.error("Ensemble analysis failed:", error);
      return {
        finalResponse: `Analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try again.`,
        modelContributions: modelResponses,
        consensusScore: 0,
        totalProcessingTime: Date.now() - startTime,
        methodology: "Analysis failed due to technical error",
      };
    }
  }

  /**
   * Gemini analysis for comprehensive reasoning
   */
  private async getGeminiAnalysis(
    query: string,
    context: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    const prompt = `
    As Tradeable's primary AI analyst, provide comprehensive analysis for: "${query}"
    
    Market Context: ${JSON.stringify(context, null, 2)}
    
    Focus on:
    - Market trends and patterns
    - Risk assessment
    - Educational insights
    - Actionable recommendations
    
    Provide structured, analytical response.
    `;

    try {
      const response = await callGeminiAPI(prompt);

      return {
        source: "Gemini-2.0-Flash",
        confidence: 0.85,
        data: {
          analysis: response,
          type: "comprehensive_analysis",
          strengths: ["reasoning", "context_understanding", "education"],
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Gemini analysis failed: ${error}`);
    }
  }

  /**
   * FinBERT for financial sentiment analysis
   */
  private async getFinancialSentimentAnalysis(
    query: string,
    context: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const sentimentResult = await this.callHuggingFaceModel(
        HF_MODELS.FINANCIAL_BERT,
        query
      );

      const contextTexts = [
        context.topCoin
          ? `${context.topCoin.name} is ${
              context.topCoin.priceChange24h > 0 ? "up" : "down"
            } ${Math.abs(context.topCoin.priceChange24h).toFixed(2)}%`
          : "",
        context.stats
          ? `Market cap is ${
              context.stats.totalMarketCap > context.stats.previousMarketCap
                ? "growing"
                : "declining"
            }`
          : "",
      ].filter(Boolean);

      const contextSentiments = await Promise.all(
        contextTexts.map((text) =>
          this.callHuggingFaceModel(HF_MODELS.FINANCIAL_BERT, text)
        )
      );

      return {
        source: "FinBERT",
        confidence: this.calculateAverageConfidence([
          sentimentResult,
          ...contextSentiments,
        ]),
        data: {
          querySentiment: sentimentResult,
          contextSentiments,
          type: "financial_sentiment",
          strengths: ["financial_terminology", "sentiment_accuracy"],
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`FinBERT analysis failed: ${error}`);
    }
  }

  /**
   * Crypto-specific sentiment analysis
   */
  private async getCryptoSentimentAnalysis(
    query: string,
    context: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const cryptoSentiment = await this.callHuggingFaceModel(
        HF_MODELS.CRYPTO_SENTIMENT,
        query
      );

      return {
        source: "CryptoBERT",
        confidence: cryptoSentiment.confidence || 0.7,
        data: {
          sentiment: cryptoSentiment,
          type: "crypto_sentiment",
          strengths: ["crypto_terminology", "community_sentiment"],
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.getCryptoKeywordAnalysis(query, context, startTime);
    }
  }

  /**
   * News and social media analysis
   */
  private async getNewsAnalysis(
    query: string,
    context: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    try {
      const newsTexts = [
        query,
        ...(context.recentNews || [])
          .slice(0, 3)
          .map((news: any) => news.title || news.text),
      ].filter(Boolean);

      const newsAnalyses = await Promise.all(
        newsTexts.map((text) =>
          this.callHuggingFaceModel(HF_MODELS.NEWS_CLASSIFICATION, text)
        )
      );

      return {
        source: "News-RoBERTa",
        confidence: this.calculateAverageConfidence(newsAnalyses),
        data: {
          analyses: newsAnalyses,
          type: "news_analysis",
          strengths: ["news_interpretation", "social_sentiment"],
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`News analysis failed: ${error}`);
    }
  }

  /**
   * Technical analysis using pattern recognition
   */
  private async getTechnicalAnalysis(
    query: string,
    context: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();

    const technicalData = context.topCoin || context.coins?.[0];

    if (!technicalData) {
      return {
        source: "Technical-Analysis",
        confidence: 0.3,
        data: {
          analysis: "Insufficient technical data for analysis",
          type: "technical_analysis",
        },
        processingTime: Date.now() - startTime,
      };
    }

    const formatNumber = (num: any): string => {
      if (num === undefined || num === null) return "N/A";
      const n = typeof num === "string" ? parseFloat(num) : num;
      return isNaN(n) ? "N/A" : n.toFixed(2);
    };

    const technicalSummary = `
    Price: $${formatNumber(technicalData.price)}
    24h Change: ${formatNumber(
      technicalData.priceChangePercent24h || technicalData.priceChange24h
    )}%
    Volume: $${formatNumber(technicalData.volume24h)}
    Market Cap: $${formatNumber(technicalData.marketCap)}
    
    Query: ${query}
    `;

    try {
      const technicalResponse = await this.callHuggingFaceModel(
        HF_MODELS.TECHNICAL_ANALYSIS,
        `Analyze this cryptocurrency technical data: ${technicalSummary}`
      );

      return {
        source: "Technical-Analyzer",
        confidence: 0.75,
        data: {
          analysis: technicalResponse,
          technicalData,
          type: "technical_analysis",
          strengths: [
            "price_patterns",
            "volume_analysis",
            "trend_identification",
          ],
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return this.getRuleBasedTechnicalAnalysis(
        technicalData,
        query,
        startTime
      );
    }
  }

  /**
   * Synthesize all model responses into a coherent final response
   */
  private async synthesizeResponses(
    responses: ModelResponse[],
    originalQuery: string,
    strategy: "confidence" | "equal" | "performance"
  ): Promise<string> {
    if (responses.length === 0) {
      return "I apologize, but I couldn't generate a comprehensive analysis due to technical difficulties. Please try again.";
    }

    const weights = this.calculateModelWeights(responses, strategy);

    const synthesisPrompt = `
    As Tradeable's AI coordinator, synthesize these AI model analyses into one comprehensive response:

    Original Query: "${originalQuery}"

    Model Analyses:
    ${responses
      .map(
        (r, i) => `
    ${i + 1}. ${r.source} (Confidence: ${(r.confidence * 100).toFixed(
          1
        )}%, Weight: ${(weights[i] * 100).toFixed(1)}%):
    ${JSON.stringify(r.data, null, 2)}
    `
      )
      .join("\n")}

    Requirements:
    - Synthesize insights from all models
    - Highlight areas of consensus
    - Note conflicting viewpoints and explain why
    - Provide balanced, actionable advice
    - Maintain educational tone
    - Include confidence indicators
    - End with: "💡 Remember: This is a learning tool to help you understand trading better!"

    Create a unified response that leverages the strengths of each model.
    `;

    try {
      return await callGeminiAPI(synthesisPrompt);
    } catch (error) {
      return this.fallbackSynthesis(responses, originalQuery);
    }
  }

  /**
   * Call Hugging Face model API
   */
  private async callHuggingFaceModel(
    modelName: string,
    input: string
  ): Promise<any> {
    if (!this.apiKey) {
      throw new Error("HUGGINGFACE_API_KEY is not configured");
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${this.baseUrl}/${modelName}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "Tradeable-App/1.0",
        },
        body: JSON.stringify({
          inputs: input,
          options: { wait_for_model: true, use_cache: false },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`HuggingFace API error (${modelName}):`, {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
        });
        throw new Error(
          `HuggingFace API error: ${response.status} - ${errorBody}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`Error calling HuggingFace model ${modelName}:`, error);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(`Request to ${modelName} timed out after 30 seconds`);
        }
      }
      throw error;
    }
  }

  // Helper methods
  private calculateAverageConfidence(results: any[]): number {
    const confidences = results
      .map(
        (r) => r.confidence || r.score || (Array.isArray(r) ? r[0]?.score : 0.5)
      )
      .filter((c) => typeof c === "number" && c > 0);

    return confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0.5;
  }

  private calculateConsensusScore(responses: ModelResponse[]): number {
    if (responses.length < 2) return 0.5;

    const avgConfidence =
      responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    const confidenceVariance =
      responses.reduce(
        (sum, r) => sum + Math.pow(r.confidence - avgConfidence, 2),
        0
      ) / responses.length;

    return Math.max(0.1, Math.min(0.95, 1 - confidenceVariance));
  }

  private calculateModelWeights(
    responses: ModelResponse[],
    strategy: string
  ): number[] {
    switch (strategy) {
      case "confidence":
        const totalConfidence = responses.reduce(
          (sum, r) => sum + r.confidence,
          0
        );
        return responses.map((r) => r.confidence / totalConfidence);

      case "performance":
        return this.calculateModelWeights(responses, "confidence");

      case "equal":
      default:
        const equalWeight = 1 / responses.length;
        return new Array(responses.length).fill(equalWeight);
    }
  }

  private explainMethodology(
    responses: ModelResponse[],
    strategy: string
  ): string {
    const modelList = responses.map((r) => r.source).join(", ");
    return `Used ${responses.length} AI models (${modelList}) with ${strategy} weighting strategy. Consensus score indicates model agreement level.`;
  }

  private async getCryptoKeywordAnalysis(
    query: string,
    context: any,
    startTime: number
  ): Promise<ModelResponse> {
    const cryptoPositive = [
      "moon",
      "hodl",
      "bullish",
      "pump",
      "rally",
      "breakout",
    ];
    const cryptoNegative = ["dump", "crash", "bearish", "rekt", "fud", "dip"];

    const lowerQuery = query.toLowerCase();
    const positiveMatches = cryptoPositive.filter((word) =>
      lowerQuery.includes(word)
    ).length;
    const negativeMatches = cryptoNegative.filter((word) =>
      lowerQuery.includes(word)
    ).length;

    let sentiment = "neutral";
    let confidence = 0.5;

    if (positiveMatches > negativeMatches) {
      sentiment = "positive";
      confidence = Math.min(0.8, 0.5 + positiveMatches * 0.1);
    } else if (negativeMatches > positiveMatches) {
      sentiment = "negative";
      confidence = Math.min(0.8, 0.5 + negativeMatches * 0.1);
    }

    return {
      source: "Crypto-Keywords",
      confidence,
      data: {
        sentiment,
        positiveMatches,
        negativeMatches,
        type: "crypto_keyword_analysis",
      },
      processingTime: Date.now() - startTime,
    };
  }

  private getRuleBasedTechnicalAnalysis(
    data: any,
    query: string,
    startTime: number
  ): ModelResponse {
    const priceChange = data.priceChange24h || 0;
    const volume = data.volume24h || 0;

    let analysis = `Technical Analysis for ${data.name || "Asset"}:\n`;

    if (priceChange > 5) {
      analysis += "- Strong bullish momentum detected\n";
    } else if (priceChange > 2) {
      analysis += "- Moderate upward movement\n";
    } else if (priceChange < -5) {
      analysis += "- Strong bearish pressure\n";
    } else if (priceChange < -2) {
      analysis += "- Moderate downward pressure\n";
    } else {
      analysis += "- Sideways price action\n";
    }

    if (volume > 100000000) {
      analysis += "- High trading volume indicates strong interest\n";
    } else {
      analysis += "- Normal trading volume\n";
    }

    return {
      source: "Rule-Based-Technical",
      confidence: 0.6,
      data: {
        analysis,
        type: "rule_based_technical",
        metrics: { priceChange, volume },
      },
      processingTime: Date.now() - startTime,
    };
  }

  private fallbackSynthesis(responses: ModelResponse[], query: string): string {
    if (responses.length === 0) {
      return "Unable to provide analysis at this time.";
    }

    const highConfidenceResponses = responses.filter((r) => r.confidence > 0.7);
    const primaryResponse = highConfidenceResponses[0] || responses[0];

    let synthesis = `Based on multi-model AI analysis:\n\n`;
    synthesis += `Primary Analysis (${primaryResponse.source}):\n`;
    synthesis += `${JSON.stringify(
      primaryResponse.data.analysis || primaryResponse.data,
      null,
      2
    )}\n\n`;

    if (responses.length > 1) {
      synthesis += `Supporting insights from ${
        responses.length - 1
      } additional models:\n`;
      responses.slice(1).forEach((r) => {
        synthesis += `- ${r.source}: ${r.data.type}\n`;
      });
    }

    synthesis += `\nConfidence: ${(primaryResponse.confidence * 100).toFixed(
      1
    )}%`;
    synthesis += `\nModels consulted: ${responses
      .map((r) => r.source)
      .join(", ")}`;
    synthesis += `\n\n💡 Remember: This is a learning tool to help you understand trading better!`;

    return synthesis;
  }
}

// Export the service
export const multiModelService = new MultiModelAIService(
  env.HUGGINGFACE_API_KEY
);

export { MultiModelAIService, ModelResponse, EnsembleResponse };
