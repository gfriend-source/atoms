import { streamChatCompletion, chatCompletion, hasApiKey, extractErrorInfo } from '@/lib/ai/client'
import { getAgent } from '@/lib/ai/agents'
import { PLANNING_SYSTEM_PROMPT, BUILDER_SYSTEM_PROMPT } from '@/lib/ai/prompts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { messages, agentId, mode } = await req.json()

    // Route based on mode
    if (mode === 'plan') {
      return handlePlanMode(messages)
    }

    if (mode === 'generate-file') {
      return handleGenerateFileMode(messages)
    }

    // Default: streaming chat mode
    return handleChatMode(messages, agentId)
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

// ========== Plan Mode (Non-streaming) ==========

async function handlePlanMode(messages: { role: string; content: string }[]) {
  if (!hasApiKey()) {
    return Response.json({ content: mockPlanResponse(messages) })
  }

  const content = await chatCompletion(messages, PLANNING_SYSTEM_PROMPT)
  return Response.json({ content })
}

// ========== Generate File Mode (Non-streaming) ==========

async function handleGenerateFileMode(messages: { role: string; content: string }[]) {
  if (!hasApiKey()) {
    return Response.json({ content: mockGenerateFileResponse(messages) })
  }

  const content = await chatCompletion(messages, BUILDER_SYSTEM_PROMPT)
  const cleaned = cleanApiResponse(content)
  return Response.json({ content: cleaned })
}

/**
 * Clean API response by removing safety metadata, markdown wrappers, and preamble.
 */
function cleanApiResponse(content: string): string {
  let cleaned = content.trim()

  // Remove leading safety/review markers
  cleaned = cleaned.replace(/^(User Safety:.*?\n|Content Policy:.*?\n|\[SAFETY\].*?\n)/gi, '')

  // Remove markdown code block wrappers
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
  }

  // Remove common preamble prefixes like "Here is the code:"
  cleaned = cleaned.replace(/^(Here is|Here's|以下是|下面是|这是)[\s\S]*?:\s*\n/i, '')

  return cleaned.trim()
}

// ========== Chat Mode (Streaming SSE) ==========

async function handleChatMode(messages: { role: string; content: string }[], agentId?: string) {
  const agent = getAgent(agentId || 'alex')

  if (!hasApiKey()) {
    return mockStreamResponse(messages)
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
}

// ========== Mock Responses ==========

function mockStreamResponse(messages: { role: string; content: string }[]) {
  const lastMessage = messages[messages.length - 1]?.content || ''
  const mockContent = generateMockResponse(lastMessage)

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      const chunks = splitIntoChunks(mockContent)
      for (const chunk of chunks) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
        )
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

function mockPlanResponse(messages: { role: string; content: string }[]): string {
  const userInput = messages[messages.length - 1]?.content || ''
  const input = userInput.toLowerCase()

  // Generate a contextual plan based on input
  if (input.includes('todo') || input.includes('待办') || input.includes('任务')) {
    return JSON.stringify({
      projectType: 'react-vite',
      files: [
        { path: 'package.json', description: '项目依赖配置' },
        { path: 'index.html', description: 'HTML 入口文件' },
        { path: 'vite.config.ts', description: 'Vite 构建配置' },
        { path: 'tsconfig.json', description: 'TypeScript 配置' },
        { path: 'src/main.tsx', description: 'React 应用入口' },
        { path: 'src/App.tsx', description: '主应用组件，包含 Todo 列表逻辑' },
        { path: 'src/components/TodoItem.tsx', description: '单个 Todo 项组件' },
        { path: 'src/components/TodoInput.tsx', description: 'Todo 输入框组件' },
        { path: 'src/styles/index.css', description: '全局样式和 Tailwind 导入' },
      ],
    })
  }

  // Default plan
  return JSON.stringify({
    projectType: 'react-vite',
    files: [
      { path: 'package.json', description: '项目依赖配置' },
      { path: 'index.html', description: 'HTML 入口文件' },
      { path: 'vite.config.ts', description: 'Vite 构建配置' },
      { path: 'tsconfig.json', description: 'TypeScript 配置' },
      { path: 'src/main.tsx', description: 'React 应用入口' },
      { path: 'src/App.tsx', description: '主应用组件' },
      { path: 'src/components/Header.tsx', description: '头部导航组件' },
      { path: 'src/components/Card.tsx', description: '卡片展示组件' },
      { path: 'src/styles/index.css', description: '全局样式' },
    ],
  })
}

function mockGenerateFileResponse(messages: { role: string; content: string }[]): string {
  const userInput = messages[messages.length - 1]?.content || ''

  // Detect which file is being requested and return appropriate mock
  if (userInput.includes('package.json')) {
    return `{
  "name": "my-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}`
  }

  if (userInput.includes('index.html')) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`
  }

  if (userInput.includes('vite.config')) {
    return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
  }

  if (userInput.includes('tsconfig.json')) {
    return `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}`
  }

  if (userInput.includes('main.tsx')) {
    return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`
  }

  if (userInput.includes('index.css') || userInput.includes('styles')) {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}`
  }

  // Default: return a generic React component
  const componentName = extractComponentName(userInput)
  return `import React from 'react'

export default function ${componentName}() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">${componentName}</h2>
      <p className="text-gray-600">组件内容</p>
    </div>
  )
}`
}

function extractComponentName(input: string): string {
  // Try to extract component name from the file path in input
  const pathMatch = input.match(/生成文件:\s*(?:src\/(?:components\/)?)?(\w+)\.tsx?/i)
  if (pathMatch) {
    const name = pathMatch[1]
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  return 'Component'
}

// Split content into natural chunks for streaming simulation
function splitIntoChunks(content: string): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < content.length) {
    const size = Math.min(1 + Math.floor(Math.random() * 4), content.length - i)
    chunks.push(content.slice(i, i + size))
    i += size
  }
  return chunks
}

function generateMockResponse(userInput: string): string {
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
