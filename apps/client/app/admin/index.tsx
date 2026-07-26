import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../../src/theme/tokens'

/** Android: admin is web-only */
export default function AdminUnavailable() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Админка</Text>
      <Text style={styles.lead}>
        Админ-панель доступна только в веб-версии SellYourBrick.
      </Text>
      <Link href="/" asChild>
        <Pressable style={styles.btn}>
          <Text style={styles.btnText}>На главную</Text>
        </Pressable>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 24, fontWeight: '700', color: colors.ink },
  lead: { marginTop: 10, textAlign: 'center', fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 22, color: colors.inkMuted },
  btn: { marginTop: 20, backgroundColor: colors.mdSky, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
})
