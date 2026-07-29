import React, { useEffect, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { Search } from 'lucide-react'
import './AnimatedLoadingSkeleton.css'

function getGridConfig(width) {
  const numCards = 6
  const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1
  return {
    numCards,
    cols,
    xBase: 32,
    yBase: 24,
    xStep: width >= 1024 ? 288 : width >= 640 ? 272 : 160,
    yStep: 208
  }
}

function generateSearchPath(config) {
  const { numCards, cols, xBase, yBase, xStep, yStep } = config
  const rows = Math.ceil(numCards / cols)
  const allPositions = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (row * cols + col < numCards) {
        allPositions.push({
          x: xBase + col * xStep,
          y: yBase + row * yStep
        })
      }
    }
  }

  const numRandomCards = 4
  const shuffledPositions = [...allPositions]
    .sort(() => Math.random() - 0.5)
    .slice(0, numRandomCards)
  shuffledPositions.push(shuffledPositions[0])

  return {
    x: shuffledPositions.map((pos) => pos.x),
    y: shuffledPositions.map((pos) => pos.y),
    scale: Array(shuffledPositions.length).fill(1.15),
    transition: {
      duration: shuffledPositions.length * 2.2,
      repeat: Infinity,
      ease: 'easeInOut',
      times: shuffledPositions.map((_, i) => i / (shuffledPositions.length - 1))
    }
  }
}

const frameVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } }
}

const cardVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: (i) => ({
    y: 0,
    opacity: 1,
    transition: { delay: i * 0.08, duration: 0.35 }
  })
}

const glowVariants = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(59, 130, 246, 0.25)',
      '0 0 32px rgba(59, 130, 246, 0.4)',
      '0 0 20px rgba(59, 130, 246, 0.25)'
    ],
    scale: [1, 1.08, 1],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
}

export default function AnimatedLoadingSkeleton() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  const controls = useAnimation()

  useEffect(() => {
    setWindowWidth(window.innerWidth)
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const config = getGridConfig(windowWidth)
    controls.start(generateSearchPath(config))
  }, [windowWidth, controls])

  const config = getGridConfig(windowWidth)

  return (
    <motion.div
      className="skeleton-grid-wrap"
      variants={frameVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="skeleton-grid-area">
        <motion.div
          className="skeleton-flying-icon"
          animate={controls}
          style={{ left: 24, top: 24 }}
        >
          <motion.div
            className="skeleton-flying-icon__glow"
            variants={glowVariants}
            animate="animate"
          >
            <Search size={20} strokeWidth={2} />
          </motion.div>
        </motion.div>

        <div className="skeleton-grid">
          {[...Array(config.numCards)].map((_, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={i}
              className="skeleton-card"
            >
              <motion.div
                className="skeleton-card__image"
                animate={{
                  backgroundColor: ['#e2e8f0', '#cbd5e1', '#e2e8f0']
                }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div className="skeleton-card__line skeleton-card__line--short" />
              <div className="skeleton-card__line skeleton-card__line--shorter" />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
