# Tradeable - AI-Powered Crypto Trading Assistant

A beginner-friendly cryptocurrency trading assistant built with React, TypeScript, and Express. Tradeable provides AI-powered market insights, sentiment analysis, and educational guidance without offering financial advice.

## Features

- **AI Chat Interface**: Conversational assistant for crypto questions and market analysis
- **Market Overview**: Real-time price tracking, charts, and market statistics
- **News Sentiment**: Aggregated news articles with AI-powered sentiment analysis
- **Chat History**: Persistent conversation history with search and filtering
- **Responsive Design**: Modern glassmorphism UI with mobile-first approach

## Tech Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Wouter for routing
- TanStack Query for state management
- Chart.js for data visualization
- Shadcn/UI components

### Backend
- Node.js with Express
- TypeScript
- Drizzle ORM (with in-memory storage for development)
- PostgreSQL ready for production

### Design System
- **Colors**: Navy (#0A0F2C), Electric Blue (#1F8EF1), Neon Purple (#9B5DE5)
- **Typography**: Space Grotesk (headings), Inter (body), JetBrains Mono (data)
- **Theme**: Dark mode with glassmorphism effects

## Getting Started

### Prerequisites
- Node.js 20 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

4. Configure your API keys in `.env` (see Environment Variables section)

5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Environment Variables

Create a `.env` file based on `.env.example` with the following variables:

### Required for Production
- `BINANCE_API_KEY` - Binance API key for real-time market data
- `NEWS_API_KEY` - News API key for cryptocurrency news
- `TWITTER_BEARER_TOKEN` - Twitter API for social sentiment
- `HUGGINGFACE_API_KEY` - Hugging Face for sentiment analysis
- `GEMINI_API_KEY` - Google Gemini for AI responses

### Optional
- `DATABASE_URL` - PostgreSQL connection string (uses in-memory storage if not provided)
- `SESSION_SECRET` - Secret for session management
- `PORT` - Server port (default: 5000)

### Development Mode
The application works with mock data when API keys are not provided, making it easy to develop and test without external dependencies.

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── lib/            # Utility functions and API client
│   │   └── hooks/          # Custom React hooks
├── server/                 # Backend Express application
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API route handlers
│   └── storage.ts         # Data storage interface
├── shared/                # Shared TypeScript schemas
└── components.json        # Shadcn/UI configuration
```

## API Endpoints

- `GET /api/market` - Fetch cryptocurrency market data and statistics
- `GET /api/news` - Get news articles with sentiment analysis
- `POST /api/chat` - Send message to AI assistant
- `GET /api/chat/history` - Retrieve chat conversation history
- `POST /api/chat/history` - Save chat conversation
- `DELETE /api/chat/history` - Clear all chat history

## Development

### Mock Data
The application includes comprehensive mock data for development:
- Sample cryptocurrency prices and market statistics
- News articles with sentiment scores
- Chat conversation examples

### Hot Reload
Both frontend and backend support hot reload during development for rapid iteration.

### Type Safety
Shared TypeScript schemas ensure type consistency between frontend and backend.

## Deployment

The application is designed for easy deployment on platforms like:
- **Frontend**: Vercel, Netlify, or any static hosting
- **Backend**: Railway, Render, or any Node.js hosting platform

### Production Considerations
1. Set `NODE_ENV=production`
2. Configure PostgreSQL database
3. Add all required API keys
4. Set up proper CORS origins
5. Use secure session secrets

## Contributing

1. Follow the existing code style and architecture
2. Update `replit.md` when making architectural changes
3. Test with both mock and real data
4. Ensure responsive design works on all screen sizes

## License

MIT License - see LICENSE file for details.

---

**Disclaimer**: This application provides educational information about cryptocurrency markets. It does not provide financial advice. Always do your own research and consult with financial professionals before making investment decisions.