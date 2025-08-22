# Tradeable - AI-Powered Crypto Trading Assistant

## Overview

Tradeable is a beginner-friendly cryptocurrency trading assistant built as a full-stack monorepo. The application provides AI-powered market insights, sentiment analysis, and educational guidance without offering financial advice. It features real-time market data visualization, news sentiment analysis, and an interactive AI chat interface designed to help users understand cryptocurrency markets in simple, accessible language.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI System**: Shadcn/UI components with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom color palette (navy, electric blue, neon purple) optimized for crypto trading aesthetics
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (TanStack Query) for server state management and caching
- **Charts**: Chart.js for data visualization and price charts
- **Typography**: Space Grotesk for headings, Inter for body text, JetBrains Mono for data/numbers

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Data Storage**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Storage Strategy**: Hybrid approach with in-memory storage (MemStorage) for development and PostgreSQL for production
- **API Design**: RESTful endpoints with JSON responses and comprehensive error handling

### Database Design
- **Users Table**: Basic user management (currently unused in MVP)
- **Chat History**: Stores conversation threads with JSON message arrays
- **Market Data**: Real-time cryptocurrency prices and statistics
- **News Articles**: News content with sentiment analysis scores
- **Schema Validation**: Zod schemas for runtime type checking and validation

### Key Features Implementation
1. **AI Chat Interface**: Conversational UI for asking crypto questions and getting beginner-friendly explanations
2. **Market Overview**: Real-time price tracking, charts, and market statistics dashboard
3. **News Sentiment**: Aggregated news articles with AI-powered sentiment analysis
4. **Chat History**: Local storage persistence for conversation continuity
5. **Responsive Design**: Mobile-first approach with glassmorphism UI effects

### Development Workflow
- **Monorepo Structure**: Single repository with client and server directories
- **Hot Reload**: Vite dev server with HMR for frontend, tsx for backend development
- **Build Process**: Vite for frontend bundling, esbuild for server compilation
- **Type Safety**: Shared TypeScript schemas between frontend and backend

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity optimized for serverless environments
- **drizzle-orm** & **drizzle-kit**: Type-safe ORM with schema migrations
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight routing library for React

### UI and Styling
- **@radix-ui/react-***: Comprehensive set of accessible UI primitives (dialogs, dropdowns, forms, etc.)
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **chart.js**: Data visualization library for market charts

### Development Tools
- **vite**: Fast build tool with HMR support
- **typescript**: Static type checking
- **@replit/vite-plugin-***: Replit-specific development enhancements
- **connect-pg-simple**: PostgreSQL session store (prepared for future authentication)

### Validation and Forms
- **zod**: Runtime schema validation
- **@hookform/resolvers**: Form validation integration
- **react-hook-form**: Form state management

### External APIs (Planned Integration)
- **Binance API**: Real-time cryptocurrency market data
- **News API**: Cryptocurrency news aggregation
- **Twitter API**: Social sentiment analysis
- **OpenAI/AI Service**: Natural language processing for chat responses

The application is designed to be deployment-ready with environment-based configuration for database connections and API keys, supporting both development and production environments seamlessly.