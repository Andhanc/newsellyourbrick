import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useMemo, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, rounded } from '../src/theme/tokens'

export default function CalculatorRoute() {
  const insets = useSafeAreaInsets()
  const [price, setPrice] = useState('250000')
  const [down, setDown] = useState('20')
  const [rate, setRate] = useState('3.5')
  const [years, setYears] = useState('25')

  const monthly = useMemo(() => {
    const p = Number(price) || 0
    const d = Math.min(100, Math.max(0, Number(down) || 0)) / 100
    const principal = p * (1 - d)
    const r = (Number(rate) || 0) / 100 / 12
    const n = (Number(years) || 1) * 12
    if (principal <= 0 || n <= 0) return 0
    if (r === 0) return principal / n
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  }, [price, down, rate, years])

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>Калькулятор</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.body}>
        <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} placeholder="Цена EUR" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} keyboardType="numeric" value={down} onChangeText={setDown} placeholder="Первый взнос %" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} keyboardType="numeric" value={rate} onChangeText={setRate} placeholder="Ставка %" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} keyboardType="numeric" value={years} onChangeText={setYears} placeholder="Срок лет" placeholderTextColor="#94a3b8" />
        <Text style={styles.label}>Ежемесячный платёж</Text>
        <Text style={styles.result}>€{Math.round(monthly).toLocaleString('ru-RU')}</Text>
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
  body: { padding: 18 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rounded.lg, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 12, fontFamily: 'Montserrat_400Regular', fontSize: 15, color: colors.ink },
  label: { marginTop: 8, fontFamily: 'Montserrat_400Regular', fontSize: 13, color: '#64748b' },
  result: { marginTop: 6, fontFamily: 'Montserrat_700Bold', fontSize: 32, fontWeight: '700', color: colors.tiffany },
})
