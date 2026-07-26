import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../src/auth/session'
import { colors, rounded } from '../../src/theme/tokens'

const OWNER_LINKS = [
  { href: '/owner/property/new', label: 'Добавить объект' },
  { href: '/owner/properties', label: 'Мои объекты' },
  { href: '/subscriptions', label: 'Подписки продавца' },
  { href: '/wallet', label: 'Кошелёк' },
]

export default function OwnerHome() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>Кабинет продавца</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.body}>
        <Text style={styles.lead}>
          {user
            ? `${user.name || user.email || 'Продавец'} · wizard Basics→Location→Pricing→Review`
            : 'Войдите как продавец, чтобы публиковать объекты.'}
        </Text>
        {!user && (
          <Link href="/login" asChild>
            <Pressable style={styles.login}>
              <Text style={styles.loginText}>Войти</Text>
            </Pressable>
          </Link>
        )}
        {OWNER_LINKS.map((item) => (
          <Link key={item.href} href={item.href as any} asChild>
            <Pressable style={styles.row}>
              <Text style={styles.rowText}>{item.label}</Text>
              <Text style={styles.chev}>→</Text>
            </Pressable>
          </Link>
        ))}
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
  body: { padding: 18, gap: 10 },
  lead: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#64748b', marginBottom: 8, lineHeight: 21 },
  login: { backgroundColor: colors.tiffany, borderRadius: rounded.full, paddingVertical: 12, alignItems: 'center', marginBottom: 4 },
  loginText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rounded.lg, padding: 16 },
  rowText: { fontFamily: 'Montserrat_700Bold', fontSize: 15, fontWeight: '700', color: colors.ink },
  chev: { color: colors.tiffany, fontSize: 18 },
})
