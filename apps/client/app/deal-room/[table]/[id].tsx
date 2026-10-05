import { useLocalSearchParams } from 'expo-router'
import { PublicPageScreen } from '../../../src/dom/public-page-screen'
export default function DealRoomRoute() { const { table, id } = useLocalSearchParams<{ table: string; id: string }>(); return <PublicPageScreen initialPath={`/deal-room/${encodeURIComponent(table)}/${encodeURIComponent(id)}`} /> }
