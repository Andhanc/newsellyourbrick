import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n/config';
import { FiSearch, FiUser, FiHome, FiShield, FiShieldOff, FiX, FiCheck, FiXCircle, FiTrash2 } from 'react-icons/fi';
import { FaBuilding } from 'react-icons/fa';
import ModerationPropertyDetail from './ModerationPropertyDetail';
import ModerationUserDetail from './ModerationUserDetail';
import { showNotification } from '../../utils/toastHelper';
import {
  buildModerationBadgesPatch,
  requestAdminSidebarBadgesRefresh,
} from '../../utils/adminSidebarBadges';
import './Moderation.css';
import { getApiBaseUrlSync } from '../../utils/apiConfig';
import { getUiIntlLocale } from '../../utils/uiIntlLocale'

// Используем dev tunnel для API
const API_BASE_URL = getApiBaseUrlSync();

// Моковые данные для модерации пользователей (fallback)
const mockUsersForModeration = [
  {
    id: 1,
    firstName: i18n.t('admin_petr_adef68a1'),
    lastName: i18n.t('admin_petrov_79f47241'),
    middleName: i18n.t('admin_ivanovich_918d27f4'),
    avatar: '/images/external/photo-1506794778202-cad84cf45f1d-7fea972b45.jpg',
    email: 'petr@example.com',
    phone: '+7 (912) 345-67-89',
    passportNumber: '4512 345678',
    citizenship: i18n.t('admin_rossiyskaya_federaciya_2ea17dd2'),
    accountNumber: '40817810099910004312',
    role: 'seller',
    registrationDate: '2024-02-20',
    moderationStatus: 'pending',
    documents: [
      { name: i18n.t('admin_passport'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: '/images/external/d0-ad-d0-bb-d0-b5-d0-ba-d1-82-d1-80-d0-be--8c3f8d7484.jpg' },
      { name: i18n.t('admin_certificate'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: '/images/external/photo-1450101499163-c8848c66ca85-72a0e796aa.jpg' }
    ],
    photos: [
      '/images/external/photo-1507003211169-0a1dd7228f2d-94d7ce3808.jpg'
    ]
  },
  {
    id: 2,
    firstName: i18n.t('admin_mariya_a2f6bcdf'),
    lastName: i18n.t('admin_ivanova_bcac614f'),
    middleName: i18n.t('admin_sergeevna_18aca7ba'),
    avatar: '/images/external/photo-1525134479668-1bee5c7c6845-966b578ed7.jpg',
    email: 'maria@example.com',
    phone: '+7 (923) 456-78-90',
    passportNumber: '4513 456789',
    citizenship: i18n.t('admin_rossiyskaya_federaciya_2ea17dd2'),
    accountNumber: '40817810099910004313',
    role: 'buyer',
    registrationDate: '2024-05-12',
    moderationStatus: 'pending',
    documents: [
      { name: i18n.t('admin_passport'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: '/images/external/d0-ad-d0-bb-d0-b5-d0-ba-d1-82-d1-80-d0-be--8c3f8d7484.jpg' }
    ],
    photos: [
      '/images/external/photo-1494790108377-be9c29b29330-e7e855964a.jpg'
    ]
  },
  {
    id: 3,
    firstName: i18n.t('admin_sergey_384224dc'),
    lastName: i18n.t('admin_volkov_a4109e4b'),
    middleName: i18n.t('admin_aleksandrovich_647463e4'),
    avatar: '/images/external/photo-1472099645785-5658abf4ff4e-066a8445b1.jpg',
    email: 'sergey@example.com',
    phone: '+7 (934) 567-89-01',
    passportNumber: '4514 567890',
    citizenship: i18n.t('admin_rossiyskaya_federaciya_2ea17dd2'),
    accountNumber: '40817810099910004314',
    role: 'seller',
    registrationDate: '2024-08-30',
    moderationStatus: 'pending',
    documents: [
      { name: i18n.t('admin_passport'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: '/images/external/d0-ad-d0-bb-d0-b5-d0-ba-d1-82-d1-80-d0-be--8c3f8d7484.jpg' },
      { name: i18n.t('admin_certificate'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: '/images/external/photo-1450101499163-c8848c66ca85-72a0e796aa.jpg' },
      { name: i18n.t('admin_licenziya_7f1ef7b9'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: '/images/external/photo-1454165804606-c3d57bc86b40-3152e46306.jpg' }
    ],
    photos: [
      '/images/external/photo-1472099645785-5658abf4ff4e-066a8445b1.jpg'
    ]
  }
];

// Моковые данные для модерации недвижимости
const mockPropertiesForModeration = [
  {
    id: 1,
    title: i18n.t('admin_kvartira_v_centre_goroda_dfb57230'),
    type: 'apartment',
    price: 8500000,
    location: 'Costa Adeje, Tenerife',
    ownerName: i18n.t('admin_petr_petrov_a476c04f'),
    ownerEmail: 'petr@example.com',
    submittedDate: '2024-12-10',
    moderationStatus: 'pending',
    images: 5,
    description: i18n.t('admin_prekrasnaya_kvartira_s_vidom_245b8df9'),
    imageUrls: [
      '/images/external/photo-1560448204-e02f11c3d0e2-ef4b1c9172.jpg',
      '/images/external/photo-1505691938895-1758d7feb511-295137cd90.jpg',
      '/images/external/photo-1484154218962-a197022b5858-fad0412faf.jpg',
      '/images/external/photo-1564013799919-ab600027ffc6-6867e26b04.jpg',
      '/images/external/photo-1522771739844-6a9f6d5f14af-c11365faed.jpg'
    ],
    documents: [
      { name: i18n.t('admin_titleDeed'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: i18n.t('admin_cadastralPassport'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: i18n.t('admin_technicalPassport'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: i18n.t('admin_btiCertificate'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' }
    ]
  },
  {
    id: 2,
    title: i18n.t('admin_villa_na_beregu_morya_51261bee'),
    type: 'villa',
    price: 25000000,
    location: 'Playa de las Américas, Tenerife',
    ownerName: i18n.t('admin_anna_sidorova_5bf0731f'),
    ownerEmail: 'anna@example.com',
    submittedDate: '2024-12-12',
    moderationStatus: 'pending',
    images: 8,
    description: i18n.t('admin_roskoshnaya_villa_s_basseynom_39224fb1'),
    imageUrls: [
      '/images/external/photo-1600596542815-ffad4c1539a9-ee898bce64.jpg',
      '/images/external/photo-1505691938895-1758d7feb511-295137cd90.jpg',
      '/images/external/photo-1560448204-e02f11c3d0e2-ef4b1c9172.jpg',
      '/images/external/photo-1484154218962-a197022b5858-fad0412faf.jpg',
      '/images/external/photo-1564013799919-ab600027ffc6-6867e26b04.jpg',
      '/images/external/photo-1522771739844-6a9f6d5f14af-c11365faed.jpg',
      '/images/external/photo-1600585154340-be6161a56a0c-e705a536f2.jpg',
      '/images/external/photo-1600607687939-ce8a6c25118c-7aaf4b83d3.jpg'
    ],
    documents: [
      { name: i18n.t('admin_titleDeed'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: i18n.t('admin_cadastralPassport'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: i18n.t('admin_technicalPassport'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: i18n.t('admin_btiCertificate'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: i18n.t('admin_dogovor_kupli_prodazhi_f717039d'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' }
    ]
  },
  {
    id: 3,
    title: i18n.t('admin_dom_v_tihom_rayone_b0dc1907'),
    type: 'house',
    price: 12000000,
    location: 'Los Cristianos, Tenerife',
    ownerName: i18n.t('admin_sergey_volkov_b91a0ba2'),
    ownerEmail: 'sergey@example.com',
    submittedDate: '2024-12-14',
    moderationStatus: 'pending',
    images: 6,
    description: i18n.t('admin_uyutnyy_dom_dlya_semi_2f5b4472'),
    imageUrls: [
      '/images/external/photo-1522708323590-d24dbb6b0267-55446ced7e.jpg',
      '/images/external/photo-1600585154340-be6161a56a0c-e705a536f2.jpg',
      '/images/external/photo-1600607687939-ce8a6c25118c-7aaf4b83d3.jpg',
      '/images/external/photo-1600607687939-ce8a6c25118c-7aaf4b83d3.jpg',
      '/images/external/photo-1600566753190-17f0baa2a6c3-6def29adbc.jpg',
      '/images/external/photo-1600585154526-990dced4db0d-06b654a393.jpg'
    ],
    documents: [
      { name: i18n.t('admin_titleDeed'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: i18n.t('admin_cadastralPassport'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: i18n.t('admin_technicalPassport'), type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' }
    ]
  }
];

const Moderation = ({ onAdminSectionBadgeRefresh }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [pendingProperties, setPendingProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentlyApprovedIds, setRecentlyApprovedIds] = useState(new Set()); // ID недавно одобренных объектов
  const [requestTypeFilter, setRequestTypeFilter] = useState('all'); // 'all', 'publication', 'edit', 'delete'

  const syncModerationBadges = (docs, props) => {
    requestAdminSidebarBadgesRefresh({ patch: buildModerationBadgesPatch(docs, props) });
    void onAdminSectionBadgeRefresh?.();
  };

  // Загрузка документов на верификацию
  useEffect(() => {
    if (activeTab === 'users') {
      loadPendingDocuments();
    } else if (activeTab === 'properties') {
      loadPendingProperties();
    }
  }, [activeTab]);

  // Автообновление каждые 3 минуты (180000 мс)
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'users') {
        loadPendingDocuments();
      } else if (activeTab === 'properties') {
        loadPendingProperties();
      }
    }, 180000); // 3 минуты = 180000 миллисекунд
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadPendingDocuments = async () => {
    setLoading(true);
    try {
      console.log('🔄 Загрузка документов на верификацию из:', `${API_BASE_URL}/documents/pending`);
      const response = await fetch(`${API_BASE_URL}/documents/pending`);
      
      let usersList = [];
      
      let apiLoadedSuccessfully = false;
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Получены данные от API:', data);
        
        if (data.success && data.data) {
          apiLoadedSuccessfully = true;
          console.log('✅ Найдено документов:', data.data.length);
          
          // Группируем документы по пользователям
          const groupedByUser = {};
          data.data.forEach(doc => {
            console.log('📄 Обработка документа:', doc);
            
            if (!groupedByUser[doc.user_id]) {
              groupedByUser[doc.user_id] = {
                id: doc.user_id,
                firstName: doc.first_name || t('admin_notSpecified'),
                lastName: doc.last_name || '',
                email: doc.email || t('admin_notSpecified'),
                phone: doc.phone_number || t('admin_notSpecified'),
                role: doc.role || 'buyer', // Используем роль из документа (берется из БД через JOIN)
                documents: []
              };
              console.log('📋 Создан пользователь для модерации:', {
                id: doc.user_id,
                name: `${doc.first_name} ${doc.last_name}`,
                role: doc.role || 'buyer',
                email: doc.email
              });
            }
            groupedByUser[doc.user_id].documents.push({
              id: doc.id,
              document_type: doc.document_type,
              document_photo: doc.document_photo,
              verification_status: doc.verification_status || 'pending',
              created_at: doc.created_at
            });
          });
          
          usersList = Object.values(groupedByUser);
          // Сортируем по дате создания (новые сверху)
          usersList.sort((a, b) => {
            const dateA = a.documents && a.documents.length > 0 
              ? new Date(a.documents[0].created_at || 0).getTime() 
              : 0;
            const dateB = b.documents && b.documents.length > 0 
              ? new Date(b.documents[0].created_at || 0).getTime() 
              : 0;
            return dateB - dateA; // {t('admin_novye_sverhu_e99bb83e')}
          });
          console.log('👥 Сгруппировано пользователей:', usersList.length);
          console.log('👥 Список пользователей:', usersList);
        } else {
          console.log('⚠️ Нет данных в ответе API');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Ошибка загрузки документов: ответ не успешный', response.status, errorText);
      }
      
      // Загружаем fallback из localStorage только если API недоступен/пустой.
      // Иначе появляются дубли вида "local_user_*" + реальный пользователь из БД.
      if (!apiLoadedSuccessfully || usersList.length === 0) {
        const localStorageVerifications = JSON.parse(localStorage.getItem('pendingVerifications') || '[]');
        const reversedVerifications = [...localStorageVerifications].reverse();
        reversedVerifications.forEach((verification, index) => {
          const originalIndex = localStorageVerifications.length - 1 - index;
          const userId = verification.userId;
          const userLocalId = `local_user_${originalIndex}`;
          const existingUser = usersList.find(u => u.id === userId || u.id === userLocalId);
          
          if (existingUser) {
            if (verification.passportPhoto) {
              existingUser.documents.push({
                id: `local_passport_${originalIndex}`,
                document_type: 'passport',
                document_photo: verification.passportPhoto,
                verification_status: 'pending',
                created_at: verification.submittedAt
              });
            }
            if (verification.selfiePhoto) {
              existingUser.documents.push({
                id: `local_selfie_${originalIndex}`,
                document_type: 'selfie',
                document_photo: verification.selfiePhoto,
                verification_status: 'pending',
                created_at: verification.submittedAt
              });
            }
            if (verification.selfieWithPassportPhoto) {
              existingUser.documents.push({
                id: `local_selfie_passport_${originalIndex}`,
                document_type: 'passport_with_face',
                document_photo: verification.selfieWithPassportPhoto,
                verification_status: 'pending',
                created_at: verification.submittedAt
              });
            }
            if (verification.cardInfo) {
              existingUser.cardInfo = verification.cardInfo;
            }
          } else {
            const newUser = {
              id: userLocalId,
              firstName: t('admin_notSpecified'),
              lastName: '',
              email: t('admin_notSpecified'),
              phone: t('admin_notSpecified'),
              role: 'seller',
              documents: [
                ...(verification.passportPhoto ? [{
                  id: `local_passport_${originalIndex}`,
                  document_type: 'passport',
                  document_photo: verification.passportPhoto,
                  verification_status: 'pending',
                  created_at: verification.submittedAt
                }] : []),
                ...(verification.selfiePhoto ? [{
                  id: `local_selfie_${originalIndex}`,
                  document_type: 'selfie',
                  document_photo: verification.selfiePhoto,
                  verification_status: 'pending',
                  created_at: verification.submittedAt
                }] : []),
                ...(verification.selfieWithPassportPhoto ? [{
                  id: `local_selfie_passport_${originalIndex}`,
                  document_type: 'passport_with_face',
                  document_photo: verification.selfieWithPassportPhoto,
                  verification_status: 'pending',
                  created_at: verification.submittedAt
                }] : [])
              ]
            };
            if (verification.cardInfo) {
              newUser.cardInfo = verification.cardInfo;
            }
            usersList.push(newUser);
          }
        });
      }
      
      // Фильтруем пользователей - оставляем только тех, у кого есть pending документы
      const usersWithPendingDocs = usersList.filter(user => {
        if (!user.documents || user.documents.length === 0) {
          return false;
        }
        // Проверяем, есть ли хотя бы один документ со статусом 'pending'
        return user.documents.some(doc => doc.verification_status === 'pending');
      });
      
      setPendingDocuments(usersWithPendingDocs);
      syncModerationBadges(usersWithPendingDocs, pendingProperties);
    } catch (error) {
      console.error('❌ Ошибка загрузки документов:', error);
      setPendingDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (activeTab !== 'users') return [];
    // Используем только реальные данные из API, без моковых
    const filtered = pendingDocuments.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      return (
        fullName.includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
    // Сортируем по дате создания (новые сверху)
    return filtered.sort((a, b) => {
      const dateA = a.documents && a.documents.length > 0 
        ? new Date(a.documents[0].created_at || 0).getTime() 
        : 0;
      const dateB = b.documents && b.documents.length > 0 
        ? new Date(b.documents[0].created_at || 0).getTime() 
        : 0;
      return dateB - dateA; // {t('admin_novye_sverhu_e99bb83e')}
    });
  }, [activeTab, searchQuery, pendingDocuments]);

  const loadPendingProperties = async () => {
    setLoading(true);
    try {
      let propertiesList = [];
      
      // Загружаем данные из API
      console.log('📥 Загрузка объявлений на модерации из API...');
      const response = await fetch(`${API_BASE_URL}/properties/pending`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Ответ API:', data);
        if (data.success && data.data) {
          // Фильтруем только объекты со статусом pending (на случай, если бэкенд вернет одобренные)
          // Также исключаем недавно одобренные объекты (даже если бэкенд их еще вернул)
          propertiesList = data.data.filter(property => {
            const propertyId = String(property.id);
            // Исключаем недавно одобренные объекты
            if (recentlyApprovedIds.has(propertyId)) {
              console.log(`🚫 Исключаем недавно одобренный объект ID: ${propertyId}`);
              return false;
            }
            const status = property.moderation_status || property.moderationStatus;
            return status === 'pending' || status === null || status === undefined;
          });
          console.log(`✅ Загружено объявлений из API: ${data.data.length}, после фильтрации pending: ${propertiesList.length}`);
          // Логируем типы объектов для отладки
          const typesCount = {};
          propertiesList.forEach(p => {
            const type = p.property_type || p.propertyType || 'unknown';
            typesCount[type] = (typesCount[type] || 0) + 1;
          });
          console.log('📊 Типы объектов на модерации:', typesCount);
        } else {
          console.warn('⚠️ API вернул success: false или нет data');
        }
      } else {
        const errorText = await response.text().catch(() => t('admin_unknownError'));
        console.error('❌ Ошибка загрузки объявлений на модерации:', response.status, errorText);
      }
      
      // Загружаем данные из localStorage (обратный порядок - новые сверху)
      const localStorageProperties = JSON.parse(localStorage.getItem('pendingProperties') || '[]');
      // Переворачиваем массив чтобы новые были сверху
      const reversedProperties = [...localStorageProperties].reverse();
      reversedProperties.forEach((property, index) => {
        // Сохраняем оригинальный индекс для правильного удаления
        const originalIndex = localStorageProperties.length - 1 - index;
        propertiesList.push({
          id: `local_${originalIndex}`,
          title: property.title,
          property_type: property.propertyType,
          price: property.price,
          currency: property.currency,
          location: property.location || property.address || '',
          first_name: property.userProfileData?.first_name || t('admin_notSpecified'),
          last_name: property.userProfileData?.last_name || '',
          email: property.userProfileData?.email || t('admin_notSpecified'),
          created_at: property.submittedAt,
          photos: property.photos || [],
          description: property.description,
          area: property.area,
          rooms: property.rooms,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          floor: property.floor,
          total_floors: property.totalFloors,
          year_built: property.yearBuilt,
          address: property.address,
          apartment: property.apartment,
          country: property.country,
          city: property.city,
          coordinates: property.coordinates,
          balcony: property.balcony,
          parking: property.parking,
          elevator: property.elevator,
          land_area: property.landArea,
          garage: property.garage,
          pool: property.pool,
          garden: property.garden,
          commercial_type: property.commercialType,
          business_hours: property.businessHours,
          renovation: property.renovation,
          condition: property.condition,
          heating: property.heating,
          water_supply: property.waterSupply,
          sewerage: property.sewerage,
          electricity: property.electricity,
          internet: property.internet,
          security: property.security,
          furniture: property.furniture,
          feature1: property.feature1,
          feature2: property.feature2,
          feature3: property.feature3,
          feature4: property.feature4,
          feature5: property.feature5,
          feature6: property.feature6,
          feature7: property.feature7,
          feature8: property.feature8,
          feature9: property.feature9,
          feature10: property.feature10,
          feature11: property.feature11,
          feature12: property.feature12,
          videos: property.videos || [],
          additional_documents: property.additionalDocuments || [],
          ownership_document: property.ownershipDocument,
          no_debts_document: property.noDebtsDocument,
          ownership_document_name: property.ownershipDocumentName,
          no_debts_document_name: property.noDebtsDocumentName,
          phone_number: property.userProfileData?.phone_number || null,
          is_auction: property.isAuction,
          test_drive: property.testDrive,
          auction_start_date: property.auctionStartDate,
          auction_end_date: property.auctionEndDate,
          auction_starting_price: property.auctionStartingPrice,
          isLocalStorage: true // Флаг для идентификации данных из localStorage
        });
      });
      
      // Сортируем по дате создания (новые сверху)
      propertiesList.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA; // {t('admin_novye_sverhu_e99bb83e')}
      });
      
      console.log(`📊 Итого объявлений для отображения: ${propertiesList.length}`);
      setPendingProperties(propertiesList);
      syncModerationBadges(pendingDocuments, propertiesList);
    } catch (error) {
      console.error('Ошибка загрузки объявлений на модерации:', error);
      setPendingProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Функция для определения типа запроса
  const getRequestType = (property) => {
    // Проверяем rejection_reason для определения типа запроса
    if (property.rejection_reason) {
      if (property.rejection_reason.startsWith('EDIT:')) {
        return 'edit';
      }
      if (property.rejection_reason.startsWith('DELETE:')) {
        return 'delete';
      }
    }
    // Если rejection_reason пустой или null, это публикация
    return 'publication';
  };

  const filteredProperties = useMemo(() => {
    if (activeTab !== 'properties') return [];
    const filtered = pendingProperties.filter(property => {
      // Фильтрация по типу запроса
      if (requestTypeFilter !== 'all') {
        const requestType = getRequestType(property);
        if (requestType !== requestTypeFilter) {
          return false;
        }
      }
      
      // Фильтрация по поисковому запросу
      const ownerName = `${property.first_name || ''} ${property.last_name || ''}`.toLowerCase();
      return (
        (property.title && property.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (property.location && property.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ownerName.includes(searchQuery.toLowerCase()) ||
        (property.email && property.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
    // Сортируем по дате создания (новые сверху)
    return filtered.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // {t('admin_novye_sverhu_e99bb83e')}
    });
  }, [activeTab, searchQuery, pendingProperties, requestTypeFilter]);

  const handleApprove = async (type, id, debtSeverity = null, propertyTypeOverride = null, privateClubOnly = false) => {
    try {
      // Проверяем, является ли это элементом из localStorage
      if (typeof id === 'string' && id.startsWith('local_')) {
        // Это элемент из localStorage - удаляем его и создаем уведомление
        if (type === 'properties') {
          const localStorageProperties = JSON.parse(localStorage.getItem('pendingProperties') || '[]');
          const index = parseInt(id.replace('local_', ''));
          if (index >= 0 && index < localStorageProperties.length) {
            const property = localStorageProperties[index];
            const propertyTitle = property.title || t('admin_obekt_nedvizhimosti_6e3a5810');
            const propertyUserId = property.userId;
            
            // Пытаемся найти числовой ID пользователя в БД
            let dbUserId = propertyUserId;
            
            // Если userId - это строка (Clerk ID), пытаемся найти пользователя по email
            if (propertyUserId && isNaN(parseInt(propertyUserId)) && property.userProfileData?.email) {
              const emailResponse = await fetch(`${API_BASE_URL}/users/email/${encodeURIComponent(property.userProfileData.email.toLowerCase())}`);
              if (emailResponse.ok) {
                const emailData = await emailResponse.json();
                if (emailData.success && emailData.data) {
                  dbUserId = emailData.data.id;
                }
              }
            }
            
            // Если нашли числовой ID, сохраняем объявление в БД
            if (dbUserId && !isNaN(parseInt(dbUserId))) {
              try {
                // Подготавливаем данные для сохранения в БД
                const propertyData = {
                  user_id: parseInt(dbUserId),
                  property_type: property.propertyType || property.property_type || 'house',
                  title: property.title || '',
                  description: property.description || '',
                  price: property.price && Number(property.price) > 0 ? property.price : null,
                  currency: property.currency || 'USD',
                  is_auction: property.isAuction ? 1 : 0,
                  auction_start_date: property.auctionStartDate || null,
                  auction_end_date: property.auctionEndDate || null,
                  auction_starting_price: property.auctionStartingPrice || null,
                  area: property.area || null,
                  rooms: property.rooms || null,
                  bedrooms: property.bedrooms || null,
                  bathrooms: property.bathrooms || null,
                  floor: property.floor || null,
                  total_floors: property.totalFloors || null,
                  year_built: property.yearBuilt || null,
                  location: property.location || property.address || '',
                  address: property.address || '',
                  apartment: property.apartment || '',
                  country: property.country || '',
                  city: property.city || '',
                  coordinates: property.coordinates ? JSON.stringify(property.coordinates) : null,
                  balcony: property.balcony ? 1 : 0,
                  parking: property.parking ? 1 : 0,
                  elevator: property.elevator ? 1 : 0,
                  land_area: property.landArea || null,
                  garage: property.garage ? 1 : 0,
                  pool: property.pool ? 1 : 0,
                  garden: property.garden ? 1 : 0,
                  commercial_type: property.commercialType || null,
                  business_hours: property.businessHours || null,
                  renovation: property.renovation || null,
                  condition: property.condition || null,
                  heating: property.heating || null,
                  water_supply: property.waterSupply || null,
                  sewerage: property.sewerage || null,
                  electricity: property.electricity ? 1 : 0,
                  internet: property.internet ? 1 : 0,
                  security: property.security ? 1 : 0,
                  furniture: property.furniture ? 1 : 0,
                  feature1: property.feature1 ? 1 : 0,
                  feature2: property.feature2 ? 1 : 0,
                  feature3: property.feature3 ? 1 : 0,
                  feature4: property.feature4 ? 1 : 0,
                  feature5: property.feature5 ? 1 : 0,
                  feature6: property.feature6 ? 1 : 0,
                  feature7: property.feature7 ? 1 : 0,
                  feature8: property.feature8 ? 1 : 0,
                  feature9: property.feature9 ? 1 : 0,
                  feature10: property.feature10 ? 1 : 0,
                  feature11: property.feature11 ? 1 : 0,
                  feature12: property.feature12 ? 1 : 0,
                  photos: property.photos ? JSON.stringify(property.photos) : null,
                  videos: property.videos ? JSON.stringify(property.videos) : null,
                  additional_documents: property.additionalDocuments ? JSON.stringify(property.additionalDocuments) : null,
                  ownership_document: property.ownershipDocument || null,
                  no_debts_document: property.noDebtsDocument || null,
                  ownership_document_name: property.ownershipDocumentName || null,
                  no_debts_document_name: property.noDebtsDocumentName || null,
                  test_drive: property.testDrive ? 1 : 0,
                  moderation_status: 'approved', // Сразу одобряем
                  // Статус критичности для объектов с долгами
                  debt_severity: property.sale_type === 'debt' || property.is_debt || property.has_debt
                    ? (property.debt_severity || null)
                    : null
                };

                // Создаем объявление в БД
                const createResponse = await fetch(`${API_BASE_URL}/properties`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(propertyData)
                });

                if (createResponse.ok) {
                  const createData = await createResponse.json();
                  if (createData.success) {
                    console.log('✅ Объявление сохранено в БД:', createData.data?.id);
                    
                    // Создаем уведомление для пользователя
                    try {
                      const notificationResponse = await fetch(`${API_BASE_URL}/notifications`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          user_id: parseInt(dbUserId),
                          type: 'property_approved',
                          title: t('admin_vash_obekt_proshel_verifikaciyu_f8c6ee3f'),
                          message: t('admin_vash_obekt_title_proshel_verifikaciyu_opublikovan', { title: propertyTitle }),
                          data: JSON.stringify({ property_id: createData.data?.id, property_title: propertyTitle })
                        })
                      });
                      
                      if (notificationResponse.ok) {
                        console.log('✅ Уведомление создано для пользователя:', dbUserId);
                      } else {
                        console.warn('⚠️ Не удалось создать уведомление:', await notificationResponse.text());
                      }
                    } catch (notifError) {
                      console.error('❌ Ошибка при создании уведомления:', notifError);
                    }
                  } else {
                    console.warn('⚠️ Не удалось сохранить объявление в БД:', createData.error);
                  }
                } else {
                  const errorText = await createResponse.text();
                  console.warn('⚠️ Ошибка при сохранении объявления в БД:', errorText);
                }
              } catch (saveError) {
                console.error('❌ Ошибка при сохранении объявления в БД:', saveError);
              }
            } else {
              console.warn('⚠️ Не удалось определить ID пользователя для сохранения объявления');
            }
            
            // Удаляем объект из localStorage
            localStorageProperties.splice(index, 1);
            localStorage.setItem('pendingProperties', JSON.stringify(localStorageProperties));
            showNotification(t('admin_obyavlenie_odobreno_i_udaleno_d5f899c5'));
            loadPendingProperties();
            setSelectedProperty(null);
          }
        } else {
          // Для пользователей из localStorage
          const localStorageVerifications = JSON.parse(localStorage.getItem('pendingVerifications') || '[]');
          // ID может быть local_user_${index} или просто userId из API
          let index = -1;
          if (id.startsWith('local_user_')) {
            index = parseInt(id.replace('local_user_', ''));
          } else if (id.startsWith('local_')) {
            // Старый формат - просто индекс
            index = parseInt(id.replace('local_', ''));
          } else {
            // Ищем по userId (если это реальный ID пользователя из API)
            index = localStorageVerifications.findIndex(v => (v.userId || '').toString() === id.toString());
          }
          if (index >= 0 && index < localStorageVerifications.length) {
            localStorageVerifications.splice(index, 1);
            localStorage.setItem('pendingVerifications', JSON.stringify(localStorageVerifications));
            showNotification(t('admin_polzovatel_odobren_i_udalen_f288f420'));
            loadPendingDocuments();
            setSelectedUser(null);
          } else {
            console.warn('Не удалось найти пользователя в localStorage с ID:', id);
            showNotification(t('admin_polzovatel_ne_nayden_v_d4b9ca2f'));
            loadPendingDocuments();
            setSelectedUser(null);
          }
        }
        return;
      }
      
      const adminId = localStorage.getItem('userId') || 'admin';
      
      if (type === 'properties') {
        // Одобрение недвижимости
        // Находим объект для логирования его типа
        const propertyToApprove = pendingProperties.find(p => p.id === id || String(p.id) === String(id));
        if (propertyToApprove) {
          console.log('🏠 Одобряем объект:', {
            id: id,
            title: propertyToApprove.title,
            property_type: propertyToApprove.property_type || propertyToApprove.propertyType,
            price: propertyToApprove.price,
            auction_starting_price: propertyToApprove.auction_starting_price
          });
        }
        
        // ВАЖНО: Отправляем property_type для правильного определения таблицы
        // При совпадениях ID между таблицами (apartments/houses) нельзя полагаться на поиск по списку.
        // Если тип передан сверху (из выбранной карточки) — используем его.
        const propertyType =
          propertyTypeOverride ||
          propertyToApprove?.property_type ||
          propertyToApprove?.propertyType;
        const response = await fetch(`${API_BASE_URL}/properties/${id}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewed_by: adminId,
            moderation_status: 'approved', // Явно указываем статус одобрения
            property_type: propertyType, // Отправляем тип для правильного определения таблицы
            debt_severity: debtSeverity || null,
            private_club_only: privateClubOnly ? 1 : 0,
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📥 Ответ от API при одобрении:', data);
          console.log('📋 Полный ответ:', JSON.stringify(data, null, 2));
          
          if (data.success) {
            // Удаляем данные недвижимости из localStorage, если они там есть
            try {
              const localStorageProperties = JSON.parse(localStorage.getItem('pendingProperties') || '[]');
              // Ищем по ID пользователя, так как в localStorage хранится userId
              const property = localStorageProperties.find(p => {
                // Проверяем, есть ли в БД недвижимость с таким ID
                return false; // Если это реальный ID из БД, то в localStorage его не будет
              });
              // Если это был элемент из localStorage, он уже удален в блоке выше
              // Здесь просто обновляем список
              console.log('✅ Объявление одобрено через API');
            } catch (e) {
              console.warn('⚠️ Не удалось проверить localStorage:', e);
            }
            
            // Проверяем, действительно ли объект был обновлен
            // Если в ответе есть данные об объекте, проверяем его статус
            if (data.data && data.data.moderation_status) {
              console.log('📊 Статус объекта после одобрения:', data.data.moderation_status);
              if (data.data.moderation_status !== 'approved') {
                console.warn('⚠️ ВНИМАНИЕ: Объект одобрен, но статус не обновлен на approved!', data.data);
                showNotification(t('admin_obyavlenie_odobreno_no_status_7089cc74'));
              } else {
                console.log('✅ Статус объекта успешно обновлен на approved');
              }
            } else {
              console.warn('⚠️ API не вернул данные об объекте в ответе. Проверяем статус через отдельный запрос...');
              // Если API не вернул данные, делаем дополнительную проверку через отдельный запрос
              setTimeout(async () => {
                try {
                  const checkResponse = await fetch(`${API_BASE_URL}/properties/${id}`);
                  if (checkResponse.ok) {
                    const checkData = await checkResponse.json();
                    if (checkData.success && checkData.data) {
                      console.log('📊 Проверка статуса объекта:', checkData.data.moderation_status);
                      if (checkData.data.moderation_status !== 'approved') {
                        console.error('❌ Статус объекта не обновлен после одобрения!', checkData.data);
                      }
                    }
                  }
                } catch (checkError) {
                  console.error('❌ Ошибка при проверке статуса объекта:', checkError);
                }
              }, 2000);
            }
            
            // Добавляем ID в список недавно одобренных
            const approvedId = String(id);
            setRecentlyApprovedIds(prev => new Set([...prev, approvedId]));
            console.log(`✅ Добавлен ID ${approvedId} в список недавно одобренных`);
            
            // Удаляем из списка недавно одобренных через 5 минут (на случай, если объект снова появится)
            setTimeout(() => {
              setRecentlyApprovedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(approvedId);
                return newSet;
              });
            }, 5 * 60 * 1000); // 5 минут
            
            showNotification(data.translated === false
              ? t('admin_obyavlenie_opublikovano_perevod_ne_8d9e62ea')
              : t('admin_obyavlenie_perevedeno_na_vse_fb7844d6'));
            // Закрываем детальный вид
            setSelectedProperty(null);
            
            // Удаляем объект из локального списка сразу, чтобы он не показывался
            setPendingProperties((prev) => {
              const next = prev.filter((p) => String(p.id) !== String(id));
              syncModerationBadges(pendingDocuments, next);
              return next;
            });
            
            // Обновляем список после задержки, чтобы дать серверу время обновить статус
            // Увеличиваем задержку, так как бэкенд может обрабатывать запрос асинхронно
            setTimeout(() => {
              console.log('🔄 Принудительное обновление списка после одобрения...');
              loadPendingProperties();
            }, 1500);
          } else {
            console.error('❌ API вернул success: false:', data);
            showNotification(data.error || data.message || t('admin_oshibka_pri_odobrenii_obyavleniya_66b18919'));
          }
        } else {
          const errorText = await response.text().catch(() => t('admin_unknownError'));
          console.error('❌ Ошибка HTTP при одобрении:', response.status, errorText);
          let errorMessage = t('admin_oshibka_pri_odobrenii_obyavleniya_fffaa654');
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch (e) {
            errorMessage = errorText || errorMessage;
          }
          showNotification(errorMessage);
        }
      } else {
        // Одобрение пользователя
        const response = await fetch(`${API_BASE_URL}/users/${id}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewed_by: adminId
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Удаляем данные пользователя из localStorage, если они там есть
            try {
              const localStorageVerifications = JSON.parse(localStorage.getItem('pendingVerifications') || '[]');
              const filteredVerifications = localStorageVerifications.filter(v => {
                // Удаляем если userId совпадает с одобренным ID
                return String(v.userId) !== String(id);
              });
              localStorage.setItem('pendingVerifications', JSON.stringify(filteredVerifications));
              console.log('✅ Удалены данные пользователя из localStorage');
            } catch (e) {
              console.warn('⚠️ Не удалось очистить localStorage:', e);
            }
            
            showNotification(t('admin_polzovatel_odobren_i_verificirovan_16588358'));
            loadPendingDocuments();
            setSelectedUser(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          showNotification(errorData.error || t('admin_oshibka_pri_odobrenii_polzovatelya_69a04bbe'));
        }
      }
    } catch (error) {
      console.error('Ошибка при одобрении:', error);
      showNotification(t('admin_oshibka_pri_odobrenii_06d6fdf9'));
    }
  };

  const handleReject = async (type, id, rejectionReason) => {
    try {
      // Проверяем, является ли это элементом из localStorage
      if (typeof id === 'string' && id.startsWith('local_')) {
        // Это элемент из localStorage - просто удаляем его
        if (type === 'properties') {
          const localStorageProperties = JSON.parse(localStorage.getItem('pendingProperties') || '[]');
          const index = parseInt(id.replace('local_', ''));
          // Удаляем элемент (учитываем что массив перевернут)
          const reversedIndex = localStorageProperties.length - 1 - index;
          if (reversedIndex >= 0 && reversedIndex < localStorageProperties.length) {
            localStorageProperties.splice(reversedIndex, 1);
            localStorage.setItem('pendingProperties', JSON.stringify(localStorageProperties));
            showNotification(t('admin_obyavlenie_otkloneno_i_udaleno_1e2f68aa'));
            loadPendingProperties();
            setSelectedProperty(null);
          }
        } else {
          // Для пользователей из localStorage
          const localStorageVerifications = JSON.parse(localStorage.getItem('pendingVerifications') || '[]');
          const index = parseInt(id.replace('local_', ''));
          // Удаляем элемент (учитываем что массив перевернут)
          const reversedIndex = localStorageVerifications.length - 1 - index;
          if (reversedIndex >= 0 && reversedIndex < localStorageVerifications.length) {
            localStorageVerifications.splice(reversedIndex, 1);
            localStorage.setItem('pendingVerifications', JSON.stringify(localStorageVerifications));
            showNotification(t('admin_polzovatel_otklonen_i_udalen_83aade44'));
            loadPendingDocuments();
            setSelectedUser(null);
          }
        }
        return;
      }
      
      const adminId = localStorage.getItem('userId') || 'admin';
      
      if (type === 'properties') {
        // Отклонение недвижимости
        const response = await fetch(`${API_BASE_URL}/properties/${id}/reject`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewed_by: adminId,
            rejection_reason: rejectionReason
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            showNotification(t('admin_obyavlenie_otkloneno_vladelcu_otprav_2d1fd0c4'));
            loadPendingProperties();
            setSelectedProperty(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          showNotification(errorData.error || t('admin_oshibka_pri_otklonenii_obyavleniya_6520742e'));
        }
      } else {
        // Отклонение пользователя
        const response = await fetch(`${API_BASE_URL}/users/${id}/reject`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewed_by: adminId,
            rejection_reason: rejectionReason
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Удаляем данные пользователя из localStorage, если они там есть
            try {
              const localStorageVerifications = JSON.parse(localStorage.getItem('pendingVerifications') || '[]');
              const filteredVerifications = localStorageVerifications.filter(v => {
                return String(v.userId) !== String(id);
              });
              localStorage.setItem('pendingVerifications', JSON.stringify(filteredVerifications));
              console.log('✅ Удалены данные пользователя из localStorage');
            } catch (e) {
              console.warn('⚠️ Не удалось очистить localStorage:', e);
            }
            
            showNotification(t('admin_polzovatel_otklonen_emu_otpravleno_1f6954ae'));
            loadPendingDocuments();
            setSelectedUser(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          showNotification(errorData.error || t('admin_oshibka_pri_otklonenii_polzovatelya_68a7d7e6'));
        }
      }
    } catch (error) {
      console.error('Ошибка при отклонении:', error);
      showNotification(t('admin_oshibka_pri_otklonenii_e7e63a7e'));
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      apartment: t('admin_apartment'),
      villa: t('admin_villa'),
      house: t('admin_house')
    };
    return types[type] || type;
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'apartment':
        return <FiHome size={32} />;
      case 'villa':
        return <FaBuilding size={32} />;
      case 'house':
        return <FaBuilding size={32} />;
      default:
        return <FiHome size={32} />;
    }
  };

  const clearLocalStorage = () => {
    if (window.confirm(t('admin_vy_uvereny_chto_hotite_c0d75300'))) {
      localStorage.removeItem('pendingVerifications');
      localStorage.removeItem('pendingProperties');
      showNotification(t('admin_localtorage_ochischen_spisok_modera_a8f4a18f'));
      if (activeTab === 'users') {
        loadPendingDocuments();
      } else {
        loadPendingProperties();
      }
    }
  };

  if (selectedUser) {
    return (
      <ModerationUserDetail
        user={selectedUser}
        onBack={() => setSelectedUser(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onRefresh={loadPendingDocuments}
      />
    );
  }

  if (selectedProperty) {
    return (
      <ModerationPropertyDetail
        property={selectedProperty}
        onBack={() => setSelectedProperty(null)}
        onApprove={(id, severity, privateClubOnly) =>
          handleApprove(
            'properties',
            id,
            severity,
            selectedProperty?.property_type || selectedProperty?.propertyType || null,
            Boolean(privateClubOnly)
          )
        }
        onReject={(reason) => handleReject('properties', selectedProperty.id, reason)}
      />
    );
  }

  return (
    <div className="moderation-container">
      <div className="moderation-tabs" data-active={activeTab}>
        <button
          className={`moderation-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('users');
            setSearchQuery('');
          }}
        >
          <FiUser size={18} />
          {t('admin_polzovateli_0f0b8f55')}
        </button>
        <button
          className={`moderation-tab ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('properties');
            setSearchQuery('');
            setRequestTypeFilter('all');
          }}
        >
          <FiHome size={18} />
          {t('admin_nedvizhimost_e65aac89')}
        </button>
      </div>

      <div className="moderation-search">
        <FiSearch className="search-icon" size={20} />
        <input
          type="text"
          placeholder={
            activeTab === 'users'
              ? t('admin_poisk_po_imeni_familii_d74bf0de')
              : t('admin_poisk_po_nazvaniyu_lokacii_e58588bb')
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="moderation-search-input"
        />
        {searchQuery && (
          <button
            className="clear-search"
            onClick={() => setSearchQuery('')}
            aria-label={t('admin_clearSearch')}
          >
            <FiX size={18} />
          </button>
        )}
      
      </div>

      {activeTab === 'users' && (
        <div className="moderation-content">
          {loading ? (
            <div className="moderation-empty">
              <p>{t('admin_zagruzka_dokumentov_f59e4ff0')}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="moderation-empty">
              <p>{t('admin_net_dokumentov_na_verifikaciyu_63f43fe7')}</p>
            </div>
          ) : (
            <div className="moderation-list">
              {filteredUsers.map(user => (
                <div 
                  key={user.id} 
                  className="moderation-card"
                  onClick={() => setSelectedUser(user)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="moderation-card__avatar">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={`${user.firstName} ${user.lastName}`} 
                        className="moderation-card__avatar-image"
                      />
                    ) : (
                      <span>
                        {user.firstName[0]}{user.lastName[0]}
                      </span>
                    )}
                  </div>

                  <div className="moderation-card__info">
                    <div className="moderation-card__header">
                      <h3>{user.firstName} {user.lastName}</h3>
                    </div>
                    <p className="moderation-card__email">{user.email}</p>

                    <div className="moderation-card__meta">
                      <div className="moderation-meta-item">
                        <span className="moderation-label">{t('admin_rol_86bc8f1a')}</span>
                        <span className={`moderation-value moderation-value--${user.role}`}>
                          {user.role === 'buyer' ? t('admin_buyer') : t('admin_seller')}
                        </span>
                      </div>
                      <div className="moderation-meta-item">
                        <span className="moderation-label">{t('admin_registraciya_fa3af185')}</span>
                        <span className="moderation-value">
                          {user.documents && user.documents.length > 0 && user.documents[0].created_at
                            ? new Date(user.documents[0].created_at).toLocaleDateString(getUiIntlLocale())
                            : t('admin_notSpecified')}
                        </span>
                      </div>
                      <div className="moderation-meta-item">
                        <span className="moderation-label">{t('admin_dokumenty_682414b8')}</span>
                        <span className="moderation-value">
                          {t('admin_n_dokument_ov_na_a2e9bbe0', { n: user.documents ? user.documents.length : 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'properties' && (
        <div className="moderation-content">
          {/* Фильтр по типу запроса */}
          <div className="moderation-filter-buttons">
            <button
              className={`moderation-filter-btn ${requestTypeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setRequestTypeFilter('all')}
            >
              {t('admin_all')}
            </button>
            <button
              className={`moderation-filter-btn ${requestTypeFilter === 'publication' ? 'active' : ''}`}
              onClick={() => setRequestTypeFilter('publication')}
            >
              {t('admin_publikaciya_eb8ec703')}
            </button>
            <button
              className={`moderation-filter-btn ${requestTypeFilter === 'edit' ? 'active' : ''}`}
              onClick={() => setRequestTypeFilter('edit')}
            >
              {t('admin_redaktirovanie_29f74d43')}
            </button>
            <button
              className={`moderation-filter-btn ${requestTypeFilter === 'delete' ? 'active' : ''}`}
              onClick={() => setRequestTypeFilter('delete')}
            >
              {t('admin_udalenie_04963db0')}
            </button>
          </div>

          {loading ? (
            <div className="moderation-empty">
              <p>{t('admin_loading')}</p>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="moderation-empty">
              <p>{t('admin_net_obektov_nedvizhimosti_na_ad3c87cc')}</p>
            </div>
          ) : (
            <div className="moderation-list">
              {filteredProperties.map(property => {
                const ownerName = `${property.first_name || ''} ${property.last_name || ''}`.trim() || t('admin_notSpecified');
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
                
                return (
                  <div 
                    key={property.id} 
                    className="moderation-card"
                    onClick={() => setSelectedProperty(property)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="moderation-card__image">
                      {getTypeIcon(property.property_type)}
                    </div>

                    <div className="moderation-card__info">
                      <div className="moderation-card__header">
                        <h3>{property.title}</h3>
                        {/* Показываем тип запроса только когда выбран фильтр t('admin_all') */}
                        {requestTypeFilter === 'all' && (
                          <span 
                            className="moderation-request-badge"
                            style={{
                              backgroundColor: requestTypeColors[requestType] + '20',
                              color: requestTypeColors[requestType],
                              padding: '0.25rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            {requestTypeLabels[requestType]}
                          </span>
                        )}
                      </div>
                      <p className="moderation-card__location">{property.location || t('admin_notSpecified')}</p>

                      <div className="moderation-card__meta">
                        <div className="moderation-meta-item">
                          <span className="moderation-label">{t('admin_tip_2345ad64')}</span>
                          <span className="moderation-value">{getTypeLabel(property.property_type)}</span>
                        </div>
                        {property.price && (
                          <div className="moderation-meta-item">
                            <span className="moderation-label">{t('admin_cena_6715b185')}</span>
                            <span className="moderation-value moderation-value--price">
                              {property.price.toLocaleString(getUiIntlLocale())} {property.currency || 'USD'}
                            </span>
                          </div>
                        )}
                        <div className="moderation-meta-item">
                          <span className="moderation-label">{t('admin_vladelec_a3021a4b')}</span>
                          <span className="moderation-value">{ownerName}</span>
                        </div>
                        <div className="moderation-meta-item">
                          <span className="moderation-label">{t('admin_data_podachi_71a7232c')}</span>
                          <span className="moderation-value">
                            {new Date(property.created_at).toLocaleDateString(getUiIntlLocale())}
                          </span>
                        </div>
                        {property.photos && Array.isArray(property.photos) && (
                          <div className="moderation-meta-item">
                            <span className="moderation-label">{t('admin_fotografiy_89083c98')}</span>
                            <span className="moderation-value">{property.photos.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Moderation;


