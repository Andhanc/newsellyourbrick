# Исправление функции одобрения объектов

хуй тебе

## Проблема
При одобрении апартаментов/квартир система возвращает объекты из неправильной таблицы (дома/виллы) из-за дубликатов ID.

## Решение

### 1. Фронтенд уже исправлен ✅
Файл `src/components/admin/Moderation.jsx` уже отправляет `property_type` в запросе.

### 2. Исправление сервера

В файле `server/server.js` на строке **6278** замените:

**Было:**
```javascript
const { reviewed_by } = req.body;

// Используем функцию из propertyQueries, которая работает с новыми таблицами
const property = propertyQueries.getById(id);
if (!property) {
  return res.status(404).json({ success: false, error: 'Объявление не найдено' });
}

console.log(`✅ Одобрение объявления ID: ${id}, Тип: ${property.property_type}, Аукцион: ${property.is_auction}`);
```

**Должно быть:**
```javascript
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
```

## Что это исправляет

1. ✅ Фронтенд теперь отправляет `property_type` при одобрении
2. ✅ Сервер использует переданный `property_type` для поиска объекта в правильной таблице
3. ✅ Добавлена проверка соответствия типов для предотвращения ошибок
4. ✅ Улучшено логирование для отладки

После применения этих изменений перезапустите сервер.
