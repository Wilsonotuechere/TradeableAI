export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(maxTokens: number, refillTokensPerSecond: number) {
    this.maxTokens = maxTokens;
    this.refillRate = refillTokensPerSecond / 1000;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async tryConsume(tokens: number = 1): Promise<boolean> {
    this.refill();

    if (this.tokens < tokens) {
      // Not enough tokens, need to wait
      const timeToWait = (tokens - this.tokens) / this.refillRate;
      await new Promise((resolve) => setTimeout(resolve, timeToWait));
      this.refill();
    }

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  private refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const refillAmount = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + refillAmount);
    this.lastRefill = now;
  }
}
