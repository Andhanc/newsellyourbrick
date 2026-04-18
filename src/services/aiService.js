import { getApiBaseUrlSync } from '../utils/apiConfig'

const AI_API_URL = "https://api.intelligence.io.solutions/api/v1/chat/completions";
const AI_MODEL = "deepseek-ai/DeepSeek-V3.2";
/** Запасной ключ из репозитория; провайдер может отозвать его — задайте ключ в .env или на сервере */
const LEGACY_INTELLIGENCE_IO_API_KEY =
  "io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6ImE5YzAwNjc4LTFjNzEtNDY5Ny1hY2NiLTliYTU0NTdhMWU4NSIsImV4cCI6NDkyMTI0NDg2NX0.E92VNc-ri_VH1bRLZfJ4seHnvr_hdL0vzgBbRC97WYDaENrvqU-jV1gYxqG128Tvyf8yfEczZ9hfpdKeZ2E0UA";

/** Убирает переносы/пробелы из ключа, префикс Bearer, лишние кавычки (частая ошибка в UI хостинга). */
function normalizeIntelligenceIoKey(raw) {
  if (raw == null) return ''
  let s = String(raw).trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  if (s.toLowerCase().startsWith('bearer ')) s = s.slice(7).trim()
  s = s.replace(/\r\n/g, '').replace(/\n/g, '').replace(/\s/g, '')
  return s
}

function getIntelligenceIoApiKey() {
  const v = import.meta.env.VITE_INTELLIGENCE_IO_API_KEY
  const trimmed = normalizeIntelligenceIoKey(v)
  return trimmed || LEGACY_INTELLIGENCE_IO_API_KEY
}

/** В браузере запросы идут на POST /api/ai/intelligence-chat — ключ подставляет Node (runtime). */
function useServerIntelligenceProxy() {
  return typeof window !== 'undefined'
}

function getChatCompletionsUrl() {
  if (useServerIntelligenceProxy()) {
    return `${getApiBaseUrlSync()}/ai/intelligence-chat`
  }
  return AI_API_URL
}

function buildIntelligenceRequestHeaders() {
  const h = { 'Content-Type': 'application/json' }
  if (!useServerIntelligenceProxy()) {
    h.Authorization = `Bearer ${getIntelligenceIoApiKey()}`
  }
  return h
}

function isIntelligenceProxyActive() {
  return useServerIntelligenceProxy()
}

async function postIntelligenceChat(payload, init = {}) {
  return fetch(getChatCompletionsUrl(), {
    method: 'POST',
    headers: buildIntelligenceRequestHeaders(),
    body: JSON.stringify(payload),
    ...init,
  })
}

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
 * Запасная эвристика, если классификатор недоступен или ответил false при явном запросе менеджера.
 */
export function heuristicManagerContactIntent(userMessage) {
  const raw = (userMessage || '').trim();
  if (raw.length < 5) return false;
  const t = raw.toLowerCase();

  if (
    /\b(не\s+нужен|не\s+хочу|не\s+надо|не\s+связывайте|без\s+менеджера|без\s+оператора)\b/i.test(t) &&
    /\b(менеджер|оператор|консультант|специалист)\b/i.test(t)
  ) {
    return false;
  }

  const patterns = [
    /связ(ать|и|итесь|ься)\s+(с\s+)?(менеджер|оператор|консультант|специалист|жив(ым|ого|ому)|человек(ом|а|у))/u,
    /(соедин|переключ)\s+(с\s+)?(менеджер|оператор|консультант)/u,
    /(менеджер|оператор|консультант|специалист).{0,40}(позвон|перезвон|напиш|связ|свяж)/u,
    /(позвон|перезвон|напиш|связ).{0,40}(менеджер|оператор|консультант|специалист)/u,
    /(хочу|нужен|нужна|нужно|можно)\s+(жив(ого|ой|ым)|реальн(ого|ый|ым)|не\s+бот)/u,
    /(остав(ить|лю)|заявк).{0,30}(звон|менеджер|оператор|связ)/u,
    /(перезвон|обратн(ый|ого)\s+звонок|call\s*back)/u,
    /\b(human|live)\s+(agent|operator|person|support)\b/i,
    /\b(connect|speak|talk)\s+(to|with)\s+(a\s+)?(manager|agent|operator|human|person|representative)\b/i,
    /\b(call|contact)\s+me.{0,20}(manager|agent|human)\b/i,
    /(kann|könnte).{0,30}(manager|berater|menschen|anruf)/i,
    /(quiero|necesito).{0,30}(gerente|manager|humano|persona)/i,
  ];

  return patterns.some((re) => re.test(t));
}

/**
 * Определяет, просит ли пользователь связи с живым менеджером/оператором (любая формулировка).
 * Сначала короткий запрос к модели; при false или сбое — эвристика.
 */
export async function detectManagerContactIntent(userMessage) {
  const text = (userMessage || '').trim();
  if (text.length < 4) return false;

  const systemPrompt = `Ты классификатор намерений. Пользователь пишет в чат поддержки недвижимости.
Ответь ТОЛЬКО JSON без текста вокруг: {"wantsManager":true} или {"wantsManager":false}

wantsManager = true, если человек хочет связаться с менеджером, оператором, живым человеком, консультантом компании; просит перезвонить, оставить заявку на звонок, написать менеджеру, соединить с сотрудником, позвать специалиста, говорить не с ботом.
wantsManager = false для вопросов о недвижимости, аукционах, ВНЖ, ценах, подборе объектов, приветствий, выбора цели («для себя»), уточнений и общих вопросов без запроса живого менеджера.
wantsManager = false если пользователь только выбирает способ связи (по телефону, по почте, WhatsApp) как ответ на вопрос бота — это не новый запрос менеджера.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text }
  ];

  try {
    const payload = {
      model: AI_MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 80
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const response = await postIntelligenceChat(payload, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) return heuristicManagerContactIntent(userMessage);

    const data = await response.json();
    let messageContent = data.choices?.[0]?.message?.content || '';
    while (messageContent.includes('</think>')) {
      messageContent = messageContent.split('</think>').pop().trim();
    }
    messageContent = messageContent.replace(/<\/?redacted_reasoning>/g, '').trim();
    messageContent = messageContent.replace(/<\/?think>/g, '').trim();
    messageContent = messageContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return heuristicManagerContactIntent(userMessage);
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.wantsManager === true) return true;
    return heuristicManagerContactIntent(userMessage);
  } catch (e) {
    console.warn('detectManagerContactIntent:', e?.message || e);
    return heuristicManagerContactIntent(userMessage);
  }
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
      url: getChatCompletionsUrl(),
      model: AI_MODEL,
      messagesCount: messages.length
    });

    const payload = {
      "model": AI_MODEL,
      "messages": messages,
      "temperature": 0.7,
      "max_tokens": 400
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await postIntelligenceChat(payload, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status}:`, errorText);
      
      if (response.status === 503) {
        console.error('🔑 Intelligence.io: ключ не задан на сервере (прокси)')
        return {
          text: 'Ошибка: на сервере не задан ключ Intelligence.io. В переменных окружения Node укажите INTELLIGENCE_IO_API_KEY или VITE_INTELLIGENCE_IO_API_KEY и перезапустите сервер.',
          buttons: null,
          needsMoreInfo: false,
          recommendations: null
        };
      }

      if (response.status === 401) {
        console.error('🔑 Ошибка авторизации: API ключ недействителен или истек');
        return {
          text: isIntelligenceProxyActive()
            ? 'Ошибка: ключ Intelligence.io отклонён провайдером или неверен. Проверьте значение INTELLIGENCE_IO_API_KEY / VITE_INTELLIGENCE_IO_API_KEY в переменных сервера (одна строка, без переносов и без слова Bearer), перезапустите сервер.'
            : 'Ошибка: сервер AI отклонил ключ. Укажите актуальный ключ в VITE_INTELLIGENCE_IO_API_KEY (.env) и пересоберите фронт.',
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
    const payload = {
      "model": AI_MODEL,
      "messages": messages,
      "temperature": 0.1 // Низкая температура для более точного извлечения
    };

    const response = await postIntelligenceChat(payload);

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
 * Улучшает черновик описания объявления через тот же AI API, что и умный помощник.
 * @param {string} draftText - Текст черновика от продавца
 * @param {string} [title] - Название объекта (опционально)
 * @returns {Promise<string>} Готовое описание без markdown
 */
export async function generateListingDescription(draftText, title = '') {
  const systemPrompt = `Ты — опытный копирайтер объявлений о недвижимости на платформе SellYourBrick (аукционы в Испании и Дубае).
По черновику продавца напиши улучшенное, продающее описание лота.
- Сохрани все факты из черновика; не придумывай площадь, цену, адрес и характеристики, которых не было в тексте.
- Стиль: профессионально, по делу, без воды.
- Не используй markdown: не ставь **, ##, звёздочки для выделения, нумерованные списки с префиксами.
- Пиши на том же языке, что и черновик.
Ответь только текстом описания, без заголовков вроде «Описание:» и без пояснений.`;

  const userParts = []
  if (title && String(title).trim()) {
    userParts.push(`Название объекта: ${String(title).trim()}`)
  }
  userParts.push(`Черновик описания:\n${draftText}`)

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userParts.join('\n\n') }
  ]

  const payload = {
    model: AI_MODEL,
    messages,
    temperature: 0.65,
    max_tokens: 900
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000)

  try {
    const response = await postIntelligenceChat(payload, {
      signal: controller.signal
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`generateListingDescription API ${response.status}:`, errorText)
      let detail = ''
      try {
        const j = JSON.parse(errorText)
        detail = String(j.detail || '')
      } catch {
        /* не JSON */
      }
      const invalidKey =
        response.status === 401 ||
        response.status === 403 ||
        /invalid\s*api\s*key/i.test(detail)
      if (invalidKey) {
        throw new Error('GENERATE_LISTING_INVALID_API_KEY')
      }
      throw new Error(`AI API Error: ${response.status}`)
    }

    const data = await response.json()
    if (!data.choices?.length) {
      throw new Error('Пустой ответ от AI')
    }

    let messageContent = data.choices[0].message?.content || ''

    while (messageContent.includes('</think>')) {
      messageContent = messageContent.split('</think>').pop().trim()
    }
    messageContent = messageContent.replace(/<\/?redacted_reasoning>/g, '').trim()
    messageContent = messageContent.replace(/<\/?think>/g, '').trim()

    const out = stripMarkdown(messageContent).trim()
    if (!out) {
      throw new Error('Пустое описание в ответе')
    }
    return out
  } catch (error) {
    console.error('generateListingDescription:', error)
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Фильтрует недвижимость по Испании и Дубаю
 * @param {Array} properties - Массив всех объявлений
 * @returns {Array} Отфильтрованные объявления
 */
function parseCompareAnalysisJson(messageContent) {
  let text = messageContent || ''
  while (text.includes('</redacted_thinking>')) {
    text = text.split('</redacted_thinking>').pop().trim()
  }
  text = text.replace(/<\/?redacted_reasoning>/g, '').trim()
  text = text.replace(/<\/?think>/g, '').trim()
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    return JSON.parse(jsonMatch[0])
  } catch (_) {
    return null
  }
}

/**
 * Сравнение двух объектов: инфраструктура и локация (общие знания модели).
 * @param {object} propertyLeft — сериализованные поля левого объекта
 * @param {object} propertyRight — сериализованные поля правого
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ summary: string, rows: Array<{ aspect: string, left: string, right: string, winner: 'left'|'right'|'tie'|'unknown' }> }>}
 */
export async function askPropertyCompareAssistant(propertyLeft, propertyRight, options = {}) {
  const { signal } = options
  const payloadJson = JSON.stringify(
    { object_left: propertyLeft, object_right: propertyRight },
    null,
    0
  )

  const systemPrompt = `Ты консультант по недвижимости SellYourBrick. Пользователь сравнивает ДВА конкретных объекта.
Тебе переданы структурированные данные object_left и object_right (адрес, локация, характеристики).

Задача:
1) Кратко (4–8 предложений) дай вывод: для кого какой вариант может подойти лучше, нюансы локации. Пиши простым русским, без markdown (** ## списков с -).
2) Сформируй таблицу сравнения по ОКРУЖЕНИЮ и инфраструктуре рядом с каждым адресом. Используй общеизвестные факты о районе/городе по указанной локации. Если точных данных нет — пиши честно: «нет данных», «вероятно», «нужно уточнить на карте», не выдумывай конкретные названия клиник, если не уверен.

Обязательно включи строки (можно объединить смежное, но не пропускай темы полностью):
— Повседневные удобства (магазины, аптеки, кафе рядом): есть/нет, примерно как близко
— Поликлиники / амбулатории
— Больницы / экстренная помощь
— Школы и детсады
— Транспорт (общественный, до аэропорта если уместно)
— Парки и зелёные зоны
— Море / пляж / набережная (если по локации уместно; иначе «не применимо»)
— Зоны отдыха, набережные, променады
— Достопримечательности и развлечения рядом

Для КАЖДОЙ строки таблицы укажи winner — кто выгоднее по этому критерию для типичного покупателя жилья:
- "left" если заметно лучше object_left
- "right" если заметно лучше object_right  
- "tie" если примерно равно или оба слабые/оба сильные
- "unknown" если нельзя сравнить

Ответ ТОЛЬКО один JSON-объект без текста вокруг:
{
  "summary": "текст",
  "rows": [
    { "aspect": "краткое название строки", "left": "текст по левому объекту", "right": "текст по правому", "winner": "left" }
  ]
}

Поле aspect — короткая подпись строки на русском. left/right — содержательное описание (есть/нет, как далеко: пешком, 5–10 мин, несколько км и т.д.).`

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Сравни два объекта недвижимости по данным ниже и верни JSON как указано.\n\n${payloadJson}`,
    },
  ]

  const payload = {
    model: AI_MODEL,
    messages,
    temperature: 0.45,
    max_tokens: 3200,
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90000)
  const externalSignal = signal
  const onExternalAbort = () => controller.abort()
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
  }

  try {
    const response = await postIntelligenceChat(payload, {
      signal: controller.signal,
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error('askPropertyCompareAssistant API:', response.status, errText)
      throw new Error(`AI ${response.status}`)
    }

    const data = await response.json()
    let messageContent = data.choices?.[0]?.message?.content || ''
    const parsed = parseCompareAnalysisJson(messageContent)

    if (parsed && typeof parsed.summary === 'string' && Array.isArray(parsed.rows)) {
      const rows = parsed.rows
        .filter((r) => r && typeof r.aspect === 'string')
        .map((r) => {
          const w = String(r.winner || 'unknown').toLowerCase()
          const winner =
            w === 'left' || w === 'right' || w === 'tie' || w === 'unknown' ? w : 'unknown'
          return {
            aspect: r.aspect.trim(),
            left: String(r.left != null ? r.left : '—').trim() || '—',
            right: String(r.right != null ? r.right : '—').trim() || '—',
            winner,
          }
        })
      return {
        summary: stripMarkdown(parsed.summary.trim()),
        rows,
      }
    }

    return {
      summary: stripMarkdown(
        messageContent.trim() ||
          'Не удалось разобрать ответ ИИ. Попробуйте обновить анализ позже.'
      ),
      rows: [],
    }
  } catch (error) {
    if (error.name === 'AbortError') throw error
    console.error('askPropertyCompareAssistant:', error)
    throw error
  } finally {
    clearTimeout(timeoutId)
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort)
  }
}

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

