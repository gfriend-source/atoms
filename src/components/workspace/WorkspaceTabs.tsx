'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Code2, FolderTree, Globe, MoreHorizontal } from 'lucide-react'
import CodeEditor from './CodeEditor'
import FileExplorer from './FileExplorer'
import AppPreview from './AppPreview'

type TabId = 'editor' | 'files' | 'preview' | 'more'

interface TabItem {
  id: TabId
  label: string
  icon: React.ReactNode
}

const tabs: TabItem[] = [
  { id: 'editor', label: 'Editor', icon: <Code2 className="w-4 h-4" /> },
  { id: 'files', label: 'Files', icon: <FolderTree className="w-4 h-4" /> },
  { id: 'preview', label: 'Preview', icon: <Globe className="w-4 h-4" /> },
  { id: 'more', label: 'More', icon: <MoreHorizontal className="w-4 h-4" /> },
]

export default function WorkspaceTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('editor')

  const renderContent = () => {
    switch (activeTab) {
      case 'editor':
        return <CodeEditor />
      case 'files':
        return <FileExplorer />
      case 'preview':
        return <AppPreview />
      case 'more':
        return (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            <p>More options coming soon...</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tab Bar */}
      <div className="flex items-center border-b border-gray-200 bg-white px-2 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
              activeTab === tab.id
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  )
}
