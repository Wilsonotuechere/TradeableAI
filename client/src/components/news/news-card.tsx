import { ExternalLink } from "lucide-react";
import GlassCard from "@/components/ui/glass-card";
import type { NewsArticle } from "@shared/schema";

interface NewsCardProps {
  article: NewsArticle;
}

const sentimentColors = {
  positive: "bg-emerald/20 text-emerald",
  neutral: "bg-amber/20 text-amber",
  negative: "bg-red-500/20 text-red-400"
};

export default function NewsCard({ article }: NewsCardProps) {
  const timeAgo = new Date(article.publishedAt).toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric'
  });

  return (
    <GlassCard hover className="p-6 cursor-pointer">
      {article.imageUrl && (
        <img 
          src={article.imageUrl} 
          alt={article.title}
          className="w-full h-48 object-cover rounded-xl mb-4"
        />
      )}
      
      <div className="flex items-center space-x-2 mb-3">
        <span className={`px-3 py-1 rounded-full text-sm capitalize ${sentimentColors[article.sentiment as keyof typeof sentimentColors]}`}>
          {article.sentiment}
        </span>
        <span className="text-cool-gray text-sm">{timeAgo}</span>
      </div>
      
      <h3 className="font-grotesk font-semibold text-lg mb-3 text-off-white">
        {article.title}
      </h3>
      
      <p className="text-cool-gray mb-4 line-clamp-3">
        {article.content}
      </p>
      
      <div className="flex items-center justify-between">
        <span className="text-cool-gray text-sm">{article.source}</span>
        <button className="text-electric hover:text-neon transition-colors">
          <ExternalLink size={16} />
        </button>
      </div>
    </GlassCard>
  );
}
