export const config = {
  environment: process.env.NODE_ENV || "development",
  frontend: {
    apiBaseUrl:
      process.env.NODE_ENV === "production"
        ? "https://your-backend-url.onrender.com/api"
        : "http://localhost:5000/api",
  },
  backend: {
    port: process.env.PORT || 5000,
    huggingface: {
      apiKey: process.env.HUGGINGFACE_API_KEY,
      model: "ProsusAI/finbert",
    },
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? ["https://your-frontend-url.vercel.app"]
          : ["http://localhost:3000"],
    },
  },
};
