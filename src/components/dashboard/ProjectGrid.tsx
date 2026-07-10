'use client'

import { Eye } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const projects = [
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

export default function ProjectGrid() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-12 px-4">
      <Tabs defaultValue="discover" className="w-full">
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
            {projects.map((project, index) => (
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
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            还没有项目，开始创建你的第一个项目吧
          </div>
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
