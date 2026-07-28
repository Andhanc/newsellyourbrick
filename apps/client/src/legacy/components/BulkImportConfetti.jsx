import { useEffect, useState } from 'react'
import Confetti from 'react-confetti'

const COLORS = [
  '#0099A9',
  '#007d8a',
  '#33adbb',
  '#cce9ed',
  '#33adbb',
  '#2dd4bf',
  '#33adbb',
  '#fbbf24',
  '#fde047',
  '#fb7185',
  '#a5f3fc',
  '#e0e7ff',
]

/**
 * Richer burst than the old CSS confetti — uses canvas confetti with brand-aligned palette.
 */
export default function BulkImportConfetti() {
  const [dims, setDims] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }))

  useEffect(() => {
    const onResize = () =>
      setDims({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!dims.width || !dims.height) return null

  return (
    <Confetti
      width={dims.width}
      height={dims.height}
      recycle={false}
      numberOfPieces={420}
      gravity={0.24}
      friction={0.985}
      wind={0.02}
      initialVelocityX={20}
      initialVelocityY={-14}
      tweenDuration={6500}
      colors={COLORS}
      confettiSource={{
        x: dims.width / 2,
        y: dims.height * 0.22,
        w: 24,
        h: 16,
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10004,
        pointerEvents: 'none',
      }}
    />
  )
}
