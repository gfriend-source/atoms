'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, Trash2, FolderOpen } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface UserProject {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

const discoverProjects = [
  { title: '横版轻度解谜游戏', author: 'yu lingjing', views: 167, color: 'bg-emerald-100', emoji: '🎮' },
  { title: '卡牌对战游戏设计', author: 'Atoms_X6EIWR46', views: 123, color: 'bg-blue-100', emoji: '🃏' },
  { title: '加密支付OTC产品', author: 'yuxiang wu', views: 264, color: 'bg-purple-100', emoji: '💰' },
  { title: '无畏契约游戏', author: 'Atoms_ZO37RS3C', views: 1100, color: 'bg-red-100', emoji: '🎯' },
  { title: '绝望侦探', author: 'jinxi fu', views: 669, color: 'bg-amber-100', emoji: '🔍' },
  { title: '小红书内容创作工具', author: 'Joyce Fan', views: 1100, color: 'bg-pink-100', emoji: '📝' },
  { title: '拾光解谜治愈星球', author: 'xiaoyang luo', views: 2400, color: 'bg-cyan-100', emoji: '🌍' },
  { title: '炒股预警监控设计', author: 'huixin xu', views: 642, color: 'bg-orange-100', emoji: '📈' },
]

function formatViews(views: number): string {
  if (views >= 1000) {
    return (views / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  }
  return views.toString()
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 30) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN')
}

function MyProjectsTab() {
  const [projects, setProjects] = useState<UserProject[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('获取项目列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('确定要删除此项目吗？相关对话和文件将被永久删除。')) return

    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProjects(prev => prev.filter(p => p.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        加载中...
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FolderOpen className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-400">还没有项目，从上方输入框开始创建吧</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => router.push(`/workspace/${project.id}`)}
          className="relative group p-4 bg-gray-50 rounded-xl hover:shadow-md hover:bg-white border border-transparent hover:border-gray-100 transition-all cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-base shrink-0">
              📄
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {project.name}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {formatRelativeTime(project.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => handleDelete(project.id, e)}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1 rounded"
            title="删除项目"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default function ProjectGrid() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab = tabParam === 'projects' ? 'myprojects' : 'discover'
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'projects') {
      setActiveTab('myprojects')
    } else if (!tab) {
      setActiveTab('discover')
    }
  }, [searchParams])

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 px-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-transparent p-0 h-auto gap-1">
            <TabsTrigger
              value="discover"
              className="px-4 py-2 rounded-full text-sm data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none text-gray-500"
            >
              发现
            </TabsTrigger>
            <TabsTrigger
              value="myprojects"
              className="px-4 py-2 rounded-full text-sm data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none text-gray-500"
            >
              我的项目
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="px-4 py-2 rounded-full text-sm data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-none text-gray-500"
            >
              模板
            </TabsTrigger>
          </TabsList>
          <a href="#" className="text-sm text-indigo-500 hover:text-indigo-600 font-medium">
            查看全部 &gt;
          </a>
        </div>

        <TabsContent value="discover" className="mt-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {discoverProjects.map((project, index) => (
              <div
                key={index}
                className="group p-4 bg-gray-50 rounded-xl hover:shadow-md hover:bg-white border border-transparent hover:border-gray-100 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-full ${project.color} flex items-center justify-center text-base shrink-0`}>
                    {project.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 truncate">{project.author}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                  <Eye className="h-3 w-3" />
                  <span>{formatViews(project.views)}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="myprojects" className="mt-0">
          <MyProjectsTab />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            模板库即将上线
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
