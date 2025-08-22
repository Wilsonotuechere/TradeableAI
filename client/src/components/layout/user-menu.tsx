import { useState } from 'react'
import { User, LogOut, Settings, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/auth-context'
import { useLocation } from 'wouter'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const [, setLocation] = useLocation()

  if (!user) {
    return (
      <Button 
        onClick={() => setLocation('/auth')}
        className="bg-gradient-to-r from-electric to-neon hover:from-electric/80 hover:to-neon/80 text-white"
      >
        Sign In
      </Button>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    setLocation('/auth')
  }

  const userInitials = user.email?.charAt(0).toUpperCase() || 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-electric/20 text-electric">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-card border-electric/20" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-white">Account</p>
            <p className="text-xs leading-none text-cool-gray">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-electric/20" />
        <DropdownMenuItem 
          onClick={() => setLocation('/history')}
          className="text-cool-gray hover:text-white hover:bg-electric/10"
        >
          <History className="mr-2 h-4 w-4" />
          <span>Chat History</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-cool-gray hover:text-white hover:bg-electric/10">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-electric/20" />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}