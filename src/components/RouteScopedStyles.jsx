import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const BUYER_CABINET_PATH =
  /^\/(profile|favorites|history|chat|wallet|subscriptions|data|bonuses|compare|private-club|deposit)(\/|$)/

/** CSS кабинета покупателя — только на маршрутах кабинета, не на главной. */
export function BuyerCabinetScrollStyles() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (!BUYER_CABINET_PATH.test(pathname)) return undefined
    void import('../styles/buyer-cabinet-scroll.css')
    return undefined
  }, [pathname])

  return null
}
