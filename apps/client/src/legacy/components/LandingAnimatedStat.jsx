import { useAnimatedCounter } from './about/hooks/useAnimatedCounter'
import { useInView } from './about/hooks/useInView'

export default function LandingAnimatedStat({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}) {
  const { ref, inView } = useInView({ threshold: 0.35 })
  const count = useAnimatedCounter(value, inView, { duration: 1800, decimals })

  return (
    <span ref={ref} className={className}>
      {prefix}
      {count}
      {suffix}
    </span>
  )
}
