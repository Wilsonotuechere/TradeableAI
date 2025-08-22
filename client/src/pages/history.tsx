import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Trash2,
  Search,
  ChevronRight,
  BarChart3,
  Newspaper,
  GraduationCap,
  HelpCircle,
} from "lucide-react";
import GlassCard from "@/components/ui/glass-card";
import ProtectedRoute from "@/components/auth/protected-route";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase, chat, ChatMessage, Conversation } from "@/lib/supabase";

const categoryIcons = {
  "Market Analysis": BarChart3,
  "News & Sentiment": Newspaper,
  Educational: GraduationCap,
  "Trading Questions": HelpCircle,
};

const categoryColors = {
  "Market Analysis": "bg-emerald/20 text-emerald",
  "News & Sentiment": "bg-neon/20 text-neon",
  Educational: "bg-amber/20 text-amber",
  "Trading Questions": "bg-electric/20 text-electric",
};

interface ChatHistoryWithMessages extends Conversation {
  messages: ChatMessage[];
}

export default function History() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Topics");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["chat-history"],
    queryFn: async () => {
      const [conversations, messagesResponse] = await Promise.all([
        chat.getConversations(),
        supabase.from("messages").select("*"),
      ]);

      if (messagesResponse.error) throw messagesResponse.error;

      const messages = messagesResponse.data;
      const conversationsWithMessages = conversations.map((conv) => ({
        ...conv,
        messages: messages.filter((msg) => msg.conversation_id === conv.id),
      }));

      return { data: conversationsWithMessages };
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .neq("id", "");

      if (messagesError) throw messagesError;

      const { error: conversationsError } = await supabase
        .from("conversations")
        .delete()
        .neq("id", "");

      if (conversationsError) throw conversationsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-history"] });
      toast({
        title: "Success",
        description: "Chat history cleared successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear chat history",
        variant: "destructive",
      });
    },
  });

  const filteredHistory = (data?.data || []).filter(
    (chat: ChatHistoryWithMessages) => {
      const matchesSearch = chat.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "All Topics" || chat.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }
  );

  if (isLoading) {
    return (
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i} className="p-6">
                <div className="h-6 bg-white/10 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-white/10 rounded w-3/4"></div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <GlassCard className="p-6 text-center">
            <div className="text-red-400 mb-2">Failed to load chat history</div>
            <p className="text-cool-gray">Please try again later</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-grotesk font-bold text-3xl mb-2">
                Chat History
              </h1>
              <p className="text-cool-gray">
                Your previous conversations with the AI assistant
              </p>
            </div>
            <button
              onClick={() => clearHistoryMutation.mutate()}
              disabled={clearHistoryMutation.isPending}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              <Trash2 className="mr-2 inline" size={16} />
              Clear History
            </button>
          </div>

          {/* Search and Filter */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-electric/30 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-electric transition-colors"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white/5 border border-electric/30 rounded-xl px-4 py-3 focus:outline-none focus:border-electric text-off-white"
              >
                <option value="All Topics">All Topics</option>
                <option value="Market Analysis">Market Analysis</option>
                <option value="News & Sentiment">News & Sentiment</option>
                <option value="Trading Questions">Trading Questions</option>
                <option value="Educational">Educational</option>
              </select>
            </div>
          </div>

          {/* Conversation History */}
          {filteredHistory.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <p className="text-cool-gray">
                No conversations found. Start chatting to build your history!
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((chat: any) => {
                const IconComponent =
                  categoryIcons[chat.category as keyof typeof categoryIcons] ||
                  HelpCircle;
                const categoryColor =
                  categoryColors[
                    chat.category as keyof typeof categoryColors
                  ] || "bg-electric/20 text-electric";
                const messageCount = Array.isArray(chat.messages)
                  ? chat.messages.length
                  : 0;
                const timeAgo = new Date(chat.created_at).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                );

                return (
                  <GlassCard key={chat.id} className="p-6 hover:bg-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${categoryColor}`}
                        >
                          <IconComponent size={16} />
                        </div>
                        <div>
                          <h3 className="font-medium">{chat.title}</h3>
                          <p className="text-cool-gray text-sm">{timeAgo}</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {chat.messages.length} messages
                      </Badge>
                    </div>
                    <p className="text-cool-gray mb-4 line-clamp-2">
                      {chat.messages[chat.messages.length - 1]?.content}
                    </p>
                    <div className="flex items-center text-cool-gray/70 text-sm">
                      <Clock className="h-4 w-4 mr-2" />
                      {formatDistanceToNow(new Date(chat.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
