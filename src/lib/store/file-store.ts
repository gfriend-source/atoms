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
  deleteFileByPath: (filePath: string) => void
  renameFile: (path: string, newName: string) => void
  getFileContent: (path: string) => string | undefined
  toggleDirectory: (path: string) => void
  addFileByPath: (filePath: string, content: string) => void
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
      files: [],
      initialized: true,
      expandedDirs: new Set<string>(),
      openFiles: [],
      activeFile: null,
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

  deleteFileByPath: (filePath) => {
    const { files, openFiles, activeFile } = get()
    const newFiles = removeNode(files, filePath)
    const newOpenFiles = openFiles.filter(f => f !== filePath)
    set({
      files: newFiles,
      openFiles: newOpenFiles,
      activeFile: activeFile === filePath ? (newOpenFiles[newOpenFiles.length - 1] || null) : activeFile,
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

  addFileByPath: (filePath, content) => {
    const parts = filePath.split('/')
    const fileName = parts.pop()!

    set((state) => {
      const newFiles = JSON.parse(JSON.stringify(state.files)) as FileNode[]
      let current = newFiles
      const expandedPaths: string[] = []

      // Create intermediate directories
      for (let i = 0; i < parts.length; i++) {
        const dirName = parts[i]
        const dirPath = parts.slice(0, i + 1).join('/')
        expandedPaths.push(dirPath)

        let existing = current.find(f => f.name === dirName && f.type === 'directory')
        if (!existing) {
          existing = { name: dirName, path: dirPath, type: 'directory', children: [] }
          current.push(existing)
        }
        if (!existing.children) {
          existing.children = []
        }
        current = existing.children
      }

      // Create or update the file
      const existingFile = current.find(f => f.name === fileName && f.type === 'file')
      if (existingFile) {
        existingFile.content = content
      } else {
        current.push({
          name: fileName,
          path: filePath,
          type: 'file',
          content,
          size: content.length,
        })
      }

      // Expand all parent directories and open the file
      const newExpanded = new Set(state.expandedDirs)
      expandedPaths.forEach(p => newExpanded.add(p))

      return {
        files: newFiles,
        activeFile: filePath,
        openFiles: [...new Set([...state.openFiles, filePath])],
        expandedDirs: newExpanded,
      }
    })
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
