import { Suspense } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import AgentShowcase from '@/components/dashboard/AgentShowcase'
import CreativeInput from '@/components/dashboard/CreativeInput'
import ProjectGrid from '@/components/dashboard/ProjectGrid'

export default function DashboardPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4">
          {/* Agent Showcase */}
          <AgentShowcase />

          {/* Creative Input */}
          <CreativeInput />

          {/* Project Grid */}
          <Suspense fallback={null}>
            <ProjectGrid />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
