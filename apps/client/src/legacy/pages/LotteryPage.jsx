import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, MousePointer2, Sparkles, Ticket, X } from 'lucide-react'
import OwnerTestProfileMenu from '../components/OwnerTestProfileMenu'
import { getUserData } from '../services/authService'
import './LotteryPage.css'

const LOTTERY_TICKET = 'SYB-384-927'

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function makeCanvasTexture(draw, width = 1024, height = 640) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  draw(ctx, width, height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

function createPassportTexture(side) {
  return makeCanvasTexture((ctx, width, height) => {
    const pageGradient = ctx.createLinearGradient(0, 0, width, height)
    pageGradient.addColorStop(0, '#fffaf0')
    pageGradient.addColorStop(0.52, '#f4e9d3')
    pageGradient.addColorStop(1, '#e7d7bb')
    ctx.fillStyle = pageGradient
    ctx.fillRect(0, 0, width, height)

    ctx.globalAlpha = 0.13
    ctx.strokeStyle = '#4b7e78'
    ctx.lineWidth = 2
    for (let y = -height; y < height * 2; y += 48) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(width * 0.3, y - 80, width * 0.66, y + 80, width, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = '#164b52'
    ctx.font = '700 34px Montserrat, sans-serif'
    ctx.fillText(side === 'left' ? 'PROPERTY PASSPORT' : 'SELLYOURBRICK', 58, 70)
    ctx.fillStyle = '#6a7772'
    ctx.font = '600 18px Montserrat, sans-serif'
    ctx.fillText(side === 'left' ? 'INTERNATIONAL MEMBER' : 'VERIFIED PROPERTY CLUB', 60, 105)

    if (side === 'left') {
      roundedRectPath(ctx, 64, 150, 300, 344, 28)
      ctx.fillStyle = '#d7e8e3'
      ctx.fill()
      const portrait = ctx.createLinearGradient(0, 150, 0, 494)
      portrait.addColorStop(0, '#7bc0b7')
      portrait.addColorStop(1, '#1d7377')
      ctx.fillStyle = portrait
      ctx.beginPath()
      ctx.arc(214, 276, 74, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(214, 446, 112, 122, 0, Math.PI, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#425f5c'
      ctx.font = '700 22px Montserrat, sans-serif'
      ctx.fillText('MEMBER', 416, 190)
      ctx.font = '600 28px Montserrat, sans-serif'
      ctx.fillStyle = '#142f33'
      ctx.fillText('ALEX MORGAN', 416, 232)
      const rows = [
        ['STATUS', 'ACTIVE'],
        ['MARKET', 'GLOBAL'],
        ['ACCESS', 'PREMIUM'],
      ]
      rows.forEach(([label, value], index) => {
        const y = 300 + index * 78
        ctx.fillStyle = '#71807b'
        ctx.font = '600 17px Montserrat, sans-serif'
        ctx.fillText(label, 416, y)
        ctx.fillStyle = '#203c3d'
        ctx.font = '700 22px Montserrat, sans-serif'
        ctx.fillText(value, 416, y + 30)
      })
    } else {
      ctx.strokeStyle = '#3e8e88'
      ctx.lineWidth = 5
      ctx.globalAlpha = 0.42
      ctx.beginPath()
      ctx.arc(710, 270, 126, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(710, 270, 94, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.save()
      ctx.translate(710, 270)
      ctx.rotate(-0.18)
      ctx.fillStyle = '#1b787d'
      ctx.font = '800 27px Montserrat, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('PROPERTY', 0, -9)
      ctx.fillText('VERIFIED', 0, 28)
      ctx.restore()
      ctx.textAlign = 'left'

      ctx.fillStyle = '#6b7d78'
      ctx.font = '600 17px Montserrat, sans-serif'
      ctx.fillText('THIS PASSPORT CONNECTS YOU', 58, 505)
      ctx.fillText('TO VERIFIED REAL ESTATE OPPORTUNITIES', 58, 536)
    }
  })
}

function createTicketTexture() {
  return makeCanvasTexture((ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#8ff5e4')
    gradient.addColorStop(0.34, '#ffe071')
    gradient.addColorStop(0.7, '#ff8f88')
    gradient.addColorStop(1, '#cd68f5')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    ctx.globalAlpha = 0.17
    ctx.fillStyle = '#0b3940'
    for (let x = -height; x < width + height; x += 58) {
      ctx.save()
      ctx.translate(x, -30)
      ctx.rotate(0.72)
      ctx.fillRect(0, 0, 13, height * 1.8)
      ctx.restore()
    }
    ctx.globalAlpha = 1

    ctx.strokeStyle = '#102c34'
    ctx.lineWidth = 8
    ctx.setLineDash([22, 18])
    roundedRectPath(ctx, 28, 28, width - 56, height - 56, 30)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#102c34'
    ctx.font = '800 25px Montserrat, sans-serif'
    ctx.fillText('SELLYOURBRICK', 72, 92)
    ctx.font = '900 78px Montserrat, sans-serif'
    ctx.fillText('LOTTERY', 70, 190)
    ctx.font = '800 35px Montserrat, sans-serif'
    ctx.fillText('REAL ESTATE EDITION', 73, 245)

    ctx.fillStyle = '#ffffff'
    roundedRectPath(ctx, 72, 292, 465, 110, 24)
    ctx.fill()
    ctx.fillStyle = '#102c34'
    ctx.font = '600 18px Montserrat, sans-serif'
    ctx.fillText('YOUR TICKET', 100, 330)
    ctx.font = '800 34px Montserrat, sans-serif'
    ctx.fillText(LOTTERY_TICKET, 100, 375)

    ctx.fillStyle = '#102c34'
    const bars = [8, 4, 10, 5, 3, 9, 5, 11, 4, 8, 3, 6, 10, 4, 7, 3, 9]
    let x = 690
    bars.forEach((bar, index) => {
      ctx.fillRect(x, 286 + (index % 3) * 4, bar, 126 - (index % 3) * 8)
      x += bar + 9
    })
    ctx.font = '700 18px Montserrat, sans-serif'
    ctx.fillText('30.09', 706, 442)
  }, 1200, 520)
}

function createLabelTexture() {
  return makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#082f35'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#79f0df'
    ctx.lineWidth = 18
    roundedRectPath(ctx, 20, 20, width - 40, height - 40, 72)
    ctx.stroke()
    ctx.fillStyle = '#d7fff9'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '800 50px Montserrat, sans-serif'
    ctx.fillText('SYB', width / 2, height / 2 + 2)
  }, 520, 300)
}

function boxMaterials(frontTexture, backColor, edgeColor = 0xdcccad) {
  const edge = new THREE.MeshStandardMaterial({ color: edgeColor, roughness: 0.64 })
  const front = new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.5 })
  const back = new THREE.MeshStandardMaterial({ color: backColor, roughness: 0.46 })
  return [edge, edge, edge, edge, front, back]
}

function LotteryThreeScene() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    let renderer
    let animationFrame = null
    let resizeObserver = null
    const textures = []

    try {
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
      camera.position.set(0, 0.1, 9)

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.14
      renderer.setClearColor(0x000000, 0)
      renderer.domElement.setAttribute('aria-label', 'Интерактивная 3D-композиция: паспорт, лотерейный билет и ключ')
      renderer.domElement.setAttribute('role', 'img')
      renderer.domElement.style.touchAction = 'none'
      mount.appendChild(renderer.domElement)

      const root = new THREE.Group()
      root.rotation.set(-0.1, -0.08, 0.02)
      scene.add(root)

      scene.add(new THREE.HemisphereLight(0xf5ffff, 0x0b284a, 2.7))
      const keyLight = new THREE.DirectionalLight(0xffffff, 4.2)
      keyLight.position.set(4.5, 5, 7)
      const aquaLight = new THREE.PointLight(0x72fff0, 12, 18)
      aquaLight.position.set(-4, 1.5, 5)
      const roseLight = new THREE.PointLight(0xffb9d9, 8, 15)
      roseLight.position.set(4, -3, 4)
      scene.add(keyLight, aquaLight, roseLight)

      const passport = new THREE.Group()
      passport.position.set(-0.32, 0.3, 0)
      passport.rotation.set(-0.12, -0.06, -0.08)
      root.add(passport)

      const leftTexture = createPassportTexture('left')
      const rightTexture = createPassportTexture('right')
      const ticketTexture = createTicketTexture()
      const labelTexture = createLabelTexture()
      textures.push(leftTexture, rightTexture, ticketTexture, labelTexture)

      const navyCover = new THREE.MeshPhysicalMaterial({
        color: 0x132849,
        roughness: 0.34,
        clearcoat: 0.45,
        clearcoatRoughness: 0.24,
      })
      const coverLeft = new THREE.Mesh(new THREE.BoxGeometry(2.75, 3.55, 0.13), navyCover)
      coverLeft.position.set(-1.39, 0, -0.13)
      coverLeft.rotation.y = 0.09
      const coverRight = new THREE.Mesh(new THREE.BoxGeometry(2.75, 3.55, 0.13), navyCover)
      coverRight.position.set(1.39, 0, -0.13)
      coverRight.rotation.y = -0.09

      const pageGeometry = new THREE.BoxGeometry(2.62, 3.42, 0.12)
      const leftPage = new THREE.Mesh(pageGeometry, boxMaterials(leftTexture, 0xeadcc2))
      leftPage.position.set(-1.34, 0, 0)
      leftPage.rotation.y = 0.09
      const rightPage = new THREE.Mesh(pageGeometry, boxMaterials(rightTexture, 0xeadcc2))
      rightPage.position.set(1.34, 0, 0)
      rightPage.rotation.y = -0.09
      passport.add(coverLeft, coverRight, leftPage, rightPage)

      const spine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 3.44, 18),
        new THREE.MeshStandardMaterial({ color: 0xb9a888, roughness: 0.56 }),
      )
      spine.position.set(0, 0, 0.08)
      passport.add(spine)

      const ticketMesh = new THREE.Mesh(
        new THREE.BoxGeometry(4.45, 1.92, 0.11),
        boxMaterials(ticketTexture, 0xf09d9b, 0xdd887e),
      )
      ticketMesh.position.set(0.72, -0.32, 0.31)
      ticketMesh.rotation.set(-0.02, -0.06, -0.19)
      passport.add(ticketMesh)

      const keyGroup = new THREE.Group()
      keyGroup.position.set(2.04, -1.12, 0.78)
      keyGroup.rotation.set(-0.2, 0.24, -0.58)
      keyGroup.scale.setScalar(0.69)
      root.add(keyGroup)

      const gold = new THREE.MeshPhysicalMaterial({
        color: 0xf4c35e,
        metalness: 0.93,
        roughness: 0.16,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
      })
      const goldDark = new THREE.MeshPhysicalMaterial({
        color: 0xb96e18,
        metalness: 0.9,
        roughness: 0.24,
      })
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.18, 24, 72), gold)
      bow.position.x = -1.55
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.75, 22), gold)
      shaft.rotation.z = Math.PI / 2
      shaft.position.x = -0.02
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.32, 0.34), gold)
      tip.position.x = 1.48
      const toothOne = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, 0.34), goldDark)
      toothOne.position.set(1.18, -0.31, 0)
      const toothTwo = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.82, 0.34), goldDark)
      toothTwo.position.set(1.58, -0.43, 0)
      keyGroup.add(bow, shaft, tip, toothOne, toothTwo)

      const label = new THREE.Mesh(
        new THREE.BoxGeometry(1.14, 0.68, 0.18),
        boxMaterials(labelTexture, 0x082f35, 0x0a4349),
      )
      label.position.set(-1.52, 0.98, 0.08)
      label.rotation.z = 0.16
      keyGroup.add(label)

      const sparkleMaterial = new THREE.MeshBasicMaterial({ color: 0xe8fffc, transparent: true, opacity: 0.8 })
      const sparklePositions = [
        [-3.3, 1.9, -0.5, 0.12],
        [3.42, 1.65, -0.4, 0.09],
        [-2.7, -2.1, -0.7, 0.07],
        [3.1, -0.4, -0.7, 0.06],
      ]
      const sparkles = sparklePositions.map(([x, y, z, radius]) => {
        const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(radius, 0), sparkleMaterial)
        mesh.position.set(x, y, z)
        root.add(mesh)
        return mesh
      })

      const drag = {
        active: false,
        lastX: 0,
        lastY: 0,
        rotationX: 0,
        rotationY: 0,
        velocityX: 0,
        velocityY: 0,
        hoverX: 0,
        hoverY: 0,
      }
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const animationStartedAt = performance.now()

      const resize = () => {
        const rect = mount.getBoundingClientRect()
        const width = Math.max(1, Math.floor(rect.width))
        const height = Math.max(1, Math.floor(rect.height))
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        const isPhone = camera.aspect < 0.75
        camera.position.z = isPhone ? 10.4 : camera.aspect > 1.55 ? 8.25 : 8.95
        root.scale.setScalar(isPhone ? 0.84 : camera.aspect > 1.55 ? 1.02 : 0.94)
        camera.updateProjectionMatrix()
      }

      const updateHover = (event) => {
        const rect = mount.getBoundingClientRect()
        drag.hoverX = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2
        drag.hoverY = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2
      }
      const onPointerDown = (event) => {
        drag.active = true
        drag.lastX = event.clientX
        drag.lastY = event.clientY
        drag.velocityX = 0
        drag.velocityY = 0
        renderer.domElement.setPointerCapture?.(event.pointerId)
      }
      const onPointerMove = (event) => {
        updateHover(event)
        if (!drag.active) return
        const dx = event.clientX - drag.lastX
        const dy = event.clientY - drag.lastY
        drag.rotationY = THREE.MathUtils.clamp(drag.rotationY + dx * 0.0048, -0.38, 0.38)
        drag.rotationX = THREE.MathUtils.clamp(drag.rotationX + dy * 0.0036, -0.2, 0.2)
        drag.velocityY = dx * 0.0005
        drag.velocityX = dy * 0.00035
        drag.lastX = event.clientX
        drag.lastY = event.clientY
      }
      const onPointerUp = (event) => {
        drag.active = false
        renderer.domElement.releasePointerCapture?.(event.pointerId)
      }
      const onPointerLeave = () => {
        drag.hoverX = 0
        drag.hoverY = 0
      }

      const animate = () => {
        const time = (performance.now() - animationStartedAt) / 1000
        const motion = reducedMotion ? 0.18 : 1
        if (!drag.active) {
          drag.rotationY = THREE.MathUtils.clamp(drag.rotationY + drag.velocityY, -0.38, 0.38)
          drag.rotationX = THREE.MathUtils.clamp(drag.rotationX + drag.velocityX, -0.2, 0.2)
          drag.velocityY *= 0.94
          drag.velocityX *= 0.94
        }
        const autoTurn = reducedMotion ? 0 : Math.sin(time * 0.28) * 0.045
        const targetY = THREE.MathUtils.clamp(-0.08 + drag.rotationY + autoTurn + drag.hoverX * 0.045, -0.5, 0.34)
        const targetX = THREE.MathUtils.clamp(-0.1 + drag.rotationX - drag.hoverY * 0.035, -0.28, 0.16)
        root.rotation.y += (targetY - root.rotation.y) * 0.075
        root.rotation.x += (targetX - root.rotation.x) * 0.075
        root.rotation.z = Math.sin(time * 0.38) * 0.025 * motion
        passport.position.y = 0.35 + Math.sin(time * 0.78) * 0.12 * motion
        passport.rotation.z = -0.08 + Math.sin(time * 0.42) * 0.03 * motion
        ticketMesh.position.z = 0.31 + Math.sin(time * 1.15) * 0.025 * motion
        keyGroup.position.y = -1.12 + Math.sin(time * 0.92 + 1.4) * 0.13 * motion
        keyGroup.rotation.y = 0.24 + Math.sin(time * 0.62) * 0.15 * motion
        keyGroup.rotation.z = -0.58 + Math.sin(time * 0.54) * 0.08 * motion
        sparkles.forEach((sparkle, index) => {
          const pulse = 0.76 + Math.sin(time * 1.7 + index) * 0.28 * motion
          sparkle.scale.setScalar(pulse)
          sparkle.rotation.y = time * (0.3 + index * 0.06) * motion
        })
        renderer.render(scene, camera)
        animationFrame = requestAnimationFrame(animate)
      }

      resize()
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(mount)
      const canvas = renderer.domElement
      canvas.addEventListener('pointerdown', onPointerDown)
      canvas.addEventListener('pointermove', onPointerMove)
      canvas.addEventListener('pointerup', onPointerUp)
      canvas.addEventListener('pointercancel', onPointerUp)
      canvas.addEventListener('pointerleave', onPointerLeave)
      animate()

      return () => {
        if (animationFrame) cancelAnimationFrame(animationFrame)
        resizeObserver?.disconnect()
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerup', onPointerUp)
        canvas.removeEventListener('pointercancel', onPointerUp)
        canvas.removeEventListener('pointerleave', onPointerLeave)
        scene.traverse((object) => {
          object.geometry?.dispose?.()
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
          else object.material?.dispose?.()
        })
        textures.forEach((texture) => texture.dispose())
        renderer.dispose()
        if (canvas.parentNode === mount) mount.removeChild(canvas)
      }
    } catch (error) {
      console.warn('Lottery 3D scene disabled:', error)
      if (renderer?.domElement?.parentNode === mount) mount.removeChild(renderer.domElement)
      return undefined
    }
  }, [])

  return <div className="lottery-scene" ref={mountRef} />
}

function TicketDialog({ onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="lottery-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="lottery-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lottery-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="lottery-dialog__close" onClick={onClose} aria-label="Закрыть">
          <X size={19} aria-hidden />
        </button>
        <span className="lottery-dialog__icon" aria-hidden>
          <Ticket size={24} strokeWidth={2.2} />
        </span>
        <p className="lottery-dialog__eyebrow">Активный билет</p>
        <h2 id="lottery-dialog-title">{LOTTERY_TICKET}</h2>
        <div className="lottery-dialog__status">
          <Check size={16} strokeWidth={2.6} aria-hidden />
          Билет участвует в розыгрыше
        </div>
        <div className="lottery-dialog__meta">
          <span>Дата розыгрыша</span>
          <strong>30 сентября, 20:00</strong>
        </div>
        <button type="button" className="lottery-dialog__button" onClick={onClose}>
          Понятно
        </button>
      </div>
    </div>
  )
}

export default function LotteryPage() {
  const navigate = useNavigate()
  const [ticketOpen, setTicketOpen] = useState(false)
  const profileName = useMemo(() => getUserData()?.name?.trim() || 'Ваш профиль', [])

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <main className="lottery-page">
      <div className="lottery-page__glow lottery-page__glow--one" aria-hidden />
      <div className="lottery-page__glow lottery-page__glow--two" aria-hidden />

      <header className="lottery-header">
        <button type="button" className="lottery-header__back" onClick={goBack} aria-label="Назад">
          <ArrowLeft size={20} strokeWidth={2.3} aria-hidden />
        </button>
        <OwnerTestProfileMenu
          name={profileName}
          role="Участник лотереи"
          className="lottery-profile"
        />
        <span className="lottery-header__spacer" aria-hidden />
      </header>

      <section className="lottery-hero" aria-labelledby="lottery-title">
        <div className="lottery-hero__copy">
          <p className="lottery-hero__eyebrow">
            <Sparkles size={15} strokeWidth={2.1} aria-hidden />
            Ваш билет участвует
          </p>
          <h1 id="lottery-title">Лотерея</h1>
          <p className="lottery-hero__lead">Паспорт готов. Билет внутри. Удача — следующий пункт назначения.</p>
        </div>

        <div className="lottery-scene-wrap">
          <LotteryThreeScene />
          <span className="lottery-scene-hint">
            <MousePointer2 size={14} strokeWidth={2} aria-hidden />
            Потяните, чтобы покрутить
          </span>
        </div>

        <div className="lottery-facts" aria-label="Информация о розыгрыше">
          <span className="lottery-fact lottery-fact--active">
            <Ticket size={15} aria-hidden />
            1 билет
          </span>
          <span className="lottery-fact">
            <CalendarDays size={15} aria-hidden />
            30 сентября
          </span>
          <span className="lottery-fact">
            <Sparkles size={15} aria-hidden />
            1 победитель
          </span>
        </div>
      </section>

      <section className="lottery-prize-card" aria-label="Главный приз">
        <div>
          <p className="lottery-prize-card__eyebrow">Главный приз</p>
          <h2>
            <strong>€10 000</strong>
            <span>на покупку недвижимости</span>
          </h2>
          <p>Розыгрыш 30 сентября · участие подтверждено</p>
        </div>
        <button type="button" onClick={() => setTicketOpen(true)}>
          <span>Мой билет</span>
          <ArrowUpRight size={15} strokeWidth={2.4} aria-hidden />
        </button>
      </section>

      {ticketOpen ? <TicketDialog onClose={() => setTicketOpen(false)} /> : null}
    </main>
  )
}
