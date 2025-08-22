import { Router } from "express";
import newsService from "../services/news-service"; // Fixed: using default import
import { twitterService } from "../services/twitter-service";

const router = Router();

// Get latest crypto news
router.get("/news", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const news = await newsService.fetchCryptoNews(limit);

    res.json({
      success: true,
      data: news,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("News API error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch news",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get market sentiment from Twitter
router.get("/twitter-sentiment", async (req, res) => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: "Symbol parameter is required",
        timestamp: new Date().toISOString(),
      });
    }

    const sentiment = await twitterService.getSentiment(symbol);

    res.json({
      success: true,
      data: sentiment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Twitter API error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch sentiment data",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get fear and greed index
router.get("/fear-greed", async (req, res) => {
  try {
    const index = await newsService.getFearGreedIndex();

    res.json({
      success: true,
      data: index,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Fear & Greed Index error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch fear and greed index",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
