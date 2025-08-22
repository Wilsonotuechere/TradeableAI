import { ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLocation } from 'wouter'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const [, setLocation] = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto bg-gradient-to-r from-electric to-neon rounded-full flex items-center justify-center pulse-glow mb-4">
            <Loader2 className="text-white animate-spin" size={24} />
          </div>
          <p className="text-cool-gray">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    // Redirect to auth page
    setLocation('/auth')
    return null
  }

  return <>{children}</>
}