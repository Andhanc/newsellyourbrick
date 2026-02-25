const AI_API_URL = "https://api.intelligence.io.solutions/api/v1/chat/completions";
const AI_MODEL = "deepseek-ai/DeepSeek-V3.2";
const AI_API_KEY = "io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6ImE5YzAwNjc4LTFjNzEtNDY5Ny1hY2NiLTliYTU0NTdhMWU4NSIsImV4cCI6NDkyMTI0NDg2NX0.E92VNc-ri_VH1bRLZfJ4seHnvr_hdL0vzgBbRC97WYDaENrvqU-jV1gYxqG128Tvyf8yfEczZ9hfpdKeZ2E0UA";

/** Убирает markdown из текста ответа для чистого отображения */
function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Отправляет запрос к AI для подбора недвижимости
 * @param {Array} conversationHistory - История сообщений чата
 * @param {Object} userPreferences - Предпочтения пользователя (цель, бюджет, локация и т.д.)
 * @param {Array} availableProperties - Доступные объявления недвижимости
 * @returns {Promise<Object>} Ответ от AI с текстом и возможными кнопками
 */
export async function askPropertyAssistant(conversationHistory, userPreferences, availableProperties) {
  // Подсчитываем количество собранной информации
  const collectedInfoCount = Object.values(userPreferences).filter(v => v !== null && v !== '').length
  
  const limitedHistory = conversationHistory.slice(-6);
  
  const systemPrompt = `Ты — профессиональный консультант по недвижимости на платформе SellYourBrick. Твоя задача — помочь клиенту найти идеальный вариант недвижимости через аукцион, рассказать о платформе, процессе покупки, получении ВНЖ и всех деталях сделки.

**О ПЛАТФОРМЕ SELLYOURBRICK:**
SellYourBrick — это уникальная платформа для покупки недвижимости через аукционы в Испании и Дубае. Мы специализируемся на:
- Аукционной продаже недвижимости (виллы, квартиры, апартаменты, дома, земельные участки)
- Прозрачных торгах с фиксированным временем окончания
- Безопасных сделках с полной юридической поддержкой
- Помощи в получении ВНЖ при покупке недвижимости
- Профессиональном консультировании на всех этапах

**КАК РАБОТАЕТ АУКЦИОН:**
1. **Регистрация и верификация**: Пользователь регистрируется на платформе и проходит верификацию документов
2. **Просмотр лотов**: Доступны все активные аукционы с подробной информацией о недвижимости
3. **Размещение ставок**: Участники делают ставки, которые должны быть выше текущей максимальной
4. **Таймер обратного отсчета**: Каждый аукцион имеет фиксированное время окончания (endTime)
5. **Автоматическое продление**: Если ставка сделана в последние минуты, аукцион автоматически продлевается
6. **Победитель**: Участник с самой высокой ставкой на момент окончания аукциона становится покупателем
7. **Оформление сделки**: После победы начинается процесс оформления документов и передачи недвижимости

**ПРЕИМУЩЕСТВА АУКЦИОНОВ:**
- Возможность купить недвижимость по выгодной цене
- Прозрачность процесса торгов
- Фиксированные сроки — нет долгих переговоров
- Честная конкуренция между участниками
- Безопасность сделок через платформу

**ВНЖ В ИСПАНИИ ПРИ ПОКУПКЕ НЕДВИЖИМОСТИ:**
При покупке недвижимости в Испании на сумму от €500,000 можно получить вид на жительство (ВНЖ) по программе "Golden Visa" (Золотая виза):
- **Минимальная сумма**: €500,000 (может быть снижена до €250,000 в некоторых регионах)
- **Тип ВНЖ**: ВНЖ для инвесторов (Residencia por inversión)
- **Преимущества**: 
  - Право жить в Испании
  - Безвизовый въезд в страны Шенгена
  - Возможность получить ПМЖ через 5 лет
  - Воссоединение семьи
- **Документы**: 
  - Договор купли-продажи
  - Справка о регистрации недвижимости
  - Подтверждение оплаты (минимум €500,000)
  - Медицинская страховка
  - Справка о несудимости
  - Справка о доходах
- **Сроки**: Обычно 2-3 месяца после подачи документов

**ВНЖ В ДУБАЕ (ОАЭ) ПРИ ПОКУПКЕ НЕДВИЖИМОСТИ:**
При покупке недвижимости в Дубае можно получить резидентскую визу:
- **Минимальная сумма**: Обычно от 1,000,000 AED (около €250,000)
- **Тип визы**: Резидентская виза инвестора в недвижимость
- **Преимущества**:
  - Право жить в Дубае
  - Открытие банковского счета
  - Регистрация компании (при определенных условиях)
  - Воссоединение семьи (супруг/супруга и дети)
  - Налоговые льготы
- **Документы**:
  - Договор купли-продажи (MOU)
  - Справка о регистрации в DLD (Dubai Land Department)
  - Подтверждение оплаты
  - Медицинская страховка
  - Справка о несудимости
  - Фотографии
  - Медицинское обследование в ОАЭ
- **Сроки**: Обычно 1-2 месяца после покупки
- **Действие визы**: Обычно 2-3 года с возможностью продления

**НЕОБХОДИМЫЕ ДОКУМЕНТЫ ДЛЯ ПОКУПКИ НЕДВИЖИМОСТИ:**

**Общие документы:**
1. **Паспорт** (действующий, с копиями всех страниц)
2. **Документы, подтверждающие личность** (ID карта, водительские права)
3. **Справка о доходах** (за последние 6-12 месяцев)
4. **Выписка с банковского счета** (подтверждение наличия средств)
5. **Справка о несудимости** (из страны происхождения, апостиль)
6. **Медицинская страховка** (действующая в стране покупки)

**Для Испании дополнительно:**
- NIE (Número de Identificación de Extranjero) — налоговый номер иностранца
- Договор купли-продажи (Compraventa)
- Регистрация в реестре недвижимости (Registro de la Propiedad)
- Уплата налогов (ITP — Impuesto sobre Transmisiones Patrimoniales, около 6-10%)
- Нотариальное заверение сделки

**Для Дубая дополнительно:**
- Виза для въезда в ОАЭ
- Договор купли-продажи (MOU) через DLD
- Регистрация в Dubai Land Department
- Уплата регистрационного сбора (4% от стоимости)
- Медицинское обследование в ОАЭ (для получения резидентской визы)

**ПРОЦЕСС ПОКУПКИ НА SELLYOURBRICK:**
1. **Регистрация** → Создание аккаунта и верификация
2. **Выбор недвижимости** → Просмотр доступных лотов
3. **Участие в аукционе** → Размещение ставок
4. **Победа в аукционе** → Получение уведомления о победе
5. **Оформление документов** → Подготовка всех необходимых документов
6. **Оплата** → Перевод средств через безопасный эскроу
7. **Регистрация права собственности** → Оформление в реестре
8. **Получение ключей** → Передача недвижимости

**ТВОЯ РОЛЬ:**
- Помогай клиентам найти подходящую недвижимость через аукцион
- Рассказывай о платформе SellYourBrick и преимуществах аукционов
- Консультируй по вопросам ВНЖ в Испании и Дубае
- Объясняй необходимые документы и процесс покупки
- Задавай уточняющие вопросы для понимания потребностей (минимум 3-4 уточнения, сейчас собрано: ${collectedInfoCount})
- Будь дружелюбным, профессиональным и информативным
- Рекомендуй только недвижимость из доступных объявлений

**ДОСТУПНАЯ НЕДВИЖИМОСТЬ:**
${JSON.stringify(availableProperties.slice(0, 20).map(p => ({
  id: p.id,
  name: (p.name || p.title || `Объявление ${p.id}`).slice(0, 60),
  location: (p.location || 'Локация не указана').slice(0, 40),
  price: p.price || 0,
  currentBid: p.currentBid || null,
  area: p.area || p.sqft || null,
  rooms: p.rooms || p.beds || null,
  isAuction: p.isAuction || false
})), null, 0)}

**ПРЕДПОЧТЕНИЯ КЛИЕНТА:**
${JSON.stringify(userPreferences, null, 0)}

**ПРАВИЛА ОТВЕТОВ:**
1. Если клиент спрашивает о платформе SellYourBrick — расскажи о ней подробно
2. Если спрашивает про аукцион — объясни как он работает
3. Если спрашивает про ВНЖ — дай подробную информацию по Испании и/или Дубаю
4. Если спрашивает про документы — перечисли все необходимые
5. Если хочет подобрать недвижимость — задавай уточняющие вопросы (цель, бюджет, локация, тип)
6. Используй кнопки для быстрого выбора (цель: для себя/под сдачу/инвестиции/ВНЖ)
7. После сбора информации (минимум 3-4 уточнения) рекомендую конкретные объявления
8. В рекомендациях указывай ID объявлений в массиве recommendations
9. Работай только с недвижимостью в Испании и Дубае
10. Отвечай на русском языке
11. Будь информативным, но не слишком длинным
12. При рекомендации учитывай все предпочтения клиента
13. ВСЕГДА уточняй бюджет в ЕВРО (€), не в рублях. Все цены на недвижимость указаны в евро.
14. Если клиент спрашивает про конкретный объект — используй информацию из доступной недвижимости

**ФОРМАТ ОТВЕТА:**
Отвечай ТОЛЬКО в формате JSON (без дополнительного текста):
{
  "text": "Текст ответа",
  "buttons": ["Вариант 1", "Вариант 2"] или null,
  "needsMoreInfo": true/false,
  "recommendations": [1, 2, 3] или null
}

**СТИЛЬ ТЕКСТА (ОБЯЗАТЕЛЬНО):**
- Пиши текст в поле "text" простым языком, без markdown: не используй ** для выделения, не используй ##, -, списки только переносами строк.
- Ответы короткие: 2–4 предложения где возможно, по делу. Без длинных перечислений — только суть.
- Если клиент спрашивает общее (платформа, аукцион, ВНЖ) — дай суть в 3–5 предложениях.

Если нужны уточнения, установи "needsMoreInfo": true и предложи кнопки для выбора.
Если готов дать рекомендации (после 3-4 уточнений), установи "recommendations" с массивом ID объявлений (максимум 5 рекомендаций).
Если клиент задает общий вопрос — установи "needsMoreInfo": false и дай краткий информативный ответ.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...limitedHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }))
  ];

  try {
    console.log('🤖 Отправка запроса к AI сервису...', {
      url: AI_API_URL,
      model: AI_MODEL,
      messagesCount: messages.length
    });

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI_API_KEY}`
    };

    const payload = {
      "model": AI_MODEL,
      "messages": messages,
      "temperature": 0.7,
      "max_tokens": 400
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      
      if (response.status === 401) {
        console.error('🔑 Ошибка авторизации: API ключ недействителен или истек');
        return {
          text: "Ошибка: неверный API ключ. Проверьте настройки AI сервиса.",
          buttons: null,
          needsMoreInfo: false,
          recommendations: null
        };
      }
      
      if (response.status === 429) {
        console.error('⏱️ Превышен лимит запросов к API');
        return {
          text: "Превышен лимит запросов. Пожалуйста, подождите немного и попробуйте снова.",
          buttons: null,
          needsMoreInfo: false,
          recommendations: null
        };
      }
      
      if (response.status >= 500) {
        console.error('🔴 Ошибка сервера AI');
        return {
          text: "Временная ошибка сервера AI. Попробуйте позже.",
          buttons: null,
          needsMoreInfo: false,
          recommendations: null
        };
      }
      
      return {
        text: `Ошибка подключения к AI-сервису (код ${response.status}). Попробуйте позже.`,
        buttons: null,
        needsMoreInfo: false,
        recommendations: null
      };
    }

    const data = await response.json();
    console.log('✅ Получен ответ от AI сервиса:', {
      hasChoices: !!data.choices,
      choicesCount: data.choices?.length || 0
    });

    if (data.choices && data.choices.length > 0) {
      let messageContent = data.choices[0].message?.content || "";
      console.log('📝 Длина ответа:', messageContent.length);

      // Удаляем возможные служебные метки
      while (messageContent.includes("</think>")) {
        messageContent = messageContent.split("</think>").pop().trim();
      }
      messageContent = messageContent.replace(/<\/?redacted_reasoning>/g, "").trim();
      messageContent = messageContent.replace(/<\/?think>/g, "").trim();

      // Пытаемся распарсить JSON из ответа
      try {
        // Ищем JSON в ответе (может быть обернут в markdown код блоки)
        let jsonText = messageContent;
        
        // Удаляем markdown код блоки если есть
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Ищем JSON объект
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Валидируем recommendations - должны быть массивом чисел
          let recommendations = parsed.recommendations;
          if (recommendations && Array.isArray(recommendations)) {
            recommendations = recommendations
              .map(id => {
                const numId = typeof id === 'string' ? parseInt(id, 10) : id;
                return isNaN(numId) ? null : numId;
              })
              .filter(id => id !== null);
          } else {
            recommendations = null;
          }
          
          return {
            text: stripMarkdown(parsed.text || messageContent),
            buttons: Array.isArray(parsed.buttons) ? parsed.buttons : null,
            needsMoreInfo: parsed.needsMoreInfo !== false,
            recommendations: recommendations
          };
        }
      } catch (parseError) {
        console.log("Не удалось распарсить JSON, используем текст как есть:", parseError);
      }

      // Если не удалось распарсить, возвращаем текст
      if (!messageContent || !messageContent.trim()) {
        messageContent = "К сожалению, не удалось получить ответ от AI-сервиса. Попробуйте переформулировать вопрос.";
      }

      return {
        text: stripMarkdown(messageContent),
        buttons: null,
        needsMoreInfo: true,
        recommendations: null
      };
    } else {
      console.error("Unexpected API response format:", data);
      return {
        text: "Не удалось получить ответ от сервиса. Попробуйте позже.",
        buttons: null,
        needsMoreInfo: false,
        recommendations: null
      };
    }
  } catch (error) {
    console.error("❌ AI Service Error:", error);
    console.error("Ошибка детали:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      console.error('⏱️ Запрос прерван по таймауту (45 сек)');
      return {
        text: "Не удалось получить ответ за отведённое время. Упростите вопрос или попробуйте позже.",
        buttons: null,
        needsMoreInfo: false,
        recommendations: null
      };
    }
    
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      console.error('⏱️ Таймаут запроса');
      return {
        text: "Запрос занимает слишком много времени. Попробуйте упростить вопрос.",
        buttons: null,
        needsMoreInfo: false,
        recommendations: null
      };
    }
    
    if (error.message?.includes('Network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
      console.error('🌐 Ошибка сети');
      return {
        text: "Ошибка сети. Проверьте подключение к интернету и попробуйте снова.",
        buttons: null,
        needsMoreInfo: false,
        recommendations: null
      };
    }

    if (error.message?.includes('CORS')) {
      console.error('🚫 Ошибка CORS');
      return {
        text: "Ошибка доступа к сервису. Пожалуйста, сообщите администратору.",
        buttons: null,
        needsMoreInfo: false,
        recommendations: null
      };
    }

    return {
      text: `Произошла ошибка при обработке запроса: ${error.message || 'Неизвестная ошибка'}. Попробуйте позже.`,
      buttons: null,
      needsMoreInfo: false,
      recommendations: null
    };
  }
}

/**
 * Извлекает данные из распознанного текста паспорта с помощью AI
 * @param {string} recognizedText - Текст, распознанный с фото паспорта (OCR)
 * @returns {Promise<Object>} Объект с извлеченными данными паспорта
 */
export async function extractPassportData(recognizedText) {
  const systemPrompt = `Ты специалист по извлечению данных из документов. Твоя задача - проанализировать распознанный текст с фото паспорта и извлечь структурированные данные.

**ТВОЯ РОЛЬ:**
- Анализируй предоставленный текст, распознанный с фото паспорта
- Извлекай максимально много информации для заполнения полей формы пользователя
- Будь точным и аккуратным при извлечении данных

**ПОЛЯ ДЛЯ ИЗВЛЕЧЕНИЯ:**
1. firstName (Имя) - имя владельца паспорта
2. lastName (Фамилия) - фамилия владельца паспорта
3. middleName (Отчество) - отчество, если есть
4. passportSeries (Серия паспорта) - первые 2 цифры серии паспорта
5. passportNumber (Номер паспорта) - номер паспорта (обычно 7 цифр)
6. identificationNumber (Идентификационный номер) - персональный идентификационный номер
7. address (Адрес) - адрес регистрации/проживания
8. email (Email) - если есть в документе

**ВАЖНО:**
- Извлекай только данные, которые точно присутствуют в тексте
- Если поле не найдено, оставляй его пустым (null)
- Для passportSeries извлекай только первые 2 цифры
- Для passportNumber извлекай только цифры (без серии)
- Нормализуй имена и фамилии (первая буква заглавная, остальные строчные)
- Если текст не содержит данных паспорта, верни объект с null значениями

**ФОРМАТ ОТВЕТА:**
Отвечай ТОЛЬКО в формате JSON (без дополнительного текста):
{
  "firstName": "Имя или null",
  "lastName": "Фамилия или null",
  "middleName": "Отчество или null",
  "passportSeries": "XX или null",
  "passportNumber": "XXXXXXX или null",
  "identificationNumber": "XXXXXXXXXXXXX или null",
  "address": "Адрес или null",
  "email": "email@example.com или null"
}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { 
      role: "user", 
      content: `Распознанный текст с фото паспорта:\n\n${recognizedText}\n\nИзвлеки данные в формате JSON.`
    }
  ];

  try {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI_API_KEY}`
    };

    const payload = {
      "model": AI_MODEL,
      "messages": messages,
      "temperature": 0.1 // Низкая температура для более точного извлечения
    };

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error ${response.status}: ${errorText}`);
      throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      let messageContent = data.choices[0].message?.content || "";

      // Удаляем возможные служебные метки
      while (messageContent.includes("</think>")) {
        messageContent = messageContent.split("</think>").pop().trim();
      }
      messageContent = messageContent.replace(/<\/?redacted_reasoning>/g, "").trim();
      messageContent = messageContent.replace(/<\/?think>/g, "").trim();

      // Пытаемся распарсить JSON из ответа
      try {
        let jsonText = messageContent;
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Валидация и нормализация данных
          return {
            firstName: parsed.firstName && parsed.firstName !== 'null' ? parsed.firstName.trim() : null,
            lastName: parsed.lastName && parsed.lastName !== 'null' ? parsed.lastName.trim() : null,
            middleName: parsed.middleName && parsed.middleName !== 'null' ? parsed.middleName.trim() : null,
            passportSeries: parsed.passportSeries && parsed.passportSeries !== 'null' ? parsed.passportSeries.trim() : null,
            passportNumber: parsed.passportNumber && parsed.passportNumber !== 'null' ? parsed.passportNumber.trim() : null,
            identificationNumber: parsed.identificationNumber && parsed.identificationNumber !== 'null' ? parsed.identificationNumber.trim() : null,
            address: parsed.address && parsed.address !== 'null' ? parsed.address.trim() : null,
            email: parsed.email && parsed.email !== 'null' ? parsed.email.trim() : null
          };
        }
      } catch (parseError) {
        console.error("Ошибка парсинга JSON от AI:", parseError);
        throw new Error("Не удалось распарсить ответ от AI");
      }

      throw new Error("AI не вернул валидный JSON");
    } else {
      throw new Error("Неожиданный формат ответа от AI");
    }
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
}

/**
 * Фильтрует недвижимость по Испании и Дубаю
 * @param {Array} properties - Массив всех объявлений
 * @returns {Array} Отфильтрованные объявления
 */
export function filterPropertiesByLocation(properties) {
  return properties.filter(property => {
    const location = property.location?.toLowerCase() || '';
    // Проверяем на Испанию (Spain, España, Tenerife, Costa Adeje, Barcelona, Madrid и т.д.)
    const isSpain = location.includes('spain') || 
                    location.includes('españa') || 
                    location.includes('испания') ||
                    location.includes('tenerife') ||
                    location.includes('costa adeje') ||
                    location.includes('barcelona') ||
                    location.includes('madrid') ||
                    location.includes('valencia') ||
                    location.includes('malaga') ||
                    location.includes('sevilla');
    
    // Проверяем на Дубай (Dubai, Дубай, UAE, ОАЭ)
    const isDubai = location.includes('dubai') || 
                    location.includes('дубай') ||
                    location.includes('uae') ||
                    location.includes('оаэ') ||
                    location.includes('emirates');
    
    return isSpain || isDubai;
  });
}

