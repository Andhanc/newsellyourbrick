import { useState, useEffect, useRef } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import { detectPhoneDialByGeo, pickPhoneCountryFromDial } from '../utils/detectPhoneCountryByGeo'


// Полный список всех стран с телефонными кодами
export const COUNTRY_CODES = [
  { code: '1', name: 'США/Канада', flag: '🇺🇸' },
  { code: '7', name: 'Россия/Казахстан', flag: '🇷🇺' },
  { code: '20', name: 'Египет', flag: '🇪🇬' },
  { code: '27', name: 'ЮАР', flag: '🇿🇦' },
  { code: '30', name: 'Греция', flag: '🇬🇷' },
  { code: '31', name: 'Нидерланды', flag: '🇳🇱' },
  { code: '32', name: 'Бельгия', flag: '🇧🇪' },
  { code: '33', name: 'Франция', flag: '🇫🇷' },
  { code: '34', name: 'Испания', flag: '🇪🇸' },
  { code: '36', name: 'Венгрия', flag: '🇭🇺' },
  { code: '39', name: 'Италия', flag: '🇮🇹' },
  { code: '40', name: 'Румыния', flag: '🇷🇴' },
  { code: '41', name: 'Швейцария', flag: '🇨🇭' },
  { code: '43', name: 'Австрия', flag: '🇦🇹' },
  { code: '44', name: 'Великобритания', flag: '🇬🇧' },
  { code: '45', name: 'Дания', flag: '🇩🇰' },
  { code: '46', name: 'Швеция', flag: '🇸🇪' },
  { code: '47', name: 'Норвегия', flag: '🇳🇴' },
  { code: '48', name: 'Польша', flag: '🇵🇱' },
  { code: '49', name: 'Германия', flag: '🇩🇪' },
  { code: '51', name: 'Перу', flag: '🇵🇪' },
  { code: '52', name: 'Мексика', flag: '🇲🇽' },
  { code: '53', name: 'Куба', flag: '🇨🇺' },
  { code: '54', name: 'Аргентина', flag: '🇦🇷' },
  { code: '55', name: 'Бразилия', flag: '🇧🇷' },
  { code: '56', name: 'Чили', flag: '🇨🇱' },
  { code: '57', name: 'Колумбия', flag: '🇨🇴' },
  { code: '58', name: 'Венесуэла', flag: '🇻🇪' },
  { code: '60', name: 'Малайзия', flag: '🇲🇾' },
  { code: '61', name: 'Австралия', flag: '🇦🇺' },
  { code: '62', name: 'Индонезия', flag: '🇮🇩' },
  { code: '63', name: 'Филиппины', flag: '🇵🇭' },
  { code: '64', name: 'Новая Зеландия', flag: '🇳🇿' },
  { code: '65', name: 'Сингапур', flag: '🇸🇬' },
  { code: '66', name: 'Таиланд', flag: '🇹🇭' },
  { code: '81', name: 'Япония', flag: '🇯🇵' },
  { code: '82', name: 'Южная Корея', flag: '🇰🇷' },
  { code: '84', name: 'Вьетнам', flag: '🇻🇳' },
  { code: '86', name: 'Китай', flag: '🇨🇳' },
  { code: '90', name: 'Турция', flag: '🇹🇷' },
  { code: '91', name: 'Индия', flag: '🇮🇳' },
  { code: '92', name: 'Пакистан', flag: '🇵🇰' },
  { code: '93', name: 'Афганистан', flag: '🇦🇫' },
  { code: '94', name: 'Шри-Ланка', flag: '🇱🇰' },
  { code: '95', name: 'Мьянма', flag: '🇲🇲' },
  { code: '98', name: 'Иран', flag: '🇮🇷' },
  { code: '212', name: 'Марокко', flag: '🇲🇦' },
  { code: '213', name: 'Алжир', flag: '🇩🇿' },
  { code: '216', name: 'Тунис', flag: '🇹🇳' },
  { code: '218', name: 'Ливия', flag: '🇱🇾' },
  { code: '220', name: 'Гамбия', flag: '🇬🇲' },
  { code: '221', name: 'Сенегал', flag: '🇸🇳' },
  { code: '222', name: 'Мавритания', flag: '🇲🇷' },
  { code: '223', name: 'Мали', flag: '🇲🇱' },
  { code: '224', name: 'Гвинея', flag: '🇬🇳' },
  { code: '225', name: 'Кот-д\'Ивуар', flag: '🇨🇮' },
  { code: '226', name: 'Буркина-Фасо', flag: '🇧🇫' },
  { code: '227', name: 'Нигер', flag: '🇳🇪' },
  { code: '228', name: 'Того', flag: '🇹🇬' },
  { code: '229', name: 'Бенин', flag: '🇧🇯' },
  { code: '230', name: 'Маврикий', flag: '🇲🇺' },
  { code: '231', name: 'Либерия', flag: '🇱🇷' },
  { code: '232', name: 'Сьерра-Леоне', flag: '🇸🇱' },
  { code: '233', name: 'Гана', flag: '🇬🇭' },
  { code: '234', name: 'Нигерия', flag: '🇳🇬' },
  { code: '235', name: 'Чад', flag: '🇹🇩' },
  { code: '236', name: 'Центральноафриканская Республика', flag: '🇨🇫' },
  { code: '237', name: 'Камерун', flag: '🇨🇲' },
  { code: '238', name: 'Кабо-Верде', flag: '🇨🇻' },
  { code: '239', name: 'Сан-Томе и Принсипи', flag: '🇸🇹' },
  { code: '240', name: 'Экваториальная Гвинея', flag: '🇬🇶' },
  { code: '241', name: 'Габон', flag: '🇬🇦' },
  { code: '242', name: 'Конго', flag: '🇨🇬' },
  { code: '243', name: 'Демократическая Республика Конго', flag: '🇨🇩' },
  { code: '244', name: 'Ангола', flag: '🇦🇴' },
  { code: '245', name: 'Гвинея-Бисау', flag: '🇬🇼' },
  { code: '246', name: 'Британская территория в Индийском океане', flag: '🇮🇴' },
  { code: '248', name: 'Сейшельские Острова', flag: '🇸🇨' },
  { code: '249', name: 'Судан', flag: '🇸🇩' },
  { code: '250', name: 'Руанда', flag: '🇷🇼' },
  { code: '251', name: 'Эфиопия', flag: '🇪🇹' },
  { code: '252', name: 'Сомали', flag: '🇸🇴' },
  { code: '253', name: 'Джибути', flag: '🇩🇯' },
  { code: '254', name: 'Кения', flag: '🇰🇪' },
  { code: '255', name: 'Танзания', flag: '🇹🇿' },
  { code: '256', name: 'Уганда', flag: '🇺🇬' },
  { code: '257', name: 'Бурунди', flag: '🇧🇮' },
  { code: '258', name: 'Мозамбик', flag: '🇲🇿' },
  { code: '260', name: 'Замбия', flag: '🇿🇲' },
  { code: '261', name: 'Мадагаскар', flag: '🇲🇬' },
  { code: '262', name: 'Реюньон', flag: '🇷🇪' },
  { code: '263', name: 'Зимбабве', flag: '🇿🇼' },
  { code: '264', name: 'Намибия', flag: '🇳🇦' },
  { code: '265', name: 'Малави', flag: '🇲🇼' },
  { code: '266', name: 'Лесото', flag: '🇱🇸' },
  { code: '267', name: 'Ботсвана', flag: '🇧🇼' },
  { code: '268', name: 'Эсватини', flag: '🇸🇿' },
  { code: '269', name: 'Коморские Острова', flag: '🇰🇲' },
  { code: '290', name: 'Остров Святой Елены', flag: '🇸🇭' },
  { code: '291', name: 'Эритрея', flag: '🇪🇷' },
  { code: '297', name: 'Аруба', flag: '🇦🇼' },
  { code: '298', name: 'Фарерские острова', flag: '🇫🇴' },
  { code: '299', name: 'Гренландия', flag: '🇬🇱' },
  { code: '350', name: 'Гибралтар', flag: '🇬🇮' },
  { code: '351', name: 'Португалия', flag: '🇵🇹' },
  { code: '352', name: 'Люксембург', flag: '🇱🇺' },
  { code: '353', name: 'Ирландия', flag: '🇮🇪' },
  { code: '354', name: 'Исландия', flag: '🇮🇸' },
  { code: '355', name: 'Албания', flag: '🇦🇱' },
  { code: '356', name: 'Мальта', flag: '🇲🇹' },
  { code: '357', name: 'Кипр', flag: '🇨🇾' },
  { code: '358', name: 'Финляндия', flag: '🇫🇮' },
  { code: '359', name: 'Болгария', flag: '🇧🇬' },
  { code: '370', name: 'Литва', flag: '🇱🇹' },
  { code: '371', name: 'Латвия', flag: '🇱🇻' },
  { code: '372', name: 'Эстония', flag: '🇪🇪' },
  { code: '373', name: 'Молдавия', flag: '🇲🇩' },
  { code: '374', name: 'Армения', flag: '🇦🇲' },
  { code: '375', name: 'Беларусь', flag: '🇧🇾' },
  { code: '376', name: 'Андорра', flag: '🇦🇩' },
  { code: '377', name: 'Монако', flag: '🇲🇨' },
  { code: '378', name: 'Сан-Марино', flag: '🇸🇲' },
  { code: '380', name: 'Украина', flag: '🇺🇦' },
  { code: '381', name: 'Сербия', flag: '🇷🇸' },
  { code: '382', name: 'Черногория', flag: '🇲🇪' },
  { code: '383', name: 'Косово', flag: '🇽🇰' },
  { code: '385', name: 'Хорватия', flag: '🇭🇷' },
  { code: '386', name: 'Словения', flag: '🇸🇮' },
  { code: '387', name: 'Босния и Герцеговина', flag: '🇧🇦' },
  { code: '389', name: 'Северная Македония', flag: '🇲🇰' },
  { code: '420', name: 'Чехия', flag: '🇨🇿' },
  { code: '421', name: 'Словакия', flag: '🇸🇰' },
  { code: '423', name: 'Лихтенштейн', flag: '🇱🇮' },
  { code: '500', name: 'Фолклендские острова', flag: '🇫🇰' },
  { code: '501', name: 'Белиз', flag: '🇧🇿' },
  { code: '502', name: 'Гватемала', flag: '🇬🇹' },
  { code: '503', name: 'Сальвадор', flag: '🇸🇻' },
  { code: '504', name: 'Гондурас', flag: '🇭🇳' },
  { code: '505', name: 'Никарагуа', flag: '🇳🇮' },
  { code: '506', name: 'Коста-Рика', flag: '🇨🇷' },
  { code: '507', name: 'Панама', flag: '🇵🇦' },
  { code: '508', name: 'Сен-Пьер и Микелон', flag: '🇵🇲' },
  { code: '509', name: 'Гаити', flag: '🇭🇹' },
  { code: '590', name: 'Гваделупа', flag: '🇬🇵' },
  { code: '591', name: 'Боливия', flag: '🇧🇴' },
  { code: '592', name: 'Гайана', flag: '🇬🇾' },
  { code: '593', name: 'Эквадор', flag: '🇪🇨' },
  { code: '594', name: 'Французская Гвиана', flag: '🇬🇫' },
  { code: '595', name: 'Парагвай', flag: '🇵🇾' },
  { code: '596', name: 'Мартиника', flag: '🇲🇶' },
  { code: '597', name: 'Суринам', flag: '🇸🇷' },
  { code: '598', name: 'Уругвай', flag: '🇺🇾' },
  { code: '599', name: 'Кюрасао', flag: '🇨🇼' },
  { code: '670', name: 'Восточный Тимор', flag: '🇹🇱' },
  { code: '672', name: 'Остров Норфолк', flag: '🇳🇫' },
  { code: '673', name: 'Бруней', flag: '🇧🇳' },
  { code: '674', name: 'Науру', flag: '🇳🇷' },
  { code: '675', name: 'Папуа — Новая Гвинея', flag: '🇵🇬' },
  { code: '676', name: 'Тонга', flag: '🇹🇴' },
  { code: '677', name: 'Соломоновы Острова', flag: '🇸🇧' },
  { code: '678', name: 'Вануату', flag: '🇻🇺' },
  { code: '679', name: 'Фиджи', flag: '🇫🇯' },
  { code: '680', name: 'Палау', flag: '🇵🇼' },
  { code: '681', name: 'Уоллис и Футуна', flag: '🇼🇫' },
  { code: '682', name: 'Острова Кука', flag: '🇨🇰' },
  { code: '683', name: 'Ниуэ', flag: '🇳🇺' },
  { code: '685', name: 'Самоа', flag: '🇼🇸' },
  { code: '686', name: 'Кирибати', flag: '🇰🇮' },
  { code: '687', name: 'Новая Каледония', flag: '🇳🇨' },
  { code: '688', name: 'Тувалу', flag: '🇹🇻' },
  { code: '689', name: 'Французская Полинезия', flag: '🇵🇫' },
  { code: '690', name: 'Токелау', flag: '🇹🇰' },
  { code: '691', name: 'Микронезия', flag: '🇫🇲' },
  { code: '692', name: 'Маршалловы Острова', flag: '🇲🇭' },
  { code: '850', name: 'КНДР', flag: '🇰🇵' },
  { code: '852', name: 'Гонконг', flag: '🇭🇰' },
  { code: '853', name: 'Макао', flag: '🇲🇴' },
  { code: '855', name: 'Камбоджа', flag: '🇰🇭' },
  { code: '856', name: 'Лаос', flag: '🇱🇦' },
  { code: '880', name: 'Бангладеш', flag: '🇧🇩' },
  { code: '886', name: 'Тайвань', flag: '🇹🇼' },
  { code: '960', name: 'Мальдивы', flag: '🇲🇻' },
  { code: '961', name: 'Ливан', flag: '🇱🇧' },
  { code: '962', name: 'Иордания', flag: '🇯🇴' },
  { code: '963', name: 'Сирия', flag: '🇸🇾' },
  { code: '964', name: 'Ирак', flag: '🇮🇶' },
  { code: '965', name: 'Кувейт', flag: '🇰🇼' },
  { code: '966', name: 'Саудовская Аравия', flag: '🇸🇦' },
  { code: '967', name: 'Йемен', flag: '🇾🇪' },
  { code: '968', name: 'Оман', flag: '🇴🇲' },
  { code: '970', name: 'Палестина', flag: '🇵🇸' },
  { code: '971', name: 'ОАЭ', flag: '🇦🇪' },
  { code: '972', name: 'Израиль', flag: '🇮🇱' },
  { code: '973', name: 'Бахрейн', flag: '🇧🇭' },
  { code: '974', name: 'Катар', flag: '🇶🇦' },
  { code: '975', name: 'Бутан', flag: '🇧🇹' },
  { code: '976', name: 'Монголия', flag: '🇲🇳' },
  { code: '977', name: 'Непал', flag: '🇳🇵' },
  { code: '992', name: 'Таджикистан', flag: '🇹🇯' },
  { code: '993', name: 'Туркменистан', flag: '🇹🇲' },
  { code: '994', name: 'Азербайджан', flag: '🇦🇿' },
  { code: '995', name: 'Грузия', flag: '🇬🇪' },
  { code: '996', name: 'Киргизия', flag: '🇰🇬' },
  { code: '998', name: 'Узбекистан', flag: '🇺🇿' },
]

const PhoneInput = ({
  value,
  onChange,
  onBlur,
  onCountryChange,
  error,
  disabled,
  autoDetectCountry = false,
  variant = 'default',
  placeholder = 'Укажите свой номер телефона',
}) => {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES.find(c => c.code === '1') || COUNTRY_CODES[0]) // США по умолчанию
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef(null)
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)
  const geoTriedRef = useRef(false)

  useEffect(() => {
    // Если значение пришло извне, парсим его
    if (value && value.trim() !== '') {
      const parsed = parsePhoneNumber(value)
      if (parsed.country) {
        setSelectedCountry(parsed.country)
        setPhoneNumber(parsed.number)
      } else {
        // Если не удалось определить страну через parsePhoneNumber, пытаемся найти код страны в цифрах
        const digits = value.replace(/\D/g, '')
        
        // Если значение равно только коду страны - игнорируем (это происходит при смене страны)
        const isOnlyCountryCode = COUNTRY_CODES.some(country => digits === country.code)
        if (isOnlyCountryCode) {
          setPhoneNumber('')
          return
        }
        
        let found = false
        
        // Проверяем коды стран от самых длинных к коротким (чтобы правильно определить)
        const sortedCountries = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
        
        for (const country of sortedCountries) {
          if (digits.startsWith(country.code) && digits.length > country.code.length) {
            setSelectedCountry(country)
            setPhoneNumber(digits.substring(country.code.length))
            found = true
            break
          }
        }
        
        if (!found) {
          // Если не нашли код страны, просто сохраняем цифры
          setPhoneNumber(digits)
        }
      }
    } else {
      setPhoneNumber('')
    }
  }, [value])

  useEffect(() => {
    if (!autoDetectCountry || geoTriedRef.current) return undefined
    const digits = String(value || '').replace(/\D/g, '')
    if (digits.length > 4) {
      geoTriedRef.current = true
      return undefined
    }

    let cancelled = false
    geoTriedRef.current = true
    ;(async () => {
      const detected = await detectPhoneDialByGeo()
      if (cancelled || !detected) return
      const country = pickPhoneCountryFromDial(COUNTRY_CODES, detected)
      if (!country) return
      setSelectedCountry(country)
      if (onCountryChange) onCountryChange(country.code)
    })()

    return () => {
      cancelled = true
    }
  }, [autoDetectCountry, onCountryChange, value])

  // Закрытие dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
        setSearchQuery('')
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Фокусируемся на поле поиска при открытии
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Фильтрация стран по поисковому запросу
  const filteredCountries = COUNTRY_CODES.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.code.includes(searchQuery)
  )

  const parsePhoneNumber = (phone) => {
    // Удаляем все нецифровые символы, кроме +
    const cleaned = phone.replace(/[^\d+]/g, '')
    
    // Получаем только цифры (убираем +)
    const digits = cleaned.replace(/\+/g, '')
    
    // Пытаемся найти код страны (проверяем от самых длинных к коротким)
    const sortedCountries = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)
    
    for (const country of sortedCountries) {
      if (digits.startsWith(country.code) && digits.length > country.code.length) {
        return {
          country,
          number: digits.substring(country.code.length)
        }
      }
    }
    
    return { country: null, number: digits }
  }

  const handleCountrySelect = (country) => {
    // Очищаем поле при смене страны
    setPhoneNumber('')
    setSelectedCountry(country)
    setIsDropdownOpen(false)
    setSearchQuery('')
    if (onCountryChange) {
      onCountryChange(country.code)
    }
    // НЕ отправляем код страны в onChange - поле должно быть пустым
    // Пользователь должен ввести номер с нуля
    if (onChange) {
      onChange({ target: { value: '' } })
    }
  }

  const handlePhoneChange = (e) => {
    const inputValue = e.target.value
    // Удаляем все нецифровые символы (только цифры)
    const digitsOnly = inputValue.replace(/\D/g, '')
    
    // Ограничиваем длину в зависимости от страны
    let maxLength = 15 // максимальная длина по стандарту
    if (selectedCountry.code === '375') {
      maxLength = 9 // Беларусь: 9 цифр после кода страны
    } else if (selectedCountry.code === '7') {
      maxLength = 10 // Россия: 10 цифр после кода страны
    } else if (selectedCountry.code === '1') {
      maxLength = 10 // США/Канада: 10 цифр
    }
    
    const limitedDigits = digitsOnly.substring(0, maxLength)
    
    setPhoneNumber(limitedDigits)
    
    // Формируем полный номер с кодом страны
    const fullNumber = limitedDigits ? `+${selectedCountry.code}${limitedDigits}` : ''
    if (onChange) {
      onChange({ target: { value: fullNumber } })
    }
  }

  const formatPhoneDisplay = (number) => {
    if (!number) return ''
    
    // Форматируем только номер без кода страны (phoneNumber уже без кода)
    const digits = number.replace(/\D/g, '')
    
    if (selectedCountry.code === '375') {
      // Беларусь: (XX) XXX-XX-XX
      // Пример: 291803372 -> (29) 180-33-72
      if (digits.length === 0) return ''
      if (digits.length <= 2) return digits
      if (digits.length <= 5) return `(${digits.substring(0, 2)}) ${digits.substring(2)}`
      if (digits.length <= 7) return `(${digits.substring(0, 2)}) ${digits.substring(2, 5)}-${digits.substring(5)}`
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 5)}-${digits.substring(5, 7)}-${digits.substring(7)}`
    } else if (selectedCountry.code === '7') {
      // Россия/Казахстан: (XXX) XXX-XX-XX
      // Пример: 9991234567 -> (999) 123-45-67
      if (digits.length === 0) return ''
      if (digits.length <= 3) return digits
      if (digits.length <= 6) return `(${digits.substring(0, 3)}) ${digits.substring(3)}`
      if (digits.length <= 8) return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 8)}-${digits.substring(8)}`
    } else if (selectedCountry.code === '1') {
      // США/Канада: (XXX) XXX-XXXX
      // Пример: 5551234567 -> (555) 123-4567
      if (digits.length === 0) return ''
      if (digits.length <= 3) return digits
      if (digits.length <= 6) return `(${digits.substring(0, 3)}) ${digits.substring(3)}`
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`
    }
    
    // Общий формат для остальных стран - просто цифры с пробелами каждые 3 цифры
    if (digits.length === 0) return ''
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.substring(0, 3)} ${digits.substring(3)}`
    return `${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`
  }

  return (
    <div
      className={`phone-input-container${variant === 'split' ? ' phone-input-container--split' : ''}`}
      ref={containerRef}
    >
      <div className="phone-input-wrapper">
        <button
          type="button"
          className="phone-input-country-selector"
          onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled}
          aria-label="Код страны"
          aria-expanded={isDropdownOpen}
        >
          <span className="phone-input-flag">{selectedCountry.flag}</span>
          <span className="phone-input-code">+{selectedCountry.code}</span>
          <FiChevronDown className="phone-input-chevron" aria-hidden />
        </button>
        
        {isDropdownOpen && (
          <div className="phone-input-dropdown" ref={dropdownRef}>
            <div className="phone-input-search">
              <svg 
                className="phone-input-search-icon" 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none"
                aria-hidden
              >
                <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="phone-input-search-input"
                placeholder="Поиск страны..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="phone-input-dropdown-list">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <button
                    type="button"
                    key={`${country.code}-${country.name}`}
                    className={`phone-input-dropdown-item ${selectedCountry.code === country.code && selectedCountry.name === country.name ? 'selected' : ''}`}
                    onClick={() => handleCountrySelect(country)}
                  >
                    <span className="phone-input-flag">{country.flag}</span>
                    <span className="phone-input-country-name">{country.name}</span>
                    <span className="phone-input-country-code">+{country.code}</span>
                  </button>
                ))
              ) : (
                <div className="phone-input-no-results">
                  Страны не найдены
                </div>
              )}
            </div>
          </div>
        )}
        
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          className={`phone-input-field ${error ? 'error' : ''}`}
          value={formatPhoneDisplay(phoneNumber)}
          onChange={handlePhoneChange}
          onBlur={(event) => {
            if (!onBlur) return
            const fullNumber = phoneNumber ? `+${selectedCountry.code}${phoneNumber}` : ''
            onBlur({
              ...event,
              target: {
                ...event.target,
                value: fullNumber,
              },
            })
          }}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={20}
        />
      </div>
      {error && <div className="phone-input-error">{error}</div>}
    </div>
  )
}

export default PhoneInput

