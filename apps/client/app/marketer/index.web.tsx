import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { colors, rounded } from '../../src/theme/tokens'

export default function MarketerWebShell() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Marketer (Expo Web)</Text>
      <Text style={styles.lead}>
        News ads / campaign tooling. Android недоступен — используйте web. Legacy Vite `/marketer` остаётся эталоном до полного порта.
      </Text>
      <Link href="/news" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowText}>Публичные новости</Text>
          <Text style={styles.chev}>→</Text>
        </Pressable>
      </Link>
      <Link href="/admin" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowText}>Admin shell</Text>
          <Text style={styles.chev}>→</Text>
        </Pressable>
      </Link>
      <Link href="/" asChild>
        <Pressable style={styles.btn}>
          <Text style={styles.btnText}>На главную</Text>
        </Pressable>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 28, fontWeight: '700', color: colors.ink },
  lead: { marginTop: 10, maxWidth: 480, fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 22, color: colors.inkMuted, marginBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: rounded.lg,
    padding: 14,
    marginBottom: 10,
  },
  rowText: { fontFamily: 'Montserrat_700Bold', fontSize: 14, fontWeight: '700', color: colors.ink },
  chev: { color: colors.tiffany },
  btn: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: colors.mdSky, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
})
