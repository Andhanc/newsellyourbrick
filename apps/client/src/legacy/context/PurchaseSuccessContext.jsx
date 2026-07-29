import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PurchaseSuccessModal from '../components/PurchaseSuccessModal'

const PurchaseSuccessContext = createContext(null)

export function PurchaseSuccessProvider({ children }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [property, setProperty] = useState(null)

  const openPurchaseSuccess = useCallback((snapshot) => {
    if (!snapshot?.id) return
    setProperty(snapshot)
    setIsOpen(true)
  }, [])

  const closePurchaseSuccess = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (!import.meta.env?.DEV || typeof window === 'undefined') return
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
    setIsOpen(false)
    if (property?.purchaseKind === 'share') {
      navigate('/profile')
      return
    }
    if (pid) navigate(`/profile/purchased/${pid}`)
  }, [navigate, property?.id, property?.purchaseKind])

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
