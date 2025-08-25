import { Router } from "express";
import { HfInference } from "@huggingface/inference";
import { config } from "../../shared/config";

const hf = new HfInference(config.backend.huggingface.apiKey);

export interface SentimentAnalysisRequest {
  text: string;
}

export interface SentimentAnalysisResponse {
  sentiment: "positive" | "negative" | "neutral";
  score: number;
}

export function setupSentimentRoutes(app: Router) {
  app.post("/api/sentiment", async (req, res) => {
    try {
      const { text } = req.body as SentimentAnalysisRequest;

      if (!text?.trim()) {
        return res.status(400).json({
          success: false,
          error: "Text is required",
        });
      }

      const result = await hf.textClassification({
        model: config.backend.huggingface.model,
        inputs: text,
      });

      const response: SentimentAnalysisResponse = {
        sentiment: result[0].label as "positive" | "negative" | "neutral",
        score: result[0].score,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to analyze sentiment",
      });
    }
  });
}
