import { apiClient } from './apiClient'
import type { Project, ProjectPayload, Task, TaskPayload } from '@/types'

export const projectKeys = {
  all: ['projects'] as const,
  list: ['projects', 'list'] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
  tasks: (projectId?: string) => ['tasks', projectId ?? 'all'] as const,
}

export const projectService = {
  list: async () => (await apiClient.get<Project[]>('/projects')).data,
  get: async (id: string) => (await apiClient.get<Project>(`/projects/${id}`)).data,
  create: async (payload: ProjectPayload) => (await apiClient.post<Project>('/projects', payload)).data,
  update: async (id: string, payload: ProjectPayload) =>
    (await apiClient.put<Project>(`/projects/${id}`, payload)).data,
  archive: async (id: string) => (await apiClient.post<Project>(`/projects/${id}/archive`)).data,
  tasks: async (projectId?: string) =>
    (await apiClient.get<Task[]>('/tasks', { params: projectId ? { projectId } : {} })).data,
  createTask: async (payload: TaskPayload) => (await apiClient.post<Task>('/tasks', payload)).data,
  updateTask: async (id: string, payload: TaskPayload) =>
    (await apiClient.put<Task>(`/tasks/${id}`, payload)).data,
  completeTask: async (id: string) => (await apiClient.post<Task>(`/tasks/${id}/complete`)).data,
}
