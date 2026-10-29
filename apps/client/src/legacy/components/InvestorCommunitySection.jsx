import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMail } from 'react-icons/fi'
import ContributorsWall from './ui/contributors-section'

const propertyPhotoIds = [
  '1564013799919-ab600027ffc6',
  '1568605114967-8130f3a36994',
  '1570129477492-45c003edd2be',
  '1512917774080-9991f1c4c750',
  '1600585154340-be6161a56a0c',
  '1600596542815-ffad4c1539a9',
  '1605276374104-dee2a0ed3cd6',
  '1605146769289-440113cc3d00',
  '1583608205776-bfd35f0d9f83',
  '1512453979798-5ea266f8880c',
  '1486406146926-c627a92ad1ab',
  '1493809842364-78817add7ffb',
  '1502672260266-1c1ef2d93688',
  '1522708323590-d24dbb6b0267',
  '1484154218962-a197022b5858',
  '1501183638710-841dd1904471',
  '1600607687939-ce8a6c25118c',
  '1582268611958-ebfd161ef9cf',
]

const newsletterCardMeta = [
  {
    key: 'card-1',
    image: '/images/external/photo-1600585154340-be6161a56a0c-08c1b1d59d.jpg',
    titleKey: 'investCommunity_card1Title',
    excerptKey: 'investCommunity_card1Excerpt',
    className: 'invest-community__float--1',
  },
  {
    key: 'card-2',
    image: '/images/external/photo-1507525428034-b723cf961d3e-ae413f8ef9.jpg',
    titleKey: 'investCommunity_card2Title',
    excerptKey: 'investCommunity_card2Excerpt',
    className: 'invest-community__float--2',
  },
  {
    key: 'card-3',
    image: '/images/external/photo-1486406146926-c627a92ad1ab-f0c377ec01.jpg',
    titleKey: 'investCommunity_card3Title',
    excerptKey: 'investCommunity_card3Excerpt',
    className: 'invest-community__float--3',
  },
]

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

export default function InvestorCommunitySection() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const properties = useMemo(
    () =>
      Array.from({ length: 180 }, (_, i) => {
        const id = propertyPhotoIds[i % propertyPhotoIds.length]
        return {
          username: t('investCommunity_propertyLabel', { n: i + 1 }),
          avatarUrl: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=160&h=160&q=60`,
        }
      }),
    [t],
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!isValidEmail(email)) return
    setSent(true)
    window.setTimeout(() => {
      setSent(false)
      setEmail('')
    }, 2600)
  }

  return (
    <section className="invest-community" aria-label={t('investCommunity_aria')}>
      <div className="invest-community__wall-wrap">
        <ContributorsWall
          contributors={properties}
          totalCount={1000}
          columns={18}
          tilt={16}
          speed={22}
          height={560}
          showHeader={false}
          pauseOnHover={false}
          showTooltip={false}
          fullWidth
          wallBg="#fbfcfd"
          className="invest-community__wall-inner"
        />
        <div className="invest-community__overlay">
          <header className="invest-community__header">
            <h2 className="invest-community__title">
              {t('investCommunity_titleBefore')}{' '}
              <span>{t('investCommunity_titleAccent')}</span>{' '}
              {t('investCommunity_titleAfter')}
            </h2>
          </header>
        </div>
      </div>

      <div className="invest-shell invest-community__inner">
        <div className="invest-community__card">
          <div className="invest-community__card-copy">
            <h3 className="invest-community__card-title">
              {t('investCommunity_newsletterTitle')}
            </h3>
            <form className="invest-community__form" onSubmit={handleSubmit}>
              <div className="invest-community__field">
                <FiMail className="invest-community__field-icon" size={18} aria-hidden />
                <input
                  type="email"
                  className="invest-community__input"
                  placeholder={t('investCommunity_emailPlaceholder')}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  disabled={sent}
                />
              </div>
              <button
                className="invest-community__submit"
                type="submit"
                disabled={sent || !isValidEmail(email)}
              >
                {sent ? t('investCommunity_subscribed') : t('investCommunity_subscribe')}
              </button>
            </form>
          </div>

          <div className="invest-community__visual" aria-hidden>
            {newsletterCardMeta.map((card) => (
              <article key={card.key} className={`invest-community__float ${card.className}`}>
                <div className="invest-community__float-media">
                  <img src={card.image} alt="" loading="lazy" decoding="async" />
                </div>
                <div className="invest-community__float-body">
                  <p className="invest-community__float-title">{t(card.titleKey)}</p>
                  <p className="invest-community__float-excerpt">{t(card.excerptKey)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
