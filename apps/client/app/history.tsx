import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../src/auth/session'
import { apiFetch } from '../src/api/client'
import { colors, rounded } from '../src/theme/tokens'

type Tx = {
  id?: string | number
  type?: string
  amount?: number
  created_at?: string
  description?: string
}

export default function HistoryRoute() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch<any>(`/users/${encodeURIComponent(String(user.id))}/transactions`)
      const list = Array.isArray(data) ? data : data?.data || data?.transactions || []
      setItems(list)
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
        <Text style={styles.title}>История</Text>
        <View style={{ width: 40 }} />
      </View>
      {!user ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Войдите, чтобы видеть транзакции</Text>
          <Pressable style={styles.btn} onPress={() => router.push('/login')}>
            <Text style={styles.btnText}>Войти</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.mdSky} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id || i)}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Text style={styles.empty}>Пока нет операций</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.description || item.type || 'Операция'}</Text>
                <Text style={styles.meta}>{item.created_at || ''}</Text>
              </View>
              <Text style={styles.amount}>€{Number(item.amount || 0).toLocaleString('ru-RU')}</Text>
            </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { textAlign: 'center', color: '#64748b', marginBottom: 12 },
  btn: { backgroundColor: colors.tiffany, borderRadius: rounded.full, paddingHorizontal: 18, paddingVertical: 12 },
  btnText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rounded.lg, padding: 14, marginBottom: 10 },
  rowTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 14, fontWeight: '700', color: colors.ink },
  meta: { marginTop: 4, fontFamily: 'Montserrat_400Regular', fontSize: 12, color: '#64748b' },
  amount: { fontFamily: 'Montserrat_700Bold', fontSize: 14, fontWeight: '700', color: colors.tiffany },
})
