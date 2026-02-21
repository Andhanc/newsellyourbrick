import React, { useState, useMemo, useEffect } from 'react';
import { FiSearch, FiUser, FiHome, FiShield, FiShieldOff, FiX, FiCheck, FiXCircle, FiTrash2 } from 'react-icons/fi';
import { FaBuilding } from 'react-icons/fa';
import ModerationPropertyDetail from './ModerationPropertyDetail';
import ModerationUserDetail from './ModerationUserDetail';
import { showNotification } from '../../utils/toastHelper';
import './Moderation.css';
import { getApiBaseUrlSync } from '../../utils/apiConfig';

// Используем dev tunnel для API
const API_BASE_URL = getApiBaseUrlSync();

// Моковые данные для модерации пользователей (fallback)
const mockUsersForModeration = [
  {
    id: 1,
    firstName: 'Петр',
    lastName: 'Петров',
    middleName: 'Иванович',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    email: 'petr@example.com',
    phone: '+7 (912) 345-67-89',
    passportNumber: '4512 345678',
    citizenship: 'Российская Федерация',
    accountNumber: '40817810099910004312',
    role: 'seller',
    registrationDate: '2024-02-20',
    moderationStatus: 'pending',
    documents: [
      { name: 'Паспорт', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/%D0%AD%D0%BB%D0%B5%D0%BA%D1%82%D1%80%D0%BE%D0%BD%D0%BD%D1%8B%D0%B9_%D0%BF%D0%B0%D1%81%D0%BF%D0%BE%D1%80%D1%82_%D0%A0%D0%A4.jpg' },
      { name: 'Справка', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
    ]
  },
  {
    id: 2,
    firstName: 'Мария',
    lastName: 'Иванова',
    middleName: 'Сергеевна',
    avatar: 'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?auto=format&fit=crop&w=200&q=80',
    email: 'maria@example.com',
    phone: '+7 (923) 456-78-90',
    passportNumber: '4513 456789',
    citizenship: 'Российская Федерация',
    accountNumber: '40817810099910004313',
    role: 'buyer',
    registrationDate: '2024-05-12',
    moderationStatus: 'pending',
    documents: [
      { name: 'Паспорт', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/%D0%AD%D0%BB%D0%B5%D0%BA%D1%82%D1%80%D0%BE%D0%BD%D0%BD%D1%8B%D0%B9_%D0%BF%D0%B0%D1%81%D0%BF%D0%BE%D1%80%D1%82_%D0%A0%D0%A4.jpg' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'
    ]
  },
  {
    id: 3,
    firstName: 'Сергей',
    lastName: 'Волков',
    middleName: 'Александрович',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb0b90c07c1?auto=format&fit=crop&w=200&q=80',
    email: 'sergey@example.com',
    phone: '+7 (934) 567-89-01',
    passportNumber: '4514 567890',
    citizenship: 'Российская Федерация',
    accountNumber: '40817810099910004314',
    role: 'seller',
    registrationDate: '2024-08-30',
    moderationStatus: 'pending',
    documents: [
      { name: 'Паспорт', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/%D0%AD%D0%BB%D0%B5%D0%BA%D1%82%D1%80%D0%BE%D0%BD%D0%BD%D1%8B%D0%B9_%D0%BF%D0%B0%D1%81%D0%BF%D0%BE%D1%80%D1%82_%D0%A0%D0%A4.jpg' },
      { name: 'Справка', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80' },
      { name: 'Лицензия', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', photo: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80' }
    ],
    photos: [
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80'
    ]
  }
];

// Моковые данные для модерации недвижимости
const mockPropertiesForModeration = [
  {
    id: 1,
    title: 'Квартира в центре города',
    type: 'apartment',
    price: 8500000,
    location: 'Costa Adeje, Tenerife',
    ownerName: 'Петр Петров',
    ownerEmail: 'petr@example.com',
    submittedDate: '2024-12-10',
    moderationStatus: 'pending',
    images: 5,
    description: 'Прекрасная квартира с видом на океан',
    imageUrls: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80'
    ],
    documents: [
      { name: 'Свидетельство о праве собственности', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: 'Кадастровый паспорт', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: 'Технический паспорт', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: 'Справка БТИ', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' }
    ]
  },
  {
    id: 2,
    title: 'Вилла на берегу моря',
    type: 'villa',
    price: 25000000,
    location: 'Playa de las Américas, Tenerife',
    ownerName: 'Анна Сидорова',
    ownerEmail: 'anna@example.com',
    submittedDate: '2024-12-12',
    moderationStatus: 'pending',
    images: 8,
    description: 'Роскошная вилла с бассейном',
    imageUrls: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
    ],
    documents: [
      { name: 'Свидетельство о праве собственности', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: 'Кадастровый паспорт', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: 'Технический паспорт', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: 'Справка БТИ', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: 'Договор купли-продажи', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' }
    ]
  },
  {
    id: 3,
    title: 'Дом в тихом районе',
    type: 'house',
    price: 12000000,
    location: 'Los Cristianos, Tenerife',
    ownerName: 'Сергей Волков',
    ownerEmail: 'sergey@example.com',
    submittedDate: '2024-12-14',
    moderationStatus: 'pending',
    images: 6,
    description: 'Уютный дом для семьи',
    imageUrls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dbe4eb5f3?auto=format&fit=crop&w=1200&q=80'
    ],
    documents: [
      { name: 'Свидетельство о праве собственности', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: 'Кадастровый паспорт', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
      { name: 'Технический паспорт', type: 'pdf', url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' }
    ]
  }
];

const Moderation = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [pendingProperties, setPendingProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentlyApprovedIds, setRecentlyApprovedIds] = useState(new Set()); // ID недавно одобренных объектов
  const [requestTypeFilter, setRequestTypeFilter] = useState('all'); // 'all', 'publication', 'edit', 'delete'

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
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Получены данные от API:', data);
        
        if (data.success && data.data) {
          console.log('✅ Найдено документов:', data.data.length);
          
          // Группируем документы по пользователям
          const groupedByUser = {};
          data.data.forEach(doc => {
            console.log('📄 Обработка документа:', doc);
            
            if (!groupedByUser[doc.user_id]) {
              groupedByUser[doc.user_id] = {
                id: doc.user_id,
                firstName: doc.first_name || 'Не указано',
                lastName: doc.last_name || '',
                email: doc.email || 'Не указано',
                phone: doc.phone_number || 'Не указано',
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
            return dateB - dateA; // Новые сверху
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
      
      // Загружаем данные из localStorage (обратный порядок - новые сверху)
      const localStorageVerifications = JSON.parse(localStorage.getItem('pendingVerifications') || '[]');
      // Переворачиваем массив чтобы новые были сверху
      const reversedVerifications = [...localStorageVerifications].reverse();
      reversedVerifications.forEach((verification, index) => {
        // Сохраняем оригинальный индекс для правильного удаления
        const originalIndex = localStorageVerifications.length - 1 - index;
        const userId = verification.userId;
        const userLocalId = `local_user_${originalIndex}`;
        const existingUser = usersList.find(u => u.id === userId || u.id === userLocalId);
        
        if (existingUser) {
          // Добавляем документы к существующему пользователю
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
          // Добавляем информацию о привязанной карте, если она есть
          if (verification.cardInfo) {
            console.log('💳 Добавление данных карты к существующему пользователю:', verification.cardInfo);
            existingUser.cardInfo = verification.cardInfo;
          }
        } else {
          // Создаем нового пользователя из localStorage
          // Используем originalIndex для ID, чтобы можно было правильно удалить
          const userLocalId = `local_user_${originalIndex}`;
          const newUser = {
            id: userLocalId,
            firstName: 'Не указано',
            lastName: '',
            email: 'Не указано',
            phone: 'Не указано',
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
          // Добавляем информацию о привязанной карте, если она есть
          if (verification.cardInfo) {
            console.log('💳 Добавление данных карты к новому пользователю:', verification.cardInfo);
            newUser.cardInfo = verification.cardInfo;
          }
          usersList.push(newUser);
        }
      });
      
      // Фильтруем пользователей - оставляем только тех, у кого есть pending документы
      const usersWithPendingDocs = usersList.filter(user => {
        if (!user.documents || user.documents.length === 0) {
          return false;
        }
        // Проверяем, есть ли хотя бы один документ со статусом 'pending'
        return user.documents.some(doc => doc.verification_status === 'pending');
      });
      
      setPendingDocuments(usersWithPendingDocs);
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
      return dateB - dateA; // Новые сверху
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
        const errorText = await response.text().catch(() => 'Неизвестная ошибка');
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
          first_name: property.userProfileData?.first_name || 'Не указано',
          last_name: property.userProfileData?.last_name || '',
          email: property.userProfileData?.email || 'Не указано',
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
        return dateB - dateA; // Новые сверху
      });
      
      console.log(`📊 Итого объявлений для отображения: ${propertiesList.length}`);
      setPendingProperties(propertiesList);
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
      return dateB - dateA; // Новые сверху
    });
  }, [activeTab, searchQuery, pendingProperties, requestTypeFilter]);

  const handleApprove = async (type, id) => {
    try {
      // Проверяем, является ли это элементом из localStorage
      if (typeof id === 'string' && id.startsWith('local_')) {
        // Это элемент из localStorage - удаляем его и создаем уведомление
        if (type === 'properties') {
          const localStorageProperties = JSON.parse(localStorage.getItem('pendingProperties') || '[]');
          const index = parseInt(id.replace('local_', ''));
          if (index >= 0 && index < localStorageProperties.length) {
            const property = localStorageProperties[index];
            const propertyTitle = property.title || 'Объект недвижимости';
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
                  moderation_status: 'approved' // Сразу одобряем
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
                          title: 'Ваш объект прошел верификацию',
                          message: `Ваш объект "${propertyTitle}" прошел верификацию и опубликован на платформе`,
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
            showNotification('Объявление одобрено и удалено из списка модерации.');
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
            showNotification('Пользователь одобрен и удален из списка модерации.');
            loadPendingDocuments();
            setSelectedUser(null);
          } else {
            console.warn('Не удалось найти пользователя в localStorage с ID:', id);
            showNotification('Пользователь не найден в localStorage. Возможно, он уже был обработан.');
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
        
        const response = await fetch(`${API_BASE_URL}/properties/${id}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewed_by: adminId,
            moderation_status: 'approved' // Явно указываем статус одобрения
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
                showNotification('Объявление одобрено, но статус не обновлен. Возможно, проблема на сервере. Проверьте логи бэкенда.');
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
            
            showNotification('Объявление одобрено. Владельцу отправлено уведомление.');
            // Закрываем детальный вид
            setSelectedProperty(null);
            
            // Удаляем объект из локального списка сразу, чтобы он не показывался
            setPendingProperties(prev => prev.filter(p => String(p.id) !== String(id)));
            
            // Обновляем список после задержки, чтобы дать серверу время обновить статус
            // Увеличиваем задержку, так как бэкенд может обрабатывать запрос асинхронно
            setTimeout(() => {
              console.log('🔄 Принудительное обновление списка после одобрения...');
              loadPendingProperties();
            }, 1500);
          } else {
            console.error('❌ API вернул success: false:', data);
            showNotification(data.error || data.message || 'Ошибка при одобрении объявления. Сервер вернул ошибку.');
          }
        } else {
          const errorText = await response.text().catch(() => 'Неизвестная ошибка');
          console.error('❌ Ошибка HTTP при одобрении:', response.status, errorText);
          let errorMessage = 'Ошибка при одобрении объявления';
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
            
            showNotification('Пользователь одобрен и верифицирован. Ему отправлено уведомление.');
            loadPendingDocuments();
            setSelectedUser(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          showNotification(errorData.error || 'Ошибка при одобрении пользователя');
        }
      }
    } catch (error) {
      console.error('Ошибка при одобрении:', error);
      showNotification('Ошибка при одобрении');
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
            showNotification('Объявление отклонено и удалено из списка модерации.');
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
            showNotification('Пользователь отклонен и удален из списка модерации.');
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
            showNotification('Объявление отклонено. Владельцу отправлено уведомление.');
            loadPendingProperties();
            setSelectedProperty(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          showNotification(errorData.error || 'Ошибка при отклонении объявления');
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
            
            showNotification('Пользователь отклонен. Ему отправлено уведомление.');
            loadPendingDocuments();
            setSelectedUser(null);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          showNotification(errorData.error || 'Ошибка при отклонении пользователя');
        }
      }
    } catch (error) {
      console.error('Ошибка при отклонении:', error);
      showNotification('Ошибка при отклонении');
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      apartment: 'Квартира',
      villa: 'Вилла',
      house: 'Дом'
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
    if (window.confirm('Вы уверены, что хотите очистить все данные из localStorage? Это удалит все необработанные верификации и объявления из локального хранилища.')) {
      localStorage.removeItem('pendingVerifications');
      localStorage.removeItem('pendingProperties');
      showNotification('localStorage очищен. Список модерации обновлен.');
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
        onApprove={() => handleApprove('properties', selectedProperty.id)}
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
          Пользователи
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
          Недвижимость
        </button>
      </div>

      <div className="moderation-search">
        <FiSearch className="search-icon" size={20} />
        <input
          type="text"
          placeholder={
            activeTab === 'users'
              ? 'Поиск по имени, фамилии или email...'
              : 'Поиск по названию, локации или владельцу...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="moderation-search-input"
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

      {activeTab === 'users' && (
        <div className="moderation-content">
          {loading ? (
            <div className="moderation-empty">
              <p>Загрузка документов...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="moderation-empty">
              <p>Нет документов на верификацию</p>
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
                        <span className="moderation-label">Роль:</span>
                        <span className={`moderation-value moderation-value--${user.role}`}>
                          {user.role === 'buyer' ? 'Покупатель' : 'Продавец'}
                        </span>
                      </div>
                      <div className="moderation-meta-item">
                        <span className="moderation-label">Регистрация:</span>
                        <span className="moderation-value">
                          {user.documents && user.documents.length > 0 && user.documents[0].created_at
                            ? new Date(user.documents[0].created_at).toLocaleDateString('ru-RU')
                            : 'Не указано'}
                        </span>
                      </div>
                      <div className="moderation-meta-item">
                        <span className="moderation-label">Документы:</span>
                        <span className="moderation-value">
                          {user.documents ? user.documents.length : 0} документ(ов) на проверку
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
              Все
            </button>
            <button
              className={`moderation-filter-btn ${requestTypeFilter === 'publication' ? 'active' : ''}`}
              onClick={() => setRequestTypeFilter('publication')}
            >
              Публикация
            </button>
            <button
              className={`moderation-filter-btn ${requestTypeFilter === 'edit' ? 'active' : ''}`}
              onClick={() => setRequestTypeFilter('edit')}
            >
              Редактирование
            </button>
            <button
              className={`moderation-filter-btn ${requestTypeFilter === 'delete' ? 'active' : ''}`}
              onClick={() => setRequestTypeFilter('delete')}
            >
              Удаление
            </button>
          </div>

          {loading ? (
            <div className="moderation-empty">
              <p>Загрузка...</p>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="moderation-empty">
              <p>Нет объектов недвижимости на модерации</p>
            </div>
          ) : (
            <div className="moderation-list">
              {filteredProperties.map(property => {
                const ownerName = `${property.first_name || ''} ${property.last_name || ''}`.trim() || 'Не указано';
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
                        {/* Показываем тип запроса только когда выбран фильтр "Все" */}
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
                      <p className="moderation-card__location">{property.location || 'Не указано'}</p>

                      <div className="moderation-card__meta">
                        <div className="moderation-meta-item">
                          <span className="moderation-label">Тип:</span>
                          <span className="moderation-value">{getTypeLabel(property.property_type)}</span>
                        </div>
                        {property.price && (
                          <div className="moderation-meta-item">
                            <span className="moderation-label">Цена:</span>
                            <span className="moderation-value moderation-value--price">
                              {property.price.toLocaleString('ru-RU')} {property.currency || 'USD'}
                            </span>
                          </div>
                        )}
                        <div className="moderation-meta-item">
                          <span className="moderation-label">Владелец:</span>
                          <span className="moderation-value">{ownerName}</span>
                        </div>
                        <div className="moderation-meta-item">
                          <span className="moderation-label">Дата подачи:</span>
                          <span className="moderation-value">
                            {new Date(property.created_at).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        {property.photos && Array.isArray(property.photos) && (
                          <div className="moderation-meta-item">
                            <span className="moderation-label">Фотографий:</span>
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


