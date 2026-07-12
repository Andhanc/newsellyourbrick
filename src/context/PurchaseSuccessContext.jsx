import { createContext, useCallback, useContext, useMemo, useState } from 'react'
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

  const goToPurchasedGuide = useCallback(() => {
    const pid = property?.id
    setIsOpen(false)
    if (pid) navigate(`/profile/purchased/${pid}`)
  }, [navigate, property?.id])

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
