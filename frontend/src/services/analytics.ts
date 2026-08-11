import { api } from './api'
import type { DashboardData, DateRange, FocusAnalytics, HabitAnalytics } from '../types'

export const analyticsKeys = {
  dashboard: (date: string) => ['analytics', 'dashboard', date] as const,
  focus: (range: DateRange) => ['analytics', 'focus', range.from, range.to] as const,
  habits: (range: DateRange) => ['analytics', 'habits', range.from, range.to] as const,
}

export const analyticsService = {
  dashboard: async (date: string) =>
    (await api.get<DashboardData>('/analytics/dashboard', { params: { date } })).data,
  focus: async (range: DateRange) =>
    (await api.get<FocusAnalytics>('/analytics/focus', { params: range })).data,
  habits: async (range: DateRange) =>
    (await api.get<HabitAnalytics>('/analytics/habits', { params: range })).data,
}
