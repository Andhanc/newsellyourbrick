import { useState, useEffect, useRef } from 'react'
import { FiX, FiCheck } from 'react-icons/fi'
import { FaWhatsapp } from 'react-icons/fa'
import { sendWhatsAppVerificationCode, verifyWhatsAppCode, validatePhoneNumber } from '../services/authService'
import PhoneInput from './PhoneInput'
import './PhoneInput.css'
import './WhatsAppVerificationModal.css'
/**
 * mode: 'login' | 'register'
 * role: 'buyer' | 'seller'
 */
const WhatsAppVerificationModal = ({ isOpen, onClose, onSuccess, phoneNumber, role = 'buyer', mode = 'login' }) => {
  const [phone, setPhone] = useState(phoneNumber || '')
  const [phoneDigits, setPhoneDigits] = useState('') // Сохраняем номер в цифровом формате
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('phone') // 'phone' или 'code'
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef([])

  useEffect(() => {
    if (phoneNumber) {
      setPhone(phoneNumber)
      // Сохраняем номер в цифровом формате
      const digits = phoneNumber.replace(/\D/g, '')
      setPhoneDigits(digits)
      setStep('code')
      handleSendCode()
    }
  }, [phoneNumber])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handlePhoneChange = (e) => {
    const value = e.target.value
    setPhone(value)
    // Сохраняем номер в цифровом формате (убираем все кроме цифр)
    const digits = value.replace(/\D/g, '')
    setPhoneDigits(digits)
    setError('')
  }

  const handleSendCode = async () => {
    // Валидация номера телефона
    const validation = validatePhoneNumber(phone)
    if (!validation.valid) {
      setError(validation.error || 'Введите корректный номер телефона')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Используем сохраненный номер в цифровом формате или форматируем текущий
      const digitsToSend = phoneDigits || phone.replace(/\D/g, '')
      if (!digitsToSend) {
        setError('Введите номер телефона')
        setIsLoading(false)
        return
      }
      
      // Проверяем, существует ли пользователь в БД (для быстрого входа)
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
        const checkResponse = await fetch(`${API_BASE_URL}/users/phone/${digitsToSend}`)
        if (checkResponse.ok) {
          const checkData = await checkResponse.json()
          if (checkData.success && checkData.data) {
            // Пользователь найден - предлагаем быстрый вход
            const userFromDB = checkData.data
            console.log('✅ Пользователь найден в БД. Можно использовать быстрый вход.')
            // Продолжаем обычный процесс отправки кода, но пользователь уже существует
          }
        }
      } catch (checkError) {
        console.log('Проверка пользователя не удалась, продолжаем обычный процесс:', checkError.message)
      }
      
      const result = await sendWhatsAppVerificationCode(digitsToSend)

      if (result.success) {
        // Сохраняем номер в цифровом формате для проверки кода
        setPhoneDigits(digitsToSend)
        setStep('code')
        setCountdown(60) // 60 секунд до возможности повторной отправки
        // Фокусируемся на первом поле ввода кода
        setTimeout(() => {
          if (inputRefs.current[0]) {
            inputRefs.current[0].focus()
          }
        }, 100)
      } else {
        setError(result.error || 'Не удалось отправить код')
      }
    } catch (error) {
      console.error('Ошибка отправки кода:', error)
      setError('Произошла ошибка. Попробуйте позже.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeChange = (index, value) => {
    // Разрешаем только цифры
    if (value && !/^\d$/.test(value)) {
      return
    }

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setError('')

    // Автоматически переходим к следующему полю
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Если все поля заполнены, автоматически проверяем код
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerifyCode(newCode.join(''))
    }
  }

  const handleCodeKeyDown = (index, e) => {
    // Обработка Backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    
    // Обработка стрелок
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6)
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCode(newCode)
      inputRefs.current[5]?.focus()
      
      // Автоматически проверяем код
      setTimeout(() => {
        handleVerifyCode(pastedData)
      }, 100)
    }
  }

  const handleVerifyCode = async (codeToVerify = null) => {
    const codeString = codeToVerify || code.join('')
    
    if (codeString.length !== 6) {
      setError('Введите полный код')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Используем сохраненный номер в цифровом формате или форматируем текущий
      const digitsToVerify = phoneDigits || phone.replace(/\D/g, '')
      if (!digitsToVerify) {
        setError('Номер телефона не найден. Запросите новый код.')
        setIsLoading(false)
        return
      }
      const result = await verifyWhatsAppCode(digitsToVerify, codeString, role, mode)

      if (result.success) {
        // Успешная авторизация
        if (onSuccess) {
          onSuccess(result.user)
        }
        onClose()
      } else {
        setError(result.error || 'Неверный код. Попробуйте еще раз.')
        // Очищаем поля ввода
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (error) {
      console.error('Ошибка верификации кода:', error)
      setError('Произошла ошибка. Попробуйте позже.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = () => {
    if (countdown > 0) return
    setCode(['', '', '', '', '', ''])
    handleSendCode()
  }

  if (!isOpen) return null

  return (
    <div className="whatsapp-verification-overlay" onClick={onClose}>
      <div className="whatsapp-verification-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="whatsapp-verification-modal__close" 
          onClick={onClose}
          aria-label="Закрыть"
        >
          <FiX size={24} />
        </button>

        <div className="whatsapp-verification-modal__header">
          <div className="whatsapp-verification-modal__icon">
            <FaWhatsapp size={32} />
          </div>
          <h2 className="whatsapp-verification-modal__title">
            {step === 'phone'
              ? (mode === 'login' ? 'Вход через WhatsApp' : 'Регистрация через WhatsApp')
              : 'Введите код'}
          </h2>
          <p className="whatsapp-verification-modal__subtitle">
            {step === 'phone' 
              ? 'Введите номер телефона, и мы отправим код в WhatsApp'
              : `Код отправлен на номер ${phone}`}
          </p>
        </div>

        {error && (
          <div className="whatsapp-verification-modal__error">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <div className="whatsapp-verification-modal__form">
            <div className="whatsapp-verification-modal__field">
              <label htmlFor="phone" className="whatsapp-verification-modal__label">
                Номер телефона
              </label>
              <PhoneInput
                value={phone}
                onChange={handlePhoneChange}
                error={error}
                disabled={isLoading}
              />
            </div>

            <button 
              type="button"
              className="whatsapp-verification-modal__submit"
              onClick={handleSendCode}
              disabled={isLoading || !phone || phone.replace(/[^\d+]/g, '').replace(/^\+/, '').length < 10}
            >
              {isLoading ? 'Отправка...' : 'Отправить код'}
            </button>
          </div>
        ) : (
          <div className="whatsapp-verification-modal__form">
            <div className="whatsapp-verification-modal__code-container">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="whatsapp-verification-modal__code-input"
                  disabled={isLoading}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <div className="whatsapp-verification-modal__resend">
              <span className="whatsapp-verification-modal__resend-text">
                Не получили код?
              </span>
              <button
                type="button"
                className="whatsapp-verification-modal__resend-button"
                onClick={handleResendCode}
                disabled={countdown > 0 || isLoading}
              >
                {countdown > 0 ? `Отправить снова (${countdown}с)` : 'Отправить снова'}
              </button>
            </div>

            <button 
              type="button"
              className="whatsapp-verification-modal__submit"
              onClick={() => handleVerifyCode()}
              disabled={isLoading || code.some(digit => !digit)}
            >
              {isLoading ? 'Проверка...' : 'Проверить код'}
            </button>
          </div>
        )}

        <div className="whatsapp-verification-modal__footer">
          <button 
            type="button"
            className="whatsapp-verification-modal__back-button"
            onClick={() => {
              setStep('phone')
              setCode(['', '', '', '', '', ''])
              setError('')
            }}
            style={{ display: step === 'code' ? 'block' : 'none' }}
          >
            Изменить номер
          </button>
        </div>
      </div>
    </div>
  )
}

export default WhatsAppVerificationModal

