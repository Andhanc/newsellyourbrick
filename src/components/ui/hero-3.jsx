import React from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AnimatedMarqueeHero({
  tagline,
  title,
  description,
  images,
  className,
}) {
  const FADE_IN_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
  }

  const duplicatedImages = [...(images || []), ...(images || [])]

  return (
    <section
      className={cn(
        'relative w-full min-h-[70vh] overflow-hidden bg-transparent flex flex-col items-center justify-start pt-16 md:pt-24 pb-0 text-center px-4 z-[1]',
        className
      )}
    >
      <div className="z-10 flex flex-col items-center">
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="hero-tagline mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(10,186,181,0.35)] bg-white/90 px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_2px_12px_rgba(10,186,181,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_4px_20px_rgba(10,186,181,0.18),inset_0_1px_0_rgba(255,255,255,0.9)]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0ABAB5_0%,#089a95_100%)] text-white shadow-[0_2px_8px_rgba(10,186,181,0.4)]">
            <Users className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <span className="tracking-tight">{tagline}</span>
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="text-5xl md:text-7xl font-bold tracking-tighter text-gray-900"
        >
          {typeof title === 'string' ? (
            title.split(' ').map((word, i) => (
              <motion.span
                key={i}
                variants={FADE_IN_ANIMATION_VARIANTS}
                className="inline-block"
              >
                {word}&nbsp;
              </motion.span>
            ))
          ) : (
            title
          )}
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.5 }}
          className="mt-6 max-w-xl text-lg text-gray-600"
        >
          {description}
        </motion.p>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-1/3 md:h-2/5 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
        <motion.div
          className="flex gap-4"
          animate={{
            x: ['-100%', '0%'],
            transition: {
              ease: 'linear',
              duration: 40,
              repeat: Infinity,
            },
          }}
        >
          {duplicatedImages.map((src, index) => (
            <div
              key={`${index}-${src}`}
              className="relative aspect-[3/4] h-48 md:h-64 flex-shrink-0"
              style={{
                rotate: `${(index % 2 === 0 ? -2 : 5)}deg`,
              }}
            >
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover rounded-2xl shadow-md"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
