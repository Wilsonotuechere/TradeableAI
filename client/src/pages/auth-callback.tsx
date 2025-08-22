import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const [, setLocation] = useLocation()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setLocation('/auth?error=callback_failed')
          return
        }

        if (data.session) {
          // Successfully authenticated
          setLocation('/chat')
        } else {
          // No session found
          setLocation('/auth')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setLocation('/auth?error=callback_failed')
      }
    }

    handleAuthCallback()
  }, [setLocation])

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto bg-gradient-to-r from-electric to-neon rounded-full flex items-center justify-center pulse-glow mb-4">
          <Loader2 className="text-white animate-spin" size={24} />
        </div>
        <h2 className="text-xl font-grotesk font-semibold text-white mb-2">
          Completing Sign In
        </h2>
        <p className="text-cool-gray">
          Please wait while we verify your account...
        </p>
      </div>
    </div>
  )
}