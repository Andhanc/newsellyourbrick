import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Link, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiFetch, resolveMediaUrl } from '../../src/api/client'
import { colors } from '../../src/theme/tokens'

type ArticleDetail = {
  title?: string
  lead?: string
  excerpt?: string
  body?: string
  image?: string
  sections?: Array<{ title?: string; body?: string }>
}

export default function NewsArticleRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const insets = useSafeAreaInsets()
  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!slug) return
      setLoading(true)
      try {
        const data = await apiFetch<any>(`/news/articles/${encodeURIComponent(String(slug))}`)
        const next = data?.data || data
        if (!cancelled) setArticle(next)
      } catch (e) {
        if (!cancelled) setError((e as { message?: string })?.message || 'Статья не найдена')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/news" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>Статья</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.mdSky} /></View>
      ) : error || !article ? (
        <View style={styles.center}><Text style={styles.error}>{error || 'Не найдено'}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          {!!article.image && (
            <Image source={{ uri: resolveMediaUrl(article.image) }} style={styles.hero} contentFit="cover" />
          )}
          <Text style={styles.headline}>{article.title || slug}</Text>
          {!!(article.lead || article.excerpt) && (
            <Text style={styles.lead}>{article.lead || article.excerpt}</Text>
          )}
          {!!article.body && <Text style={styles.text}>{article.body}</Text>}
          {(article.sections || []).map((s, i) => (
            <View key={`${s.title}-${i}`} style={styles.section}>
              {!!s.title && <Text style={styles.sectionTitle}>{s.title}</Text>}
              {!!s.body && <Text style={styles.text}>{s.body}</Text>}
            </View>
          ))}
        </ScrollView>
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
  error: { color: '#b91c1c' },
  body: { paddingBottom: 40 },
  hero: { width: '100%', height: 220, backgroundColor: '#f8fafc' },
  headline: { marginTop: 18, paddingHorizontal: 18, fontFamily: 'Montserrat_700Bold', fontSize: 26, lineHeight: 32, fontWeight: '700', color: colors.ink },
  lead: { marginTop: 12, paddingHorizontal: 18, fontFamily: 'Montserrat_400Regular', fontSize: 16, lineHeight: 24, color: colors.inkMuted },
  text: { marginTop: 14, paddingHorizontal: 18, fontFamily: 'Montserrat_400Regular', fontSize: 15, lineHeight: 24, color: colors.inkSoft },
  section: { marginTop: 18 },
  sectionTitle: { paddingHorizontal: 18, fontFamily: 'Montserrat_700Bold', fontSize: 18, fontWeight: '700', color: colors.ink },
})
