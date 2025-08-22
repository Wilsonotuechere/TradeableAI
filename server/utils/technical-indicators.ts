/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period = 14): number[] {
  const gains: number[] = [];
  const losses: number[] = [];
  const rsi: number[] = [];

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // First RSI value
  rsi.push(100 - 100 / (1 + avgGain / avgLoss));

  // Calculate remaining RSI values
  for (let i = period; i < prices.length - 1; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsi.push(100 - 100 / (1 + avgGain / avgLoss));
  }

  return rsi;
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];

  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }

  return sma;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA uses SMA
  const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(firstSMA);

  for (let i = period; i < prices.length; i++) {
    ema.push(
      (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
    );
  }

  return ema;
}

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 */
export function calculateMACD(prices: number[]): {
  macd: number[];
  signal: number[];
  histogram: number[];
} {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  // Calculate MACD line
  const macd: number[] = [];
  for (let i = 0; i < ema12.length; i++) {
    if (i >= ema26.length) break;
    macd.push(ema12[i] - ema26[i]);
  }

  // Calculate Signal line (9-day EMA of MACD)
  const signal = calculateEMA(macd, 9);

  // Calculate Histogram
  const histogram = macd.map((value, i) => {
    if (i >= signal.length) return 0;
    return value - signal[i];
  });

  return { macd, signal, histogram };
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  prices: number[],
  period = 20,
  standardDeviations = 2
): {
  upper: number[];
  middle: number[];
  lower: number[];
} {
  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const sum = slice.reduce((a, b) => a + b, 0);
    const mean = sum / period;

    const squaredDifferences = slice.map((x) => Math.pow(x - mean, 2));
    const variance = squaredDifferences.reduce((a, b) => a + b, 0) / period;
    const standardDeviation = Math.sqrt(variance);

    upper.push(middle[i - period + 1] + standardDeviation * standardDeviations);
    lower.push(middle[i - period + 1] - standardDeviation * standardDeviations);
  }

  return { upper, middle, lower };
}
