import fetch from "node-fetch";
import { config } from "./env";

async function validateHuggingFaceAPI() {
  const hfKey = config.HUGGINGFACE_API_KEY;
  if (!hfKey || hfKey.startsWith("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")) {
    console.warn("⚠️ HuggingFace API key appears to be a placeholder");
    return false;
  }

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/ProsusAI/finbert",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: "test" }),
      }
    );

    if (response.ok) {
      console.log("✅ HuggingFace API key is valid");
      return true;
    } else {
      console.warn("⚠️ HuggingFace API key validation failed");
      return false;
    }
  } catch (error) {
    console.warn("⚠️ HuggingFace API validation error:", error);
    return false;
  }
}

async function validateTwitterAPI() {
  const twitterToken = config.TWITTER_BEARER_TOKEN;
  if (!twitterToken) {
    console.warn("⚠️ Twitter bearer token is missing");
    return false;
  }

  try {
    const response = await fetch(
      "https://api.twitter.com/2/tweets/search/recent?query=test&max_results=10",
      {
        headers: {
          Authorization: `Bearer ${twitterToken}`,
        },
      }
    );

    if (response.ok) {
      console.log("✅ Twitter API token is valid");
      return true;
    } else if (response.status === 429) {
      console.warn("⚠️ Twitter API rate limited");
      return false;
    } else {
      console.warn("⚠️ Twitter API token validation failed");
      return false;
    }
  } catch (error) {
    console.warn("⚠️ Twitter API validation error:", error);
    return false;
  }
}

export async function validateApiKeys() {
  console.log("🔍 Validating API keys...");

  const results = await Promise.all([
    validateHuggingFaceAPI(),
    validateTwitterAPI(),
  ]);

  return {
    huggingface: results[0],
    twitter: results[1],
  };
}
