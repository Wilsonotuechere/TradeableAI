import {
  type User,
  type InsertUser,
  type ChatHistory,
  type InsertChatHistory,
  type MarketData,
  type InsertMarketData,
  type NewsArticle,
  type InsertNewsArticle,
  type MarketStats,
  type SentimentData,
  type ChatMessage,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getChatHistory(userId?: string): Promise<ChatHistory[]>;
  createChatHistory(chat: InsertChatHistory): Promise<ChatHistory>;
  deleteChatHistory(id: string): Promise<void>;

  getMarketData(): Promise<MarketData[]>;
  getMarketStats(): Promise<MarketStats>;
  updateMarketData(data: InsertMarketData[]): Promise<void>;
  getCachedMarketData(): Promise<MarketData[] | null>;
  setCachedMarketData(data: MarketData[]): Promise<void>;

  getNewsArticles(): Promise<NewsArticle[]>;
  getSentimentData(): Promise<SentimentData>;
  updateNewsArticles(articles: InsertNewsArticle[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private chatHistories: Map<string, ChatHistory>;
  private marketData: Map<string, MarketData>;
  private newsArticles: Map<string, NewsArticle>;
  private cachedMarketData: MarketData[] | null = null;
  private cacheTimestamp: number = 0;

  constructor() {
    this.users = new Map();
    this.chatHistories = new Map();
    this.marketData = new Map();
    this.newsArticles = new Map();
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialize IStorage interface
    const initialArticles: NewsArticle[] = [
      {
        id: randomUUID(),
        title: "Bitcoin Reaches New Monthly High Amid Institutional Adoption",
        content:
          "Major financial institutions continue to show increased interest in Bitcoin, driving price momentum and market confidence to new levels this month.",
        source: "CoinDesk",
        sentiment: {
          label: "positive",
          score: 0.92,
          confidence: 0.85,
        },
        imageUrl:
          "https://images.unsplash.com/photo-1639322537228-f710d846310a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        title: "Ethereum Network Sees Record Transaction Volume",
        content:
          "The Ethereum blockchain processed a record number of transactions this week, highlighting growing adoption of decentralized applications and smart contracts.",
        source: "The Block",
        sentiment: {
          label: "positive",
          score: 0.88,
          confidence: 0.82,
        },
        imageUrl:
          "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
    ];

    initialArticles.forEach((article) => {
      this.newsArticles.set(article.id, article);
    });
    // Mock market data
    const mockMarketData: InsertMarketData[] = [
      {
        symbol: "BTC",
        name: "Bitcoin",
        price: "43247.82",
        priceChange24h: "1018.45",
        priceChangePercent24h: "2.4",
        volume24h: "28400000000",
        marketCap: "847600000000",
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        price: "2643.91",
        priceChange24h: "79.32",
        priceChangePercent24h: "3.1",
        volume24h: "12800000000",
        marketCap: "317800000000",
      },
      {
        symbol: "SOL",
        name: "Solana",
        price: "98.43",
        priceChange24h: "-1.19",
        priceChangePercent24h: "-1.2",
        volume24h: "1200000000",
        marketCap: "44200000000",
      },
      {
        symbol: "ADA",
        name: "Cardano",
        price: "0.4821",
        priceChange24h: "0.026",
        priceChangePercent24h: "5.7",
        volume24h: "890000000",
        marketCap: "16900000000",
      },
    ];

    mockMarketData.forEach((data) => {
      const id = randomUUID();
      this.marketData.set(id, {
        ...data,
        id,
        lastUpdated: new Date(),
        marketCap: data.marketCap ?? null,
      });
    });

    // Mock news articles
    const mockNews: InsertNewsArticle[] = [
      {
        title: "Bitcoin Reaches New Monthly High Amid Institutional Adoption",
        content:
          "Major financial institutions continue to show increased interest in Bitcoin, driving price momentum and market confidence to new levels this month.",
        source: "CoinDesk",
        sentiment: {
          label: "positive",
          score: 0.92,
          confidence: 0.85,
        },
        imageUrl:
          "https://images.unsplash.com/photo-1639322537228-f710d846310a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      {
        title: "Ethereum Network Sees Record Transaction Volume",
        content:
          "The Ethereum blockchain processed a record number of transactions this week, highlighting growing adoption of decentralized applications and smart contracts.",
        source: "The Block",
        sentiment: "positive",
        imageUrl:
          "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      },
      {
        title:
          "New Crypto Regulations Proposed for Enhanced Consumer Protection",
        content:
          "Government officials announce new framework aimed at protecting retail investors while maintaining innovation in the cryptocurrency space.",
        source: "Reuters",
        sentiment: "neutral",
        imageUrl:
          "https://images.unsplash.com/photo-1559526324-593bc073d938?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      },
      {
        title: "DeFi Protocol Launches Revolutionary Yield Farming Strategy",
        content:
          "A new decentralized finance protocol introduces innovative yield farming mechanisms that could reshape how users earn passive income in crypto.",
        source: "DeFi Pulse",
        sentiment: "positive",
        imageUrl:
          "https://images.unsplash.com/photo-1621761191319-c6fb62004040?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      },
    ];

    mockNews.forEach((article) => {
      const id = randomUUID();
      this.newsArticles.set(id, {
        ...article,
        id,
        createdAt: new Date(),
        sentiment: article.sentiment || {
          label: "neutral",
          score: 0.5,
          confidence: 0.5,
        },
        imageUrl: article.imageUrl || null,
      });
    });

    // Mock chat histories
    const mockChatHistories: InsertChatHistory[] = [
      {
        userId: null,
        title: "Bitcoin Price Analysis",
        category: "Market Analysis",
        messages: [
          {
            id: randomUUID(),
            role: "user",
            content: "What's happening with Bitcoin today?",
            timestamp: new Date().toISOString(),
          },
          {
            id: randomUUID(),
            role: "assistant",
            content:
              "Based on current market data, Bitcoin is showing strong momentum today with a 2.4% increase to $43,247. This price action is supported by increased institutional interest and positive regulatory developments. The volume is also up 12.1% which indicates strong market participation.",
            timestamp: new Date().toISOString(),
          },
        ] as ChatMessage[],
      },
      {
        userId: null,
        title: "DeFi News Discussion",
        category: "News & Sentiment",
        messages: [
          {
            id: randomUUID(),
            role: "user",
            content: "Tell me about the latest DeFi developments",
            timestamp: new Date().toISOString(),
          },
          {
            id: randomUUID(),
            role: "assistant",
            content:
              "Recent DeFi developments show continued innovation in yield farming and decentralized lending. New protocols are introducing more efficient mechanisms for earning passive income while maintaining security standards.",
            timestamp: new Date().toISOString(),
          },
        ] as ChatMessage[],
      },
    ];

    mockChatHistories.forEach((chat) => {
      const id = randomUUID();
      this.chatHistories.set(id, {
        ...chat,
        id,
        createdAt: new Date(),
        userId: chat.userId ?? null,
      });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getChatHistory(userId?: string): Promise<ChatHistory[]> {
    return Array.from(this.chatHistories.values())
      .filter((chat) => !userId || chat.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createChatHistory(chat: InsertChatHistory): Promise<ChatHistory> {
    const id = randomUUID();
    const chatHistory: ChatHistory = {
      ...chat,
      id,
      createdAt: new Date(),
      userId: chat.userId ?? null,
    };
    this.chatHistories.set(id, chatHistory);
    return chatHistory;
  }

  async deleteChatHistory(id: string): Promise<void> {
    this.chatHistories.delete(id);
  }

  async getMarketData(): Promise<MarketData[]> {
    return Array.from(this.marketData.values());
  }

  async getMarketStats(): Promise<MarketStats> {
    const marketData = Array.from(this.marketData.values());
    const totalMarketCap = marketData.reduce((sum, coin) => {
      return sum + parseFloat(coin.marketCap || "0");
    }, 0);

    const totalVolume24h = marketData.reduce((sum, coin) => {
      return sum + parseFloat(coin.volume24h);
    }, 0);

    const btcMarketCap = parseFloat(
      marketData.find((coin) => coin.symbol === "BTC")?.marketCap || "0"
    );
    const btcDominance = ((btcMarketCap / totalMarketCap) * 100).toFixed(1);

    return {
      totalMarketCap: `$${(totalMarketCap / 1e12).toFixed(2)}T`,
      totalVolume24h: `$${(totalVolume24h / 1e9).toFixed(1)}B`,
      btcDominance: `${btcDominance}%`,
      fearGreedIndex: 64,
    };
  }

  async updateMarketData(data: InsertMarketData[]): Promise<void> {
    // Clear existing data to replace with fresh data
    this.marketData.clear();

    data.forEach((item) => {
      const id = randomUUID();
      this.marketData.set(id, {
        ...item,
        id,
        lastUpdated: new Date(),
        marketCap: item.marketCap ?? null,
      });
    });
  }

  async getCachedMarketData(): Promise<MarketData[] | null> {
    const now = Date.now();
    // Cache for 1 minute to avoid excessive API calls
    if (this.cachedMarketData && now - this.cacheTimestamp < 60000) {
      return this.cachedMarketData;
    }
    return null;
  }

  async setCachedMarketData(data: MarketData[]): Promise<void> {
    this.cachedMarketData = data;
    this.cacheTimestamp = Date.now();
  }

  async getNewsArticles(): Promise<NewsArticle[]> {
    return Array.from(this.newsArticles.values()).sort(
      (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
    );
  }

  async getSocialData() {
    // Sample social data
    const currentTime = new Date().toISOString();
    return {
      topics: [
        {
          topic: "Bitcoin",
          mentions: 34200,
          sentiment: "positive" as "positive" | "negative" | "neutral",
          recentTweets: [
            {
              text: "Bitcoin showing strong momentum as institutional adoption grows! 📈 #BTC",
              createdAt: currentTime,
            },
            {
              text: "Breaking: Major bank announces Bitcoin custody services! 🚀 #Bitcoin",
              createdAt: currentTime,
            },
          ],
        },
        {
          topic: "Ethereum",
          mentions: 18700,
          sentiment: "positive" as "positive" | "negative" | "neutral",
          recentTweets: [
            {
              text: "ETH gas fees hitting new lows with latest scalability upgrades! 🎯",
              createdAt: currentTime,
            },
            {
              text: "Ethereum ecosystem continues to dominate DeFi space 📊 #ETH",
              createdAt: currentTime,
            },
          ],
        },
      ],
      totalMentions: 52900,
      overallSentiment: {
        positive: 65,
        negative: 15,
        neutral: 20,
        total: 100,
        dominantSentiment: "positive",
      },
    };
  }

  async getSentimentData(): Promise<SentimentData> {
    const articles = Array.from(this.newsArticles.values());
    const total = articles.length;
    const positive = articles.filter((a) => a.sentiment === "positive").length;
    const neutral = articles.filter((a) => a.sentiment === "neutral").length;
    const negative = articles.filter((a) => a.sentiment === "negative").length;

    return {
      positive: Math.round((positive / total) * 100),
      neutral: Math.round((neutral / total) * 100),
      negative: Math.round((negative / total) * 100),
      mood:
        positive > neutral && positive > negative
          ? "bullish"
          : negative > positive && negative > neutral
          ? "bearish"
          : "neutral",
    };
  }

  async updateNewsArticles(articles: InsertNewsArticle[]): Promise<void> {
    articles.forEach((article) => {
      const id = randomUUID();
      this.newsArticles.set(id, {
        ...article,
        id,
        createdAt: new Date(),
        sentiment: article.sentiment || {
          label: "neutral",
          score: 0.5,
          confidence: 0.5,
        },
        imageUrl: article.imageUrl || null,
      });
    });
  }
}

export const storage = new MemStorage();
