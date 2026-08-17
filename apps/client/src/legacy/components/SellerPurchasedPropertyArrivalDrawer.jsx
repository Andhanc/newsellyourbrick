import { useEffect, useId, useRef, useState } from 'react'
import { ArrowRight, Building2, Check, ImagePlus, MapPin, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useOwnerTestNav } from '../context/OwnerTestNavigationContext'
import {
  applyPurchasedPropertyListingPrefill,
  buildPurchasedPropertySnapshot,
  clearPurchasedPropertySellerArrival,
  fetchPropertySnapshot,
  readPurchasedPropertySellerArrival,
  storePurchasedPropertySellerArrival,
} from '../utils/purchasedPropertyListingPrefill'
import { OWNER_VIEWS } from '../utils/ownerTestNav'
import './SellerPurchasedPropertyArrivalDrawer.css'

const TYPE_LABELS = {
  apartment: 'Квартира',
  apartments: 'Апартаменты',
  house: 'Дом',
  villa: 'Вилла',
  commercial: 'Коммерческая недвижимость',
  land: 'Земельный участок',
}

const TRANSFER_ITEMS = [
  { icon: Check, title: 'Уже перенесли', text: 'Название, адрес, характеристики и доступные фотографии.' },
  { icon: ImagePlus, title: 'Нужно проверить', text: 'Актуальность фото, описание и особенности объекта.' },
  { icon: ShieldCheck, title: 'Нужно добавить', text: 'Документы, условия и выбранный формат продажи.' },
]

function PropertyArtwork() {
  return (
    <span className="seller-arrival__artwork" aria-hidden="true">
      <span className="seller-arrival__sun" />
      <span className="seller-arrival__building seller-arrival__building--back" />
      <span className="seller-arrival__building seller-arrival__building--front">
        <i /><i /><i /><i />
      </span>
      <span className="seller-arrival__plant seller-arrival__plant--left" />
      <span className="seller-arrival__plant seller-arrival__plant--right" />
    </span>
  )
}

export default function SellerPurchasedPropertyArrivalDrawer() {
  const { goTo } = useOwnerTestNav()
  const titleId = useId()
  const drawerRef = useRef(null)
  const closeRef = useRef(null)
  const [item, setItem] = useState(() => readPurchasedPropertySellerArrival())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!item?.id) return undefined
    let cancelled = false
    if (!item.title || !item.image || !item.location) {
      void fetchPropertySnapshot(item.id)
        .then((property) => {
          if (cancelled) return
          const snapshot = { ...item, ...buildPurchasedPropertySnapshot(property) }
          storePurchasedPropertySellerArrival(snapshot, { sellerUserId: item.sellerUserId })
          setItem(snapshot)
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [item?.id])

  useEffect(() => {
    if (!item?.id) return undefined
    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setItem(null)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(
        drawerRef.current?.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') || [],
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [item?.id])

  if (!item?.id) return null

  const dismiss = () => {
    // "Позже" only hides the welcome for this mounted screen. The durable
    // handoff remains and the drawer is offered again on the next cabinet visit.
    setItem(null)
  }

  const startListing = async () => {
    setLoading(true)
    setError('')
    try {
      await applyPurchasedPropertyListingPrefill(item.id)
      clearPurchasedPropertySellerArrival()
      setItem(null)
      goTo(OWNER_VIEWS.ADD_PROPERTY)
    } catch {
      setError('Не удалось подготовить черновик. Проверьте соединение и попробуйте ещё раз.')
      setLoading(false)
    }
  }

  const typeLabel = TYPE_LABELS[String(item.property_type || '').toLowerCase()] || 'Недвижимость'

  return (
    <div
      className="seller-arrival__overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) dismiss()
      }}
    >
      <aside
        ref={drawerRef}
        className="seller-arrival"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <span className="seller-arrival__grabber" aria-hidden="true" />
        <header className="seller-arrival__header">
          <span className="seller-arrival__eyebrow"><Sparkles size={14} aria-hidden /> Новый объект</span>
          <button ref={closeRef} type="button" className="seller-arrival__close" onClick={dismiss} disabled={loading} aria-label="Закрыть">
            <X size={20} aria-hidden />
          </button>
        </header>

        <div className="seller-arrival__scroll">
          <section className="seller-arrival__intro">
            <span className="seller-arrival__intro-icon"><Building2 size={22} aria-hidden /></span>
            <h2 id={titleId}>У вас есть объект!</h2>
            <p>Покупка уже связана с кабинетом продавца. Мы подготовим карточку — вам не придётся заполнять всё заново.</p>
          </section>

          <article className="seller-arrival__property">
            <div className="seller-arrival__media">
              {item.image ? <img src={item.image} alt="" /> : <PropertyArtwork />}
              <span className="seller-arrival__status"><Check size={13} aria-hidden /> Данные найдены</span>
            </div>
            <div className="seller-arrival__property-copy">
              <span>{typeLabel}</span>
              <h3>{item.title || 'Ваш купленный объект'}</h3>
              {item.location ? <p><MapPin size={14} aria-hidden /> {item.location}</p> : null}
            </div>
          </article>

          <section className="seller-arrival__transfer" aria-label="Что будет перенесено">
            {TRANSFER_ITEMS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="seller-arrival__transfer-item">
                <span><Icon size={17} aria-hidden /></span>
                <div><strong>{title}</strong><p>{text}</p></div>
              </div>
            ))}
          </section>

          <div className="seller-arrival__note">
            <Sparkles size={17} aria-hidden />
            <p><strong>Черновик остаётся приватным.</strong> Объект появится в каталоге только после вашего подтверждения и модерации.</p>
          </div>
        </div>

        <footer className="seller-arrival__footer">
          {error ? <p className="seller-arrival__error" role="alert">{error}</p> : null}
          <button type="button" className="seller-arrival__primary" onClick={startListing} disabled={loading}>
            {loading ? <span className="seller-arrival__spinner" aria-hidden /> : null}
            {loading ? 'Готовим черновик…' : 'Дозаполнить объект'}
            {!loading ? <ArrowRight size={19} aria-hidden /> : null}
          </button>
          <button type="button" className="seller-arrival__later" onClick={dismiss} disabled={loading}>Вернуться к этому позже</button>
        </footer>
      </aside>
    </div>
  )
}
