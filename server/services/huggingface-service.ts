import fetch from "node-fetch";
import config from "../config/env";

type SentimentLabel = "positive" | "negative" | "neutral";

interface SentimentResult {
  sentiment: SentimentLabel;
  confidence: number;
  scores: Array<{ label: string; score: number }>;
}

interface KeywordSentimentResult {
  sentiment: SentimentLabel;
  confidence: number;
  method: "keyword";
  scores: Array<{ label: string; score: number }>;
}

interface HuggingFaceResponse {
  predictions?: Array<{ label: string; score: number }>;
  [key: string]: any;
}

class SentimentAnalysisError extends Error {
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

class HuggingFaceService {
  private apiKey: string;
  private baseUrl = "https://api-inference.huggingface.co";
  private maxRetries = 2;
  private modelEndpoint = "ProsusAI/finbert";

  constructor() {
    this.apiKey = config.HUGGINGFACE_API_KEY;
    if (!this.apiKey) {
      throw new Error("HUGGINGFACE_API_KEY environment variable is required");
    }
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "TradeableAI/1.0",
    };
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (!text?.trim()) {
          throw new SentimentAnalysisError(
            "Empty text provided",
            "VALIDATION_ERROR"
          );
        }

        const response = await fetch(
          `${this.baseUrl}/models/${this.modelEndpoint}`,
          {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify({
              inputs: text,
              options: { wait_for_model: true },
            }),
            signal: AbortSignal.timeout(10000),
          }
        );

        if (response.status === 401) {
          throw new SentimentAnalysisError(
            "HuggingFace API authentication failed",
            "AUTH_ERROR"
          );
        }

        if (response.status === 503) {
          console.log("Model loading, waiting before retry...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        if (!response.ok) {
          throw new SentimentAnalysisError(
            `HuggingFace API error: ${response.status}`,
            "API_ERROR",
            await response.text()
          );
        }

        const data = await response.json();
        return this.processSentimentResult(data);
      } catch (error) {
        if (error instanceof SentimentAnalysisError) {
          throw error;
        }

        console.warn(`Attempt ${attempt + 1} failed:`, error);

        if (attempt === this.maxRetries) {
          console.log("Using fallback sentiment analysis");
          return analyzeKeywordSentiment(text);
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }

    return analyzeKeywordSentiment(text);
  }

  private processSentimentResult(data: any): SentimentResult {
    if (!Array.isArray(data) || !data[0]) {
      throw new SentimentAnalysisError(
        "Invalid API response format",
        "INVALID_RESPONSE"
      );
    }

    const predictions = data[0];
    const labels = ["positive", "negative", "neutral"];
    const scores = labels.map((label) => ({
      label,
      score: predictions[label] || 0,
    }));

    const highestPrediction = scores.reduce((prev, current) =>
      current.score > prev.score ? current : prev
    );

    return {
      sentiment: highestPrediction.label as SentimentLabel,
      confidence: highestPrediction.score,
      scores,
    };
  }
}

// Create service instance
const huggingFaceService = new HuggingFaceService();

/**
 * Analyze sentiment using FinBERT model with proper error handling
 */
async function analyzeSentimentWithHuggingFace(
  text: string
): Promise<SentimentResult> {
  const HUGGINGFACE_API_KEY = config.HUGGINGFACE_API_KEY;
  const HUGGINGFACE_API_URL =
    "https://api-inference.huggingface.co/models/ProsusAI/finbert";

  if (
    !HUGGINGFACE_API_KEY ||
    HUGGINGFACE_API_KEY.startsWith("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")
  ) {
    console.warn("Invalid HuggingFace API key, using fallback analysis");
    return analyzeKeywordSentiment(text);
  }

  // Test the API key first
  try {
    const testResponse = await fetch(
      "https://api-inference.huggingface.co/models/ProsusAI/finbert",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: "test",
        }),
      }
    );

    if (testResponse.status === 401) {
      console.error("HuggingFace API key is invalid");
      return analyzeKeywordSentiment(text);
    }
  } catch (error) {
    console.warn("HuggingFace API test failed, using fallback");
    return analyzeKeywordSentiment(text);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(HUGGINGFACE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "TradeableAI/1.0",
      },
      body: JSON.stringify({
        inputs: text,
        options: {
          wait_for_model: true,
          use_cache: true,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new SentimentAnalysisError(
        `HuggingFace API error: ${response.status} - ${response.statusText}`,
        "API_ERROR",
        {
          status: response.status,
          body: errorBody,
        }
      );
    }

    const data = await response.json();

    if (!data || !Array.isArray(data)) {
      throw new SentimentAnalysisError(
        "Invalid response format from HuggingFace API",
        "INVALID_RESPONSE"
      );
    }

    // FinBERT specific response handling
    const predictions = data[0] || [];
    const labels = ["positive", "negative", "neutral"];
    const scores = labels.map((label) => ({
      label,
      score: predictions[label] || 0,
    }));

    // Find the prediction with the highest score
    const highestPrediction = scores.reduce(
      (prev, current) => (current.score > prev.score ? current : prev),
      { label: "neutral", score: 0 }
    );

    return {
      sentiment: highestPrediction.label as SentimentLabel,
      confidence: highestPrediction.score,
      scores: scores,
    };
  } catch (error) {
    console.error("HuggingFace analysis failed:", error);
    return analyzeKeywordSentiment(text);
  } finally {
    clearTimeout(timeout);
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
    return await huggingFaceService.analyzeSentiment(text);
  } catch (error) {
    console.warn("Sentiment analysis failed:", error);
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

export {
  analyzeSentimentWithHuggingFace,
  analyzeKeywordSentiment,
  SentimentResult,
  KeywordSentimentResult,
  SentimentAnalysisError,
};
