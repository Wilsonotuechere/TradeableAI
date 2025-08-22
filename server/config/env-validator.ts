import { config } from "dotenv";
import { resolve } from "path";

// Environment variable configuration types
export type EnvVarConfig = {
  name: string;
  required: boolean;
  description: string;
  url?: string;
  validator?: (value: string) => boolean;
};

// Custom error for environment issues
export class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentError";
  }
}

// Environment variable configurations
const ENV_VARS: EnvVarConfig[] = [
  {
    name: "GEMINI_API_KEY",
    required: true,
    description: "Google Gemini API Key for AI capabilities",
    url: "https://makersuite.google.com/app/apikey",
    validator: (key) => key.startsWith("AIza") && key.length > 30,
  },
  {
    name: "HUGGINGFACE_API_KEY",
    required: true,
    description: "HuggingFace API Key for machine learning models",
    url: "https://huggingface.co/settings/tokens",
    validator: (key) => key.startsWith("hf_") && key.length > 30,
  },
  {
    name: "BINANCE_API_KEY",
    required: false,
    description: "Binance API Key for market data (optional)",
    url: "https://www.binance.com/en/my/settings/api-management",
  },
  {
    name: "BINANCE_API_SECRET",
    required: false,
    description: "Binance API Secret for market data (optional)",
    url: "https://www.binance.com/en/my/settings/api-management",
  },
  {
    name: "NEWS_API_KEY",
    required: false,
    description: "News API Key for market news (optional)",
    url: "https://newsapi.org/register",
    validator: (key) => key.length === 32 && /^[a-f0-9]+$/.test(key),
  },
  {
    name: "TWITTER_BEARER_TOKEN",
    required: false,
    description: "Twitter API Bearer Token for social sentiment analysis",
    url: "https://developer.twitter.com/en/portal/dashboard",
    validator: (key) => key.startsWith("AAAA") && key.length > 50,
  },
  {
    name: "PORT",
    required: false,
    description: "Server port number",
  },
  {
    name: "NODE_ENV",
    required: false,
    description: "Node environment (development/production)",
  },
  {
    name: "WS_URL",
    required: false,
    description: "WebSocket server URL",
  },
];

/**
 * Load and validate environment variables
 */
export function validateEnvironment(): void {
  // Load .env file
  const result = config({ path: resolve(process.cwd(), ".env") });

  if (result.error) {
    throw new EnvironmentError(
      "Failed to load .env file.\n" +
        "Please ensure the .env file exists in the project root.\n" +
        "You can copy .env.example to .env and fill in the required values."
    );
  }

  // Validate required variables and formats
  const issues = ENV_VARS.map((v) => {
    const value = process.env[v.name];
    if (v.required && isEnvVarMissing(v.name)) {
      return `❌ ${v.name}: Missing required variable\n   ${v.description}${
        v.url ? `\n   Get it from: ${v.url}` : ""
      }`;
    }
    if (value && v.validator && !v.validator(value)) {
      return `⚠️  ${v.name}: Format may be incorrect\n   Expected format: ${v.description}`;
    }
    if (value) {
      return `✅ ${v.name}: Configured`;
    }
    return `⚪ ${v.name}: Not configured (Optional)`;
  });

  // Log validation results
  console.log("\n🔍 Environment Validation:");
  issues.forEach((issue) => console.log(issue));

  // Throw error if any required variables are missing
  const missingRequired = issues.filter((i) => i.startsWith("❌"));
  if (missingRequired.length > 0) {
    throw new EnvironmentError(
      "Missing required environment variables:\n" +
        missingRequired.join("\n") +
        "\n\nPlease add these variables to your .env file."
    );
  }

  console.log("\n✅ Environment validation completed\n");
}

/**
 * Check if an environment variable is missing or empty
 */
export function isEnvVarMissing(varName: string): boolean {
  return !process.env[varName] || process.env[varName]?.trim() === "";
}

/**
 * Get an environment variable with optional fallback
 */
export function getEnvVar(varName: string, fallback?: string): string {
  const value = process.env[varName]?.trim();
  const envVar = ENV_VARS.find((v) => v.name === varName);

  if (!value && fallback === undefined && envVar?.required) {
    throw new EnvironmentError(
      `Environment variable ${varName} is required but not set.\n` +
        `Description: ${envVar.description}\n` +
        (envVar.url ? `Get it from: ${envVar.url}` : "")
    );
  }

  return value || fallback || "";
}

// Export environment variable configuration for type safety
export const ENV_CONFIG = ENV_VARS.reduce(
  (acc, v) => ({
    ...acc,
    [v.name]: v,
  }),
  {} as Record<string, EnvVarConfig>
);

/**
 * Test connectivity to all configured APIs
 */
export async function testAPIConnectivity(): Promise<void> {
  console.log("\n🔍 Testing API connectivity...");

  const tests = [
    {
      name: "Binance API",
      test: () => fetch("https://api.binance.com/api/v3/ping"),
      required: false,
    },
    {
      name: "News API",
      test: () => {
        const key = getEnvVar("NEWS_API_KEY");
        return key
          ? fetch(`https://newsapi.org/v2/sources?apiKey=${key}`)
          : Promise.resolve(null);
      },
      required: false,
    },
    {
      name: "HuggingFace API",
      test: () => {
        const key = getEnvVar("HUGGINGFACE_API_KEY");
        return key
          ? fetch(
              "https://api-inference.huggingface.co/models/ProsusAI/finbert",
              {
                method: "POST",
                headers: { Authorization: `Bearer ${key}` },
                body: JSON.stringify({ inputs: "test" }),
              }
            )
          : Promise.resolve(null);
      },
      required: true,
    },
    {
      name: "Gemini API",
      test: () => {
        const key = getEnvVar("GEMINI_API_KEY");
        return key
          ? fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
            )
          : Promise.resolve(null);
      },
      required: true,
    },
  ];

  for (const { name, test, required } of tests) {
    try {
      const response = (await Promise.race([
        test(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000)
        ),
      ])) as Response | null;

      if (response === null) {
        console.log(`⚪ ${name}: Not configured`);
      } else if (response.ok || response.status === 401) {
        // 401 means API key issues, but API is reachable
        console.log(
          `✅ ${name}: Accessible${
            response.status === 401 ? " (check API key)" : ""
          }`
        );
      } else {
        console.warn(`⚠️  ${name}: Status ${response.status}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ ${name}: Connection failed - ${errorMessage}`);
      if (required) {
        throw new EnvironmentError(
          `Failed to connect to required API: ${name}`
        );
      }
    }
  }

  console.log("\n✅ Environment validation completed\n");
}
