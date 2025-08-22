import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js";
import "chartjs-adapter-date-fns";
import {
  CandlestickController,
  CandlestickElement,
} from "chartjs-chart-financial";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  CandlestickController,
  CandlestickElement
);

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartData {
  symbol: string;
  interval: string;
  candles: Candle[];
  indicators: {
    rsi: number;
    sma20: number;
    priceChange24h: number;
    volumeChange24h: number;
  };
}

interface PriceChartProps {
  data: ChartData;
  isLoading?: boolean;
  error?: Error | null;
}

export default function PriceChart({
  data,
  isLoading,
  error,
}: PriceChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data?.candles?.length) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const candleData = data.candles.map((candle) => ({
      x: new Date(candle.time),
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
    }));

    chartInstance.current = new ChartJS(ctx, {
      type: "candlestick" as const,
      data: {
        datasets: [
          {
            label: `${data.symbol} Price`,
            data: candleData as any[],
            borderColor: "#000000",
            borderColor: (ctx: any) =>
              ctx.raw.o > ctx.raw.c ? "#ef5350" : "#26a69a",
            backgroundColor: (ctx: any) =>
              ctx.raw.o > ctx.raw.c ? "#ef5350" : "#26a69a",
          },
          {
            label: "SMA20",
            type: "line" as const,
            data: data.candles.map((candle) => ({
              x: new Date(candle.time),
              y: data.indicators.sma20,
            })),
            borderColor: "#9B5DE5",
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top" as const,
            labels: {
              color: "rgba(255, 255, 255, 0.7)",
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            mode: "index" as const,
            intersect: false,
            callbacks: {
              label: function (context: any) {
                const dataset = context.dataset;
                if (!context.raw) return;

                if (dataset.type === "candlestick") {
                  const candle = context.raw;
                  return [
                    `Open: $${candle.o?.toFixed(2)}`,
                    `High: $${candle.h?.toFixed(2)}`,
                    `Low: $${candle.l?.toFixed(2)}`,
                    `Close: $${candle.c?.toFixed(2)}`,
                  ];
                }
                return `${dataset.label}: $${context.raw.y?.toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: "time",
            time: {
              unit: data.interval === "1d" ? "day" : "hour",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              font: {
                size: 11,
              },
            },
          },
          y: {
            position: "right" as const,
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              callback: function (tickValue: string | number) {
                const value = Number(tickValue);
                return `$${value.toLocaleString()}`;
              },
              font: {
                size: 11,
              },
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index" as const,
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-pulse text-cool-gray">Loading chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-red-400">{error.message}</div>
      </div>
    );
  }

  if (!data?.candles?.length) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-cool-gray">No data available</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <canvas ref={chartRef} />
    </div>
  );
}
