'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

const agents = [
  { emoji: '🤖', bg: 'bg-blue-100' },
  { emoji: '🎨', bg: 'bg-purple-100' },
  { emoji: '⚡', bg: 'bg-yellow-100' },
  { emoji: '🧠', bg: 'bg-pink-100' },
  { emoji: '🔮', bg: 'bg-indigo-100' },
  { emoji: '🚀', bg: 'bg-green-100' },
  { emoji: '💡', bg: 'bg-orange-100' },
  { emoji: '🎯', bg: 'bg-red-100' },
]

export default function AgentShowcase() {
  const [showNotice, setShowNotice] = useState(true)

  return (
    <div className="flex flex-col items-center py-8">
      {/* Notice Tag */}
      {showNotice && (
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600 mb-8">
          <span className="font-medium">Notice</span>
          <span className="text-gray-400">•</span>
          <span>Build with Claude Sonnet 5</span>
          <button
            onClick={() => setShowNotice(false)}
            className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Agent Avatars */}
      <div className="flex items-center gap-3 mb-8">
        {agents.map((agent, index) => (
          <div
            key={index}
            className={`w-10 h-10 rounded-full ${agent.bg} flex items-center justify-center text-lg cursor-pointer hover:scale-110 transition-transform`}
          >
            {agent.emoji}
          </div>
        ))}
      </div>

      {/* Main Title */}
      <h1 className="text-3xl font-bold text-gray-900 text-center">
        你今天想创造什么？
      </h1>
    </div>
  )
}
