import { create } from 'zustand'

interface NotificationState {
  syncError: string | null
  setSyncError: (message: string | null) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  syncError: null,
  setSyncError: (syncError) => set({ syncError }),
}))
