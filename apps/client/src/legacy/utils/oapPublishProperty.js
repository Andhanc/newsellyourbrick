import { getUserData } from '../services/authService'
import {
  getMinimumSaleVsBuyNowError,
  getAuctionStartingVsBuyNowError,
  parseMoneyDigits,
} from './oapPricingValidation'

function removeCommas(value) {
  return String(value ?? '').replace(/\s/g, '').replace(/,/g, '')
}

function getTypeProfile(propertyType) {
  if (propertyType === 'apartments') return 'apartments'
  if (propertyType === 'apartment') return 'apartment'
  if (propertyType === 'house') return 'house'
  if (propertyType === 'villa') return 'villa'
  if (propertyType === 'commercial') return 'commercial'
  if (propertyType === 'land') return 'land'
  if (propertyType === 'other') return 'other'
  return 'apartment'
}

/** UI-тип OAP → property_type для POST /api/properties (как backendType в AddProperty.jsx). */
function mapPropertyTypeToBackend(propertyType) {
  if (propertyType === 'apartments') return 'apartment'
  if (propertyType === 'land') return 'house'
  if (propertyType === 'other') return 'commercial'
  if (
    propertyType === 'apartment' ||
    propertyType === 'house' ||
    propertyType === 'villa' ||
    propertyType === 'commercial'
  ) {
    return propertyType
  }
  return 'apartment'
}

export function buildOapTzPayload(form, selectedAmenities) {
  const typeProfile = getTypeProfile(form.propertyType)
  const amenities = Array.isArray(selectedAmenities) ? [...new Set(selectedAmenities)] : []

  const params = {}
  if (
    typeProfile === 'apartment' ||
    typeProfile === 'apartments' ||
    typeProfile === 'house' ||
    typeProfile === 'villa'
  ) {
    if (form.bathrooms !== '' && form.bathrooms != null) params.bathrooms = Number(form.bathrooms)
    if (form.area !== '' && form.area != null) params.total_area_m2 = Number(form.area)
    if (form.livingArea !== '' && form.livingArea != null) params.living_area_m2 = Number(form.livingArea)
    if (form.landArea !== '' && form.landArea != null) params.plot_area_m2 = Number(form.landArea)
    if (form.floor !== '' && form.floor != null) params.floor = Number(form.floor)
    if (form.totalFloors !== '' && form.totalFloors != null) params.total_floors = Number(form.totalFloors)
    if (form.yearBuilt !== '' && form.yearBuilt != null) params.year_built = Number(form.yearBuilt)
  }

  if (typeProfile === 'commercial') {
    if (form.area !== '' && form.area != null) params.total_area_m2 = Number(form.area)
    if (form.commercialType) params.commercial_subtype = form.commercialType
    if (form.yearBuilt !== '' && form.yearBuilt != null) params.year_built = Number(form.yearBuilt)
  }

  if (typeProfile === 'land') {
    if (form.landArea !== '' && form.landArea != null) params.plot_area = Number(form.landArea)
    if (form.commercialType) params.zoning_permitted_use = form.commercialType
  }

  if (typeProfile === 'other') {
    if (form.area !== '' && form.area != null) params.total_area_m2 = Number(form.area)
    if (form.yearBuilt !== '' && form.yearBuilt != null) params.year_built = Number(form.yearBuilt)
  }

  return { amenities, parameters: params }
}

async function oapDocToFile(doc, fallbackName = 'document.pdf') {
  if (!doc) return null
  if (doc.file instanceof File) return doc.file
  const dataUrl =
    typeof doc.url === 'string' && doc.url.startsWith('data:')
      ? doc.url
      : typeof doc.dataUrl === 'string' && doc.dataUrl.startsWith('data:')
        ? doc.dataUrl
        : null
  if (!dataUrl) return null
  const blob = await (await fetch(dataUrl)).blob()
  return new File([blob], doc.name || fallbackName, {
    type: doc.docMime || blob.type || 'application/pdf',
  })
}

async function uploadOneListingPhoto(photo, apiBaseUrl) {
  const preview = photo?.preview
  if (
    typeof preview === 'string' &&
    (preview.startsWith('http://') || preview.startsWith('https://') || preview.startsWith('/uploads/'))
  ) {
    return preview
  }

  let file = photo?.file
  if (!file && typeof preview === 'string' && preview.startsWith('blob:')) {
    const blob = await (await fetch(preview)).blob()
    file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' })
  }
  if (!file && typeof photo?.dataUrl === 'string' && photo.dataUrl.startsWith('data:')) {
    const blob = await (await fetch(photo.dataUrl)).blob()
    file = new File([blob], photo.name || 'photo.jpg', { type: photo.type || blob.type || 'image/jpeg' })
  }
  if (!(file instanceof File)) {
    throw new Error('Не удалось подготовить фото для загрузки. Загрузите изображения ещё раз.')
  }

  const fd = new FormData()
  fd.append('photo', file)
  const response = await fetch(`${apiBaseUrl}/properties/upload-photo`, { method: 'POST', body: fd })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Ошибка загрузки фото (${response.status})`)
  }
  const data = await response.json()
  if (!data.success || !data.data?.url) {
    throw new Error(data.error || 'Сервер не вернул URL фото')
  }
  return data.data.url
}

async function validateUserProfile(userId, apiBaseUrl) {
  let userProfileData = null
  try {
    const userResponse = await fetch(`${apiBaseUrl}/users/${userId}`)
    if (userResponse.ok) {
      const userData = await userResponse.json()
      if (userData.success && userData.data) {
        userProfileData = userData.data
      }
    }
  } catch {
    // fallback to localStorage below
  }

  const missingFields = []
  if (userProfileData) {
    if (!userProfileData.first_name?.trim()) missingFields.push('Имя')
    if (!userProfileData.last_name?.trim()) missingFields.push('Фамилия')
    if (!userProfileData.country?.trim()) missingFields.push('Страна')
    if (!userProfileData.email?.trim()) missingFields.push('Почта')
    if (!userProfileData.phone_number?.trim()) missingFields.push('WhatsApp')
  } else {
    const userData = getUserData()
    if (userData) {
      if (!userData.firstName?.trim()) missingFields.push('Имя')
      if (!userData.lastName?.trim()) missingFields.push('Фамилия')
      if (!userData.country?.trim()) missingFields.push('Страна')
      if (!userData.email?.trim()) missingFields.push('Почта')
      if (!userData.phone && !userData.phoneFormatted) missingFields.push('WhatsApp')
    }
  }

  return { userProfileData, missingFields }
}

/**
 * Публикует объект из OAP-мастера — тот же POST /properties, что и AddProperty.jsx.
 * @returns {Promise<{ ok: boolean, error?: string, missingProfileFields?: string[] }>}
 */
export async function publishOapProperty({
  form,
  photos,
  videos,
  requiredDocuments,
  additionalDocuments,
  selectedAmenities,
  userId,
}) {
  const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api'
  const listingMode = form.listingMode || 'auction'
  const isDebtProperty = listingMode === 'debt' || listingMode === 'debt_auction'
  const isShare = listingMode === 'shares'
  const isDebt = isDebtProperty
  const isAuctionMode =
    listingMode === 'auction' || listingMode === 'auction_buy_now' || listingMode === 'debt_auction'

  if (!form.title?.trim()) {
    return { ok: false, error: 'Пожалуйста, заполните заголовок' }
  }
  if (!Array.isArray(photos) || photos.length === 0) {
    return { ok: false, error: 'Пожалуйста, загрузите хотя бы одно фото' }
  }

  if (isShare) {
    const totalSharesNum = parseInt(String(form.totalShares || '').replace(/\D/g, ''), 10)
    if (!form.totalShares || Number.isNaN(totalSharesNum) || totalSharesNum <= 0) {
      return { ok: false, error: 'Укажите количество долей (целое число больше 0)' }
    }
  }

  const resolvedOwnershipDoc = await oapDocToFile(requiredDocuments?.ownership, 'ownership.pdf')
  const resolvedNoDebtsDoc = await oapDocToFile(requiredDocuments?.noDebts, 'no-debts.pdf')

  if (!isDebtProperty) {
    if (!resolvedOwnershipDoc || !resolvedNoDebtsDoc) {
      return { ok: false, error: 'Пожалуйста, загрузите все необходимые документы' }
    }
  }

  if (!userId) {
    return { ok: false, error: 'login_required' }
  }

  const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : Number(userId)
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return { ok: false, error: 'Ошибка: неверный формат ID пользователя' }
  }

  const { userProfileData, missingFields } = await validateUserProfile(numericUserId, API_BASE_URL)
  if (missingFields.length > 0) {
    return { ok: false, error: 'profile_incomplete', missingProfileFields: missingFields }
  }

  if (!isShare && isAuctionMode) {
    const publishMinErr = getMinimumSaleVsBuyNowError(form.minimumSalePrice, form.price)
    if (publishMinErr) {
      return { ok: false, error: publishMinErr }
    }
    const buyNowNum = parseMoneyDigits(form.price)
    if (listingMode === 'auction_buy_now' && buyNowNum > 0) {
      const publishBuyNowErr = getAuctionStartingVsBuyNowError(form.price, form.auctionStartingPrice)
      if (publishBuyNowErr) {
        return { ok: false, error: publishBuyNowErr }
      }
    }
  }

  let photoUrlsForSubmit
  try {
    photoUrlsForSubmit = await Promise.all(photos.map((p) => uploadOneListingPhoto(p, API_BASE_URL)))
  } catch (uploadErr) {
    return { ok: false, error: uploadErr.message || 'Ошибка загрузки фотографий' }
  }

  const currency = form.listingCurrency || 'EUR'
  const typeProfile = getTypeProfile(form.propertyType)
  const backendPropertyType = mapPropertyTypeToBackend(form.propertyType)
  const formDataToSend = new FormData()

  formDataToSend.append('user_id', String(numericUserId))
  formDataToSend.append('property_type', backendPropertyType)
  formDataToSend.append('title', form.title)

  if (userProfileData) {
    if (userProfileData.first_name) formDataToSend.append('first_name', userProfileData.first_name)
    if (userProfileData.last_name) formDataToSend.append('last_name', userProfileData.last_name)
    if (userProfileData.email) formDataToSend.append('email', userProfileData.email)
    if (userProfileData.phone_number) formDataToSend.append('phone_number', userProfileData.phone_number)
    if (userProfileData.passport_series) {
      formDataToSend.append('passport_series', userProfileData.passport_series)
    }
    if (userProfileData.passport_number) {
      formDataToSend.append('passport_number', userProfileData.passport_number)
    }
    if (userProfileData.identification_number) {
      formDataToSend.append('identification_number', userProfileData.identification_number)
    }
  }

  formDataToSend.append('description', form.description || '')
  if (form.price) formDataToSend.append('price', removeCommas(String(form.price)))
  formDataToSend.append('currency', currency)
  formDataToSend.append('listing_mode', listingMode)
  formDataToSend.append('is_share', isShare ? '1' : '0')
  formDataToSend.append('is_debt', isDebt ? '1' : '0')

  if (isShare) {
    formDataToSend.append('is_auction', '0')
    formDataToSend.append('test_drive', '0')
    formDataToSend.append('sale_type', 'share')
    if (form.totalShares) formDataToSend.append('total_shares', String(form.totalShares))
  } else if (isDebt && listingMode === 'debt') {
    formDataToSend.append('is_auction', '0')
    formDataToSend.append('test_drive', '0')
    formDataToSend.append('sale_type', 'debt')
  } else if (isDebt && listingMode === 'debt_auction') {
    formDataToSend.append('is_auction', '1')
    formDataToSend.append('test_drive', '0')
    formDataToSend.append('sale_type', 'debt')
  } else {
    formDataToSend.append('is_auction', '1')
    formDataToSend.append('sale_type', 'auction')
    const testDriveValue = form.testDrive === 'yes' ? '1' : '0'
    formDataToSend.append('test_drive', testDriveValue)
    if (testDriveValue === '1') {
      formDataToSend.append(
        'test_drive_data',
        JSON.stringify({
          price_per_day: Number(removeCommas(form.testDrivePricePerDay)) || 0,
          insurance_deposit: Number(removeCommas(form.testDriveInsuranceDeposit)) || 0,
        }),
      )
    }
  }

  if (isAuctionMode && form.auctionStartDate) {
    formDataToSend.append('auction_start_date', form.auctionStartDate)
  }
  if (isAuctionMode && form.auctionEndDate) {
    formDataToSend.append('auction_end_date', form.auctionEndDate)
  }
  if (isAuctionMode && form.auctionStartingPrice) {
    formDataToSend.append('auction_starting_price', removeCommas(String(form.auctionStartingPrice)))
  }
  if (isAuctionMode && form.minimumSalePrice) {
    formDataToSend.append('minimum_sale_price', removeCommas(String(form.minimumSalePrice)))
  }

  if (form.area) formDataToSend.append('area', removeCommas(String(form.area)))
  if (form.livingArea) formDataToSend.append('living_area', removeCommas(String(form.livingArea)))

  const buildingTypeToSave = form.constructionType || form.buildingType
  if (buildingTypeToSave) formDataToSend.append('building_type', buildingTypeToSave)

  const isApartmentOrCommercial =
    typeProfile === 'apartment' ||
    typeProfile === 'apartments' ||
    typeProfile === 'commercial' ||
    typeProfile === 'other'
  const isHouseOrVilla =
    typeProfile === 'house' || typeProfile === 'villa' || typeProfile === 'land'

  if (isApartmentOrCommercial) {
    formDataToSend.append(
      'rooms',
      form.rooms !== undefined && form.rooms !== null && form.rooms !== '' ? String(form.rooms) : '',
    )
  }
  if (isHouseOrVilla) {
    const bedroomsValue =
      form.bedrooms !== undefined && form.bedrooms !== null && form.bedrooms !== ''
        ? String(form.bedrooms)
        : ''
    formDataToSend.append('bedrooms', bedroomsValue)
  }

  if (form.bathrooms) formDataToSend.append('bathrooms', removeCommas(String(form.bathrooms)))
  if (form.floor) formDataToSend.append('floor', removeCommas(String(form.floor)))
  if (form.totalFloors) formDataToSend.append('total_floors', removeCommas(String(form.totalFloors)))
  if (form.yearBuilt) formDataToSend.append('year_built', removeCommas(String(form.yearBuilt)))

  if (form.location) {
    formDataToSend.append('location', form.location)
  } else {
    if (form.address) formDataToSend.append('address', form.address)
    if (form.apartment) formDataToSend.append('apartment', form.apartment)
    if (form.country) formDataToSend.append('country', form.country)
    if (form.city) formDataToSend.append('city', form.city)
  }
  if (form.coordinates) {
    formDataToSend.append('coordinates', JSON.stringify(form.coordinates))
  }
  if (form.cadastralNumber) formDataToSend.append('cadastral_number', form.cadastralNumber)
  if (form.landArea) formDataToSend.append('land_area', removeCommas(String(form.landArea)))
  if (form.commercialType) formDataToSend.append('commercial_type', form.commercialType)
  if (form.additionalAmenities) formDataToSend.append('additional_amenities', form.additionalAmenities)

  if (isDebtProperty && form.debtAmount) {
    formDataToSend.append('debt_amount', removeCommas(String(form.debtAmount)))
  }

  const tzPayload = buildOapTzPayload(form, selectedAmenities)
  formDataToSend.append('tz_amenities_json', JSON.stringify(tzPayload.amenities))
  formDataToSend.append('tz_parameters_json', JSON.stringify(tzPayload.parameters))

  formDataToSend.append('photos', JSON.stringify(photoUrlsForSubmit))
  formDataToSend.append('videos', JSON.stringify(videos || []))
  formDataToSend.append(
    'additional_documents',
    JSON.stringify(
      (additionalDocuments || []).map((doc) => ({
        name: doc.name,
        url: doc.url,
        type: doc.type,
      })),
    ),
  )

  if (resolvedOwnershipDoc) {
    formDataToSend.append('ownership_document', resolvedOwnershipDoc)
  }
  if (!isDebtProperty && resolvedNoDebtsDoc) {
    formDataToSend.append('no_debts_document', resolvedNoDebtsDoc)
  }

  try {
    const response = await fetch(`${API_BASE_URL}/properties`, {
      method: 'POST',
      body: formDataToSend,
    })

    if (!response.ok) {
      let errorText = 'Неизвестная ошибка'
      try {
        const raw = await response.text()
        try {
          const parsed = JSON.parse(raw)
          errorText = parsed.error || raw
        } catch {
          errorText = raw || errorText
        }
      } catch {
        // ignore
      }
      throw new Error(errorText)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Ошибка при отправке объявления')
    }

    return { ok: true, data: data.data, message: data.message }
  } catch (error) {
    const msg = error?.message || 'Ошибка при отправке объявления'
    if (msg.includes('Field value too long')) {
      return {
        ok: false,
        error: 'Размер данных слишком большой. Уменьшите количество фото или размер файлов.',
      }
    }
    if (msg.includes('ERR_CONNECTION_RESET') || msg.includes('Failed to fetch')) {
      return { ok: false, error: 'Ошибка соединения с сервером. Проверьте, что сервер запущен.' }
    }
    return { ok: false, error: msg }
  }
}
