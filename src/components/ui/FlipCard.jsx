import { ArrowRight, Code2, Copy, Rocket, Zap } from 'lucide-react'
import { useState } from 'react'
import './FlipCard.css'

export default function FlipCard({
  title = 'Build MVPs Fast',
  subtitle = 'Launch your idea in record time',
  description = 'Copy, paste, customize—and launch your MVP faster than ever.',
  features = [
    'Copy & Paste Ready',
    'Developer-First',
    'MVP Optimized',
    'Zero Setup Required',
  ],
  color = '#ff2e88',
  clickToFlip = false,
  ctaText = 'Подробнее',
  isFlipped: isFlippedProp,
  onFlipChange,
}) {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false)
  const isControlled = typeof isFlippedProp === 'boolean'
  const isFlipped = isControlled ? isFlippedProp : internalIsFlipped
  const accent = color || '#ff2e88'

  const cardStyle = {
    background: 'linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)',
    boxShadow: `0 2px 4px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05), 0 0 0 5px ${accent}10`,
  }

  const ICON_FEATURES = [Copy, Code2, Rocket, Zap]

  return (
    <div
      className={`flip-card-root${isFlipped ? ' is-flipped' : ''}${clickToFlip ? ' is-clickable' : ''}`}
      style={{
        height: 'var(--flip-card-height, 380px)',
        width: '100%',
        maxWidth: 'var(--flip-card-max-width, 320px)',
        perspective: '2000px',
        position: 'relative',
        cursor: clickToFlip ? 'pointer' : 'default',
        transition: 'height 0.35s ease'
      }}
      onMouseEnter={() => {
        if (!clickToFlip && !isControlled) setInternalIsFlipped(true)
      }}
      onMouseLeave={() => {
        if (!clickToFlip && !isControlled) setInternalIsFlipped(false)
      }}
      onClick={() => {
        if (!clickToFlip) return
        const next = !isFlipped
        if (!isControlled) setInternalIsFlipped(next)
        if (onFlipChange) onFlipChange(next)
      }}
    >
      {/* Обёртка с 3D-трансформацией */}
      <div
        style={{
          position: 'relative',
          height: '100%',
          width: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.7s ease',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ── FRONT ── */}
        <div
          className="flip-card-face flip-card-face--front"
          style={{
            position: 'absolute', inset: 0,
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transition: 'opacity 0.7s ease',
            opacity: isFlipped ? 0 : 1,
            ...cardStyle,
          }}
        >
          {/* Акцентный оверлей */}
          <div
            className="flip-card-front-overlay"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse at 100% 100%, ${accent}0A 0%, transparent 60%)` }}
          />

          {/* Анимированные полоски + иконка */}
          <div
            className="flip-card-front-art"
            style={{ position: 'absolute', top: 'var(--flip-card-art-top, 32px)', bottom: 'var(--flip-card-art-bottom, 116px)', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div
              className="flip-card-front-art-inner"
              style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, width: 180, height: 100 }}
            >
              {[...Array(6)].map((_, i) => {
                const w = 48 + (i * 11) % 42
                const ml = (i * 9) % 26
                return (
                  <div key={i} className="flip-card-line" style={{ height: 10, borderRadius: 3, width: `${w}%`, marginLeft: `${ml}%`, animationDelay: `${i * 0.22}s`, background: `linear-gradient(to right, ${accent}22, ${accent}55, ${accent}22)` }} />
                )
              })}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: accent, boxShadow: `0 8px 24px ${accent}45`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Rocket style={{ width: 28, height: 28, color: 'white' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Подсказка «нажмите» — только в режиме clickToFlip */}
          {clickToFlip && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 999,
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(4px)',
              border: `1px solid ${accent}30`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v3" />
                <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 600, color: accent, letterSpacing: '0.02em' }}>Нажмите</span>
            </div>
          )}

          {/* Нижний блок: заголовок + молния */}
          <div className="flip-card-front-footer" style={{ position: 'absolute', left: 0, right: 0, bottom: 'var(--flip-card-footer-bottom, 30px)' }}>
            <div className="flip-card-front-footer-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginLeft: '10%', marginRight: '10%' }}>
              <div className="flip-card-front-text" style={{ minWidth: 0, flex: 1 }}>
                <h3 className="flip-card-front-title" style={{ fontSize: 'var(--flip-card-title-size, 15px)', fontWeight: 700, color: '#18181b', lineHeight: 'var(--flip-card-title-line-height, 1.2)', margin: 0 }}>{title}</h3>
                <p className="flip-card-front-subtitle" style={{ fontSize: 'var(--flip-card-subtitle-size, 12px)', color: '#71717a', lineHeight: 1.35, margin: '4px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{subtitle}</p>
              </div>
              <Zap className="flip-card-front-zap" style={{ flexShrink: 0, width: 16, height: 16, color: accent }} />
            </div>
          </div>
        </div>

        {/* ── BACK ── */}
        <div
          className="flip-card-face flip-card-face--back"
          style={{
            position: 'absolute', inset: 0,
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            transition: 'opacity 0.7s ease',
            opacity: isFlipped ? 1 : 0,
            display: 'flex',
            flexDirection: 'column',
            ...cardStyle,
          }}
        >
          {/* Акцентный оверлей */}
          <div
            className="flip-card-back-overlay"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 16, background: `radial-gradient(ellipse at 100% 100%, ${accent}08 0%, transparent 60%)` }}
          />

          {/* Контент — flex-column, кнопка всегда внизу */}
          <div className="flip-card-back-content" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 24px 20px' }}>

            {/* 1. Иконка + заголовок */}
            <div className="flip-card-back-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="flip-card-back-icon-wrap" style={{ width: 36, height: 36, borderRadius: 10, background: accent, boxShadow: `0 3px 10px ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Code2 style={{ width: 18, height: 18, color: 'white' }} />
              </div>
              <h3 className="flip-card-back-title" style={{ fontSize: 20, fontWeight: 700, color: '#18181b', lineHeight: 1.2, margin: 0 }}>{title}</h3>
            </div>

            {/* 2. Описание */}
            <p className="flip-card-back-description" style={{ margin: '10px 0 0', fontSize: 13, color: '#71717a', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {description}
            </p>

            {/* 3. Список — flex-grow чтобы кнопка была внизу */}
            <div className="flip-card-back-features" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, flexGrow: 1 }}>
              {features.map((feature, index) => {
                const IconComponent = ICON_FEATURES[index % ICON_FEATURES.length]
                return (
                  <div
                    className="flip-card-back-feature"
                    key={feature}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      opacity: isFlipped ? 1 : 0,
                      transform: isFlipped ? 'translateX(0)' : 'translateX(-10px)',
                      transition: `opacity 0.5s ease ${index * 100 + 200}ms, transform 0.5s ease ${index * 100 + 200}ms`,
                    }}
                  >
                    <div className="flip-card-back-feature-icon" style={{ width: 24, height: 24, borderRadius: '50%', background: `${accent}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconComponent style={{ width: 13, height: 13, color: accent }} />
                    </div>
                    <span className="flip-card-back-feature-text" style={{ fontSize: 14, fontWeight: 500, color: '#3f3f46' }}>{feature}</span>
                  </div>
                )
              })}
            </div>

            {/* 4. Разделитель + кнопка — прижаты к низу */}
            <div className="flip-card-back-footer" style={{ marginTop: 16 }}>
              <div style={{ height: 1, background: '#e2e8f0', marginBottom: 12 }} />
              <button
                type="button"
                className="flip-card-back-cta"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderRadius: 12, padding: '10px 16px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%)',
                  border: '1px solid rgba(226,232,240,0.9)',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: '#18181b' }}>{ctaText}</span>
                <ArrowRight style={{ width: 16, height: 16, color: accent }} />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
