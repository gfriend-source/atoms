import { create } from 'zustand'

export interface Project {
  id: string
  name: string
  description?: string
  views: number
  createdAt: Date
  updatedAt: Date
}

interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  addProject: (project: Project) => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) => set({ projects: [...get().projects, project] }),
}))
