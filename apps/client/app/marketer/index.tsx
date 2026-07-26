import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../../src/theme/tokens'

export default function MarketerUnavailable() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Marketer</Text>
      <Text style={styles.lead}>Панель маркетолога — только Expo Web (срез D).</Text>
      <Link href="/" asChild>
        <Pressable style={styles.btn}><Text style={styles.btnText}>На главную</Text></Pressable>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 24, fontWeight: '700', color: colors.ink },
  lead: { marginTop: 10, textAlign: 'center', color: colors.inkMuted, fontFamily: 'Montserrat_400Regular', lineHeight: 22 },
  btn: { marginTop: 20, backgroundColor: colors.mdSky, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
})
