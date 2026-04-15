'use client'

import { useSession, signOut } from 'next-auth/react'
import { Bell, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWebSocket } from '@/hooks/useWebSocket'

export function TopNav() {
  const { data: session } = useSession()
  const { isConnected } = useWebSocket()

  return (
    <header className="h-16 bg-[#121833] border-b border-[#1E2438] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
        />
        <span className="text-xs text-gray-400">
          {isConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
          <Bell className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 text-sm text-gray-300">
          <User className="h-4 w-4 text-gray-400" />
          <span>{session?.user?.email ?? 'Guest'}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-red-400"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
