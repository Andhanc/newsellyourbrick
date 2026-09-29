import { useLocalSearchParams } from 'expo-router'
import { PublicPageScreen } from '../../src/dom/public-page-screen'
export default function DevelopmentRoute() { const { slug } = useLocalSearchParams<{ slug: string }>(); return <PublicPageScreen initialPath={`/development/${encodeURIComponent(slug)}`} /> }
