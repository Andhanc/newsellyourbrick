import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PurchaseSuccessModal from '../components/PurchaseSuccessModal'

const PurchaseSuccessContext = createContext(null)

export function PurchaseSuccessProvider({ children }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [property, setProperty] = useState(null)

  const closePurchaseSuccess = useCallback(() => {
    setIsOpen(false)
    // Safety: sheets can leave body scroll locked if dismiss races with route change.
    if (typeof document !== 'undefined') {
      document.body.style.overflow = ''
    }
  }, [])

  const openPurchaseSuccess = useCallback(
    (snapshot) => {
      if (!snapshot?.id) return
      setProperty(snapshot)
      setIsOpen(true)
      // Leave the reserved listing page — its CTAs are disabled and overlays may block
      // interaction. Land on the purchased guide under the success sheet.
      if (snapshot.purchaseKind === 'share') {
        navigate('/profile', { replace: true })
        return
      }
      navigate(`/profile/purchased/${snapshot.id}`, { replace: true })
    },
    [navigate],
  )

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return
    const preview = new URLSearchParams(window.location.search).get('buyer_success_preview')
    if (preview !== 'reservation' && preview !== 'share') return
    openPurchaseSuccess({
      id: 900001,
      purchaseKind: preview,
      title: 'Вилла с панорамным видом на море',
      location: 'Пафос, Кипр',
      image: '/images/sellyourbrick/about/about-hero-villa.jpg',
    })
  }, [openPurchaseSuccess])

  const goToPurchasedGuide = useCallback(() => {
    const pid = property?.id
    const kind = property?.purchaseKind
    closePurchaseSuccess()
    if (kind === 'share') {
      navigate('/profile')
      return
    }
    if (pid) navigate(`/profile/purchased/${pid}`)
  }, [closePurchaseSuccess, navigate, property?.id, property?.purchaseKind])

  const value = useMemo(
    () => ({
      openPurchaseSuccess,
      closePurchaseSuccess,
    }),
    [closePurchaseSuccess, openPurchaseSuccess],
  )

  return (
    <PurchaseSuccessContext.Provider value={value}>
      {children}
      <PurchaseSuccessModal
        isOpen={isOpen}
        property={property}
        onClose={closePurchaseSuccess}
        onGoToGuide={goToPurchasedGuide}
      />
    </PurchaseSuccessContext.Provider>
  )
}

export function usePurchaseSuccess() {
  const ctx = useContext(PurchaseSuccessContext)
  if (!ctx) {
    throw new Error('usePurchaseSuccess must be used within PurchaseSuccessProvider')
  }
  return ctx
}
