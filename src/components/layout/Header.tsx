'use client'

import { Bell, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function Header() {
  return (
    <header className="h-14 border-b border-gray-100 px-6 flex items-center justify-between bg-white">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Dashboard</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
          <Settings className="h-4 w-4" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs">
            U
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
