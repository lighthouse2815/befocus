export interface User {
  id: string
  name: string
  email: string
  timezone: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface ApiErrorBody {
  timestamp?: string
  status?: number
  code?: string
  message?: string
  errors?: Record<string, string>
}

export type HabitType = 'BOOLEAN' | 'COUNT' | 'DURATION'
export type ScheduleType = 'DAILY' | 'WEEKDAYS' | 'TIMES_PER_WEEK' | 'INTERVAL'

export interface HabitEntry {
  id?: string
  date: string
  value: number
  note?: string | null
  completed?: boolean
}

export interface Habit {
  id: string
  name: string
  description?: string | null
  type: HabitType
  targetValue: number
  unit?: string | null
  scheduleType: ScheduleType
  weekdays?: number[] | null
  timesPerWeek?: number | null
  intervalDays?: number | null
  scheduleStartDate?: string | null
  reminderTime?: string | null
  color: HabitColor
  archivedAt?: string | null
  scheduledToday: boolean
  todayProgress: number
  todayTarget: number
  completedToday: boolean
  weeklyCompletedOccurrences?: number | null
  weeklyTargetOccurrences?: number | null
  weeklyTargetMet: boolean
  currentStreak: number
  longestStreak?: number
  entries: HabitEntry[]
  createdAt?: string
  updatedAt?: string
}

export type HabitColor = 'moss' | 'clay' | 'amber' | 'ocean' | 'plum' | 'ink'

export interface HabitPayload {
  name: string
  description: string
  type: HabitType
  targetValue: number
  unit: string
  scheduleType: ScheduleType
  weekdays: number[] | null
  timesPerWeek: number | null
  intervalDays: number | null
  scheduleStartDate: string | null
  reminderTime: string | null
  color: HabitColor
}

export interface Project {
  id: string
  name: string
  description?: string | null
  color?: HabitColor | string | null
  icon?: string | null
  archivedAt?: string | null
  archived?: boolean
  totalFocusMinutes?: number
  completedTasks?: number
  pendingTasks?: number
  tasks?: Task[]
  recentSessions?: FocusSession[]
  weeklyActivity?: Array<{ date: string; minutes: number }>
}

export interface ProjectPayload {
  name: string
  description?: string
  color?: HabitColor | string
  icon?: string
}

export interface Task {
  id: string
  projectId: string
  title: string
  projectName?: string | null
  description?: string | null
  dueDate?: string | null
  status?: 'PENDING' | 'COMPLETED'
  completed?: boolean
  completedAt?: string | null
  focusMinutes?: number
}

export interface TaskPayload {
  projectId: string
  title: string
  dueDate: string | null
}

export type FocusStatus = 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
export type InterruptionKind = 'PHONE' | 'MESSAGE' | 'NOISE' | 'MEETING' | 'OTHER'

export interface FocusSession {
  id: string
  plannedDurationMinutes: number
  actualDurationMinutes: number | null
  projectId: string | null
  projectName: string | null
  taskId: string | null
  taskTitle: string | null
  habitId: string | null
  habitName: string | null
  status: FocusStatus
  startedAt: string
  expectedEndAt: string
  pausedAt: string | null
  totalPausedSeconds: number
  completedAt: string | null
  cancelledAt: string | null
  interruptions: FocusInterruption[]
}

export interface FocusInterruption {
  id: string
  kind: InterruptionKind
  note: string | null
  occurredAt: string
}

export interface FocusStartPayload {
  plannedDurationMinutes: number
  projectId: string | null
  taskId: string | null
  habitId: string | null
}

export interface DashboardData {
  date: string
  greeting: string
  habits: { completed: number; total: number; minutes: number }
  focusMinutes: number
  tasks: { completed: number; total: number }
  currentStreak: number
  weeklyFocus: Array<{ date: string; minutes: number }>
  recentActivity: ActivityItem[]
  activeSession: FocusSession | null
}

export interface ActivityItem {
  id?: string
  type?: string
  title?: string
  description?: string
  timestamp?: string
  occurredAt?: string
}

export interface FocusAnalytics {
  totalMinutes: number
  averageSessionMinutes: number
  completedSessions: number
  completionRate: number
  byProject: AnalyticsBreakdown[]
  byTask: AnalyticsBreakdown[]
  byHabit: AnalyticsBreakdown[]
  byWeekday: AnalyticsBreakdown[]
  byHour: AnalyticsBreakdown[]
  interruptions: number | AnalyticsBreakdown[]
  insights?: string[]
}

export interface AnalyticsBreakdown {
  label?: string
  name?: string
  key?: string
  minutes?: number
  value?: number
  count?: number
  completionRate?: number
}

export interface HabitAnalytics {
  completionRate: number
  currentStreak: number
  longestStreak: number
  consistency: number
  dailyProgress?: Array<{ date: string; completed: number; total: number; rate?: number }>
  weeklyProgress?: Array<{ week: string; completed: number; total: number; rate?: number }>
  heatmap: HeatmapCell[]
  habits?: Array<{
    id?: string
    name: string
    completionRate: number
    currentStreak?: number
    longestStreak?: number
  }>
}

export interface HeatmapCell {
  date: string
  value: number
  target?: number
  completed?: boolean
}

export interface Settings {
  defaultFocusMinutes: number
  defaultBreakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
  timezone: string
  notificationsEnabled: boolean
  theme: 'LIGHT' | 'DARK' | 'SYSTEM' | 'light' | 'dark' | 'system'
}

export interface DateRange {
  from: string
  to: string
}
