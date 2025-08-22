import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarController,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  TooltipItem,
} from "chart.js";
import "chartjs-adapter-date-fns";
import {
  CandlestickController,
  CandlestickElement,
  OhlcElement,
} from "chartjs-chart-financial";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarController,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  CandlestickController,
  CandlestickElement,
  OhlcElement
);

interface CandleData {
  x: Date;
  o: number;
  h: number;
  l: number;
  c: number;
}

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
  const chartInstance = useRef<ChartJS<
    "line" | "candlestick" | "bar",
    any,
    unknown
  > | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data?.candles?.length) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const candleData: CandleData[] = data.candles.map((candle) => ({
      x: new Date(candle.time),
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close,
    }));

    chartInstance.current = new ChartJS(ctx, {
      type: "line" as const,
      data: {
        datasets: [
          {
            type: "candlestick" as const,
            label: `${data.symbol} Price`,
            data: candleData as unknown as CandleData[],
            candlestick: {
              color: {
                up: "#26a69a",
                down: "#ef5350",
              },
              border: {
                up: "#26a69a",
                down: "#ef5350",
              },
              wick: {
                up: "#26a69a",
                down: "#ef5350",
              },
            },
            yAxisID: "y",
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
            yAxisID: "y",
          },
          {
            label: "Volume",
            type: "bar" as const,
            data: data.candles.map((candle) => ({
              x: new Date(candle.time),
              y: candle.volume,
            })),
            backgroundColor: data.candles.map((candle) =>
              candle.close > candle.open
                ? "rgba(38, 166, 154, 0.3)"
                : "rgba(239, 83, 80, 0.3)"
            ),
            borderColor: data.candles.map((candle) =>
              candle.close > candle.open ? "#26a69a" : "#ef5350"
            ),
            borderWidth: 1,
            yAxisID: "volume",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 750,
          easing: "easeInOutQuart",
        },
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
              label: function (
                context: TooltipItem<"line" | "bar" | "candlestick">
              ) {
                const dataset = context.dataset;
                if (!context.raw) return undefined;

                type CandleTooltipData = {
                  o: number;
                  h: number;
                  l: number;
                  c: number;
                };

                if (dataset.type === "candlestick") {
                  const candle = context.raw as CandleTooltipData;
                  return [
                    `Open: $${candle.o?.toFixed(2)}`,
                    `High: $${candle.h?.toFixed(2)}`,
                    `Low: $${candle.l?.toFixed(2)}`,
                    `Close: $${candle.c?.toFixed(2)}`,
                  ];
                }
                return `${dataset.label}: $${(
                  context.raw as { y: number }
                ).y.toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          x: {
            type: "time" as const,
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
            type: "linear" as const,
            id: "y",
            position: "right" as const,
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              callback: (value: string | number) =>
                typeof value === "number"
                  ? `$${value.toLocaleString()}`
                  : value,
              font: {
                size: 11,
              },
            },
          },
          volume: {
            type: "linear" as const,
            id: "volume",
            position: "left" as const,
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              callback: (value: string | number) =>
                typeof value === "number"
                  ? `${(value / 1000000).toFixed(1)}M`
                  : value,
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
        chartInstance.current = null;
      }
    };
  }, [data, data?.candles]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-4 border-electric border-t-transparent rounded-full animate-spin" />
          <div className="text-cool-gray">Loading chart...</div>
        </div>
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
