'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Rocket,
} from 'lucide-react'
import ChatPanel from '@/components/workspace/ChatPanel'
import WorkspaceTabs from '@/components/workspace/WorkspaceTabs'
import { useChatStore } from '@/lib/store/chat-store'
import { useFileStore, type FileNode } from '@/lib/store/file-store'

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const initialPrompt = searchParams.get('prompt') || undefined

  const [leftPanelWidth, setLeftPanelWidth] = useState(400)
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [projectName, setProjectName] = useState('New Project')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  // Load persisted project data when entering an existing project
  useEffect(() => {
    if (projectId && projectId !== 'new') {
      loadProjectData(projectId).then(() => setDataLoaded(true))
    } else {
      setDataLoaded(true)
    }
  }, [projectId])

  async function loadProjectData(id: string) {
    setIsLoadingProject(true)
    try {
      // Load project info
      const projectRes = await fetch(`/api/projects/${id}`)
      if (projectRes.ok) {
        const data = await projectRes.json()
        if (data.project?.name) {
          setProjectName(data.project.name)
        }
      }

      // Load chat messages
      const messagesRes = await fetch(`/api/projects/${id}/messages`)
      if (messagesRes.ok) {
        const messages = await messagesRes.json()
        if (messages.length > 0) {
          const chatMessages = messages.map((msg: { id: string; role: 'user' | 'assistant'; content: string; agent?: string; agentRole?: string; steps?: string; createdAt: string }) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            agent: msg.agent || undefined,
            agentRole: msg.agentRole || undefined,
            steps: msg.steps ? JSON.parse(msg.steps) : undefined,
            createdAt: new Date(msg.createdAt),
          }))
          useChatStore.getState().setMessages(chatMessages)
        }
      }

      // Load project files
      const filesRes = await fetch(`/api/projects/${id}/files`)
      if (filesRes.ok) {
        const files = await filesRes.json()
        if (files.length > 0) {
          const fileTree = rebuildFileTree(files)
          useFileStore.getState().setFiles(fileTree)
        }
      }
    } catch (err) {
      console.error('[Workspace] Failed to load project data:', err)
    } finally {
      setIsLoadingProject(false)
    }
  }

  // Rebuild flat file list into tree structure
  function rebuildFileTree(flatFiles: { path: string; content: string }[]): FileNode[] {
    const root: FileNode[] = []

    for (const file of flatFiles) {
      const parts = file.path.split('/')
      let current = root

      for (let i = 0; i < parts.length; i++) {
        const name = parts[i]
        const isFile = i === parts.length - 1
        const currentPath = parts.slice(0, i + 1).join('/')

        if (isFile) {
          current.push({
            name,
            path: currentPath,
            type: 'file',
            content: file.content,
            size: file.content.length,
          })
        } else {
          let dir = current.find(n => n.name === name && n.type === 'directory')
          if (!dir) {
            dir = { name, path: currentPath, type: 'directory', children: [] }
            current.push(dir)
          }
          current = dir.children!
        }
      }
    }

    return root
  }

  // Handle drag to resize panels
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStartX.current = e.clientX
    dragStartWidth.current = leftPanelWidth
  }, [leftPanelWidth])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current
      const newWidth = Math.max(280, Math.min(600, dragStartWidth.current + delta))
      setLeftPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return (
    <div ref={containerRef} className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Top Bar */}
      <header className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 z-10">
        {/* Left section */}
        <div className="flex items-center gap-2">
          <button
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            title={isLeftPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isLeftPanelCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-gray-600" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-gray-600" />
            )}
          </button>

          <button
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            title="Back"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>

          <div className="h-4 w-px bg-gray-200 mx-1" />

          {/* Project name (editable) */}
          {isEditingName ? (
            <input
              className="text-sm font-medium bg-white border border-blue-400 rounded px-2 py-0.5 outline-none"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setIsEditingName(false)
              }}
              autoFocus
            />
          ) : (
            <button
              className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded px-2 py-0.5 transition-colors"
              onClick={() => setIsEditingName(true)}
            >
              {projectName}
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors">
            <Rocket className="w-3.5 h-3.5" />
            Publish
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Chat */}
        {!isLeftPanelCollapsed && (
          <div
            className="shrink-0 border-r border-gray-200 bg-white flex flex-col transition-all duration-200"
            style={{ width: leftPanelWidth }}
          >
            <ChatPanel initialPrompt={dataLoaded ? initialPrompt : undefined} projectId={projectId} />
          </div>
        )}

        {/* Resize Handle */}
        {!isLeftPanelCollapsed && (
          <div
            className={cn(
              'w-1 cursor-col-resize hover:bg-blue-400 transition-colors shrink-0 relative z-10',
              isDragging ? 'bg-blue-400' : 'bg-transparent hover:bg-blue-300'
            )}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </div>
        )}

        {/* Right Panel - Workspace Tabs */}
        <div className="flex-1 min-w-0 flex flex-col">
          <WorkspaceTabs />
        </div>
      </div>

      {/* Drag overlay to prevent text selection */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
    </div>
  )
}
