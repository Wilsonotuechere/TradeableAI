// Technical Analysis Types
export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    sma200: number;
  };
}

// API Error Types
export class GeminiAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: string
  ) {
    super(message);
    this.name = "GeminiAPIError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
