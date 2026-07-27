import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiFetch, resolveMediaUrl } from '../../src/api/client'
import { useAuth } from '../../src/auth/session'
import { syncFavoriteToServer, toggleCompare, toggleLocalFavorite } from '../../src/platform/lists'
import { colors, rounded } from '../../src/theme/tokens'

type PropertyDetail = {
  id: number | string
  title?: string
  name?: string
  location?: string
  city?: string
  country?: string
  price?: number
  currency?: string
  description?: string
  image?: string
  images?: string[]
  bedrooms?: number
  bathrooms?: number
  area?: number
  sqft?: number
  isAuction?: boolean
  is_auction?: number | boolean
  currentBid?: number
  auction_current_bid?: number
  auction_starting_price?: number
  property_type?: string
  property_table?: string
}

const width = Dimensions.get('window').width

export default function PropertyDetailRoute() {
  const { slugOrId } = useLocalSearchParams<{ slugOrId: string }>()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const router = useRouter()
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [bidAmount, setBidAmount] = useState('')
  const [actionNote, setActionNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!slugOrId) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch<{ success?: boolean; data?: PropertyDetail; error?: string }>(
        `/properties/${encodeURIComponent(String(slugOrId))}?lang=ru`,
      )
      const prop = (result as any).data || (result as any)
      if (!prop?.id && !(result as any).success) {
        throw { message: (result as any).error || 'Объект не найден' }
      }
      setProperty((result as any).data || prop)
    } catch (e) {
      setError((e as { message?: string })?.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [slugOrId])

  useEffect(() => {
    void load()
  }, [load])

  const images = useMemo(() => {
    if (!property) return [] as string[]
    const list = Array.isArray(property.images) ? property.images : []
    const out = list.map((u) => resolveMediaUrl(String(u))).filter(Boolean)
    if (!out.length && property.image) {
      const one = resolveMediaUrl(String(property.image))
      if (one) out.push(one)
    }
    return out
  }, [property])

  const placeBid = async () => {
    if (!property) return
    if (!user?.id) {
      router.push('/login')
      return
    }
    setBusy(true)
    setActionNote(null)
    try {
      await apiFetch('/bids', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          property_id: property.id,
          bid_amount: Number(bidAmount),
          property_table: property.property_table || property.property_type || 'apartment',
        }),
      })
      setActionNote('Ставка принята')
      setBidAmount('')
      await load()
    } catch (e) {
      setActionNote((e as { message?: string })?.message || 'Не удалось сделать ставку')
    } finally {
      setBusy(false)
    }
  }

  const onFavorite = async () => {
    if (!property) return
    const added = await toggleLocalFavorite(property.id)
    if (user?.id) {
      try {
        await syncFavoriteToServer({
          userId: user.id,
          propertyId: property.id,
          propertyTable: property.property_table || property.property_type,
          added,
        })
      } catch {
        /* local already updated */
      }
    }
    setActionNote(added ? 'В избранном' : 'Убрано из избранного')
  }

  const onCompare = async () => {
    if (!property) return
    const added = await toggleCompare(property.id)
    setActionNote(added ? 'Добавлено к сравнению' : 'Убрано из сравнения')
  }

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.mdSky} />
      </View>
    )
  }

  if (error || !property) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.error}>{error || 'Объект не найден'}</Text>
        <Link href="/auction" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>К каталогу</Text>
          </Pressable>
        </Link>
      </View>
    )
  }

  const isAuction =
    property.isAuction === true || property.is_auction === 1 || property.is_auction === true
  const price = isAuction
    ? Number(
        property.currentBid ??
          property.auction_current_bid ??
          property.auction_starting_price ??
          property.price ??
          0,
      )
    : Number(property.price ?? 0)

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/auction" asChild>
          <Pressable style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
        </Link>
        <Text style={styles.topTitle} numberOfLines={1}>
          {property.title || property.name || 'Объект'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width)
            setImageIndex(i)
          }}
        >
          {(images.length ? images : ['']).map((uri, i) =>
            uri ? (
              <Image key={`${uri}-${i}`} source={{ uri }} style={styles.hero} contentFit="cover" />
            ) : (
              <View key={`empty-${i}`} style={[styles.hero, styles.heroFallback]} />
            ),
          )}
        </ScrollView>
        {images.length > 1 && (
          <Text style={styles.counter}>
            {imageIndex + 1} / {images.length}
          </Text>
        )}

        <View style={styles.body}>
          <Text style={styles.kicker}>{isAuction ? 'Аукцион' : 'Купить сейчас'}</Text>
          <Text style={styles.title}>{property.title || property.name}</Text>
          <Text style={styles.loc}>
            {[property.location, property.city, property.country].filter(Boolean).join(', ') || '—'}
          </Text>
          <Text style={styles.price}>
            {price.toLocaleString('ru-RU')} {property.currency || 'EUR'}
          </Text>

          <View style={styles.actions}>
            <Pressable style={styles.chip} onPress={() => void onFavorite()}>
              <Text style={styles.chipText}>★ Избранное</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => void onCompare()}>
              <Text style={styles.chipText}>⇄ Сравнить</Text>
            </Pressable>
          </View>
          {!!actionNote && <Text style={styles.note}>{actionNote}</Text>}

          <View style={styles.specs}>
            {property.bedrooms != null && (
              <Text style={styles.spec}>{property.bedrooms} спален</Text>
            )}
            {property.bathrooms != null && (
              <Text style={styles.spec}>{property.bathrooms} ванных</Text>
            )}
            {(property.area || property.sqft) != null && (
              <Text style={styles.spec}>{property.area || property.sqft} м²</Text>
            )}
          </View>

          {isAuction && (
            <View style={styles.bidBox}>
              <Text style={styles.section}>Сделать ставку</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder={`Больше ${price}`}
                placeholderTextColor="#94a3b8"
                value={bidAmount}
                onChangeText={setBidAmount}
              />
              <Pressable
                style={[styles.btn, busy && { opacity: 0.7 }]}
                disabled={busy || !bidAmount}
                onPress={() => void placeBid()}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Поставить</Text>}
              </Pressable>
            </View>
          )}

          {!!property.description && (
            <>
              <Text style={styles.section}>Описание</Text>
              <Text style={styles.description}>{property.description}</Text>
            </>
          )}
        </View>
        <View style={{ height: 40 + insets.bottom }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
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
  topTitle: {
    flex: 1,
    marginHorizontal: 8,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  hero: { width, height: Math.round(width * 0.72), backgroundColor: colors.surfaceMuted },
  heroFallback: { backgroundColor: '#e2e8f0' },
  counter: {
    position: 'absolute',
    right: 16,
    top: 210,
    backgroundColor: 'rgba(15,23,42,0.55)',
    color: '#fff',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  body: { padding: 18 },
  kicker: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.tiffany,
    fontWeight: '700',
  },
  title: {
    marginTop: 8,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: colors.ink,
  },
  loc: {
    marginTop: 8,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 14,
    color: colors.inkMuted,
  },
  price: {
    marginTop: 14,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    fontWeight: '700',
    color: colors.tiffany,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: rounded.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontFamily: 'Montserrat_700Bold', fontSize: 12, fontWeight: '700', color: colors.ink },
  note: { marginTop: 10, color: colors.tiffanyDeep, fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
  specs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  spec: {
    backgroundColor: colors.tiffanySoft,
    color: colors.tiffanyDeep,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: rounded.full,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  bidBox: { marginTop: 22 },
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
  section: {
    marginTop: 28,
    marginBottom: 10,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  description: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 15,
    lineHeight: 24,
    color: colors.inkSoft,
  },
  error: { color: '#b91c1c', textAlign: 'center', marginBottom: 12 },
  btn: {
    backgroundColor: colors.mdSky,
    borderRadius: rounded.full,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
})
