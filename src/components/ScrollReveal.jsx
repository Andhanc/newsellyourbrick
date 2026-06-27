import { createElement, useEffect, useState } from 'react'

const REVEAL_EASE = [0.22, 1, 0.36, 1]

let framerModule = null
let framerPromise = null

function loadFramerMotion() {
  if (framerModule) return Promise.resolve(framerModule)
  if (!framerPromise) {
    framerPromise = import('framer-motion').then((m) => {
      framerModule = m
      return m
    })
  }
  return framerPromise
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** framer-motion — отдельный чанк, подгружается в idle после первого кадра. */
function useLazyFramerMotion() {
  const [motionApi, setMotionApi] = useState(framerModule)

  useEffect(() => {
    if (motionApi || prefersReducedMotion()) return undefined

    let cancelled = false
    const run = () => {
      loadFramerMotion().then((m) => {
        if (!cancelled) setMotionApi(m)
      })
    }

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 3200 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    }

    const t = window.setTimeout(run, 600)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [motionApi])

  return motionApi
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 36,
  as = 'div',
  ...rest
}) {
  const motionApi = useLazyFramerMotion()
  const Tag = as

  if (prefersReducedMotion() || !motionApi?.motion) {
    return createElement(Tag, { className, ...rest }, children)
  }

  const MotionTag = motionApi.motion[as] || motionApi.motion.div

  return createElement(
    MotionTag,
    {
      className,
      initial: { opacity: 0, y },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.14, margin: '-56px 0px -40px 0px' },
      transition: { duration: 0.72, delay, ease: REVEAL_EASE },
      ...rest,
    },
    children,
  )
}

export function ScrollRevealStagger({
  children,
  className,
  stagger = 0.09,
  delayChildren = 0.04,
  ...rest
}) {
  const motionApi = useLazyFramerMotion()

  if (prefersReducedMotion() || !motionApi?.motion) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    )
  }

  const { motion } = motionApi

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.12, margin: '-48px 0px -32px 0px' }}
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function ScrollRevealItem({ children, className, y = 28, ...rest }) {
  const motionApi = useLazyFramerMotion()
  const mergedClassName = className ? `scroll-reveal-item ${className}` : 'scroll-reveal-item'

  if (prefersReducedMotion() || !motionApi?.motion) {
    return (
      <div className={mergedClassName} {...rest}>
        {children}
      </div>
    )
  }

  const { motion } = motionApi

  return (
    <motion.div
      className={mergedClassName}
      variants={{
        hidden: { opacity: 0, y },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.62, ease: REVEAL_EASE },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
