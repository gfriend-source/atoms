import { streamChatCompletion, hasApiKey, extractErrorInfo } from '@/lib/ai/client'
import { getAgent } from '@/lib/ai/agents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { messages, agentId } = await req.json()
    const agent = getAgent(agentId || 'alex')

    // If no API key, use mock mode
    if (!hasApiKey()) {
      return mockResponse(messages)
    }

    const stream = await streamChatCompletion(
      messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      agent.systemPrompt
    )

    // Return SSE stream
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              )
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`
            )
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    const errorInfo = extractErrorInfo(error)
    console.error('Chat API error:', {
      message: errorInfo.message,
      status: errorInfo.status,
      retryable: errorInfo.retryable,
      raw: error instanceof Error ? error.message : String(error),
    })
    return new Response(
      JSON.stringify({
        error: errorInfo.message,
        status: errorInfo.status,
        retryable: errorInfo.retryable,
      }),
      {
        status: errorInfo.status,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// Mock response when no API key is configured
function mockResponse(messages: { role: string; content: string }[]) {
  const lastMessage = messages[messages.length - 1]?.content || ''
  const mockContent = generateMockResponse(lastMessage)

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      // Simulate token-by-token streaming with natural chunks
      const chunks = splitIntoChunks(mockContent)
      for (const chunk of chunks) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
        )
        // Random delay to simulate natural typing
        await new Promise((resolve) =>
          setTimeout(resolve, 30 + Math.random() * 50)
        )
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// Split content into natural chunks (not character by character for Chinese)
function splitIntoChunks(content: string): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < content.length) {
    // Random chunk size between 1-5 characters
    const size = Math.min(1 + Math.floor(Math.random() * 4), content.length - i)
    chunks.push(content.slice(i, i + size))
    i += size
  }
  return chunks
}

function generateMockResponse(userInput: string): string {
  // Generate contextual mock responses based on input keywords
  const input = userInput.toLowerCase()

  if (input.includes('todo') || input.includes('待办') || input.includes('任务')) {
    return `<step>分析需求</step>
<step>设计组件结构</step>
<step>实现 Todo 应用</step>

好的，我来帮你实现一个 Todo 应用。

<file_operation>
<action>create</action>
<path>src/components/TodoApp.tsx</path>
<content>
import React, { useState } from 'react'

interface Todo {
  id: number
  text: string
  completed: boolean
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [input, setInput] = useState('')

  const addTodo = () => {
    if (!input.trim()) return
    setTodos([...todos, { id: Date.now(), text: input, completed: false }])
    setInput('')
  }

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(t => t.id !== id))
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Todo App</h1>
      <div className="flex gap-2 mb-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="添加新任务..."
          className="flex-1 px-3 py-2 border rounded-lg"
        />
        <button onClick={addTodo} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
          添加
        </button>
      </div>
      <ul className="space-y-2">
        {todos.map(todo => (
          <li key={todo.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span className={todo.completed ? 'line-through text-gray-400' : ''}>
              {todo.text}
            </span>
            <button onClick={() => deleteTodo(todo.id)} className="ml-auto text-red-500">
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
</content>
</file_operation>

Todo 应用已创建完毕！包含添加、完成、删除功能。你可以在预览中查看效果。

<suggestions>
添加本地存储持久化
添加任务分类功能
添加拖拽排序
</suggestions>`
  }

  // Default response for any other input
  return `<step>分析需求</step>
<step>设计组件结构</step>
<step>编写代码</step>

好的，我来帮你实现这个需求。让我先分析一下你的要求，然后逐步实现。

<file_operation>
<action>create</action>
<path>src/components/App.tsx</path>
<content>
import React from 'react'

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Hello World</h1>
        <p className="text-gray-600 leading-relaxed">
          这是根据你的需求生成的应用。你可以继续描述更多细节，我会帮你完善代码。
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-700 mb-2">功能模块 1</h2>
            <p className="text-sm text-gray-500">在这里添加你的功能描述</p>
          </div>
          <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-700 mb-2">功能模块 2</h2>
            <p className="text-sm text-gray-500">在这里添加你的功能描述</p>
          </div>
        </div>
      </div>
    </div>
  )
}
</content>
</file_operation>

<file_operation>
<action>create</action>
<path>src/index.css</path>
<content>
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</content>
</file_operation>

代码已生成完毕！我创建了一个基础的应用骨架，包含响应式布局和现代化的 UI 设计。你可以在预览中查看效果。

如果你需要调整或添加更多功能，请告诉我具体的需求。

<suggestions>
添加更多交互功能
优化样式设计
添加路由导航
</suggestions>`
}
