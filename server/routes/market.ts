import { Router } from "express";
import {
  validateSymbol,
  validateKlinesParams,
  validateOrderBookParams,
} from "../middleware/validators";
import {
  getPrice,
  getMarketSummary,
  getKlines,
  getOrderBook,
} from "../services/market-service";
import { ApiResponse } from "../types/market";

const router = Router();

// Get current price for a symbol
router.get("/price/:symbol", validateSymbol, async (req, res) => {
  try {
    const price = await getPrice(req.params.symbol);
    const response: ApiResponse<{ price: number }> = {
      success: true,
      data: { price },
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    console.error("Price fetch error:", error);
    res.status(503).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch price",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get market summary for a symbol
router.get("/market-summary/:symbol", validateSymbol, async (req, res) => {
  try {
    const summary = await getMarketSummary(req.params.symbol);
    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  } catch (error) {
    console.error("Market summary error:", error);
    res.status(503).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch market summary",
      timestamp: new Date().toISOString(),
    });
  }
});

// Get klines/candlestick data
router.get(
  "/klines/:symbol",
  validateSymbol,
  validateKlinesParams,
  async (req, res) => {
    try {
      const { symbol } = req.params;
      const { interval = "1h", limit = "100" } = req.query;

      const klines = await getKlines(
        symbol,
        interval as string,
        parseInt(limit as string, 10)
      );

      const response: ApiResponse<typeof klines> = {
        success: true,
        data: klines,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      console.error("Klines fetch error:", error);
      res.status(503).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch klines data",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// Get order book data
router.get(
  "/orderbook/:symbol",
  validateSymbol,
  validateOrderBookParams,
  async (req, res) => {
    try {
      const { symbol } = req.params;
      const { limit = "100" } = req.query;

      const orderBook = await getOrderBook(
        symbol,
        parseInt(limit as string, 10)
      );

      const response: ApiResponse<typeof orderBook> = {
        success: true,
        data: orderBook,
        timestamp: new Date().toISOString(),
      };
      res.json(response);
    } catch (error) {
      console.error("Order book fetch error:", error);
      res.status(503).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch order book",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
