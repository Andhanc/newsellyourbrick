import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiShoppingCart, FiCheck, FiX, FiClock, FiFileText, FiExternalLink } from 'react-icons/fi';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { markPurchaseRequestsViewed } from '../../utils/adminSidebarBadges';
import { showNotification } from '../../utils/toastHelper';
import './PurchaseRequests.css';

const PurchaseRequests = ({ onAdminSectionBadgeRefresh }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [loadingPropertyDetails, setLoadingPropertyDetails] = useState(false);
  /** Email из заявки или профиля (для кнопок «в обработку» / «завершить») */
  const [resolvedBuyerEmail, setResolvedBuyerEmail] = useState(null);

  // Загружаем запросы на покупку из БД
  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/purchase-requests?limit=1000`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setRequests(result.data);
        } else {
          setError('Не удалось загрузить запросы');
        }
      } else {
        setError('Ошибка при загрузке запросов');
      }
    } catch (err) {
      console.error('❌ Ошибка при загрузке запросов на покупку:', err);
      setError('Произошла ошибка при загрузке запросов');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    if (!searchQuery && statusFilter === 'all') {
      return requests;
    }
    
    return requests.filter(request => {
      // Поиск по имени покупателя, email, телефону или названию объекта
      const matchesSearch = !searchQuery || (() => {
        const searchLower = searchQuery.toLowerCase();
        const buyerName = (request.buyer_name || '').toLowerCase();
        const buyerEmail = (request.buyer_email || '').toLowerCase();
        const buyerPhone = (request.buyer_phone || '').toLowerCase();
        const propertyTitle = (request.property_title || '').toLowerCase();
        return buyerName.includes(searchLower) || 
               buyerEmail.includes(searchLower) || 
               buyerPhone.includes(searchLower) ||
               propertyTitle.includes(searchLower);
      })();
      
      // Фильтр по статусу
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, requests]);

  useEffect(() => {
    let cancelled = false;
    async function resolveEmail() {
      if (!selectedRequest) {
        setResolvedBuyerEmail(null);
        return;
      }
      const fromReq = selectedRequest.buyer_email && String(selectedRequest.buyer_email).trim();
      if (fromReq) {
        setResolvedBuyerEmail(fromReq);
        return;
      }
      const bid = selectedRequest.buyer_id;
      if (bid == null) {
        setResolvedBuyerEmail(null);
        return;
      }
      try {
        const API_BASE_URL = await getApiBaseUrl();
        const r = await fetch(`${API_BASE_URL}/users/${bid}`);
        if (!r.ok || cancelled) return;
        const j = await r.json();
        const em =
          j.success && j.data?.email ? String(j.data.email).trim() : '';
        if (!cancelled) setResolvedBuyerEmail(em || null);
      } catch {
        if (!cancelled) setResolvedBuyerEmail(null);
      }
    }
    resolveEmail();
    return () => {
      cancelled = true;
    };
  }, [selectedRequest]);

  const hasBuyerEmailForAdmin =
    !!(resolvedBuyerEmail && String(resolvedBuyerEmail).trim());

  const handleStatusUpdate = async (requestId, newStatus) => {
    if (updatingStatus) return;
    
    setUpdatingStatus(true);
    try {
      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/purchase-requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNotes || null
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Обновляем локальное состояние
          setRequests(requests.map(req => 
            req.id === requestId ? { ...req, status: newStatus, admin_notes: adminNotes || req.admin_notes } : req
          ));
          setAdminNotes('');
          setIsDetailModalOpen(false);
          setSelectedRequest(null);
          setPropertyDetails(null);
        } else {
          showNotification(`Ошибка: ${result.error || 'Не удалось обновить статус'}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification(
          `Ошибка: ${errorData.error || errorData.message || 'Не удалось обновить статус'}`
        );
      }
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      showNotification('Произошла ошибка при обновлении статуса');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот запрос?')) {
      return;
    }

    try {
      const API_BASE_URL = await getApiBaseUrl();
      const response = await fetch(`${API_BASE_URL}/purchase-requests/${requestId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRequests(requests.filter(req => req.id !== requestId));
          showNotification('Запрос успешно удален');
        } else {
          showNotification(`Ошибка: ${result.error || 'Не удалось удалить запрос'}`);
        }
      } else {
        const errorData = await response.json();
        showNotification(`Ошибка: ${errorData.error || 'Не удалось удалить запрос'}`);
      }
    } catch (error) {
      console.error('Ошибка при удалении запроса:', error);
      showNotification('Произошла ошибка при удалении запроса');
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      pending: 'Ожидает',
      processing: 'В обработке',
      completed: 'Завершен',
      cancelled: 'Отменен'
    };  
    return statusMap[status] || status;
  };

  const getStatusBadgeClass = (status) => {
    const classMap = {
      pending: 'status-badge--pending',
      processing: 'status-badge--processing',
      completed: 'status-badge--completed',
      cancelled: 'status-badge--cancelled'
    };
    return classMap[status] || '';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FiClock size={16} />;
      case 'processing':
        return <FiFileText size={16} />;
      case 'completed':
        return <FiCheck size={16} />;
      case 'cancelled':
        return <FiX size={16} />;
      default:
        return <FiClock size={16} />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    try {
      return new Date(dateString).toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Не указано';
    }
  };

  const formatPrice = (price, currency) => {
    if (!price) return 'Не указано';
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency || '';
    return `${currencySymbol}${price.toLocaleString('ru-RU')}`;
  };

  return (
    <div className="purchase-requests-container">
      <div className="purchase-requests-toolbar">
        <button
          type="button"
          className="purchase-requests-toolbar__btn"
          onClick={() => {
            markPurchaseRequestsViewed();
            void onAdminSectionBadgeRefresh?.();
          }}
        >
          Просмотрено
        </button>
      </div>
      <div className="purchase-requests-filter">
        <div className="filter-search">
          <FiSearch className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Поиск по имени, email, телефону или объекту..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => setSearchQuery('')}
              aria-label="Очистить поиск"
            >
              <FiX size={18} />
            </button>
          )}
        </div>
        
        <div className="filter-buttons">
          <div className="filter-group">
            <label className="filter-label">Статус:</label>
            <div className="filter-options">
              <button
                className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Все
              </button>
              <button
                className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                Ожидает
              </button>
              <button
                className={`filter-btn ${statusFilter === 'processing' ? 'active' : ''}`}
                onClick={() => setStatusFilter('processing')}
              >
                В обработке
              </button>
              <button
                className={`filter-btn ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                Завершен
              </button>
              <button
                className={`filter-btn ${statusFilter === 'cancelled' ? 'active' : ''}`}
                onClick={() => setStatusFilter('cancelled')}
              >
                Отменен
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="purchase-requests-loading">
          <p>Загрузка запросов...</p>
        </div>
      ) : error ? (
        <div className="purchase-requests-error">
          <p>Ошибка: {error}</p>
          <button onClick={fetchRequests}>Попробовать снова</button>
        </div>
      ) : (
        <div className="purchase-requests-list">
          {filteredRequests.length === 0 ? (
            <div className="purchase-requests-empty">
              <FiShoppingCart size={48} />
              <p>Запросы на покупку не найдены</p>
            </div>
          ) : (
            filteredRequests.map(request => (
              <div 
                key={request.id} 
                className="purchase-request-card"
                onClick={async (e) => {
                  e.stopPropagation();
                  
                  setSelectedRequest(request);
                  setAdminNotes(request.admin_notes || '');
                  setIsDetailModalOpen(true);
                  
                  // Загружаем полную информацию об объекте
                  if (request.property_id) {
                    setLoadingPropertyDetails(true);
                    try {
                      const API_BASE_URL = await getApiBaseUrl();
                      const response = await fetch(`${API_BASE_URL}/properties/${request.property_id}`);
                      if (response.ok) {
                        const result = await response.json();
                        if (result.success && result.data) {
                          setPropertyDetails(result.data);
                        }
                      }
                    } catch (err) {
                      console.error('Ошибка при загрузке данных объекта:', err);
                    } finally {
                      setLoadingPropertyDetails(false);
                    }
                  } else {
                    setPropertyDetails(null);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="purchase-request-card__header">
                  <div className="purchase-request-card__title">
                    <FiShoppingCart size={20} />
                    <h3>{request.property_title || 'Объект не указан'}</h3>
                  </div>
                  <span 
                    className={`status-badge ${getStatusBadgeClass(request.status)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {getStatusIcon(request.status)}
                    {getStatusLabel(request.status)}
                  </span>
                </div>
                
                <div className="purchase-request-card__info">
                  <div className="purchase-request-info-item">
                    <span className="info-label">Покупатель:</span>
                    <span className="info-value">{request.buyer_name || 'Не указано'}</span>
                  </div>
                  
                  {request.buyer_email && (
                    <div className="purchase-request-info-item">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{request.buyer_email}</span>
                    </div>
                  )}
                  
                  {request.buyer_phone && (
                    <div className="purchase-request-info-item">
                      <span className="info-label">Телефон:</span>
                      <span className="info-value">{request.buyer_phone}</span>
                    </div>
                  )}
                  
                  {request.property_price && (
                    <div className="purchase-request-info-item">
                      <span className="info-label">Цена:</span>
                      <span className="info-value info-value--price">
                        {formatPrice(request.property_price, request.property_currency)}
                      </span>
                    </div>
                  )}
                  
                  {request.property_location && (
                    <div className="purchase-request-info-item">
                      <span className="info-label">Местоположение:</span>
                      <span className="info-value">{request.property_location}</span>
                    </div>
                  )}
                  
                  <div className="purchase-request-info-item">
                    <span className="info-label">Дата запроса:</span>
                    <span className="info-value">{formatDate(request.request_date || request.created_at)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!isLoading && !error && (
        <div className="purchase-requests-stats">
          <div className="stat-item">
            <span className="stat-label">Всего запросов:</span>
            <span className="stat-value">{requests.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Найдено:</span>
            <span className="stat-value">{filteredRequests.length}</span>
          </div>
        </div>
      )}

      {/* Модальное окно с деталями запроса */}
      {isDetailModalOpen && selectedRequest && createPortal(
        <div className="purchase-request-modal-overlay" onClick={() => {
          setIsDetailModalOpen(false);
          setSelectedRequest(null);
          setAdminNotes('');
          setPropertyDetails(null);
        }}>
          <div className="purchase-request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="purchase-request-modal__header">
              <h2>Детали запроса на покупку</h2>
              <button 
                className="modal-close-btn"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedRequest(null);
                  setAdminNotes('');
                  setPropertyDetails(null);
                }}
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div className="purchase-request-modal__content">
              <div className="modal-section">
                <h3>Информация о покупателе</h3>
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <span className="modal-info-label">Имя:</span>
                    <span className="modal-info-value">{selectedRequest.buyer_name || 'Не указано'}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Телефон:</span>
                    <span className="modal-info-value">{selectedRequest.buyer_phone || 'Не указано'}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="modal-info-label">Почта:</span>
                    <span className="modal-info-value">{selectedRequest.buyer_email || 'Не указано'}</span>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h3>Информация о владельце объекта</h3>
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <span className="modal-info-label">Имя:</span>
                    <span className="modal-info-value">
                      {propertyDetails?.first_name && propertyDetails?.last_name
                        ? `${propertyDetails.first_name} ${propertyDetails.last_name}`
                        : selectedRequest.seller_name || 'Владелец не указан'}
                    </span>
                  </div>
                  {(propertyDetails?.email || selectedRequest.seller_email) && (
                    <div className="modal-info-item">
                      <span className="modal-info-label">Email:</span>
                      <span className="modal-info-value">
                        {propertyDetails?.email || selectedRequest.seller_email}
                      </span>
                    </div>
                  )}
                  <div className="modal-info-item">
                    <span className="modal-info-label">Телефон:</span>
                    <span className="modal-info-value">
                      {propertyDetails?.phone_number || selectedRequest.seller_phone || 'Не указано'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h3>Информация об объекте</h3>
                {loadingPropertyDetails ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                    Загрузка данных объекта...
                  </div>
                ) : (
                  <div className="modal-info-grid">
                    <div className="modal-info-item">
                      <span className="modal-info-label">Название:</span>
                      <span className="modal-info-value">
                        {propertyDetails?.title || selectedRequest.property_title || 'Не указано'}
                      </span>
                    </div>
                    
                    {(propertyDetails?.property_type || selectedRequest.property_type) && (
                      <div className="modal-info-item">
                        <span className="modal-info-label">Тип недвижимости:</span>
                        <span className="modal-info-value">
                          {(() => {
                            const type = propertyDetails?.property_type || selectedRequest.property_type;
                            const typeMap = {
                              'apartment': 'Квартира',
                              'house': 'Дом',
                              'villa': 'Вилла',
                              'townhouse': 'Таунхаус',
                              'commercial': 'Коммерческая'
                            };
                            return typeMap[type] || type || 'Не указано';
                          })()}
                        </span>
                      </div>
                    )}
                    
                    {(propertyDetails?.price || selectedRequest.property_price) && (
                      <div className="modal-info-item">
                        <span className="modal-info-label">Цена:</span>
                        <span className="modal-info-value">
                          {formatPrice(
                            propertyDetails?.price || selectedRequest.property_price,
                            propertyDetails?.currency || selectedRequest.property_currency
                          )}
                        </span>
                      </div>
                    )}
                    
                    {(propertyDetails?.area || propertyDetails?.sqft || selectedRequest.property_area) && (
                      <div className="modal-info-item">
                        <span className="modal-info-label">Площадь:</span>
                        <span className="modal-info-value">
                          {propertyDetails?.area || propertyDetails?.sqft || selectedRequest.property_area || 'Не указано'} м²
                        </span>
                      </div>
                    )}
                    
                    {(propertyDetails?.rooms || selectedRequest.property_rooms) && (
                      <div className="modal-info-item">
                        <span className="modal-info-label">Комнат:</span>
                        <span className="modal-info-value">
                          {propertyDetails?.rooms || selectedRequest.property_rooms || 'Не указано'}
                        </span>
                      </div>
                    )}
                    
                    {(propertyDetails?.bedrooms || selectedRequest.property_bedrooms) && (
                      <div className="modal-info-item">
                        <span className="modal-info-label">Спален:</span>
                        <span className="modal-info-value">
                          {propertyDetails?.bedrooms || selectedRequest.property_bedrooms || 'Не указано'}
                        </span>
                      </div>
                    )}
                    
                    {(propertyDetails?.bathrooms || selectedRequest.property_bathrooms) && (
                      <div className="modal-info-item">
                        <span className="modal-info-label">Ванных:</span>
                        <span className="modal-info-value">
                          {propertyDetails?.bathrooms || selectedRequest.property_bathrooms || 'Не указано'}
                        </span>
                      </div>
                    )}
                    
                    {(propertyDetails?.floor !== null && propertyDetails?.floor !== undefined) && (
                      <div className="modal-info-item">
                        <span className="modal-info-label">Этаж:</span>
                        <span className="modal-info-value">
                          {propertyDetails.floor}
                          {propertyDetails.total_floors ? ` / ${propertyDetails.total_floors}` : ''}
                        </span>
                      </div>
                    )}
                    
                    {(propertyDetails?.year_built || selectedRequest.property_year_built) && (
                      <div className="modal-info-item">
                        <span className="modal-info-label">Год постройки:</span>
                        <span className="modal-info-value">
                          {propertyDetails?.year_built || selectedRequest.property_year_built || 'Не указано'}
                        </span>
                      </div>
                    )}
                    
                    {(propertyDetails?.land_area || selectedRequest.property_land_area) && (
                      <div className="modal-info-item">
                        <span className="modal-info-label">Площадь участка:</span>
                        <span className="modal-info-value">
                          {propertyDetails?.land_area || selectedRequest.property_land_area || 'Не указано'} м²
                        </span>
                      </div>
                    )}
                    
                    {(propertyDetails?.location || selectedRequest.property_location) && (
                      <div className="modal-info-item modal-info-item--full">
                        <span className="modal-info-label">Местоположение:</span>
                        <span className="modal-info-value">
                          {propertyDetails?.location || selectedRequest.property_location}
                        </span>
                      </div>
                    )}
                    
                    {(propertyDetails?.description || selectedRequest.property_description) && (
                      <div className="modal-info-item modal-info-item--full">
                        <span className="modal-info-label">Описание:</span>
                        <span className="modal-info-value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                          {propertyDetails?.description || selectedRequest.property_description || 'Не указано'}
                        </span>
                      </div>
                    )}
                    
                    {/* Удобства */}
                    {(propertyDetails?.balcony || propertyDetails?.parking || propertyDetails?.elevator || 
                      propertyDetails?.garage || propertyDetails?.pool || propertyDetails?.garden ||
                      propertyDetails?.electricity || propertyDetails?.internet || propertyDetails?.security ||
                      propertyDetails?.furniture || selectedRequest.property_balcony || selectedRequest.property_parking) && (
                      <div className="modal-info-item modal-info-item--full">
                        <span className="modal-info-label">Удобства:</span>
                        <div className="modal-info-value" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                          {((propertyDetails?.balcony === 1 || propertyDetails?.balcony === true) || selectedRequest.property_balcony === 1) && (
                            <span style={{ padding: '0.25rem 0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.875rem' }}>Балкон</span>
                          )}
                          {((propertyDetails?.parking === 1 || propertyDetails?.parking === true) || selectedRequest.property_parking === 1) && (
                            <span style={{ padding: '0.25rem 0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.875rem' }}>Парковка</span>
                          )}
                          {((propertyDetails?.elevator === 1 || propertyDetails?.elevator === true) || selectedRequest.property_elevator === 1) && (
                            <span style={{ padding: '0.25rem 0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.875rem' }}>Лифт</span>
                          )}
                          {((propertyDetails?.garage === 1 || propertyDetails?.garage === true) || selectedRequest.property_garage === 1) && (
                            <span style={{ padding: '0.25rem 0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.875rem' }}>Гараж</span>
                          )}
                          {((propertyDetails?.pool === 1 || propertyDetails?.pool === true) || selectedRequest.property_pool === 1) && (
                            <span style={{ padding: '0.25rem 0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.875rem' }}>Бассейн</span>
                          )}
                          {((propertyDetails?.garden === 1 || propertyDetails?.garden === true) || selectedRequest.property_garden === 1) && (
                            <span style={{ padding: '0.25rem 0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.875rem' }}>Сад</span>
                          )}
                          {((propertyDetails?.electricity === 1 || propertyDetails?.electricity === true) || selectedRequest.property_electricity === 1) && (
                            <span style={{ padding: '0.25rem 0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.875rem' }}>Электричество</span>
                          )}
                          {((propertyDetails?.internet === 1 || propertyDetails?.internet === true) || selectedRequest.property_internet === 1) && (
                            <span style={{ padding: '0.25rem 0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.875rem' }}>Интернет</span>
                          )}
                          {((propertyDetails?.security === 1 || propertyDetails?.security === true) || selectedRequest.property_security === 1) && (
                            <span style={{ padding: '0.25rem 0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.875rem' }}>Охрана</span>
                          )}
                          {((propertyDetails?.furniture === 1 || propertyDetails?.furniture === true) || selectedRequest.property_furniture === 1) && (
                            <span style={{ padding: '0.25rem 0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '0.875rem' }}>Мебель</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Дополнительная информация */}
                    {(propertyDetails?.renovation || propertyDetails?.condition || propertyDetails?.heating ||
                      propertyDetails?.water_supply || propertyDetails?.sewerage ||
                      selectedRequest.property_renovation || selectedRequest.property_condition) && (
                      <div className="modal-info-item modal-info-item--full">
                        <span className="modal-info-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Дополнительная информация:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {(propertyDetails?.renovation || selectedRequest.property_renovation) && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '120px' }}>Ремонт:</span>
                              <span>{propertyDetails?.renovation || selectedRequest.property_renovation}</span>
                            </div>
                          )}
                          {(propertyDetails?.condition || selectedRequest.property_condition) && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '120px' }}>Состояние:</span>
                              <span>{propertyDetails?.condition || selectedRequest.property_condition}</span>
                            </div>
                          )}
                          {(propertyDetails?.heating || selectedRequest.property_heating) && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '120px' }}>Отопление:</span>
                              <span>{propertyDetails?.heating || selectedRequest.property_heating}</span>
                            </div>
                          )}
                          {(propertyDetails?.water_supply || selectedRequest.property_water_supply) && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '120px' }}>Водоснабжение:</span>
                              <span>{propertyDetails?.water_supply || selectedRequest.property_water_supply}</span>
                            </div>
                          )}
                          {(propertyDetails?.sewerage || selectedRequest.property_sewerage) && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 600, color: '#6b7280', minWidth: '120px' }}>Канализация:</span>
                              <span>{propertyDetails?.sewerage || selectedRequest.property_sewerage}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Коммерческая недвижимость */}
                    {(propertyDetails?.commercial_type || selectedRequest.property_commercial_type) && (
                      <div className="modal-info-item">
                        <span className="modal-info-label">Тип коммерческой недвижимости:</span>
                        <span className="modal-info-value">
                          {propertyDetails?.commercial_type || selectedRequest.property_commercial_type}
                        </span>
                      </div>
                    )}
                    
                    {(propertyDetails?.business_hours || selectedRequest.property_business_hours) && (
                      <div className="modal-info-item">
                        <span className="modal-info-label">Часы работы:</span>
                        <span className="modal-info-value">
                          {propertyDetails?.business_hours || selectedRequest.property_business_hours}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-section">
                <h3>Статус и заметки</h3>
                <div className="modal-info-grid">
                  {(selectedRequest.property_id || propertyDetails?.id) && (
                    <div className="modal-info-item">
                      <span className="modal-info-label">Ссылка на объект:</span>
                      <span className="modal-info-value">
                        <a
                          href={`/property/${selectedRequest.property_id || propertyDetails?.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/property/${selectedRequest.property_id || propertyDetails?.id}`);
                            setIsDetailModalOpen(false);
                          }}
                          style={{
                            color: '#0ABAB5',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontWeight: 500
                          }}
                        >
                          Перейти к объекту
                          <FiExternalLink size={16} />
                        </a>
                      </span>
                    </div>
                  )}
                  <div className="modal-info-item">
                    <span className="modal-info-label">Дата запроса:</span>
                    <span className="modal-info-value">
                      {formatDate(selectedRequest.request_date || selectedRequest.created_at)}
                    </span>
                  </div>
                </div>
                
                <div className="modal-notes">
                  <label className="modal-notes-label">Заметки администратора:</label>
                  <textarea
                    className="modal-notes-textarea"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Добавьте заметки о запросе..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="purchase-request-modal__actions">
              {selectedRequest && !hasBuyerEmailForAdmin && (
                <p
                  style={{
                    margin: '0 0 12px',
                    fontSize: 13,
                    color: '#b45309',
                    lineHeight: 1.4,
                  }}
                >
                  У покупателя нет email в заявке и в профиле. Укажите email в профиле пользователя —
                  без него нельзя отправить письмо при одобрении и завершении сделки.
                </p>
              )}
              <div className="modal-actions-group">
                <button
                  className="modal-action-btn modal-action-btn--processing"
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'processing')}
                  disabled={
                    updatingStatus ||
                    selectedRequest.status === 'processing' ||
                    !hasBuyerEmailForAdmin
                  }
                  title={
                    !hasBuyerEmailForAdmin
                      ? 'У покупателя нет email в заявке и в профиле — письмо не отправить'
                      : undefined
                  }
                >
                  <FiFileText />
                  В обработку
                </button>
                <button
                  className="modal-action-btn modal-action-btn--completed"
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'completed')}
                  disabled={
                    updatingStatus ||
                    selectedRequest.status === 'completed' ||
                    !hasBuyerEmailForAdmin
                  }
                  title={
                    !hasBuyerEmailForAdmin
                      ? 'У покупателя нет email в заявке и в профиле — письмо не отправить'
                      : undefined
                  }
                >
                  <FiCheck />
                  Завершить
                </button>
                <button
                  className="modal-action-btn modal-action-btn--cancelled"
                  onClick={() => handleStatusUpdate(selectedRequest.id, 'cancelled')}
                  disabled={updatingStatus || selectedRequest.status === 'cancelled'}
                >
                  <FiX />
                  Отменить
                </button>
              </div>
              <button
                className="modal-action-btn modal-action-btn--delete"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleDelete(selectedRequest.id);
                }}
                disabled={updatingStatus}
              >
                <FiX />
                Удалить запрос
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PurchaseRequests;
