import fetch from "node-fetch";
import config from "../config/env";
import { pipeline } from "@xenova/transformers";

export type SentimentLabel = "positive" | "negative" | "neutral";

export interface SentimentResult {
  sentiment: SentimentLabel;
  confidence: number;
  scores: Array<{ label: string; score: number }>;
}

export interface KeywordSentimentResult {
  sentiment: SentimentLabel;
  confidence: number;
  method: "keyword";
  scores: Array<{ label: string; score: number }>;
}

interface HuggingFaceResponse {
  predictions?: Array<{ label: string; score: number }>;
  [key: string]: any;
}

export class SentimentAnalysisError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "SentimentAnalysisError";
  }
}

// Keyword lists for fallback sentiment analysis
const POSITIVE_KEYWORDS = [
  "bullish",
  "rally",
  "surge",
  "moon",
  "pump",
  "breakout",
  "profit",
  "gain",
  "rise",
  "up",
  "green",
  "buy",
  "support",
  "strong",
  "growth",
  "positive",
  "optimistic",
  "confident",
  "milestone",
  "partnership",
  "adoption",
  "upgrade",
];

const NEGATIVE_KEYWORDS = [
  "bearish",
  "crash",
  "dump",
  "sell",
  "drop",
  "fall",
  "down",
  "red",
  "resistance",
  "weak",
  "decline",
  "loss",
  "negative",
  "concern",
  "risk",
  "volatile",
  "uncertainty",
  "regulation",
  "ban",
  "hack",
  "scam",
  "bubble",
];

class SentimentAnalyzer {
  private static instance: SentimentAnalyzer;
  private model: any = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {} // Private constructor for singleton

  static getInstance(): SentimentAnalyzer {
    if (!SentimentAnalyzer.instance) {
      SentimentAnalyzer.instance = new SentimentAnalyzer();
    }
    return SentimentAnalyzer.instance;
  }

  async initialize() {
    if (this.model) return;
    if (this.isInitializing) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = (async () => {
      try {
        console.log("Loading FinBERT model locally...");
        this.model = await pipeline("sentiment-analysis", "ProsusAI/finbert");
        console.log("FinBERT model loaded successfully");
      } catch (error) {
        console.error("Failed to load FinBERT model:", error);
        throw error;
      } finally {
        this.isInitializing = false;
      }
    })();

    return this.initPromise;
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    await this.initialize();

    try {
      const result = await this.model(text);
      const prediction = result[0];

      return {
        sentiment: prediction.label.toLowerCase() as SentimentLabel,
        confidence: prediction.score,
        scores: [
          { label: prediction.label.toLowerCase(), score: prediction.score },
          // Add other labels with 0 score
          ...["positive", "negative", "neutral"]
            .filter((label) => label !== prediction.label.toLowerCase())
            .map((label) => ({ label, score: 0 })),
        ],
      };
    } catch (error) {
      console.error("Local sentiment analysis failed:", error);
      // Fallback to keyword analysis if local model fails
      return analyzeKeywordSentiment(text);
    }
  }
}

/**
 * Fallback keyword-based sentiment analysis
 */
function analyzeKeywordSentiment(text: string): KeywordSentimentResult {
  if (!text || text.trim().length === 0) {
    return {
      sentiment: "neutral",
      confidence: 0.5,
      method: "keyword",
      scores: [
        { label: "positive", score: 0 },
        { label: "negative", score: 0 },
        { label: "neutral", score: 1 },
      ],
    };
  }

  const lowerText = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;

  // Count positive keywords with escaped regex
  POSITIVE_KEYWORDS.forEach((keyword) => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = (lowerText.match(new RegExp(escapedKeyword, "g")) || [])
      .length;
    positiveScore += matches;
  });

  // Count negative keywords with escaped regex
  NEGATIVE_KEYWORDS.forEach((keyword) => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = (lowerText.match(new RegExp(escapedKeyword, "g")) || [])
      .length;
    negativeScore += matches;
  });

  const totalScore = positiveScore + negativeScore;

  if (totalScore === 0) {
    return {
      sentiment: "neutral" as SentimentLabel,
      confidence: 0.5,
      method: "keyword",
      scores: [
        { label: "positive", score: 0 },
        { label: "negative", score: 0 },
        { label: "neutral", score: 1 },
      ],
    };
  }

  const positiveRatio = positiveScore / totalScore;
  const negativeRatio = negativeScore / totalScore;

  let sentiment: SentimentLabel = "neutral";
  let confidence = 0.5;

  if (positiveRatio > 0.6) {
    sentiment = "positive";
    confidence = Math.min(0.8, positiveRatio);
  } else if (negativeRatio > 0.6) {
    sentiment = "negative";
    confidence = Math.min(0.8, negativeRatio);
  }
  return {
    sentiment,
    confidence,
    method: "keyword",
    scores: [
      { label: "positive", score: positiveRatio },
      { label: "negative", score: negativeRatio },
      { label: "neutral", score: 1 - (positiveRatio + negativeRatio) },
    ],
  };
  return {
    sentiment,
    confidence,
    method: "keyword",
    scores: [
      { label: "positive", score: positiveRatio },
      { label: "negative", score: negativeRatio },
      { label: "neutral", score: 1 - (positiveRatio + negativeRatio) },
    ],
  };
}

/**
 * Analyze sentiment with automatic fallback to keyword analysis
 */
export async function analyzeSentiment(
  text: string
): Promise<SentimentResult | KeywordSentimentResult> {
  try {
    const analyzer = SentimentAnalyzer.getInstance();
    return await analyzer.analyzeSentiment(text);
  } catch (error) {
    console.warn("Local sentiment analysis failed:", error);
    return analyzeKeywordSentiment(text);
  }
}

/**
 * Analyze multiple texts in parallel with controlled concurrency
 */
export async function analyzeMultipleTexts(
  texts: string[],
  maxConcurrency: number = 3
): Promise<Array<SentimentResult | KeywordSentimentResult>> {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const startTime = Date.now();
  console.log(`Starting analysis of ${texts.length} texts...`);

  // Process texts in batches to avoid overwhelming the API
  const results: Array<SentimentResult | KeywordSentimentResult> = [];

  for (let i = 0; i < texts.length; i += maxConcurrency) {
    const batch = texts.slice(i, i + maxConcurrency);

    const batchPromises = batch.map(async (text, index) => {
      try {
        console.log(`Analyzing sentiment with FinBERT model`);
        return await analyzeSentiment(text);
      } catch (error) {
        console.error(`Error analyzing text ${i + index}:`, error);
        return analyzeKeywordSentiment(text);
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);

    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        console.error(`Failed to analyze text ${i + index}:`, result.reason);
        results.push(analyzeKeywordSentiment(texts[i + index]));
      }
    });

    // Add small delay between batches to be respectful to the API
    if (i + maxConcurrency < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const successfulAnalyses = results.filter((r) => !("method" in r)).length;
  const fallbackAnalyses = results.filter((r) => "method" in r).length;

  console.log(`Analysis complete in ${totalTime}ms:`);
  console.log(`- Total texts: ${texts.length}`);
  console.log(`- Successful: ${successfulAnalyses}`);
  console.log(`- Fallback used: ${fallbackAnalyses}`);
  console.log(
    `- Average time per text: ${Math.round(totalTime / texts.length)}ms`
  );

  return results;
}

/**
 * Calculate overall sentiment from multiple analysis results with improved accuracy
 */
export function calculateOverallSentiment(
  results: Array<SentimentResult | KeywordSentimentResult>
): { sentiment: string; confidence: number; breakdown: any } {
  if (!Array.isArray(results) || results.length === 0) {
    return {
      sentiment: "neutral",
      confidence: 0.5,
      breakdown: {
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0,
        percentages: {
          positive: 0,
          negative: 0,
          neutral: 0,
        },
        averageConfidence: 0,
      },
    };
  }

  const breakdown = {
    positive: 0,
    negative: 0,
    neutral: 0,
    total: results.length,
    percentages: {
      positive: 0,
      negative: 0,
      neutral: 0,
    },
    averageConfidence: 0,
  };

  let totalWeightedScore = 0;

  // First pass: Count occurrences and calculate confidence
  results.forEach((result) => {
    const weight = result.confidence || 0.5;
    totalWeightedScore += weight;

    switch (result.sentiment) {
      case "positive":
        breakdown.positive++;
        break;
      case "negative":
        breakdown.negative++;
        break;
      case "neutral":
        breakdown.neutral++;
        break;
    }
  });

  // Calculate accurate percentages
  const total = breakdown.total;
  breakdown.percentages = {
    positive: Number(((breakdown.positive / total) * 100).toFixed(2)),
    negative: Number(((breakdown.negative / total) * 100).toFixed(2)),
    neutral: Number(((breakdown.neutral / total) * 100).toFixed(2)),
  };

  // Calculate weighted confidence score
  breakdown.averageConfidence = Number(
    (totalWeightedScore / results.length).toFixed(3)
  );

  // Determine overall sentiment using weighted thresholds
  let overallSentiment = "neutral";
  let confidence = breakdown.averageConfidence;

  const positivePercentage = breakdown.percentages.positive;
  const negativePercentage = breakdown.percentages.negative;
  const neutralPercentage = breakdown.percentages.neutral;

  if (positivePercentage > 45) {
    overallSentiment = "positive";
    confidence = Math.min(
      0.95,
      positivePercentage / 100 + breakdown.averageConfidence * 0.2
    );
  } else if (negativePercentage > 45) {
    overallSentiment = "negative";
    confidence = Math.min(
      0.95,
      negativePercentage / 100 + breakdown.averageConfidence * 0.2
    );
  } else {
    // More nuanced neutral calculation
    const sentimentSpread = Math.abs(positivePercentage - negativePercentage);
    if (sentimentSpread < 15 || neutralPercentage > 40) {
      overallSentiment = "neutral";
      confidence = Math.min(0.8, breakdown.averageConfidence);
    } else {
      // Lean towards the stronger sentiment if spread is significant
      overallSentiment =
        positivePercentage > negativePercentage ? "positive" : "negative";
      confidence = Math.min(0.7, breakdown.averageConfidence);
    }
  }

  return {
    sentiment: overallSentiment,
    confidence: Number(confidence.toFixed(3)),
    breakdown,
  };
}

// Example usage
const result = await analyzeSentiment("Bitcoin price surges to new highs");
console.log(result); // Local model prediction or keyword fallback
