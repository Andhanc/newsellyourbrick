import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, rounded } from '../src/theme/tokens'

export default function BuyerLanding() {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.brand}>SellYourBrick</Text>
      <Text style={styles.title}>Для покупателей</Text>
      <Text style={styles.lead}>Аукционы, buy now, доли и объекты с долгами — в одном кабинете.</Text>
      <Link href="/auction" asChild>
        <Pressable style={styles.btn}><Text style={styles.btnText}>Смотреть аукционы</Text></Pressable>
      </Link>
      <Link href="/login" asChild>
        <Pressable style={styles.link}><Text style={styles.linkText}>Войти как покупатель</Text></Pressable>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 22 },
  brand: { fontFamily: 'PlayfairDisplay_700Bold_Italic', fontSize: 28, fontStyle: 'italic', fontWeight: '700', color: colors.ink },
  title: { marginTop: 18, fontFamily: 'Montserrat_700Bold', fontSize: 26, fontWeight: '700', color: colors.ink },
  lead: { marginTop: 10, fontFamily: 'Montserrat_400Regular', fontSize: 15, lineHeight: 23, color: colors.inkMuted },
  btn: { marginTop: 28, backgroundColor: colors.tiffany, borderRadius: rounded.full, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.tiffany, fontFamily: 'Montserrat_700Bold', fontWeight: '700' },
})
