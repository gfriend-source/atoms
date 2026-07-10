'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Plus, Volume2, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useChatStore, type ChatMessage } from '@/lib/store/chat-store'
import { useFileStore } from '@/lib/store/file-store'
import { parseAIResponse, parseStepsFromPartial } from '@/lib/ai/parser'
import { getAgent } from '@/lib/ai/agents'
import { cn } from '@/lib/utils'

function StepsCollapsible({ steps }: { steps: { title: string; completed: boolean }[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-2 mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        <Check className="w-3.5 h-3.5 text-green-500" />
        <span>已处理 {steps.length} 步</span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>
      {expanded && (
        <div className="mt-2 ml-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <ul className="space-y-2">
            {steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{step.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SuggestionButtons({
  suggestions,
  onSelect,
}: {
  suggestions: string[]
  onSelect: (text: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          size="sm"
          className="text-xs rounded-full"
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  )
}

function MessageBubble({
  message,
  onSuggestionSelect,
}: {
  message: ChatMessage
  onSuggestionSelect: (text: string) => void
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[85%] bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2.5">
          <p className="text-sm text-gray-800">{message.content}</p>
        </div>
      </div>
    )
  }

  // For assistant messages, display parsed text (without raw tags)
  const displayContent = message.isStreaming
    ? message.content.replace(/<file_operation>[\s\S]*?<\/file_operation>/g, '')
        .replace(/<step>.*?<\/step>/g, '')
        .replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    : message.content

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[95%]">
        {/* Agent identity inline */}
        {message.agent && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">A</span>
            </div>
            <span className="text-sm font-medium text-gray-800">{message.agent}</span>
            <span className="text-xs text-gray-500">{message.agentRole}</span>
          </div>
        )}

        {/* Steps collapsible */}
        {message.steps && message.steps.length > 0 && (
          <StepsCollapsible steps={message.steps} />
        )}

        {/* Markdown content */}
        <div className="prose prose-sm prose-gray max-w-none text-sm leading-relaxed [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-xs [&_p]:my-1.5">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayContent}
          </ReactMarkdown>
        </div>

        {/* Streaming indicator */}
        {message.isStreaming && (
          <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5" />
        )}

        {/* Suggestion buttons */}
        {message.suggestions && message.suggestions.length > 0 && !message.isStreaming && (
          <SuggestionButtons
            suggestions={message.suggestions}
            onSelect={onSuggestionSelect}
          />
        )}
      </div>
    </div>
  )
}

export default function ChatPanel({ initialPrompt }: { initialPrompt?: string }) {
  const {
    messages,
    addMessage,
    updateMessage,
    appendToMessage,
    isLoading,
    setLoading,
    currentAgentId,
    initMockData,
  } = useChatStore()
  const { updateFileContent, createFile: createFileInStore } = useFileStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const initialPromptSentRef = useRef(false)

  useEffect(() => {
    initMockData()
  }, [initMockData])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const applyFileOperations = useCallback(
    (fileOperations: { action: string; path: string; content?: string }[]) => {
      for (const op of fileOperations) {
        if (op.action === 'create' || op.action === 'update') {
          // Ensure parent directories exist and create/update the file
          const parts = op.path.split('/')
          const fileName = parts[parts.length - 1]
          const parentPath = parts.slice(0, -1).join('/')

          if (op.action === 'create') {
            // Try to create the file in the file store
            createFileInStore(parentPath || '.atoms/app/frontend', fileName, 'file')
          }
          // Update the file content
          if (op.content !== undefined) {
            updateFileContent(op.path, op.content)
          }
        }
      }
    },
    [updateFileContent, createFileInStore]
  )

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      const agent = getAgent(currentAgentId)

      // 1. Add user message
      const userMsgId = Date.now().toString()
      addMessage({
        id: userMsgId,
        role: 'user',
        content: content.trim(),
        createdAt: new Date(),
      })

      // 2. Add empty AI message placeholder
      const aiMsgId = (Date.now() + 1).toString()
      addMessage({
        id: aiMsgId,
        role: 'assistant',
        content: '',
        agent: agent.name,
        agentRole: agent.role,
        isStreaming: true,
        createdAt: new Date(),
      })

      setLoading(true)

      // 3. Prepare messages for API
      const allMessages = useChatStore.getState().messages
      const apiMessages = allMessages
        .filter((m) => m.id !== aiMsgId)
        .slice(-20) // Keep last 20 messages for context
        .map((m) => ({ role: m.role, content: m.content }))

      // 4. Call /api/chat with streaming
      try {
        abortControllerRef.current = new AbortController()

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            agentId: currentAgentId,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null)
          const errorMsg = errorBody?.error || `API error: ${response.status}`
          throw new Error(errorMsg)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let fullContent = ''
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process SSE lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            const data = trimmed.slice(6) // Remove 'data: ' prefix
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                fullContent += parsed.text
                appendToMessage(aiMsgId, parsed.text)

                // Parse steps incrementally for live updates
                const steps = parseStepsFromPartial(fullContent)
                if (steps.length > 0) {
                  updateMessage(aiMsgId, {
                    steps: steps.map((s) => ({ title: s, completed: true })),
                  })
                }
              }
              if (parsed.error) {
                console.error('Stream error:', parsed.error)
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }

        // 5. Parse the final complete response
        const parsed = parseAIResponse(fullContent)

        // 6. Update message with parsed data
        updateMessage(aiMsgId, {
          content: parsed.text,
          steps: parsed.steps.map((s) => ({ title: s, completed: true })),
          suggestions: parsed.suggestions,
          fileOperations: parsed.fileOperations,
          isStreaming: false,
        })

        // 7. Apply file operations to file store
        if (parsed.fileOperations.length > 0) {
          applyFileOperations(parsed.fileOperations)
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          updateMessage(aiMsgId, { isStreaming: false })
        } else {
          const errMsg = (error as Error).message || '未知错误'
          console.error('Chat error:', errMsg)
          updateMessage(aiMsgId, {
            content: `请求出错: ${errMsg}\n\n请检查 API 配置或稍后重试。`,
            isStreaming: false,
          })
        }
      } finally {
        setLoading(false)
        abortControllerRef.current = null
      }
    },
    [
      isLoading,
      currentAgentId,
      addMessage,
      setLoading,
      appendToMessage,
      updateMessage,
      applyFileOperations,
    ]
  )

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    setInput('')
    sendMessage(trimmed)
  }

  // Auto-send initial prompt on first mount
  useEffect(() => {
    if (initialPrompt && !initialPromptSentRef.current) {
      initialPromptSentRef.current = true
      // Small delay to ensure store is initialized
      const timer = setTimeout(() => {
        sendMessage(initialPrompt)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [initialPrompt, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestionSelect = (text: string) => {
    setInput(text)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Agent Identity Header */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shadow-sm">
            <span className="text-sm text-white font-bold">A</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Alex</div>
            <div className="text-xs text-gray-500">工程师</div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onSuggestionSelect={handleSuggestionSelect}
            />
          ))}
          {isLoading && !messages.some((m) => m.isStreaming) && (
            <div className="flex justify-start mb-4">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="px-3 py-3 border-t border-gray-100 shrink-0">
        <div className="flex items-end gap-2 bg-gray-50 rounded-xl p-2 border border-gray-200 focus-within:border-gray-300 focus-within:ring-1 focus-within:ring-gray-200 transition-all">
          {/* Plus button */}
          <button
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors shrink-0 mb-0.5"
            title="添加附件"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>

          {/* Textarea */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="让智能体团队实现你的想法"
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none outline-none min-h-[24px] max-h-[120px] py-1 leading-relaxed"
            style={{ height: 'auto', overflow: 'hidden' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 120) + 'px'
            }}
          />

          {/* Audio button */}
          <button
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors shrink-0 mb-0.5"
            title="语音输入"
          >
            <Volume2 className="w-4 h-4 text-gray-500" />
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all mb-0.5',
              input.trim()
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm hover:shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
            title="发送"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
