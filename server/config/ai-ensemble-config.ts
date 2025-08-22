export interface AIModelConfig {
  name: string;
  endpoint?: string;
  enabled: boolean;
  weight: number;
  timeout: number;
  retries: number;
  fallbackEnabled: boolean;
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  costPerRequest: number;
  strengths: string[];
  weaknesses: string[];
  optimalUseCases: string[];
  minimumConfidenceThreshold: number;
}

export interface EnsembleStrategy {
  name: string;
  description: string;
  weightingFunction: (responses: any[]) => number[];
  consensusThreshold: number;
  requireMinimumModels: number;
  maxProcessingTime: number;
  fallbackStrategy: string;
}

export interface AIEnsembleConfig {
  models: Record<string, AIModelConfig>;
  strategies: Record<string, EnsembleStrategy>;
  defaultStrategy: string;
  globalSettings: {
    maxConcurrentRequests: number;
    globalTimeout: number;
    enableFallbacks: boolean;
    logPerformanceMetrics: boolean;
    cacheResponses: boolean;
    cacheTTL: number;
  };
  qualityThresholds: {
    minimumConsensus: number;
    maximumResponseTime: number;
    minimumModelCount: number;
    confidenceThreshold: number;
  };
  costManagement: {
    dailyBudgetLimit: number;
    costPerRequestLimit: number;
    enableCostOptimization: boolean;
    preferLowerCostModels: boolean;
  };
}

// Production-ready AI ensemble configuration
export const AI_ENSEMBLE_CONFIG: AIEnsembleConfig = {
  models: {
    gemini: {
      name: "Gemini-2.0-Flash",
      enabled: true,
      weight: 1.0,
      timeout: 30000,
      retries: 2,
      fallbackEnabled: true,
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 10,
      },
      costPerRequest: 0.02,
      strengths: [
        "comprehensive_reasoning",
        "context_understanding",
        "educational_content",
        "market_interpretation",
        "risk_assessment",
      ],
      weaknesses: [
        "processing_speed",
        "specialized_terminology",
        "real_time_data",
      ],
      optimalUseCases: [
        "complex_analysis",
        "educational_queries",
        "market_interpretation",
        "risk_assessment",
        "strategic_advice",
      ],
      minimumConfidenceThreshold: 0.7,
    },

    finbert: {
      name: "FinBERT",
      endpoint: "ProsusAI/finbert",
      enabled: true,
      weight: 0.8,
      timeout: 15000,
      retries: 3,
      fallbackEnabled: true,
      rateLimit: {
        requestsPerMinute: 100,
        burstLimit: 20,
      },
      costPerRequest: 0.001,
      strengths: [
        "financial_sentiment",
        "market_terminology",
        "news_analysis",
        "risk_indicators",
        "economic_context",
      ],
      weaknesses: [
        "general_conversation",
        "technical_analysis",
        "crypto_specific_terms",
      ],
      optimalUseCases: [
        "sentiment_analysis",
        "news_interpretation",
        "financial_document_analysis",
        "market_mood_assessment",
      ],
      minimumConfidenceThreshold: 0.6,
    },

    cryptobert: {
      name: "CryptoBERT",
      endpoint: "ElKulako/cryptobert",
      enabled: true,
      weight: 0.7,
      timeout: 12000,
      retries: 3,
      fallbackEnabled: true,
      rateLimit: {
        requestsPerMinute: 80,
        burstLimit: 15,
      },
      costPerRequest: 0.0015,
      strengths: [
        "crypto_terminology",
        "community_sentiment",
        "defi_concepts",
        "blockchain_terminology",
        "trading_slang",
        "social_media_analysis",
      ],
      weaknesses: [
        "formal_financial_analysis",
        "traditional_markets",
        "regulatory_content",
      ],
      optimalUseCases: [
        "crypto_sentiment_analysis",
        "social_media_monitoring",
        "community_feedback",
        "meme_coin_analysis",
        "defi_protocol_sentiment",
      ],
      minimumConfidenceThreshold: 0.65,
    },

    newsRoberta: {
      name: "News-RoBERTa",
      endpoint: "cardiffnlp/twitter-roberta-base-sentiment-latest",
      enabled: true,
      weight: 0.6,
      timeout: 10000,
      retries: 3,
      fallbackEnabled: true,
      rateLimit: {
        requestsPerMinute: 120,
        burstLimit: 25,
      },
      costPerRequest: 0.0008,
      strengths: [
        "news_classification",
        "social_media_sentiment",
        "trending_topic_analysis",
        "real_time_sentiment",
        "short_text_analysis",
      ],
      weaknesses: [
        "long_form_content",
        "technical_analysis",
        "financial_terminology",
      ],
      optimalUseCases: [
        "breaking_news_analysis",
        "social_media_monitoring",
        "trend_detection",
        "public_sentiment_tracking",
      ],
      minimumConfidenceThreshold: 0.6,
    },

    technicalAnalyzer: {
      name: "Technical-Analyzer",
      endpoint: "custom/technical-patterns",
      enabled: true,
      weight: 0.7,
      timeout: 8000,
      retries: 2,
      fallbackEnabled: true,
      rateLimit: {
        requestsPerMinute: 200,
        burstLimit: 50,
      },
      costPerRequest: 0.0005,
      strengths: [
        "price_pattern_recognition",
        "volume_analysis",
        "trend_identification",
        "support_resistance",
        "indicator_interpretation",
      ],
      weaknesses: [
        "fundamental_analysis",
        "news_interpretation",
        "sentiment_analysis",
      ],
      optimalUseCases: [
        "chart_analysis",
        "trading_signals",
        "pattern_recognition",
        "technical_indicators",
      ],
      minimumConfidenceThreshold: 0.65,
    },
  },

  strategies: {
    confidence: {
      name: "Confidence Weighting",
      description:
        "Models with higher confidence scores have proportionally more influence on the final response",
      weightingFunction: (responses: any[]) => {
        const totalConfidence = responses.reduce(
          (sum, r) => sum + r.confidence,
          0
        );
        return responses.map((r) => r.confidence / totalConfidence);
      },
      consensusThreshold: 0.7,
      requireMinimumModels: 2,
      maxProcessingTime: 45000,
      fallbackStrategy: "equal",
    },

    equal: {
      name: "Equal Weighting",
      description:
        "All models contribute equally regardless of confidence levels",
      weightingFunction: (responses: any[]) => {
        const equalWeight = 1 / responses.length;
        return new Array(responses.length).fill(equalWeight);
      },
      consensusThreshold: 0.6,
      requireMinimumModels: 2,
      maxProcessingTime: 30000,
      fallbackStrategy: "performance",
    },

    performance: {
      name: "Performance Weighting",
      description:
        "Models are weighted based on historical accuracy and performance metrics",
      weightingFunction: (responses: any[]) => {
        const performanceScores = responses.map((r) => {
          switch (r.source) {
            case "Gemini-2.0-Flash":
              return 0.85;
            case "FinBERT":
              return 0.78;
            case "CryptoBERT":
              return 0.72;
            case "News-RoBERTa":
              return 0.76;
            case "Technical-Analyzer":
              return 0.7;
            default:
              return 0.6;
          }
        });

        const totalPerformance = performanceScores.reduce(
          (sum, score) => sum + score,
          0
        );
        return performanceScores.map((score) => score / totalPerformance);
      },
      consensusThreshold: 0.75,
      requireMinimumModels: 3,
      maxProcessingTime: 60000,
      fallbackStrategy: "confidence",
    },

    adaptive: {
      name: "Adaptive Weighting",
      description:
        "Dynamically adjusts model weights based on query type and context",
      weightingFunction: (responses: any[]) => {
        return responses.map(
          (r) =>
            r.confidence /
            responses.reduce((sum, resp) => sum + resp.confidence, 0)
        );
      },
      consensusThreshold: 0.8,
      requireMinimumModels: 3,
      maxProcessingTime: 50000,
      fallbackStrategy: "confidence",
    },

    fastResponse: {
      name: "Fast Response",
      description:
        "Optimizes for speed, using fewer models with shorter timeouts",
      weightingFunction: (responses: any[]) => {
        const speedScores = responses.map((r) => 1 / (r.processingTime / 1000));
        const totalSpeed = speedScores.reduce((sum, score) => sum + score, 0);
        return speedScores.map((score) => score / totalSpeed);
      },
      consensusThreshold: 0.6,
      requireMinimumModels: 2,
      maxProcessingTime: 15000,
      fallbackStrategy: "equal",
    },

    highAccuracy: {
      name: "High Accuracy",
      description:
        "Uses all available models with emphasis on consensus and validation",
      weightingFunction: (responses: any[]) => {
        const consensusBonus = responses.map((r) => {
          const avgConfidence =
            responses.reduce((sum, resp) => sum + resp.confidence, 0) /
            responses.length;
          const consensusScore = 1 - Math.abs(r.confidence - avgConfidence);
          return r.confidence * 0.7 + consensusScore * 0.3;
        });

        const total = consensusBonus.reduce((sum, score) => sum + score, 0);
        return consensusBonus.map((score) => score / total);
      },
      consensusThreshold: 0.85,
      requireMinimumModels: 4,
      maxProcessingTime: 90000,
      fallbackStrategy: "performance",
    },
  },

  defaultStrategy: "confidence",

  globalSettings: {
    maxConcurrentRequests: 5,
    globalTimeout: 60000,
    enableFallbacks: true,
    logPerformanceMetrics: true,
    cacheResponses: true,
    cacheTTL: 300000, // 5 minutes
  },

  qualityThresholds: {
    minimumConsensus: 0.6,
    maximumResponseTime: 45000,
    minimumModelCount: 2,
    confidenceThreshold: 0.5,
  },

  costManagement: {
    dailyBudgetLimit: 50.0,
    costPerRequestLimit: 0.25,
    enableCostOptimization: true,
    preferLowerCostModels: false,
  },
};

export class AIEnsembleConfigManager {
  private config: AIEnsembleConfig;
  private performanceHistory: Map<string, any[]> = new Map();

  constructor(config: AIEnsembleConfig = AI_ENSEMBLE_CONFIG) {
    this.config = { ...config };
  }

  getOptimalConfiguration(queryAnalysis: any): {
    enabledModels: string[];
    strategy: string;
    timeout: number;
    expectedCost: number;
  } {
    const {
      isTechnicalQuery,
      isSentimentQuery,
      isEducationalQuery,
      complexity,
      urgency,
    } = queryAnalysis;

    let enabledModels: string[] = ["gemini"];
    let strategy = this.config.defaultStrategy;
    let timeout = this.config.globalSettings.globalTimeout;

    if (isSentimentQuery) {
      enabledModels.push("finbert", "cryptobert", "newsRoberta");
    }

    if (isTechnicalQuery) {
      enabledModels.push("technicalAnalyzer", "finbert");
    }

    if (isEducationalQuery) {
      enabledModels.push("finbert");
      strategy = "confidence";
    }

    if (urgency === "high") {
      strategy = "fastResponse";
      timeout = 15000;
      enabledModels = enabledModels.slice(0, 2);
    } else if (complexity === "high") {
      strategy = "highAccuracy";
      timeout = 60000;
    }

    const expectedCost = enabledModels.reduce((sum, modelKey) => {
      const model = this.config.models[modelKey];
      return sum + (model ? model.costPerRequest : 0);
    }, 0);

    return {
      enabledModels: enabledModels.filter(
        (key) => this.config.models[key]?.enabled
      ),
      strategy,
      timeout,
      expectedCost,
    };
  }

  updatePerformanceMetrics(
    modelName: string,
    metrics: {
      responseTime: number;
      confidence: number;
      accuracy?: number;
      timestamp: Date;
    }
  ) {
    if (!this.performanceHistory.has(modelName)) {
      this.performanceHistory.set(modelName, []);
    }

    const history = this.performanceHistory.get(modelName)!;
    history.push(metrics);

    if (history.length > 100) {
      history.shift();
    }
  }

  getModelPerformance(modelName: string): any {
    const history = this.performanceHistory.get(modelName);
    if (!history || history.length === 0) {
      return { message: "No performance data available" };
    }

    const avgResponseTime =
      history.reduce((sum, m) => sum + m.responseTime, 0) / history.length;
    const avgConfidence =
      history.reduce((sum, m) => sum + m.confidence, 0) / history.length;
    const successRate =
      history.filter(
        (m) =>
          m.confidence >
            this.config.models[modelName]?.minimumConfidenceThreshold || 0.5
      ).length / history.length;

    return {
      averageResponseTime: Math.round(avgResponseTime),
      averageConfidence: Number(avgConfidence.toFixed(3)),
      successRate: Number(successRate.toFixed(3)),
      totalRequests: history.length,
      lastUpdated: history[history.length - 1].timestamp,
    };
  }

  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const enabledModels = Object.values(this.config.models).filter(
      (m) => m.enabled
    );
    if (enabledModels.length === 0) {
      errors.push("At least one model must be enabled");
    }

    if (!this.config.strategies[this.config.defaultStrategy]) {
      errors.push(
        `Default strategy '${this.config.defaultStrategy}' not found`
      );
    }

    Object.entries(this.config.models).forEach(([key, model]) => {
      if (model.weight < 0 || model.weight > 2) {
        errors.push(`Model ${key}: weight must be between 0 and 2`);
      }

      if (model.timeout < 1000 || model.timeout > 120000) {
        errors.push(`Model ${key}: timeout must be between 1000 and 120000 ms`);
      }

      if (
        model.minimumConfidenceThreshold < 0 ||
        model.minimumConfidenceThreshold > 1
      ) {
        errors.push(
          `Model ${key}: confidence threshold must be between 0 and 1`
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  exportConfiguration(): string {
    return JSON.stringify(this.config, null, 2);
  }

  importConfiguration(configJson: string): boolean {
    try {
      const newConfig = JSON.parse(configJson);
      const validation = this.validateConfiguration();

      if (validation.valid) {
        this.config = newConfig;
        return true;
      } else {
        console.error("Invalid configuration:", validation.errors);
        return false;
      }
    } catch (error) {
      console.error("Failed to import configuration:", error);
      return false;
    }
  }

  getConfiguration(): AIEnsembleConfig {
    return { ...this.config };
  }

  updateConfiguration(updates: Partial<AIEnsembleConfig>): boolean {
    try {
      this.config = { ...this.config, ...updates };
      const validation = this.validateConfiguration();

      if (!validation.valid) {
        console.error(
          "Configuration update failed validation:",
          validation.errors
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Failed to update configuration:", error);
      return false;
    }
  }
}

export const aiConfigManager = new AIEnsembleConfigManager();
