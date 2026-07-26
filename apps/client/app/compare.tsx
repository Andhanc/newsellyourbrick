import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { apiFetch, resolveMediaUrl } from '../src/api/client'
import { CatalogProperty, propertyHref, propertyPriceLabel } from '../src/components/PropertyCard'
import { colors, rounded } from '../src/theme/tokens'
import { storage } from '../src/platform/storage'

export default function CompareRoute() {
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<CatalogProperty[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const raw = await storage.getItem('comparePropertyIds')
      const ids: string[] = raw ? JSON.parse(raw) : []
      const data = await apiFetch<any>('/properties/approved?lang=ru')
      const list: CatalogProperty[] = Array.isArray(data) ? data : data?.data || []
      const setIds = new Set(ids.map(String))
      setItems(list.filter((p) => setIds.has(String(p.id)) || setIds.has(String(p.slug))).slice(0, 4))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/profile" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>Сравнение</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.mdSky} /></View>
      ) : (
        <FlatList
          horizontal
          data={items}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          contentContainerStyle={{ padding: 14, gap: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>Добавьте до 4 объектов в сравнение с карточки объекта.</Text>}
          renderItem={({ item }) => {
            const img = item.image ? resolveMediaUrl(String(item.image)) : ''
            return (
              <Link href={propertyHref(item) as any} asChild>
                <Pressable style={styles.card}>
                  {img ? <Image source={{ uri: img }} style={styles.img} contentFit="cover" /> : <View style={[styles.img, styles.fallback]} />}
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title || item.name}</Text>
                  <Text style={styles.price}>{propertyPriceLabel(item)}</Text>
                  <Text style={styles.meta} numberOfLines={2}>{item.location || '—'}</Text>
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
  empty: { padding: 24, color: '#64748b', lineHeight: 22, maxWidth: 280 },
  card: { width: 220, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rounded.lg, overflow: 'hidden', paddingBottom: 12 },
  img: { width: '100%', height: 130, backgroundColor: '#f8fafc' },
  fallback: { backgroundColor: '#e2e8f0' },
  cardTitle: { marginTop: 10, paddingHorizontal: 12, fontFamily: 'Montserrat_700Bold', fontSize: 14, fontWeight: '700', color: colors.ink },
  price: { marginTop: 6, paddingHorizontal: 12, fontFamily: 'Montserrat_700Bold', fontSize: 13, fontWeight: '700', color: colors.tiffany },
  meta: { marginTop: 4, paddingHorizontal: 12, fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#64748b' },
})
