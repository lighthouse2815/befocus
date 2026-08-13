import type { ComponentProps } from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Redirect, Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, iconSizes, typography } from '@/constants/theme'
import { useAuthStore } from '@/store/authStore'

type IconName = ComponentProps<typeof Ionicons>['name']

const icons: Record<string, { active: IconName; idle: IconName }> = {
  index: { active: 'today', idle: 'today-outline' },
  habits: { active: 'checkmark-circle', idle: 'checkmark-circle-outline' },
  focus: { active: 'timer', idle: 'timer-outline' },
  projects: { active: 'folder-open', idle: 'folder-open-outline' },
  insights: { active: 'stats-chart', idle: 'stats-chart-outline' },
}

export default function TabLayout() {
  const status = useAuthStore((state) => state.status)
  const insets = useSafeAreaInsets()
  if (status === 'anonymous') return <Redirect href="/login" />

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.mossDark,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { ...typography.small, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.paperRaised,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 66 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarIcon: ({ focused, color }) => {
          const names = icons[route.name] ?? icons.index!
          return <Ionicons name={focused ? names.active : names.idle} size={iconSizes.tab} color={color} />
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Hôm nay' }} />
      <Tabs.Screen name="habits" options={{ title: 'Thói quen' }} />
      <Tabs.Screen name="focus" options={{ title: 'Tập trung' }} />
      <Tabs.Screen name="projects" options={{ title: 'Dự án' }} />
      <Tabs.Screen name="insights" options={{ title: 'Phân tích' }} />
    </Tabs>
  )
}
