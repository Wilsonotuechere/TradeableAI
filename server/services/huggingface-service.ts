import fetch, { Response, RequestInit } from "node-fetch";

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

import path from "path";
import dotenv from "dotenv";

// Debug: Log the current working directory and env file path
const envPath = path.resolve(process.cwd(), ".env");
console.log("Current working directory:", process.cwd());
console.log("Looking for .env file at:", envPath);

// Try to load .env file
const result = dotenv.config();
if (result.error) {
  console.log("❌ Error loading .env file:", result.error.message);
} else {
  console.log("✅ .env file loaded successfully");
}

// Debug: Log all environment variables (without values)
console.log(
  "Available environment variables:",
  Object.keys(process.env).join(", ")
);

// Temporary fix - hardcode the token for testing
const HUGGINGFACE_API_KEY =
  process.env.HUGGINGFACE_API_KEY || "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";
const HUGGINGFACE_API_URL =
  "https://api-inference.huggingface.co/models/ProsusAI/finbert";

// Debug logging
console.log(
  "HuggingFace API Key status:",
  HUGGINGFACE_API_KEY
    ? `Loaded (length: ${
        HUGGINGFACE_API_KEY.length
      }, starts with: ${HUGGINGFACE_API_KEY.substring(0, 5)}...)`
    : "Not loaded"
);

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

/**
 * Analyze sentiment using FinBERT model with proper error handling
 */
async function analyzeSentimentWithHuggingFace(
  text: string
): Promise<SentimentResult> {
  if (!HUGGINGFACE_API_KEY) {
    throw new SentimentAnalysisError(
      "HUGGINGFACE_API_KEY is not configured",
      "CONFIG_ERROR"
    );
  }

  if (!text || text.trim().length === 0) {
    throw new SentimentAnalysisError("Text input is empty", "INVALID_INPUT");
  }

  // Truncate text if too long (FinBERT has token limits)
  const truncatedText =
    text.length > 512 ? text.substring(0, 512) + "..." : text;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    // Add debug logging for the API request
    console.log("Making request to HuggingFace API...");
    console.log("API URL:", HUGGINGFACE_API_URL);
    console.log(
      "Authorization header:",
      `Bearer ${HUGGINGFACE_API_KEY.substring(0, 10)}...`
    );

    const response = await fetch(HUGGINGFACE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: truncatedText,
        options: {
          wait_for_model: true,
          use_cache: false,
        },
      }),
      signal: controller.signal,
    });

    console.log(
      "HuggingFace API response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("HuggingFace API error response:", errorBody);

      throw new SentimentAnalysisError(
        `HuggingFace API error: ${response.status} - ${response.statusText}`,
        "API_ERROR",
        { status: response.status, body: errorBody }
      );
    }

    const result = (await response.json()) as HuggingFaceResponse | Array<any>;

    console.log("HuggingFace API raw response:", JSON.stringify(result));

    // Handle different response formats from HuggingFace
    let sentimentData: Array<{ label: string; score: number }>;

    if (Array.isArray(result)) {
      if (Array.isArray(result[0])) {
        // Double nested array [[{label, score}, ...]] - take the first inner array
        sentimentData = result[0];
      } else if (
        result[0] &&
        typeof result[0] === "object" &&
        "label" in result[0]
      ) {
        // Single array of sentiment objects
        sentimentData = result;
      } else {
        console.error("Unexpected array format:", result);
        throw new SentimentAnalysisError(
          "Unexpected response array format from FinBERT model",
          "API_RESPONSE_ERROR",
          { response: result }
        );
      }
    } else if (
      result &&
      typeof result === "object" &&
      "predictions" in result &&
      Array.isArray(result.predictions)
    ) {
      // Some models return {predictions: [...]}
      sentimentData = result.predictions;
    } else {
      console.error(
        "Unexpected FinBERT response format:",
        JSON.stringify(result)
      );
      throw new SentimentAnalysisError(
        "Invalid response format from FinBERT model",
        "API_RESPONSE_ERROR",
        { response: result }
      );
    }

    // Validate the sentiment data structure
    if (!Array.isArray(sentimentData) || sentimentData.length === 0) {
      throw new Error("No sentiment data received from FinBERT");
    }

    // Ensure all items have required properties
    const validSentiments = sentimentData.filter(
      (item) =>
        item && typeof item.label === "string" && typeof item.score === "number"
    );

    if (validSentiments.length === 0) {
      throw new Error("No valid sentiment predictions received");
    }

    // Find the sentiment with highest confidence score
    const dominantSentiment = validSentiments.reduce((prev, current) =>
      prev.score > current.score ? prev : current
    );

    // Normalize label names
    const normalizedLabel = dominantSentiment.label.toLowerCase();
    let sentiment: SentimentLabel = "neutral";

    if (normalizedLabel.includes("positive")) {
      sentiment = "positive";
    } else if (normalizedLabel.includes("negative")) {
      sentiment = "negative";
    }

    return {
      sentiment,
      confidence: dominantSentiment.score,
      scores: validSentiments,
    };
  } catch (error) {
    console.error("FinBERT analysis error:", error);

    // Re-throw SentimentAnalysisError as-is
    if (error instanceof SentimentAnalysisError) {
      throw error;
    }

    // Wrap other errors
    throw new SentimentAnalysisError(
      error instanceof Error ? error.message : "Unknown error",
      "API_ERROR",
      error
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fallback keyword-based sentiment analysis
 */
function analyzeKeywordSentiment(text: string): KeywordSentimentResult {
  if (!text || text.trim().length === 0) {
    return { sentiment: "neutral", confidence: 0.5, method: "keyword" };
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

  return { sentiment, confidence, method: "keyword" };
}

/**
 * Analyze sentiment with automatic fallback to keyword analysis
 */
export async function analyzeSentiment(
  text: string
): Promise<SentimentResult | KeywordSentimentResult> {
  try {
    return await analyzeSentimentWithHuggingFace(text);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.warn(
      "FinBERT analysis failed, using keyword analysis fallback:",
      errorMessage
    );
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
