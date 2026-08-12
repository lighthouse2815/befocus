import DateTimePicker from '@react-native-community/datetimepicker'
import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { Button } from './ui'
import { colors, radii, spacing, touchTarget, typography } from '@/constants/theme'

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return year && month && day ? new Date(year, month - 1, day, 12) : new Date()
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export function OptionalDateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'chưa chọn'}`} onPress={() => setOpen(true)} style={styles.trigger}>
          <Text style={[styles.value, !value ? styles.placeholder : null]}>{value || 'Chọn ngày'}</Text>
        </Pressable>
        {value ? <Button label="Bỏ" variant="quiet" onPress={() => onChange('')} /> : null}
      </View>
      {open ? <DateTimePicker value={parseDate(value)} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(_, date) => { if (Platform.OS !== 'ios') setOpen(false); if (date) onChange(dateKey(date)) }} /> : null}
      {open && Platform.OS === 'ios' ? <Button label="Xong" variant="quiet" onPress={() => setOpen(false)} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: spacing.x2 },
  label: { ...typography.smallStrong, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.x2 },
  trigger: { flex: 1, minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: spacing.x3, borderRadius: radii.control, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.paperRaised },
  value: { ...typography.body, color: colors.ink },
  placeholder: { color: colors.inkSoft },
})
