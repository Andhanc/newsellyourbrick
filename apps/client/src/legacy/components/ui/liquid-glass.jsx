import { useId } from 'react'

function GlassFilter({ filterId }) {
  return (
    <svg style={{ display: 'none' }} aria-hidden>
      <filter
        id={filterId}
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        filterUnits="objectBoundingBox"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.001 0.005"
          numOctaves="1"
          seed="17"
          result="turbulence"
        />
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
        <feSpecularLighting
          in="softMap"
          surfaceScale="5"
          specularConstant="1"
          specularExponent="100"
          lightingColor="white"
          result="specLight"
        >
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>
        <feComposite
          in="specLight"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
          result="litImage"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale="200"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  )
}

export function GlassEffect({ children, className = '', style = {} }) {
  const raw = useId()
  const filterId = `glass-distortion-${raw.replace(/:/g, '')}`

  const glassStyle = {
    boxShadow: '0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)',
    transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 2.2)',
    ...style,
  }

  return (
    <>
      <GlassFilter filterId={filterId} />
      <div
        className={`relative flex min-h-full w-full flex-col overflow-hidden text-[var(--bwt-text,#1a1a1a)] cursor-default transition-all duration-700 ${className}`}
        style={glassStyle}
      >
        <div
          className="absolute inset-0 z-0 overflow-hidden rounded-inherit rounded-3xl"
          style={{
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            filter: `url(#${filterId})`,
            isolation: 'isolate',
          }}
        />
        <div
          className="absolute inset-0 z-10 rounded-inherit"
          style={{ background: 'rgba(255, 255, 255, 0.94)' }}
        />
        <div
          className="absolute inset-0 z-20 rounded-inherit rounded-3xl overflow-hidden"
          style={{
            boxShadow:
              'inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5)',
          }}
        />
        <div className="relative z-30 w-full min-h-0 flex-1">{children}</div>
      </div>
    </>
  )
}

/** Колонка с эффектом liquid glass (SVG displacement + матовое стекло). */
export function LiquidGlassPanel({ children, className = '' }) {
  return (
    <GlassEffect
      className={`rounded-3xl w-full transition-all duration-700 hover:rounded-[1.75rem] ${className}`}
    >
      {children}
    </GlassEffect>
  )
}

/**
 * «Жидкое стекло» по образцу: сильнее просвечивает фон (warp), SVG displacement + лёгкая белая плёнка.
 * Отдельный id фильтра, чтобы не конфликтовать с GlassEffect на той же странице.
 */
export function GlassLiquidBand({ children, className = '' }) {
  const raw = useId()
  const filterId = `glass-band-${raw.replace(/:/g, '')}`

  const outerStyle = {
    boxShadow: '0 6px 6px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1)',
    transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 2.2)',
  }

  return (
    <>
      <GlassFilter filterId={filterId} />
      <div
        className={`relative flex w-full flex-col overflow-hidden rounded-3xl text-[var(--bwt-text,#1a1a1a)] transition-all duration-700 ${className}`}
        style={outerStyle}
      >
        <div
          className="absolute inset-0 z-0 overflow-hidden rounded-inherit rounded-3xl"
          style={{
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            filter: `url(#${filterId})`,
            isolation: 'isolate',
          }}
        />
        <div
          className="absolute inset-0 z-10 rounded-inherit"
          style={{ background: 'rgba(255, 255, 255, 0.25)' }}
        />
        <div
          className="absolute inset-0 z-20 rounded-inherit rounded-3xl overflow-hidden"
          style={{
            boxShadow:
              'inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5)',
          }}
        />
        <div className="relative z-30 w-full min-h-0">{children}</div>
      </div>
    </>
  )
}
