import { useMutation, useQueryClient } from '@tanstack/react-query'
import { analyticsKeys } from '@/services/analyticsService'
import { habitKeys, habitService } from '@/services/habitService'

export function useHabitProgress(today: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ habitId, value }: { habitId: string; value: number }) => {
      if (value <= 0) {
        await habitService.removeEntry(habitId, today)
        return null
      }
      return habitService.setEntry(habitId, today, { value, note: '' })
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: habitKeys.all }),
        queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboard(today) }),
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        queryClient.invalidateQueries({ queryKey: habitKeys.detailRoot(variables.habitId) }),
      ])
    },
  })
}
