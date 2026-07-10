'use client'

import { useState, useMemo, useEffect } from 'react'
import { useFileStore, FileNode } from '@/lib/store/file-store'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FolderUp,
  Download,
  Trash2,
  Folder,
  File,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface FlatFileItem {
  name: string
  type: 'file' | 'directory'
  size?: number
  updatedAt: string
  path: string
}

// Default demo data if store is empty
const defaultFiles: FlatFileItem[] = [
  { name: '.lock', type: 'file', size: 50, updatedAt: '2026/07/10 02:06:59', path: '.lock' },
  { name: 'build', type: 'directory', updatedAt: '2026/07/10 01:51:40', path: 'build' },
  { name: 'workspace', type: 'directory', updatedAt: '2026/07/10 01:51:29', path: 'workspace' },
  { name: 'cover', type: 'directory', updatedAt: '2026/07/10 01:51:19', path: 'cover' },
  { name: '.last_project_mode.json', type: 'file', size: 30, updatedAt: '2026/07/10 01:48:49', path: '.last_project_mode.json' },
]

function formatSize(size?: number): string {
  if (size === undefined || size === null) return '-'
  if (size < 1024) return `${(size / 1024).toFixed(2)} KB`
  return `${(size / 1024).toFixed(2)} KB`
}

function formatDate(date?: Date | string): string {
  if (!date) return '-'
  if (typeof date === 'string') return date
  const d = new Date(date)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function getChildrenAtPath(files: FileNode[], path: string): FileNode[] {
  if (!path || path === '/') return files
  const segments = path.split('/')
  let current = files
  for (const seg of segments) {
    const found = current.find(f => f.name === seg)
    if (found && found.children) {
      current = found.children
    } else {
      return []
    }
  }
  return current
}

function flattenForDisplay(nodes: FileNode[]): FlatFileItem[] {
  return nodes.map(node => ({
    name: node.name,
    type: node.type,
    size: node.size,
    updatedAt: node.updatedAt ? formatDate(node.updatedAt) : '-',
    path: node.path,
  }))
}

export default function FileExplorer() {
  const { files, initialized, initializeFiles } = useFileStore()
  const [currentPath, setCurrentPath] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    if (!initialized) {
      initializeFiles()
    }
  }, [initialized, initializeFiles])

  const currentFiles = useMemo(() => {
    if (!initialized || files.length === 0) return defaultFiles
    const children = getChildrenAtPath(files, currentPath)
    if (children.length === 0 && currentPath === '') return defaultFiles
    return flattenForDisplay(children)
  }, [files, currentPath, initialized])

  // Sort: directories first, then files
  const sortedFiles = useMemo(() => {
    return [...currentFiles].sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1
      if (a.type !== 'directory' && b.type === 'directory') return 1
      return a.name.localeCompare(b.name)
    })
  }, [currentFiles])

  const totalItems = sortedFiles.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedFiles = sortedFiles.slice((page - 1) * pageSize, page * pageSize)

  const breadcrumbSegments = useMemo(() => {
    const base = ['data', 'chats']
    if (currentPath) {
      return [...base, ...currentPath.split('/')]
    }
    return [...base, '项目名']
  }, [currentPath])

  const handleBreadcrumbClick = (index: number) => {
    // Index 0 = 'data', 1 = 'chats' -> go to root
    if (index < 2) {
      setCurrentPath('')
      setPage(1)
      return
    }
    // Build path from segments after 'data/chats'
    const pathSegments = currentPath.split('/').slice(0, index - 2 + 1)
    // If clicking index 2 with default "项目名", stay at root
    if (!currentPath && index === 2) return
    setCurrentPath(pathSegments.join('/'))
    setPage(1)
  }

  const handleFolderClick = (item: FlatFileItem) => {
    if (item.type === 'directory') {
      const newPath = currentPath ? `${currentPath}/${item.name}` : item.name
      setCurrentPath(newPath)
      setPage(1)
    }
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top bar: breadcrumb + actions */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm gap-1">
          {breadcrumbSegments.map((seg, idx) => {
            const isLast = idx === breadcrumbSegments.length - 1
            return (
              <span key={idx} className="flex items-center gap-1">
                {idx > 0 && <span className="text-gray-400 mx-1">/</span>}
                {isLast ? (
                  <span className="text-gray-900 font-medium">{seg}</span>
                ) : (
                  <button
                    onClick={() => handleBreadcrumbClick(idx)}
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    {seg}
                  </button>
                )}
              </span>
            )
          })}
        </nav>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" />
            上传文件
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <FolderUp className="h-3.5 w-3.5" />
            上传文件夹
          </Button>
        </div>
      </div>

      {/* File table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-2.5 px-4 font-medium text-gray-600">文件名</th>
              <th className="text-left py-2.5 px-4 font-medium text-gray-600 w-28">大小</th>
              <th className="text-left py-2.5 px-4 font-medium text-gray-600 w-44">最后更新</th>
              <th className="text-right py-2.5 px-4 font-medium text-gray-600 w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFiles.map((item) => (
              <tr
                key={item.path}
                className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors"
              >
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    {item.type === 'directory' ? (
                      <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    {item.type === 'directory' ? (
                      <button
                        onClick={() => handleFolderClick(item)}
                        className="text-gray-900 hover:text-blue-600 hover:underline transition-colors truncate"
                      >
                        {item.name}
                      </button>
                    ) : (
                      <span className="text-gray-900 truncate">{item.name}</span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-4 text-gray-500">
                  {item.type === 'directory' ? '-' : formatSize(item.size)}
                </td>
                <td className="py-2.5 px-4 text-gray-500">{item.updatedAt}</td>
                <td className="py-2.5 px-4">
                  <div className="flex items-center justify-end gap-1">
                    {item.type === 'file' && (
                      <button
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        title="下载"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginatedFiles.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-400">
                  此目录为空
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
        {/* Page size selector */}
        <div className="flex items-center gap-2 text-gray-600">
          <span>每页行数:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="border border-gray-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Item count */}
        <span className="text-gray-500">{totalItems}个项目已找到</span>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-gray-600 min-w-[3rem] text-center">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
