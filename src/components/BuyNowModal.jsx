import { useState } from 'react'
import { FiX, FiCheckCircle, FiFileText, FiCreditCard, FiShield } from 'react-icons/fi'
import { useUser } from '@clerk/clerk-react'
import { getUserData } from '../services/authService'
import { getApiBaseUrl } from '../utils/apiConfig'
import { getEmailJsConfig } from '../utils/env'
import emailjs from '@emailjs/browser'
import { showNotification } from '../utils/toastHelper'
import './BuyNowModal.css'

const BuyNowModal = ({ isOpen, onClose, property }) => {
  const { user, isLoaded: userLoaded } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  if (!isOpen) return null

  const propertyTitle = property?.title || property?.name || 'Объект недвижимости'
  const propertyPrice = property?.price || 0
  const currency = property?.currency || 'USD'
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'BYN' ? 'Br' : ''

  // Функция отправки email подтверждения
  const sendPurchaseConfirmationEmail = async (email, buyerName, propertyTitle, price, currencySymbol) => {
    if (!email) return

    const emailJsConfig = getEmailJsConfig()
    const EMAILJS_SERVICE_ID = emailJsConfig.serviceId || ''
    const EMAILJS_TEMPLATE_ID = emailJsConfig.templateId || ''
    const EMAILJS_PUBLIC_KEY = emailJsConfig.publicKey || ''

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      console.warn('EmailJS не настроен для отправки подтверждения')
      return
    }

    try {
      // Инициализируем EmailJS, если еще не инициализирован
      if (EMAILJS_PUBLIC_KEY) {
        emailjs.init(EMAILJS_PUBLIC_KEY)
      }

      // Формируем такое же сообщение, как в WhatsApp
      const emailMessage = `🎉 Здравствуйте, ${buyerName || 'Покупатель'}!

Ваш запрос на покупку объекта недвижимости успешно принят!

📋 Детали запроса:
🏠 Объект: ${propertyTitle}
💰 Цена: ${currencySymbol}${price.toLocaleString('ru-RU')}

Наш менеджер свяжется с вами в течение 24 часов для уточнения деталей и ответов на ваши вопросы.

С уважением,
Команда Sellyourbrick`

      const templateParams = {
        to_email: email,
        email: email,
        buyer_name: buyerName || 'Покупатель',
        property_title: propertyTitle,
        property_price: `${currencySymbol}${price.toLocaleString('ru-RU')}`,
        message: emailMessage,
        from_name: 'Sellyourbrick'
      }

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      )
      console.log('✅ Email подтверждения отправлен')
    } catch (error) {
      console.error('Ошибка отправки email:', error)
      throw error
    }
  }

  // Функция отправки WhatsApp подтверждения
  const sendPurchaseConfirmationWhatsApp = async (phone, buyerName, propertyTitle, price, currencySymbol) => {
    if (!phone) return

    try {
      const API_BASE_URL = await getApiBaseUrl()
      // Форматируем номер телефона (убираем все нецифровые символы)
      const formattedPhone = phone.replace(/\D/g, '')

      const message = `🎉 Здравствуйте, ${buyerName || 'Покупатель'}!

Ваш запрос на покупку объекта недвижимости успешно принят!

📋 Детали запроса:
🏠 Объект: ${propertyTitle}
💰 Цена: ${currencySymbol}${price.toLocaleString('ru-RU')}

Наш менеджер свяжется с вами в течение 24 часов для уточнения деталей и ответов на ваши вопросы.

С уважением,
Команда Sellyourbrick`

      const response = await fetch(`${API_BASE_URL}/whatsapp/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message
        })
      })

      if (response.ok) {
        console.log('✅ WhatsApp сообщение отправлено')
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.warn('Не удалось отправить WhatsApp:', errorData.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Ошибка отправки WhatsApp:', error)
      throw error
    }
  }

  const handleSubmitRequest = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Проверяем, что пользователь не является продавцом
      const userData = getUserData()
      const userRole = userData?.role || 'buyer'
      if (userRole === 'seller' || userRole === 'owner') {
        showNotification('Продавцы не могут покупать объекты')
        setIsSubmitting(false)
        return
      }

      // Получаем данные текущего пользователя
      let buyerData = {}
      
      // Пробуем получить данные из Clerk
      if (userLoaded && user) {
        const userName = user.fullName || 
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
          user.username || 
          'Пользователь'
        
        const userEmail = user.primaryEmailAddress?.emailAddress || 
          (user.emailAddresses && user.emailAddresses.length > 0 ? user.emailAddresses[0].emailAddress : '')
        
        const userPhone = user.primaryPhoneNumber?.phoneNumber || 
          (user.phoneNumbers && user.phoneNumbers.length > 0 ? user.phoneNumbers[0].phoneNumber : '')
        
        buyerData = {
          name: userName,
          email: userEmail,
          phone: userPhone,
          userId: user.id
        }
      } else {
        // Если Clerk не используется, получаем из старой системы
        const userData = getUserData()
        buyerData = {
          name: userData.name || 'Пользователь',
          email: userData.email || '',
          phone: userData.phone || userData.phoneFormatted || '',
          userId: userData.id || ''
        }
      }

      // Получаем данные владельца объекта (пробуем все возможные варианты)
      const sellerId = property.user_id || property.userId || property.sellerId || null
      
      // Имя владельца - пробуем все варианты
      let sellerName = property.seller || property.sellerName || null
      if (!sellerName && (property.first_name || property.last_name)) {
        sellerName = `${property.first_name || ''} ${property.last_name || ''}`.trim() || null
      }
      if (!sellerName) {
        sellerName = null // Будет показано "Владелец не указан" в админке
      }
      
      // Email владельца
      const sellerEmail = property.sellerEmail || property.email || null
      
      // Телефон владельца
      const sellerPhone = property.sellerPhone || property.phone_number || null

      // Формируем данные запроса со всеми данными об объекте
      const requestData = {
        // Данные покупателя
        buyerName: buyerData.name,
        buyerEmail: buyerData.email,
        buyerPhone: buyerData.phone,
        buyerId: buyerData.userId,
        
        // Данные владельца объекта
        sellerId: sellerId,
        sellerName: sellerName,
        sellerEmail: sellerEmail,
        sellerPhone: sellerPhone,
        
        // Данные объекта недвижимости (базовые)
        propertyId: property.id,
        propertyTitle: propertyTitle,
        propertyDescription: property.description || '',
        propertyPrice: propertyPrice,
        propertyCurrency: currency,
        propertyLocation: property.location || '',
        propertyType: property.type || property.property_type || '',
        propertyArea: property.area || property.sqft || '',
        
        // Характеристики объекта
        propertyRooms: property.rooms || property.bedrooms || null,
        propertyBedrooms: property.bedrooms || property.rooms || null,
        propertyBathrooms: property.bathrooms || null,
        propertyFloor: property.floor !== undefined && property.floor !== null ? property.floor : null,
        propertyTotalFloors: property.total_floors !== undefined && property.total_floors !== null ? property.total_floors : null,
        propertyYearBuilt: property.year_built !== undefined && property.year_built !== null ? property.year_built : null,
        propertyLivingArea: property.living_area || property.livingArea || null,
        propertyLandArea: property.land_area || property.landArea || null,
        propertyBuildingType: property.building_type || property.buildingType || null,
        
        // Дополнительные характеристики
        propertyRenovation: property.renovation || null,
        propertyCondition: property.condition || null,
        propertyHeating: property.heating || null,
        propertyWaterSupply: property.water_supply || null,
        propertySewerage: property.sewerage || null,
        
        // Удобства (булевы значения)
        propertyBalcony: property.balcony === true || property.balcony === 1 ? 1 : 0,
        propertyParking: property.parking === true || property.parking === 1 ? 1 : 0,
        propertyElevator: property.elevator === true || property.elevator === 1 ? 1 : 0,
        propertyGarage: property.garage === true || property.garage === 1 ? 1 : 0,
        propertyPool: property.pool === true || property.pool === 1 ? 1 : 0,
        propertyGarden: property.garden === true || property.garden === 1 ? 1 : 0,
        propertyElectricity: property.electricity === true || property.electricity === 1 ? 1 : 0,
        propertyInternet: property.internet === true || property.internet === 1 ? 1 : 0,
        propertySecurity: property.security === true || property.security === 1 ? 1 : 0,
        propertyFurniture: property.furniture === true || property.furniture === 1 ? 1 : 0,
        
        // Коммерческая недвижимость
        propertyCommercialType: property.commercial_type || null,
        propertyBusinessHours: property.business_hours || null,
        
        // Дополнительная информация
        requestDate: new Date().toISOString(),
        status: 'pending' // pending, processing, completed, cancelled
      }

      // Отправляем запрос на сервер
      const API_BASE_URL = await getApiBaseUrl()
      const response = await fetch(`${API_BASE_URL}/purchase-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Отправляем email пользователю
        try {
          await sendPurchaseConfirmationEmail(buyerData.email, buyerData.name, propertyTitle, propertyPrice, currencySymbol)
        } catch (emailError) {
          console.warn('Не удалось отправить email:', emailError)
        }

        // Отправляем WhatsApp сообщение пользователю
        if (buyerData.phone) {
          try {
            await sendPurchaseConfirmationWhatsApp(buyerData.phone, buyerData.name, propertyTitle, propertyPrice, currencySymbol)
          } catch (whatsappError) {
            console.warn('Не удалось отправить WhatsApp:', whatsappError)
          }
        }

        showNotification('✅ Запрос на покупку успешно отправлен! Наш менеджер свяжется с вами в течение 24 часов. Проверьте вашу почту и WhatsApp.')
        onClose()
      } else {
        throw new Error(data.error || 'Не удалось отправить запрос')
      }
    } catch (error) {
      console.error('Ошибка отправки запроса на покупку:', error)
      setSubmitError('Не удалось отправить запрос. Попробуйте еще раз.')
      showNotification('❌ Ошибка при отправке запроса. Пожалуйста, попробуйте позже или свяжитесь с нами напрямую.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="buy-now-modal-overlay" onClick={onClose}>
      <div className="buy-now-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="buy-now-modal__close" 
          onClick={onClose}
          aria-label="Закрыть"
        >
          <FiX size={24} />
        </button>

        <div className="buy-now-modal__content">
          <div className="buy-now-modal__header">
            <div className="buy-now-modal__icon">
              <FiCheckCircle size={48} />
            </div>
            <h2 className="buy-now-modal__title">Инструкция по покупке</h2>
            <p className="buy-now-modal__subtitle">{propertyTitle}</p>
          </div>

          <div className="buy-now-modal__price-block">
            <span className="buy-now-modal__price-label">Стоимость:</span>
            <span className="buy-now-modal__price-value">
              {currencySymbol}{propertyPrice.toLocaleString('ru-RU')}
            </span>
          </div>

          <div className="buy-now-modal__instructions">
            <h3 className="buy-now-modal__instructions-title">Как купить объект:</h3>
            
            <div className="buy-now-modal__step">
              <div className="buy-now-modal__step-number">1</div>
              <div className="buy-now-modal__step-content">
                <h4 className="buy-now-modal__step-title">
                  <FiFileText size={20} />
                  Подготовка документов
                </h4>
                <p className="buy-now-modal__step-text">
                  Подготовьте все необходимые документы: паспорт, документы о доходах, 
                  справки из банка (если требуется кредит).
                </p>
              </div>
            </div>

            <div className="buy-now-modal__step">
              <div className="buy-now-modal__step-number">2</div>
              <div className="buy-now-modal__step-content">
                <h4 className="buy-now-modal__step-title">
                  <FiCreditCard size={20} />
                  Оплата
                </h4>
                <p className="buy-now-modal__step-text">
                  После подтверждения заявки вы получите реквизиты для оплаты. 
                  Оплата может быть произведена банковским переводом или через платежную систему.
                </p>
              </div>
            </div>

            <div className="buy-now-modal__step">
              <div className="buy-now-modal__step-number">3</div>
              <div className="buy-now-modal__step-content">
                <h4 className="buy-now-modal__step-title">
                  <FiShield size={20} />
                  Оформление сделки
                </h4>
                <p className="buy-now-modal__step-text">
                  Наш специалист свяжется с вами для согласования деталей сделки, 
                  оформления договора и передачи документов.
                </p>
              </div>
            </div>
          </div>

          <div className="buy-now-modal__contact">
            <p className="buy-now-modal__contact-text">
              После отправки заявки наш менеджер свяжется с вами в течение 24 часов 
              для уточнения деталей и ответов на ваши вопросы.
            </p>
          </div>

          <div className="buy-now-modal__actions">
            <button 
              className="buy-now-modal__button buy-now-modal__button--primary"
              onClick={handleSubmitRequest}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить запрос на покупку'}
            </button>
          </div>
          {submitError && (
            <div className="buy-now-modal__error">
              {submitError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BuyNowModal
