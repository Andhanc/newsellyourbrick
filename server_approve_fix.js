// ИСПРАВЛЕННЫЙ КОД ДЛЯ ФУНКЦИИ ОДОБРЕНИЯ
// Замените строки 6278-6286 в server/server.js на этот код:

    const { reviewed_by, property_type: requestedPropertyType } = req.body;

    // ВАЖНО: Если property_type передан в запросе, используем его для получения правильного объекта
    // Это предотвращает получение объекта из неправильной таблицы при дубликатах ID
    let property = null;
    if (requestedPropertyType) {
      console.log(`🔍 Одобрение: получен property_type=${requestedPropertyType} из запроса, используем для поиска`);
      property = propertyQueries.getById(id, requestedPropertyType);
      if (!property) {
        console.warn(`⚠️ Одобрение: объект ID=${id} не найден с типом ${requestedPropertyType}, пробуем без типа`);
        property = propertyQueries.getById(id);
      }
    } else {
      property = propertyQueries.getById(id);
    }
    
    if (!property) {
      return res.status(404).json({ success: false, error: 'Объявление не найдено' });
    }
    
    // Дополнительная проверка: если был передан тип, убеждаемся что он совпадает
    if (requestedPropertyType && property.property_type !== requestedPropertyType) {
      console.error(`❌ Одобрение: КРИТИЧЕСКАЯ ОШИБКА! Запрошен тип ${requestedPropertyType}, но получен ${property.property_type}`);
      console.error(`   Source table: ${property.source_table || 'unknown'}`);
      return res.status(400).json({ 
        success: false, 
        error: `Несоответствие типов: запрошен ${requestedPropertyType}, но найден ${property.property_type}` 
      });
    }

    console.log(`✅ Одобрение объявления ID: ${id}, Тип: ${property.property_type}, Аукцион: ${property.is_auction}, Source: ${property.source_table || 'unknown'}`);
