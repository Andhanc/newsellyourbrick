'use client'

import { useRef } from 'react'
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame
} from 'framer-motion'
import { wrap } from '@motionone/utils'
import { cn } from '@/lib/utils'
import './MarqueeAnimation.css'

/**
 * Бегущая строка (marquee). Текст повторяется и плавно движется в заданную сторону.
 * @param {string} children - Текст для анимации
 * @param {string} [className] - Дополнительные классы
 * @param {'left'|'right'} [direction] - Направление движения
 * @param {number} [baseVelocity] - Базовая скорость (положительная = вправо при direction left с отрицательной скоростью двигается влево)
 */
function MarqueeAnimation({
  children,
  className,
  direction = 'left',
  baseVelocity = 10
}) {
  const baseX = useMotionValue(0)
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400
  })
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 0], {
    clamp: false
  })

  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`)

  const directionFactor = useRef(1)
  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000)

    if (direction === 'left') {
      directionFactor.current = 1
    } else if (direction === 'right') {
      directionFactor.current = -1
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get()

    baseX.set(baseX.get() + moveBy)
  })

  return (
    <div className="marquee-animation overflow-hidden max-w-full text-nowrap flex-nowrap flex relative">
      <motion.div
        className={cn(
          'font-bold uppercase text-3xl md:text-4xl lg:text-5xl flex flex-nowrap text-nowrap',
          className
        )}
        style={{ x }}
      >
        <span className="marquee-animation__item">{children}</span>
        <span className="marquee-animation__item">{children}</span>
        <span className="marquee-animation__item">{children}</span>
        <span className="marquee-animation__item">{children}</span>
      </motion.div>
    </div>
  )
}

export { MarqueeAnimation }
