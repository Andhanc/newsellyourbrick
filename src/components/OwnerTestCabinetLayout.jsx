import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { OwnerTestProfileProvider } from '../context/OwnerTestProfileContext'
import '../styles/owner-cabinet-tokens.css'

export default function OwnerTestCabinetLayout({ children }) {
  useEffect(() => {
    document.documentElement.classList.add('owner-test-cabinet-active')
    return () => document.documentElement.classList.remove('owner-test-cabinet-active')
  }, [])

  return (
    <OwnerTestProfileProvider>
      {children ?? <Outlet />}
    </OwnerTestProfileProvider>
  )
}
