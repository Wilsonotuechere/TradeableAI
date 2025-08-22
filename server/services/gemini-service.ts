import {
  MarketAnalysis,
  NewsAnalysis,
  SocialAnalysis,
} from "@shared/types/market-analysis";
import env from "../config/env";
import { GeminiAPIError, ValidationError, TechnicalIndicators } from "./types";

// Initialize Gemini API configuration
const GEMINI_CONFIG = {
  apiKey: env.GEMINI_API_KEY,
  baseUrl: "https://generativelanguage.googleapis.com/v1/models",
  model: "gemini-2.0-flash",
  defaultParams: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 2048,
  },
} as const;

export const GEMINI_SYSTEM_ROLE = `You are Tradeable's AI Market Analyst, powered by Google's Gemini. Your role is to:

1. **Analyze Market Data**: Provide clear, actionable insights from crypto market data
2. **Educational Focus**: Break down complex market concepts into beginner-friendly explanations
3. **Comprehensive Analysis**: Combine technical analysis with sentiment data for complete market views
4. **Balanced Perspective**: Maintain educational tone without making direct price predictions

## Key Responsibilities:
- Explain technical indicators in plain language with practical examples
- Interpret market sentiment and social trends with context
- Highlight potential risks and opportunities with clear reasoning
- Provide comprehensive context for market movements
- Always include educational elements and risk disclaimers

## Response Style Guidelines:
- Use clear, structured formatting with headers and sections
- Break down complex terms with definitions and examples
- Include relevant market context and historical perspective
- Balance technical and fundamental analysis
- Organize information in logical, scannable sections
- Use consistent formatting for data presentation`;

export async function callGeminiAPI(prompt: string): Promise<string> {
  const config = GEMINI_CONFIG;

  if (!prompt?.trim()) {
    throw new ValidationError("Prompt cannot be empty");
  }

  if (env.NODE_ENV === "development") {
    console.log("DEBUG - Gemini Config:", {
      apiKeyExists: Boolean(config.apiKey),
      baseUrl: config.baseUrl,
      model: config.model,
    });
  }

  try {
    const response = await fetch(
      `${config.baseUrl}/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: config.defaultParams,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new GeminiAPIError(
        `API request failed: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new GeminiAPIError("Invalid response structure from Gemini API");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw error instanceof GeminiAPIError
      ? error
      : new GeminiAPIError(`Unexpected error: ${error}`);
  }
}

export function generateMarketAnalysisPrompt(data: {
  coin: MarketAnalysis["coin"];
  technicalAnalysis: any;
  newsSentiment: NewsAnalysis;
  socialSentiment: SocialAnalysis;
}): string {
  const config = GEMINI_CONFIG;

  if (!config.apiKey) {
    throw new ValidationError(
      "GEMINI_API_KEY is not configured in environment variables"
    );
  }

  return `${GEMINI_SYSTEM_ROLE}

# 📊 COMPREHENSIVE MARKET ANALYSIS REQUEST

## Asset Overview: ${data.coin.name} (${data.coin.symbol})

### 💰 Current Market Metrics
| Metric | Value | Indicator |
|--------|-------|-----------|
| **Current Price** | $${data.coin.price.toLocaleString()} | ${getPriceDirection(
    data.coin.priceChange24h
  )} |
| **24h Change** | ${
    data.coin.priceChange24h > 0 ? "+" : ""
  }${data.coin.priceChange24h.toFixed(2)}% | ${getPriceChangeIndicator(
    data.coin.priceChange24h
  )} |
| **24h Volume** | $${data.coin.volume24h.toLocaleString()} | ${getVolumeIndicator(
    data.coin.volume24h
  )} |
| **Market Cap** | $${data.coin.marketCap.toLocaleString()} | ${getMarketCapRank(
    data.coin.marketCap
  )} |

### 📈 Technical Analysis Summary
| Indicator | Value | Interpretation | Signal |
|-----------|-------|----------------|--------|
| **RSI (14)** | ${data.technicalAnalysis.rsi.toFixed(2)} | ${interpretRSI(
    data.technicalAnalysis.rsi
  )} | ${getRSISignal(data.technicalAnalysis.rsi)} |
| **MACD** | ${data.technicalAnalysis.macd.value.toFixed(4)} | ${interpretMACD(
    data.technicalAnalysis.macd
  )} | ${getMACDSignal(data.technicalAnalysis.macd)} |
| **Moving Averages** | Multiple timeframes | ${formatMovingAverages(
    data.technicalAnalysis.movingAverages,
    data.coin.price
  )} | ${getMASignal(data.technicalAnalysis.movingAverages, data.coin.price)} |

### 📰 Market Sentiment Overview
| Source | Sentiment | Confidence | Key Insights |
|--------|-----------|------------|--------------|
| **News Analysis** | ${data.newsSentiment.overallSentiment.label} | ${(
    data.newsSentiment.overallSentiment.confidence * 100
  ).toFixed(1)}% | ${getTopNewsThemes(data.newsSentiment)} |
| **Social Media** | ${data.socialSentiment.overallSentiment.label} | ${(
    data.socialSentiment.overallSentiment.confidence * 100
  ).toFixed(1)}% | ${formatTrending(data.socialSentiment.trending)} |

---

## 📋 ANALYSIS REQUEST STRUCTURE

Please provide a comprehensive analysis following this **exact format**:

### 🎯 **EXECUTIVE SUMMARY**
- **Current Market Position**: Brief overview of ${
    data.coin.symbol
  }'s current standing
- **Key Signals**: Top 3 most important indicators to watch
- **Risk Level**: Overall risk assessment for this asset

### 📊 **TECHNICAL ANALYSIS BREAKDOWN**
#### Price Action & Trends
- **Current Trend Direction**: What the charts are showing
- **Key Support/Resistance Levels**: Important price levels to monitor
- **Volume Analysis**: What trading volume tells us

#### Technical Indicators Deep Dive
- **RSI Analysis**: What ${data.technicalAnalysis.rsi.toFixed(
    2
  )} RSI means and implications
- **MACD Interpretation**: Momentum and trend signals
- **Moving Average Confluence**: How different timeframes align

### 💡 **MARKET SENTIMENT ANALYSIS**
#### News & Media Impact
- **Sentiment Drivers**: What's influencing current news sentiment
- **Market Narrative**: Dominant themes affecting ${data.coin.symbol}
- **Timeline Considerations**: How recent events may affect price

#### Social Media & Community
- **Community Sentiment**: What traders and investors are discussing
- **Trending Topics**: Key conversations around ${data.coin.symbol}
- **Sentiment Sustainability**: Whether current sentiment is likely to persist

### 🎓 **EDUCATIONAL INSIGHTS**
#### For Beginners
- **Key Concepts Explained**: Simple definitions of technical terms used
- **What This Means**: Plain English interpretation of the data
- **Learning Opportunities**: Educational takeaways from this analysis

#### Trading Considerations
- **Entry/Exit Considerations**: Factors to consider for position management
- **Risk Management**: Important risk factors and mitigation strategies
- **Market Context**: How broader market conditions affect this asset

### ⚠️ **RISK ASSESSMENT & DISCLAIMERS**
- **Volatility Factors**: Elements that could cause significant price movement
- **External Risks**: Regulatory, technical, or market risks to consider
- **Educational Disclaimer**: Clear statement about educational purpose

---

## 📝 **FORMATTING REQUIREMENTS**
- Use clear headers and subheaders for easy navigation
- Include bullet points and numbered lists for key information
- Maintain consistent data presentation format
- Define technical terms when first introduced
- Include relevant emojis for visual organization
- End with educational disclaimer and risk warnings

**Response Goal**: Create an educational analysis that helps users understand both the current market situation and the analytical process itself.`;
}

export function generateChatPrompt(message: string, context?: any): string {
  return `${GEMINI_SYSTEM_ROLE}

## 💬 CHAT INTERACTION REQUEST

**User Question**: ${message}

${
  context
    ? `**Context Data**:\n\`\`\`json\n${JSON.stringify(
        context,
        null,
        2
      )}\n\`\`\``
    : ""
}

## Response Guidelines:
Please respond as Tradeable's AI trading assistant with the following structure:

### 📝 **Direct Answer**
- Address the user's question clearly and concisely
- Use beginner-friendly language
- Include relevant examples when helpful

### 📊 **Context & Background** (if applicable)
- Provide relevant market context
- Explain any technical concepts mentioned
- Connect to broader market trends

### 💡 **Educational Value**
- Include learning points related to the question
- Suggest related concepts to explore
- Provide practical applications

### ⚠️ **Important Notes**
- Highlight any risks or considerations
- Include appropriate disclaimers
- Remind about educational purpose

**Conversation Style**: Professional yet approachable, educational but not overwhelming

**Required Ending**: "💡 **Remember**: This is a learning tool to help you understand trading better!"`;
}

export function generateMarketEducationPrompt(
  topic: string,
  context: any
): string {
  return `${GEMINI_SYSTEM_ROLE}

# 🎓 MARKET EDUCATION REQUEST

## Topic: ${topic}

**Context Data**:
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

## Required Response Structure:

### 📚 **FUNDAMENTALS**
#### What is ${topic}?
- Clear, simple definition
- Why it matters in crypto trading
- How it fits into the bigger picture

#### Key Characteristics
- Essential properties and features
- What makes it unique or important
- Common misconceptions to avoid

### 🔧 **HOW IT WORKS**
#### Mechanism & Process
- Step-by-step explanation of how it functions
- Simple analogies or real-world comparisons
- Visual description (if applicable)

#### Calculation or Methodology (if technical)
- Basic formula or process (simplified)
- What inputs are used
- How results are interpreted

### 📊 **MARKET APPLICATION**
#### Practical Usage
- How professional traders use this concept
- Common strategies or approaches
- When it's most/least effective

#### Real-World Examples
- Historical examples from crypto markets
- Case studies or scenarios
- Success and failure stories

### 🎯 **BEGINNER'S GUIDE**
#### Getting Started
- First steps for someone new to this concept
- What to observe and track
- Tools or resources needed

#### Common Patterns & Signals
- What to look for in the markets
- Warning signs or red flags
- Typical market behaviors related to this topic

#### Mistakes to Avoid
- Common beginner errors
- Misconceptions that lead to losses
- How to avoid typical pitfalls

### 🛡️ **RISK MANAGEMENT**
#### Associated Risks
- What can go wrong
- Market conditions that affect reliability
- Limitations of this concept

#### Risk Mitigation
- How to use this safely
- Complementary tools or analysis
- Position sizing considerations

### 🚀 **NEXT STEPS**
#### Building Expertise
- How to practice and improve understanding
- Advanced concepts to explore next
- Community resources and learning materials

#### Integration with Trading
- How to incorporate into a trading plan
- Combining with other analysis methods
- Gradual implementation strategies

---

## 📋 **Formatting Requirements**:
- Use clear headings and subheadings
- Include practical examples throughout
- Define technical terms immediately when introduced
- Use bullet points for easy scanning
- Include relevant emojis for visual organization
- Maintain educational, encouraging tone
- End with confidence-building summary

**Educational Goal**: Help users understand not just WHAT this concept is, but HOW and WHY to use it effectively in their trading journey.`;
}

// Enhanced Helper Functions
function getPriceDirection(change: number): string {
  return change > 0 ? "📈 Rising" : change < 0 ? "📉 Declining" : "➡️ Stable";
}

function getPriceChangeIndicator(change: number): string {
  if (Math.abs(change) > 10)
    return change > 0 ? "🚀 Strong Bullish" : "🔴 Strong Bearish";
  if (Math.abs(change) > 5) return change > 0 ? "🟢 Bullish" : "🟡 Bearish";
  return "⚪ Neutral";
}

function getVolumeIndicator(volume: number): string {
  // This would need historical comparison, but for now return a placeholder
  return volume > 1000000000
    ? "🔥 High Activity"
    : volume > 100000000
    ? "📊 Moderate Activity"
    : "📉 Low Activity";
}

function getMarketCapRank(marketCap: number): string {
  if (marketCap > 100000000000) return "🥇 Top Tier";
  if (marketCap > 10000000000) return "🥈 Large Cap";
  if (marketCap > 1000000000) return "🥉 Mid Cap";
  return "🔸 Small Cap";
}

function interpretRSI(rsi: number): string {
  if (rsi > 70) return "Potentially overbought territory";
  if (rsi < 30) return "Potentially oversold territory";
  if (rsi > 50) return "Bullish momentum zone";
  return "Bearish momentum zone";
}

function getRSISignal(rsi: number): string {
  if (rsi > 80) return "🔴 Strong Sell Signal";
  if (rsi > 70) return "🟡 Caution - Overbought";
  if (rsi < 20) return "🟢 Strong Buy Signal";
  if (rsi < 30) return "🟡 Opportunity - Oversold";
  return "⚪ Neutral";
}

function interpretMACD(macd: any): string {
  const trend =
    macd.value > macd.signal ? "bullish crossover" : "bearish crossover";
  const strength = Math.abs(macd.histogram) > 0.5 ? "strong" : "moderate";
  const direction = macd.histogram > 0 ? "strengthening" : "weakening";
  return `${trend} with ${strength} ${direction} momentum`;
}

function getMACDSignal(macd: any): string {
  if (macd.value > macd.signal && macd.histogram > 0) return "🟢 Bullish";
  if (macd.value < macd.signal && macd.histogram < 0) return "🔴 Bearish";
  return "🟡 Mixed";
}

function formatMovingAverages(ma: any, price: number): string {
  const trends = [];
  if (price > ma.sma200) trends.push("above 200-day (long-term bullish)");
  if (price > ma.sma50) trends.push("above 50-day (medium-term bullish)");
  if (price > ma.sma20) trends.push("above 20-day (short-term bullish)");

  if (trends.length === 0) {
    return "below major moving averages (bearish alignment)";
  }

  return `Price is ${trends.join(", ")}`;
}

function getMASignal(ma: any, price: number): string {
  const aboveCount = [ma.sma20, ma.sma50, ma.sma200].filter(
    (avg) => price > avg
  ).length;
  if (aboveCount === 3) return "🟢 Strong Bullish";
  if (aboveCount === 2) return "🟢 Bullish";
  if (aboveCount === 1) return "🟡 Mixed";
  return "🔴 Bearish";
}

function formatSentiment(sentiment: any): string {
  const confidence = (sentiment.confidence * 100).toFixed(1);
  const emoji = sentiment.label.toLowerCase().includes("positive")
    ? "😊"
    : sentiment.label.toLowerCase().includes("negative")
    ? "😟"
    : "😐";
  return `${emoji} ${sentiment.label} (${confidence}% confidence)`;
}

function getTopNewsThemes(newsSentiment: NewsAnalysis): string {
  // This would analyze top themes from news data
  return "Market adoption, regulatory developments, technical updates";
}

function formatTrending(trending: any[]): string {
  if (!trending || trending.length === 0)
    return "No significant trending topics";

  return trending
    .slice(0, 3)
    .map((t, index) => {
      const emoji = index === 0 ? "🔥" : index === 1 ? "📈" : "💬";
      return `${emoji} ${t.topic} (${t.mentions.toLocaleString()} mentions)`;
    })
    .join(" | ");
}

// Additional utility functions for enhanced formatting
export function formatCurrency(amount: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 2): string {
  const formatted = value.toFixed(decimals);
  return `${value > 0 ? "+" : ""}${formatted}%`;
}

export function formatLargeNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}
