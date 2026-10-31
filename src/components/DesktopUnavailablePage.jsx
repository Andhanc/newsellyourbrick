import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import * as Select from '@radix-ui/react-select'
import { ArrowUpRight, Check, ChevronDown, Smartphone } from 'lucide-react'
import { UI_LANGUAGES } from '../constants/uiLanguages'
import usePageSeo from '../hooks/usePageSeo'
import { publicAsset } from '../utils/publicAsset'
import './DesktopUnavailablePage.css'

const MOBILE_SITE_URL = 'https://sellyourbrick.com/'

export default function DesktopUnavailablePage() {
  const { t, i18n } = useTranslation()
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]
  const currentLanguage = UI_LANGUAGES.find((item) => item.code === language) || UI_LANGUAGES[0]

  useEffect(() => {
    document.documentElement.classList.add('feature-unavailable-active', 'desktop-unavailable-active')
    return () => {
      document.documentElement.classList.remove('feature-unavailable-active', 'desktop-unavailable-active')
    }
  }, [])

  usePageSeo({
    title: t('desktopUnavailableTitle'),
    description: t('desktopPlatformDescription'),
    noindex: true,
  })

  return (
    <main className="desktop-welcome">
      <section className="desktop-welcome__scene" aria-label="SellYourBrick">
        <img
          className="desktop-welcome__photo"
          src={publicAsset('images/mobile-discover/welcome-summer.png')}
          alt=""
          fetchPriority="high"
        />
        <div className="desktop-welcome__shade" />
        <div className="desktop-welcome__brand" aria-label="SellYourBrick">
          <span>Sell</span>
          <span className="desktop-welcome__brand-accent">Your</span>
          <span>Brick</span>
        </div>
        <div className="desktop-welcome__scene-footer">
          <span>sellyourbrick.com</span>
          <ArrowUpRight size={22} aria-hidden="true" />
        </div>
      </section>

      <section className="desktop-welcome__panel" aria-labelledby="desktop-welcome-title">
        <header className="desktop-welcome__topbar">
          <Select.Root
            value={currentLanguage.code}
            onValueChange={(code) => { void i18n.changeLanguage(code) }}
          >
            <Select.Trigger className="desktop-language__trigger" aria-label={t('selectLanguageAria')}>
              <Select.Value asChild>
                <span className="desktop-language__value">
                  <span className="desktop-language__flag" data-language={currentLanguage.code} aria-hidden="true" />
                  <span lang={currentLanguage.code}>{currentLanguage.name}</span>
                </span>
              </Select.Value>
              <Select.Icon asChild>
                <ChevronDown size={16} className="desktop-language__chevron" aria-hidden="true" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="desktop-language__menu"
                position="popper"
                align="end"
                sideOffset={10}
                collisionPadding={16}
              >
                <Select.Viewport className="desktop-language__viewport">
                  <Select.Group>
                    <Select.Label className="desktop-language__label">{t('selectLanguageAria')}</Select.Label>
                    {UI_LANGUAGES.map((item) => (
                      <Select.Item className="desktop-language__option" key={item.code} value={item.code} textValue={item.name}>
                        <span className="desktop-language__flag" data-language={item.code} aria-hidden="true" />
                        <Select.ItemText><span lang={item.code}>{item.name}</span></Select.ItemText>
                        <span className="desktop-language__code" aria-hidden="true">{item.code.toUpperCase()}</span>
                        <Select.ItemIndicator className="desktop-language__check"><Check size={15} aria-hidden="true" /></Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Group>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </header>

        <div className="desktop-welcome__content">
          <p className="desktop-welcome__eyebrow">{t('desktopPlatformEyebrow')}</p>
          <h1 id="desktop-welcome-title" className="desktop-welcome__title">
            <span className="desktop-welcome__title-main">{t('desktopPlatformHeading')}</span>
            {t('desktopPlatformHeadingPrefix')}{' '}
            <span className="desktop-welcome__title-accent">{t('desktopPlatformHeadingAccent')}</span>
          </h1>
          <p className="desktop-welcome__description">{t('desktopPlatformDescription')}</p>

          <section className="desktop-welcome__handoff" aria-labelledby="desktop-scan-title">
            <a
              className="desktop-welcome__qr"
              href={MOBILE_SITE_URL}
              aria-label={t('desktopQrAlt')}
            >
              <img
                src={publicAsset('images/mobile-only-qr.svg')}
                alt={t('desktopQrAlt')}
                width="240"
                height="240"
              />
            </a>
            <div className="desktop-welcome__instructions">
              <span className="desktop-welcome__phone-icon" aria-hidden="true">
                <Smartphone size={30} strokeWidth={1.6} />
              </span>
              <h2 id="desktop-scan-title">{t('desktopScanHeading')}</h2>
              <p>{t('desktopScanDescription')}</p>
              <a href={MOBILE_SITE_URL}>sellyourbrick.com <ArrowUpRight size={14} aria-hidden="true" /></a>
            </div>
          </section>

          <div className="desktop-welcome__mobile-note">
            <span aria-hidden="true" />
            <span>{t('desktopUnavailableHeading')}</span>
          </div>
        </div>

        <footer className="desktop-welcome__footer">
          <span>© {new Date().getFullYear()} SellYourBrick</span>
          <span>{t('desktopNoDownload')}</span>
        </footer>
      </section>
    </main>
  )
}
