declare module "../utils/errors" {
  export class CustomAPIError extends Error {
    statusCode: number;
    code: string;
    details?: Record<string, any>;
    constructor(
      message: string,
      statusCode: number,
      code: string,
      details?: Record<string, any>
    );
    toJSON(): {
      error: {
        message: string;
        code: string;
        statusCode: number;
        details?: Record<string, any>;
      };
    };
  }
}

declare module "../services/multi-model-ai-service" {
  export interface ModelResponse {
    source: string;
    confidence: number;
    data: any;
    processingTime: number;
  }

  export interface EnsembleResponse {
    finalResponse: string;
    modelContributions: ModelResponse[];
    consensusScore: number;
    totalProcessingTime: number;
    methodology: string;
  }

  class MultiModelAIService {
    generateEnsembleResponse(
      query: string,
      marketContext: any,
      options?: {
        useGemini?: boolean;
        useFinancialBert?: boolean;
        useCryptoBert?: boolean;
        useNewsAnalysis?: boolean;
        weightingStrategy?: "confidence" | "equal" | "performance";
      }
    ): Promise<EnsembleResponse>;
  }

  export const multiModelService: MultiModelAIService;
}
