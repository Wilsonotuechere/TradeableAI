import { ArrowRight, Brain, Newspaper, Lightbulb, MessageCircle, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import GlassCard from "@/components/ui/glass-card";
import GradientButton from "@/components/ui/gradient-button";

export default function Home() {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-electric/10 via-navy to-neon/10 opacity-50">
          <div 
            className="w-full h-full opacity-5"
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1642790106117-e829e14a795f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="font-grotesk font-bold text-5xl md:text-7xl mb-6 leading-tight">
            Your{" "}
            <span className="bg-gradient-to-r from-electric to-neon bg-clip-text text-transparent">
              AI-Powered
            </span>
            <br />
            Crypto Assistant
          </h1>
          
          <p className="text-xl md:text-2xl text-cool-gray mb-8 max-w-2xl mx-auto leading-relaxed">
            Get beginner-friendly crypto market insights, sentiment analysis, and trading education—no complex jargon, just clear guidance.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/chat">
              <GradientButton className="group px-8 py-4 text-lg">
                <MessageCircle className="mr-2" size={20} />
                Start Chatting
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </GradientButton>
            </Link>
            
            <Link href="/market">
              <button className="px-8 py-4 bg-white/10 backdrop-blur border border-electric/30 rounded-xl font-medium text-lg hover:bg-white/20 transition-all duration-300">
                <BarChart3 className="mr-2 inline" size={20} />
                View Markets
              </button>
            </Link>
          </div>
          
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <GlassCard hover className="p-6">
              <div className="w-12 h-12 bg-emerald/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Brain className="text-emerald" size={24} />
              </div>
              <h3 className="font-grotesk font-semibold text-xl mb-3">AI Market Analysis</h3>
              <p className="text-cool-gray">Get complex market data explained in simple, beginner-friendly terms.</p>
            </GlassCard>
            
            <GlassCard hover className="p-6">
              <div className="w-12 h-12 bg-neon/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Newspaper className="text-neon" size={24} />
              </div>
              <h3 className="font-grotesk font-semibold text-xl mb-3">News Sentiment</h3>
              <p className="text-cool-gray">Track market sentiment from news and social media with real-time analysis.</p>
            </GlassCard>
            
            <GlassCard hover className="p-6">
              <div className="w-12 h-12 bg-amber/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Lightbulb className="text-amber" size={24} />
              </div>
              <h3 className="font-grotesk font-semibold text-xl mb-3">Educational Focus</h3>
              <p className="text-cool-gray">Learn crypto trading concepts without overwhelming complexity.</p>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
