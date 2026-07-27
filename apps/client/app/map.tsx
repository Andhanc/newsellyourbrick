import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../src/theme/tokens'

export default function MapRoute() {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>Карта</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.body}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>MapLibre</Text>
        </View>
        <Text style={styles.note}>
          Web: maplibre-gl · Android: @maplibre/maplibre-react-native (spike в срезе A).
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  backText: { fontSize: 20 },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 18, fontWeight: '700' },
  body: { flex: 1, padding: 14 },
  mapPlaceholder: { flex: 1, borderRadius: 16, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', minHeight: 320 },
  mapText: { fontFamily: 'Montserrat_700Bold', fontSize: 18, color: colors.inkMuted, fontWeight: '700' },
  note: { marginTop: 12, fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#64748b', lineHeight: 20 },
})
