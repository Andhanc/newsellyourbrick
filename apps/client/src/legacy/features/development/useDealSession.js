import { useEffect, useState } from 'react'
import { getMobileAuthToken, CLERK_DB_USER_SYNCED } from '../../services/authService'
export default function useDealSession() {
  const [session, setSession] = useState(getMobileAuthToken)
  useEffect(() => {
    const sync = () => setSession(getMobileAuthToken())
    const events = [CLERK_DB_USER_SYNCED, 'storage', 'focus']
    for (const event of events) window.addEventListener(event, sync)
    return () => {
      for (const event of events) window.removeEventListener(event, sync)
    }
  }, [])
  return session
}
