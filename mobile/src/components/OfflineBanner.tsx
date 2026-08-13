import { useNetInfo } from '@react-native-community/netinfo'
import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '@/constants/theme'

export function OfflineBanner() {
  const network = useNetInfo()
  const offline = network.isConnected === false || network.isInternetReachable === false
  if (!offline) return null
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <Text style={styles.title}>Đang ngoại tuyến</Text>
      <Text style={styles.body}>Dữ liệu đã tải vẫn hiển thị; thao tác cần máy chủ sẽ khả dụng khi có mạng.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.amberWash, borderBottomWidth: 1, borderBottomColor: '#e7c880', paddingHorizontal: spacing.x4, paddingVertical: spacing.x2 },
  title: { ...typography.smallStrong, color: colors.amber },
  body: { ...typography.small, color: colors.ink },
})
