import { motion, useReducedMotion } from 'framer-motion'

const REVEAL_EASE = [0.22, 1, 0.36, 1]

export function ScrollReveal({
  children,
  className,
  delay = 0,
  y = 36,
  as = 'div',
  ...rest
}) {
  const reduceMotion = useReducedMotion()
  const Tag = as

  if (reduceMotion) {
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    )
  }

  const MotionTag = motion[as] || motion.div

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.14, margin: '-56px 0px -40px 0px' }}
      transition={{ duration: 0.72, delay, ease: REVEAL_EASE }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

export function ScrollRevealStagger({
  children,
  className,
  stagger = 0.09,
  delayChildren = 0.04,
  ...rest
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    )
  }

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
  const reduceMotion = useReducedMotion()
  const mergedClassName = className ? `scroll-reveal-item ${className}` : 'scroll-reveal-item'

  if (reduceMotion) {
    return (
      <div className={mergedClassName} {...rest}>
        {children}
      </div>
    )
  }

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
