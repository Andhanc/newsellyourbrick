import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../src/auth/session'
import { colors, rounded } from '../../src/theme/tokens'

const LINKS = [
  { href: '/favorites', label: 'Избранное' },
  { href: '/wallet', label: 'Кошелёк' },
  { href: '/history', label: 'История' },
  { href: '/compare', label: 'Сравнение' },
  { href: '/calculator', label: 'Калькулятор' },
  { href: '/subscriptions', label: 'Подписки' },
  { href: '/chat', label: 'Чат / AI' },
  { href: '/owner', label: 'Кабинет продавца' },
]

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.mdSky} />
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.wrap, { paddingTop: insets.top }]}>
        <View style={styles.top}>
          <Link href="/" asChild>
            <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
          </Link>
          <Text style={styles.title}>Кабинет</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.body}>
          <Text style={styles.lead}>Войдите, чтобы открыть избранное, кошелёк и ставки.</Text>
          <Link href="/login" asChild>
            <Pressable style={styles.primary}>
              <Text style={styles.primaryText}>Войти</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.top}>
        <Link href="/" asChild>
          <Pressable style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
        </Link>
        <Text style={styles.title}>Кабинет</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{user.name || 'Пользователь'}</Text>
        <Text style={styles.meta}>{user.email || '—'} · {user.role || 'client'}</Text>
        {LINKS.map((item) => (
          <Link key={item.href} href={item.href as any} asChild>
            <Pressable style={styles.row}>
              <Text style={styles.rowText}>{item.label}</Text>
              <Text style={styles.chev}>→</Text>
            </Pressable>
          </Link>
        ))}
        <Pressable
          style={styles.logout}
          onPress={async () => {
            await logout()
            router.replace('/login')
          }}
        >
          <Text style={styles.logoutText}>Выйти</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  backText: { fontSize: 20, color: colors.ink },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 18, fontWeight: '700', color: colors.ink },
  body: { padding: 18, gap: 10 },
  name: { fontFamily: 'Montserrat_700Bold', fontSize: 22, fontWeight: '700', color: colors.ink },
  meta: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: colors.inkMuted, marginBottom: 8 },
  lead: { fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 21, color: colors.inkMuted, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  rowText: { fontFamily: 'Montserrat_700Bold', fontSize: 15, fontWeight: '700', color: colors.ink },
  chev: { color: colors.tiffany, fontSize: 18 },
  primary: {
    marginTop: 8,
    backgroundColor: colors.tiffany,
    borderRadius: rounded.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
  logout: { marginTop: 18, alignItems: 'center', paddingVertical: 12 },
  logoutText: { color: '#b91c1c', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
})
