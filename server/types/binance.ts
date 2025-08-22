// Binance API response types
export interface BinanceTickerResponse {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
}

export interface BinanceError {
  code: string;
  message: string;
}
