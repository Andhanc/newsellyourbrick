import { Link } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../src/theme/tokens'

export default function AboutRoute() {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>About</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.display}>SellYourBrick</Text>
        <Text style={styles.lead}>
          Premium brokerage register: photography, calm hierarchy, Tiffany accent. Full About page
          sections migrate next; tokens already match DESIGN.md.
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  backText: { fontSize: 20 },
  title: { fontFamily: 'Montserrat_700Bold', fontSize: 18, fontWeight: '700' },
  body: { padding: 24 },
  display: { fontFamily: 'PlayfairDisplay_700Bold_Italic', fontSize: 40, fontStyle: 'italic', fontWeight: '700', color: colors.ink },
  lead: { marginTop: 16, fontFamily: 'Montserrat_400Regular', fontSize: 16, lineHeight: 26, color: colors.inkSoft },
})
