import { binanceClient } from "./binance-service";
import { ServiceError } from "../utils/errors";
import { CacheManager } from "../utils/cache";
import { MarketSummary, CandleStick, OrderBook } from "../types/market";

// Initialize cache manager
const cache = new CacheManager();

// Cache TTL in seconds
const CACHE_TTL = {
  PRICE: 60, // 1 minute
  MARKET_SUMMARY: 300, // 5 minutes
  ORDER_BOOK: 30, // 30 seconds
  KLINES: 300, // 5 minutes
};

// Validates and normalizes symbol format (e.g., BTC -> BTCUSDT)
function normalizeSymbol(symbol: string): string {
  symbol = symbol.toUpperCase();
  return symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
}

async function getPrice(symbol: string): Promise<number> {
  const cacheKey = `price_${symbol}`;
  try {
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch fresh price from Binance
    const ticker = await binanceClient.get24hrTicker(normalizeSymbol(symbol));
    const price = parseFloat(ticker[0].price);

    // Cache the result
    await cache.set(cacheKey, JSON.stringify(price), CACHE_TTL.PRICE);

    return price;
  } catch (error) {
    console.error("Failed to fetch price:", error);
    throw new ServiceError("Failed to fetch price data", {
      symbol,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
async function getMarketSummary(symbol: string): Promise<MarketSummary> {
  const cacheKey = `market_summary_${symbol}`;
  try {
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch fresh data from Binance
    const normalizedSymbol = normalizeSymbol(symbol);
    const [ticker24h, price] = await Promise.all([
      binanceClient.get24hrTicker(normalizedSymbol),
      getPrice(symbol),
    ]);

    const marketSummary: MarketSummary = {
      symbol,
      price,
      marketCap: parseFloat(ticker24h[0].quoteAssetVolume.toString()),
      volume24h: parseFloat(ticker24h[0].volume),
      high24h: parseFloat(String(ticker24h[0].highPrice)),
      low24h: parseFloat(String(ticker24h[0].lowPrice)),
      priceChange24h: parseFloat(String(ticker24h[0].priceChange)),
      priceChangePercent24h: parseFloat(ticker24h[0].priceChangePercent),
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    await cache.set(
      cacheKey,
      JSON.stringify(marketSummary),
      CACHE_TTL.MARKET_SUMMARY
    );

    return marketSummary;
  } catch (error) {
    console.error("Failed to fetch market summary:", error);
    throw new ServiceError("Failed to fetch market summary", {
      symbol,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function getKlines(
  symbol: string,
  interval: string,
  limit: number
): Promise<CandleStick[]> {
  const cacheKey = `klines_${symbol}_${interval}_${limit}`;
  try {
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch fresh data from Binance
    const tickers = await binanceClient.get24hrTicker(normalizeSymbol(symbol));

    // Transform to CandleStick format
    const candlesticks: CandleStick[] = tickers.map((ticker: any) => ({
      time: Date.parse(ticker.openTime),
      open: parseFloat(ticker.openPrice),
      high: parseFloat(ticker.highPrice),
      low: parseFloat(ticker.lowPrice),
      close: parseFloat(ticker.lastPrice),
      volume: parseFloat(ticker.volume),
      trades: parseInt(ticker.count),
    }));

    // Cache the result
    await cache.set(cacheKey, JSON.stringify(candlesticks), CACHE_TTL.KLINES);

    return candlesticks;
  } catch (error) {
    console.error("Failed to fetch klines:", error);
    throw new ServiceError("Failed to fetch candlestick data", {
      symbol,
      interval,
      limit,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function getOrderBook(symbol: string, limit: number): Promise<OrderBook> {
  const cacheKey = `orderbook_${symbol}_${limit}`;
  try {
    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch fresh data from Binance
    const orderbook = await binanceClient.getDepth(
      normalizeSymbol(symbol),
      limit
    );

    // Transform to our OrderBook format
    const formattedOrderBook: OrderBook = {
      symbol,
      bids: orderbook.bids.map((bid) => ({
        price: parseFloat(bid[0]),
        quantity: parseFloat(bid[1]),
      })),
      asks: orderbook.asks.map((ask) => ({
        price: parseFloat(ask[0]),
        quantity: parseFloat(ask[1]),
      })),
      lastUpdateId: orderbook.lastUpdateId,
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    await cache.set(
      cacheKey,
      JSON.stringify(formattedOrderBook),
      CACHE_TTL.ORDER_BOOK
    );

    return formattedOrderBook;
  } catch (error) {
    console.error("Failed to fetch order book:", error);
    throw new ServiceError("Failed to fetch order book data", {
      symbol,
      limit,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export { getPrice, getMarketSummary, getKlines, getOrderBook, normalizeSymbol };
