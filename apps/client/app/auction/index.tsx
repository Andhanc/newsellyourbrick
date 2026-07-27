import { useLocalSearchParams } from 'expo-router'
import { PropertyCatalogScreen } from '../../src/components/PropertyCatalogScreen'

export default function AuctionScreen() {
  const params = useLocalSearchParams<{ filter?: string; q?: string }>()
  const filterRaw = String(params.filter || '')
  const filter =
    filterRaw === 'auction' || filterRaw === 'buy_now' ? filterRaw : 'all'

  return (
    <PropertyCatalogScreen
      title={filter === 'buy_now' ? 'Купить сейчас' : 'Аукцион'}
      filter={filter as 'all' | 'auction' | 'buy_now'}
      query={String(params.q || '')}
    />
  )
}
