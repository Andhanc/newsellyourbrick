// Моковые данные для админ-панели
export const mockBusinessInfo = {
  id: 1,
  name: "Мой бизнес",
  admin_id: 765843635,
  stats: {
    clients_count: 1250,
    business_clients_count: 850,
    active_users: 320,
    average_check: 12500.50,
    total_profit: 1250000.00,
    discount_profit: 45000.00,
    total_points: 125000
  },
  profile: {
    logo_path: "https://via.placeholder.com/120/4F46E5/FFFFFF?text=MB",
    category: "Магазин одежды",
    description: "Мы предлагаем качественные товары и отличный сервис для наших клиентов.",
    address: "ул. Примерная, 123",
    phone: "+7 (123) 456-78-90",
    website: "https://example.com"
  },
  admin_profile: {
    full_name: "Иван Иванов",
    email: "ivan@example.com",
    phone: "+7 (123) 456-78-90",
    position: "Директор",
    company_name: "Мой бизнес",
    bio: "Опытный предприниматель с 10-летним стажем",
    social_links: "https://vk.com/ivan, https://instagram.com/ivan"
  },
  cashback_levels: [
    { level_name: "Bronze", cashback_percentage: 5.0, min_purchase_amount: 0 },
    { level_name: "Silver", cashback_percentage: 10.0, min_purchase_amount: 10000 },
    { level_name: "Gold", cashback_percentage: 15.0, min_purchase_amount: 50000 }
  ],
  gender_stats: {
    male: 450,
    female: 600,
    other: 0
  },
  registrations_by_weekday: [
    { day: "Понедельник", count: 120 },
    { day: "Вторник", count: 150 },
    { day: "Среда", count: 180 },
    { day: "Четверг", count: 200 },
    { day: "Пятница", count: 250 },
    { day: "Суббота", count: 180 },
    { day: "Воскресенье", count: 120 }
  ],
  users_by_weekday: {
    "Понедельник": [
      { id: 1, full_name: "Иванов Иван", username: "ivan_1985", telegram_id: 123456789, registration_date: "2024-01-15" },
      { id: 2, full_name: "Петров Петр", username: "petrov_p", telegram_id: 987654321, registration_date: "2024-02-20" }
    ],
    "Вторник": [
      { id: 3, full_name: "Сидорова Анна", username: "anna_s", telegram_id: 111222333, registration_date: "2024-03-10" }
    ],
    "Среда": [],
    "Четверг": [],
    "Пятница": [],
    "Суббота": [],
    "Воскресенье": []
  },
  all_users: [
    { id: 1, telegram_id: 123456789, full_name: "Иванов Иван", username: "ivan_1985", registration_date: "2024-01-15", total_points: 5000 },
    { id: 2, telegram_id: 987654321, full_name: "Петров Петр", username: "petrov_p", registration_date: "2024-02-20", total_points: 3500 },
    { id: 3, telegram_id: 111222333, full_name: "Сидорова Анна", username: "anna_s", registration_date: "2024-03-10", total_points: 8000 },
    { id: 4, telegram_id: 444555666, full_name: "Кузнецов Алексей", username: "alex_k", registration_date: "2024-04-05", total_points: 12000 }
  ],
  clients: [
    { telegram_id: 123456789, full_name: "Иванов Иван", registration_date: "2024-01-15", points: 5000 },
    { telegram_id: 987654321, full_name: "Петров Петр", registration_date: "2024-02-20", points: 3500 }
  ],
  purchases: [
    { id: 1, created_at: "2024-12-14 14:30:00", full_name: "Иванов Иван", username: "ivan_1985", telegram_id: 123456789, level_name: "Gold", points_used: 250, amount: 12450 },
    { id: 2, created_at: "2024-12-13 10:15:00", full_name: "Петрова Анна", username: "ann_pet", telegram_id: 111222333, level_name: "Silver", points_used: 120, amount: 8700 },
    { id: 3, created_at: "2024-12-12 18:45:00", full_name: "Сидоров Алексей", username: "alex_sid", telegram_id: 444555666, level_name: "Bronze", points_used: 50, amount: 5300 }
  ],
  promotions: [
    { id: 1, title: "Новогодняя распродажа", description: "Скидка 20% на все товары", start_date: "2024-12-20", end_date: "2025-01-10", is_active: true },
    { id: 2, title: "День рождения клиента", description: "Двойные баллы в день рождения", start_date: "2024-12-01", end_date: "2024-12-31", is_active: true }
  ],
  promo_history: [
    { id: 1, action_date: "2024-12-10 10:00:00", action: "created", promotion_title: "Новогодняя распродажа", details: "Создана акция: Новогодняя распродажа", user_name: "Администратор" },
    { id: 2, action_date: "2024-12-11 15:30:00", action: "updated", promotion_title: "Новогодняя распродажа", details: "Обновлена акция: Новогодняя распродажа", user_name: "Администратор" }
  ],
  user_role_stats: {
    sellers: 45,
    buyers: 55
  },
  auctions: [
    {
      id: 1,
      object_id: 1,
      object_title: 'Вилла на берегу моря',
      object_type: 'villa',
      object_location: 'Costa Adeje, Tenerife',
      object_price: 2500000,
      current_bid: 2300000,
      end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), // через 2 дня 5 часов
      image_url: '/images/external/photo-1600596542815-ffad4c1539a9-b7b3994d6c.jpg',
      bedrooms: 4,
      bathrooms: 3,
      area: 250,
      description: 'Роскошная вилла с видом на океан, современной отделкой и всеми удобствами'
    },
    {
      id: 2,
      object_id: 2,
      object_title: 'Квартира в центре',
      object_type: 'apartment',
      object_location: 'Los Cristianos, Tenerife',
      object_price: 850000,
      current_bid: 820000,
      end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // через 5 дней 12 часов
      image_url: '/images/external/photo-1560448204-e02f11c3d0e2-1ff5809f2f.jpg',
      bedrooms: 2,
      bathrooms: 2,
      area: 85,
      description: 'Современная квартира в центре города с панорамными окнами и стильной отделкой'
    },
    {
      id: 3,
      object_id: 3,
      object_title: 'Дом в тихом районе',
      object_type: 'house',
      object_location: 'Playa de las Américas, Tenerife',
      object_price: 1200000,
      current_bid: 1150000,
      end_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // через 1 день 3 часа
      image_url: '/images/external/photo-1522708323590-d24dbb6b0267-dbb7d1dee1.jpg',
      bedrooms: 3,
      bathrooms: 2,
      area: 150,
      description: 'Уютный дом в тихом районе с садом, террасой и современной планировкой'
    },
    {
      id: 4,
      object_id: 4,
      object_title: 'Пентхаус с видом на океан',
      object_type: 'apartment',
      object_location: 'Puerto de la Cruz, Tenerife',
      object_price: 3200000,
      current_bid: 3000000,
      end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      image_url: '/images/external/photo-1512917774080-9991f1c4c750-82ecd9c8d5.jpg'
    },
    {
      id: 5,
      object_id: 5,
      object_title: 'Современная вилла с бассейном',
      object_type: 'villa',
      object_location: 'Adeje, Tenerife',
      object_price: 1800000,
      current_bid: 1700000,
      end_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000),
      image_url: '/images/external/photo-1600585154340-be6161a56a0c-e1e8212262.jpg'
    },
    {
      id: 6,
      object_id: 6,
      object_title: 'Квартира-студия у пляжа',
      object_type: 'apartment',
      object_location: 'Las Caletillas, Tenerife',
      object_price: 450000,
      current_bid: 420000,
      end_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      image_url: '/images/external/photo-1522771739844-6a9f6d5f14af-6b0b3bd36d.jpg'
    },
    {
      id: 7,
      object_id: 7,
      object_title: 'Загородный дом с садом',
      object_type: 'house',
      object_location: 'La Laguna, Tenerife',
      object_price: 950000,
      current_bid: 900000,
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
      image_url: '/images/external/photo-1570129477492-45c003edd2be-bde30b7eee.jpg'
    },
    {
      id: 8,
      object_id: 8,
      object_title: 'Элитная вилла на холме',
      object_type: 'villa',
      object_location: 'Guía de Isora, Tenerife',
      object_price: 4200000,
      current_bid: 4000000,
      end_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000 + 20 * 60 * 60 * 1000),
      image_url: '/images/external/photo-1600607687939-ce8a6c25118c-673c5d2f89.jpg'
    },
    {
      id: 9,
      object_id: 9,
      object_title: 'Дом с террасой и видом',
      object_type: 'house',
      object_location: 'Santa Cruz, Tenerife',
      object_price: 1100000,
      current_bid: 1050000,
      end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      image_url: '/images/external/photo-1600566753190-17f0baa2a6c3-fc85640464.jpg'
    },
    {
      id: 10,
      object_id: 10,
      object_title: 'Апартаменты премиум класса',
      object_type: 'apartment',
      object_location: 'Costa del Silencio, Tenerife',
      object_price: 680000,
      current_bid: 650000,
      end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
      image_url: '/images/external/photo-1600607687939-ce8a6c25118c-673c5d2f89.jpg'
    }
  ],
  objects_count: 156,
  auctions_count: 23
};


