import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, ChevronDown } from 'lucide-react'
import {
  formatOwnerTestDateRangeLabel,
  getDefaultOwnerTestDateRange,
  getOwnerTestDatePresets,
} from '../utils/ownerTestDateRange'
import { getOwnerTestIntlLocale } from '../utils/ownerTestI18n'
import './OwnerTestDateRangeControl.css'

function DateRangePopover({ open, draftRange, onDraftChange, onPreset, onApply, onClose, t, locale, datePresets }) {
  return (
    <div className={`otdrc-popover${open ? ' otdrc-popover--open' : ''}`}>
      <div className="otdrc-popover__head">
        <span>{t('ownerTest_dateRangeTitle')}</span>
        <strong>{formatOwnerTestDateRangeLabel(draftRange, locale)}</strong>
      </div>
      <div className="otdrc-popover__presets" aria-label={t('ownerTest_ariaQuickPeriod')}>
        {datePresets.map((preset) => {
          const active = draftRange.from === preset.from && draftRange.to === preset.to
          return (
            <button
              key={preset.id}
              type="button"
              className={`otdrc-popover__preset${active ? ' otdrc-popover__preset--active' : ''}`}
              onClick={() => onPreset(preset)}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
      <div className="otdrc-popover__fields">
        <label>
          <span>{t('ownerTest_dateFrom')}</span>
          <input
            type="date"
            value={draftRange.from}
            onChange={(event) => onDraftChange({ ...draftRange, from: event.target.value })}
          />
        </label>
        <label>
          <span>{t('ownerTest_dateTo')}</span>
          <input
            type="date"
            value={draftRange.to}
            onChange={(event) => onDraftChange({ ...draftRange, to: event.target.value })}
          />
        </label>
      </div>
      <div className="otdrc-popover__actions">
        <button type="button" className="otdrc-popover__ghost" onClick={onClose}>
          {t('ownerTest_dateCancel')}
        </button>
        <button type="button" className="otdrc-popover__apply" onClick={onApply}>
          {t('ownerTest_dateApply')}
        </button>
      </div>
    </div>
  )
}

export default function OwnerTestDateRangeControl({
  value,
  onChange,
  className = '',
  pillClassName = '',
  fullWidth = false,
}) {
  const { t, i18n } = useTranslation()
  const intlLocale = useMemo(() => getOwnerTestIntlLocale(i18n.language), [i18n.language])
  const [open, setOpen] = useState(false)
  const [draftRange, setDraftRange] = useState(value || getDefaultOwnerTestDateRange())

  const datePresets = useMemo(() => getOwnerTestDatePresets(t), [t])

  useEffect(() => {
    if (value) setDraftRange(value)
  }, [value])

  const close = useCallback(() => setOpen(false), [])

  const handleApply = useCallback(() => {
    onChange?.(draftRange)
    setOpen(false)
  }, [draftRange, onChange])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  return (
    <div className={`otdrc${fullWidth ? ' otdrc--full' : ''} ${className}`.trim()}>
      <button
        type="button"
        className={`otdrc-pill${fullWidth ? ' otdrc-pill--full' : ''} ${pillClassName}`.trim()}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setDraftRange(value || getDefaultOwnerTestDateRange())
          setOpen((prev) => !prev)
        }}
      >
        <Calendar size={16} strokeWidth={2} aria-hidden />
        <span>{formatOwnerTestDateRangeLabel(value || draftRange, intlLocale)}</span>
        <ChevronDown size={16} strokeWidth={2.2} aria-hidden />
      </button>
      <DateRangePopover
        open={open}
        draftRange={draftRange}
        onDraftChange={setDraftRange}
        onPreset={setDraftRange}
        onApply={handleApply}
        onClose={close}
        t={t}
        locale={intlLocale}
        datePresets={datePresets}
      />
    </div>
  )
}
