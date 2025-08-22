import { validateEnvironment, getEnvVar } from "./env-validator";

// Validate environment before creating config
validateEnvironment();

// Define environment variable types
type NodeEnv = "development" | "production";

// Create and validate environment configuration
const env = {
  // Required API Keys
  GEMINI_API_KEY: getEnvVar("GEMINI_API_KEY"),
  HUGGINGFACE_API_KEY: getEnvVar("HUGGINGFACE_API_KEY"),

  // Optional API Keys
  BINANCE_API_KEY: getEnvVar("BINANCE_API_KEY", ""),
  BINANCE_SECRET_KEY: getEnvVar("BINANCE_SECRET_KEY", ""),
  NEWS_API_KEY: getEnvVar("NEWS_API_KEY", ""),
  TWITTER_BEARER_TOKEN: getEnvVar("TWITTER_BEARER_TOKEN", ""),

  // Server Configuration
  WS_URL: getEnvVar("WS_URL", "ws://localhost:3000"),
  NODE_ENV: getEnvVar("NODE_ENV", "development") as NodeEnv,
  PORT: parseInt(getEnvVar("PORT", "3000")),

  // Database
  DATABASE_URL: getEnvVar("DATABASE_URL", ""),

  // Security
  SESSION_SECRET: getEnvVar("SESSION_SECRET", "development_secret"),
  ALLOWED_ORIGINS: getEnvVar("ALLOWED_ORIGINS", "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim()),
} as const;

// Type for the environment configuration
export type EnvConfig = typeof env;

// Export the environment configuration as default
export default env;

// Validate NODE_ENV
if (env.NODE_ENV !== "development" && env.NODE_ENV !== "production") {
  throw new Error(
    `Invalid NODE_ENV value: ${env.NODE_ENV}. Must be either 'development' or 'production'`
  );
}

// Ensure PORT is a valid number
if (isNaN(env.PORT) || env.PORT < 0 || env.PORT > 65535) {
  throw new Error(
    `Invalid PORT value: ${env.PORT}. Must be a number between 0 and 65535`
  );
}

// Configuration verification functions
export async function verifyConfiguration() {
  console.log("🔍 Verifying application configuration...");

  // Check HuggingFace API Key
  const hfApiKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfApiKey) {
    console.warn(
      "⚠️  HUGGINGFACE_API_KEY not configured - sentiment analysis will use keyword fallback"
    );
  } else {
    console.log("✅ HuggingFace API key configured");
  }

  // Check Gemini API Key
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    console.warn("⚠️  GEMINI_API_KEY not configured - AI analysis may fail");
  } else {
    console.log("✅ Gemini API key configured");
  }

  // Test network connectivity to Binance
  await testBinanceConnectivity();

  // Check Twitter API Bearer Token
  if (!env.TWITTER_BEARER_TOKEN) {
    console.warn(
      "⚠️  Twitter API Bearer Token not configured - social sentiment analysis will use sample data"
    );
  } else {
    await testTwitterConnectivity();
  }

  console.log("✅ Configuration check complete");
}

async function testTwitterConnectivity() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      "https://api.twitter.com/2/tweets/search/recent?query=crypto",
      {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${env.TWITTER_BEARER_TOKEN}`,
          "User-Agent": "Tradeable-App/1.0",
        },
      }
    );

    clearTimeout(timeout);

    if (response.ok) {
      console.log("✅ Twitter API connectivity test passed");
    } else {
      console.warn(`⚠️  Twitter API returned status ${response.status}`);
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Timeout"
          : error.message
        : "Unknown error";
    console.warn("⚠️  Twitter API connectivity test failed:", errorMessage);
    console.warn("   App will fall back to sample data for social sentiment");
  }
}

async function testBinanceConnectivity() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://api.binance.com/api/v3/ping", {
      signal: controller.signal,
      headers: {
        "User-Agent": "Tradeable-App/1.0",
      },
    });

    clearTimeout(timeout);

    if (response.ok) {
      console.log("✅ Binance API connectivity test passed");
    } else {
      console.warn(`⚠️  Binance API returned status ${response.status}`);
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Timeout"
          : error.message
        : "Unknown error";
    console.warn("⚠️  Binance API connectivity test failed:", errorMessage);
    console.warn("   App will fall back to cached data when needed");
  }
}

// Log environment status in development
if (env.NODE_ENV === "development") {
  console.log("\x1b[36m%s\x1b[0m", "🔧 Environment Configuration:");

  console.log("\x1b[36m%s\x1b[0m", "Required APIs:");
  console.log(
    "  GEMINI_API_KEY:",
    env.GEMINI_API_KEY ? "✓ Present" : "✗ Missing"
  );
  console.log(
    "  HUGGINGFACE_API_KEY:",
    env.HUGGINGFACE_API_KEY ? "✓ Present" : "✗ Missing"
  );

  console.log("\x1b[36m%s\x1b[0m", "Optional APIs:");
  console.log(
    "  BINANCE_API_KEY:",
    env.BINANCE_API_KEY ? "✓ Present" : "- Not Set"
  );
  console.log(
    "  BINANCE_SECRET_KEY:",
    env.BINANCE_SECRET_KEY ? "✓ Present" : "- Not Set"
  );
  console.log("  NEWS_API_KEY:", env.NEWS_API_KEY ? "✓ Present" : "- Not Set");
  console.log(
    "  TWITTER_BEARER_TOKEN:",
    env.TWITTER_BEARER_TOKEN ? "✓ Present" : "- Not Set"
  );

  console.log("\x1b[36m%s\x1b[0m", "Server Configuration:");
  console.log("  NODE_ENV:", env.NODE_ENV);
  console.log("  PORT:", env.PORT);
  console.log("  WS_URL:", env.WS_URL);

  console.log("\x1b[36m%s\x1b[0m", "Database:");
  console.log("  DATABASE_URL:", env.DATABASE_URL ? "✓ Present" : "- Not Set");

  console.log("\x1b[36m%s\x1b[0m", "Security:");
  console.log(
    "  SESSION_SECRET:",
    env.SESSION_SECRET ? "✓ Present" : "- Not Set"
  );
  console.log("  ALLOWED_ORIGINS:", env.ALLOWED_ORIGINS.join(", "));

  console.log("");
}
