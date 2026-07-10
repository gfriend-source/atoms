import { create } from 'zustand'
import type { FileOperation } from '@/lib/ai/parser'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: string
  agentRole?: string
  steps?: { title: string; completed: boolean }[]
  suggestions?: string[]
  fileOperations?: FileOperation[]
  isStreaming?: boolean
  createdAt: Date
}

interface ChatStore {
  messages: ChatMessage[]
  isLoading: boolean
  initialized: boolean
  currentAgentId: string
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, partial: Partial<ChatMessage>) => void
  appendToMessage: (id: string, text: string) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
  setCurrentAgentId: (id: string) => void
  initMockData: () => void
}

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: '请编写一个五子棋小游戏',
    createdAt: new Date('2025-01-10T10:00:00'),
  },
  {
    id: '2',
    role: 'assistant',
    content: '这是一个简明确的任务——开发一个五子棋小游戏。需求清晰，不需要确认计划，直接开始开发。\n\n让我先初始化前端模板：\n\n```bash\nnpx create-vite gomoku --template react-ts\n```\n\n接下来实现游戏核心逻辑，包括棋盘渲染、落子判定和胜负检测...',
    agent: 'Alex',
    agentRole: '工程师',
    steps: [
      { title: '这是一个简明确的任务——开发一个五子棋小游戏。需求清晰，不需要确认计划，直接开始开发。', completed: true },
      { title: '让我先初始化前端模板', completed: true },
      { title: 'Now let me read the README first...', completed: true },
      { title: 'Now let me plan and implement the Gomoku game...', completed: true },
      { title: 'Now let me write the game logic hook...', completed: true },
      { title: '让我设置上下文文件...', completed: true },
      { title: '实现游戏逻辑', completed: true },
    ],
    suggestions: ['Add animations', 'Add sound effects', 'Add player statistics'],
    createdAt: new Date('2025-01-10T10:00:05'),
  },
]

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  initialized: false,
  currentAgentId: 'alex',

  addMessage: (message) => set({ messages: [...get().messages, message] }),

  updateMessage: (id, partial) => {
    const { messages } = get()
    const updated = messages.map((msg) =>
      msg.id === id ? { ...msg, ...partial } : msg
    )
    set({ messages: updated })
  },

  appendToMessage: (id, text) => {
    const { messages } = get()
    const updated = messages.map((msg) =>
      msg.id === id ? { ...msg, content: msg.content + text } : msg
    )
    set({ messages: updated })
  },

  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [] }),
  setCurrentAgentId: (id) => set({ currentAgentId: id }),

  initMockData: () => {
    const { initialized } = get()
    if (!initialized) {
      set({ messages: MOCK_MESSAGES, initialized: true })
    }
  },
}))
