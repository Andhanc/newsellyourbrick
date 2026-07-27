import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiFetch, resolveMediaUrl } from '../../src/api/client'
import { Image } from 'expo-image'
import { colors, rounded } from '../../src/theme/tokens'

type Article = {
  id?: string | number
  slug?: string
  title?: string
  excerpt?: string
  image?: string
  date?: string
}

export default function NewsRoute() {
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiFetch<any>('/news/articles')
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : Array.isArray(data?.articles)
              ? data.articles
              : []
        if (!cancelled) setItems(list)
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>Новости</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.mdSky} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.slug || item.id || i)}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Text style={styles.empty}>Пока нет новостей</Text>}
          renderItem={({ item }) => (
            <Link href={(item.slug ? `/news/${item.slug}` : '/news') as any} asChild>
              <Pressable style={styles.card}>
                {!!item.image && (
                  <Image source={{ uri: resolveMediaUrl(item.image) }} style={styles.image} contentFit="cover" />
                )}
                <View style={styles.body}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title || 'Новость'}</Text>
                  {!!item.excerpt && <Text style={styles.excerpt} numberOfLines={3}>{item.excerpt}</Text>}
                </View>
              </Pressable>
            </Link>
          )}
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
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rounded.lg, overflow: 'hidden', marginBottom: 12 },
  image: { width: '100%', height: 160, backgroundColor: '#f8fafc' },
  body: { padding: 14, gap: 6 },
  cardTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 16, fontWeight: '700', color: colors.ink },
  excerpt: { fontFamily: 'Montserrat_400Regular', fontSize: 13, lineHeight: 20, color: colors.inkMuted },
})
