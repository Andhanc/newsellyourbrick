import { useState } from 'react'
import { FiX, FiCalendar } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import DatePicker from './DatePicker'
import './TestDriveModal.css'

const TestDriveModal = ({ isOpen, onClose, onNext }) => {
  const { t } = useTranslation()
  const [hasTestDrive, setHasTestDrive] = useState(false)
  const [testDriveDate, setTestDriveDate] = useState('')

  const handleYes = () => {
    setHasTestDrive(true)
  }

  const handleNo = () => {
    onNext({
      hasTestDrive: false,
      testDriveDate: ''
    })
  }

  const handleDateSelected = (date) => {
    setTestDriveDate(date)
    if (date) {
      // Автоматически переходим к следующему шагу после выбора даты
      onNext({
        hasTestDrive: true,
        testDriveDate: date
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="test-drive-modal-overlay" onClick={onClose}>
      <div className="test-drive-modal" onClick={(e) => e.stopPropagation()}>
        <button className="test-drive-modal__close" onClick={onClose} aria-label={t('close')}>
          <FiX size={24} />
        </button>
        
        <div className="test-drive-modal__content">
          <h2 className="test-drive-modal__title">{t('testDriveModal_title')}</h2>
          
          <div className="test-drive-modal__question">
            <p className="test-drive-modal__text">
              {t('testDriveModal_question')}
            </p>
            
            <div className="test-drive-modal__options">
              <button
                type="button"
                className={`test-drive-modal__option ${hasTestDrive ? 'test-drive-modal__option--active' : ''}`}
                onClick={handleYes}
              >
                {t('testDriveModal_yes')}
              </button>
              <button
                type="button"
                className={`test-drive-modal__option ${!hasTestDrive && testDriveDate === '' ? 'test-drive-modal__option--active' : ''}`}
                onClick={handleNo}
              >
                {t('testDriveModal_no')}
              </button>
            </div>
          </div>

          {hasTestDrive && (
            <div className="test-drive-modal__calendar">
              <label className="test-drive-modal__label">
                <FiCalendar size={18} />
                {t('testDriveModal_pickDate')}
              </label>
              <DatePicker
                value={testDriveDate}
                onChange={handleDateSelected}
                minDate={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TestDriveModal
