import { useLocalSearchParams } from 'expo-router'
import { PropertyCatalogScreen } from '../src/components/PropertyCatalogScreen'

export default function SearchResultsRoute() {
  const { q } = useLocalSearchParams<{ q?: string }>()
  return <PropertyCatalogScreen title={q ? `Поиск: ${q}` : 'Поиск'} filter="all" query={typeof q === 'string' ? q : ''} />
}
