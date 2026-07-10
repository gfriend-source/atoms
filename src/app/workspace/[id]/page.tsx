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

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const initialPrompt = searchParams.get('prompt') || undefined

  const [leftPanelWidth, setLeftPanelWidth] = useState(400)
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [projectName, setProjectName] = useState('Gomoku Game')
  const [isEditingName, setIsEditingName] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

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
            <ChatPanel initialPrompt={initialPrompt} />
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
