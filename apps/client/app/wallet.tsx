import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../src/auth/session'
import { apiFetch } from '../src/api/client'
import { colors, rounded } from '../src/theme/tokens'

type DepositInfo = {
  depositAmount?: number
  minAuctionDepositEur?: number
  canParticipateInAuction?: boolean
}

export default function WalletRoute() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams<{ session_id?: string }>()
  const [info, setInfo] = useState<DepositInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch<DepositInfo>(`/users/${encodeURIComponent(String(user.id))}/deposit`)
      setInfo(data)
    } catch (e) {
      setNote((e as { message?: string })?.message || 'Не удалось загрузить баланс')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!user?.id || !params.session_id) return
    let cancelled = false
    ;(async () => {
      try {
        const result = await apiFetch<{ credited?: boolean; already?: boolean; amountEur?: number }>(
          '/billing/confirm-wallet-deposit',
          {
            method: 'POST',
            body: JSON.stringify({ session_id: params.session_id, userId: user.id }),
          },
        )
        if (cancelled) return
        if (result.already) setNote('Депозит уже был зачислен')
        else if (result.credited) setNote(`Зачислено €${result.amountEur ?? ''}`)
        await load()
      } catch (e) {
        if (!cancelled) setNote((e as { message?: string })?.message || 'Ошибка подтверждения оплаты')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params.session_id, user?.id, load])

  const topUpStripe = async () => {
    if (!user?.id) {
      router.push('/login')
      return
    }
    setBusy(true)
    setNote(null)
    try {
      const result = await apiFetch<{ url?: string }>('/billing/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'deposit',
          userId: user.id,
          customerEmail: user.email,
          returnPath: '/wallet',
        }),
      })
      if (result.url) {
        await Linking.openURL(result.url)
      } else {
        setNote('Checkout URL не получен')
      }
    } catch (e) {
      setNote((e as { message?: string })?.message || 'Не удалось открыть Stripe')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/profile" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>Кошелёк</Text>
        <View style={{ width: 40 }} />
      </View>
      {!user ? (
        <View style={styles.body}>
          <Text style={styles.note}>Войдите, чтобы видеть депозит и пополнять через Stripe.</Text>
          <Link href="/login" asChild>
            <Pressable style={styles.btn}><Text style={styles.btnText}>Войти</Text></Pressable>
          </Link>
        </View>
      ) : loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.mdSky} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.balanceLabel}>Депозит аукциона</Text>
          <Text style={styles.balance}>
            €{Number(info?.depositAmount ?? 0).toLocaleString('ru-RU')}
          </Text>
          <Text style={styles.meta}>
            Мин. депозит €{Number(info?.minAuctionDepositEur ?? 3000).toLocaleString('ru-RU')}
            {info?.canParticipateInAuction ? ' · можно участвовать' : ' · недостаточно для ставок'}
          </Text>
          {!!note && <Text style={styles.flash}>{note}</Text>}
          <Pressable style={[styles.btn, busy && { opacity: 0.7 }]} disabled={busy} onPress={() => void topUpStripe()}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Пополнить (Stripe)</Text>}
          </Pressable>
          <Text style={styles.hint}>
            После оплаты Stripe вернёт на `/wallet?session_id=…` (web) или deep link `sellyourbrick://wallet`.
          </Text>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  backText: { fontSize: 20, color: '#0f172a' },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 18, fontWeight: '700', color: '#0f172a' },
  body: { padding: 24 },
  balanceLabel: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#64748b' },
  balance: { marginTop: 6, fontFamily: 'Montserrat_700Bold', fontSize: 32, fontWeight: '700', color: colors.tiffany },
  meta: { marginTop: 8, fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#64748b', lineHeight: 20 },
  flash: { marginTop: 14, color: colors.tiffanyDeep, fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
  note: { fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 22, color: '#64748b', marginBottom: 16 },
  btn: { marginTop: 18, backgroundColor: colors.tiffany, borderRadius: rounded.full, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
  hint: { marginTop: 16, fontFamily: 'Montserrat_400Regular', fontSize: 12, lineHeight: 18, color: '#94a3b8' },
})
