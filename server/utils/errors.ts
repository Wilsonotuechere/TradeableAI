/**
 * Custom API Error class for handling application-specific errors
 */
export class CustomAPIError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = "CustomAPIError";
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
      },
    };
  }
}

/**
 * Validation Error for handling input validation failures
 */
export class ValidationError extends CustomAPIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

/**
 * Authentication Error for handling auth-related failures
 */
export class AuthenticationError extends CustomAPIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 401, "AUTHENTICATION_ERROR", details);
    this.name = "AuthenticationError";
  }
}

/**
 * Authorization Error for handling permission-related failures
 */
export class AuthorizationError extends CustomAPIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 403, "AUTHORIZATION_ERROR", details);
    this.name = "AuthorizationError";
  }
}

/**
 * Not Found Error for handling resource not found situations
 */
export class NotFoundError extends CustomAPIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 404, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
}

/**
 * Rate Limit Error for handling rate limiting situations
 */
export class RateLimitError extends CustomAPIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", details);
    this.name = "RateLimitError";
  }
}

/**
 * Service Error for handling external service failures
 */
export class ServiceError extends CustomAPIError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 503, "SERVICE_UNAVAILABLE", details);
    this.name = "ServiceError";
  }
}

/**
 * Error factory for creating appropriate error instances
 */
export class ErrorFactory {
  static create(type: string, message: string, details?: Record<string, any>) {
    switch (type.toLowerCase()) {
      case "validation":
        return new ValidationError(message, details);
      case "authentication":
        return new AuthenticationError(message, details);
      case "authorization":
        return new AuthorizationError(message, details);
      case "notfound":
        return new NotFoundError(message, details);
      case "ratelimit":
        return new RateLimitError(message, details);
      case "service":
        return new ServiceError(message, details);
      default:
        return new CustomAPIError(
          message,
          500,
          "INTERNAL_SERVER_ERROR",
          details
        );
    }
  }
}

/**
 * Error middleware for handling errors in Express
 */
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  console.error("Error:", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    details: err.details,
  });

  if (err instanceof CustomAPIError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle validation errors from express-validator
  if (err.array && typeof err.array === "function") {
    return res.status(400).json({
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        statusCode: 400,
        details: err.array(),
      },
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({
      error: {
        message: "Duplicate entry found",
        code: "DUPLICATE_ERROR",
        statusCode: 400,
        details: err.keyValue,
      },
    });
  }

  // Default error response for unhandled errors
  return res.status(500).json({
    error: {
      message: "An unexpected error occurred",
      code: "INTERNAL_SERVER_ERROR",
      statusCode: 500,
      details: process.env.NODE_ENV === "development" ? err : undefined,
    },
  });
};

/**
 * Utility function to handle async errors in route handlers
 */
export const asyncErrorWrapper = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Type guard to check if an error is an instance of CustomAPIError
 */
export const isCustomAPIError = (error: any): error is CustomAPIError => {
  return error instanceof CustomAPIError;
};

/**
 * Helper function to create error responses
 */
export const createErrorResponse = (
  message: string,
  statusCode: number,
  code: string,
  details?: Record<string, any>
) => {
  return {
    error: {
      message,
      code,
      statusCode,
      details,
    },
  };
};
