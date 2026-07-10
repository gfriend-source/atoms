'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { RefreshCw, Terminal, Play, AlertCircle, Loader2 } from 'lucide-react'
import { useFileStore, FileNode } from '@/lib/store/file-store'
import {
  getWebContainerInstance,
  mountFiles,
  installDependencies,
  startDevServer,
  startStaticServer,
} from '@/lib/webcontainer/instance'
import type { WebContainer } from '@webcontainer/api'

type Status = 'idle' | 'installing' | 'compiling' | 'running' | 'error'

const statusConfig: Record<Status, { label: string; color: string; pulse: boolean }> = {
  idle: { label: '等待启动', color: 'bg-gray-400', pulse: false },
  installing: { label: '正在安装依赖...', color: 'bg-yellow-400', pulse: true },
  compiling: { label: '正在编译...', color: 'bg-yellow-400', pulse: true },
  running: { label: '运行中', color: 'bg-green-500', pulse: false },
  error: { label: '错误', color: 'bg-red-500', pulse: false },
}

/**
 * Convert FileNode[] tree to WebContainer FileSystemTree format
 */
function convertToFileSystemTree(nodes: FileNode[]): Record<string, any> {
  const tree: Record<string, any> = {}

  for (const node of nodes) {
    if (node.type === 'file') {
      tree[node.name] = {
        file: { contents: node.content || '' },
      }
    } else if (node.type === 'directory' && node.children) {
      tree[node.name] = {
        directory: convertToFileSystemTree(node.children),
      }
    }
  }

  return tree
}

/**
 * Find a file node by name recursively in the file tree.
 */
function findFile(files: FileNode[], name: string): FileNode | undefined {
  for (const f of files) {
    if (f.type === 'file' && f.name === name) return f
    if (f.type === 'directory' && f.children) {
      const found = findFile(f.children, name)
      if (found) return found
    }
  }
  return undefined
}

/** Static file server code injected for pure HTML/CSS/JS projects */
const STATIC_SERVER_CODE = `
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const server = http.createServer((req, res) => {
  let filePath = '.' + (req.url === '/' ? '/index.html' : req.url);
  // Remove query string
  filePath = filePath.split('?')[0];
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Try index.html for SPA fallback
        fs.readFile('./index.html', (err2, fallback) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fallback);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(3000, () => {
  console.log('Static server running on port 3000');
});
`;

export default function AppPreview() {
  const [status, setStatus] = useState<Status>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])
  const [showConsole, setShowConsole] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const instanceRef = useRef<WebContainer | null>(null)
  const consoleEndRef = useRef<HTMLDivElement>(null)
  const isBootingRef = useRef(false)

  const files = useFileStore((state) => state.files)

  const appendConsole = useCallback((line: string) => {
    setConsoleOutput((prev) => [...prev, line])
  }, [])

  // Auto-scroll console to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [consoleOutput])

  const startEnvironment = useCallback(async () => {
    if (isBootingRef.current) return
    isBootingRef.current = true

    setStatus('idle')
    setPreviewUrl(null)
    setErrorMessage(null)
    setConsoleOutput([])

    try {
      // Check if there are files to preview
      if (files.length === 0) {
        throw new Error('没有文件可预览。请先让 AI 生成代码。')
      }

      // Boot WebContainer
      appendConsole('> Booting WebContainer...')
      const instance = await getWebContainerInstance()
      instanceRef.current = instance
      appendConsole('✓ WebContainer ready')

      // Detect project type
      const hasPackageJson = !!findFile(files, 'package.json')
      const hasIndexHtml = !!findFile(files, 'index.html')

      if (!hasPackageJson && !hasIndexHtml) {
        throw new Error('无法预览：未找到 index.html 或 package.json')
      }

      // Convert file tree to WebContainer format
      let fsTree = convertToFileSystemTree(files)

      if (hasPackageJson) {
        // Node project flow: npm install + npm run dev
        appendConsole('> Mounting files...')
        await mountFiles(instance, fsTree)
        appendConsole('✓ Files mounted')

        setStatus('installing')
        appendConsole('> npm install...')
        const { exitCode } = await installDependencies(instance, (data) => {
          appendConsole(data)
        })

        if (exitCode !== 0) {
          throw new Error(`npm install 失败 (exit code: ${exitCode})`)
        }
        appendConsole('✓ Dependencies installed')

        setStatus('compiling')
        appendConsole('> Starting dev server...')
        const { url } = await startDevServer(instance, (data) => {
          appendConsole(data)
        })

        setPreviewUrl(url)
        setStatus('running')
        appendConsole(`✓ Server ready at ${url}`)
      } else {
        // Pure HTML/CSS/JS project - inject static server
        fsTree = {
          ...fsTree,
          '__server.js': {
            file: { contents: STATIC_SERVER_CODE },
          },
        }

        appendConsole('> Mounting files...')
        await mountFiles(instance, fsTree)
        appendConsole('✓ Files mounted')

        setStatus('compiling')
        appendConsole('> Starting static server...')
        const { url } = await startStaticServer(instance, (data) => {
          appendConsole(data)
        })

        setPreviewUrl(url)
        setStatus('running')
        appendConsole(`✓ Preview ready at ${url}`)
      }
    } catch (err: any) {
      setStatus('error')
      const msg = err?.message || '启动失败'
      setErrorMessage(msg)
      appendConsole(`✗ Error: ${msg}`)
    } finally {
      isBootingRef.current = false
    }
  }, [files, appendConsole])

  // Start on mount
  useEffect(() => {
    startEnvironment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = useCallback(async () => {
    if (!instanceRef.current) {
      // Full restart
      await startEnvironment()
      return
    }

    setStatus('compiling')
    setErrorMessage(null)
    appendConsole('> Refreshing...')

    try {
      if (files.length === 0) {
        throw new Error('没有文件可预览。请先让 AI 生成代码。')
      }

      const hasPackageJson = !!findFile(files, 'package.json')
      const hasIndexHtml = !!findFile(files, 'index.html')

      if (!hasPackageJson && !hasIndexHtml) {
        throw new Error('无法预览：未找到 index.html 或 package.json')
      }

      let fsTree = convertToFileSystemTree(files)

      if (hasPackageJson) {
        await mountFiles(instanceRef.current, fsTree)
        appendConsole('✓ Files re-mounted')

        appendConsole('> Restarting dev server...')
        const { url } = await startDevServer(instanceRef.current, (data) => {
          appendConsole(data)
        })

        setPreviewUrl(url)
        setStatus('running')
        appendConsole(`✓ Server ready at ${url}`)
      } else {
        // Static project refresh
        fsTree = {
          ...fsTree,
          '__server.js': {
            file: { contents: STATIC_SERVER_CODE },
          },
        }

        await mountFiles(instanceRef.current, fsTree)
        appendConsole('✓ Files re-mounted')

        appendConsole('> Restarting static server...')
        const { url } = await startStaticServer(instanceRef.current, (data) => {
          appendConsole(data)
        })

        setPreviewUrl(url)
        setStatus('running')
        appendConsole(`✓ Preview ready at ${url}`)
      }
    } catch (err: any) {
      setStatus('error')
      const msg = err?.message || '刷新失败'
      setErrorMessage(msg)
      appendConsole(`✗ Error: ${msg}`)
    }
  }, [files, appendConsole, startEnvironment])

  const { label, color, pulse } = statusConfig[status]

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 h-10 min-h-[40px] bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {pulse && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
              />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
          </span>
          <span className="text-xs text-gray-600">{label}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowConsole((v) => !v)}
            className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${
              showConsole ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            title="控制台"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative overflow-hidden bg-white">
        {status === 'running' && previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            allow="cross-origin-isolated"
            title="App Preview"
          />
        ) : status === 'error' ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-sm text-red-600 max-w-md text-center">
              {errorMessage || '发生未知错误'}
            </p>
            <button
              onClick={startEnvironment}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              重试
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">正在准备预览环境...</p>
          </div>
        )}
      </div>

      {/* Console Output */}
      {showConsole && (
        <div className="h-[180px] min-h-[150px] max-h-[200px] bg-gray-900 border-t border-gray-700 overflow-y-auto font-mono text-xs p-3 shrink-0">
          {consoleOutput.length === 0 ? (
            <p className="text-gray-500">等待输出...</p>
          ) : (
            consoleOutput.map((line, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap break-all leading-5 ${
                  line.startsWith('✗')
                    ? 'text-red-400'
                    : line.startsWith('✓')
                    ? 'text-green-400'
                    : line.startsWith('>')
                    ? 'text-blue-300'
                    : 'text-gray-300'
                }`}
              >
                {line}
              </div>
            ))
          )}
          <div ref={consoleEndRef} />
        </div>
      )}
    </div>
  )
}
