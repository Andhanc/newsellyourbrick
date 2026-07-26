import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiFetch } from '../api/client'
import { CatalogProperty, PropertyCard } from './PropertyCard'
import { colors, rounded } from '../theme/tokens'

type FilterMode = 'all' | 'auction' | 'buy_now' | 'debts' | 'shares'

function applyFilter(list: CatalogProperty[], mode: FilterMode, q?: string) {
  let next = list
  if (mode === 'auction') {
    next = next.filter((p) => p.isAuction === true || p.is_auction === 1 || p.is_auction === true)
  } else if (mode === 'buy_now') {
    next = next.filter((p) => !(p.isAuction === true || p.is_auction === 1 || p.is_auction === true))
  } else if (mode === 'debts') {
    next = next.filter((p) => String(p.sale_type || '').toLowerCase().includes('debt') || String(p.property_type || '').toLowerCase().includes('debt'))
  } else if (mode === 'shares') {
    next = next.filter((p) => String(p.sale_type || '').toLowerCase() === 'share' || String((p as any).is_shared_ownership) === '1')
  }
  const query = String(q || '').trim().toLowerCase()
  if (query) {
    next = next.filter((p) => `${p.title || ''} ${p.name || ''} ${p.location || ''}`.toLowerCase().includes(query))
  }
  return next
}

export function PropertyCatalogScreen({
  title,
  filter = 'all',
  query,
}: {
  title: string
  filter?: FilterMode
  query?: string
}) {
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<CatalogProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ success?: boolean; data?: CatalogProperty[] } | CatalogProperty[]>(
        '/properties/approved?lang=ru',
      )
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as { data?: CatalogProperty[] }).data)
          ? (data as { data: CatalogProperty[] }).data
          : []
      setItems(applyFilter(list, filter, query))
    } catch (e) {
      setError((e as { message?: string })?.message || 'Не удалось загрузить каталог')
    } finally {
      setLoading(false)
    }
  }, [filter, query])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/" asChild>
          <Pressable style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
        </Link>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.mdSky} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>Повторить</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.id}-${item.slug || item.property_type || 'x'}-${index}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Объектов пока нет</Text>}
          renderItem={({ item }) => <PropertyCard item={item} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
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
  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#b91c1c', textAlign: 'center', marginBottom: 12 },
  retry: {
    backgroundColor: colors.mdSky,
    borderRadius: rounded.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  list: { padding: 14 },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: 40 },
})
