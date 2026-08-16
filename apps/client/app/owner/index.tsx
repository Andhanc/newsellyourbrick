import { Redirect } from 'expo-router'

/** Keep the legacy /owner deep link aligned with the current web seller cabinet. */
export default function OwnerHomeRedirect() {
  return <Redirect href={'/owner-test' as never} />
}
