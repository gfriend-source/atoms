'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Home, FolderOpen, Layers, Copy, ArrowRight, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Project {
  id: string
  name: string
  updatedAt: string
}

const navItems = [
  { icon: Home, label: '首页', id: 'home' },
  { icon: Layers, label: '资源', id: 'resources' },
  { icon: FolderOpen, label: '我的项目', id: 'projects' },
]

export default function Sidebar() {
  const [activeNav, setActiveNav] = useState('home')
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetchProjects() {
      setLoadingProjects(true)
      try {
        const res = await fetch('/api/projects')
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || [])
        }
      } catch (error) {
        console.error('获取项目列表失败:', error)
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
  }, [])

  return (
    <aside className="w-[240px] min-w-[240px] h-screen flex flex-col border-r border-gray-100 bg-white">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-xl font-bold text-gray-900">Atoms</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeNav === item.id
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <Separator className="mx-3 my-2" />

      {/* Projects List */}
      <ScrollArea className="flex-1 min-h-0 px-3">
        {loadingProjects ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-gray-400">加载中...</p>
          </div>
        ) : projects.length > 0 ? (
          <div className="space-y-1 py-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => router.push(`/workspace/${project.id}`)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-sm text-gray-400">
              <p>还没有项目</p>
              <p className="mt-1">点击&apos;首页&apos;开始。</p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Bottom Section */}
      <div className="px-5 py-4 border-t border-gray-100">
        <a
          href="#"
          className="flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-600 font-medium"
        >
          获取免费积分
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <p className="text-xs text-gray-400 mt-1">每人获得10积分</p>
      </div>
    </aside>
  )
}
