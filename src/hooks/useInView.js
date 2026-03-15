import { useEffect, useRef, useState } from 'react'

/**
 * Хук: элемент в зоне видимости (Intersection Observer).
 * Запросы выполняются только когда секция попадает во вьюпорт.
 * @param {Object} options - { rootMargin: '200px', threshold: 0.01 }
 * @returns [ref, isInView]
 */
export function useInView(options = {}) {
  const { rootMargin = '200px', threshold = 0.01 } = options
  const ref = useRef(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { rootMargin, threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return [ref, isInView]
}
