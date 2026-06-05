import OwnerTestCabinetLayout from '../components/OwnerTestCabinetLayout'
import OwnerTestPage from './OwnerTestPage'

/** Единая точка входа /owner-test — один lazy-чанк без вложенного Suspense/lazy. */
export default function OwnerTestRoute() {
  return (
    <OwnerTestCabinetLayout>
      <OwnerTestPage />
    </OwnerTestCabinetLayout>
  )
}
