// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С КВАРТИРАМИ/АПАРТАМЕНТАМИ ==========

export const apartmentQueries = {
  /**
   * Создать новое объявление о квартире/апартаменте
   */
  create: (propertyData) => {
    const db = getDatabase();
    
    // Формируем JSON массив удобств из отдельных полей
    const amenities = [];
    if (propertyData.balcony) amenities.push('balcony');
    if (propertyData.parking) amenities.push('parking');
    if (propertyData.elevator) amenities.push('elevator');
    if (propertyData.electricity) amenities.push('electricity');
    if (propertyData.internet) amenities.push('internet');
    if (propertyData.security) amenities.push('security');
    if (propertyData.furniture) amenities.push('furniture');
    
    // Добавляем feature поля в массив удобств
    for (let i = 1; i <= 26; i++) {
      const featureKey = `feature${i}`;
      if (propertyData[featureKey]) {
        amenities.push(featureKey);
      }
    }
    
    const stmt = db.prepare(`
      INSERT INTO properties_apartments (
        user_id, property_type, title, description, price, currency,
        is_auction, auction_start_date, auction_end_date, auction_starting_price,
        area, living_area, building_type, rooms, bathrooms, floor, total_floors, year_built,
        location, address, apartment, country, city, coordinates,
        amenities, renovation, condition, heating, water_supply, sewerage,
        commercial_type, business_hours, additional_amenities,
        photos, videos, additional_documents,
        ownership_document, no_debts_document,
        test_drive, test_drive_data,
        moderation_status,
        sale_type, is_debt, has_debt,
        debt_utilities, debt_mortgage_pledge, debt_property_taxes, debt_arrest, debt_inherited, debt_third_party,
        debt_other, debt_amount, debt_severity
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);
    
    return stmt.run(
      propertyData.user_id,
      propertyData.property_type,
      propertyData.title,
      propertyData.description || null,
      propertyData.price || null,
      propertyData.currency || 'USD',
      propertyData.is_auction ? 1 : 0,
      propertyData.auction_start_date || null,
      propertyData.auction_end_date || null,
      propertyData.auction_starting_price || null,
      propertyData.area || null,
      propertyData.living_area || null,
      propertyData.building_type || null,
      propertyData.rooms || null,
      propertyData.bathrooms || null,
      propertyData.floor || null,
      propertyData.total_floors || null,
      propertyData.year_built || null,
      propertyData.location || null,
      propertyData.address || null,
      propertyData.apartment || null,
      propertyData.country || null,
      propertyData.city || null,
      propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
      JSON.stringify(amenities),
      propertyData.renovation || null,
      propertyData.condition || null,
      propertyData.heating || null,
      propertyData.water_supply || null,
      propertyData.sewerage || null,
      propertyData.commercial_type || null,
      propertyData.business_hours || null,
      propertyData.additional_amenities || null,
      propertyData.photos ? JSON.stringify(propertyData.photos) : null,
      propertyData.videos ? JSON.stringify(propertyData.videos) : null,
      propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
      propertyData.ownership_document || null,
      propertyData.no_debts_document || null,
      propertyData.test_drive ? 1 : 0,
      propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
      propertyData.moderation_status || 'pending',
      propertyData.sale_type || null,
      propertyData.is_debt ? 1 : 0,
      propertyData.has_debt ? 1 : 0,
      propertyData.debt_utilities ? 1 : 0,
      propertyData.debt_mortgage_pledge ? 1 : 0,
      propertyData.debt_property_taxes ? 1 : 0,
      propertyData.debt_arrest ? 1 : 0,
      propertyData.debt_inherited ? 1 : 0,
      propertyData.debt_third_party ? 1 : 0,
      propertyData.debt_other || null,
      propertyData.debt_amount != null && propertyData.debt_amount !== '' ? Number(propertyData.debt_amount) : null,
      propertyData.debt_severity || null
    );
  },

  /**
   * Получить квартиру по ID
   */
  getById: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM properties_apartments WHERE id = ?');
    const property = stmt.get(id);
    
    if (property) {
      // Парсим JSON поля с безопасной обработкой ошибок
      if (property.amenities) {
        try {
          property.amenities = JSON.parse(property.amenities);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга amenities для property ID', id, ':', e.message);
          property.amenities = [];
        }
      }
      if (property.coordinates) {
        try {
          property.coordinates = JSON.parse(property.coordinates);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга coordinates для property ID', id, ':', e.message);
          property.coordinates = null;
        }
      }
      if (property.photos) {
        try {
          property.photos = JSON.parse(property.photos);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга photos для property ID', id, ':', e.message);
          property.photos = [];
        }
      }
      if (property.videos) {
        try {
          property.videos = JSON.parse(property.videos);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга videos для property ID', id, ':', e.message);
          property.videos = [];
        }
      }
      if (property.additional_documents) {
        try {
          property.additional_documents = JSON.parse(property.additional_documents);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга additional_documents для property ID', id, ':', e.message);
          console.warn('⚠️ Содержимое additional_documents:', property.additional_documents);
          property.additional_documents = [];
        }
      }
      if (property.test_drive_data) {
        try {
          property.test_drive_data = JSON.parse(property.test_drive_data);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга test_drive_data для property ID', id, ':', e.message);
          property.test_drive_data = null;
        }
      }
    }
    
    return property;
  },

  /**
   * Получить все квартиры/апартаменты пользователя
   */
  getByUserId: (userId, limit = 50, offset = 0) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM properties_apartments 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    const properties = stmt.all(userId, limit, offset);
    
    // Парсим JSON поля для каждого объекта
    return properties.map(property => {
      if (property.amenities) property.amenities = JSON.parse(property.amenities);
      if (property.coordinates) property.coordinates = JSON.parse(property.coordinates);
      if (property.photos) property.photos = JSON.parse(property.photos);
      if (property.videos) property.videos = JSON.parse(property.videos);
      if (property.additional_documents) property.additional_documents = JSON.parse(property.additional_documents);
      if (property.test_drive_data) property.test_drive_data = JSON.parse(property.test_drive_data);
      return property;
    });
  },

  /**
   * Получить все квартиры/апартаменты с фильтрами
   */
  getAll: (filters = {}, limit = 100, offset = 0) => {
    const db = getDatabase();
    let query = 'SELECT * FROM properties_apartments WHERE 1=1';
    const params = [];
    
    if (filters.moderation_status) {
      query += ' AND moderation_status = ?';
      params.push(filters.moderation_status);
    }
    
    if (filters.property_type) {
      query += ' AND property_type = ?';
      params.push(filters.property_type);
    }
    
    if (filters.city) {
      query += ' AND city = ?';
      params.push(filters.city);
    }
    
    if (filters.country) {
      query += ' AND country = ?';
      params.push(filters.country);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = db.prepare(query);
    const properties = stmt.all(...params);
    
    // Парсим JSON поля
    return properties.map(property => {
      if (property.amenities) property.amenities = JSON.parse(property.amenities);
      if (property.coordinates) property.coordinates = JSON.parse(property.coordinates);
      if (property.photos) property.photos = JSON.parse(property.photos);
      if (property.videos) property.videos = JSON.parse(property.videos);
      if (property.additional_documents) property.additional_documents = JSON.parse(property.additional_documents);
      if (property.test_drive_data) property.test_drive_data = JSON.parse(property.test_drive_data);
      return property;
    });
  },

  /**
   * Обновить квартиру/апартамент
   */
  update: (id, propertyData) => {
    const db = getDatabase();
    
    // Формируем JSON массив удобств
    const amenities = [];
    if (propertyData.balcony) amenities.push('balcony');
    if (propertyData.parking) amenities.push('parking');
    if (propertyData.elevator) amenities.push('elevator');
    if (propertyData.electricity) amenities.push('electricity');
    if (propertyData.internet) amenities.push('internet');
    if (propertyData.security) amenities.push('security');
    if (propertyData.furniture) amenities.push('furniture');
    
    for (let i = 1; i <= 26; i++) {
      const featureKey = `feature${i}`;
      if (propertyData[featureKey]) {
        amenities.push(featureKey);
      }
    }
    
    const stmt = db.prepare(`
      UPDATE properties_apartments SET
        title = ?, description = ?, price = ?, currency = ?,
        is_auction = ?, auction_start_date = ?, auction_end_date = ?, auction_starting_price = ?,
        area = ?, living_area = ?, building_type = ?, rooms = ?, bathrooms = ?, 
        floor = ?, total_floors = ?, year_built = ?,
        location = ?, address = ?, apartment = ?, country = ?, city = ?, coordinates = ?,
        amenities = ?, renovation = ?, condition = ?, heating = ?, water_supply = ?, sewerage = ?,
        commercial_type = ?, business_hours = ?, additional_amenities = ?,
        photos = ?, videos = ?, additional_documents = ?,
        ownership_document = ?, no_debts_document = ?,
        test_drive = ?, test_drive_data = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(
      propertyData.title,
      propertyData.description || null,
      propertyData.price || null,
      propertyData.currency || 'USD',
      propertyData.is_auction ? 1 : 0,
      propertyData.auction_start_date || null,
      propertyData.auction_end_date || null,
      propertyData.auction_starting_price || null,
      propertyData.area || null,
      propertyData.living_area || null,
      propertyData.building_type || null,
      propertyData.rooms || null,
      propertyData.bathrooms || null,
      propertyData.floor || null,
      propertyData.total_floors || null,
      propertyData.year_built || null,
      propertyData.location || null,
      propertyData.address || null,
      propertyData.apartment || null,
      propertyData.country || null,
      propertyData.city || null,
      propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
      JSON.stringify(amenities),
      propertyData.renovation || null,
      propertyData.condition || null,
      propertyData.heating || null,
      propertyData.water_supply || null,
      propertyData.sewerage || null,
      propertyData.commercial_type || null,
      propertyData.business_hours || null,
      propertyData.additional_amenities || null,
      propertyData.photos ? JSON.stringify(propertyData.photos) : null,
      propertyData.videos ? JSON.stringify(propertyData.videos) : null,
      propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
      propertyData.ownership_document || null,
      propertyData.no_debts_document || null,
      propertyData.test_drive ? 1 : 0,
      propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
      id
    );
  },

  /**
   * Удалить квартиру/апартамент
   */
  delete: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM properties_apartments WHERE id = ?');
    return stmt.run(id);
  },

  /**
   * Обновить статус модерации
   */
  updateModerationStatus: (id, status, reviewedBy = null, rejectionReason = null) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE properties_apartments 
      SET moderation_status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
      WHERE id = ?
    `);
    return stmt.run(status, reviewedBy, rejectionReason, id);
  },

  /**
   * Забронировать объект на 72 часа
   */
  reserve: (id, userId, purchaseRequestId) => {
    const db = getDatabase();
    const reservedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // +72 часа
    const stmt = db.prepare(`
      UPDATE properties_apartments 
      SET reserved_until = ?, reserved_by = ?, purchase_request_id = ?
      WHERE id = ?
    `);
    return stmt.run(reservedUntil, userId, purchaseRequestId, id);
  },

  /**
   * Снять бронь с объекта
   */
  unreserve: (id) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE properties_apartments 
      SET reserved_until = NULL, reserved_by = NULL, purchase_request_id = NULL
      WHERE id = ?
    `);
    return stmt.run(id);
  },

  /**
   * Проверить, забронирован ли объект
   */
  isReserved: (id) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT reserved_until, reserved_by, purchase_request_id 
      FROM properties_apartments 
      WHERE id = ?
    `);
    const result = stmt.get(id);
    
    if (!result || !result.reserved_until) {
      return { isReserved: false };
    }
    
    const reservedUntil = new Date(result.reserved_until);
    const now = new Date();
    
    // Если бронь истекла, автоматически снимаем её
    if (reservedUntil < now) {
      apartmentQueries.unreserve(id);
      return { isReserved: false };
    }
    
    return {
      isReserved: true,
      reservedUntil: result.reserved_until,
      reservedBy: result.reserved_by,
      purchaseRequestId: result.purchase_request_id,
      timeRemaining: reservedUntil - now
    };
  }
};

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ДОМАМИ/ВИЛЛАМИ ==========

export const houseQueries = {
  /**
   * Создать новое объявление о доме/вилле
   */
  create: (propertyData) => {
    const db = getDatabase();
    
    // Формируем JSON массив удобств
    // ВАЖНО: Добавляем в массив ТОЛЬКО те удобства, которые явно выбраны пользователем (равны 1 или true)
    const amenities = [];
    
    // Основные удобства - проверяем строго (только 1 или true, не 0, не undefined, не '0')
    if (propertyData.pool === 1 || propertyData.pool === true || propertyData.pool === '1') {
      amenities.push('pool');
    }
    if (propertyData.garden === 1 || propertyData.garden === true || propertyData.garden === '1') {
      amenities.push('garden');
    }
    if (propertyData.garage === 1 || propertyData.garage === true || propertyData.garage === '1') {
      amenities.push('garage');
    }
    if (propertyData.parking === 1 || propertyData.parking === true || propertyData.parking === '1') {
      amenities.push('parking');
    }
    if (propertyData.electricity === 1 || propertyData.electricity === true || propertyData.electricity === '1') {
      amenities.push('electricity');
    }
    if (propertyData.internet === 1 || propertyData.internet === true || propertyData.internet === '1') {
      amenities.push('internet');
    }
    if (propertyData.security === 1 || propertyData.security === true || propertyData.security === '1') {
      amenities.push('security');
    }
    if (propertyData.furniture === 1 || propertyData.furniture === true || propertyData.furniture === '1') {
      amenities.push('furniture');
    }
    
    // Добавляем feature поля в массив удобств - проверяем строго
    for (let i = 1; i <= 26; i++) {
      const featureKey = `feature${i}`;
      const featureValue = propertyData[featureKey];
      if (featureValue === 1 || featureValue === true || featureValue === '1') {
        amenities.push(featureKey);
      }
    }
    
    // Логируем bedrooms перед сохранением
    console.log('🔍 houseQueries.create - propertyData.bedrooms:', propertyData.bedrooms, 'тип:', typeof propertyData.bedrooms);
    
    const stmt = db.prepare(`
      INSERT INTO properties_houses (
        user_id, property_type, title, description, price, currency,
        is_auction, auction_start_date, auction_end_date, auction_starting_price,
        area, living_area, land_area, building_type, bedrooms, bathrooms, floors, year_built,
        location, address, country, city, coordinates,
        amenities, renovation, condition, heating, water_supply, sewerage,
        additional_amenities,
        photos, videos, additional_documents,
        ownership_document, no_debts_document,
        test_drive, test_drive_data,
        moderation_status,
        sale_type, is_debt, has_debt,
        debt_utilities, debt_mortgage_pledge, debt_property_taxes, debt_arrest, debt_inherited, debt_third_party,
        debt_other, debt_amount, debt_severity
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `);
    
    // Обрабатываем bedrooms: проверяем на валидность и преобразуем в число
    let bedroomsValue = null;
    if (propertyData.bedrooms !== undefined && propertyData.bedrooms !== null && propertyData.bedrooms !== '') {
      const parsedBedrooms = typeof propertyData.bedrooms === 'number' 
        ? propertyData.bedrooms 
        : parseInt(propertyData.bedrooms, 10);
      // Проверяем, что это валидное число (не NaN и конечное)
      if (!isNaN(parsedBedrooms) && isFinite(parsedBedrooms)) {
        bedroomsValue = parsedBedrooms;
      }
    }
    
    return stmt.run(
      propertyData.user_id,
      propertyData.property_type,
      propertyData.title,
      propertyData.description || null,
      propertyData.price || null,
      propertyData.currency || 'USD',
      propertyData.is_auction ? 1 : 0,
      propertyData.auction_start_date || null,
      propertyData.auction_end_date || null,
      propertyData.auction_starting_price || null,
      propertyData.area || null,
      propertyData.living_area || null,
      propertyData.land_area || null,
      propertyData.building_type || null,
      bedroomsValue, // Используем вычисленное значение
      propertyData.bathrooms || null,
      propertyData.floors || null, // Количество этажей дома
      propertyData.year_built || null,
      propertyData.location || null,
      propertyData.address || null,
      propertyData.country || null,
      propertyData.city || null,
      propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
      JSON.stringify(amenities),
      propertyData.renovation || null,
      propertyData.condition || null,
      propertyData.heating || null,
      propertyData.water_supply || null,
      propertyData.sewerage || null,
      propertyData.additional_amenities || null,
      propertyData.photos ? JSON.stringify(propertyData.photos) : null,
      propertyData.videos ? JSON.stringify(propertyData.videos) : null,
      propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
      propertyData.ownership_document || null,
      propertyData.no_debts_document || null,
      propertyData.test_drive ? 1 : 0,
      propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
      propertyData.moderation_status || 'pending',
      propertyData.sale_type || null,
      propertyData.is_debt ? 1 : 0,
      propertyData.has_debt ? 1 : 0,
      propertyData.debt_utilities ? 1 : 0,
      propertyData.debt_mortgage_pledge ? 1 : 0,
      propertyData.debt_property_taxes ? 1 : 0,
      propertyData.debt_arrest ? 1 : 0,
      propertyData.debt_inherited ? 1 : 0,
      propertyData.debt_third_party ? 1 : 0,
      propertyData.debt_other || null,
      propertyData.debt_amount != null && propertyData.debt_amount !== '' ? Number(propertyData.debt_amount) : null,
      propertyData.debt_severity || null
    );
  },

  /**
   * Получить дом/виллу по ID
   */
  getById: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM properties_houses WHERE id = ?');
    const property = stmt.get(id);
    
    if (property) {
      console.log('🔍 houseQueries.getById - bedrooms из БД:', property.bedrooms, 'тип:', typeof property.bedrooms);
      // Парсим JSON поля с безопасной обработкой ошибок
      if (property.amenities) {
        try {
          property.amenities = JSON.parse(property.amenities);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга amenities для property ID', id, ':', e.message);
          property.amenities = [];
        }
      }
      if (property.coordinates) {
        try {
          property.coordinates = JSON.parse(property.coordinates);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга coordinates для property ID', id, ':', e.message);
          property.coordinates = null;
        }
      }
      if (property.photos) {
        try {
          property.photos = JSON.parse(property.photos);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга photos для property ID', id, ':', e.message);
          property.photos = [];
        }
      }
      if (property.videos) {
        try {
          property.videos = JSON.parse(property.videos);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга videos для property ID', id, ':', e.message);
          property.videos = [];
        }
      }
      if (property.additional_documents) {
        try {
          property.additional_documents = JSON.parse(property.additional_documents);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга additional_documents для property ID', id, ':', e.message);
          console.warn('⚠️ Содержимое additional_documents:', property.additional_documents);
          property.additional_documents = [];
        }
      }
      if (property.test_drive_data) {
        try {
          property.test_drive_data = JSON.parse(property.test_drive_data);
        } catch (e) {
          console.warn('⚠️ Ошибка парсинга test_drive_data для property ID', id, ':', e.message);
          property.test_drive_data = null;
        }
      }
    }
    
    return property;
  },

  /**
   * Получить все дома/виллы пользователя
   */
  getByUserId: (userId, limit = 50, offset = 0) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM properties_houses 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    const properties = stmt.all(userId, limit, offset);
    
    // Парсим JSON поля
    return properties.map(property => {
      if (property.amenities) property.amenities = JSON.parse(property.amenities);
      if (property.coordinates) property.coordinates = JSON.parse(property.coordinates);
      if (property.photos) property.photos = JSON.parse(property.photos);
      if (property.videos) property.videos = JSON.parse(property.videos);
      if (property.additional_documents) property.additional_documents = JSON.parse(property.additional_documents);
      if (property.test_drive_data) property.test_drive_data = JSON.parse(property.test_drive_data);
      return property;
    });
  },

  /**
   * Получить все дома/виллы с фильтрами
   */
  getAll: (filters = {}, limit = 100, offset = 0) => {
    const db = getDatabase();
    let query = 'SELECT * FROM properties_houses WHERE 1=1';
    const params = [];
    
    if (filters.moderation_status) {
      query += ' AND moderation_status = ?';
      params.push(filters.moderation_status);
    }
    
    if (filters.property_type) {
      query += ' AND property_type = ?';
      params.push(filters.property_type);
    }
    
    if (filters.city) {
      query += ' AND city = ?';
      params.push(filters.city);
    }
    
    if (filters.country) {
      query += ' AND country = ?';
      params.push(filters.country);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = db.prepare(query);
    const properties = stmt.all(...params);
    
    // Парсим JSON поля
    return properties.map(property => {
      if (property.amenities) property.amenities = JSON.parse(property.amenities);
      if (property.coordinates) property.coordinates = JSON.parse(property.coordinates);
      if (property.photos) property.photos = JSON.parse(property.photos);
      if (property.videos) property.videos = JSON.parse(property.videos);
      if (property.additional_documents) property.additional_documents = JSON.parse(property.additional_documents);
      if (property.test_drive_data) property.test_drive_data = JSON.parse(property.test_drive_data);
      return property;
    });
  },

  /**
   * Обновить дом/виллу
   */
  update: (id, propertyData) => {
    const db = getDatabase();
    
    // Формируем JSON массив удобств
    const amenities = [];
    if (propertyData.pool) amenities.push('pool');
    if (propertyData.garden) amenities.push('garden');
    if (propertyData.garage) amenities.push('garage');
    if (propertyData.parking) amenities.push('parking');
    if (propertyData.electricity) amenities.push('electricity');
    if (propertyData.internet) amenities.push('internet');
    if (propertyData.security) amenities.push('security');
    if (propertyData.furniture) amenities.push('furniture');
    
    for (let i = 1; i <= 26; i++) {
      const featureKey = `feature${i}`;
      if (propertyData[featureKey]) {
        amenities.push(featureKey);
      }
    }
    
    const stmt = db.prepare(`
      UPDATE properties_houses SET
        title = ?, description = ?, price = ?, currency = ?,
        is_auction = ?, auction_start_date = ?, auction_end_date = ?, auction_starting_price = ?,
        area = ?, living_area = ?, land_area = ?, building_type = ?, bedrooms = ?, bathrooms = ?, 
        floors = ?, year_built = ?,
        location = ?, address = ?, country = ?, city = ?, coordinates = ?,
        amenities = ?, renovation = ?, condition = ?, heating = ?, water_supply = ?, sewerage = ?,
        additional_amenities = ?,
        photos = ?, videos = ?, additional_documents = ?,
        ownership_document = ?, no_debts_document = ?,
        test_drive = ?, test_drive_data = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    return stmt.run(
      propertyData.title,
      propertyData.description || null,
      propertyData.price || null,
      propertyData.currency || 'USD',
      propertyData.is_auction ? 1 : 0,
      propertyData.auction_start_date || null,
      propertyData.auction_end_date || null,
      propertyData.auction_starting_price || null,
      propertyData.area || null,
      propertyData.living_area || null,
      propertyData.land_area || null,
      propertyData.building_type || null,
      (() => {
        // Обрабатываем bedrooms: проверяем на валидность и преобразуем в число
        if (propertyData.bedrooms !== undefined && propertyData.bedrooms !== null && propertyData.bedrooms !== '') {
          const parsedBedrooms = typeof propertyData.bedrooms === 'number' 
            ? propertyData.bedrooms 
            : parseInt(propertyData.bedrooms, 10);
          // Проверяем, что это валидное число (не NaN и конечное)
          if (!isNaN(parsedBedrooms) && isFinite(parsedBedrooms)) {
            return parsedBedrooms;
          }
        }
        return null;
      })(),
      propertyData.bathrooms || null,
      propertyData.floors || null,
      propertyData.year_built || null,
      propertyData.location || null,
      propertyData.address || null,
      propertyData.country || null,
      propertyData.city || null,
      propertyData.coordinates ? JSON.stringify(propertyData.coordinates) : null,
      JSON.stringify(amenities),
      propertyData.renovation || null,
      propertyData.condition || null,
      propertyData.heating || null,
      propertyData.water_supply || null,
      propertyData.sewerage || null,
      propertyData.additional_amenities || null,
      propertyData.photos ? JSON.stringify(propertyData.photos) : null,
      propertyData.videos ? JSON.stringify(propertyData.videos) : null,
      propertyData.additional_documents ? JSON.stringify(propertyData.additional_documents) : null,
      propertyData.ownership_document || null,
      propertyData.no_debts_document || null,
      propertyData.test_drive ? 1 : 0,
      propertyData.test_drive_data ? JSON.stringify(propertyData.test_drive_data) : null,
      id
    );
  },

  /**
   * Удалить дом/виллу
   */
  delete: (id) => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM properties_houses WHERE id = ?');
    return stmt.run(id);
  },

  /**
   * Обновить статус модерации
   */
  updateModerationStatus: (id, status, reviewedBy = null, rejectionReason = null) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE properties_houses 
      SET moderation_status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
      WHERE id = ?
    `);
    return stmt.run(status, reviewedBy, rejectionReason, id);
  },

  /**
   * Забронировать объект на 72 часа
   */
  reserve: (id, userId, purchaseRequestId) => {
    const db = getDatabase();
    const reservedUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // +72 часа
    const stmt = db.prepare(`
      UPDATE properties_houses 
      SET reserved_until = ?, reserved_by = ?, purchase_request_id = ?
      WHERE id = ?
    `);
    return stmt.run(reservedUntil, userId, purchaseRequestId, id);
  },

  /**
   * Снять бронь с объекта
   */
  unreserve: (id) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE properties_houses 
      SET reserved_until = NULL, reserved_by = NULL, purchase_request_id = NULL
      WHERE id = ?
    `);
    return stmt.run(id);
  },

  /**
   * Проверить, забронирован ли объект
   */
  isReserved: (id) => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT reserved_until, reserved_by, purchase_request_id 
      FROM properties_houses 
      WHERE id = ?
    `);
    const result = stmt.get(id);
    
    if (!result || !result.reserved_until) {
      return { isReserved: false };
    }
    
    const reservedUntil = new Date(result.reserved_until);
    const now = new Date();
    
    // Если бронь истекла, автоматически снимаем её
    if (reservedUntil < now) {
      houseQueries.unreserve(id);
      return { isReserved: false };
    }
    
    return {
      isReserved: true,
      reservedUntil: result.reserved_until,
      reservedBy: result.reserved_by,
      purchaseRequestId: result.purchase_request_id,
      timeRemaining: reservedUntil - now
    };
  }
};

// ========== УНИВЕРСАЛЬНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ СО ВСЕЙ НЕДВИЖИМОСТЬЮ ==========

/**
 * Получить всю недвижимость из обеих таблиц (apartments и houses)
 * Объединяет результаты и возвращает в едином формате
 */
export const propertyQueries = {
  /**
   * True если объект относится к "долгам"
   */
  _isDebtProperty: (p) => {
    if (!p) return false;
    const saleType = p.sale_type;
    const isDebt = p.is_debt === 1 || p.is_debt === true;
    const hasDebt = p.has_debt === 1 || p.has_debt === true;
    const severity = p.debt_severity;
    const hasSeverity = severity === 'red' || severity === 'yellow' || severity === 'green';
    return saleType === 'debt' || isDebt || hasDebt || hasSeverity;
  },

  /**
   * Получить все объекты недвижимости с фильтрами
   */
  getAll: (filters = {}, limit = 100, offset = 0) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      // Используем новые таблицы
      const apartments = apartmentQueries.getAll(filters, limit, offset);
      const houses = houseQueries.getAll(filters, limit, offset);
      
      // Объединяем и сортируем по дате создания
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      return allProperties.slice(0, limit);
    } else {
      // Fallback на старую таблицу
      let query = 'SELECT * FROM properties WHERE 1=1';
      const params = [];
      
      if (filters.moderation_status) {
        query += ' AND moderation_status = ?';
        params.push(filters.moderation_status);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const stmt = db.prepare(query);
      return stmt.all(...params);
    }
  },

  /**
   * Получить количество всех объектов
   */
  getCount: (filters = {}) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      let apartmentQuery = 'SELECT COUNT(*) as count FROM properties_apartments WHERE 1=1';
      let houseQuery = 'SELECT COUNT(*) as count FROM properties_houses WHERE 1=1';
      const params = [];
      
      if (filters.moderation_status) {
        apartmentQuery += ' AND moderation_status = ?';
        houseQuery += ' AND moderation_status = ?';
        params.push(filters.moderation_status);
      }
      
      const apartmentCount = db.prepare(apartmentQuery).get(...params).count || 0;
      const houseCount = db.prepare(houseQuery).get(...params).count || 0;
      
      return apartmentCount + houseCount;
    } else {
      // Fallback на старую таблицу
      let query = 'SELECT COUNT(*) as count FROM properties WHERE 1=1';
      const params = [];
      
      if (filters.moderation_status) {
        query += ' AND moderation_status = ?';
        params.push(filters.moderation_status);
      }
      
      const result = db.prepare(query).get(...params);
      return result.count || 0;
    }
  },

  /**
   * Получить объекты конкретного пользователя
   */
  getByUserId: (userId, limit = 50, offset = 0) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      const apartments = apartmentQueries.getByUserId(userId, limit, offset);
      const houses = houseQueries.getByUserId(userId, limit, offset);
      
      // Объединяем и сортируем
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      return allProperties.slice(0, limit);
    } else {
      // Fallback на старую таблицу
      const stmt = db.prepare('SELECT * FROM properties WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
      return stmt.all(userId, limit, offset);
    }
  },

  /**
   * Получить объект по ID (ищет в обеих таблицах)
   */
  getById: (id, propertyType = null) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      // Если известен тип, ищем в конкретной таблице
      if (propertyType === 'apartment' || propertyType === 'commercial') {
        return apartmentQueries.getById(id);
      } else if (propertyType === 'house' || propertyType === 'villa') {
        return houseQueries.getById(id);
      }
      
      // Если тип неизвестен, ищем в обеих таблицах
      let property = apartmentQueries.getById(id);
      if (property) return property;
      
      property = houseQueries.getById(id);
      if (property) return property;
      
      return null;
    } else {
      // Fallback на старую таблицу
      const stmt = db.prepare('SELECT * FROM properties WHERE id = ?');
      return stmt.get(id);
    }
  },

  /**
   * Обновить статус модерации (работает с обеими таблицами)
   */
  updateModerationStatus: (id, status, reviewedBy = null, rejectionReason = null) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      // Сначала пытаемся обновить в таблице apartments
      try {
        const result = apartmentQueries.updateModerationStatus(id, status, reviewedBy, rejectionReason);
        if (result.changes > 0) {
          return result;
        }
      } catch (e) {
        console.log('Не найдено в apartments, пробуем houses');
      }
      
      // Если не нашли в apartments, пробуем houses
      try {
        return houseQueries.updateModerationStatus(id, status, reviewedBy, rejectionReason);
      } catch (e) {
        throw new Error(`Объявление с ID ${id} не найдено ни в одной таблице`);
      }
    } else {
      // Fallback на старую таблицу
      const stmt = db.prepare(`
        UPDATE properties 
        SET moderation_status = ?, 
            reviewed_by = ?, 
            reviewed_at = CURRENT_TIMESTAMP,
            rejection_reason = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      return stmt.run(status, reviewedBy, rejectionReason, id);
    }
  },

  /**
   * Удалить объявление (работает с обеими таблицами)
   */
  delete: (id) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      // Сначала пытаемся удалить из apartments
      try {
        const result = db.prepare('DELETE FROM properties_apartments WHERE id = ?').run(id);
        if (result.changes > 0) {
          return result;
        }
      } catch (e) {
        console.log('Не найдено в apartments, пробуем houses');
      }
      
      // Если не нашли в apartments, пробуем houses
      try {
        return db.prepare('DELETE FROM properties_houses WHERE id = ?').run(id);
      } catch (e) {
        throw new Error(`Объявление с ID ${id} не найдено ни в одной таблице`);
      }
    } else {
      // Fallback на старую таблицу
      return db.prepare('DELETE FROM properties WHERE id = ?').run(id);
    }
  },

  /**
   * Обновить объявление (работает с обеими таблицами)
   */
  update: (id, propertyData) => {
    // Сначала определяем тип объявления
    const property = propertyQueries.getById(id);
    if (!property) {
      throw new Error(`Объявление с ID ${id} не найдено`);
    }
    
    // В зависимости от типа вызываем соответствующий метод
    if (property.property_type === 'apartment' || property.property_type === 'commercial') {
      return apartmentQueries.update(id, propertyData);
    } else if (property.property_type === 'house' || property.property_type === 'villa') {
      return houseQueries.update(id, propertyData);
    } else {
      throw new Error(`Неизвестный тип объявления: ${property.property_type}`);
    }
  },

  /**
   * Получить объекты пользователя с информацией о пользователе
   */
  getUserProperties: (userId) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      // Получаем из обеих таблиц
      const apartmentsStmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'apartments' as source_table
        FROM properties_apartments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `);
      
      const housesStmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'houses' as source_table
        FROM properties_houses p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `);
      
      const apartments = apartmentsStmt.all(userId);
      const houses = housesStmt.all(userId);
      
      // Объединяем и сортируем
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      // Парсим JSON поля
      return allProperties.map(property => {
        if (property.amenities) {
          try {
            property.amenities = JSON.parse(property.amenities);
          } catch (e) {
            property.amenities = [];
          }
        }
        if (property.coordinates) {
          try {
            property.coordinates = JSON.parse(property.coordinates);
          } catch (e) {
            property.coordinates = null;
          }
        }
        if (property.photos) {
          try {
            property.photos = JSON.parse(property.photos);
          } catch (e) {
            property.photos = [];
          }
        }
        if (property.videos) {
          try {
            property.videos = JSON.parse(property.videos);
          } catch (e) {
            property.videos = [];
          }
        }
        if (property.additional_documents) {
          try {
            property.additional_documents = JSON.parse(property.additional_documents);
          } catch (e) {
            property.additional_documents = [];
          }
        }
        if (property.test_drive_data) {
          try {
            property.test_drive_data = JSON.parse(property.test_drive_data);
          } catch (e) {
            property.test_drive_data = null;
          }
        }
        return property;
      });
    } else {
      // Fallback на старую таблицу
      const stmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
      `);
      return stmt.all(userId);
    }
  },

  /**
   * Получить одобренные объекты без аукциона
   */
  getApproved: (propertyType = null) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      let apartmentsQuery = `
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'apartments' as source_table
        FROM properties_apartments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved'
          AND (p.is_auction = 0 OR p.is_auction IS NULL)
          AND (p.sale_type IS NULL OR p.sale_type != 'debt')
          AND (p.is_debt = 0 OR p.is_debt IS NULL)
          AND (p.has_debt = 0 OR p.has_debt IS NULL)
          AND (p.debt_severity IS NULL OR p.debt_severity NOT IN ('red','yellow','green'))
      `;
      
      let housesQuery = `
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'houses' as source_table
        FROM properties_houses p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved'
          AND (p.is_auction = 0 OR p.is_auction IS NULL)
          AND (p.sale_type IS NULL OR p.sale_type != 'debt')
          AND (p.is_debt = 0 OR p.is_debt IS NULL)
          AND (p.has_debt = 0 OR p.has_debt IS NULL)
          AND (p.debt_severity IS NULL OR p.debt_severity NOT IN ('red','yellow','green'))
      `;
      
      const params = [];
      if (propertyType) {
        apartmentsQuery += ' AND p.property_type = ?';
        housesQuery += ' AND p.property_type = ?';
        params.push(propertyType);
      }
      
      apartmentsQuery += ' ORDER BY p.reviewed_at DESC, p.created_at DESC';
      housesQuery += ' ORDER BY p.reviewed_at DESC, p.created_at DESC';
      
      const apartments = db.prepare(apartmentsQuery).all(...params);
      const houses = db.prepare(housesQuery).all(...params);
      
      // Объединяем и сортируем
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        const dateA = new Date(a.reviewed_at || a.created_at);
        const dateB = new Date(b.reviewed_at || b.created_at);
        return dateB - dateA;
      });
      
      // Парсим JSON поля
      return allProperties.map(property => {
        if (property.amenities) property.amenities = JSON.parse(property.amenities);
        if (property.coordinates) property.coordinates = JSON.parse(property.coordinates);
        if (property.photos) property.photos = JSON.parse(property.photos);
        if (property.videos) property.videos = JSON.parse(property.videos);
        if (property.additional_documents) property.additional_documents = JSON.parse(property.additional_documents);
        if (property.test_drive_data) property.test_drive_data = JSON.parse(property.test_drive_data);
        return property;
      });
    } else {
      // Fallback на старую таблицу
      let query = `
        SELECT p.*, 
               u.first_name, u.last_name, u.email, u.phone_number
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved' 
          AND (p.is_auction = 0 OR p.is_auction IS NULL)
          AND (p.sale_type IS NULL OR p.sale_type != 'debt')
          AND (p.is_debt = 0 OR p.is_debt IS NULL)
          AND (p.has_debt = 0 OR p.has_debt IS NULL)
          AND (p.debt_severity IS NULL OR p.debt_severity NOT IN ('red','yellow','green'))
      `;
      
      const params = [];
      if (propertyType) {
        query += ' AND p.property_type = ?';
        params.push(propertyType);
      }
      
      query += ' ORDER BY p.reviewed_at DESC, p.created_at DESC';
      
      return db.prepare(query).all(...params);
    }
  },

  /**
   * Получить объекты-аукционы
   */
  getAuctions: (propertyType = null) => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      let apartmentsQuery = `
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'apartments' as source_table
        FROM properties_apartments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved' 
          AND p.is_auction = 1
          AND p.auction_end_date IS NOT NULL
          AND p.auction_end_date != ''
          AND (p.sale_type IS NULL OR p.sale_type != 'debt')
          AND (p.is_debt = 0 OR p.is_debt IS NULL)
          AND (p.has_debt = 0 OR p.has_debt IS NULL)
          AND (p.debt_severity IS NULL OR p.debt_severity NOT IN ('red','yellow','green'))
      `;
      
      let housesQuery = `
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'houses' as source_table
        FROM properties_houses p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved' 
          AND p.is_auction = 1
          AND p.auction_end_date IS NOT NULL
          AND p.auction_end_date != ''
          AND (p.sale_type IS NULL OR p.sale_type != 'debt')
          AND (p.is_debt = 0 OR p.is_debt IS NULL)
          AND (p.has_debt = 0 OR p.has_debt IS NULL)
          AND (p.debt_severity IS NULL OR p.debt_severity NOT IN ('red','yellow','green'))
      `;
      
      const params = [];
      if (propertyType) {
        apartmentsQuery += ' AND p.property_type = ?';
        housesQuery += ' AND p.property_type = ?';
        params.push(propertyType);
      }
      
      apartmentsQuery += ' ORDER BY p.auction_end_date ASC';
      housesQuery += ' ORDER BY p.auction_end_date ASC';
      
      const apartments = db.prepare(apartmentsQuery).all(...params);
      const houses = db.prepare(housesQuery).all(...params);
      
      // Объединяем и сортируем по дате окончания аукциона
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        return new Date(a.auction_end_date) - new Date(b.auction_end_date);
      });
      
      // Парсим JSON поля
      return allProperties.map(property => {
        if (property.amenities) property.amenities = JSON.parse(property.amenities);
        if (property.coordinates) property.coordinates = JSON.parse(property.coordinates);
        if (property.photos) property.photos = JSON.parse(property.photos);
        if (property.videos) property.videos = JSON.parse(property.videos);
        if (property.additional_documents) property.additional_documents = JSON.parse(property.additional_documents);
        if (property.test_drive_data) property.test_drive_data = JSON.parse(property.test_drive_data);
        return property;
      });
    } else {
      // Fallback на старую таблицу
      let query = `
        SELECT p.*, 
               u.first_name, u.last_name, u.email, u.phone_number
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'approved' 
          AND p.is_auction = 1
          AND p.auction_end_date IS NOT NULL
          AND p.auction_end_date != ''
          AND (p.sale_type IS NULL OR p.sale_type != 'debt')
          AND (p.is_debt = 0 OR p.is_debt IS NULL)
          AND (p.has_debt = 0 OR p.has_debt IS NULL)
          AND (p.debt_severity IS NULL OR p.debt_severity NOT IN ('red','yellow','green'))
      `;
      
      const params = [];
      if (propertyType) {
        query += ' AND p.property_type = ?';
        params.push(propertyType);
      }
      
      query += ' ORDER BY p.auction_end_date ASC';
      
      return db.prepare(query).all(...params);
    }
  },

  /**
   * Получить одобренные объекты-долги (как с аукционом, так и без)
   */
  getDebts: (propertyType = null) => {
    const db = getDatabase();

    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }

    const debtWhere = `
      p.moderation_status = 'approved'
      AND (
        p.sale_type = 'debt'
        OR p.is_debt = 1
        OR p.has_debt = 1
        OR p.debt_severity IN ('red','yellow','green')
      )
    `;

    if (useNewTables) {
      let apartmentsQuery = `
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'apartments' as source_table
        FROM properties_apartments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE ${debtWhere}
      `;

      let housesQuery = `
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'houses' as source_table
        FROM properties_houses p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE ${debtWhere}
      `;

      const params = [];
      if (propertyType) {
        apartmentsQuery += ' AND p.property_type = ?';
        housesQuery += ' AND p.property_type = ?';
        params.push(propertyType);
      }

      apartmentsQuery += ' ORDER BY p.created_at DESC';
      housesQuery += ' ORDER BY p.created_at DESC';

      const apartments = db.prepare(apartmentsQuery).all(...params);
      const houses = db.prepare(housesQuery).all(...params);

      const all = [...apartments, ...houses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return all.map((property) => {
        if (property.amenities) property.amenities = JSON.parse(property.amenities);
        if (property.coordinates) property.coordinates = JSON.parse(property.coordinates);
        if (property.photos) property.photos = JSON.parse(property.photos);
        if (property.videos) property.videos = JSON.parse(property.videos);
        if (property.additional_documents) property.additional_documents = JSON.parse(property.additional_documents);
        if (property.test_drive_data) property.test_drive_data = JSON.parse(property.test_drive_data);
        return property;
      });
    }

    // Fallback на старую таблицу
    let query = `
      SELECT p.*, 
             u.first_name, u.last_name, u.email, u.phone_number
      FROM properties p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE ${debtWhere}
    `;

    const params = [];
    if (propertyType) {
      query += ' AND p.property_type = ?';
      params.push(propertyType);
    }

    query += ' ORDER BY p.created_at DESC';
    return db.prepare(query).all(...params);
  },

  /**
   * Получить объекты на модерации с информацией о пользователе
   */
  getPending: () => {
    const db = getDatabase();
    
    // Проверяем существование новых таблиц
    let useNewTables = false;
    try {
      db.prepare('SELECT 1 FROM properties_apartments LIMIT 1').get();
      db.prepare('SELECT 1 FROM properties_houses LIMIT 1').get();
      useNewTables = true;
    } catch (e) {
      useNewTables = false;
    }
    
    if (useNewTables) {
      // Получаем из обеих таблиц
      const apartmentsStmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'apartments' as source_table
        FROM properties_apartments p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'pending'
        ORDER BY p.created_at DESC
      `);
      
      const housesStmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role,
          'houses' as source_table
        FROM properties_houses p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'pending'
        ORDER BY p.created_at DESC
      `);
      
      const apartments = apartmentsStmt.all();
      const houses = housesStmt.all();
      
      // Объединяем и сортируем
      const allProperties = [...apartments, ...houses].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      // Парсим JSON поля
      return allProperties.map(property => {
        if (property.amenities) {
          try {
            property.amenities = JSON.parse(property.amenities);
          } catch (e) {
            property.amenities = [];
          }
        }
        if (property.coordinates) {
          try {
            property.coordinates = JSON.parse(property.coordinates);
          } catch (e) {
            property.coordinates = null;
          }
        }
        if (property.photos) {
          try {
            property.photos = JSON.parse(property.photos);
          } catch (e) {
            property.photos = [];
          }
        }
        if (property.videos) {
          try {
            property.videos = JSON.parse(property.videos);
          } catch (e) {
            property.videos = [];
          }
        }
        if (property.additional_documents) {
          try {
            property.additional_documents = JSON.parse(property.additional_documents);
          } catch (e) {
            property.additional_documents = [];
          }
        }
        if (property.test_drive_data) {
          try {
            property.test_drive_data = JSON.parse(property.test_drive_data);
          } catch (e) {
            property.test_drive_data = null;
          }
        }
        return property;
      });
    } else {
      // Fallback на старую таблицу
      const stmt = db.prepare(`
        SELECT 
          p.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role
        FROM properties p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.moderation_status = 'pending'
        ORDER BY p.created_at DESC
      `);
      return stmt.all();
    }
  }
};
