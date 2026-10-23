import { lazy, Suspense, useEffect, useState } from 'react'

const LoginModalLazy = lazy(() => import('../../components/LoginModal'))

/** Project pages do not mount Header, which is otherwise the only login-modal listener. */
export default function DevelopmentLoginGate() {
  const [open, setOpen] = useState(false)
  const [wizard, setWizard] = useState(false)

  useEffect(() => {
    const openForced = () => {
      try {
        if (sessionStorage.getItem('login_modal_force_open') !== 'true') return
        const wantWizard = sessionStorage.getItem('login_modal_force_wizard') === 'true'
        sessionStorage.removeItem('login_modal_force_open')
        sessionStorage.removeItem('login_modal_force_wizard')
        setWizard(wantWizard)
        setOpen(true)
      } catch {
        setOpen(true)
      }
    }
    openForced()
    window.addEventListener('forceOpenLoginModal', openForced)
    return () => window.removeEventListener('forceOpenLoginModal', openForced)
  }, [])

  if (!open) return null
  return (
    <Suspense fallback={null}>
      <LoginModalLazy
        isOpen={open}
        onClose={() => setOpen(false)}
        authEntryVariant={wizard ? 'header_wizard' : 'default'}
      />
    </Suspense>
  )
}
