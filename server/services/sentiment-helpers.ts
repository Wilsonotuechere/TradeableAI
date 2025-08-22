// Keywords that might indicate bullish/bearish sentiment in crypto context
const CRYPTO_KEYWORDS = {
  bullish: [
    "surge",
    "rally",
    "breakout",
    "adoption",
    "institutional",
    "integration",
    "partnership",
    "upgrade",
    "launch",
    "mainstream",
    "regulation",
    "approval",
    "innovation",
    "growth",
    "development",
    "success",
    "milestone",
    "bullish",
    "support",
    "buying",
    "accumulation",
    "uptrend",
    "recovery",
    "gain",
  ],
  bearish: [
    "crash",
    "dump",
    "sell-off",
    "ban",
    "hack",
    "scam",
    "fraud",
    "risk",
    "warning",
    "concern",
    "investigation",
    "bearish",
    "resistance",
    "decline",
    "drop",
    "loss",
    "uncertainty",
    "volatility",
    "downtrend",
    "correction",
    "liquidation",
    "breakdown",
    "regulation",
    "crackdown",
  ],
  neutral: [
    "stable",
    "consolidation",
    "sideways",
    "range",
    "accumulation",
    "distribution",
    "trading",
    "market",
    "volume",
    "analysis",
    "technical",
    "fundamental",
    "price",
    "chart",
    "indicator",
    "pattern",
    "level",
  ],
};

interface KeywordAnalysis {
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalKeywords: number;
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
}

export function analyzeKeywords(text: string): KeywordAnalysis {
  const normalizedText = text.toLowerCase();
  const words = normalizedText.split(/\W+/);

  const counts = {
    bullish: words.filter((word) => CRYPTO_KEYWORDS.bullish.includes(word))
      .length,
    bearish: words.filter((word) => CRYPTO_KEYWORDS.bearish.includes(word))
      .length,
    neutral: words.filter((word) => CRYPTO_KEYWORDS.neutral.includes(word))
      .length,
  };

  const totalKeywords = counts.bullish + counts.bearish + counts.neutral;

  // If no keywords found, return neutral with low confidence
  if (totalKeywords === 0) {
    return {
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      totalKeywords: 0,
      sentiment: "neutral",
      confidence: 0.1,
    };
  }

  const bullishRatio = counts.bullish / totalKeywords;
  const bearishRatio = counts.bearish / totalKeywords;
  const neutralRatio = counts.neutral / totalKeywords;

  // Determine sentiment based on keyword ratios
  let sentiment: "positive" | "negative" | "neutral";
  let confidence: number;

  if (bullishRatio > bearishRatio && bullishRatio > neutralRatio) {
    sentiment = "positive";
    confidence = Math.min(bullishRatio + 0.2, 0.95);
  } else if (bearishRatio > bullishRatio && bearishRatio > neutralRatio) {
    sentiment = "negative";
    confidence = Math.min(bearishRatio + 0.2, 0.95);
  } else {
    sentiment = "neutral";
    confidence = Math.min(neutralRatio + 0.1, 0.8);
  }

  return {
    bullishCount: counts.bullish,
    bearishCount: counts.bearish,
    neutralCount: counts.neutral,
    totalKeywords,
    sentiment,
    confidence,
  };
}

export function combineSentimentAnalyses(
  modelSentiment: { label: string; score: number; confidence: number },
  keywordAnalysis: KeywordAnalysis
): { label: string; score: number; confidence: number } {
  // Weight factors (adjust these based on performance)
  const MODEL_WEIGHT = 0.7;
  const KEYWORD_WEIGHT = 0.3;

  // Convert keyword sentiment to score (0-1 range)
  const keywordScore =
    keywordAnalysis.sentiment === "positive"
      ? 0.75
      : keywordAnalysis.sentiment === "negative"
      ? 0.25
      : 0.5;

  // Weighted average of scores
  const combinedScore =
    modelSentiment.score * MODEL_WEIGHT + keywordScore * KEYWORD_WEIGHT;

  // Weighted average of confidence
  const combinedConfidence =
    modelSentiment.confidence * MODEL_WEIGHT +
    keywordAnalysis.confidence * KEYWORD_WEIGHT;

  // Determine final sentiment label
  let finalLabel: string;
  if (combinedScore >= 0.6) {
    finalLabel = "positive";
  } else if (combinedScore <= 0.4) {
    finalLabel = "negative";
  } else {
    finalLabel = "neutral";
  }

  return {
    label: finalLabel,
    score: combinedScore,
    confidence: combinedConfidence,
  };
}

export function validateSentiment(
  text: string,
  sentiment: { label: string; score: number; confidence: number }
) {
  // Check for obvious contradictions
  const lowercaseText = text.toLowerCase();

  const containsBullish = CRYPTO_KEYWORDS.bullish.some((word) =>
    lowercaseText.includes(word)
  );
  const containsBearish = CRYPTO_KEYWORDS.bearish.some((word) =>
    lowercaseText.includes(word)
  );

  // If text contains strong bullish keywords but sentiment is negative (or vice versa)
  if (
    (containsBullish && !containsBearish && sentiment.label === "negative") ||
    (containsBearish && !containsBullish && sentiment.label === "positive")
  ) {
    // Reduce confidence if contradiction found
    return {
      ...sentiment,
      confidence: Math.max(sentiment.confidence * 0.7, 0.1),
    };
  }

  return sentiment;
}
