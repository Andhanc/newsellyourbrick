import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiCheck, FiXCircle, FiFileText, FiVideo, FiImage, FiEye, FiX, FiAlertCircle, FiExternalLink, FiGlobe } from 'react-icons/fi';
import { IoLocationOutline as IoLocation } from 'react-icons/io5';
import { MdBed, MdOutlineBathtub } from 'react-icons/md';
import { BiArea } from 'react-icons/bi';
import LocationMap from '../LocationMap';
import './ModerationPropertyDetail.css';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import { showNotification } from '../../utils/toastHelper';
import {
  collectAmenityKeys,
  getAmenityLabel,
  getResolvedAmenityLabels,
} from '../../utils/tzAmenityLabels';
import { getUiIntlLocale } from '../../utils/uiIntlLocale'

const API_BASE_URL = getApiBaseUrlSync();

const TRANSLATION_LANGUAGE_DEFS = [
  { code: 'ru', nameKey: 'admin_russian' },
  { code: 'en', nameKey: null, nameFixed: 'English' },
  { code: 'de', nameKey: null, nameFixed: 'Deutsch' },
  { code: 'es', nameKey: null, nameFixed: 'Español' },
  { code: 'fr', nameKey: null, nameFixed: 'Français' },
  { code: 'sv', nameKey: null, nameFixed: 'Svenska' },
];

const EXTRA_TRANSLATION_LABEL_KEYS = [
  ['location', 'admin_location'],
  ['address', 'admin_address'],
  ['city', 'admin_city'],
  ['country', 'admin_country'],
  ['additional_amenities', 'admin_extraAmenities'],
  ['renovation', 'admin_renovation'],
  ['condition', 'admin_condition'],
  ['heating', 'admin_heating'],
  ['water_supply', 'admin_waterSupply'],
  ['sewerage', 'admin_sewerage'],
  ['commercial_type', 'admin_commercialType'],
  ['business_hours', 'admin_businessHours'],
  ['debt_other', 'admin_debtOther'],
];

// Моковые изображения для недвижимости
const mockPropertyImages = [
  '/images/external/photo-1560448204-e02f11c3d0e2-ef4b1c9172.jpg',
  '/images/external/photo-1505691938895-1758d7feb511-295137cd90.jpg',
  '/images/external/photo-1484154218962-a197022b5858-fad0412faf.jpg',
  '/images/external/photo-1564013799919-ab600027ffc6-6867e26b04.jpg',
  '/images/external/photo-1522771739844-6a9f6d5f14af-c11365faed.jpg',
  '/images/external/photo-1600585154340-be6161a56a0c-e705a536f2.jpg',
  '/images/external/photo-1600607687939-ce8a6c25118c-7aaf4b83d3.jpg',
  '/images/external/photo-1600607687939-ce8a6c25118c-7aaf4b83d3.jpg'
];

const ModerationPropertyDetail = ({ property, onBack, onApprove, onReject }) => {
  const { t } = useTranslation();
  const TRANSLATION_LANGUAGES = TRANSLATION_LANGUAGE_DEFS.map((x) => ({
    code: x.code,
    name: x.nameKey ? t(x.nameKey) : x.nameFixed,
  }));
  const EXTRA_TRANSLATION_LABELS = EXTRA_TRANSLATION_LABEL_KEYS.map(([field, key]) => [field, t(key)]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [mediaType, setMediaType] = useState('photos'); // 'photost('admin_ili_8bad5b26')videos'
  const [originalProperty, setOriginalProperty] = useState(null); // Оригинальный объект для сравнения
  const [showChangesModal, setShowChangesModal] = useState(false); // Модальное окно с изменениями
  const [loadingOriginal, setLoadingOriginal] = useState(false);
  const isDebtProperty =
    !!property &&
    (
      property.sale_type === 'debt' ||
      property.is_debt === 1 ||
      property.is_debt === true ||
      property.has_debt === 1 ||
      property.has_debt === true
    );
  const [debtSeverity, setDebtSeverity] = useState(property.debt_severity || null);
  const [approveAsPrivateClub, setApproveAsPrivateClub] = useState(false);
  const [debtDocuments, setDebtDocuments] = useState(property.debt_documents || []);
  const [isTranslating, setIsTranslating] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [translationsByLang, setTranslationsByLang] = useState({});
  const [selectedTranslationLang, setSelectedTranslationLang] = useState('ru');

  const loadTranslations = () => {
    if (!property?.id) return;
    const table = property.source_table || 'properties_apartments';
    fetch(`${API_BASE_URL}/properties/${property.id}/translations?property_table=${encodeURIComponent(table)}`)
      .then((res) => res.json())
      .then((data) => {
        const byLang = (data.success && data.data) ? data.data : {};
        setTranslationsByLang(byLang);
        const keys = Object.keys(byLang);
        if (keys.length > 0) setSelectedTranslationLang(keys[0]);
      })
      .catch(() => setTranslationsByLang({}));
  };

  const handleTranslate = () => {
    if (!property?.id || isTranslating) return;
    setIsTranslating(true);
    const table = property.source_table || 'properties_apartments';
    fetch(`${API_BASE_URL}/properties/${property.id}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_table: table }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          loadTranslations();
          showNotification(t('admin_translationReady'), 'success');
        } else {
          showNotification(data.error || t('admin_translationError'), 'error');
        }
      })
      .catch((err) => {
        showNotification(err.message || t('admin_translationError'), 'error');
      })
      .finally(() => setIsTranslating(false));
  };

  useEffect(() => {
    setTranslationsByLang({});
    if (property?.id) loadTranslations();
  }, [property?.id]);

  // Функция для обработки URL документа
  const processDocumentUrl = (docUrl) => {
    if (!docUrl) return null;
    
    // Data URL (base64) - используем как есть
    if (docUrl.startsWith('data:')) {
      return docUrl;
    }
    
    // Полный HTTP/HTTPS URL - используем как есть
    if (docUrl.startsWith('http://') || docUrl.startsWith('https://')) {
      return docUrl;
    }
    
    // Получаем базовый URL без /api
    const baseUrl = API_BASE_URL.replace('/api', '').replace(/\/$/, '');
    
    // Путь начинается с /uploads/ - добавляем базовый URL
    if (docUrl.startsWith('/uploads/')) {
      return `${baseUrl}${docUrl}`;
    }
    
    // Путь начинается с uploads/ без слеша - добавляем / и базовый URL
    if (docUrl.startsWith('uploads/')) {
      return `${baseUrl}/${docUrl}`;
    }
    
    // Относительный путь - добавляем /uploads/
    return `${baseUrl}/uploads/${docUrl}`;
  };

  // Функция для определения типа документа
  const getDocumentType = (docUrl, docName) => {
    if (!docUrl) return 'image';
    
    // Проверяем имя файла
    if (docName && (docName.toLowerCase().endsWith('.pdf') || docName.toLowerCase().includes('.pdf'))) {
      return 'pdf';
    }
    
    // Проверяем URL на .pdf
    if (typeof docUrl === 'string') {
      if (docUrl.toLowerCase().endsWith('.pdf') || docUrl.toLowerCase().includes('.pdf')) {
        return 'pdf';
      }
      // Проверяем MIME тип в base64
      if (docUrl.startsWith('data:application/pdf') || docUrl.startsWith('data:application/octet-stream')) {
        return 'pdf';
      }
    }
    
    return 'image';
  };
  
  // Получаем реальные фотографии из property
  let images = [];
  if (property.photos && Array.isArray(property.photos) && property.photos.length > 0) {
    images = property.photos;
  } else if (property.imageUrls && Array.isArray(property.imageUrls)) {
    images = property.imageUrls;
  } else {
    images = mockPropertyImages.slice(0, property.images || 5);
  }
  
  // Парсим photos если это JSON строка
  if (images.length === 0 && property.photos && typeof property.photos === 'string') {
    try {
      const parsed = JSON.parse(property.photos);
      if (Array.isArray(parsed)) {
        images = parsed;
      }
    } catch (e) {
      console.warn('Ошибка парсинга photos:', e);
    }
  }
  
  // Получаем видео из property и нормализуем (для импорта из Excel/CSV приходят только { url })
  const normalizeVideoItem = (video) => {
    const url = typeof video === 'string' ? video : (video && (video.url || video.embedUrl))
    if (!url) return null
    const urlStr = String(url).trim()
    const youtubeMatch = urlStr.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    if (youtubeMatch) {
      return { type: 'youtube', videoId: youtubeMatch[1], url: urlStr }
    }
    const driveMatch = urlStr.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (driveMatch) {
      return { type: 'googledrive', videoId: driveMatch[1], url: urlStr }
    }
    const driveOpenMatch = urlStr.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
    if (driveOpenMatch) {
      return { type: 'googledrive', videoId: driveOpenMatch[1], url: urlStr }
    }
    return typeof video === 'object' && video ? { type: 'file', url: urlStr, ...video } : { type: 'file', url: urlStr }
  };

  let videos = [];
  if (property.videos && Array.isArray(property.videos) && property.videos.length > 0) {
    videos = property.videos.map(normalizeVideoItem).filter(Boolean);
  } else if (property.videos && typeof property.videos === 'string') {
    try {
      const parsed = JSON.parse(property.videos);
      if (Array.isArray(parsed)) {
        videos = parsed.map(normalizeVideoItem).filter(Boolean);
      }
    } catch (e) {
      console.warn('Ошибка парсинга videos:', e);
    }
  }
  
  // Объединяем фото и видео для галереи
  const allMedia = [
    ...images.map((img, idx) => ({ type: 'photo', url: img, index: idx })),
    ...videos.map((video, idx) => ({ 
      type: 'video', 
      url: typeof video === 'string' ? video : (video.url || video.embedUrl || video.videoId),
      videoId: typeof video === 'object' ? video.videoId : null,
      videoType: typeof video === 'object' ? video.type : null,
      thumbnail: typeof video === 'object' ? video.thumbnail : null,
      index: images.length + idx 
    }))
  ];

  const handlePrevMedia = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1));
  };

  const handleNextMedia = () => {
    setCurrentImageIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1));
  };
  
  const getYouTubeEmbedUrl = (videoId) => {
    return `https://www.youtube.com/embed/${videoId}`;
  };
  
  const getGoogleDriveEmbedUrl = (fileId) => {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  const getTypeLabel = (type) => {
    const types = {
      apartment: t('admin_apartment'),
      villa: t('admin_villa'),
      house: t('admin_house')
    };
    return types[type] || type;
  };

  // Функция для определения типа запроса
  const getRequestType = (property) => {
    if (property.rejection_reason) {
      if (property.rejection_reason.startsWith('EDIT:')) {
        return 'edit';
      }
      if (property.rejection_reason.startsWith('DELETE:')) {
        return 'delete';
      }
    }
    return 'publication';
  };

  const requestType = getRequestType(property);
  const requestTypeLabels = {
    'publication': t('admin_publicationRequest'),
    'edit': t('admin_editRequest'),
    'delete': t('admin_deleteRequest')
  };
  const requestTypeColors = {
    'publication': '#0099A9',
    'edit': '#f59e0b',
    'delete': '#ef4444'
  };

  // Загружаем оригинальный объект, если это запрос на редактирование
  useEffect(() => {
    if (requestType !== 'edit' || !property.rejection_reason) {
      setOriginalProperty(null);
      return undefined;
    }

    const editMatch = String(property.rejection_reason).match(/^EDIT:(\d+)$/);
    const originalPropertyId = editMatch ? editMatch[1] : '';
    if (!originalPropertyId) return undefined;

    let cancelled = false;
    setLoadingOriginal(true);
    setOriginalProperty(null);

    const moderationParam = 'for_moderation=1';
    const buildQuery = (propertyType) => {
      const params = new URLSearchParams({ for_moderation: '1' });
      if (propertyType) params.set('property_type', propertyType);
      return `?${params.toString()}`;
    };

    const tryFetch = async (query) => {
      const res = await fetch(`${API_BASE_URL}/properties/${originalPropertyId}${query}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.success && data.data ? data.data : null;
    };

    const propertyTypesToTry = [
      property.property_type,
      'apartment',
      'commercial',
      'house',
      'villa',
    ].filter(Boolean);
    const uniqueTypes = [...new Set(propertyTypesToTry)];

    (async () => {
      try {
        let loaded = null;
        for (const pt of uniqueTypes) {
          loaded = await tryFetch(buildQuery(pt));
          if (loaded) break;
        }
        if (!loaded) {
          loaded = await tryFetch(`?${moderationParam}`);
        }
        if (!cancelled) {
          setOriginalProperty(loaded);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Ошибка загрузки оригинального объекта:', error);
          setOriginalProperty(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingOriginal(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [property.id, property.rejection_reason, property.property_type, requestType]);

  // Подгружаем документы по долгу, если объект — долг и debt_documents отсутствуют или пусты
  useEffect(() => {
    if (!isDebtProperty || !property?.id) return;
    if (debtDocuments && debtDocuments.length > 0) return;

    fetch(`${API_BASE_URL}/properties/${property.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && Array.isArray(data.data.debt_documents)) {
          setDebtDocuments(data.data.debt_documents);
        }
      })
      .catch(err => {
        console.warn('Ошибка загрузки документов по долгу для модерации:', err);
      });
  }, [isDebtProperty, property?.id, API_BASE_URL]);

  // Функция для сравнения изменений
  const getPropertyChanges = () => {
    if (!originalProperty) return [];
    
    const changes = [];
    const fieldLabels = {
      title: t('admin_title'),
      description: t('admin_description'),
      price: t('admin_price'),
      currency: t('admin_currency'),
      area: t('admin_area'),
      rooms: t('admin_rooms'),
      bedrooms: t('admin_bedrooms'),
      bathrooms: t('admin_bathrooms'),
      floor: t('admin_floor'),
      total_floors: t('admin_totalFloors'),
      year_built: t('admin_yearBuilt'),
      location: t('admin_locationFull'),
      land_area: t('admin_landArea'),
      commercial_type: t('admin_commercialTypeLong'),
      business_hours: t('admin_businessHours'),
      renovation: t('admin_renovation'),
      condition: t('admin_condition'),
      heating: t('admin_heating'),
      water_supply: t('admin_waterSupply'),
      sewerage: t('admin_sewerage'),
      is_auction: t('admin_auction'),
      auction_start_date: t('admin_auctionStartDate'),
      auction_end_date: t('admin_auctionEndDate'),
      auction_starting_price: t('admin_auctionStartingPrice'),
      balcony: t('admin_balcony'),
      parking: t('admin_parking'),
      elevator: t('admin_elevator'),
      garage: t('admin_garage'),
      pool: t('admin_pool'),
      garden: t('admin_garden'),
      electricity: t('admin_elektrichestvo_48fa2552'),
      internet: t('admin_internet_60a68004'),
      security: t('admin_ohrana_b0bb2237'),
      furniture: t('admin_mebel_75fc63ea'),
      test_drive: t('admin_est_test_drayv_bf06086d')
    };
    
    // Сравниваем основные поля
    Object.keys(fieldLabels).forEach(key => {
      // Важно: при редактировании стартовую дату аукциона не меняем по бизнес-логике,
      // поэтому не показываем это поле как "изменение" в модалке сравнения.
      if (requestType === 'edit' && key === 'auction_start_date') {
        return;
      }

      const oldValue = originalProperty[key];
      const newValue = property[key];
      
      // Обработка булевых значений
      if (key === 'is_auction') {
        const oldBool = oldValue === 1 || oldValue === true;
        const newBool = newValue === 1 || newValue === true;
        if (oldBool !== newBool) {
          changes.push({
            field: fieldLabels[key],
            old: oldBool ? t('admin_yes') : t('admin_no'),
            new: newBool ? t('admin_yes') : t('admin_no')
          });
        }
        return;
      }
      
      // Обработка булевых полей удобств и test_drive
      if (['balcony', 'parking', 'elevator', 'garage', 'pool', 'garden', 'electricity', 'internet', 'security', 'furniture', 'test_drive'].includes(key)) {
        const oldBool = oldValue === 1 || oldValue === true;
        const newBool = newValue === 1 || newValue === true;
        console.log(`🔍 ModerationPropertyDetail - Сравнение ${key}:`, {
          oldValue,
          oldValue_type: typeof oldValue,
          newValue,
          newValue_type: typeof newValue,
          oldBool,
          newBool,
          changed: oldBool !== newBool
        });
        if (oldBool !== newBool) {
          changes.push({
            field: fieldLabels[key],
            old: oldBool ? t('admin_yes') : t('admin_no'),
            new: newBool ? t('admin_yes') : t('admin_no')
          });
        }
        return;
      }
      
      // Обработка числовых значений
      if (['price', 'area', 'land_area', 'auction_starting_price'].includes(key)) {
        const oldNum = oldValue ? Number(oldValue) : null;
        const newNum = newValue ? Number(newValue) : null;
        if (oldNum !== newNum) {
          changes.push({
            field: fieldLabels[key],
            old: oldNum !== null ? oldNum.toLocaleString(getUiIntlLocale()) : t('admin_notSpecified'),
            new: newNum !== null ? newNum.toLocaleString(getUiIntlLocale()) : t('admin_notSpecified')
          });
        }
        return;
      }
      
      // Обработка строковых значений
      if (oldValue !== newValue && (oldValue || newValue)) {
        changes.push({
          field: fieldLabels[key],
          old: oldValue || t('admin_notSpecified'),
          new: newValue || t('admin_notSpecified')
        });
      }
    });
    
    // Сравниваем фотографии
    const oldPhotos = originalProperty.photos ? 
      (typeof originalProperty.photos === 'string' ? JSON.parse(originalProperty.photos) : originalProperty.photos) : [];
    const newPhotos = property.photos ? 
      (typeof property.photos === 'string' ? JSON.parse(property.photos) : property.photos) : [];
    if (JSON.stringify(oldPhotos) !== JSON.stringify(newPhotos)) {
      changes.push({
        field: t('admin_fotografii_534c2f6a'),
        old: t('admin_photos_n', { n: oldPhotos.length }),
        new: t('admin_photos_n', { n: newPhotos.length })
      });
    }

    const oldAmenityKeys = [...collectAmenityKeys(originalProperty)].sort();
    const newAmenityKeys = [...collectAmenityKeys(property)].sort();
    if (JSON.stringify(oldAmenityKeys) !== JSON.stringify(newAmenityKeys)) {
      changes.push({
        field: t('admin_udobstva_ab46fc85'),
        old: oldAmenityKeys.length
          ? oldAmenityKeys.map((k) => getAmenityLabel(t, k)).join(', ')
          : t('admin_notSpecified'),
        new: newAmenityKeys.length
          ? newAmenityKeys.map((k) => getAmenityLabel(t, k)).join(', ')
          : t('admin_notSpecified'),
      });
    }
    
    return changes;
  };

  const handleApproveClick = () => {
    if (isTranslating) return;
    setConfirmAction('approve');
  };

  const handleRejectClick = () => {
    if (isTranslating) return;
    setConfirmAction('reject');
  };

  const closeConfirm = () => {
    if (isTranslating) return;
    setConfirmAction(null);
  };

  const handleConfirmApprove = async () => {
    setConfirmAction(null);
    setIsTranslating(true);
    try {
      await onApprove(property.id, debtSeverity, approveAsPrivateClub);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleConfirmReject = () => {
    setConfirmAction(null);
    onReject(property.id);
  };

  useEffect(() => {
    if (!confirmAction) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeConfirm();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmAction, isTranslating]);

  return (
    <div className="moderation-property-detail">
      {isTranslating && (
        <div className="moderation-property-detail__translate-overlay" aria-hidden="true">
          <div className="moderation-property-detail__translate-preloader">
            <div className="moderation-property-detail__translate-spinner" />
            <p className="moderation-property-detail__translate-text">{t('admin_perevodim_obyavlenie_na_vse_ea09d0ca')}</p>
            <p className="moderation-property-detail__translate-langs">English · Deutsch · Español · Français · Svenska</p>
            <p className="moderation-property-detail__translate-hint">{t('admin_posle_perevoda_obyavlenie_budet_073f9088')}</p>
          </div>
        </div>
      )}
      <button className="moderation-property-detail__back" onClick={onBack}>
        <FiArrowLeft size={20} />
        {t('admin_nazad_f6dab074')}
      </button>

      <div className="moderation-property-detail__content">
        <div className="moderation-property-detail__gallery">
          <div className="moderation-property-detail__main-image">
            {allMedia.length > 0 && allMedia[currentImageIndex] && (
              allMedia[currentImageIndex].type === 'video' ? (
                <div style={{ width: '100%', height: '100%', position: 'relative', paddingBottom: '56.25%' }}>
                  <iframe
                    src={
                      allMedia[currentImageIndex].videoType === 'youtube' 
                        ? getYouTubeEmbedUrl(allMedia[currentImageIndex].videoId || allMedia[currentImageIndex].url)
                        : allMedia[currentImageIndex].videoType === 'googledrive'
                          ? getGoogleDriveEmbedUrl(allMedia[currentImageIndex].videoId || allMedia[currentImageIndex].url)
                          : allMedia[currentImageIndex].url
                    }
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <img src={allMedia[currentImageIndex].url} alt={property.title} />
              )
            )}
            
            {allMedia.length > 1 && (
              <>
                <button
                  className="moderation-property-detail__nav-btn moderation-property-detail__nav-btn--prev"
                  onClick={handlePrevMedia}
                  aria-label={t('admin_predyduschee_e5134f63')}
                >
                  <FiChevronLeft size={24} />
                </button>
                <button
                  className="moderation-property-detail__nav-btn moderation-property-detail__nav-btn--next"
                  onClick={handleNextMedia}
                  aria-label={t('admin_sleduyuschee_7b4e6ccb')}
                >
                  <FiChevronRight size={24} />
                </button>
                
                <div className="moderation-property-detail__image-counter">
                  {currentImageIndex + 1} / {allMedia.length}
                </div>
              </>
            )}
          </div>

          <div className="moderation-property-detail__gallery-info">
            <p className="moderation-property-detail__gallery-info-title">{t('admin_galereya_e6f95e75')}</p>
            <p className="moderation-property-detail__gallery-info-text">
              {images.length} {images.length === 1 ? t('admin_fotografiya_296b75e4') : images.length < 5 ? t('admin_fotografii_6655cffc') : t('admin_fotografiy_795245b0')}
              {videos.length > 0 && `, ${videos.length} ${videos.length === 1 ? t('admin_video_be5983f0') : videos.length < 5 ? t('admin_video_be5983f0') : t('admin_video_be5983f0')}`}
            </p>
          </div>
        </div>

        <div className="moderation-property-detail__info">
          <div className="moderation-property-detail__header">
            <h1 className="moderation-property-detail__title">{property.title || t('admin_untitled')}</h1>
            <div className="moderation-property-detail__statuses">
              <div className="moderation-property-detail__badge">
                {getTypeLabel(property.property_type || property.type)}
              </div>
              {isDebtProperty && (
                <div className="moderation-property-detail__badge">
                  {t('admin_dolg_949c1d86')}
                </div>
              )}
              <span 
                style={{
                  backgroundColor: requestTypeColors[requestType] + '20',
                  color: requestTypeColors[requestType],
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                {requestTypeLabels[requestType]}
              </span>
            </div>
          </div>

          {/* Отображение причины удаления */}
          {requestType === 'delete' && property.rejection_reason && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              borderLeft: '4px solid #ef4444'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <FiAlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    color: '#991b1b'
                  }}>
                    {t('admin_prichina_udaleniya_fc739dc6')}
                  </h4>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#7f1d1d',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {(() => {
                      // Извлекаем причину из формата DELETE:propertyId:reason
                      const deleteMatch = property.rejection_reason.match(/^DELETE:\d+:(.+)$/);
                      return deleteMatch ? deleteMatch[1] : property.rejection_reason.replace('DELETE:', '');
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Локацию и карту в модерации сейчас не показываем */}

          <div className="moderation-property-detail__features">
            {property.area && (
              <div className="moderation-property-detail__feature">
                <BiArea size={20} />
                <span>{t('admin_area_m2', { n: property.area })}</span>
              </div>
            )}
            {property.bedrooms && (
              <div className="moderation-property-detail__feature">
                <MdBed size={20} />
                <span>{property.bedrooms}</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="moderation-property-detail__feature">
                <MdOutlineBathtub size={20} />
                <span>{property.bathrooms}</span>
              </div>
            )}
            {property.rooms && (
              <div className="moderation-property-detail__feature">
                <span>{t('admin_rooms_count', { n: property.rooms })}</span>
              </div>
            )}
          </div>

          <div className="moderation-property-detail__price">
            {/* Цена / сумма продажи */}
            {property.price && Number(property.price) > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{ color: '#111827', fontWeight: 500 }}>
                  {isDebtProperty ? t('admin_summa_prodazhi_12afebb2') : t('admin_kupit_seychas_1bb6de5e')}
                </span>{' '}
                <span style={{ color: '#0099A9', fontWeight: 600 }}>
                  {Number(property.price).toLocaleString(getUiIntlLocale())} {property.currency || 'USD'}
                </span>
              </div>
            )}
            {!isDebtProperty && (
              <div style={{ fontSize: '14px', color: '#666' }}>
                <div style={{ marginBottom: '8px' }}>{t('admin_aukcionnyy_obekt_06ee7e17')}</div>
                {property.auction_start_date && (
                  <div>{t('admin_start_colon')} {new Date(property.auction_start_date).toLocaleDateString()}</div>
                )}
                {property.auction_end_date && (
                  <div>{t('admin_end_colon')} {new Date(property.auction_end_date).toLocaleDateString()}</div>
                )}
                {property.auction_starting_price && (
                  <div>{t('admin_nachalnaya_summa_stavki_amount_1ade3fc6', { amount: Number(property.auction_starting_price).toLocaleString(), currency: property.currency || 'USD' })}</div>
                )}
              </div>
            )}
          </div>

          {/* Блок риска и долгов — один визуальный блок */}
          {isDebtProperty && (
            <div className="moderation-property-detail__debt-block">
              <div className="moderation-property-detail__debt-block-risk">
                <h4 className="moderation-property-detail__debt-block-title">{t('admin_uroven_riska_obekta_36ed4f54')}</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'red', label: t('admin_vysokiy_01e753ce'), bg: '#ef4444' },
                    { id: 'yellow', label: t('admin_sredniy_afdc9818'), bg: '#eab308' },
                    { id: 'green', label: t('admin_nizkiy_c37cd2bf'), bg: '#0099A9' }
                  ].map(option => {
                    const isActive = debtSeverity === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setDebtSeverity(option.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '999px',
                          border: `1px solid ${option.bg}`,
                          backgroundColor: isActive ? option.bg : '#ffffff',
                          color: isActive ? '#ffffff' : option.bg,
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: 'none',
                          transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease'
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="moderation-property-detail__debt-block-obligations">
                
                <div className="moderation-property-detail__debt-block-content">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(property.debt_utilities === 1 || property.debt_utilities === true) && (
                      <span style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#e3f5e8', fontSize: '13px', color: '#111827' }}>
                        {t('admin_dolgi_po_kommunalnym_uslugam_72a19ad6')}
                      </span>
                    )}
                    {(property.debt_mortgage_pledge === 1 || property.debt_mortgage_pledge === true) && (
                      <span style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#e3f5e8', fontSize: '13px', color: '#111827' }}>
                        {t('admin_zalog_u_banka_692b02e9')}
                      </span>
                    )}
                    {(property.debt_property_taxes === 1 || property.debt_property_taxes === true) && (
                      <span style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#e3f5e8', fontSize: '13px', color: '#111827' }}>
                        {t('admin_neoplachennye_nalogi_na_imuschestvo_3ad07a08')}
                      </span>
                    )}
                    {(property.debt_arrest === 1 || property.debt_arrest === true) && (
                      <span style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#e3f5e8', fontSize: '13px', color: '#111827' }}>
                        {t('admin_arest_ogranicheniya_3c8bc455')}
                      </span>
                    )}
                    {(property.debt_inherited === 1 || property.debt_inherited === true) && (
                      <span style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#e3f5e8', fontSize: '13px', color: '#111827' }}>
                        {t('admin_dolgi_nasledodatelya_f40d881b')}
                      </span>
                    )}
                    {(property.debt_third_party === 1 || property.debt_third_party === true) && (
                      <span style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#e3f5e8', fontSize: '13px', color: '#111827' }}>
                        {t('admin_dolgi_pered_tretimi_licami_e5389cee')}
                      </span>
                    )}
                  </div>

                  {property.debt_other && (
                    <div style={{ fontSize: '14px', color: '#111827' }}>
                      <strong>{t('admin_drugoe_a99dbabf')}</strong> {property.debt_other}
                    </div>
                  )}

                  {property.debt_amount != null && property.debt_amount !== '' && !Number.isNaN(Number(property.debt_amount)) && (
                    <div style={{ fontSize: '14px', color: '#111827' }}>
                      <strong>{t('admin_orientirovochnaya_summa_dolga_e66eed9a')}</strong>{' '}
                      <span style={{ color: '#0099A9', fontWeight: 600 }}>
                        {Number(property.debt_amount).toLocaleString(getUiIntlLocale())} {property.currency || 'USD'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {property.description && (
            <div className="moderation-property-detail__description">
              <h3>{t('admin_opisanie_obekta_520622e5')}</h3>
              <p>{property.description}</p>
            </div>
          )}
          
          {/* Дополнительная информация */}
          <div className="moderation-property-detail__additional-info">
            <h3>{t('admin_dopolnitelnaya_informaciya_39903d43')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}>
              {property.floor && (
                <div><strong>{t('admin_etazh_77c75de0')}</strong> {property.floor}</div>
              )}
              {property.total_floors && (
                <div><strong>{t('admin_vsego_etazhey_de2973ee')}</strong> {property.total_floors}</div>
              )}
              {property.year_built && (
                <div><strong>{t('admin_god_postroyki_ae4c3700')}</strong> {property.year_built}</div>
              )}
              {property.land_area && (
                <div><strong>{t('admin_ploschad_uchastka_51c7b339')}</strong> {t('admin_area_m2', { n: property.land_area })}</div>
              )}
              {property.renovation && (
                <div><strong>{t('admin_remont_0810bb2e')}</strong> {property.renovation}</div>
              )}
              {property.condition && (
                <div><strong>{t('admin_sostoyanie_0ae07a91')}</strong> {property.condition}</div>
              )}
              {property.heating && (
                <div><strong>{t('admin_otoplenie_3d6d29d6')}</strong> {property.heating}</div>
              )}
              {property.water_supply && (
                <div><strong>{t('admin_vodosnabzhenie_a8145551')}</strong> {property.water_supply}</div>
              )}
              {property.sewerage && (
                <div><strong>{t('admin_kanalizaciya_4c48c9d7')}</strong> {property.sewerage}</div>
              )}
              {property.commercial_type && (
                <div><strong>{t('admin_tip_kommercheskoy_d71158ea')}</strong> {property.commercial_type}</div>
              )}
              {property.business_hours && (
                <div><strong>{t('admin_chasy_raboty_1eae7bee')}</strong> {property.business_hours}</div>
              )}
              <div><strong>{t('admin_est_test_drayv_245ba9fb')}</strong> {(property.test_drive === 1 || property.test_drive === true || property.testDrive === true) ? t('admin_yes') : t('admin_no')}</div>
            </div>
          </div>
          
          {/* Удобства */}
          <div className="moderation-property-detail__amenities">
            <h3>{t('admin_udobstva_ab46fc85')}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
              {(() => {
                const labels = getResolvedAmenityLabels(property, t)
                if (!labels.length) {
                  return <span style={{ color: '#999' }}>{t('admin_udobstva_ne_ukazany_2ca5990b')}</span>
                }
                return labels.map((label, index) => (
                  <span
                    key={`${label}-${index}`}
                    style={{ padding: '5px 10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}
                  >
                    {label}
                  </span>
                ))
              })()}
            </div>
            {/* Дополнительные удобства */}
            {property.additional_amenities && property.additional_amenities.trim() && (
              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>{t('admin_dopolnitelno_9d5f2ee5')}</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {property.additional_amenities}
                </p>
              </div>
            )}
          </div>

          <div className="moderation-property-detail__owner">
            <h3>{t('admin_informaciya_o_vladelce_3592529f')}</h3>
            <p><strong>{t('admin_imya_e6cc1511')}</strong> {property.first_name || property.ownerName || t('admin_notSpecified')} {property.last_name || ''}</p>
            <p><strong>Email:</strong> {property.email || property.ownerEmail || t('admin_notSpecified')}</p>
            <p><strong>{t('admin_telefon_0e41c7c4')}</strong> {property.phone_number || t('admin_notSpecified')}</p>
            <p><strong>{t('admin_data_podachi_71a7232c')}</strong> {
              property.created_at 
                ? new Date(property.created_at).toLocaleDateString(getUiIntlLocale())
                : property.submittedDate 
                  ? new Date(property.submittedDate).toLocaleDateString(getUiIntlLocale())
                  : t('admin_notSpecified')
            }</p>
          </div>

          {/* Кнопка перевода через ИИ */}
          <div className="moderation-property-detail__translate-block">
            <button
              type="button"
              className="moderation-property-detail__btn moderation-property-detail__btn--translate"
              onClick={handleTranslate}
              disabled={isTranslating}
            >
              <FiGlobe size={18} />
              {isTranslating ? t('admin_perevod_3e2c3c3e') : t('admin_perevesti_bez_publikacii_0a81fa8e')}
            </button>
            {Object.keys(translationsByLang).length > 0 && (
              <div className="moderation-property-detail__translations-view">
                <h3 className="moderation-property-detail__translations-title">{t('admin_prosmotr_perevoda_069436ca')}</h3>
                <div className="moderation-property-detail__translations-lang-select">
                  <label htmlFor="translation-lang">{t('admin_yazyk_e1357f63')}</label>
                  <select
                    id="translation-lang"
                    value={selectedTranslationLang}
                    onChange={(e) => setSelectedTranslationLang(e.target.value)}
                    className="moderation-property-detail__translations-select"
                  >
                    {TRANSLATION_LANGUAGES.filter((l) => translationsByLang[l.code]).map((l) => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>
                {translationsByLang[selectedTranslationLang] && (
                  <div className="moderation-property-detail__translations-content">
                    <div className="moderation-property-detail__translations-item">
                      <strong>{t('admin_nazvanie_37e1ddf1')}</strong>
                      <p>{translationsByLang[selectedTranslationLang].title || '—'}</p>
                    </div>
                    <div className="moderation-property-detail__translations-item">
                      <strong>{t('admin_opisanie_943961fd')}</strong>
                      <p>{translationsByLang[selectedTranslationLang].description || '—'}</p>
                    </div>
                    {EXTRA_TRANSLATION_LABELS.map(([key, label]) => {
                      const value = translationsByLang[selectedTranslationLang][key];
                      if (value == null || value === '') return null;
                      return (
                        <div key={key} className="moderation-property-detail__translations-item">
                          <strong>{label}:</strong>
                          <p>{value}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="moderation-property-detail__actions-wrap">
            {!isDebtProperty && (
              <label className="moderation-property-detail__private-club">
                <input
                  type="checkbox"
                  checked={approveAsPrivateClub}
                  onChange={(e) => setApproveAsPrivateClub(e.target.checked)}
                />
                <span>{t('admin_tolko_zakrytyy_klub__af6d1f41')}</span>
              </label>
            )}
            <div className="moderation-property-detail__actions">
            {requestType === 'edit' && (
              <button
                className={`moderation-property-detail__btn moderation-property-detail__btn--view-changes ${!originalProperty || loadingOriginal ? 'disabled' : ''}`}
                onClick={() => {
                  if (originalProperty) {
                    setShowChangesModal(true);
                  } else if (loadingOriginal) {
                    alert(t('admin_loadingOriginalProperty'));
                  } else {
                    alert(t('admin_originalPropertyLoadFail'));
                  }
                }}
                disabled={!originalProperty || loadingOriginal}
              >
                <FiEye size={18} />
                {loadingOriginal ? t('admin_loading') : t('admin_izmeneniya_adc32cb9')}
              </button>
            )}
            <button
              className="moderation-property-detail__btn moderation-property-detail__btn--approve"
              onClick={handleApproveClick}
              disabled={isTranslating}
            >
              <FiCheck size={20} />
              {isTranslating ? t('admin_perevod_i_publikaciya_ed7e582f') : t('admin_approve')}
            </button>
            <button
              className="moderation-property-detail__btn moderation-property-detail__btn--reject"
              onClick={handleRejectClick}
              disabled={isTranslating}
            >
              <FiXCircle size={20} />
              {t('admin_reject')}
            </button>
          </div>
          </div>
        </div>
      </div>

      <div className="moderation-property-detail__gallery-section">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setMediaType('photos')}
            style={{
              padding: '8px 16px',
              backgroundColor: mediaType === 'photos' ? '#0099A9' : '#f0f0f0',
              color: mediaType === 'photos' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <FiImage size={18} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
            {t('admin_photos_count', { n: images.length })}
          </button>
          {videos.length > 0 && (
            <button
              onClick={() => setMediaType('videos')}
              style={{
                padding: '8px 16px',
                backgroundColor: mediaType === 'videos' ? '#0099A9' : '#f0f0f0',
                color: mediaType === 'videos' ? 'white' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <FiVideo size={18} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
              {t('admin_videos_count', { n: videos.length })}
            </button>
          )}
        </div>
        
        {mediaType === 'photos' && (
          <>
            <h2 className="moderation-property-detail__gallery-title">{t('admin_debtDoc_fotografii_obekta_f9f089x')}</h2>
            <div className="moderation-property-detail__gallery-grid">
              {images.map((img, index) => (
                <div
                  key={index}
                  className={`moderation-property-detail__gallery-item ${
                    currentImageIndex === index && allMedia[currentImageIndex]?.type === 'photo' ? 'moderation-property-detail__gallery-item--active' : ''
                  }`}
                  onClick={() => {
                    const mediaIndex = allMedia.findIndex(m => m.type === 'photo' && m.index === index);
                    if (mediaIndex !== -1) setCurrentImageIndex(mediaIndex);
                  }}
                >
                  <img src={img} alt={`${property.title} ${index + 1}`} />
                  <div className="moderation-property-detail__gallery-overlay">
                    <span>{t('admin_foto_n_1d705dae', { n: index + 1 })}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        
        {mediaType === 'videos' && videos.length > 0 && (
          <>
            <h2 className="moderation-property-detail__gallery-title">{t('admin_video_obekta_855029a6')}</h2>
            <div className="moderation-property-detail__gallery-grid">
              {videos.map((video, index) => {
                const videoUrl = typeof video === 'string' ? video : (video.url || video.embedUrl || video.videoId);
                const videoId = typeof video === 'object' ? video.videoId : null;
                const videoType = typeof video === 'object' ? video.type : null;
                const thumbnail = typeof video === 'object' ? video.thumbnail : null;
                const embedUrl = videoType === 'youtube' 
                  ? getYouTubeEmbedUrl(videoId || videoUrl)
                  : videoType === 'googledrive'
                    ? getGoogleDriveEmbedUrl(videoId || videoUrl)
                    : videoUrl;
                
                return (
                  <div
                    key={index}
                    className="moderation-property-detail__gallery-item"
                    onClick={() => {
                      const mediaIndex = allMedia.findIndex(m => m.type === 'video' && m.index === images.length + index);
                      if (mediaIndex !== -1) setCurrentImageIndex(mediaIndex);
                    }}
                  >
                    {thumbnail ? (
                      <img src={thumbnail} alt={t('admin_videoN', { n: index + 1 })} />
                    ) : (
                      <div style={{ width: '100%', height: '200px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiVideo size={48} color="#fff" />
                      </div>
                    )}
                    <div className="moderation-property-detail__gallery-overlay">
                      <span>{t('admin_videoN', { n: index + 1 })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Документы на недвижимость */}
      {(property.documents || property.ownership_document || property.no_debts_document || 
        property.ownershipDocument || property.noDebtsDocument || 
        property.additional_documents || (isDebtProperty && debtDocuments && debtDocuments.length > 0)) && (
        <div className="moderation-property-detail__documents-section">
          <h2 className="moderation-property-detail__documents-title">
            <FiFileText size={24} />
            {t('admin_dokumenty_na_nedvizhimost_c51d57b5')}
          </h2>
          <div className="moderation-property-detail__documents-grid">
            {/* Документ о праве собственности */}
            {(property.ownership_document || property.ownershipDocument) && (() => {
              const rawDocUrl = property.ownership_document || property.ownershipDocument;
              const docUrl = processDocumentUrl(rawDocUrl);
              const docName = property.ownership_document_name || property.ownershipDocumentName || t('admin_dokument_o_prave_sobstvennosti_1131f297');
              const docType = getDocumentType(rawDocUrl, docName);
              
              return (
                <div 
                  className="moderation-property-detail__document-card"
                  onClick={() => {
                    if (docUrl) {
                      setSelectedDocument({ type: docType, url: docUrl, name: docName });
                    }
                  }}
                >
                  <div className="moderation-property-detail__document-icon">
                    <FiFileText size={32} />
                  </div>
                  <div className="moderation-property-detail__document-info">
                    <h3 className="moderation-property-detail__document-name">
                      {docName}
                    </h3>
                    <span className="moderation-property-detail__document-type">
                      {docType === 'pdf' ? t('admin_pdfDocument') : t('admin_image')}
                    </span>
                  </div>
                </div>
              );
            })()}
            
            {/* Справка об отсутствии обременений — не показываем для объектов с долгами */}
            {!isDebtProperty && (property.no_debts_document || property.noDebtsDocument) && (() => {
              const rawDocUrl = property.no_debts_document || property.noDebtsDocument;
              const docUrl = processDocumentUrl(rawDocUrl);
              const docName = property.no_debts_document_name || property.noDebtsDocumentName || t('admin_spravka_ob_otsutstvii_obremeneniy_e91143be');
              const docType = getDocumentType(rawDocUrl, docName);
              
              return (
                <div 
                  className="moderation-property-detail__document-card"
                  onClick={() => {
                    if (docUrl) {
                      setSelectedDocument({ type: docType, url: docUrl, name: docName });
                    }
                  }}
                >
                  <div className="moderation-property-detail__document-icon">
                    <FiFileText size={32} />
                  </div>
                  <div className="moderation-property-detail__document-info">
                    <h3 className="moderation-property-detail__document-name">
                      {docName}
                    </h3>
                    <span className="moderation-property-detail__document-type">
                      {docType === 'pdf' ? t('admin_pdfDocument') : t('admin_image')}
                    </span>
                  </div>
                </div>
              );
            })()}
            
            {/* Дополнительные документы */}
            {property.documents && Array.isArray(property.documents) && property.documents.length > 0 && property.documents.map((doc, index) => {
              const documentName = typeof doc === 'string' ? doc : doc.name;
              const documentUrl = typeof doc === 'object' && doc.url ? doc.url : null;
              const documentType = typeof doc === 'object' && doc.type 
                ? doc.type 
                : getDocumentType(documentUrl, documentName);
              
              return (
                <div 
                  key={index} 
                  className="moderation-property-detail__document-card"
                  onClick={() => {
                    setSelectedDocument({ 
                      type: documentType, 
                      url: documentUrl || '/images/external/photo-1505691938895-1758d7feb511-295137cd90.jpg', 
                      name: documentName 
                    });
                  }}
                >
                  <div className="moderation-property-detail__document-icon">
                    <FiFileText size={32} />
                  </div>
                  <div className="moderation-property-detail__document-info">
                    <h3 className="moderation-property-detail__document-name">{documentName}</h3>
                    <span className="moderation-property-detail__document-type">
                      {documentType === 'pdf' ? t('admin_pdfDocument') : t('admin_image')}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {/* Дополнительные документы из JSON */}
            {property.additional_documents && (() => {
              let additionalDocs = [];
              if (typeof property.additional_documents === 'string') {
                try {
                  additionalDocs = JSON.parse(property.additional_documents);
                } catch (e) {
                  console.warn('Ошибка парсинга additional_documents:', e);
                }
              } else if (Array.isArray(property.additional_documents)) {
                additionalDocs = property.additional_documents;
              }
              
              return additionalDocs.map((doc, index) => {
                const documentName = typeof doc === 'string' ? doc : (doc.name || t('admin_documentN', { n: index + 1 }));
                const documentUrl = typeof doc === 'object' && doc.url ? doc.url : null;
                const documentType = typeof doc === 'object' && doc.type 
                  ? doc.type 
                  : getDocumentType(documentUrl, documentName);
                
                return (
                  <div 
                    key={`additional_${index}`} 
                    className="moderation-property-detail__document-card"
                    onClick={() => {
                      setSelectedDocument({ 
                        type: documentType, 
                        url: documentUrl || '/images/external/photo-1505691938895-1758d7feb511-295137cd90.jpg', 
                        name: documentName 
                      });
                    }}
                  >
                    <div className="moderation-property-detail__document-icon">
                      <FiFileText size={32} />
                    </div>
                    <div className="moderation-property-detail__document-info">
                      <h3 className="moderation-property-detail__document-name">{documentName}</h3>
                      <span className="moderation-property-detail__document-type">
                        {documentType === 'pdf' ? t('admin_pdfDocument') : t('admin_image')}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}

            {/* Документы по долгу (категории cat1..cat6 из property_debt_documents) */}
            {isDebtProperty && debtDocuments && Array.isArray(debtDocuments) && debtDocuments.length > 0 && (() => {
              // Группируем по document_type (cat1..cat6)
              const groups = debtDocuments.reduce((acc, doc) => {
                const type = doc.document_type || 'other';
                if (!acc[type]) acc[type] = [];
                acc[type].push(doc);
                return acc;
              }, {});

              const typeTitles = {
                cat1: t('admin_dokumenty_po_samomu_dolgu_6ad18c0a'),
                cat2: t('admin_dokumenty_po_obespecheniyu_nedvizhim_d7fc202c'),
                cat3: t('admin_yuridicheskie_dokumenty_b75b5938'),
                cat4: t('admin_dokumenty_po_zaemschiku_e60bc654'),
                cat5: t('admin_dokumenty_po_sdelke_pokupki_cf6cc2da'),
                cat6: t('admin_dopolnitelno_d7907f4d')
              };

              const entries = Object.entries(groups);

              return entries.map(([type, docs]) => (
                <div key={`debt_docs_${type}`} className="moderation-property-detail__document-card moderation-property-detail__document-card--debt-group">
                  <div className="moderation-property-detail__document-icon">
                    <FiFileText size={32} />
                  </div>
                  <div className="moderation-property-detail__document-info">
                    <h3 className="moderation-property-detail__document-name">
                      {typeTitles[type] || t('admin_dokumenty_kategorii_type_4d00304e', { type })}
                    </h3>
                    <ul className="moderation-property-detail__debt-documents-list">
                      {docs.map((doc, index) => {
                        const rawUrl = doc.file_path;
                        const url = processDocumentUrl(rawUrl);
                        const name = doc.original_name || t('admin_documentN', { n: index + 1 });
                        const docType = getDocumentType(rawUrl, name);
                        return (
                          <li key={doc.id || `${type}_${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {url ? (
                              <>
                                <button
                                  className="moderation-property-detail__debt-document-link"
                                  style={{ border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                  onClick={() => setSelectedDocument({ type: docType, url, name })}
                                  title={t('admin_otkryt_predprosmotr_5afa4d2a')}
                                >
                                  {name}
                                </button>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={t('admin_otkryt_v_novoy_vkladke_97acdc26')}
                                  style={{ color: '#9ca3af', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                                >
                                  <FiExternalLink size={14} />
                                </a>
                              </>
                            ) : (
                              <span className="moderation-property-detail__debt-document-link moderation-property-detail__debt-document-link--disabled">
                                {name}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {selectedDocument && (
        <div 
          className="moderation-property-detail__document-modal"
          onClick={() => setSelectedDocument(null)}
        >
          <div className="moderation-property-detail__document-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="moderation-property-detail__document-modal-close"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDocument(null);
              }}
            >
              <FiXCircle size={32} strokeWidth={2} />
            </button>
            {selectedDocument.type === 'pdf' ? (
              selectedDocument.url.startsWith('data:') ? (
                // Для base64 PDF используем embed или object
                <embed
                  src={selectedDocument.url}
                  type="application/pdf"
                  className="moderation-property-detail__document-pdf"
                  style={{ width: '95vw', maxWidth: '1600px', height: '90vh' }}
                />
              ) : (
                <iframe
                  src={`${selectedDocument.url}#toolbar=0`}
                  className="moderation-property-detail__document-pdf"
                  title={selectedDocument.name}
                  style={{ width: '95vw', maxWidth: '1600px', height: '90vh', border: 'none' }}
                />
              )
            ) : (
              <img 
                src={selectedDocument.url} 
                alt={selectedDocument.name}
                style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain' }}
                onError={(e) => {
                  console.error('Ошибка загрузки изображения:', selectedDocument.url);
                  e.target.src = t('admin_https_via_placeholder_com_bc84e599');
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Модальное окно с изменениями */}
      {confirmAction && (
        <div
          className="moderation-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="moderation-confirm-title"
          onClick={closeConfirm}
        >
          <div className="moderation-confirm__panel" onClick={(e) => e.stopPropagation()}>
            {confirmAction === 'approve' ? (
              <>
                <span className="moderation-confirm__mark" aria-hidden>
                  <FiGlobe size={22} />
                </span>
                <p className="moderation-confirm__kicker">{t('admin_moderaciya_80ae616e')}</p>
                <h2 id="moderation-confirm-title" className="moderation-confirm__title">
                  {t('admin_opublikovat_obyavlenie_cb13631a')}
                </h2>
                <p className="moderation-confirm__text">
                  {t('admin_snachala_perevedem_tekst_na_77b157c3')}
                </p>
                <p className="moderation-confirm__langs">EN · DE · ES · FR · SV</p>
                <div className="moderation-confirm__actions">
                  <button type="button" className="moderation-confirm__btn moderation-confirm__btn--ghost" onClick={closeConfirm}>
                    {t('admin_otmena_0ec753be')}
                  </button>
                  <button type="button" className="moderation-confirm__btn moderation-confirm__btn--approve" onClick={handleConfirmApprove}>
                    <FiCheck size={18} />
                    {t('admin_odobrit_i_perevesti_05128924')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="moderation-confirm__mark moderation-confirm__mark--reject" aria-hidden>
                  <FiXCircle size={22} />
                </span>
                <p className="moderation-confirm__kicker">{t('admin_moderaciya_80ae616e')}</p>
                <h2 id="moderation-confirm-title" className="moderation-confirm__title">
                  {t('admin_otklonit_obyavlenie_176b3550')}
                </h2>
                <p className="moderation-confirm__text">
                  {t('admin_obekt_ne_budet_opublikovan_5ee95354')}
                </p>
                <div className="moderation-confirm__actions">
                  <button type="button" className="moderation-confirm__btn moderation-confirm__btn--ghost" onClick={closeConfirm}>
                    {t('admin_otmena_0ec753be')}
                  </button>
                  <button type="button" className="moderation-confirm__btn moderation-confirm__btn--reject" onClick={handleConfirmReject}>
                    <FiXCircle size={18} />
                    {t('admin_reject')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showChangesModal && (
        <div 
          className="changes-modal-overlay"
          onClick={() => setShowChangesModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div 
            className="changes-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '85vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
                {t('admin_izmeneniya_v_obyavlenii_d2f70c60')}
              </h2>
              <button
                onClick={() => setShowChangesModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FiX size={24} />
              </button>
            </div>
            
            {getPropertyChanges().length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {getPropertyChanges().map((change, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#111827', fontSize: '0.95rem' }}>
                      {change.field}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: '500' }}>{t('admin_bylo_62aac560')}</div>
                        <div style={{ 
                          padding: '0.5rem', 
                          backgroundColor: '#fee2e2', 
                          borderRadius: '4px',
                          color: '#991b1b',
                          textDecoration: 'line-through',
                          fontSize: '0.875rem'
                        }}>
                          {change.old}
                        </div>
                      </div>
                      <div style={{ fontSize: '1.5rem', color: '#0099A9', fontWeight: 'bold' }}>→</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: '500' }}>{t('admin_stalo_73bbbd80')}</div>
                        <div style={{ 
                          padding: '0.5rem', 
                          backgroundColor: '#d1fae5', 
                          borderRadius: '4px',
                          color: '#007d8a',
                          fontWeight: '500',
                          fontSize: '0.875rem'
                        }}>
                          {change.new}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#6b7280',
                backgroundColor: '#f9fafb',
                borderRadius: '8px'
              }}>
                {t('admin_izmeneniy_ne_obnaruzheno_91521b87')}
              </div>
            )}
            
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowChangesModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0099A9',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#007d8a';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#0099A9';
                }}
              >
                {t('admin_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationPropertyDetail;


