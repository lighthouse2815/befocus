import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, useFonts } from '@expo-google-fonts/dm-sans'
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono'
import { AppProviders } from '@/components/AppProviders'
import { LoadingScreen } from '@/components/LoadingScreen'
import { colors } from '@/constants/theme'
import { useAuthStore } from '@/store/authStore'

void SplashScreen.preventAutoHideAsync()

function RootNavigator() {
  const status = useAuthStore((state) => state.status)
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
    IBMPlexMono_500Medium,
  })
  const ready = (fontsLoaded || Boolean(fontError)) && status !== 'loading'

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return <LoadingScreen />

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="habits" />
        <Stack.Screen name="projects" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  )
}
