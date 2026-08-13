import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat'
import {
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display'
import { View, ActivityIndicator } from 'react-native'
import { AuthProvider } from '../src/auth/session'
import { colors } from '../src/theme/tokens'
import { PushNotificationsProvider } from '../src/notifications/push-provider'

export default function RootLayout() {
  const [loaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    PlayfairDisplay_700Bold_Italic,
  })

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mdSky }}>
        <ActivityIndicator color="#ffffff" />
      </View>
    )
  }

  return (
    <AuthProvider>
      <PushNotificationsProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      </PushNotificationsProvider>
    </AuthProvider>
  )
}
