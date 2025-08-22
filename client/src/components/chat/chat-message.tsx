import { Bot, User, Lightbulb, BarChart3, Newspaper } from "lucide-react";
import type { ChatMessage } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface ChatMessageProps {
  message: ChatMessage;
}

export default function ChatMessageComponent({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const getIntentIcon = () => {
    switch (message.intent) {
      case "MARKET":
        return <BarChart3 className="h-4 w-4 text-electric" />;
      case "NEWS":
        return <Newspaper className="h-4 w-4 text-neon" />;
      case "EDUCATION":
        return <Lightbulb className="h-4 w-4 text-amber" />;
      default:
        return null;
    }
  };

  const getIntentColor = () => {
    switch (message.intent) {
      case "MARKET":
        return "bg-electric/10 text-electric border-electric/20";
      case "NEWS":
        return "bg-neon/10 text-neon border-neon/20";
      case "EDUCATION":
        return "bg-amber/10 text-amber border-amber/20";
      default:
        return "bg-cool-gray/10 text-cool-gray border-cool-gray/20";
    }
  };

  return (
    <div
      className={`flex items-start space-x-3 ${
        isUser ? "justify-end" : ""
      } group`}
    >
      {!isUser && (
        <div className="w-8 h-8 bg-gradient-to-r from-electric to-neon rounded-full flex items-center justify-center flex-shrink-0 pulse-glow">
          <Bot className="text-white" size={16} />
        </div>
      )}

      <div className="space-y-2 max-w-2xl">
        {message.intent && !isUser && (
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-medium transition-opacity",
              getIntentColor(),
              "opacity-0 group-hover:opacity-100"
            )}
          >
            <span className="mr-1">{getIntentIcon()}</span>
            {message.intent.toLowerCase()}
          </Badge>
        )}

        <div
          className={cn(
            "rounded-2xl p-4",
            isUser
              ? "bg-electric rounded-tr-sm text-white"
              : "bg-white/10 backdrop-blur rounded-tl-sm text-cool-gray"
          )}
        >
          <p className="whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
          {!isUser && message.timestamp && (
            <time className="block mt-2 text-xs opacity-50">
              {new Date(message.timestamp).toLocaleTimeString()}
            </time>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 bg-cool-gray/20 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="text-cool-gray" size={16} />
        </div>
      )}
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
