import { FC, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketIndicators {
  rsi: number;
  sma20: number;
  priceChange24h: number;
  volumeChange24h: number;
}

export interface ChartData {
  symbol: string;
  interval: string;
  candles: Candle[];
  indicators: MarketIndicators;
}

export interface ChartComponentProps {
  data: ChartData;
  isLoading?: boolean;
  error?: Error | null;
}

interface FormattedDataPoint {
  time: string;
  price: number;
  volume: number;
  sma20: number;
  timestamp: number;
}

const formatChartData = (data: ChartData): FormattedDataPoint[] => {
  return data.candles.map((candle) => ({
    time: new Date(candle.time).toLocaleTimeString(),
    price: candle.close,
    volume: candle.volume,
    sma20: data.indicators.sma20,
    timestamp: candle.time,
  }));
};

const CustomTooltip: FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-navy/90 p-3 rounded-lg shadow-lg border border-electric/20">
        <p className="text-cool-gray text-xs mb-1">
          {new Date(payload[0].payload.timestamp).toLocaleString()}
        </p>
        <div className="space-y-1">
          <p className="text-white">
            <span className="text-cool-gray">Price: </span>
            <span className="font-mono">
              ${payload[0].value.toLocaleString()}
            </span>
          </p>
          <p className="text-white">
            <span className="text-cool-gray">Volume: </span>
            <span className="font-mono">
              ${(payload[1].value / 1e6).toFixed(2)}M
            </span>
          </p>
          {payload[2] && (
            <p className="text-white">
              <span className="text-cool-gray">SMA20: </span>
              <span className="font-mono">
                ${payload[2].value.toLocaleString()}
              </span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const ChartComponent: FC<ChartComponentProps> = ({
  data,
  isLoading,
  error,
}) => {
  const chartData = useMemo(() => formatChartData(data), [data]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-red-400 text-sm flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-red-400/50" />
          Failed to load chart
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-pulse flex items-center">
          <BarChart3 className="h-6 w-6 mr-2 text-cool-gray/50" />
          <div className="h-4 w-24 bg-cool-gray/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data?.candles?.length) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-cool-gray/70 text-sm flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          No data available
        </div>
      </div>
    );
  }

  const isPositive = data.indicators.priceChange24h >= 0;
  const priceColor = isPositive ? "#22c55e" : "#ef4444";
  const volumeColor = isPositive
    ? "rgba(34, 197, 94, 0.2)"
    : "rgba(239, 68, 68, 0.2)";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData}>
        <defs>
          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={priceColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={priceColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="price"
          orientation="right"
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          domain={["auto", "auto"]}
        />
        <YAxis
          yAxisId="volume"
          orientation="left"
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          domain={["auto", "auto"]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          yAxisId="price"
          type="monotone"
          dataKey="price"
          stroke={priceColor}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorPrice)"
        />
        <Bar
          yAxisId="volume"
          dataKey="volume"
          fill={volumeColor}
          opacity={0.8}
        />
        <Area
          yAxisId="price"
          type="monotone"
          dataKey="sma20"
          stroke="#60a5fa"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          fill="none"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
