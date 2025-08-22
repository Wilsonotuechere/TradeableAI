import { z } from "zod";

// Market Analysis Types
export interface MarketAnalysis {
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

export interface InvestmentRecommendation {
  coin: MarketAnalysis["coin"];
  allocation: number;
  reasoning: string;
  riskLevel: "low" | "medium" | "high";
  sentimentScore: number;
  technicalScore: number;
  fundamentalScore: number;
}

export interface InvestmentAnalysisResponse {
  recommendations: InvestmentRecommendation[];
  analysis: string;
  riskAssessment: string;
  metadata: {
    amount: number;
    timeframe: string;
    analysisDate: string;
    disclaimer: string;
    processingTime: number;
    dataSource?: string;
  };
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
    interpretation: string;
  };
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
    position:
      | "above_upper"
      | "upper_band"
      | "middle"
      | "lower_band"
      | "below_lower";
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    sma200: number;
    ema12?: number;
    ema26?: number;
  };
  volume: {
    current: number;
    average: number;
    trend: "increasing" | "decreasing" | "stable";
  };
  momentum: {
    score: number;
    trend: "bullish" | "bearish" | "neutral";
    strength: "weak" | "moderate" | "strong";
  };
}

export interface MarketSentiment {
  label: "positive" | "negative" | "neutral";
  score: number;
  confidence: number;
}

export interface NewsAnalysis {
  overallSentiment: MarketSentiment;
  articles: Array<{
    title: string;
    sentiment: MarketSentiment;
    impact: "high" | "medium" | "low";
    topics: string[];
  }>;
  keyTopics: string[];
  marketImpact: string;
}

export interface SocialAnalysis {
  overallSentiment: MarketSentiment;
  trending: Array<{
    topic: string;
    mentions: number;
    sentiment: MarketSentiment;
    trend: "rising" | "stable" | "falling";
  }>;
  volumeAnalysis: {
    sentiment: "bullish" | "bearish" | "neutral";
    confidence: number;
    patterns: string[];
  };
}

// Validation schemas
export const marketSentimentSchema = z.object({
  label: z.enum(["positive", "negative", "neutral"]),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});

export const newsAnalysisSchema = z.object({
  overallSentiment: marketSentimentSchema,
  articles: z.array(
    z.object({
      title: z.string(),
      sentiment: marketSentimentSchema,
      impact: z.enum(["high", "medium", "low"]),
      topics: z.array(z.string()),
    })
  ),
  keyTopics: z.array(z.string()),
  marketImpact: z.string(),
});

export const socialAnalysisSchema = z.object({
  overallSentiment: marketSentimentSchema,
  trending: z.array(
    z.object({
      topic: z.string(),
      mentions: z.number(),
      sentiment: marketSentimentSchema,
      trend: z.enum(["rising", "stable", "falling"]),
    })
  ),
  volumeAnalysis: z.object({
    sentiment: z.enum(["bullish", "bearish", "neutral"]),
    confidence: z.number().min(0).max(1),
    patterns: z.array(z.string()),
  }),
});
