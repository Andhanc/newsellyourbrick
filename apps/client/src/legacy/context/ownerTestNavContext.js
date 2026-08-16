import { createContext } from 'react'

/** Отдельный модуль: при HMR не пересоздаётся context и не ломает Provider/consumer. */
export const OwnerTestNavigationContext = createContext(null)
