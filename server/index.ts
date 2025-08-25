import dotenv from "dotenv";
dotenv.config();

import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
console.log("Looking for .env file at:", envPath);
console.log(".env load result:", dotenv.config({ path: envPath }));

// Debug logging
console.log("=== ENVIRONMENT DEBUG ===");
console.log("Working directory:", process.cwd());
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("HUGGINGFACE_API_KEY exists:", !!process.env.HUGGINGFACE_API_KEY);

if (process.env.HUGGINGFACE_API_KEY) {
  console.log(
    "HUGGINGFACE_API_KEY length:",
    process.env.HUGGINGFACE_API_KEY.length
  );
  console.log(
    "HUGGINGFACE_API_KEY preview:",
    process.env.HUGGINGFACE_API_KEY.substring(0, 15) + "..."
  );
} else {
  console.log("❌ HUGGINGFACE_API_KEY is undefined or empty");
  console.log(
    "Available env vars starting with HUG:",
    Object.keys(process.env).filter((k) => k.startsWith("HUG"))
  );
}

console.log("=== END DEBUG ===");

// Now that environment is loaded, import the rest
import express from "express";
import cors from "cors";
import { config } from "../shared/config";
import { setupSentimentRoutes } from "./routes/sentiment";
import { setupVite, serveStatic, log } from "./vite";
import { validateEnvironment, EnvironmentError } from "./config/env-validator";
import { Express, Request, Response, NextFunction } from "express";
import http from "http";

try {
  // Validate required environment variables
  validateEnvironment();
} catch (error) {
  if (error instanceof EnvironmentError) {
    console.error("\x1b[31m%s\x1b[0m", "❌ Environment Error:");
    console.error("\x1b[31m%s\x1b[0m", error.message);
    console.error(
      "\x1b[33m%s\x1b[0m",
      "Please check your .env file and ensure all required variables are set."
    );
    console.error(
      "\x1b[33m%s\x1b[0m",
      "You can use .env.example as a template."
    );
    process.exit(1);
  }
  throw error;
}

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: config.backend.cors.origin,
    credentials: true,
  })
);

// Routes
setupSentimentRoutes(app);

// Error handling
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error",
    });
  }
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as any).status || (err as any).statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Server configuration
  const port = parseInt(process.env.PORT || "3000", 10);
  const host = process.env.HOST || "localhost";

  server.listen(port, host, () => {
    log(`Server running at http://${host}:${port}`);
    log("Environment:", process.env.NODE_ENV);
    log("Gemini API Key:", process.env.GEMINI_API_KEY ? "Present" : "Missing");
    log(
      "HuggingFace API Key:",
      process.env.HUGGINGFACE_API_KEY ? "Present" : "Missing"
    );
  });
})();

function registerRoutes(app: Express): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer(app);

    // Add any additional route setup here if needed
    app.get("/health", (req, res) => {
      res.json({ status: "ok" });
    });

    resolve(server);
  });
}
