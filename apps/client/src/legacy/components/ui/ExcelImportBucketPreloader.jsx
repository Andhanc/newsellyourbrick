import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  FileSpreadsheet,
  Layers,
  MapPinned,
  Building2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import './ExcelImportBucketPreloader.css'

const PRELOADER_MS = 4000
const PERCENT_STEPS = [
  { id: 1, pct: 10, icon: FileSpreadsheet },
  { id: 2, pct: 30, icon: Layers },
  { id: 3, pct: 45, icon: MapPinned },
  { id: 4, pct: 60, icon: Building2 },
  { id: 5, pct: 90, icon: Sparkles },
  { id: 6, pct: 100, icon: CheckCircle2 },
]

const STEP_MS = PRELOADER_MS / PERCENT_STEPS.length

/**
 * Glass “bucket” + falling percent chips (4s total), inspired by bucket chip demos.
 */
export default function ExcelImportBucketPreloader({ title }) {
  const [step, setStep] = useState(0)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (step >= PERCENT_STEPS.length - 1) return
    const id = window.setTimeout(() => setStep((s) => s + 1), STEP_MS)
    return () => window.clearTimeout(id)
  }, [step])

  const chip = PERCENT_STEPS[step]
  const ChipIcon = chip.icon

  return (
    <div className="excel-bucket-preloader">
      <div className="excel-bucket-preloader__stage">
        <svg
          className="excel-bucket-preloader__svg"
          viewBox="0 0 400 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <linearGradient id="excel-bucket-rim" x1="200" y1="0" x2="200" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="rgba(255,255,255,0.55)" />
              <stop offset="1" stopColor="rgba(10,186,181,0.22)" />
            </linearGradient>
            <linearGradient id="excel-bucket-body" x1="200" y1="60" x2="200" y2="260" gradientUnits="userSpaceOnUse">
              <stop stopColor="rgba(255,255,255,0.42)" />
              <stop offset="1" stopColor="rgba(10,186,181,0.14)" />
            </linearGradient>
            <filter id="excel-bucket-shadow" x="-20" y="-20" width="440" height="300" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="rgba(0, 153, 169, 0.25)" />
            </filter>
          </defs>
          <g filter="url(#excel-bucket-shadow)">
            <path
              d="M60 48 L340 48 L380 232 L20 232 Z"
              fill="url(#excel-bucket-body)"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.2"
            />
            <path
              d="M52 48 L348 48 L338 72 L62 72 Z"
              fill="url(#excel-bucket-rim)"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1"
            />
          </g>
        </svg>

        <div className="excel-bucket-preloader__chips-layer">
          <div className="excel-bucket-preloader__chips-inner">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={chip.id}
                initial={{
                  y: isMobile ? -56 : -80,
                  opacity: 0,
                  scale: 0.82,
                }}
                animate={{ y: 0, opacity: 1, scale: isMobile ? 1 : 1.12 }}
                exit={{
                  y: isMobile ? 88 : 112,
                  opacity: 0,
                  scale: 0.78,
                  transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
                }}
                transition={{
                  duration: 0.48,
                  ease: [0.455, 0.03, 0.515, 0.955],
                }}
                className="excel-bucket-preloader__chip"
              >
                <div className="excel-bucket-preloader__chip-icon">
                  <ChipIcon className="excel-bucket-preloader__chip-icon-svg" strokeWidth={2} />
                </div>
                <div className="excel-bucket-preloader__chip-text">
                  <span className="excel-bucket-preloader__chip-pct">{chip.pct}%</span>
                  <span className="excel-bucket-preloader__chip-sub">{title}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
