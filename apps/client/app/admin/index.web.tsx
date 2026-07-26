import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { apiFetch } from '../../src/api/client'
import { colors, rounded } from '../../src/theme/tokens'

type Stats = {
  properties?: number
  users?: number
  pending?: number
}

/** Expo Web admin shell — slice D progressive port */
export default function AdminWebShell() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const approved = await apiFetch<any>('/properties/approved?lang=ru')
        const list = Array.isArray(approved) ? approved : approved?.data || []
        if (!cancelled) setStats({ properties: list.length })
      } catch {
        if (!cancelled) setStats(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Admin (Expo Web)</Text>
      <Text style={styles.lead}>
        Web-only кабинет. Полный CRM/SEO tooling переносится поэтапно; Android `/admin` остаётся unavailable.
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.mdSky} style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{stats?.properties ?? '—'}</Text>
            <Text style={styles.cardLabel}>Approved listings</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>API</Text>
            <Text style={styles.cardLabel}>Express / Prisma</Text>
          </View>
        </View>
      )}
      <View style={styles.links}>
        {[
          { href: '/auction', label: 'Каталог аукционов' },
          { href: '/news', label: 'Новости' },
          { href: '/marketer', label: 'Marketer shell' },
        ].map((item) => (
          <Link key={item.href} href={item.href as any} asChild>
            <Pressable style={styles.row}>
              <Text style={styles.rowText}>{item.label}</Text>
              <Text style={styles.chev}>→</Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <Link href="/" asChild>
        <Pressable style={styles.btn}>
          <Text style={styles.btnText}>На главную</Text>
        </Pressable>
      </Link>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 24, backgroundColor: '#fff', minHeight: '100%' },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 28, fontWeight: '700', color: colors.ink },
  lead: { marginTop: 10, maxWidth: 520, fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 22, color: colors.inkMuted },
  grid: { flexDirection: 'row', gap: 12, marginTop: 24 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: rounded.lg,
    padding: 16,
  },
  cardValue: { fontFamily: 'Montserrat_700Bold', fontSize: 24, fontWeight: '700', color: colors.tiffany },
  cardLabel: { marginTop: 4, fontFamily: 'Montserrat_400Regular', fontSize: 12, color: colors.inkMuted },
  links: { marginTop: 24, gap: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: rounded.lg,
    padding: 14,
  },
  rowText: { fontFamily: 'Montserrat_700Bold', fontSize: 14, fontWeight: '700', color: colors.ink },
  chev: { color: colors.tiffany },
  btn: { marginTop: 24, alignSelf: 'flex-start', backgroundColor: colors.mdSky, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
})
