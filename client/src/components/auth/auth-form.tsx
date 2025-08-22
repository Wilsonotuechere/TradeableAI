import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/auth-context'
import { useLocation } from 'wouter'

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.confirmPassword !== undefined) {
    return data.password === data.confirmPassword
  }
  return true
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type AuthFormData = z.infer<typeof authSchema>

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onToggleMode: () => void
}

export default function AuthForm({ mode, onToggleMode }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { signIn, signUp } = useAuth()
  const [, setLocation] = useLocation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema)
  })

  const onSubmit = async (data: AuthFormData) => {
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'signup') {
        const { error } = await signUp(data.email, data.password)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Account created successfully! Please check your email to verify your account.')
          reset()
        }
      } else {
        const { error } = await signIn(data.email, data.password)
        if (error) {
          setError(error.message)
        } else {
          setLocation('/chat')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto glass-card border-electric/20">
      <CardHeader className="text-center">
        <div className="w-12 h-12 mx-auto bg-gradient-to-r from-electric to-neon rounded-full flex items-center justify-center pulse-glow mb-4">
          <User className="text-white" size={24} />
        </div>
        <CardTitle className="text-2xl font-grotesk font-bold text-white">
          {mode === 'signin' ? 'Welcome Back' : 'Join Tradeable'}
        </CardTitle>
        <CardDescription className="text-cool-gray">
          {mode === 'signin' 
            ? 'Sign in to access your AI trading assistant'
            : 'Create your account to start trading with AI insights'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray" size={18} />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-cool-gray/70 focus:border-electric/50 focus:ring-electric/20"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-red-400 text-sm">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray" size={18} />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-cool-gray/70 focus:border-electric/50 focus:ring-electric/20"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cool-gray hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-sm">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field (only for signup) */}
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cool-gray" size={18} />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-cool-gray/70 focus:border-electric/50 focus:ring-electric/20"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cool-gray hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="bg-emerald/10 border-emerald/20 text-emerald">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full gradient-button py-3 text-white font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'signin' ? 'Signing In...' : 'Creating Account...'}
              </>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </Button>

          {/* Toggle Mode */}
          <div className="text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="text-cool-gray hover:text-electric transition-colors text-sm"
            >
              {mode === 'signin' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}