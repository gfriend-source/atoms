'use client'

import React, { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useFileStore, FileNode } from '@/lib/store/file-store'
import { cn } from '@/lib/utils'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  X,
  Plus,
  FolderPlus,
  Trash2,
  Pencil,
} from 'lucide-react'

// Dynamic import Monaco Editor (no SSR)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

// Get language from file extension
function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'css':
      return 'css'
    case 'html':
      return 'html'
    case 'json':
      return 'json'
    case 'md':
      return 'markdown'
    default:
      return 'plaintext'
  }
}

// Get file icon color/style
function FileIcon({ name, type }: { name: string; type: 'file' | 'directory' }) {
  if (type === 'directory') return null

  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'tsx':
    case 'jsx':
      return <span className="text-[11px] font-bold text-blue-500 w-4 text-center shrink-0">⚛</span>
    case 'ts':
      return <span className="text-[10px] font-bold text-blue-600 w-4 text-center shrink-0 bg-blue-100 rounded-sm">TS</span>
    case 'css':
      return <span className="text-[11px] w-4 text-center shrink-0 text-purple-500">🎨</span>
    case 'json':
      return <span className="text-[10px] font-bold text-yellow-600 w-4 text-center shrink-0">{'{}'}</span>
    case 'html':
      return <span className="text-[11px] w-4 text-center shrink-0 text-orange-500">◇</span>
    default:
      return <File className="w-3.5 h-3.5 text-gray-400 shrink-0" />
  }
}

// Context menu component
function ContextMenu({
  x,
  y,
  onClose,
  onNewFile,
  onNewFolder,
  onDelete,
  onRename,
  isDirectory,
}: {
  x: number
  y: number
  onClose: () => void
  onNewFile: () => void
  onNewFolder: () => void
  onDelete: () => void
  onRename: () => void
  isDirectory: boolean
}) {
  useEffect(() => {
    const handleClick = () => onClose()
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [onClose])

  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      {isDirectory && (
        <>
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={onNewFile}
          >
            <Plus className="w-3.5 h-3.5" /> New File
          </button>
          <button
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            onClick={onNewFolder}
          >
            <FolderPlus className="w-3.5 h-3.5" /> New Folder
          </button>
          <div className="border-t border-gray-100 my-1" />
        </>
      )}
      <button
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
        onClick={onRename}
      >
        <Pencil className="w-3.5 h-3.5" /> Rename
      </button>
      <button
        className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
        onClick={onDelete}
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
    </div>
  )
}

// File tree item component (recursive)
function FileTreeItem({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const { activeFile, openFile, expandedDirs, toggleDirectory, createFile, deleteFile, renameFile } = useFileStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(node.name)
  const [isCreating, setIsCreating] = useState<'file' | 'directory' | null>(null)
  const [newName, setNewName] = useState('')

  const isExpanded = expandedDirs.has(node.path)
  const isActive = activeFile === node.path

  const handleClick = () => {
    if (node.type === 'directory') {
      toggleDirectory(node.path)
    } else {
      openFile(node.path)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleRename = () => {
    if (renameValue && renameValue !== node.name) {
      renameFile(node.path, renameValue)
    }
    setIsRenaming(false)
  }

  const handleCreate = () => {
    if (newName && isCreating) {
      createFile(node.path, newName, isCreating)
      if (!isExpanded) toggleDirectory(node.path)
    }
    setIsCreating(null)
    setNewName('')
  }

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-0.5 px-2 cursor-pointer select-none group transition-all duration-150',
          'hover:bg-gray-100',
          isActive && node.type === 'file' && 'bg-blue-50 text-blue-700'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {node.type === 'directory' ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <FileIcon name={node.name} type={node.type} />
          </>
        )}

        {isRenaming ? (
          <input
            className="text-sm bg-white border border-blue-400 rounded px-1 outline-none flex-1 min-w-0"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
              if (e.key === 'Escape') setIsRenaming(false)
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-[13px] truncate">{node.name}</span>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onNewFile={() => { setIsCreating('file'); setContextMenu(null) }}
          onNewFolder={() => { setIsCreating('directory'); setContextMenu(null) }}
          onDelete={() => { deleteFile(node.path); setContextMenu(null) }}
          onRename={() => { setIsRenaming(true); setRenameValue(node.name); setContextMenu(null) }}
          isDirectory={node.type === 'directory'}
        />
      )}

      {/* Children */}
      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {isCreating && (
            <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
              <span className="w-3.5 shrink-0" />
              {isCreating === 'directory' ? (
                <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              ) : (
                <File className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              )}
              <input
                className="text-sm bg-white border border-blue-400 rounded px-1 outline-none flex-1 min-w-0"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleCreate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') { setIsCreating(null); setNewName('') }
                }}
                autoFocus
                placeholder={isCreating === 'directory' ? 'folder name' : 'file name'}
              />
            </div>
          )}
          {[...node.children]
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name)
              return a.type === 'directory' ? -1 : 1
            })
            .map((child) => (
              <FileTreeItem key={child.path} node={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  )
}

// File tabs component (open files)
function FileTabs() {
  const { openFiles, activeFile, setActiveFile, closeFile } = useFileStore()

  if (openFiles.length === 0) return null

  return (
    <div className="flex items-center border-b border-gray-200 bg-gray-50 overflow-x-auto">
      {openFiles.map((filePath) => {
        const fileName = filePath.split('/').pop() || filePath
        const isActive = activeFile === filePath
        return (
          <div
            key={filePath}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-[13px] cursor-pointer border-r border-gray-200 group transition-all duration-150 shrink-0',
              isActive
                ? 'bg-white text-gray-900 border-b-2 border-b-blue-500'
                : 'text-gray-500 hover:bg-gray-100'
            )}
            onClick={() => setActiveFile(filePath)}
          >
            <FileIcon name={fileName} type="file" />
            <span>{fileName}</span>
            <button
              className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded p-0.5 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                closeFile(filePath)
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// Main CodeEditor component
export default function CodeEditor() {
  const { files, activeFile, openFiles, initializeFiles, getFileContent, updateFileContent } = useFileStore()

  useEffect(() => {
    initializeFiles()
  }, [initializeFiles])

  const activeContent = activeFile ? getFileContent(activeFile) : undefined
  const activeLanguage = activeFile ? getLanguage(activeFile) : 'plaintext'

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (activeFile && value !== undefined) {
        updateFileContent(activeFile, value)
      }
    },
    [activeFile, updateFileContent]
  )

  return (
    <div className="flex h-full bg-white">
      {/* Left: File Tree */}
      <div className="w-[250px] border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
          Explorer
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {files.map((node) => (
            <FileTreeItem key={node.path} node={node} depth={0} />
          ))}
        </div>
      </div>

      {/* Right: Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <FileTabs />
        <div className="flex-1 min-h-0">
          {activeFile && openFiles.length > 0 ? (
            <MonacoEditor
              key={activeFile}
              height="100%"
              language={activeLanguage}
              value={activeContent || ''}
              onChange={handleEditorChange}
              theme="vs"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                automaticLayout: true,
                padding: { top: 12 },
                renderLineHighlight: 'line',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                folding: true,
                bracketPairColorization: { enabled: true },
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              <div className="text-center">
                <File className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p>Select a file to start editing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
