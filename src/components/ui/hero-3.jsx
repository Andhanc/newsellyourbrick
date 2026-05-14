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

  // Несколько копий ленты, чтобы при прокрутке линия всегда была заполнена и цикл был бесшовным
  const copies = 4
  const duplicatedImages = Array.from({ length: copies }, () => (images || [])).flat()

  return (
    <section
      className={cn(
        'animated-marquee-hero relative z-[1] flex w-full min-h-0 flex-col items-center justify-start overflow-hidden bg-transparent px-4 pb-2 pt-12 text-center md:min-h-[70vh] md:pb-0 md:pt-24',
        className
      )}
    >
      <div className="animated-marquee-hero__copy z-10 flex flex-col items-center">
        {tagline ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={FADE_IN_ANIMATION_VARIANTS}
            className="hero-tagline mb-4 inline-flex items-center gap-2.5 rounded-full border border-[rgba(10,186,181,0.35)] bg-white/90 px-6 py-3 text-sm font-semibold text-slate-700 shadow-[0_2px_12px_rgba(10,186,181,0.12),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md transition-shadow duration-300 hover:shadow-[0_4px_20px_rgba(10,186,181,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] sm:mb-5 sm:gap-3 sm:px-8 sm:py-3.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0ABAB5_0%,#089a95_100%)] text-white shadow-[0_2px_8px_rgba(10,186,181,0.4)]">
              <Users className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="tracking-tight leading-snug">{tagline}</span>
          </motion.div>
        ) : null}

        {title != null && title !== '' ? (
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
          className="animated-marquee-hero__title text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-gray-900 leading-[1.12] sm:leading-tight"
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
        ) : null}

        <motion.p
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.5 }}
          className="animated-marquee-hero__description mt-4 max-w-xl text-base text-gray-600 md:mt-6 md:text-lg"
        >
          {description}
        </motion.p>
      </div>

      {/* Мобилка: лента сразу под текстом (без «дыры» от min-height + absolute). Десктоп: внизу секции */}
      <div
        className={cn(
          'pointer-events-none w-full max-w-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]',
          'relative h-[158px] shrink-0',
          'md:absolute md:bottom-0 md:left-0 md:mt-0 md:h-2/5 md:min-h-[200px]',
          'md:[mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]'
        )}
      >
        <motion.div
          className="flex w-max gap-3 select-none md:gap-4"
          animate={{
            x: ['0%', `${-100 / copies}%`],
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
              className="hero-marquee-card relative aspect-[3/4] h-36 flex-shrink-0 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)] md:h-64"
              style={{
                rotate: `${(index % 2 === 0 ? -2 : 5)}deg`,
              }}
            >
              <div className="absolute inset-0">
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"
                  aria-hidden
                />
              </div>
              <span className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/95 text-teal-600 border border-teal-200/80 shadow-sm">
                Property
              </span>
              <div className="absolute bottom-0 left-0 right-0 z-10 p-3 pt-8 text-left pointer-events-none">
                <div className="h-2.5 w-3/4 rounded bg-white/40 mb-2" aria-hidden />
                <div className="h-2 w-1/2 rounded bg-white/30" aria-hidden />
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
