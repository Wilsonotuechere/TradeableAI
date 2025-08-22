import React from "react";
import { formatDistanceToNow } from "date-fns";
import GlassCard from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  url: string;
  sourceName: string;
  aiSentiment?: {
    label: "positive" | "negative" | "neutral";
    score: number;
  };
}

export default function NewsSection({ articles }: { articles: NewsArticle[] }) {
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-emerald/20 text-emerald border-emerald/30";
      case "negative":
        return "bg-red-400/20 text-red-400 border-red-400/30";
      case "neutral":
        return "bg-amber/20 text-amber border-amber/30";
      default:
        return "bg-cool-gray/20 text-cool-gray border-cool-gray/30";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <a
          key={article.id}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <GlassCard className="h-full p-6 transition-transform duration-200 hover:scale-[1.02]">
            {/* Header with Sentiment */}
            <div className="flex justify-between items-start mb-4">
              {article.aiSentiment && (
                <Badge
                  className={`${getSentimentColor(article.aiSentiment.label)}`}
                >
                  {article.aiSentiment.label.toUpperCase()}
                  {article.aiSentiment.score &&
                    ` ${(article.aiSentiment.score * 100).toFixed(0)}%`}
                </Badge>
              )}
            </div>

            {/* Content */}
            <h3 className="font-grotesk font-semibold text-lg text-white group-hover:text-electric transition-colors mb-3">
              {article.title}
            </h3>
            <p className="text-cool-gray line-clamp-3 mb-4">
              {article.content}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto">
              <Badge
                variant="outline"
                className="text-cool-gray border-cool-gray/30"
              >
                {article.sourceName}
              </Badge>
              <div className="flex items-center text-cool-gray/70 text-sm">
                <Clock className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(article.publishedAt), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </GlassCard>
        </a>
      ))}
    </div>
  );
}
