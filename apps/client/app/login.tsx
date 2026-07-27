import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../src/auth/session'
import { colors, rounded } from '../src/theme/tokens'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async () => {
    setBusy(true)
    setError(null)
    try {
      const user =
        mode === 'login'
          ? await login(email.trim(), password, role)
          : await register({
              email: email.trim(),
              password,
              name: name.trim() || email.split('@')[0],
              role,
            })
      const r = String(user.role || role).toLowerCase()
      if (r === 'seller' || r === 'owner') {
        router.replace('/owner')
      } else if (r === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/profile')
      }
    } catch (e) {
      setError((e as { message?: string })?.message || 'Ошибка авторизации')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 12 }]}>
      <Link href="/" asChild>
        <Pressable style={styles.back}>
          <Text style={styles.backText}>← На главную</Text>
        </Pressable>
      </Link>
      <Text style={styles.brand}>SellYourBrick</Text>
      <Text style={styles.title}>{mode === 'login' ? 'Вход' : 'Регистрация'}</Text>
      <Text style={styles.lead}>Email-кабинет через `/api/auth/email/*`. Clerk JWT — опционально поверх.</Text>

      <View style={styles.tabs}>
        {(['buyer', 'seller'] as const).map((r) => (
          <Pressable key={r} style={[styles.tab, role === r && styles.tabOn]} onPress={() => setRole(r)}>
            <Text style={[styles.tabText, role === r && styles.tabTextOn]}>
              {r === 'buyer' ? 'Покупатель' : 'Продавец'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'register' && (
        <TextInput
          style={styles.input}
          placeholder="Имя"
          placeholderTextColor={colors.inkMuted}
          value={name}
          onChangeText={setName}
        />
      )}
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={colors.inkMuted}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder="Пароль"
        placeholderTextColor={colors.inkMuted}
        value={password}
        onChangeText={setPassword}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={() => void onSubmit()}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</Text>}
      </Pressable>
      <Pressable
        style={styles.link}
        onPress={() => setMode((m) => (m === 'login' ? 'register' : 'login'))}
      >
        <Text style={styles.linkText}>
          {mode === 'login' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Войти'}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 22 },
  back: { marginBottom: 24 },
  backText: { color: colors.tiffany, fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
  brand: {
    fontFamily: 'PlayfairDisplay_700Bold_Italic',
    fontSize: 28,
    color: colors.ink,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  title: {
    marginTop: 18,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  lead: {
    marginTop: 8,
    marginBottom: 18,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkMuted,
  },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  tabOn: { backgroundColor: colors.tiffanySoft, borderColor: colors.tiffany },
  tabText: { fontFamily: 'Montserrat_700Bold', fontSize: 13, fontWeight: '700', color: colors.inkMuted },
  tabTextOn: { color: colors.tiffanyDeep },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: rounded.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
    color: colors.ink,
  },
  error: { color: '#b91c1c', marginBottom: 8, fontFamily: 'Montserrat_400Regular' },
  btn: {
    marginTop: 8,
    backgroundColor: colors.tiffany,
    borderRadius: rounded.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700', fontSize: 15 },
  link: { marginTop: 18, alignItems: 'center' },
  linkText: { color: colors.inkSoft, fontFamily: 'Montserrat_400Regular' },
})
