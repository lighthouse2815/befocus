import { api } from './api'
import type { Project, ProjectPayload, Task, TaskPayload } from '../types'

export const projectKeys = {
  all: ['projects'] as const,
  list: ['projects', 'list'] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
  tasks: (projectId?: string) => ['tasks', projectId ?? 'all'] as const,
}

export const projectsService = {
  list: async () => (await api.get<Project[]>('/projects')).data,
  get: async (id: string) => (await api.get<Project>(`/projects/${id}`)).data,
  create: async (payload: ProjectPayload) => (await api.post<Project>('/projects', payload)).data,
  update: async (id: string, payload: ProjectPayload) =>
    (await api.put<Project>(`/projects/${id}`, payload)).data,
  archive: async (id: string) => (await api.post<Project>(`/projects/${id}/archive`)).data,
  tasks: async (projectId?: string) =>
    (await api.get<Task[]>('/tasks', { params: projectId ? { projectId } : {} })).data,
  createTask: async (payload: TaskPayload) => (await api.post<Task>('/tasks', payload)).data,
  updateTask: async (id: string, payload: Partial<TaskPayload>) =>
    (await api.put<Task>(`/tasks/${id}`, payload)).data,
  completeTask: async (id: string) => (await api.post<Task>(`/tasks/${id}/complete`)).data,
}
