import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { FocusSession, Habit } from '@/types'

const CHANNEL_ID = 'focusflow-timers'
const STORAGE_KEY = 'focusflow.local-notifications.v1'
const MAX_HABIT_NOTIFICATIONS = 56

interface StoredNotificationIds {
  focus: string | null
  break: string | null
  habits: string[]
}

export type LocalNotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported'

const emptyIds = (): StoredNotificationIds => ({ focus: null, break: null, habits: [] })

let operation = Promise.resolve()

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  })
}

function runSerialized<T>(task: () => Promise<T>) {
  const next = operation.then(task, task)
  operation = next.then(() => undefined, () => undefined)
  return next
}

async function readIds(): Promise<StoredNotificationIds> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyIds()
    const parsed = JSON.parse(raw) as Partial<StoredNotificationIds>
    return {
      focus: typeof parsed.focus === 'string' ? parsed.focus : null,
      break: typeof parsed.break === 'string' ? parsed.break : null,
      habits: Array.isArray(parsed.habits) ? parsed.habits.filter((id): id is string => typeof id === 'string') : [],
    }
  } catch {
    return emptyIds()
  }
}

async function writeIds(ids: StoredNotificationIds) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

async function cancelIdentifiers(ids: Array<string | null | undefined>) {
  if (Platform.OS === 'web') return
  await Promise.all(ids.filter((id): id is string => Boolean(id)).map(async (id) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(id)
    } catch {
      // The operating system may already have delivered or removed the request.
    }
  }))
}

async function isGranted() {
  if (Platform.OS === 'web') return false
  const permission = await Notifications.getPermissionsAsync()
  return permission.granted
}

function channelId() {
  return Platform.OS === 'android' ? CHANNEL_ID : undefined
}

function parseReminderTime(value: string | null | undefined) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value ?? '')
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

function notificationContent(habit: Habit) {
  return {
    title: 'Nhắc thói quen',
    body: habit.name,
    data: { url: '/(tabs)/habits', kind: 'habit', habitId: habit.id },
  }
}

async function configureChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'FocusFlow timers',
    description: 'Thông báo khi phiên tập trung hoặc giờ nghỉ kết thúc.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#2f6f59',
  })
}

export const notificationService = {
  setup: async () => {
    if (Platform.OS === 'web') return
    await configureChannel()
  },

  permission: async (): Promise<LocalNotificationPermission> => {
    if (Platform.OS === 'web') return 'unsupported'
    const result = await Notifications.getPermissionsAsync()
    if (result.granted) return 'granted'
    if (result.status === Notifications.PermissionStatus.DENIED) return 'denied'
    return 'undetermined'
  },

  requestPermission: async (): Promise<LocalNotificationPermission> => {
    if (Platform.OS === 'web') return 'unsupported'
    await configureChannel()
    const result = await Notifications.requestPermissionsAsync()
    if (result.granted) return 'granted'
    if (result.status === Notifications.PermissionStatus.DENIED) return 'denied'
    return 'undetermined'
  },

  syncFocus: (session: FocusSession | null, enabled: boolean) => runSerialized(async () => {
    const ids = await readIds()
    await cancelIdentifiers([ids.focus])
    ids.focus = null
    if (enabled && session?.status === 'RUNNING' && Date.parse(session.expectedEndAt) > Date.now() && await isGranted()) {
      ids.focus = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Phiên tập trung đã kết thúc',
          body: session.taskTitle || session.habitName || session.projectName || 'Đã đến lúc nghỉ một chút.',
          data: { url: '/(tabs)/focus', kind: 'focus', sessionId: session.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(session.expectedEndAt),
          channelId: channelId(),
        },
      })
    }
    await writeIds(ids)
  }),

  syncBreak: (expectedEndAt: string | null, enabled: boolean) => runSerialized(async () => {
    const ids = await readIds()
    await cancelIdentifiers([ids.break])
    ids.break = null
    if (enabled && expectedEndAt && Date.parse(expectedEndAt) > Date.now() && await isGranted()) {
      ids.break = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Giờ nghỉ đã kết thúc',
          body: 'Bạn có thể bắt đầu nhịp tập trung tiếp theo.',
          data: { url: '/(tabs)/focus', kind: 'break' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(expectedEndAt),
          channelId: channelId(),
        },
      })
    }
    await writeIds(ids)
  }),

  syncHabits: (habits: Habit[], enabled: boolean) => runSerialized(async () => {
    const ids = await readIds()
    await cancelIdentifiers(ids.habits)
    ids.habits = []
    if (!enabled || !(await isGranted())) {
      await writeIds(ids)
      return
    }

    for (const habit of habits.filter((item) => !item.archivedAt && item.reminderTime)) {
      const time = parseReminderTime(habit.reminderTime)
      if (!time || ids.habits.length >= MAX_HABIT_NOTIFICATIONS) continue
      if (habit.scheduleType === 'DAILY') {
        ids.habits.push(await Notifications.scheduleNotificationAsync({
          content: notificationContent(habit),
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...time, channelId: channelId() },
        }))
        continue
      }
      if (habit.scheduleType === 'WEEKDAYS' && habit.weekdays?.length) {
        for (const isoWeekday of habit.weekdays) {
          if (ids.habits.length >= MAX_HABIT_NOTIFICATIONS) break
          ids.habits.push(await Notifications.scheduleNotificationAsync({
            content: notificationContent(habit),
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: (isoWeekday % 7) + 1,
              ...time,
              channelId: channelId(),
            },
          }))
        }
        continue
      }
      if (habit.scheduledToday) {
        const today = new Date()
        today.setHours(time.hour, time.minute, 0, 0)
        if (today.getTime() > Date.now()) {
          ids.habits.push(await Notifications.scheduleNotificationAsync({
            content: notificationContent(habit),
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: today,
              channelId: channelId(),
            },
          }))
        }
      }
    }
    await writeIds(ids)
  }),

  cancelAll: () => runSerialized(async () => {
    const ids = await readIds()
    await cancelIdentifiers([ids.focus, ids.break, ...ids.habits])
    await AsyncStorage.removeItem(STORAGE_KEY)
  }),
}

