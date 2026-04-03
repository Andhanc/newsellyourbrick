import React, { useEffect, useMemo, useState } from 'react'

const cn = (...inputs: (string | undefined | null | boolean)[]) =>
  inputs.filter(Boolean).join(' ')

const FlipUnit = ({
  digit,
  cardStyle,
}: {
  digit: string
  cardStyle: React.CSSProperties
}) => {
  const [currentDigit, setCurrentDigit] = useState(digit)
  const [previousDigit, setPreviousDigit] = useState(digit)
  const [isFlipping, setIsFlipping] = useState(false)

  useEffect(() => {
    if (digit !== currentDigit) {
      setPreviousDigit(currentDigit)
      setCurrentDigit(digit)
      setIsFlipping(true)
    }
  }, [digit, currentDigit])

  const handleBottomAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    setIsFlipping(false)
    setPreviousDigit(digit)
  }

  return (
    <div className="flip-unit" style={cardStyle}>
      {/* top static: shows NEW digit — revealed when flipper__top folds away */}
      <div className="flip-card flip-card__top"><span className="flip-digit">{currentDigit}</span></div>
      {/* bottom static: shows OLD digit — hidden when flipper__bottom folds over it */}
      <div className="flip-card flip-card__bottom"><span className="flip-digit">{previousDigit}</span></div>
      <div className={cn('flipper', isFlipping && 'is-flipping')}>
        {/* old digit top half folds down (0° → -90°) */}
        <div className="flip-card flipper__top"><span className="flip-digit">{previousDigit}</span></div>
        {/* new digit bottom half folds in (90° → 0°, delayed) */}
        <div
          className="flip-card flipper__bottom"
          onAnimationEnd={handleBottomAnimationEnd}
        >
          <span className="flip-digit">{currentDigit}</span>
        </div>
      </div>
    </div>
  )
}

export const FlipCountdown = ({
  countFrom = 99,
  countTo = 0,
  className,
  cardBgColor,
  textColor,
}: {
  countFrom?: number | string | bigint
  countTo?: number | string | bigint
  className?: string
  cardBgColor?: string
  textColor?: string
}) => {
  const from = useMemo(() => BigInt(countFrom), [countFrom])
  const to = useMemo(() => BigInt(countTo), [countTo])

  const isCountingDown = from > to
  const [count, setCount] = useState(from)

  useEffect(() => {
    if ((isCountingDown && count <= to) || (!isCountingDown && count >= to)) {
      return
    }

    const timer = setInterval(() => {
      setCount((prevCount) => (isCountingDown ? prevCount - 1n : prevCount + 1n))
    }, 1000)

    return () => clearInterval(timer)
  }, [count, to, isCountingDown])

  const paddedCount = useMemo(() => {
    const maxVal = from > to ? from : to
    const numDigits = String(maxVal).length
    const displayCount = count < 0n ? 0n : count

    return String(displayCount).padStart(numDigits, '0')
  }, [count, from, to])

  const cardStyle: React.CSSProperties = {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    ['--flip-card-bg' as any]: cardBgColor,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    ['--flip-card-text' as any]: textColor,
  }

  return (
    <div className={cn('flip-countdown-container', className)}>
      {paddedCount.split('').map((digit, index) => (
        <FlipUnit key={index} digit={digit} cardStyle={cardStyle} />
      ))}
    </div>
  )
}

// Controlled renderer: animates only when `value` changes.
export const FlipNumber = ({
  value,
  padTo,
  className,
  style,
  cardBgColor,
  textColor,
}: {
  value: number | string | bigint
  padTo?: number
  className?: string
  style?: React.CSSProperties
  cardBgColor?: string
  textColor?: string
}) => {
  const str = useMemo(() => {
    const raw = String(value ?? '')
    if (!raw) return ''
    const digitsOnly = raw.replace(/[^0-9]/g, '')
    if (!digitsOnly) return ''
    const padded = typeof padTo === 'number' ? digitsOnly.padStart(padTo, '0') : digitsOnly
    return padded
  }, [value, padTo])

  const s = style as any
  const cardStyle: React.CSSProperties = {
    // Apply size directly (not only via CSS vars) so they always take effect
    width:  s?.['--flip-card-width']  ?? undefined,
    height: s?.['--flip-card-height'] ?? undefined,
    // Keep vars so .flip-digit can inherit font-size
    ['--flip-card-width'     as any]: s?.['--flip-card-width'],
    ['--flip-card-height'    as any]: s?.['--flip-card-height'],
    ['--flip-card-font-size' as any]: s?.['--flip-card-font-size'],
    ['--flip-card-bg'        as any]: cardBgColor,
    ['--flip-card-text'      as any]: textColor,
  }

  if (!str) return null

  return (
    <div className={cn('flip-countdown-container', className)}>
      {str.split('').map((digit, index) => (
        <FlipUnit key={index} digit={digit} cardStyle={cardStyle} />
      ))}
    </div>
  )
}

