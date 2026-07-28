import { useCallback, useState } from 'react'
import useMobileLayout from './useMobileLayout'

export default function useFilterSectionState(defaultOpen, activeSectionKeys = []) {
  const isMobile = useMobileLayout()

  const [openSections, setOpenSections] = useState(() => {
    const next = {}
    for (const [key, desktopOpen] of Object.entries(defaultOpen)) {
      next[key] = isMobile ? activeSectionKeys.includes(key) : desktopOpen
    }
    return next
  })

  const toggleSection = useCallback((key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return [openSections, toggleSection]
}
