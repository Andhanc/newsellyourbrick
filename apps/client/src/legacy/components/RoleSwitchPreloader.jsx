import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { SiteBrandWordmark } from './SiteBrandLogo'
import { publicAsset } from '../utils/publicAsset'
import './RoleSwitchPreloader.css'

export default function RoleSwitchPreloader({ message }) {
  useEffect(() => {
    const root = document.getElementById('root')
    const previousInert = root?.inert
    const previousOverflow = document.body.style.overflow
    if (root) root.inert = true
    document.body.style.overflow = 'hidden'
    document.activeElement?.blur?.()
    const keepFocus = event => {
      if (['Tab', 'Enter', 'Escape'].includes(event.key)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    document.addEventListener('keydown', keepFocus, true)
    return () => {
      document.removeEventListener('keydown', keepFocus, true)
      if (root) root.inert = previousInert
      document.body.style.overflow = previousOverflow
    }
  }, [])
  return createPortal(
    <div className="role-switch-preloader" role="status" aria-live="polite" aria-busy="true" data-role-switch-loader>
      <div className="role-switch-preloader__glow" aria-hidden="true" />
      <div className="role-switch-preloader__content">
        <div className="role-switch-preloader__emblem" aria-hidden="true">
          <span className="role-switch-preloader__orbit" />
          <img src={publicAsset('icons/icon-192.png')} alt="" width="72" height="72" />
        </div>
        <div className="role-switch-preloader__brand"><SiteBrandWordmark /></div>
        <p className="role-switch-preloader__message">{message}</p>
        <div className="role-switch-preloader__track" aria-hidden="true"><span /></div>
      </div>
    </div>,
    document.body,
  )
}
