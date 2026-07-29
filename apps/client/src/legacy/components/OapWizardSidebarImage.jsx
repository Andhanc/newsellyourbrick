import { useEffect, useState } from 'react'
import './OapWizardSidebarImage.css'

/** Боковая иллюстрация мастера — async decode, без мигания при смене шага */
export default function OapWizardSidebarImage({ src, className = '' }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
    if (!src || typeof window === 'undefined') return undefined

    const img = new Image()
    img.decoding = 'async'
    img.src = src
    if (img.complete) {
      setReady(true)
      return undefined
    }

    const onLoad = () => setReady(true)
    img.addEventListener('load', onLoad)
    return () => img.removeEventListener('load', onLoad)
  }, [src])

  if (!src) return null

  return (
    <img
      src={src}
      alt=""
      className={[
        'oap-wizard-sidebar-img',
        ready ? 'oap-wizard-sidebar-img--ready' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      decoding="async"
      loading="eager"
      draggable={false}
      onLoad={() => setReady(true)}
    />
  )
}
