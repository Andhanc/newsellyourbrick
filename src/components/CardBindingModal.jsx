import { useState } from 'react'
import './CardBindingModal.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const CardBindingModal = ({ isOpen, onClose, userId, onComplete }) => {
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cardType, setCardType] = useState(null)
  const [validFields, setValidFields] = useState({})
  const [isFlipped, setIsFlipped] = useState(false)

  const formatCardNumber = (value) => {
    // Удаляем все нецифровые символы
    const numbers = value.replace(/\D/g, '')
    // Ограничиваем до 19 цифр (максимальная длина для Visa)
    const limited = numbers.slice(0, 19)
    // Добавляем пробелы каждые 4 цифры
    return limited.replace(/(.{4})/g, '$1 ').trim()
  }

  const formatExpiryDate = (value) => {
    // Удаляем все нецифровые символы
    const numbers = value.replace(/\D/g, '')
    // Ограничиваем до 4 цифр
    const limited = numbers.slice(0, 4)
    // Добавляем слеш после 2 цифр
    if (limited.length >= 2) {
      return limited.slice(0, 2) + '/' + limited.slice(2)
    }
    return limited
  }

  const formatCVV = (value) => {
    // Удаляем все нецифровые символы и ограничиваем до 3-4 цифр
    return value.replace(/\D/g, '').slice(0, 4)
  }

  // Алгоритм Луна для проверки валидности номера карты
  const luhnAlgorithm = (cardNumber) => {
    const num = cardNumber.replace(/\s/g, '')
    if (!num || num.length < 13) return false
    
    let sum = 0
    let isEven = false
    
    // Проходим по номеру справа налево
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i])
      if (isNaN(digit)) return false
      
      if (isEven) {
        // Удваиваем каждую вторую цифру
        digit *= 2
        // Если результат больше 9, вычитаем 9
        if (digit > 9) {
          digit -= 9
        }
      }
      
      sum += digit
      isEven = !isEven
    }
    
    // Номер валиден, если сумма делится на 10 без остатка
    return sum % 10 === 0
  }

  const detectCardType = (number) => {
    const num = number.replace(/\s/g, '')
    if (!num) return null
    
    // Visa: начинается с 4, длина 13-19 цифр
    if (/^4/.test(num) && num.length >= 13 && num.length <= 19) {
      return 'visa'
    }
    
    // MasterCard: начинается с 51-55 или 2221-2720, длина 16 цифр
    if (num.length === 16) {
      const firstTwo = parseInt(num.substring(0, 2))
      const firstFour = parseInt(num.substring(0, 4))
      
      // Диапазон 51-55
      if (firstTwo >= 51 && firstTwo <= 55) {
        return 'mastercard'
      }
      
      // Диапазон 2221-2720
      if (firstFour >= 2221 && firstFour <= 2720) {
        return 'mastercard'
      }
    }
    
    // American Express: начинается с 34 или 37, длина 15 цифр
    if (/^3[47]/.test(num) && num.length === 15) {
      return 'amex'
    }
    
    // Discover: начинается с 6, длина 16 цифр
    if (/^6/.test(num) && num.length === 16) {
      return 'discover'
    }
    
    return null
  }

  const validateCardNumber = (number) => {
    const num = number.replace(/\s/g, '')
    if (!num) return 'Номер карты обязателен'
    
    // Проверяем, что все символы - цифры
    if (!/^\d+$/.test(num)) return 'Номер карты должен содержать только цифры'
    
    // Проверяем минимальную длину (большинство карт имеют 13-19 цифр)
    if (num.length < 13) return 'Номер карты слишком короткий'
    if (num.length > 19) return 'Номер карты слишком длинный'
    
    // Определяем тип карты
    const detectedType = detectCardType(num)
    if (!detectedType) {
      return 'Неподдерживаемый тип карты. Используйте Visa или MasterCard'
    }
    
    // Проверяем алгоритмом Луна
    if (!luhnAlgorithm(num)) {
      return 'Неверный номер карты. Проверьте правильность ввода'
    }
    
    return null
  }

  const validateExpiryDate = (date) => {
    if (!date) return 'Дата окончания обязательна'
    const [month, year] = date.split('/')
    if (!month || !year) return 'Неверный формат даты'
    const monthNum = parseInt(month)
    const yearNum = parseInt('20' + year)
    const currentDate = new Date()
    const expiryDate = new Date(yearNum, monthNum - 1)
    if (monthNum < 1 || monthNum > 12) return 'Неверный месяц'
    if (expiryDate < currentDate) return 'Карта просрочена'
    return null
  }

  const validateCVV = (cvv) => {
    if (!cvv) return 'CVV обязателен'
    if (cvv.length < 3 || cvv.length > 4) return 'CVV должен содержать 3-4 цифры'
    return null
  }

  const validateCardholderName = (name) => {
    if (!name) return 'Имя держателя карты обязательно'
    if (name.length < 2) return 'Имя слишком короткое'
    if (!/^[a-zA-Zа-яА-ЯёЁ\s]+$/.test(name)) return 'Имя может содержать только буквы'
    return null
  }

  const checkFieldValidity = (fieldName, value) => {
    let isValid = false
    switch (fieldName) {
      case 'cardNumber':
        const num = value.replace(/\s/g, '')
        isValid = num.length >= 13 && 
                  num.length <= 19 && 
                  /^\d+$/.test(num) &&
                  luhnAlgorithm(value) &&
                  detectCardType(value) !== null
        break
      case 'cardholderName':
        isValid = value.length >= 2 && /^[a-zA-Zа-яА-ЯёЁ\s]+$/.test(value)
        break
      case 'expiryDate':
        const [month, year] = value.split('/')
        if (month && year && month.length === 2 && year.length === 2) {
          const monthNum = parseInt(month)
          const yearNum = parseInt('20' + year)
          const currentDate = new Date()
          const expiryDate = new Date(yearNum, monthNum - 1)
          isValid = monthNum >= 1 && monthNum <= 12 && expiryDate >= currentDate
        }
        break
      case 'cvv':
        isValid = value.length >= 3 && value.length <= 4 && /^\d+$/.test(value)
        break
      default:
        isValid = false
    }
    return isValid
  }

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value)
    setCardData(prev => ({ ...prev, cardNumber: formatted }))
    
    // Определяем тип карты с помощью алгоритма Луна
    const num = formatted.replace(/\s/g, '')
    const detectedType = detectCardType(formatted)
    
    // Устанавливаем тип карты только если номер проходит проверку Луна
    if (detectedType && num.length >= 13) {
      if (luhnAlgorithm(formatted)) {
        setCardType(detectedType)
      } else {
        // Если алгоритм Луна не проходит, но номер еще вводится, не сбрасываем тип
        // Тип будет сброшен при валидации
        if (num.length < 16) {
          setCardType(detectedType) // Показываем тип во время ввода
        } else {
          setCardType(null) // Сбрасываем тип если номер невалиден
        }
      }
    } else {
      setCardType(null)
    }
    
    // Очищаем ошибку при вводе
    if (errors.cardNumber) {
      setErrors(prev => ({ ...prev, cardNumber: null }))
    }
    
    // Проверяем валидность (включая алгоритм Луна)
    const numClean = formatted.replace(/\s/g, '')
    const isValid = numClean.length >= 13 && 
                    numClean.length <= 19 && 
                    /^\d+$/.test(numClean) &&
                    luhnAlgorithm(formatted) &&
                    detectCardType(formatted) !== null
    
    setValidFields(prev => ({ ...prev, cardNumber: isValid }))
  }

  const handleExpiryDateChange = (e) => {
    const formatted = formatExpiryDate(e.target.value)
    setCardData(prev => ({ ...prev, expiryDate: formatted }))
    if (errors.expiryDate) {
      setErrors(prev => ({ ...prev, expiryDate: null }))
    }
    // Проверяем валидность
    const isValid = checkFieldValidity('expiryDate', formatted)
    setValidFields(prev => ({ ...prev, expiryDate: isValid }))
  }

  const handleCVVChange = (e) => {
    const formatted = formatCVV(e.target.value)
    setCardData(prev => ({ ...prev, cvv: formatted }))
    if (errors.cvv) {
      setErrors(prev => ({ ...prev, cvv: null }))
    }
    // Проверяем валидность
    const isValid = checkFieldValidity('cvv', formatted)
    setValidFields(prev => ({ ...prev, cvv: isValid }))
    // Переворачиваем карту при фокусе на CVV
    if (formatted.length > 0) {
      setIsFlipped(true)
    }
  }

  const handleCVVFocus = () => {
    setIsFlipped(true)
  }

  const handleCVVBlur = () => {
    // Не переворачиваем обратно, если CVV заполнен
    if (!cardData.cvv) {
      setIsFlipped(false)
    }
  }

  const handleCardholderNameChange = (e) => {
    setCardData(prev => ({ ...prev, cardholderName: e.target.value }))
    if (errors.cardholderName) {
      setErrors(prev => ({ ...prev, cardholderName: null }))
    }
    // Проверяем валидность
    const isValid = checkFieldValidity('cardholderName', e.target.value)
    setValidFields(prev => ({ ...prev, cardholderName: isValid }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Валидация
    const newErrors = {}
    const cardNumberError = validateCardNumber(cardData.cardNumber)
    const expiryDateError = validateExpiryDate(cardData.expiryDate)
    const cvvError = validateCVV(cardData.cvv)
    const cardholderNameError = validateCardholderName(cardData.cardholderName)

    if (cardNumberError) newErrors.cardNumber = cardNumberError
    if (expiryDateError) newErrors.expiryDate = expiryDateError
    if (cvvError) newErrors.cvv = cvvError
    if (cardholderNameError) newErrors.cardholderName = cardholderNameError

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    try {
      // ВАЖНО: Это демо-версия! Настоящая привязка карты требует интеграции с платежным API
      // (например, Stripe, PayPal, или другим платежным провайдером)
      // 
      // В реальном приложении:
      // 1. Данные карты НИКОГДА не должны отправляться на ваш сервер напрямую
      // 2. Используйте токенизацию через платежный провайдер (Stripe Elements, etc.)
      // 3. На сервер отправляется только токен, а не реальные данные карты
      
      // Для безопасности не сохраняем полные данные, только маскированный номер
      const cardNumberClean = cardData.cardNumber.replace(/\s/g, '')
      const maskedCardNumber = cardNumberClean.slice(-4).padStart(16, '*')
      const cardInfo = {
        userId: userId,
        maskedCardNumber: maskedCardNumber,
        last4: cardNumberClean.slice(-4),
        cardType: cardType,
        expiryDate: cardData.expiryDate,
        cardholderName: cardData.cardholderName,
        boundAt: new Date().toISOString()
      }

      // Сохраняем статус привязки карты в БД
      try {
        const cardBoundResponse = await fetch(`${API_BASE_URL}/users/${userId}/card-bound`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            cardBound: true
          })
        })
        
        if (cardBoundResponse.ok) {
          console.log('✅ Статус привязки карты сохранен в БД')
        } else {
          console.warn('⚠️ Не удалось сохранить статус привязки карты в БД')
        }
      } catch (error) {
        console.warn('⚠️ Ошибка при сохранении статуса привязки карты в БД:', error)
      }

      // Сохраняем в localStorage для совместимости
      localStorage.setItem('cardBound', 'true')
      localStorage.setItem('cardInfo', JSON.stringify(cardInfo))

      // Вызываем callback
      if (onComplete) {
        await onComplete()
      }
      
      // Закрываем модальное окно
      onClose()
    } catch (error) {
      console.error('Ошибка при привязке карточки:', error)
      alert('Произошла ошибка при привязке карточки. Попробуйте еще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCardNumberForDisplay = (number) => {
    if (!number) return '**** **** **** ****'
    const digits = number.replace(/\s/g, '')
    let display = digits
    // Дополняем до 16 символов звездочками
    const remaining = 16 - digits.length
    if (remaining > 0) {
      display = digits + '*'.repeat(remaining)
    }
    // Форматируем с пробелами каждые 4 символа
    return display.replace(/(.{4})/g, '$1 ').trim()
  }

  if (!isOpen) return null

  return (
    <div className="card-binding-modal-overlay" onClick={onClose}>
      <div 
        className="card-binding-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="card-binding-modal__close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="card-binding-modal__content">
          <div className="card-binding-modal__header">
            <div className="card-binding-modal__icon">💳</div>
            <h2 className="card-binding-modal__title">
              Привязка банковской карты
            </h2>
            <p className="card-binding-modal__subtitle">
              Для публикации объявлений необходимо привязать банковскую карту
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card-binding-form">
            <div className="card-binding-form__card-preview">
              <div 
                className={`card-container ${isFlipped ? 'card-container--flipped' : ''}`}
                onClick={() => setIsFlipped(!isFlipped)}
                style={{ cursor: 'pointer' }}
              >
                {/* Лицевая сторона карты */}
                <div className={`card-preview card-preview--front ${cardType ? `card-preview--${cardType}` : ''}`}>
                  <div className="card-preview__top">
                    <div className="card-preview__logo">
                      {cardType === 'visa' ? (
                        <span className="card-logo-text">VISA</span>
                      ) : cardType === 'mastercard' ? (
                        <div className="mastercard-logo">
                          <div className="mastercard-circle mastercard-circle--red"></div>
                          <div className="mastercard-circle mastercard-circle--orange"></div>
                        </div>
                      ) : null}
                    </div>
                    <div className="card-preview__icons">
                      <div className="card-icon card-icon--lock">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2C8.13 2 5 5.13 5 9V11C3.9 11 3 11.9 3 13V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V13C21 11.9 20.1 11 19 11V9C19 5.13 15.87 2 12 2ZM12 4C14.76 4 17 6.24 17 9V11H7V9C7 6.24 9.24 4 12 4ZM5 13H19V20H5V13Z" fill="currentColor"/>
                        </svg>
                      </div>
                      <div className="card-icon card-icon--contactless">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
                          <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" fill="currentColor"/>
                          <path d="M12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-preview__chip">
                    <div className="chip"></div>
                  </div>
                  
                  <div className="card-preview__number">
                    {formatCardNumberForDisplay(cardData.cardNumber)}
                  </div>
                  
                  <div className="card-preview__footer">
                    <div className="card-preview__name">
                      {cardData.cardholderName || '**** ****'}
                    </div>
                    <div className="card-preview__expiry">
                      {cardData.expiryDate || '**/**'}
                    </div>
                  </div>
                  
                  <div className="card-preview__lock-bottom">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2C8.13 2 5 5.13 5 9V11C3.9 11 3 11.9 3 13V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V13C21 11.9 20.1 11 19 11V9C19 5.13 15.87 2 12 2Z" fill="currentColor"/>
                    </svg>
                  </div>
                </div>

                {/* Обратная сторона карты */}
                <div className={`card-preview card-preview--back ${cardType ? `card-preview--${cardType}` : ''}`}>
                  <div className="card-preview__magnetic-stripe"></div>
                  <div className="card-preview__cvv-section">
                    <div className="card-preview__cvv-label">CVV</div>
                    <div className="card-preview__cvv-value">
                      {cardData.cvv || '***'}
                    </div>
                  </div>
                  <div className="card-preview__back-logo">
                    {cardType === 'visa' ? (
                      <span className="card-logo-text">VISA</span>
                    ) : cardType === 'mastercard' ? (
                      <div className="mastercard-logo">
                        <div className="mastercard-circle mastercard-circle--red"></div>
                        <div className="mastercard-circle mastercard-circle--orange"></div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-binding-form__fields">
              <div className="form-field">
                <label className="form-field__label">
                  Номер карты
                </label>
                <input
                  type="text"
                  className={`form-field__input ${errors.cardNumber ? 'error' : ''} ${validFields.cardNumber ? 'valid' : ''}`}
                  placeholder="1234 5678 9012 3456"
                  value={cardData.cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength={23}
                />
                {errors.cardNumber && (
                  <span className="form-field__error">{errors.cardNumber}</span>
                )}
              </div>

              <div className="form-field">
                <label className="form-field__label">
                  Имя держателя карты
                </label>
                <input
                  type="text"
                  className={`form-field__input ${errors.cardholderName ? 'error' : ''} ${validFields.cardholderName ? 'valid' : ''}`}
                  placeholder="IVAN IVANOV"
                  value={cardData.cardholderName}
                  onChange={handleCardholderNameChange}
                  style={{ textTransform: 'uppercase' }}
                />
                {errors.cardholderName && (
                  <span className="form-field__error">{errors.cardholderName}</span>
                )}
              </div>

              <div className="form-field-row">
                <div className="form-field">
                  <label className="form-field__label">
                    Срок действия
                  </label>
                  <input
                    type="text"
                    className={`form-field__input ${errors.expiryDate ? 'error' : ''} ${validFields.expiryDate ? 'valid' : ''}`}
                    placeholder="ММ/ГГ"
                    value={cardData.expiryDate}
                    onChange={handleExpiryDateChange}
                    maxLength={5}
                  />
                  {errors.expiryDate && (
                    <span className="form-field__error">{errors.expiryDate}</span>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-field__label">
                    CVV
                  </label>
                  <input
                    type="text"
                    className={`form-field__input ${errors.cvv ? 'error' : ''} ${validFields.cvv ? 'valid' : ''}`}
                    placeholder="***"
                    value={cardData.cvv}
                    onChange={handleCVVChange}
                    onFocus={handleCVVFocus}
                    onBlur={handleCVVBlur}
                    maxLength={4}
                  />
                  {errors.cvv && (
                    <span className="form-field__error">{errors.cvv}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="card-binding-form__security">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#0099A9" strokeWidth="2"/>
                <path d="M12 8V12M12 16H12.01" stroke="#0099A9" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Ваши данные защищены и зашифрованы</span>
            </div>

            <button
              type="submit"
              className="card-binding-form__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="spinner" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="50.24" strokeDashoffset="25.12" strokeLinecap="round">
                      <animateTransform attributeName="transform" type="rotate" values="0 10 10;360 10 10" dur="1s" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                  Привязка...
                </>
              ) : (
                <>
                  Привязать карту
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CardBindingModal
