import React, { useState, useRef, useEffect } from 'react';
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiCheck, FiXCircle, FiFileText, FiVideo, FiImage, FiEye, FiX, FiAlertCircle, FiExternalLink, FiGlobe } from 'react-icons/fi';
import { IoLocationOutline as IoLocation } from 'react-icons/io5';
import { MdBed, MdOutlineBathtub } from 'react-icons/md';
import { BiArea } from 'react-icons/bi';
import LocationMap from '../LocationMap';
import './ModerationPropertyDetail.css';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import { showNotification } from '../../utils/toastHelper';

const API_BASE_URL = getApiBaseUrlSync();

const TRANSLATION_LANGUAGES = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'sv', name: 'Svenska' },
];

// Моковые изображения для недвижимости
const mockPropertyImages = [
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=1200&q=80'
];

const ModerationPropertyDetail = ({ property, onBack, onApprove, onReject }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [mediaType, setMediaType] = useState('photos'); // 'photos' или 'videos'
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
          showNotification('Перевод готов', 'success');
        } else {
          showNotification(data.error || 'Ошибка перевода', 'error');
        }
      })
      .catch((err) => {
        showNotification(err.message || 'Ошибка перевода', 'error');
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
      apartment: 'Квартира',
      villa: 'Вилла',
      house: 'Дом'
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
    'publication': 'Запрос на публикацию',
    'edit': 'Запрос на редактирование',
    'delete': 'Запрос на удаление'
  };
  const requestTypeColors = {
    'publication': '#0ABAB5',
    'edit': '#f59e0b',
    'delete': '#ef4444'
  };

  // Загружаем оригинальный объект, если это запрос на редактирование
  useEffect(() => {
    if (requestType === 'edit' && property.rejection_reason) {
      const originalPropertyId = property.rejection_reason.replace('EDIT:', '');
      if (originalPropertyId) {
        setLoadingOriginal(true);
        fetch(`${API_BASE_URL}/properties/${originalPropertyId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              setOriginalProperty(data.data);
            }
          })
          .catch(error => {
            console.error('Ошибка загрузки оригинального объекта:', error);
          })
          .finally(() => {
            setLoadingOriginal(false);
          });
      }
    }
  }, [property, requestType]);

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
      title: 'Название',
      description: 'Описание',
      price: 'Цена',
      currency: 'Валюта',
      area: 'Площадь',
      rooms: 'Комнаты',
      bedrooms: 'Спальни',
      bathrooms: 'Ванные',
      floor: 'Этаж',
      total_floors: 'Всего этажей',
      year_built: 'Год постройки',
      location: 'Местоположение',
      land_area: 'Площадь участка',
      commercial_type: 'Тип коммерческой',
      business_hours: 'Часы работы',
      renovation: 'Ремонт',
      condition: 'Состояние',
      heating: 'Отопление',
      water_supply: 'Водоснабжение',
      sewerage: 'Канализация',
      is_auction: 'Аукцион',
      auction_start_date: 'Дата начала аукциона',
      auction_end_date: 'Дата окончания аукциона',
      auction_starting_price: 'Стартовая цена аукциона',
      balcony: 'Балкон',
      parking: 'Парковка',
      elevator: 'Лифт',
      garage: 'Гараж',
      pool: 'Бассейн',
      garden: 'Сад',
      electricity: 'Электричество',
      internet: 'Интернет',
      security: 'Охрана',
      furniture: 'Мебель',
      test_drive: 'Есть тест-драйв'
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
            old: oldBool ? 'Да' : 'Нет',
            new: newBool ? 'Да' : 'Нет'
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
            old: oldBool ? 'Да' : 'Нет',
            new: newBool ? 'Да' : 'Нет'
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
            old: oldNum !== null ? oldNum.toLocaleString('ru-RU') : 'Не указано',
            new: newNum !== null ? newNum.toLocaleString('ru-RU') : 'Не указано'
          });
        }
        return;
      }
      
      // Обработка строковых значений
      if (oldValue !== newValue && (oldValue || newValue)) {
        changes.push({
          field: fieldLabels[key],
          old: oldValue || 'Не указано',
          new: newValue || 'Не указано'
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
        field: 'Фотографии',
        old: `${oldPhotos.length} фото`,
        new: `${newPhotos.length} фото`
      });
    }
    
    return changes;
  };

  const handleApproveClick = () => {
    if (window.confirm('Вы уверены, что хотите одобрить этот объект недвижимости?')) {
      onApprove(property.id, debtSeverity, approveAsPrivateClub);
    }
  };

  const handleRejectClick = () => {
    if (window.confirm('Вы уверены, что хотите отклонить этот объект недвижимости?')) {
      onReject(property.id);
    }
  };

  return (
    <div className="moderation-property-detail">
      {isTranslating && (
        <div className="moderation-property-detail__translate-overlay" aria-hidden="true">
          <div className="moderation-property-detail__translate-preloader">
            <div className="moderation-property-detail__translate-spinner" />
            <p className="moderation-property-detail__translate-text">ИИ переводит объявление на все языки...</p>
          </div>
        </div>
      )}
      <button className="moderation-property-detail__back" onClick={onBack}>
        <FiArrowLeft size={20} />
        Назад
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
                  aria-label="Предыдущее"
                >
                  <FiChevronLeft size={24} />
                </button>
                <button
                  className="moderation-property-detail__nav-btn moderation-property-detail__nav-btn--next"
                  onClick={handleNextMedia}
                  aria-label="Следующее"
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
            <p className="moderation-property-detail__gallery-info-title">Галерея</p>
            <p className="moderation-property-detail__gallery-info-text">
              {images.length} {images.length === 1 ? 'фотография' : images.length < 5 ? 'фотографии' : 'фотографий'}
              {videos.length > 0 && `, ${videos.length} ${videos.length === 1 ? 'видео' : videos.length < 5 ? 'видео' : 'видео'}`}
            </p>
          </div>
        </div>

        <div className="moderation-property-detail__info">
          <div className="moderation-property-detail__header">
            <h1 className="moderation-property-detail__title">{property.title || 'Без названия'}</h1>
            <div className="moderation-property-detail__statuses">
              <div className="moderation-property-detail__badge">
                {getTypeLabel(property.property_type || property.type)}
              </div>
              {isDebtProperty && (
                <div className="moderation-property-detail__badge">
                  Долг
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
                    Причина удаления:
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
                <span>{property.area} м²</span>
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
                <span>Комнат: {property.rooms}</span>
              </div>
            )}
          </div>

          <div className="moderation-property-detail__price">
            {/* Цена / сумма продажи */}
            {property.price && Number(property.price) > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{ color: '#111827', fontWeight: 500 }}>
                  {isDebtProperty ? 'Сумма продажи:' : 'Купить сейчас:'}
                </span>{' '}
                <span style={{ color: '#0ABAB5', fontWeight: 600 }}>
                  {Number(property.price).toLocaleString('ru-RU')} {property.currency || 'USD'}
                </span>
              </div>
            )}
            {!isDebtProperty && (
              <div style={{ fontSize: '14px', color: '#666' }}>
                <div style={{ marginBottom: '8px' }}>Аукционный объект</div>
                {property.auction_start_date && (
                  <div>Начало: {new Date(property.auction_start_date).toLocaleDateString('ru-RU')}</div>
                )}
                {property.auction_end_date && (
                  <div>Окончание: {new Date(property.auction_end_date).toLocaleDateString('ru-RU')}</div>
                )}
                {property.auction_starting_price && (
                  <div>Начальная сумма ставки: {Number(property.auction_starting_price).toLocaleString('ru-RU')} {property.currency || 'USD'}</div>
                )}
              </div>
            )}
          </div>

          {/* Блок риска и долгов — один визуальный блок */}
          {isDebtProperty && (
            <div className="moderation-property-detail__debt-block">
              <div className="moderation-property-detail__debt-block-risk">
                <h4 className="moderation-property-detail__debt-block-title">Уровень риска объекта</h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'red', label: 'Высокий', bg: '#ef4444' },
                    { id: 'yellow', label: 'Средний', bg: '#eab308' },
                    { id: 'green', label: 'Низкий', bg: '#16a34a' }
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
                        Долги по коммунальным услугам
                      </span>
                    )}
                    {(property.debt_mortgage_pledge === 1 || property.debt_mortgage_pledge === true) && (
                      <span style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#e3f5e8', fontSize: '13px', color: '#111827' }}>
                        Залог у банка
                      </span>
                    )}
                    {(property.debt_property_taxes === 1 || property.debt_property_taxes === true) && (
                      <span style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#e3f5e8', fontSize: '13px', color: '#111827' }}>
                        Неоплаченные налоги на имущество
                      </span>
                    )}
                    {(property.debt_arrest === 1 || property.debt_arrest === true) && (
                      <span style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#e3f5e8', fontSize: '13px', color: '#111827' }}>
                        Арест / ограничения
                      </span>
                    )}
                    {(property.debt_inherited === 1 || property.debt_inherited === true) && (
                      <span style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#e3f5e8', fontSize: '13px', color: '#111827' }}>
                        Долги наследодателя
                      </span>
                    )}
                    {(property.debt_third_party === 1 || property.debt_third_party === true) && (
                      <span style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#e3f5e8', fontSize: '13px', color: '#111827' }}>
                        Долги перед третьими лицами
                      </span>
                    )}
                  </div>

                  {property.debt_other && (
                    <div style={{ fontSize: '14px', color: '#111827' }}>
                      <strong>Другое:</strong> {property.debt_other}
                    </div>
                  )}

                  {property.debt_amount != null && property.debt_amount !== '' && !Number.isNaN(Number(property.debt_amount)) && (
                    <div style={{ fontSize: '14px', color: '#111827' }}>
                      <strong>Ориентировочная сумма долга:</strong>{' '}
                      <span style={{ color: '#0ABAB5', fontWeight: 600 }}>
                        {Number(property.debt_amount).toLocaleString('ru-RU')} {property.currency || 'USD'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {property.description && (
            <div className="moderation-property-detail__description">
              <h3>Описание объекта</h3>
              <p>{property.description}</p>
            </div>
          )}
          
          {/* Дополнительная информация */}
          <div className="moderation-property-detail__additional-info">
            <h3>Дополнительная информация</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}>
              {property.floor && (
                <div><strong>Этаж:</strong> {property.floor}</div>
              )}
              {property.total_floors && (
                <div><strong>Всего этажей:</strong> {property.total_floors}</div>
              )}
              {property.year_built && (
                <div><strong>Год постройки:</strong> {property.year_built}</div>
              )}
              {property.land_area && (
                <div><strong>Площадь участка:</strong> {property.land_area} м²</div>
              )}
              {property.renovation && (
                <div><strong>Ремонт:</strong> {property.renovation}</div>
              )}
              {property.condition && (
                <div><strong>Состояние:</strong> {property.condition}</div>
              )}
              {property.heating && (
                <div><strong>Отопление:</strong> {property.heating}</div>
              )}
              {property.water_supply && (
                <div><strong>Водоснабжение:</strong> {property.water_supply}</div>
              )}
              {property.sewerage && (
                <div><strong>Канализация:</strong> {property.sewerage}</div>
              )}
              {property.commercial_type && (
                <div><strong>Тип коммерческой:</strong> {property.commercial_type}</div>
              )}
              {property.business_hours && (
                <div><strong>Часы работы:</strong> {property.business_hours}</div>
              )}
              <div><strong>Есть тест-драйв:</strong> {(property.test_drive === 1 || property.test_drive === true || property.testDrive === true) ? 'Да' : 'Нет'}</div>
            </div>
          </div>
          
          {/* Удобства */}
          <div className="moderation-property-detail__amenities">
            <h3>Удобства</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
              {(() => {
                // Маппинг названий для основных удобств
                const mainAmenitiesLabels = {
                  balcony: 'Балкон',
                  parking: 'Парковка',
                  elevator: 'Лифт',
                  garage: 'Гараж',
                  pool: 'Бассейн',
                  garden: 'Сад',
                  electricity: 'Электричество',
                  internet: 'Интернет',
                  security: 'Охрана 24/7',
                  furniture: 'Мебель'
                }
                
                // Маппинг названий для feature полей
                const featureLabels = {
                  feature1: 'Подземная парковка',
                  feature2: 'Ресторан',
                  feature3: 'Стиральная машина',
                  feature4: 'Бар / лаундж',
                  feature5: 'Контроль доступа',
                  feature6: 'Видеонаблюдение',
                  feature7: 'Лоджия',
                  feature8: 'Кладовая',
                  feature9: 'Эксплуатируемая кровля / терраса',
                  feature10: 'Фальшпол',
                  feature11: 'Отдельный гараж / существующие постройки / вертолетная площадка',
                  feature12: 'EV-зарядка / велостоянка',
                  feature13: 'Фитнес-центр',
                  feature14: 'Сауна',
                  feature15: 'SPA / велнес',
                  feature16: 'Видеодомофон',
                  feature17: 'Круглосуточная охрана',
                  feature18: 'Гардеробная',
                  feature19: 'Камин',
                  feature20: 'Система умного дома',
                  feature21: 'Солнечные панели',
                  feature22: 'Система вентиляции / HVAC',
                  feature23: 'Центральное кондиционирование',
                  feature24: 'Водопровод подключен / сертификат энергоэффективности',
                  feature25: 'Резервный генератор / газ подключен / loading dock',
                  feature26: 'Грузовой лифт / канализация подключена'
                }
                
                // Получаем массив amenities (единственный источник правды)
                const amenitiesArray = property.amenities || []
                const isAmenitiesArray = Array.isArray(amenitiesArray)
                
                const amenityTags = []
                
                // Проверяем ТОЛЬКО массив amenities
                if (isAmenitiesArray && amenitiesArray.length > 0) {
                  // Основные удобства
                  Object.entries(mainAmenitiesLabels).forEach(([key, label]) => {
                    if (amenitiesArray.includes(key)) {
                      amenityTags.push(
                        <span key={key} style={{ padding: '5px 10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                          {label}
                        </span>
                      )
                    }
                  })
                  
                  // Feature поля
                  for (let i = 1; i <= 26; i++) {
                    const featureKey = `feature${i}`
                    if (amenitiesArray.includes(featureKey) && featureLabels[featureKey]) {
                      amenityTags.push(
                        <span key={featureKey} style={{ padding: '5px 10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                          {featureLabels[featureKey]}
                        </span>
                      )
                    }
                  }
                } else {
                  // Fallback: если массива нет, проверяем отдельные поля (для старых записей)
                  Object.entries(mainAmenitiesLabels).forEach(([key, label]) => {
                    if (property[key] === 1 || property[key] === true || property[key] === '1') {
                      amenityTags.push(
                        <span key={key} style={{ padding: '5px 10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                          {label}
                        </span>
                      )
                    }
                  })
                  
                  for (let i = 1; i <= 26; i++) {
                    const featureKey = `feature${i}`
                    const featureValue = property[featureKey]
                    if ((featureValue === 1 || featureValue === true || featureValue === '1') && featureLabels[featureKey]) {
                      amenityTags.push(
                        <span key={featureKey} style={{ padding: '5px 10px', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                          {featureLabels[featureKey]}
                        </span>
                      )
                    }
                  }
                }
                
                return amenityTags.length > 0 ? amenityTags : <span style={{ color: '#999' }}>Удобства не указаны</span>
              })()}
            </div>
            {/* Дополнительные удобства */}
            {property.additional_amenities && property.additional_amenities.trim() && (
              <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>Дополнительно:</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#666', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {property.additional_amenities}
                </p>
              </div>
            )}
          </div>

          <div className="moderation-property-detail__owner">
            <h3>Информация о владельце</h3>
            <p><strong>Имя:</strong> {property.first_name || property.ownerName || 'Не указано'} {property.last_name || ''}</p>
            <p><strong>Email:</strong> {property.email || property.ownerEmail || 'Не указано'}</p>
            <p><strong>Телефон:</strong> {property.phone_number || 'Не указано'}</p>
            <p><strong>Дата подачи:</strong> {
              property.created_at 
                ? new Date(property.created_at).toLocaleDateString('ru-RU')
                : property.submittedDate 
                  ? new Date(property.submittedDate).toLocaleDateString('ru-RU')
                  : 'Не указано'
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
              {isTranslating ? 'Перевод...' : 'Перевести'}
            </button>
            {Object.keys(translationsByLang).length > 0 && (
              <div className="moderation-property-detail__translations-view">
                <h3 className="moderation-property-detail__translations-title">Просмотр перевода</h3>
                <div className="moderation-property-detail__translations-lang-select">
                  <label htmlFor="translation-lang">Язык:</label>
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
                      <strong>Название:</strong>
                      <p>{translationsByLang[selectedTranslationLang].title || '—'}</p>
                    </div>
                    <div className="moderation-property-detail__translations-item">
                      <strong>Описание:</strong>
                      <p>{translationsByLang[selectedTranslationLang].description || '—'}</p>
                    </div>
                    {(translationsByLang[selectedTranslationLang].additional_amenities != null && translationsByLang[selectedTranslationLang].additional_amenities !== '') && (
                      <div className="moderation-property-detail__translations-item">
                        <strong>Доп. удобства:</strong>
                        <p>{translationsByLang[selectedTranslationLang].additional_amenities}</p>
                      </div>
                    )}
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
                <span>Только закрытый клуб (VIP)</span>
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
                    alert('Загрузка оригинального объекта...');
                  } else {
                    alert('Не удалось загрузить оригинальный объект для сравнения');
                  }
                }}
                disabled={!originalProperty || loadingOriginal}
              >
                <FiEye size={18} />
                {loadingOriginal ? 'Загрузка...' : 'Изменения'}
              </button>
            )}
            <button
              className="moderation-property-detail__btn moderation-property-detail__btn--approve"
              onClick={handleApproveClick}
            >
              <FiCheck size={20} />
              Одобрить
            </button>
            <button
              className="moderation-property-detail__btn moderation-property-detail__btn--reject"
              onClick={handleRejectClick}
            >
              <FiXCircle size={20} />
              Отклонить
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
              backgroundColor: mediaType === 'photos' ? '#0ABAB5' : '#f0f0f0',
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
            Фотографии ({images.length})
          </button>
          {videos.length > 0 && (
            <button
              onClick={() => setMediaType('videos')}
              style={{
                padding: '8px 16px',
                backgroundColor: mediaType === 'videos' ? '#0ABAB5' : '#f0f0f0',
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
              Видео ({videos.length})
            </button>
          )}
        </div>
        
        {mediaType === 'photos' && (
          <>
            <h2 className="moderation-property-detail__gallery-title">Фотографии объекта</h2>
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
                    <span>Фото {index + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        
        {mediaType === 'videos' && videos.length > 0 && (
          <>
            <h2 className="moderation-property-detail__gallery-title">Видео объекта</h2>
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
                      <img src={thumbnail} alt={`Видео ${index + 1}`} />
                    ) : (
                      <div style={{ width: '100%', height: '200px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiVideo size={48} color="#fff" />
                      </div>
                    )}
                    <div className="moderation-property-detail__gallery-overlay">
                      <span>Видео {index + 1}</span>
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
            Документы на недвижимость
          </h2>
          <div className="moderation-property-detail__documents-grid">
            {/* Документ о праве собственности */}
            {(property.ownership_document || property.ownershipDocument) && (() => {
              const rawDocUrl = property.ownership_document || property.ownershipDocument;
              const docUrl = processDocumentUrl(rawDocUrl);
              const docName = property.ownership_document_name || property.ownershipDocumentName || 'Документ о праве собственности';
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
                      {docType === 'pdf' ? 'PDF документ' : 'Изображение'}
                    </span>
                  </div>
                </div>
              );
            })()}
            
            {/* Справка об отсутствии обременений — не показываем для объектов с долгами */}
            {!isDebtProperty && (property.no_debts_document || property.noDebtsDocument) && (() => {
              const rawDocUrl = property.no_debts_document || property.noDebtsDocument;
              const docUrl = processDocumentUrl(rawDocUrl);
              const docName = property.no_debts_document_name || property.noDebtsDocumentName || 'Справка об отсутствии обременений';
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
                      {docType === 'pdf' ? 'PDF документ' : 'Изображение'}
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
                      url: documentUrl || 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80', 
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
                      {documentType === 'pdf' ? 'PDF документ' : 'Изображение'}
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
                const documentName = typeof doc === 'string' ? doc : (doc.name || `Документ ${index + 1}`);
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
                        url: documentUrl || 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80', 
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
                        {documentType === 'pdf' ? 'PDF документ' : 'Изображение'}
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
                cat1: 'Документы по самому долгу',
                cat2: 'Документы по обеспечению (недвижимости)',
                cat3: 'Юридические документы',
                cat4: 'Документы по заемщику',
                cat5: 'Документы по сделке покупки долга',
                cat6: 'Дополнительно'
              };

              const entries = Object.entries(groups);

              return entries.map(([type, docs]) => (
                <div key={`debt_docs_${type}`} className="moderation-property-detail__document-card moderation-property-detail__document-card--debt-group">
                  <div className="moderation-property-detail__document-icon">
                    <FiFileText size={32} />
                  </div>
                  <div className="moderation-property-detail__document-info">
                    <h3 className="moderation-property-detail__document-name">
                      {typeTitles[type] || `Документы категории ${type}`}
                    </h3>
                    <ul className="moderation-property-detail__debt-documents-list">
                      {docs.map((doc, index) => {
                        const rawUrl = doc.file_path;
                        const url = processDocumentUrl(rawUrl);
                        const name = doc.original_name || `Документ ${index + 1}`;
                        const docType = getDocumentType(rawUrl, name);
                        return (
                          <li key={doc.id || `${type}_${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {url ? (
                              <>
                                <button
                                  className="moderation-property-detail__debt-document-link"
                                  style={{ border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                  onClick={() => setSelectedDocument({ type: docType, url, name })}
                                  title="Открыть предпросмотр"
                                >
                                  {name}
                                </button>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Открыть в новой вкладке"
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
                  e.target.src = 'https://via.placeholder.com/800x600?text=Ошибка+загрузки+изображения';
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Модальное окно с изменениями */}
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
                Изменения в объявлении
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
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: '500' }}>Было:</div>
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
                      <div style={{ fontSize: '1.5rem', color: '#0ABAB5', fontWeight: 'bold' }}>→</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: '500' }}>Стало:</div>
                        <div style={{ 
                          padding: '0.5rem', 
                          backgroundColor: '#d1fae5', 
                          borderRadius: '4px',
                          color: '#065f46',
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
                Изменений не обнаружено
              </div>
            )}
            
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowChangesModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0ABAB5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#089a95';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#0ABAB5';
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModerationPropertyDetail;


