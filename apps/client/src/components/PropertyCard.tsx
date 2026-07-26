import { Image } from 'expo-image'
import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { resolveMediaUrl } from '../api/client'
import { colors, rounded } from '../theme/tokens'

export type CatalogProperty = {
  id: number | string
  title?: string
  name?: string
  location?: string
  price?: number
  currency?: string
  image?: string
  images?: string[]
  slug?: string
  sale_type?: string
  property_type?: string
  isAuction?: boolean
  is_auction?: number | boolean
  currentBid?: number
  auction_current_bid?: number
  auction_starting_price?: number
}

export function propertyHref(item: CatalogProperty) {
  if (item.slug) return `/property/${item.slug}`
  return `/property/${item.id}`
}

export function propertyImageUrl(item: CatalogProperty) {
  if (Array.isArray(item.images) && item.images[0]) {
    const u = resolveMediaUrl(String(item.images[0]))
    if (u) return u
  }
  if (item.image) {
    const u = resolveMediaUrl(String(item.image))
    if (u) return u
  }
  return ''
}

export function propertyPriceLabel(item: CatalogProperty) {
  const isAuction = item.isAuction === true || item.is_auction === 1 || item.is_auction === true
  const amount = isAuction
    ? Number(item.currentBid ?? item.auction_current_bid ?? item.auction_starting_price ?? item.price ?? 0)
    : Number(item.price ?? 0)
  const currency = item.currency || 'EUR'
  return `${amount.toLocaleString('ru-RU')} ${currency}`
}

export function PropertyCard({ item }: { item: CatalogProperty }) {
  const img = propertyImageUrl(item)
  return (
    <Link href={propertyHref(item) as any} asChild>
      <Pressable style={styles.card}>
        {img ? (
          <Image source={{ uri: img }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.fallback]} />
        )}
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title || item.name || 'Объект'}
          </Text>
          <Text style={styles.loc} numberOfLines={1}>
            {item.location || '—'}
          </Text>
          <Text style={styles.price}>{propertyPriceLabel(item)}</Text>
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: { width: '100%', height: 180, backgroundColor: colors.surfaceMuted },
  fallback: { backgroundColor: '#e2e8f0' },
  body: { padding: 14, gap: 4 },
  title: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  loc: { fontFamily: 'Montserrat_400Regular', fontSize: 13, color: colors.inkMuted },
  price: {
    marginTop: 6,
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    fontWeight: '700',
    color: colors.tiffany,
  },
})
