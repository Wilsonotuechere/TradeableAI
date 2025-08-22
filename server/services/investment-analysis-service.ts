import {
  MarketAnalysis,
  NewsAnalysis,
  SocialAnalysis,
  InvestmentRecommendation,
  InvestmentAnalysisResponse,
} from "../../shared/types/market-analysis";
import {
  analyzeSentiment,
  analyzeMultipleTexts,
  calculateOverallSentiment,
} from "./huggingface-service";
import { callGeminiAPI, GEMINI_SYSTEM_ROLE } from "./gemini-service";
import { binanceClient, newsClient } from "../api-clients";

interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
}

interface KeywordSentimentResult extends SentimentResult {
  keywords?: string[];
}

interface MarketSentimentData {
  news: {
    overallSentiment: {
      sentiment: "positive" | "negative" | "neutral";
      confidence: number;
    };
    articles: any[];
    sentiments: (SentimentResult | KeywordSentimentResult)[];
    keyTopics: { topic: string; mentions: number }[];
    marketImpact: "bullish" | "bearish" | "neutral";
  };
  social: {
    overallSentiment: {
      sentiment: "positive" | "negative" | "neutral";
      confidence: number;
    };
    trending: { topic: string; mentions: number }[];
    sentiments: (SentimentResult | KeywordSentimentResult)[];
  };
  overall: {
    sentiment: "positive" | "negative" | "neutral";
    confidence: number;
  };
  coinSentiments: {
    coin: string;
    sentiment: {
      sentiment: "positive" | "negative" | "neutral";
      confidence: number;
    };
  }[];
}

interface InvestmentAnalysisData {
  amount: number;
  timeframe: "short" | "medium" | "long";
  riskTolerance: "conservative" | "moderate" | "aggressive";
  coins: MarketAnalysis["coin"][];
  marketSentiment: MarketSentimentData;
  technicalAnalysis: Array<{
    symbol: string;
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
    volume: number;
    volatility: number;
  }>;
}

export class InvestmentAnalysisService {
  /**
   * Analyze investment options for a given amount and criteria
   */
  async analyzeInvestmentOptions(
    amount: number,
    timeframe: string = "long",
    preferences?: string
  ): Promise<InvestmentAnalysisResponse> {
    try {
      console.log(
        `Analyzing investment options for $${amount} (${timeframe}-term)`
      );

      // 1. Get market data
      const marketData = await this.getMarketData();

      // 2. Get sentiment analysis from HuggingFace
      const sentimentData = await this.analyzeCryptoSentiment(marketData.coins);

      // 3. Generate technical analysis
      const technicalData = await this.generateTechnicalAnalysis(
        marketData.coins
      );

      // 4. Create investment analysis data
      const analysisData: InvestmentAnalysisData = {
        amount,
        timeframe: this.normalizeTimeframe(timeframe),
        riskTolerance: this.determineRiskTolerance(preferences || ""),
        coins: marketData.coins,
        marketSentiment: sentimentData,
        technicalAnalysis: technicalData,
      };

      // 5. Generate recommendations using HuggingFace analysis
      const recommendations = await this.generateRecommendations(analysisData);

      // 6. Use Gemini to format and explain the analysis
      const analysis = await this.generateGeminiAnalysis(
        analysisData,
        recommendations,
        preferences
      );

      // 7. Generate risk assessment
      const riskAssessment = await this.generateRiskAssessment(
        analysisData,
        recommendations
      );

      return {
        recommendations,
        analysis,
        riskAssessment,
        metadata: {
          amount,
          timeframe: timeframe || "long",
          analysisDate: new Date().toISOString(),
          disclaimer:
            "This is educational content, not financial advice. Always do your own research.",
          processingTime: Date.now(),
          dataSource: "Live market data + AI analysis",
        },
      };
    } catch (error) {
      console.error("Investment analysis failed:", error);
      throw new Error("Failed to analyze investment options");
    }
  }

  /**
   * Get comprehensive market data
   */
  private async getMarketData() {
    try {
      const [marketData, marketStats] = await Promise.all([
        binanceClient.getTopCryptocurrencies(),
        binanceClient.getMarketStats(),
      ]);

      // Map the data to match our expected interface
      const mappedCoins = marketData.slice(0, 10).map((coin) => ({
        symbol: coin.symbol as string,
        name: coin.name,
        price: coin.price,
        priceChange24h: coin.priceChangePercent24h, // Map from priceChangePercent24h
        volume24h: coin.volume24h,
        marketCap: coin.marketCap,
      }));

      return {
        coins: mappedCoins,
        stats: marketStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error("Failed to fetch market data");
    }
  }

  /**
   * Analyze crypto sentiment using HuggingFace
   */
  private async analyzeCryptoSentiment(coins: MarketAnalysis["coin"][]) {
    try {
      console.log("Analyzing crypto sentiment with HuggingFace...");

      // Create analysis texts for each coin
      const analysisTexts = coins.map(
        (coin) =>
          `${coin.name} cryptocurrency ${coin.symbol} current price $${coin.price} ` +
          `24h change ${coin.priceChange24h}% volume $${coin.volume24h} ` +
          `market cap $${coin.marketCap}`
      );

      // 2. Get news data with retry mechanism
      const maxRetries = 3;
      let newsData: Array<{ title?: string; description?: string }> = [];
      let retryCount = 0;
      let lastError;

      while (retryCount < maxRetries) {
        try {
          newsData = await newsClient.getCryptoNews();
          break;
        } catch (error) {
          console.warn(`News fetch attempt ${retryCount + 1} failed:`, error);
          lastError = error;
          retryCount++;
          if (retryCount === maxRetries) {
            console.error("Failed to fetch news data after max retries");
          }
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount)
          );
        }
      }

      // Process and filter news texts
      const newsTexts = newsData
        .slice(0, 20)
        .map((article) => {
          const title = article.title || "";
          const description = article.description || "";
          return `${title}. ${description}`.trim();
        })
        .filter((text) => text.length > 10); // Filter out too short texts

      console.log(
        `Processing ${analysisTexts.length} market updates and ${newsTexts.length} news articles...`
      );

      // 3. Analyze texts with batched processing and error handling
      const [coinSentiments, newsSentiments] = await Promise.allSettled([
        analyzeMultipleTexts(analysisTexts, 3),
        analyzeMultipleTexts(newsTexts, 5),
      ]).then((results) => {
        return results.map((result) =>
          result.status === "fulfilled" ? result.value : []
        );
      });

      // 4. Calculate overall sentiment with error checks
      const validSentiments = [
        ...(Array.isArray(coinSentiments) ? coinSentiments : []),
        ...(Array.isArray(newsSentiments) ? newsSentiments : []),
      ].filter((sentiment) => sentiment && sentiment.sentiment);

      const overallSentiment =
        validSentiments.length > 0
          ? calculateOverallSentiment(validSentiments)
          : { sentiment: "neutral", confidence: 0.5 };

      const transformedSentiment = {
        sentiment: overallSentiment.sentiment as
          | "neutral"
          | "positive"
          | "negative",
        confidence: overallSentiment.confidence,
      };

      // Log analysis progress
      console.log("Sentiment analysis complete:", {
        totalProcessed: validSentiments.length,
        overall: transformedSentiment.sentiment,
        confidence: transformedSentiment.confidence,
      });

      return {
        news: {
          overallSentiment: transformedSentiment,
          articles: newsData.slice(0, 10),
          sentiments: newsSentiments,
          keyTopics: this.extractTrendingTopics(newsData),
          marketImpact: (overallSentiment.sentiment === "positive"
            ? "bullish"
            : overallSentiment.sentiment === "negative"
            ? "bearish"
            : "neutral") as "bullish" | "bearish" | "neutral",
        },
        social: {
          overallSentiment: transformedSentiment,
          trending: this.extractTrendingTopics(newsData),
          sentiments: coinSentiments,
        },
        overall: transformedSentiment,
        coinSentiments: coins.map((coin, index) => ({
          coin: coin.symbol,
          sentiment: coinSentiments[index] || {
            sentiment: "neutral",
            confidence: 0.5,
          },
        })),
      };
    } catch (error) {
      console.error("Sentiment analysis failed:", error);

      // Log detailed error information for debugging
      if (error instanceof Error) {
        console.error({
          name: error.name,
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
      }

      // Return graceful fallback with neutral sentiment
      const fallbackSentiment: MarketSentimentData = {
        news: {
          overallSentiment: { sentiment: "neutral", confidence: 0.5 },
          articles: [],
          sentiments: [],
          keyTopics: [],
          marketImpact: "neutral",
        },
        social: {
          overallSentiment: { sentiment: "neutral", confidence: 0.5 },
          trending: [],
          sentiments: [],
        },
        overall: { sentiment: "neutral", confidence: 0.5 },
        coinSentiments: coins.map((coin) => ({
          coin: coin.symbol,
          sentiment: { sentiment: "neutral", confidence: 0.5 },
        })),
      };

      // Log fallback response
      console.log("Returning fallback sentiment data");
      return fallbackSentiment;
    }
  }

  /**
   * Generate technical analysis for coins
   */
  private generateTechnicalAnalysis(coins: MarketAnalysis["coin"][]) {
    return coins.map((coin) => ({
      symbol: coin.symbol,
      rsi: this.calculateRSI([coin.price]), // Simplified - in real implementation, you'd need historical data
      macd: {
        value: coin.priceChange24h > 0 ? 0.8 : -0.8,
        signal: 0.5,
        histogram: coin.priceChange24h / 100,
      },
      movingAverages: {
        sma20: coin.price * 0.98,
        sma50: coin.price * 0.95,
        sma200: coin.price * 0.9,
      },
      volume: coin.volume24h,
      volatility: Math.abs(coin.priceChange24h),
    }));
  }

  /**
   * Generate investment recommendations based on analysis
   */
  private async generateRecommendations(
    data: InvestmentAnalysisData
  ): Promise<InvestmentRecommendation[]> {
    const recommendations: InvestmentRecommendation[] = [];

    for (const coin of data.coins.slice(0, 5)) {
      // Top 5 coins
      const coinSentiment = data.marketSentiment.coinSentiments.find(
        (cs) => cs.coin === coin.symbol
      );

      interface TechnicalAnalysisData {
        symbol: string;
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
        volume: number;
        volatility: number;
      }

      const technicalData: TechnicalAnalysisData | undefined =
        data.technicalAnalysis.find(
          (ta: TechnicalAnalysisData) => ta.symbol === coin.symbol
        );

      // Calculate scores based on sentiment and technical data
      const sentimentScore = this.calculateSentimentScore(
        coinSentiment?.sentiment
      );
      const technicalScore = this.calculateTechnicalScore(technicalData);
      const fundamentalScore = this.calculateFundamentalScore(coin);

      // Calculate allocation based on scores and risk tolerance
      const allocation = this.calculateAllocation(
        sentimentScore,
        technicalScore,
        fundamentalScore,
        data.riskTolerance,
        data.amount
      );

      if (allocation > 0) {
        recommendations.push({
          coin,
          allocation,
          reasoning: this.generateRecommendationReasoning(
            coin,
            sentimentScore,
            technicalScore,
            fundamentalScore,
            coinSentiment?.sentiment
          ),
          riskLevel: this.assessRiskLevel(coin, technicalData),
          sentimentScore,
          technicalScore,
          fundamentalScore,
        });
      }
    }

    // Sort by overall score and normalize allocations
    recommendations.sort(
      (a, b) =>
        b.sentimentScore +
        b.technicalScore +
        b.fundamentalScore -
        (a.sentimentScore + a.technicalScore + a.fundamentalScore)
    );

    return this.normalizeAllocations(recommendations, data.amount);
  }

  /**
   * Generate analysis using Gemini API
   */
  private async generateGeminiAnalysis(
    data: InvestmentAnalysisData,
    recommendations: InvestmentRecommendation[],
    preferences?: string
  ): Promise<string> {
    const prompt = `${GEMINI_SYSTEM_ROLE}

INVESTMENT ANALYSIS REQUEST

Investment Details:
• Amount: $${data.amount.toLocaleString()}
• Timeframe: ${data.timeframe}-term investment
• Risk Tolerance: ${data.riskTolerance}
• User Preferences: ${preferences || "None specified"}

Market Sentiment Analysis (HuggingFace AI):
• Overall Market Sentiment: ${data.marketSentiment.overall.sentiment} (${(
      data.marketSentiment.overall.confidence * 100
    ).toFixed(1)}% confidence)
• News Sentiment: ${data.marketSentiment.news.overallSentiment.sentiment}
• Social Sentiment: ${data.marketSentiment.social.overallSentiment.sentiment}

Top Investment Recommendations:
${recommendations
  .map(
    (rec, index) => `
${index + 1}. ${rec.coin.name} (${rec.coin.symbol})
   • Allocation: $${rec.allocation.toLocaleString()} (${(
      (rec.allocation / data.amount) *
      100
    ).toFixed(1)}%)
   • Current Price: $${rec.coin.price.toLocaleString()}
   • 24h Change: ${rec.coin.priceChange24h.toFixed(2)}%
   • Risk Level: ${rec.riskLevel}
   • Sentiment Score: ${rec.sentimentScore.toFixed(2)}/10
   • Technical Score: ${rec.technicalScore.toFixed(2)}/10
   • Reasoning: ${rec.reasoning}
`
  )
  .join("")}

Please provide a comprehensive investment analysis with the following sections:

1. 💰 INVESTMENT STRATEGY OVERVIEW
2. 📊 PORTFOLIO ALLOCATION BREAKDOWN
3. 🤖 AI SENTIMENT INSIGHTS
4. 📈 TECHNICAL ANALYSIS SUMMARY
5. ⚠️ RISK ASSESSMENT & WARNINGS
6. 🎯 IMPLEMENTATION PLAN
7. 📚 BEGINNER'S GUIDE

Requirements:
- Use clear, educational language
- Include specific dollar amounts and percentages
- Provide actionable advice
- Include comprehensive risk warnings
- No financial advice disclaimers (focus on education)
- Use emojis and bullet points for readability
- Explain AI sentiment analysis results in simple terms`;

    return await callGeminiAPI(prompt);
  }

  /**
   * Generate risk assessment for recommendations
   */
  private async generateRiskAssessment(
    data: InvestmentAnalysisData,
    recommendations: InvestmentRecommendation[]
  ): Promise<string> {
    const totalHighRisk = recommendations
      .filter((r) => r.riskLevel === "high")
      .reduce((sum, r) => sum + r.allocation, 0);

    const riskPercentage = (totalHighRisk / data.amount) * 100;

    let riskLevel = "Low";
    if (riskPercentage > 60) riskLevel = "Very High";
    else if (riskPercentage > 40) riskLevel = "High";
    else if (riskPercentage > 20) riskLevel = "Medium";

    return `${riskLevel} Risk Portfolio (${riskPercentage.toFixed(
      1
    )}% in high-risk assets)`;
  }

  // Helper methods
  private normalizeTimeframe(timeframe: string): "short" | "medium" | "long" {
    const normalized = timeframe.toLowerCase();
    if (
      normalized.includes("short") ||
      normalized.includes("day") ||
      normalized.includes("week")
    ) {
      return "short";
    }
    if (normalized.includes("medium") || normalized.includes("month")) {
      return "medium";
    }
    return "long";
  }

  private determineRiskTolerance(
    preferences: string
  ): "conservative" | "moderate" | "aggressive" {
    const lower = preferences.toLowerCase();
    if (
      lower.includes("conservative") ||
      lower.includes("safe") ||
      lower.includes("low risk")
    ) {
      return "conservative";
    }
    if (
      lower.includes("aggressive") ||
      lower.includes("high risk") ||
      lower.includes("risky")
    ) {
      return "aggressive";
    }
    return "moderate";
  }

  private calculateSentimentScore(sentiment: any): number {
    if (!sentiment) return 5;

    const baseScore =
      sentiment.sentiment === "positive"
        ? 7.5
        : sentiment.sentiment === "negative"
        ? 2.5
        : 5;

    const confidenceBonus = (sentiment.confidence || 0.5) * 2;
    return Math.min(10, baseScore + confidenceBonus);
  }

  private calculateTechnicalScore(technical: any): number {
    if (!technical) return 5;

    let score = 5;

    // RSI scoring
    if (technical.rsi > 70) score -= 1; // Overbought
    else if (technical.rsi < 30) score += 1; // Oversold

    // MACD scoring
    if (technical.macd.value > technical.macd.signal) score += 1;
    else score -= 1;

    // Volume scoring
    if (technical.volume > 1000000000) score += 1; // High liquidity

    return Math.max(0, Math.min(10, score));
  }

  private calculateFundamentalScore(coin: MarketAnalysis["coin"]): number {
    let score = 5;

    // Market cap scoring
    if (coin.marketCap > 100000000000) score += 2; // Large cap
    else if (coin.marketCap > 10000000000) score += 1; // Mid cap
    else score -= 1; // Small cap (higher risk)

    // Volume scoring
    if (coin.volume24h > coin.marketCap * 0.1) score += 1; // Good liquidity

    return Math.max(0, Math.min(10, score));
  }

  private calculateAllocation(
    sentimentScore: number,
    technicalScore: number,
    fundamentalScore: number,
    riskTolerance: "conservative" | "moderate" | "aggressive",
    totalAmount: number
  ): number {
    const overallScore =
      (sentimentScore + technicalScore + fundamentalScore) / 3;

    let baseAllocation = 0;
    if (overallScore >= 7) baseAllocation = 0.4; // 40% max for top assets
    else if (overallScore >= 6) baseAllocation = 0.25;
    else if (overallScore >= 5) baseAllocation = 0.15;
    else return 0; // Don't recommend assets scoring below 5

    // Adjust for risk tolerance
    const riskMultiplier =
      riskTolerance === "aggressive"
        ? 1.2
        : riskTolerance === "conservative"
        ? 0.8
        : 1.0;

    return Math.round(totalAmount * baseAllocation * riskMultiplier);
  }

  private generateRecommendationReasoning(
    coin: MarketAnalysis["coin"],
    sentimentScore: number,
    technicalScore: number,
    fundamentalScore: number,
    sentiment: any
  ): string {
    const reasons = [];

    if (sentimentScore > 7)
      reasons.push(`Strong positive sentiment (${sentiment?.sentiment})`);
    if (technicalScore > 6) reasons.push("Favorable technical indicators");
    if (fundamentalScore > 7) reasons.push("Strong market fundamentals");
    if (coin.marketCap > 50000000000)
      reasons.push("Large market cap (stability)");
    if (Math.abs(coin.priceChange24h) < 5) reasons.push("Low volatility");

    return reasons.join(", ") || "Balanced risk/reward profile";
  }

  private assessRiskLevel(
    coin: MarketAnalysis["coin"],
    technical: any
  ): "low" | "medium" | "high" {
    let riskScore = 0;

    if (coin.marketCap < 1000000000) riskScore += 2; // Small cap
    if (Math.abs(coin.priceChange24h) > 10) riskScore += 2; // High volatility
    if (technical?.volatility > 15) riskScore += 1;

    if (riskScore >= 4) return "high";
    if (riskScore >= 2) return "medium";
    return "low";
  }

  private normalizeAllocations(
    recommendations: InvestmentRecommendation[],
    totalAmount: number
  ): InvestmentRecommendation[] {
    const totalAllocated = recommendations.reduce(
      (sum, rec) => sum + rec.allocation,
      0
    );

    if (totalAllocated > totalAmount) {
      const scale = totalAmount / totalAllocated;
      recommendations.forEach((rec) => {
        rec.allocation = Math.round(rec.allocation * scale);
      });
    }

    return recommendations;
  }

  private extractTrendingTopics(newsData: any[]): any[] {
    // Extract trending topics from news
    const topics = ["Bitcoin", "Ethereum", "DeFi", "NFT", "Regulation"];
    return topics.map((topic) => ({
      topic,
      mentions: newsData.filter((article) =>
        article.title.toLowerCase().includes(topic.toLowerCase())
      ).length,
    }));
  }

  private calculateRSI(prices: number[]): number {
    // Simplified RSI calculation - in production, use historical price data
    return 50 + (Math.random() - 0.5) * 40; // Mock RSI between 30-70
  }
}

export const investmentAnalysisService = new InvestmentAnalysisService();
