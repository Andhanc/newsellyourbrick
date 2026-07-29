import { createContext, useContext } from 'react'

export const MainPageDeferredContext = createContext(null)

export function useMainPageDeferred() {
  const v = useContext(MainPageDeferredContext)
  if (v == null) {
    throw new Error('useMainPageDeferred must be used within MainPageDeferredContext.Provider')
  }
  return v
}
