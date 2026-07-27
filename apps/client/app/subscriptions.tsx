import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../src/theme/tokens'

export default function SubscriptionsRoute() {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/profile" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>Подписки</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pro</Text>
          <Text style={styles.cardText}>Калькулятор и расширенный доступ</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>VIP</Text>
          <Text style={styles.cardText}>Private Club и закрытые лоты</Text>
        </View>
        <Text style={styles.note}>Оплата через Stripe Checkout — срез B (deep links Android).</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  backText: { fontSize: 20 },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 18, fontWeight: '700' },
  body: { padding: 18, gap: 12 },
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16 },
  cardTitle: { fontFamily: 'Montserrat_700Bold', fontSize: 18, fontWeight: '700', color: colors.tiffany },
  cardText: { marginTop: 6, fontFamily: 'Montserrat_400Regular', fontSize: 14, color: '#64748b' },
  note: { marginTop: 8, fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#64748b', lineHeight: 20 },
})
