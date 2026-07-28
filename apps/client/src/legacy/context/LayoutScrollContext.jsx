import { createContext, useContext } from 'react'

/** Ref на DOM-элемент `.app-layout` (контейнер прокрутки) для useScroll({ container }) и т.п. */
export const LayoutScrollRefContext = createContext(null)

export function useLayoutScrollRef() {
  return useContext(LayoutScrollRefContext)
}
