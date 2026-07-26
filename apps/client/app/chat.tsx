import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Link } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiFetch } from '../src/api/client'
import { colors, rounded } from '../src/theme/tokens'

type Msg = { id: string; role: 'user' | 'assistant'; text: string }

export default function ChatRoute() {
  const insets = useSafeAreaInsets()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Спросите про объекты, аукционы или депозит — я подскажу по SellYourBrick.',
    },
  ])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setBusy(true)
    try {
      const result = await apiFetch<any>('/ai/intelligence-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.text })),
        }),
      })
      const reply =
        result?.reply ||
        result?.message ||
        result?.data?.reply ||
        result?.choices?.[0]?.message?.content ||
        'Ответ получен. Уточните запрос, если нужно.'
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: 'assistant', text: String(reply) }])
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: (e as { message?: string })?.message || 'AI временно недоступен',
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Link href="/profile" asChild>
          <Pressable style={styles.back}><Text style={styles.backText}>←</Text></Pressable>
        </Link>
        <Text style={styles.title}>AI Chat</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.bot]}>
            <Text style={[styles.bubbleText, item.role === 'user' && styles.userText]}>{item.text}</Text>
          </View>
        )}
      />
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Сообщение…"
          placeholderTextColor="#94a3b8"
          onSubmitEditing={() => void send()}
        />
        <Pressable style={styles.send} onPress={() => void send()} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>→</Text>}
        </Pressable>
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
  list: { padding: 14, gap: 10 },
  bubble: { maxWidth: '88%', borderRadius: rounded.lg, paddingHorizontal: 14, paddingVertical: 12 },
  user: { alignSelf: 'flex-end', backgroundColor: colors.tiffany },
  bot: { alignSelf: 'flex-start', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  bubbleText: { fontFamily: 'Montserrat_400Regular', fontSize: 14, lineHeight: 21, color: colors.ink },
  userText: { color: '#fff' },
  composer: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2e8f0' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: rounded.full, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Montserrat_400Regular', fontSize: 15, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.tiffany, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
})
