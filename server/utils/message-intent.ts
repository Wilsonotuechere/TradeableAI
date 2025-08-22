type MessageIntent = "GENERAL" | "NEWS" | "MARKET" | "EDUCATION" | "INVESTMENT";

export function determineMessageIntent(message: string): MessageIntent {
  const lowerMessage = message.toLowerCase();

  // Check for market analysis related keywords
  if (
    lowerMessage.includes("analysis") ||
    lowerMessage.includes("trend") ||
    lowerMessage.includes("chart") ||
    lowerMessage.includes("pattern") ||
    lowerMessage.includes("price") ||
    lowerMessage.includes("value") ||
    lowerMessage.includes("market")
  ) {
    return "MARKET";
  }

  // Check for news related keywords
  if (
    lowerMessage.includes("news") ||
    lowerMessage.includes("announcement") ||
    lowerMessage.includes("update")
  ) {
    return "NEWS";
  }

  // Check for investment related keywords
  if (
    lowerMessage.includes("invest") ||
    lowerMessage.includes("portfolio") ||
    lowerMessage.includes("allocation") ||
    lowerMessage.includes("strategy") ||
    lowerMessage.includes("risk") ||
    lowerMessage.includes("recommend") ||
    lowerMessage.includes("profit")
  ) {
    return "INVESTMENT";
  }

  // Check for education related keywords
  if (
    lowerMessage.includes("learn") ||
    lowerMessage.includes("explain") ||
    lowerMessage.includes("what is") ||
    lowerMessage.includes("how to") ||
    lowerMessage.includes("guide")
  ) {
    return "EDUCATION";
  }

  // Default to general intent
  return "GENERAL";
}
