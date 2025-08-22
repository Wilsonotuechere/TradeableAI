import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { BarChart3, Shield, Zap, TrendingUp } from 'lucide-react'
import AuthForm from '@/components/auth/auth-form'
import { useAuth } from '@/contexts/auth-context'
import GlassCard from '@/components/ui/glass-card'

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const { user, loading } = useAuth()
  const [, setLocation] = useLocation()

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      setLocation('/chat')
    }
  }, [user, loading, setLocation])

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-electric border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-navy relative overflow-hidden">
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

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12">
          <div className="max-w-lg">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-electric to-neon flex items-center justify-center">
                <BarChart3 className="text-white" size={24} />
              </div>
              <span className="font-grotesk font-bold text-3xl text-off-white">Tradeable</span>
            </div>

            <h1 className="font-grotesk font-bold text-4xl md:text-5xl mb-6 leading-tight text-white">
              Your{" "}
              <span className="bg-gradient-to-r from-electric to-neon bg-clip-text text-transparent">
                AI-Powered
              </span>
              <br />
              Crypto Assistant
            </h1>
            
            <p className="text-xl text-cool-gray mb-8 leading-relaxed">
              Get beginner-friendly crypto market insights, sentiment analysis, and trading education—no complex jargon, just clear guidance.
            </p>

            {/* Features */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-emerald/20 rounded-lg flex items-center justify-center">
                  <Zap className="text-emerald" size={16} />
                </div>
                <span className="text-cool-gray">Real-time market analysis powered by AI</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-neon/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-neon" size={16} />
                </div>
                <span className="text-cool-gray">Sentiment analysis from news and social media</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-amber/20 rounded-lg flex items-center justify-center">
                  <Shield className="text-amber" size={16} />
                </div>
                <span className="text-cool-gray">Educational focus for beginner traders</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-electric to-neon flex items-center justify-center">
                <BarChart3 className="text-white" size={20} />
              </div>
              <span className="font-grotesk font-bold text-2xl text-off-white">Tradeable</span>
            </div>

            <AuthForm 
              mode={mode} 
              onToggleMode={() => setMode(mode === 'signin' ? 'signup' : 'signin')} 
            />

            {/* Disclaimer */}
            <div className="mt-6">
              <GlassCard className="p-4">
                <div className="flex items-start space-x-2">
                  <Shield className="text-amber mt-0.5 flex-shrink-0" size={16} />
                  <p className="text-xs text-cool-gray">
                    By creating an account, you agree that this platform provides educational information only, not financial advice. Always do your own research before making investment decisions.
                  </p>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}