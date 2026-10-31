import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCheck } from 'react-icons/fi'
import BuyerSheetShell from './buyer-mobile/BuyerSheetShell'
import { UI_LANGUAGES } from '../constants/uiLanguages'
import { showNotification } from '../utils/toastHelper'
import './Footer.css'

export default function LanguageDrawer({ isOpen, onClose, titleId }) {
  const { t, i18n } = useTranslation()
  const generatedTitleId = useId()
  const resolvedTitleId = titleId || generatedTitleId
  const [changing, setChanging] = useState(false)
  const activeCode = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]
  const currentLanguage = UI_LANGUAGES.find((language) => language.code === activeCode) || UI_LANGUAGES[0]

  const changeLanguage = async (code) => {
    if (changing) return
    setChanging(true)
    try {
      await i18n.changeLanguage(code)
      onClose()
    } catch {
      showNotification(t('genericError'), 'error')
    } finally {
      setChanging(false)
    }
  }

  return (
    <BuyerSheetShell
      isOpen={isOpen}
      onClose={onClose}
      titleId={resolvedTitleId}
      closeLabel={t('close')}
      className="footer-lang-drawer"
      tone="detail"
    >
      <div className="footer-lang-drawer__header">
        <p id={resolvedTitleId} className="footer-lang-drawer__title">{t('selectLanguage')}</p>
        <p className="footer-lang-drawer__subtitle" lang={currentLanguage.code}>{currentLanguage.name}</p>
      </div>
      <ul className="footer-lang-drawer__list" role="listbox" aria-labelledby={resolvedTitleId} aria-busy={changing}>
        {UI_LANGUAGES.map((language) => {
          const active = activeCode === language.code
          return (
            <li key={language.code}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                disabled={changing}
                className={`footer-lang-drawer__option${active ? ' footer-lang-drawer__option--active' : ''}`}
                onClick={() => changeLanguage(language.code)}
              >
                <span className={`footer__language-flag footer-lang-drawer__flag ${language.flagClass}`} aria-hidden="true" />
                <span className="footer-lang-drawer__name" lang={language.code}>{language.name}</span>
                {active ? <FiCheck size={18} className="footer-lang-drawer__check" aria-hidden="true" /> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </BuyerSheetShell>
  )
}
