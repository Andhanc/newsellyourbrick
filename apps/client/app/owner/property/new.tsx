import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../../src/auth/session'
import { apiFetch } from '../../../src/api/client'
import { colors, rounded } from '../../../src/theme/tokens'

const STEPS = ['Basics', 'Location', 'Pricing', 'Review'] as const

type Draft = {
  title: string
  property_type: 'apartment' | 'house' | 'villa' | 'commercial'
  city: string
  country: string
  address: string
  price: string
  bedrooms: string
  bathrooms: string
  area: string
  description: string
}

const INITIAL: Draft = {
  title: '',
  property_type: 'apartment',
  city: '',
  country: 'Spain',
  address: '',
  price: '',
  bedrooms: '',
  bathrooms: '',
  area: '',
  description: '',
}

export default function AddPropertyRoute() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(INITIAL)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneId, setDoneId] = useState<string | number | null>(null)

  const canNext = useMemo(() => {
    if (step === 0) return draft.title.trim().length > 2
    if (step === 1) return draft.city.trim().length > 1
    if (step === 2) return Number(draft.price) > 0
    return true
  }, [step, draft])

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const submit = async () => {
    if (!user?.id) {
      router.push('/login')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('user_id', String(user.id))
      body.append('property_type', draft.property_type)
      body.append('title', draft.title.trim())
      body.append('city', draft.city.trim())
      body.append('country', draft.country.trim())
      body.append('address', draft.address.trim())
      body.append('price', String(Number(draft.price) || 0))
      body.append('bedrooms', String(Number(draft.bedrooms) || 0))
      body.append('bathrooms', String(Number(draft.bathrooms) || 0))
      body.append('area', String(Number(draft.area) || 0))
      body.append('description', draft.description.trim())
      body.append('sale_type', 'buy_now')

      const result = await apiFetch<{ data?: { id?: number | string }; message?: string; error?: string }>(
        '/properties',
        { method: 'POST', body },
      )
      setDoneId(result?.data?.id ?? 'ok')
    } catch (e) {
      setError((e as { message?: string })?.message || 'Не удалось создать объект')
    } finally {
      setBusy(false)
    }
  }

  if (doneId != null) {
    return (
      <View style={[styles.wrap, { paddingTop: insets.top }]}>
        <View style={styles.body}>
          <Text style={styles.doneTitle}>Отправлено на модерацию</Text>
          <Text style={styles.note}>
            Объект создан{doneId !== 'ok' ? ` (#${doneId})` : ''}. Media/docs/verification steps можно дополнить позже.
          </Text>
          <Link href="/owner/properties" asChild>
            <Pressable style={styles.btn}><Text style={styles.btnText}>К моим объектам</Text></Pressable>
          </Link>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/owner" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>Новый объект</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.step}>
          Шаг {step + 1} · {STEPS[step]}
        </Text>
        <View style={styles.progress}>
          {STEPS.map((_, i) => (
            <View key={STEPS[i]} style={[styles.dot, i <= step && styles.dotOn]} />
          ))}
        </View>

        {step === 0 && (
          <>
            <TextInput style={styles.input} placeholder="Название" placeholderTextColor="#94a3b8" value={draft.title} onChangeText={(v) => setField('title', v)} />
            <View style={styles.types}>
              {(['apartment', 'house', 'villa', 'commercial'] as const).map((t) => (
                <Pressable key={t} style={[styles.type, draft.property_type === t && styles.typeOn]} onPress={() => setField('property_type', t)}>
                  <Text style={[styles.typeText, draft.property_type === t && styles.typeTextOn]}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput style={[styles.input, styles.area]} placeholder="Описание" placeholderTextColor="#94a3b8" multiline value={draft.description} onChangeText={(v) => setField('description', v)} />
          </>
        )}

        {step === 1 && (
          <>
            <TextInput style={styles.input} placeholder="Город" placeholderTextColor="#94a3b8" value={draft.city} onChangeText={(v) => setField('city', v)} />
            <TextInput style={styles.input} placeholder="Страна" placeholderTextColor="#94a3b8" value={draft.country} onChangeText={(v) => setField('country', v)} />
            <TextInput style={styles.input} placeholder="Адрес" placeholderTextColor="#94a3b8" value={draft.address} onChangeText={(v) => setField('address', v)} />
          </>
        )}

        {step === 2 && (
          <>
            <TextInput style={styles.input} placeholder="Цена EUR" placeholderTextColor="#94a3b8" keyboardType="numeric" value={draft.price} onChangeText={(v) => setField('price', v)} />
            <TextInput style={styles.input} placeholder="Спальни" placeholderTextColor="#94a3b8" keyboardType="numeric" value={draft.bedrooms} onChangeText={(v) => setField('bedrooms', v)} />
            <TextInput style={styles.input} placeholder="Ванные" placeholderTextColor="#94a3b8" keyboardType="numeric" value={draft.bathrooms} onChangeText={(v) => setField('bathrooms', v)} />
            <TextInput style={styles.input} placeholder="Площадь м²" placeholderTextColor="#94a3b8" keyboardType="numeric" value={draft.area} onChangeText={(v) => setField('area', v)} />
          </>
        )}

        {step === 3 && (
          <View style={styles.review}>
            <Text style={styles.reviewLine}>{draft.title}</Text>
            <Text style={styles.reviewMeta}>{draft.property_type} · {draft.city}, {draft.country}</Text>
            <Text style={styles.reviewMeta}>€{Number(draft.price || 0).toLocaleString('ru-RU')}</Text>
            <Text style={styles.reviewMeta}>{draft.bedrooms || 0} bed · {draft.bathrooms || 0} bath · {draft.area || 0} м²</Text>
            {!user && <Text style={styles.warn}>Нужен вход продавца перед отправкой.</Text>}
          </View>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          {step > 0 && (
            <Pressable style={styles.secondary} onPress={() => setStep((s) => s - 1)}>
              <Text style={styles.secondaryText}>Назад</Text>
            </Pressable>
          )}
          {step < STEPS.length - 1 ? (
            <Pressable
              style={[styles.btn, !canNext && styles.btnDisabled]}
              disabled={!canNext}
              onPress={() => setStep((s) => s + 1)}
            >
              <Text style={styles.btnText}>Далее</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.btn, busy && styles.btnDisabled]} disabled={busy} onPress={() => void submit()}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Отправить</Text>}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  backText: { fontSize: 20 },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 18, fontWeight: '700' },
  body: { padding: 18 },
  step: { fontFamily: 'Montserrat_700Bold', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: colors.tiffany, fontWeight: '700' },
  progress: { flexDirection: 'row', gap: 6, marginTop: 12, marginBottom: 18 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0' },
  dotOn: { backgroundColor: colors.tiffany },
  note: { marginTop: 8, marginBottom: 18, fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 21, color: '#64748b' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rounded.lg, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 12, fontFamily: 'Montserrat_400Regular', fontSize: 15, color: colors.ink },
  area: { minHeight: 100, textAlignVertical: 'top' },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  type: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rounded.full, paddingHorizontal: 12, paddingVertical: 8 },
  typeOn: { backgroundColor: colors.tiffanySoft, borderColor: colors.tiffany },
  typeText: { fontFamily: 'Montserrat_700Bold', fontSize: 12, fontWeight: '700', color: '#64748b' },
  typeTextOn: { color: colors.tiffanyDeep },
  review: { gap: 8, marginBottom: 12 },
  reviewLine: { fontFamily: 'Montserrat_700Bold', fontSize: 20, fontWeight: '700', color: colors.ink },
  reviewMeta: { fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#64748b' },
  warn: { marginTop: 8, color: '#b91c1c' },
  error: { color: '#b91c1c', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  secondary: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rounded.full, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontFamily: 'Montserrat_700Bold', fontWeight: '700', color: colors.ink },
  btn: { flex: 2, backgroundColor: colors.tiffany, borderRadius: rounded.full, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
  doneTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 24, fontWeight: '700', color: colors.ink },
})
