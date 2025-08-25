import { Request, Response, NextFunction } from "express";
import { CustomAPIError } from "../utils/errors";

const SUPPORTED_INTERVALS = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1d",
  "3d",
  "1w",
  "1M",
];

const MAX_LIMIT = 1000;

export function validateSymbol(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { symbol } = req.params;

  if (!symbol) {
    throw new CustomAPIError("Symbol is required", 400, "VALIDATION_ERROR");
  }

  // Basic symbol validation
  if (!/^[A-Za-z0-9]{2,10}$/.test(symbol)) {
    throw new CustomAPIError("Invalid symbol format", 400, "VALIDATION_ERROR");
  }

  next();
}

export function validateKlinesParams(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { interval, limit } = req.query;

  // Validate interval
  if (interval && !SUPPORTED_INTERVALS.includes(interval as string)) {
    throw new CustomAPIError(
      `Invalid interval. Supported intervals: ${SUPPORTED_INTERVALS.join(
        ", "
      )}`,
      400,
      "VALIDATION_ERROR"
    );
  }

  // Validate limit
  if (limit) {
    const parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > MAX_LIMIT) {
      throw new CustomAPIError(
        `Limit must be a number between 1 and ${MAX_LIMIT}`,
        400,
        "VALIDATION_ERROR"
      );
    }
  }

  next();
}

export function validateOrderBookParams(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { limit } = req.query;

  // Validate limit
  if (limit) {
    const parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > MAX_LIMIT) {
      throw new CustomAPIError(
        `Limit must be a number between 1 and ${MAX_LIMIT}`,
        400,
        "VALIDATION_ERROR"
      );
    }
  }

  next();
}
