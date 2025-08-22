import crypto from "crypto";

export interface BinanceTickerData {
  symbol: string;
  price: string;
  priceChangePercent: string;
  volume: string;
  count: number;
}

export interface BinanceMarketStats {
  totalMarketCap: string;
  totalVolume24h: string;
  btcDominance: string;
}

class BinanceService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.BINANCE_API_KEY || "";
    this.apiSecret = process.env.BINANCE_API_SECRET || "";
    this.baseUrl = process.env.BINANCE_BASE_URL || "https://api.binance.com";
  }

  private createSignature(queryString: string): string {
    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(queryString)
      .digest("hex");
  }

  private async makeRequest(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      // For public endpoints like /api/v3/ticker/24hr, we don't need signature
      const isPublicEndpoint =
        endpoint.includes("/ticker/") || endpoint.includes("/exchangeInfo");
      let url: string;

      if (isPublicEndpoint) {
        const queryString = new URLSearchParams(params).toString();
        url = `${this.baseUrl}${endpoint}${
          queryString ? "?" + queryString : ""
        }`;
      } else {
        // For authenticated endpoints
        const timestamp = Date.now();
        const queryString = new URLSearchParams({
          ...params,
          timestamp: timestamp.toString(),
        }).toString();

        const signature = this.createSignature(queryString);
        url = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;
      }

      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "TradeableAI/1.0",
      };

      // Only add API key for authenticated endpoints
      if (!isPublicEndpoint) {
        headers["X-MBX-APIKEY"] = this.apiKey;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Binance API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
        });
        throw new Error(
          `Binance API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Binance API request failed:", {
        endpoint,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async get24hrTicker(symbol?: string): Promise<BinanceTickerData[]> {
    try {
      console.log("Fetching 24hr ticker data from Binance...");
      const params = symbol ? { symbol } : {};
      const data = await this.makeRequest("/api/v3/ticker/24hr", params);

      // Return array format consistently
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error("Failed to fetch Binance ticker data:", error);
      throw new Error("Unable to fetch real-time market data from Binance");
    }
  }

  async getTopCryptocurrencies(): Promise<any[]> {
    try {
      console.log("Fetching top cryptocurrencies from Binance...");

      // Get 24hr ticker for major cryptocurrencies
      const majorSymbols = [
        "BTCUSDT",
        "ETHUSDT",
        "ADAUSDT",
        "DOTUSDT",
        "LINKUSDT",
        "LTCUSDT",
        "BCHUSDT",
        "XLMUSDT",
      ];
      const tickerData = await this.get24hrTicker();

      // Filter for major cryptocurrencies and format
      const majorTickers = tickerData
        .filter((ticker) => majorSymbols.includes(ticker.symbol))
        .map((ticker) => ({
          id: ticker.symbol.replace("USDT", "").toLowerCase(),
          symbol: ticker.symbol.replace("USDT", ""),
          name: this.getSymbolName(ticker.symbol.replace("USDT", "")),
          price: parseFloat(ticker.price).toFixed(2),
          priceChangePercent24h: parseFloat(ticker.priceChangePercent).toFixed(
            2
          ),
          volume24h: parseFloat(ticker.volume).toFixed(0),
          marketCap: this.estimateMarketCap(
            ticker.symbol.replace("USDT", ""),
            parseFloat(ticker.price)
          ),
        }))
        .sort((a, b) => parseFloat(b.marketCap) - parseFloat(a.marketCap))
        .slice(0, 8);

      return majorTickers;
    } catch (error) {
      console.error("Failed to fetch top cryptocurrencies:", error);
      throw error;
    }
  }

  private getSymbolName(symbol: string): string {
    const names: Record<string, string> = {
      BTC: "Bitcoin",
      ETH: "Ethereum",
      ADA: "Cardano",
      DOT: "Polkadot",
      LINK: "Chainlink",
      LTC: "Litecoin",
      BCH: "Bitcoin Cash",
      XLM: "Stellar",
      USDT: "Tether",
      BNB: "Binance Coin",
      XRP: "Ripple",
      SOL: "Solana",
      DOGE: "Dogecoin",
      MATIC: "Polygon",
      AVAX: "Avalanche",
      UNI: "Uniswap",
      TRX: "Tron",
      ATOM: "Cosmos",
      XMR: "Monero",
    };
    return names[symbol] || symbol;
  }

  private estimateMarketCap(symbol: string, price: number): string {
    // Rough estimates for market cap calculation
    const circulatingSupplies: Record<string, number> = {
      BTC: 19800000,
      ETH: 120000000,
      ADA: 35000000000,
      DOT: 1400000000,
      LINK: 540000000,
      LTC: 75000000,
      BCH: 19800000,
      XLM: 29000000000,
      USDT: 70000000000,
      BNB: 160000000,
      XRP: 50000000000,
      SOL: 400000000,
      DOGE: 130000000000,
      MATIC: 8000000000,
      AVAX: 300000000,
      UNI: 1000000000,
      TRX: 100000000000,
      ATOM: 250000000,
      XMR: 18000000,
    };

    const supply = circulatingSupplies[symbol] || 1000000;
    return (price * supply).toFixed(0);
  }

  async getMarketStats(): Promise<BinanceMarketStats> {
    try {
      console.log("Calculating market statistics from Binance data...");

      const tickers = await this.getTopCryptocurrencies();

      // Calculate total market cap and volume
      let totalMarketCap = 0;
      let totalVolume = 0;
      let btcMarketCap = 0;

      tickers.forEach((ticker) => {
        const marketCap = parseFloat(ticker.marketCap);
        const volume = parseFloat(ticker.volume24h);

        totalMarketCap += marketCap;
        totalVolume += volume;

        if (ticker.symbol === "BTC") {
          btcMarketCap = marketCap;
        }
      });

      const btcDominance =
        totalMarketCap > 0
          ? ((btcMarketCap / totalMarketCap) * 100).toFixed(1)
          : "0";

      return {
        totalMarketCap: this.formatNumber(totalMarketCap),
        totalVolume24h: this.formatNumber(totalVolume),
        btcDominance: `${btcDominance}%`,
      };
    } catch (error) {
      console.error("Failed to calculate market stats:", error);
      throw error;
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1e12) {
      return `$${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    } else {
      return `$${num.toFixed(2)}`;
    }
  }

  async getMarketData(): Promise<any[]> {
    return this.getTopCryptocurrencies();
  }
}

export default new BinanceService();
