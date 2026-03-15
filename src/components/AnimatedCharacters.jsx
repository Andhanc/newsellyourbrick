import { useState, useEffect, useRef } from 'react'

const EyeBall = ({
  size = 16,
  pupilSize = 6,
  maxDistance = 4,
  eyeColor = 'white',
  pupilColor = '#1a1a1a',
  isBlinking = false,
  forceLookX,
  forceLookY,
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const eyeRef = useRef(null)

  useEffect(() => {
    const handler = (e) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const getPos = () => {
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
    if (!eyeRef.current) return { x: 0, y: 0 }
    const rect = eyeRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = mousePos.x - cx
    const dy = mousePos.y - cy
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance)
    const angle = Math.atan2(dy, dx)
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
  }

  const pos = getPos()

  return (
    <div
      ref={eyeRef}
      style={{
        width: size,
        height: isBlinking ? 2 : size,
        borderRadius: '50%',
        backgroundColor: eyeColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'height 0.15s ease',
        flexShrink: 0,
      }}
    >
      {!isBlinking && (
        <div
          style={{
            width: pupilSize,
            height: pupilSize,
            borderRadius: '50%',
            backgroundColor: pupilColor,
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            transition: 'transform 0.1s ease-out',
            flexShrink: 0,
          }}
        />
      )}
    </div>
  )
}

const Pupil = ({ size = 10, maxDistance = 4, pupilColor = '#1a1a1a', forceLookX, forceLookY }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const getPos = () => {
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY }
    if (!ref.current) return { x: 0, y: 0 }
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = mousePos.x - cx
    const dy = mousePos.y - cy
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance)
    const angle = Math.atan2(dy, dx)
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
  }

  const pos = getPos()

  return (
    <div
      ref={ref}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: pupilColor,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: 'transform 0.1s ease-out',
        flexShrink: 0,
      }}
    />
  )
}

const AnimatedCharacters = ({ isTypingPassword, isPasswordVisible, isEmailFocused }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false)
  const [isBlackBlinking, setIsBlackBlinking] = useState(false)
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false)
  const [isPurpleSneak, setIsPurpleSneak] = useState(false)

  const purpleRef = useRef(null)
  const blackRef = useRef(null)
  const yellowRef = useRef(null)
  const orangeRef = useRef(null)

  useEffect(() => {
    const handler = (e) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  useEffect(() => {
    const schedule = () => {
      const t = setTimeout(() => {
        setIsPurpleBlinking(true)
        setTimeout(() => { setIsPurpleBlinking(false); schedule() }, 150)
      }, Math.random() * 4000 + 3000)
      return t
    }
    const t = schedule()
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const schedule = () => {
      const t = setTimeout(() => {
        setIsBlackBlinking(true)
        setTimeout(() => { setIsBlackBlinking(false); schedule() }, 150)
      }, Math.random() * 4000 + 3000)
      return t
    }
    const t = schedule()
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (isEmailFocused) {
      setIsLookingAtEachOther(true)
      const t = setTimeout(() => setIsLookingAtEachOther(false), 900)
      return () => clearTimeout(t)
    } else {
      setIsLookingAtEachOther(false)
    }
  }, [isEmailFocused])

  // When password is typed+hidden, purple occasionally sneaks a peek toward the form
  useEffect(() => {
    if (isTypingPassword && !isPasswordVisible) {
      const schedule = () => {
        const t = setTimeout(() => {
          setIsPurpleSneak(true)
          setTimeout(() => setIsPurpleSneak(false), 600)
        }, Math.random() * 2000 + 1500)
        return t
      }
      const t = schedule()
      return () => clearTimeout(t)
    } else {
      setIsPurpleSneak(false)
    }
  }, [isTypingPassword, isPasswordVisible, isPurpleSneak])

  const calcBodySkew = (ref) => {
    if (!ref.current) return 0
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const dx = mousePos.x - cx
    return Math.max(-6, Math.min(6, -dx / 120))
  }

  const calcFace = (ref) => {
    if (!ref.current) return { x: 0, y: 0 }
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 3
    const dx = mousePos.x - cx
    const dy = mousePos.y - cy
    return {
      x: Math.max(-12, Math.min(12, dx / 25)),
      y: Math.max(-8, Math.min(8, dy / 35)),
    }
  }

  const purpleSkew = calcBodySkew(purpleRef)
  const blackSkew = calcBodySkew(blackRef)
  const yellowSkew = calcBodySkew(yellowRef)
  const orangeSkew = calcBodySkew(orangeRef)
  const purpleFace = calcFace(purpleRef)
  const blackFace = calcFace(blackRef)
  const yellowFace = calcFace(yellowRef)
  const orangeFace = calcFace(orangeRef)

  // When password is VISIBLE → purple hides (slides down, eyes disappear)
  // When password is being typed but hidden → purple peeks / leans toward form
  const purpleHiding = isPasswordVisible
  const purplePeeking = isTypingPassword && !isPasswordVisible
  const purpleTranslateY = purpleHiding ? 85 : 0

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(160deg, #dde1ea 0%, #c8cdd9 100%)',
      borderRadius: '16px 0 0 16px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
    }}>
      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        pointerEvents: 'none',
      }} />

      {/* Bottom decorative glow */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(to top, rgba(200,205,220,0.6) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Characters scene — sits at the bottom of the panel */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 370,
        flexShrink: 0,
      }}>
        {/* Inner scene container, centered */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 300,
          height: 370,
        }}>

          {/* PURPLE — tallest, behind orange */}
          <div
            ref={purpleRef}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 38,
              width: 105,
              height: 260,
              backgroundColor: '#6C3FF5',
              borderRadius: '12px 12px 0 0',
              zIndex: 1,
              transition: 'transform 0.7s ease',
              transform: purpleHiding
                ? `skewX(0deg) translateY(${purpleTranslateY}px)`
                : purplePeeking
                  ? `skewX(${purpleSkew - 10}deg) translateX(22px) translateY(0px)`
                  : isLookingAtEachOther
                    ? `skewX(${purpleSkew + 8}deg) translateY(0px)`
                    : `skewX(${purpleSkew}deg) translateY(0px)`,
              transformOrigin: 'bottom center',
            }}
          >
            {/* Dashes decoration at top */}
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
              <div style={{ width: 16, height: 3, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 2 }} />
              <div style={{ width: 16, height: 3, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 2 }} />
            </div>
            {/* Eyes */}
            <div style={{
              position: 'absolute',
              display: 'flex',
              gap: 12,
              transition: 'left 0.7s, top 0.7s',
              left: purpleHiding ? 10 : isLookingAtEachOther ? 46 : 26 + purpleFace.x,
              top: purpleHiding ? 36 : isLookingAtEachOther ? 62 : 54 + purpleFace.y,
            }}>
              <EyeBall size={19} pupilSize={7} maxDistance={5}
                eyeColor="white" pupilColor="#2D2D2D"
                isBlinking={isPurpleBlinking}
                forceLookX={purplePeeking ? 5 : purpleHiding ? -3 : isLookingAtEachOther ? 4 : undefined}
                forceLookY={purplePeeking ? -3 : purpleHiding ? -3 : isLookingAtEachOther ? 4 : undefined}
              />
              <EyeBall size={19} pupilSize={7} maxDistance={5}
                eyeColor="white" pupilColor="#2D2D2D"
                isBlinking={isPurpleBlinking}
                forceLookX={purplePeeking ? 5 : purpleHiding ? -3 : isLookingAtEachOther ? 4 : undefined}
                forceLookY={purplePeeking ? -3 : purpleHiding ? -3 : isLookingAtEachOther ? 4 : undefined}
              />
            </div>
          </div>

          {/* BLACK — middle */}
          <div
            ref={blackRef}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 148,
              width: 68,
              height: 190,
              backgroundColor: '#2D2D2D',
              borderRadius: '8px 8px 0 0',
              zIndex: 2,
              transition: 'transform 0.7s ease',
              transform: isPasswordVisible
                ? 'skewX(0deg)'
                : isLookingAtEachOther
                  ? `skewX(${blackSkew * 1.5 + 8}deg) translateX(10px)`
                  : `skewX(${blackSkew}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            <div style={{
              position: 'absolute',
              display: 'flex',
              gap: 9,
              transition: 'left 0.7s, top 0.7s',
              left: isPasswordVisible ? 6 : isLookingAtEachOther ? 30 : 16 + blackFace.x,
              top: isPasswordVisible ? 26 : isLookingAtEachOther ? 14 : 24 + blackFace.y,
            }}>
              <EyeBall size={17} pupilSize={6} maxDistance={4}
                eyeColor="white" pupilColor="#2D2D2D"
                isBlinking={isBlackBlinking}
                forceLookX={isPasswordVisible ? -3 : isLookingAtEachOther ? -2 : undefined}
                forceLookY={isPasswordVisible ? -3 : isLookingAtEachOther ? -3 : undefined}
              />
              <EyeBall size={17} pupilSize={6} maxDistance={4}
                eyeColor="white" pupilColor="#2D2D2D"
                isBlinking={isBlackBlinking}
                forceLookX={isPasswordVisible ? -3 : isLookingAtEachOther ? -2 : undefined}
                forceLookY={isPasswordVisible ? -3 : isLookingAtEachOther ? -3 : undefined}
              />
            </div>
          </div>

          {/* ORANGE — semi-circle, front left */}
          <div
            ref={orangeRef}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 142,
              height: 118,
              backgroundColor: '#FF9B6B',
              borderRadius: '71px 71px 0 0',
              zIndex: 3,
              transition: 'transform 0.6s ease',
              transform: isPasswordVisible
                ? 'skewX(0deg)'
                : `skewX(${orangeSkew}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            <div style={{
              position: 'absolute',
              display: 'flex',
              gap: 12,
              transition: 'left 0.2s, top 0.2s',
              left: isPasswordVisible ? 24 : 50 + orangeFace.x,
              top: isPasswordVisible ? 54 : 58 + orangeFace.y,
            }}>
              <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D"
                forceLookX={isPasswordVisible ? -4 : undefined}
                forceLookY={isPasswordVisible ? -3 : undefined}
              />
              <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D"
                forceLookX={isPasswordVisible ? -4 : undefined}
                forceLookY={isPasswordVisible ? -3 : undefined}
              />
            </div>
          </div>

          {/* YELLOW — rounded rectangle, front right */}
          <div
            ref={yellowRef}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 212,
              width: 82,
              height: 140,
              backgroundColor: '#E8D754',
              borderRadius: '41px 41px 0 0',
              zIndex: 4,
              transition: 'transform 0.7s ease',
              transform: isPasswordVisible
                ? 'skewX(0deg)'
                : `skewX(${yellowSkew}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            <div style={{
              position: 'absolute',
              display: 'flex',
              gap: 8,
              transition: 'left 0.2s, top 0.2s',
              left: isPasswordVisible ? 12 : 28 + yellowFace.x,
              top: isPasswordVisible ? 22 : 32 + yellowFace.y,
            }}>
              <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D"
                forceLookX={isPasswordVisible ? -4 : undefined}
                forceLookY={isPasswordVisible ? -3 : undefined}
              />
              <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D"
                forceLookX={isPasswordVisible ? -4 : undefined}
                forceLookY={isPasswordVisible ? -3 : undefined}
              />
            </div>
            {/* Mouth */}
            <div style={{
              position: 'absolute',
              width: 32, height: 3,
              backgroundColor: '#2D2D2D',
              borderRadius: 2,
              transition: 'left 0.2s, top 0.2s',
              left: isPasswordVisible ? 10 : 22 + yellowFace.x,
              top: isPasswordVisible ? 64 : 68 + yellowFace.y,
            }} />
          </div>
        </div>
      </div>

    </div>
  )
}

export default AnimatedCharacters
