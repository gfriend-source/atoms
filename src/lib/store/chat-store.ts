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
  currentAgentId: string
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, partial: Partial<ChatMessage>) => void
  appendToMessage: (id: string, text: string) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
  setCurrentAgentId: (id: string) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
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
}))
