'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronDown, Send, AudioLines, Paintbrush, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const toolLogos = ['🔗', '📊', '🗂️', '🔍', '📱']

export default function CreativeInput() {
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    if (!inputValue.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inputValue.trim().slice(0, 20) || '新项目',
          description: inputValue.trim(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || '创建项目失败')
      }

      const { project } = await res.json()
      router.push(`/workspace/${project.id}?prompt=${encodeURIComponent(inputValue.trim())}`)
    } catch (error) {
      console.error('创建项目失败:', error)
      // Fallback: navigate to workspace/new if API fails
      router.push('/workspace/new')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      {/* Input Area */}
      <div className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden focus-within:border-indigo-300 focus-within:shadow-md transition-all">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="竞赛模式大大改善首次生成"
          className="w-full px-4 pt-4 pb-2 text-sm text-gray-700 placeholder:text-gray-400 resize-none outline-none min-h-[80px]"
          rows={3}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-3">
          {/* Left */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-gray-500 hover:text-gray-700 gap-1">
              <Paintbrush className="h-3.5 w-3.5" />
              主题
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 text-gray-500 hover:text-gray-700 gap-1">
              构建
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
              <AudioLines className="h-4 w-4" />
            </Button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !inputValue.trim()}
              className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white hover:from-indigo-600 hover:to-purple-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tool Integration */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <span className="text-xs text-gray-400">将你的工具连接到 Atoms</span>
        <div className="flex items-center gap-2">
          {toolLogos.map((logo, index) => (
            <span
              key={index}
              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs cursor-pointer hover:bg-gray-200 transition-colors"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
