import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useAuth } from '../auth/session'
import { apiFetch, resolveMediaUrl } from '../api/client'
import { storage } from '../platform/storage'
import { colors, rounded } from '../theme/tokens'
import { CatalogProperty, propertyHref, propertyPriceLabel } from '../components/PropertyCard'

type FavRow = { property_id: number | string; property_table?: string }

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [items, setItems] = useState<CatalogProperty[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<any>('/properties/approved?lang=ru')
      const list: CatalogProperty[] = Array.isArray(data) ? data : data?.data || []
      let ids = new Set<string>()

      if (user?.id) {
        try {
          const favs = await apiFetch<FavRow[]>(`/users/${encodeURIComponent(String(user.id))}/favorites`)
          ids = new Set((Array.isArray(favs) ? favs : []).map((f) => String(f.property_id)))
        } catch {
          /* fall through to local */
        }
      }

      if (!ids.size) {
        const raw = await storage.getItem('favoritePropertyIds')
        const local: string[] = raw ? JSON.parse(raw) : []
        ids = new Set(local.map(String))
      }

      setItems(list.filter((p) => ids.has(String(p.id)) || ids.has(String(p.slug))))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/profile" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>Избранное</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.mdSky} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {user ? 'Пока пусто. Сохраняйте объекты с карточек каталога.' : 'Войдите, чтобы синхронизировать избранное.'}
            </Text>
          }
          renderItem={({ item }) => {
            const img = item.image ? resolveMediaUrl(String(item.image)) : ''
            return (
              <Link href={propertyHref(item) as any} asChild>
                <Pressable style={styles.card}>
                  {img ? <Image source={{ uri: img }} style={styles.img} contentFit="cover" /> : <View style={[styles.img, styles.fallback]} />}
                  <View style={styles.body}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{item.title || item.name}</Text>
                    <Text style={styles.price}>{propertyPriceLabel(item)}</Text>
                  </View>
                </Pressable>
              </Link>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  backText: { fontSize: 20 },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 18, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40, paddingHorizontal: 24, lineHeight: 22 },
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rounded.lg, overflow: 'hidden', marginBottom: 12 },
  img: { width: '100%', height: 160, backgroundColor: '#f8fafc' },
  fallback: { backgroundColor: '#e2e8f0' },
  body: { padding: 14 },
  cardTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 15, fontWeight: '700', color: colors.ink },
  price: { marginTop: 6, fontFamily: 'Montserrat_700Bold', fontSize: 14, fontWeight: '700', color: colors.tiffany },
})
