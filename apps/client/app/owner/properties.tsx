import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../src/auth/session'
import { apiFetch } from '../../src/api/client'
import { CatalogProperty, PropertyCard } from '../../src/components/PropertyCard'
import { colors, rounded } from '../../src/theme/tokens'

export default function OwnerPropertiesRoute() {
  const insets = useSafeAreaInsets()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<CatalogProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<any>(`/properties/user/${encodeURIComponent(String(user.id))}`)
      const list: CatalogProperty[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : []
      setItems(list)
    } catch (e) {
      setError((e as { message?: string })?.message || 'Не удалось загрузить объекты')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  if (authLoading) {
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
          <Link href="/owner" asChild>
            <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
          </Link>
          <Text style={styles.title}>Мои объекты</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.empty}>Нужен вход продавца</Text>
          <Pressable style={styles.retry} onPress={() => router.push('/login')}>
            <Text style={styles.retryText}>Войти</Text>
          </Pressable>
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
        <Text style={styles.title}>Мои объекты</Text>
        <Link href="/owner/property/new" asChild>
          <Pressable style={styles.add}><Text style={styles.addText}>+</Text></Pressable>
        </Link>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.mdSky} /></View>
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
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Text style={styles.empty}>Пока нет объектов</Text>}
          renderItem={({ item }) => <PropertyCard item={item} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
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
  add: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tiffany,
  },
  addText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
  backText: { fontSize: 20, color: colors.ink },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 18, fontWeight: '700', color: colors.ink },
  empty: { textAlign: 'center', color: colors.inkMuted, marginBottom: 12 },
  error: { color: '#b91c1c', textAlign: 'center', marginBottom: 12 },
  retry: {
    backgroundColor: colors.mdSky,
    borderRadius: rounded.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
})
