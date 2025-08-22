import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Send,
  Trash2,
  Brain,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import GlassCard from "@/components/ui/glass-card";
import ProtectedRoute from "@/components/auth/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { ChatMessage } from "@shared/schema";

export default function Chat() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isTyping]);

  // Focus input on component mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await fetch("/api/chat/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          preferences: {
            aiStrategy: "confidence", // You can make this configurable via UI
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || `API request failed: ${response.status}`
        );
      }

      return response.json();
    },
    onMutate: async (userMessage) => {
      // Add user message immediately
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
        intent: "GENERAL",
      };
      setChatHistory((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setMessage("");
    },
    onSuccess: (data) => {
      // Add AI response with ensemble details
      const message = data.data?.message;
      const ensembleDetails = data.data?.ensembleDetails;

      const aiMsg: ChatMessage = {
        id: message.id || (Date.now() + 1).toString(),
        role: "assistant",
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        intent: message.intent || "GENERAL",
        metadata: {
          ...message.metadata,
          ensembleDetails: ensembleDetails
            ? {
                consensusScore: ensembleDetails.qualityMetrics.consensusScore,
                processingTime:
                  ensembleDetails.qualityMetrics.totalProcessingTime,
                modelsUsed: ensembleDetails.modelBreakdown.map((m: any) => ({
                  name: m.model,
                  confidence: m.confidence,
                  processingTime: m.processingTime,
                  strengths: m.strengths,
                })),
              }
            : undefined,
        },
      };
      setChatHistory((prev) => [...prev, aiMsg]);
      setIsTyping(false);

      // Log model performance for monitoring
      if (ensembleDetails) {
        console.log("AI Ensemble Performance:", {
          consensusScore: ensembleDetails.qualityMetrics.consensusScore,
          processingTime: ensembleDetails.qualityMetrics.totalProcessingTime,
          modelsConsulted: ensembleDetails.qualityMetrics.modelsConsulted,
        });
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const isAPIError = errorMessage.includes("GEMINI_API_KEY");

      // Add error message
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: isAPIError
          ? "AI service is temporarily unavailable. Please try again later."
          : "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        intent: "GENERAL",
      };
      setChatHistory((prev) => [...prev, errorMsg]);
      setIsTyping(false);
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate(message.trim());
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all chat history?")) {
      setChatHistory([]);
    }
  };

  const suggestedQuestions = [
    "What's the current Bitcoin price?",
    "Explain what RSI means in trading",
    "Should I buy Ethereum now?",
    "Show me the latest crypto news sentiment",
    "What's happening in the DeFi market?",
    "Analyze Solana's recent performance",
  ];

  return (
    <ProtectedRoute>
    <div className="pt-20">
      <div className="max-w-4xl mx-auto px-6 py-8 h-[calc(100vh-5rem)] flex flex-col">
        {/* Chat Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-electric to-neon rounded-full flex items-center justify-center pulse-glow">
                <Brain className="text-white" size={20} />
              </div>
              <div>
                <h1 className="font-grotesk font-bold text-2xl text-white">
                  AI Trading Assistant
                </h1>
                <p className="text-cool-gray">
                  Welcome back, {user?.email?.split('@')[0]}! Ask me anything about crypto markets, trading, or get real-time analysis
                </p>
              </div>
            </div>
            {chatHistory.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                data-testid="button-clear-history"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div
          className="flex-1 overflow-y-auto mb-6"
          data-testid="chat-messages"
        >
          {chatHistory.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-electric to-neon rounded-full flex items-center justify-center pulse-glow mb-4">
                <Sparkles className="text-white" size={32} />
              </div>
              <h3 className="font-grotesk font-semibold text-xl text-white mb-4">
                Welcome to Tradeable!
              </h3>
              <p className="text-cool-gray mb-6">
                I'm your AI-powered crypto trading assistant. I can help you
                with market analysis, trading insights, news sentiment, and
                educational content about cryptocurrency.
              </p>

              {/* Suggested Questions */}
              <div className="space-y-3">
                <h4 className="font-medium text-electric">Try asking me:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setMessage(question)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left text-sm text-cool-gray hover:text-white transition-colors"
                      data-testid={`suggestion-${index}`}
                    >
                      "{question}"
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {chatHistory.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                  data-testid={`message-${index}`}
                >
                  <div
                    className={`max-w-[80%] ${
                      msg.role === "user"
                        ? "bg-electric/20 border-electric/30"
                        : "bg-white/5 border-white/10"
                    } rounded-lg p-4 border`}
                  >
                    {msg.role === "assistant" && (
                      <>
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-electric to-neon rounded-full flex items-center justify-center">
                            <Brain className="text-white" size={12} />
                          </div>
                          <span className="text-sm font-medium text-electric">
                            AI Assistant
                          </span>
                          {msg.metadata?.aiEnsemble ? (
                            <Badge
                              variant="outline"
                              className="text-xs bg-electric/10 text-electric border-electric/30"
                            >
                              {msg.metadata.aiEnsemble.modelsUsed.length} AI
                              Models
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs bg-electric/10 text-electric border-electric/30"
                            >
                              Powered by Gemini
                            </Badge>
                          )}
                          {msg.metadata?.aiEnsemble?.consensusScore && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-500/10 text-green-400 border-green-500/30"
                            >
                              {(
                                msg.metadata.aiEnsemble.consensusScore * 100
                              ).toFixed(0)}
                              % Consensus
                            </Badge>
                          )}
                        </div>
                        {msg.metadata?.aiEnsemble && (
                          <div className="text-xs text-cool-gray/70 mb-2 flex items-center gap-2">
                            <span>
                              Response Time:{" "}
                              {msg.metadata.aiEnsemble.processingTime}ms
                            </span>
                            <span>•</span>
                            <span>
                              Confidence:{" "}
                              {(
                                msg.metadata.aiEnsemble.confidence * 100
                              ).toFixed(0)}
                              %
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <div
                      className={`whitespace-pre-wrap leading-relaxed ${
                        msg.role === "user" ? "text-white" : "text-cool-gray"
                      }`}
                      data-testid="message-content"
                    >
                      {msg.content}
                    </div>
                    <div
                      className={`text-xs mt-2 ${
                        msg.role === "user"
                          ? "text-electric/70"
                          : "text-cool-gray/50"
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border-white/10 rounded-lg p-4 border">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-electric to-neon rounded-full flex items-center justify-center animate-pulse">
                        <Brain className="text-white" size={12} />
                      </div>
                      <span className="text-sm font-medium text-electric">
                        AI Assistant
                      </span>
                    </div>
                    <div
                      className="flex items-center space-x-2"
                      data-testid="typing-indicator"
                    >
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-electric rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-electric rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-electric rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-cool-gray text-sm">
                        AI is thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <GlassCard className="p-4">
          <form
            onSubmit={handleSendMessage}
            className="flex items-center space-x-3"
            data-testid="chat-form"
          >
            <div className="flex-1">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me about crypto markets, trading strategies, or get market analysis..."
                disabled={sendMessageMutation.isPending}
                className="bg-white/5 border-white/20 text-white placeholder:text-cool-gray/70 focus:border-electric/50 focus:ring-electric/20"
                data-testid="input-message"
              />
            </div>
            <Button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="bg-gradient-to-r from-electric to-neon hover:from-electric/80 hover:to-neon/80 text-white"
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {/* Quick Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMessage("What's the current Bitcoin price and analysis?")
              }
              className="bg-white/5 border-white/20 text-cool-gray hover:text-white hover:bg-white/10 text-xs"
              data-testid="quick-bitcoin"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Bitcoin Analysis
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMessage("Show me the latest crypto news sentiment")
              }
              className="bg-white/5 border-white/20 text-cool-gray hover:text-white hover:bg-white/10 text-xs"
              data-testid="quick-news"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              News Sentiment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMessage("Explain market indicators for beginners")
              }
              className="bg-white/5 border-white/20 text-cool-gray hover:text-white hover:bg-white/10 text-xs"
              data-testid="quick-education"
            >
              <Brain className="h-3 w-3 mr-1" />
              Learn Trading
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
    </ProtectedRoute>
  );
}
