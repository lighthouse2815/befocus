import { useLocalSearchParams } from 'expo-router'
import { HabitFormScreen } from '@/screens/HabitFormScreen'

export default function EditHabitRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <HabitFormScreen id={id} />
}
