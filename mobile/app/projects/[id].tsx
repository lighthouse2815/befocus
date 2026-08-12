import { useLocalSearchParams } from 'expo-router'
import { ProjectDetailScreen } from '@/screens/ProjectDetailScreen'

export default function ProjectDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ProjectDetailScreen id={id} />
}
