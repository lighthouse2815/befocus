import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAppBootstrap } from '@/hooks/useAppBootstrap'
import { FocusSessionSync } from './FocusSessionSync'

function Bootstrap({ children }: { children: React.ReactNode }) {
  useAppBootstrap()
  return <><FocusSessionSync />{children}</>
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnReconnect: true },
      mutations: { retry: 0 },
    },
  }))
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Bootstrap>{children}</Bootstrap>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
