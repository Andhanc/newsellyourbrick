import * as React from 'react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'

/**
 * Карточка в стиле PlaceCard (демо Petra): галерея, теги, рейтинг, цена, CTA.
 * @param {object} props
 * @param {string[]} props.images
 * @param {string[]} props.tags
 * @param {number} [props.rating] — если не передан, блок рейтинга скрыт
 * @param {string} props.title
 * @param {string} props.dateRange
 * @param {string} props.hostType
 * @param {boolean} [props.isTopRated]
 * @param {string} props.description
 * @param {number} props.priceAmount — отображаемое число цены
 * @param {string} [props.currencySymbol]
 * @param {string} [props.priceSuffix] — подпись к цене (например « / night» или « · ставка»)
 * @param {string} [props.bookNowLabel]
 * @param {string} [props.bookNowTo] — маршрут react-router; если есть, кнопка ведёт по ссылке
 * @param {function} [props.onBookNow]
 * @param {function} [props.onBookNowClick] — доп. обработчик клика по ссылке (например guard доступа)
 * @param {string} [props.topRatedLabel]
 * @param {React.ReactNode} [props.ctaSlot] — заменяет стандартную кнопку справа
 * @param {string} [props.className]
 */
export function PlaceCard({
  images: imagesProp,
  tags,
  rating,
  title,
  dateRange,
  hostType,
  isTopRated = false,
  description,
  priceAmount,
  currencySymbol = '$',
  priceSuffix = ' / night',
  bookNowLabel = 'Book Now',
  bookNowTo,
  onBookNow,
  onBookNowClick,
  topRatedLabel = 'Top rated',
  ctaSlot,
  className,
}) {
  const images =
    Array.isArray(imagesProp) && imagesProp.length > 0 ? imagesProp : [PLACEHOLDER_IMG]
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const changeImage = (newDirection) => {
    setDirection(newDirection)
    setCurrentIndex((prevIndex) => {
      const nextIndex = prevIndex + newDirection
      if (nextIndex < 0) return images.length - 1
      if (nextIndex >= images.length) return 0
      return nextIndex
    })
  }

  const carouselVariants = {
    enter: (dir) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      zIndex: 0,
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  }

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  }

  const priceFormatted =
    typeof priceAmount === 'number'
      ? priceAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : String(priceAmount ?? '')

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      variants={contentVariants}
      whileHover={{
        scale: 1.02,
        boxShadow: '0px 10px 30px -5px rgba(15, 23, 42, 0.12)',
        transition: { type: 'spring', stiffness: 300, damping: 22 },
      }}
      className={cn(
        'w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-lg cursor-default',
        className
      )}
    >
      <div className="relative group h-64">
        <AnimatePresence initial={false} custom={direction}>
          <motion.img
            key={currentIndex}
            src={images[currentIndex]}
            alt=""
            custom={direction}
            variants={carouselVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute h-full w-full object-cover"
          />
        </AnimatePresence>

        <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full bg-black/30 hover:bg-black/50 text-white pointer-events-auto"
            onClick={() => changeImage(-1)}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full bg-black/30 hover:bg-black/50 text-white pointer-events-auto"
            onClick={() => changeImage(1)}
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="absolute top-3 left-3 flex flex-wrap gap-2 max-w-[calc(100%-5rem)]">
          {(tags || []).map((tag) => (
            <Badge key={tag} variant="secondary" className="bg-white/80 backdrop-blur-sm text-neutral-900">
              {tag}
            </Badge>
          ))}
        </div>
        {rating != null && Number.isFinite(Number(rating)) && (
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="flex items-center gap-1 bg-white/80 backdrop-blur-sm text-neutral-900">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> {rating}
            </Badge>
          </div>
        )}

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, index) => (
            <button
              type="button"
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                currentIndex === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
              )}
              aria-label={`Image ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <motion.div variants={contentVariants} className="p-5 space-y-4">
        <motion.div variants={itemVariants} className="flex justify-between items-start gap-2">
          <h3 className="text-xl font-bold leading-tight">{title}</h3>
          {isTopRated && (
            <Badge variant="outline" className="shrink-0">
              {topRatedLabel}
            </Badge>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="text-sm text-neutral-500">
          <span>{dateRange}</span> <span aria-hidden>&bull;</span> <span>{hostType}</span>
        </motion.div>

        <motion.p variants={itemVariants} className="text-sm text-neutral-500 leading-relaxed">
          {description}
        </motion.p>

        <motion.div variants={itemVariants} className="flex justify-between items-center gap-3 pt-2 flex-wrap">
          <p className="font-semibold text-neutral-900">
            {currencySymbol}
            {priceFormatted}
            {priceSuffix ? (
              <span className="text-sm font-normal text-neutral-500"> {priceSuffix}</span>
            ) : null}
          </p>
          {ctaSlot ? (
            ctaSlot
          ) : bookNowTo ? (
            <Button className="group" asChild>
              <Link
                to={bookNowTo}
                onClick={(e) => {
                  onBookNowClick?.(e)
                  onBookNow?.(e)
                }}
              >
                {bookNowLabel}
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          ) : (
            <Button type="button" className="group" onClick={onBookNow}>
              {bookNowLabel}
              <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
