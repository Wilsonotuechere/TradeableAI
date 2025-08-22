import { apiRequest } from "./queryClient";

export const marketApi = {
  getMarketData: async (symbol: string, interval: string, limit: number) => {
    const response = await apiRequest(
      "GET",
      `/api/market/data?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    return response.json();
  },

  getMarketOverview: async () => {
    const response = await apiRequest("GET", "/api/market");
    return response.json();
  },

  getMarketAnalysis: async (symbol: string) => {
    const response = await apiRequest("GET", `/api/market/analysis/${symbol}`);
    return response.json();
  },
};

export const newsApi = {
  getNews: async () => {
    const response = await apiRequest("GET", "/api/news");
    return response.json();
  },

  getNewsWithSentiment: async () => {
    const response = await apiRequest("GET", "/api/news");
    return response.json();
  },
};

export const chatApi = {
  sendMessage: async (message: string, conversationId?: string) => {
    const response = await apiRequest("POST", "/api/chat", {
      message,
      conversationId,
    });
    return response.json();
  },

  getChatHistory: async () => {
    const response = await apiRequest("GET", "/api/chat/history");
    return response.json();
  },

  saveChatHistory: async (chatData: any) => {
    const response = await apiRequest("POST", "/api/chat/history", chatData);
    return response.json();
  },

  clearChatHistory: async () => {
    const response = await apiRequest("DELETE", "/api/chat/history");
    return response.json();
  },
};
