import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import { publicAsset } from '../utils/publicAsset'
import './VipLockedAuctionCard.css'

const COVER = publicAsset('images/auction/vip-covered-card.webp')

export default function VipLockedAuctionCard({ className = '', compact = false }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <>
      <article className={`vip-locked-card ${compact ? 'vip-locked-card--compact' : ''} ${className}`}>
        <button type="button" className="vip-locked-card__trigger" onClick={() => setOpen(true)} aria-label={t('vipTeaser_open')} aria-haspopup="dialog">
          <img className="vip-locked-card__art" src={COVER} alt="" loading="lazy" width="900" height="1200" />
        </button>
      </article>
      <BuyerSheetShell isOpen={open} onClose={() => setOpen(false)} titleId={`${id}-title`} describedBy={`${id}-description`} className="vip-access-drawer"
        footer={<button type="button" className="vip-access-drawer__cta btn-tiffany-shine" onClick={() => { setOpen(false); navigate('/private-club') }}>{t('vipTeaser_continue')}</button>}>
        <h2 id={`${id}-title`}>{t('vipTeaser_drawerTitle')}</h2>
        <p id={`${id}-description`}>{t('vipTeaser_drawerDescription')}</p>
      </BuyerSheetShell>
    </>
  )
}
