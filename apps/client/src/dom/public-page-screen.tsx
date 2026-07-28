import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'

import PublicPage from './public-page.dom'

type PublicPageScreenProps = {
  initialPath: string
}

export function PublicPageScreen({ initialPath }: PublicPageScreenProps) {
  return (
    <View style={styles.screen}>
      <StatusBar hidden />
      <PublicPage
        initialPath={initialPath}
        dom={{
          contentInsetAdjustmentBehavior: 'never',
          style: styles.dom,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  dom: {
    flex: 1,
    backgroundColor: '#fff',
  },
})
