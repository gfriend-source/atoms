import { create } from 'zustand'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  content?: string
  children?: FileNode[]
  size?: number
  updatedAt?: Date
}

interface FileStore {
  files: FileNode[]
  activeFile: string | null
  openFiles: string[]
  initialized: boolean
  setFiles: (files: FileNode[]) => void
  setActiveFile: (path: string | null) => void
  openFile: (path: string) => void
  closeFile: (path: string) => void
  updateFileContent: (path: string, content: string) => void
  initializeFiles: () => void
  createFile: (parentPath: string, name: string, type: 'file' | 'directory') => void
  deleteFile: (path: string) => void
  renameFile: (path: string, newName: string) => void
  getFileContent: (path: string) => string | undefined
  toggleDirectory: (path: string) => void
  expandedDirs: Set<string>
}

// Helper to find a node by path
function findNode(nodes: FileNode[], path: string): FileNode | undefined {
  for (const node of nodes) {
    if (node.path === path) return node
    if (node.children) {
      const found = findNode(node.children, path)
      if (found) return found
    }
  }
  return undefined
}

// Helper to add a child node to a directory
function addChild(nodes: FileNode[], parentPath: string, child: FileNode): FileNode[] {
  return nodes.map(node => {
    if (node.path === parentPath && node.type === 'directory') {
      return { ...node, children: [...(node.children || []), child] }
    }
    if (node.children) {
      return { ...node, children: addChild(node.children, parentPath, child) }
    }
    return node
  })
}

// Helper to remove a node by path
function removeNode(nodes: FileNode[], path: string): FileNode[] {
  return nodes
    .filter(node => node.path !== path)
    .map(node => {
      if (node.children) {
        return { ...node, children: removeNode(node.children, path) }
      }
      return node
    })
}

// Helper to rename a node
function renameNode(nodes: FileNode[], path: string, newName: string): FileNode[] {
  return nodes.map(node => {
    if (node.path === path) {
      const parts = path.split('/')
      parts[parts.length - 1] = newName
      const newPath = parts.join('/')
      return { ...node, name: newName, path: newPath }
    }
    if (node.children) {
      return { ...node, children: renameNode(node.children, path, newName) }
    }
    return node
  })
}

// Initial demo files - a Gomoku (五子棋) game project
const initialFiles: FileNode[] = [
  {
    name: '.atoms',
    path: '.atoms',
    type: 'directory',
    children: [
      {
        name: 'app',
        path: '.atoms/app',
        type: 'directory',
        children: [
          {
            name: 'frontend',
            path: '.atoms/app/frontend',
            type: 'directory',
            children: [
              {
                name: 'src',
                path: '.atoms/app/frontend/src',
                type: 'directory',
                children: [
                  {
                    name: 'components',
                    path: '.atoms/app/frontend/src/components',
                    type: 'directory',
                    children: [
                      {
                        name: 'GameBoard.tsx',
                        path: '.atoms/app/frontend/src/components/GameBoard.tsx',
                        type: 'file',
                        content: `import React from 'react'
import { useGomoku } from '../hooks/useGomoku'

interface GameBoardProps {
  size?: number
}

export const GameBoard: React.FC<GameBoardProps> = ({ size = 15 }) => {
  const { board, currentPlayer, handleClick, winner } = useGomoku(size)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-lg font-semibold">
        {winner ? \`Winner: \${winner}\` : \`Current Player: \${currentPlayer}\`}
      </div>
      <div
        className="grid gap-0 border border-gray-800 bg-amber-100"
        style={{ gridTemplateColumns: \`repeat(\${size}, 1fr)\` }}
      >
        {board.map((row, i) =>
          row.map((cell, j) => (
            <div
              key={\`\${i}-\${j}\`}
              className="w-8 h-8 border border-gray-300 flex items-center justify-center cursor-pointer hover:bg-amber-200 transition-colors"
              onClick={() => handleClick(i, j)}
            >
              {cell && (
                <div
                  className={\`w-6 h-6 rounded-full \${
                    cell === 'black' ? 'bg-gray-900' : 'bg-white border-2 border-gray-400'
                  }\`}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default GameBoard
`,
                      },
                      {
                        name: 'GameInfo.tsx',
                        path: '.atoms/app/frontend/src/components/GameInfo.tsx',
                        type: 'file',
                        content: `import React from 'react'

interface GameInfoProps {
  currentPlayer: 'black' | 'white'
  moveCount: number
  winner: string | null
  onReset: () => void
}

export const GameInfo: React.FC<GameInfoProps> = ({
  currentPlayer,
  moveCount,
  winner,
  onReset,
}) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md w-64">
      <h2 className="text-xl font-bold mb-4">Game Info</h2>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Current:</span>
          <span className="font-medium capitalize">{currentPlayer}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Moves:</span>
          <span className="font-medium">{moveCount}</span>
        </div>
        {winner && (
          <div className="mt-4 p-2 bg-green-100 rounded text-center">
            <span className="text-green-700 font-bold capitalize">{winner} wins!</span>
          </div>
        )}
      </div>
      <button
        onClick={onReset}
        className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        New Game
      </button>
    </div>
  )
}

export default GameInfo
`,
                      },
                    ],
                  },
                  {
                    name: 'hooks',
                    path: '.atoms/app/frontend/src/hooks',
                    type: 'directory',
                    children: [
                      {
                        name: 'useGomoku.ts',
                        path: '.atoms/app/frontend/src/hooks/useGomoku.ts',
                        type: 'file',
                        content: `import { useState, useCallback } from 'react'

type Cell = 'black' | 'white' | null
type Board = Cell[][]

function checkWinner(board: Board, row: number, col: number, player: Cell): boolean {
  if (!player) return false
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ]

  for (const [dx, dy] of directions) {
    let count = 1
    for (let i = 1; i < 5; i++) {
      const r = row + dx * i
      const c = col + dy * i
      if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) break
      if (board[r][c] !== player) break
      count++
    }
    for (let i = 1; i < 5; i++) {
      const r = row - dx * i
      const c = col - dy * i
      if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) break
      if (board[r][c] !== player) break
      count++
    }
    if (count >= 5) return true
  }
  return false
}

export function useGomoku(size: number = 15) {
  const [board, setBoard] = useState<Board>(
    () => Array(size).fill(null).map(() => Array(size).fill(null))
  )
  const [currentPlayer, setCurrentPlayer] = useState<'black' | 'white'>('black')
  const [winner, setWinner] = useState<string | null>(null)
  const [moveCount, setMoveCount] = useState(0)

  const handleClick = useCallback((row: number, col: number) => {
    if (winner || board[row][col]) return

    const newBoard = board.map(r => [...r])
    newBoard[row][col] = currentPlayer

    if (checkWinner(newBoard, row, col, currentPlayer)) {
      setWinner(currentPlayer)
    }

    setBoard(newBoard)
    setCurrentPlayer(prev => prev === 'black' ? 'white' : 'black')
    setMoveCount(prev => prev + 1)
  }, [board, currentPlayer, winner])

  const reset = useCallback(() => {
    setBoard(Array(size).fill(null).map(() => Array(size).fill(null)))
    setCurrentPlayer('black')
    setWinner(null)
    setMoveCount(0)
  }, [size])

  return { board, currentPlayer, winner, moveCount, handleClick, reset }
}
`,
                      },
                    ],
                  },
                  {
                    name: 'pages',
                    path: '.atoms/app/frontend/src/pages',
                    type: 'directory',
                    children: [
                      {
                        name: 'Index.tsx',
                        path: '.atoms/app/frontend/src/pages/Index.tsx',
                        type: 'file',
                        content: `import React from 'react'
import GameBoard from '../components/GameBoard'
import GameInfo from '../components/GameInfo'
import { useGomoku } from '../hooks/useGomoku'

export default function IndexPage() {
  const { board, currentPlayer, winner, moveCount, handleClick, reset } = useGomoku(15)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="flex gap-8 items-start">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-4">五子棋 Gomoku</h1>
          <GameBoard size={15} />
        </div>
        <GameInfo
          currentPlayer={currentPlayer}
          moveCount={moveCount}
          winner={winner}
          onReset={reset}
        />
      </div>
    </div>
  )
}
`,
                      },
                    ],
                  },
                  {
                    name: 'App.tsx',
                    path: '.atoms/app/frontend/src/App.tsx',
                    type: 'file',
                    content: `import React from 'react'
import IndexPage from './pages/Index'

function App() {
  return <IndexPage />
}

export default App
`,
                  },
                  {
                    name: 'main.tsx',
                    path: '.atoms/app/frontend/src/main.tsx',
                    type: 'file',
                    content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`,
                  },
                  {
                    name: 'index.css',
                    path: '.atoms/app/frontend/src/index.css',
                    type: 'file',
                    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`,
                  },
                ],
              },
              {
                name: 'package.json',
                path: '.atoms/app/frontend/package.json',
                type: 'file',
                content: `{
  "name": "gomoku-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
`,
              },
              {
                name: 'index.html',
                path: '.atoms/app/frontend/index.html',
                type: 'file',
                content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gomoku - 五子棋</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
              },
            ],
          },
        ],
      },
    ],
  },
]

// Default expanded directories
const defaultExpandedDirs = new Set([
  '.atoms',
  '.atoms/app',
  '.atoms/app/frontend',
  '.atoms/app/frontend/src',
  '.atoms/app/frontend/src/components',
  '.atoms/app/frontend/src/hooks',
  '.atoms/app/frontend/src/pages',
])

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  activeFile: null,
  openFiles: [],
  initialized: false,
  expandedDirs: new Set<string>(),

  setFiles: (files) => set({ files }),

  setActiveFile: (path) => set({ activeFile: path }),

  openFile: (path) => {
    const { openFiles } = get()
    if (!openFiles.includes(path)) {
      set({ openFiles: [...openFiles, path], activeFile: path })
    } else {
      set({ activeFile: path })
    }
  },

  closeFile: (path) => {
    const { openFiles, activeFile } = get()
    const newOpenFiles = openFiles.filter(f => f !== path)
    set({
      openFiles: newOpenFiles,
      activeFile: activeFile === path ? (newOpenFiles[newOpenFiles.length - 1] || null) : activeFile
    })
  },

  updateFileContent: (path, content) => {
    const { files } = get()
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path) {
          return { ...node, content }
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) }
        }
        return node
      })
    }
    set({ files: updateNode(files) })
  },

  initializeFiles: () => {
    const { initialized } = get()
    if (initialized) return
    set({
      files: initialFiles,
      initialized: true,
      expandedDirs: defaultExpandedDirs,
      openFiles: ['.atoms/app/frontend/src/pages/Index.tsx'],
      activeFile: '.atoms/app/frontend/src/pages/Index.tsx',
    })
  },

  createFile: (parentPath, name, type) => {
    const { files } = get()
    const newPath = parentPath ? `${parentPath}/${name}` : name
    const newNode: FileNode = {
      name,
      path: newPath,
      type,
      ...(type === 'file' ? { content: '' } : { children: [] }),
    }
    set({ files: addChild(files, parentPath, newNode) })
  },

  deleteFile: (path) => {
    const { files, openFiles, activeFile } = get()
    const newFiles = removeNode(files, path)
    const newOpenFiles = openFiles.filter(f => f !== path)
    set({
      files: newFiles,
      openFiles: newOpenFiles,
      activeFile: activeFile === path ? (newOpenFiles[newOpenFiles.length - 1] || null) : activeFile,
    })
  },

  renameFile: (path, newName) => {
    const { files } = get()
    set({ files: renameNode(files, path, newName) })
  },

  getFileContent: (path) => {
    const { files } = get()
    const node = findNode(files, path)
    return node?.content
  },

  toggleDirectory: (path) => {
    const { expandedDirs } = get()
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    set({ expandedDirs: newExpanded })
  },
}))
