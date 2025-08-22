import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Brain,
  RefreshCw,
  PieChart,
  Thermometer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import GlassCard from "@/components/ui/glass-card";
import PriceChart from "@/components/market/price-chart";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketIndicators {
  rsi: number;
  sma20: number;
  priceChange24h: number;
  volumeChange24h: number;
}

interface ChartData {
  symbol: string;
  interval: string;
  candles: Candle[];
  indicators: MarketIndicators;
  lastUpdated: string;
}

interface Coin {
  symbol: string;
  name: string;
  price: string;
  priceChange24h: number;
  priceChangePercent24h: string;
  volume24h: string;
  marketCap: string;
}

interface MarketStats {
  totalMarketCap: string;
  totalVolume24h: string;
  btcDominance: string;
  fearGreedIndex: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface MarketData {
  coins: Coin[];
  stats: MarketStats;
}

interface TechnicalAnalysis {
  rsi: number;
  sma20: number;
  macd: number;
  signal: number;
}

interface AnalysisCoin {
  name: string;
  symbol: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
}

interface Analysis {
  coin: AnalysisCoin;
  technicalAnalysis: TechnicalAnalysis;
  aiAnalysis: string;
  timestamp: string;
}

type MarketResponse = ApiResponse<MarketData>;
type AnalysisResponse = ApiResponse<Analysis>;
type ChartResponse = ApiResponse<ChartData>;

export default function Market() {
  const [selectedCoin, setSelectedCoin] = useState<string>("BTC");
  const [selectedInterval, setSelectedInterval] = useState<string>("1h");

  const {
    data: marketResponse,
    isLoading,
    refetch,
    error: marketError,
  } = useQuery<MarketResponse, Error>({
    queryKey: ["/api/market"],
    refetchInterval: 15000, // Update every 15 seconds
    retry: 3,
    staleTime: 10000,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (response: MarketResponse) => {
      if (!response.success) {
        throw new Error(response.error || "Failed to fetch market data");
      }
      return response;
    },
  });

  const {
    data: analysisResponse,
    isLoading: isAnalysisLoading,
    refetch: refetchAnalysis,
    error: analysisError,
  } = useQuery<AnalysisResponse, Error>({
    queryKey: [`/api/market/analysis/${selectedCoin}`],
    enabled: !!selectedCoin,
    retry: 2,
    staleTime: 30000,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (response: AnalysisResponse) => {
      if (!response.success) {
        const error =
          response.error || `Failed to fetch analysis for ${selectedCoin}`;
        if (
          error.includes("GEMINI_API_KEY") ||
          error.includes("HUGGINGFACE_API_KEY")
        ) {
          throw new Error("AI analysis service is temporarily unavailable");
        }
        throw new Error(error);
      }
      return response;
    },
  });

  // Fetch real-time chart data
  const {
    data: chartResponse,
    isLoading: isChartLoading,
    error: chartError,
  } = useQuery<ChartResponse, Error>({
    queryKey: ["/api/market/data", selectedCoin, selectedInterval],
    queryFn: async (): Promise<ChartResponse> => {
      const response = await fetch(
        `/api/market/data?symbol=${selectedCoin}USDT&interval=${selectedInterval}&limit=100`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch chart data: ${response.statusText}`);
      }
      const data: ChartResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch chart data");
      }
      return data;
    },
    refetchInterval: 15000,
    enabled: !!selectedCoin,
    retry: 2,
    staleTime: 10000,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  if (isLoading) {
    return (
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div
              className="h-8 bg-white/10 rounded mb-4"
              data-testid="loading-market"
            ></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white/10 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const coins = marketResponse?.data?.coins || [];
  const stats = marketResponse?.data?.stats || {
    totalMarketCap: "",
    totalVolume24h: "",
    btcDominance: "",
    fearGreedIndex: 0,
  };
  const analysis = analysisResponse?.data;

  return (
    <div className="pt-20">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-grotesk font-bold text-3xl mb-2">
                Market Overview
              </h1>
              <p className="text-cool-gray">
                Real-time cryptocurrency market data with AI analysis
              </p>
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              data-testid="button-refresh-market"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cool-gray">Market Cap</span>
              <PieChart className="text-electric" size={20} />
            </div>
            <div
              className="font-mono font-semibold text-2xl number-roll"
              data-testid="text-market-cap"
            >
              {stats.totalMarketCap || "$1.73T"}
            </div>
            <div className="text-emerald text-sm">+2.4% 24h</div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cool-gray">24h Volume</span>
              <BarChart3 className="text-neon" size={20} />
            </div>
            <div
              className="font-mono font-semibold text-2xl number-roll"
              data-testid="text-volume"
            >
              {stats.totalVolume24h || "$86.2B"}
            </div>
            <div className="text-emerald text-sm">+12.1% 24h</div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cool-gray">BTC Dominance</span>
              <div className="w-5 h-5 bg-amber rounded-full flex items-center justify-center">
                <span className="text-navy text-xs font-bold">₿</span>
              </div>
            </div>
            <div
              className="font-mono font-semibold text-2xl number-roll"
              data-testid="text-btc-dominance"
            >
              {stats.btcDominance || "52.4%"}
            </div>
            <div className="text-red-400 text-sm">-0.8% 24h</div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cool-gray">Fear & Greed</span>
              <Thermometer className="text-amber" size={20} />
            </div>
            <div
              className="font-mono font-semibold text-2xl number-roll"
              data-testid="text-fear-greed"
            >
              {stats.fearGreedIndex || "64"}
            </div>
            <div className="text-amber text-sm">Greed</div>
          </GlassCard>
        </div>

        {/* AI Market Analysis Section */}
        <div className="mb-8">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-electric to-neon rounded-full flex items-center justify-center pulse-glow">
                  <Brain className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="font-grotesk font-semibold text-xl">
                    AI Market Analysis
                  </h2>
                  <p className="text-cool-gray text-sm">
                    Get comprehensive AI-powered analysis for any cryptocurrency
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Select
                  value={selectedCoin}
                  onValueChange={setSelectedCoin}
                  data-testid="select-coin"
                >
                  <SelectTrigger className="w-[180px] bg-white/5 border-white/20">
                    <SelectValue placeholder="Select coin" />
                  </SelectTrigger>
                  <SelectContent>
                    {coins.map((coin) => (
                      <SelectItem key={coin.symbol} value={coin.symbol}>
                        {coin.symbol} - {coin.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => refetchAnalysis()}
                  variant="outline"
                  size="sm"
                  disabled={isAnalysisLoading}
                  data-testid="button-refresh-analysis"
                  className="bg-electric/20 border-electric/30 text-electric hover:bg-electric/30"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isAnalysisLoading ? "animate-spin" : ""
                    }`}
                  />
                  Analyze
                </Button>
              </div>
            </div>

            {isAnalysisLoading ? (
              <div
                className="flex items-center justify-center py-12"
                data-testid="loading-analysis"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-electric to-neon rounded-full flex items-center justify-center animate-pulse">
                    <Brain className="text-white" size={16} />
                  </div>
                  <span className="text-cool-gray">
                    Generating AI analysis for {selectedCoin}...
                  </span>
                </div>
              </div>
            ) : analysis ? (
              <div className="space-y-6" data-testid="analysis-content">
                {/* Coin Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-grotesk font-semibold text-xl text-white">
                        {analysis.coin.name} ({analysis.coin.symbol})
                      </h3>
                      <div className="flex items-center space-x-3">
                        <span
                          className="font-mono font-bold text-2xl text-white"
                          data-testid="text-coin-price"
                        >
                          ${analysis.coin.price.toLocaleString()}
                        </span>
                        <Badge
                          className={`${
                            analysis.coin.priceChange24h >= 0
                              ? "bg-emerald/20 text-emerald"
                              : "bg-red-400/20 text-red-400"
                          }`}
                          data-testid="badge-price-change"
                        >
                          {analysis.coin.priceChange24h >= 0 ? "+" : ""}
                          {analysis.coin.priceChange24h.toFixed(2)}%
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Technical Indicators */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg">
                      <p className="text-cool-gray text-sm mb-1">RSI (14)</p>
                      <p
                        className="font-mono font-semibold text-lg text-white"
                        data-testid="text-rsi"
                      >
                        {analysis.technicalAnalysis.rsi.toFixed(2)}
                      </p>
                      <p className="text-xs text-cool-gray">
                        {analysis.technicalAnalysis.rsi > 70
                          ? "Overbought"
                          : analysis.technicalAnalysis.rsi < 30
                          ? "Oversold"
                          : "Neutral"}
                      </p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                      <p className="text-cool-gray text-sm mb-1">Volume 24h</p>
                      <p
                        className="font-mono font-semibold text-lg text-white"
                        data-testid="text-coin-volume"
                      >
                        ${(analysis.coin.volume24h / 1e6).toFixed(1)}M
                      </p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                      <p className="text-cool-gray text-sm mb-1">Market Cap</p>
                      <p
                        className="font-mono font-semibold text-lg text-white"
                        data-testid="text-coin-marketcap"
                      >
                        ${(analysis.coin.marketCap / 1e9).toFixed(1)}B
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                {/* AI Analysis */}
                <div>
                  <h4 className="font-grotesk font-semibold text-lg mb-4 flex items-center text-white">
                    <Brain className="h-5 w-5 mr-2 text-electric" />
                    AI Market Analysis
                  </h4>
                  <div
                    className="prose prose-sm max-w-none text-cool-gray whitespace-pre-wrap leading-relaxed"
                    data-testid="text-ai-analysis"
                  >
                    {analysis.aiAnalysis}
                  </div>
                  <div className="mt-4 text-xs text-cool-gray/70">
                    Generated: {new Date(analysis.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12" data-testid="no-analysis">
                <Brain className="h-16 w-16 mx-auto text-cool-gray/50 mb-4" />
                <p className="text-cool-gray mb-4">
                  Select a cryptocurrency and click "Analyze" to get AI-powered
                  market insights
                </p>
                <p className="text-cool-gray/70 text-sm">
                  Our AI analyzes market data, technical indicators, and
                  sentiment to provide comprehensive analysis
                </p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Top Cryptocurrencies */}
        <GlassCard className="p-6">
          <h3 className="font-grotesk font-semibold text-xl mb-6 text-white">
            Top Cryptocurrencies
          </h3>
          <div className="space-y-4">
            {coins.map((coin) => (
              <Card
                key={coin.symbol}
                className={`hover:shadow-lg transition-all ${
                  selectedCoin === coin.symbol ? "ring-2 ring-electric" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          coin.symbol === "BTC"
                            ? "bg-amber"
                            : coin.symbol === "ETH"
                            ? "bg-blue-500"
                            : coin.symbol === "SOL"
                            ? "bg-purple-500"
                            : "bg-blue-400"
                        }`}
                      >
                        <span className="text-white text-xs font-bold">
                          {coin.symbol === "BTC"
                            ? "₿"
                            : coin.symbol === "ETH"
                            ? "Ξ"
                            : coin.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{coin.name}</CardTitle>
                        <CardDescription>{coin.symbol}</CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={
                        parseFloat(coin.priceChangePercent24h) >= 0
                          ? "default"
                          : "destructive"
                      }
                    >
                      {parseFloat(coin.priceChangePercent24h) >= 0 ? "+" : ""}
                      {parseFloat(coin.priceChangePercent24h).toFixed(2)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-mono font-medium">
                        ${parseFloat(coin.price).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1">
                        {parseFloat(coin.priceChangePercent24h) >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-emerald" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    </div>

                    {/* Interval Selection */}
                    <div className="flex gap-2 mb-4">
                      {["1h", "4h", "1d"].map((int) => (
                        <Button
                          key={int}
                          variant={
                            selectedInterval === int ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setSelectedInterval(int)}
                        >
                          {int}
                        </Button>
                      ))}
                    </div>

                    {/* Chart Component */}
                    <div className="h-24">
                      <PriceChart
                        data={{
                          symbol: coin.symbol,
                          interval: selectedInterval,
                          candles:
                            selectedCoin === coin.symbol &&
                            chartResponse?.data?.candles
                              ? chartResponse.data.candles
                              : [],
                          indicators:
                            selectedCoin === coin.symbol &&
                            chartResponse?.data?.indicators
                              ? chartResponse.data.indicators
                              : {
                                  rsi: 0,
                                  sma20: 0,
                                  priceChange24h: 0,
                                  volumeChange24h: 0,
                                },
                        }}
                        isLoading={
                          selectedCoin === coin.symbol && isChartLoading
                        }
                        error={selectedCoin === coin.symbol ? chartError : null}
                      />
                    </div>

                    {/* Technical Indicators */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      <div>
                        <div className="text-xs text-cool-gray">RSI (14)</div>
                        <div className="font-mono">
                          {selectedCoin === coin.symbol && chartResponse?.data
                            ? chartResponse.data.indicators.rsi.toFixed(1)
                            : "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-cool-gray">24h Vol</div>
                        <div className="font-mono">
                          ${(parseFloat(coin.volume24h) / 1e6).toFixed(1)}M
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setSelectedCoin(coin.symbol)}
                    >
                      View Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
