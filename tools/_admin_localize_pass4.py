#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pass 4: curated exact replacements for remaining admin UI Cyrillic."""
from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src/components/admin"
LEGACY = ROOT / "apps/client/src/legacy/components/admin"
LOCALE_DIRS = [
    ROOT / "src/i18n/locales/mainPage",
    ROOT / "apps/client/src/legacy/i18n/locales/mainPage",
]
LOCALES = ["ru", "en", "de", "es", "fr", "pl", "sv"]

TR = str.maketrans(
    {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
        "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
        "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
        "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch",
        "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
        "А": "a", "Б": "b", "В": "v", "Г": "g", "Д": "d", "Е": "e", "Ё": "e",
        "Ж": "zh", "З": "z", "И": "i", "Й": "y", "К": "k", "Л": "l", "М": "m",
        "Н": "n", "О": "o", "П": "p", "Р": "r", "С": "s", "Т": "t", "У": "u",
        "Ф": "f", "Х": "h", "Ц": "c", "Ч": "ch", "Ш": "sh", "Щ": "sch",
        "Ъ": "", "Ы": "y", "Ь": "", "Э": "e", "Ю": "yu", "Я": "ya",
    }
)

# Exact old_snippet -> (ru_for_key, en)  OR use callable via special markers
# For simple: replace Russian literal with t('key')
EXACT: list[tuple[str, str, str]] = [
    # WhatsApp
    ("Запросить новый QR", "Запросить новый QR", "Request new QR"),
    ("Генерируем QR-код…", "Генерируем QR-код…", "Generating QR code…"),
    ("Обычно 30–90 секунд (холодный старт Chrome). Страница обновляет статус каждые 2 с.", "Обычно 30–90 секунд (холодный старт Chrome). Страница обновляет статус каждые 2 с.", "Usually 30–90 seconds (cold Chrome start). The page refreshes status every 2s."),
    ("QR готов — сканируйте сейчас.", "QR готов — сканируйте сейчас.", "QR ready — scan now."),
    ("Загрузка WA Web:", "Загрузка WA Web:", "WA Web loading:"),
    ("Папка сессии (.wwebjs_auth):", "Папка сессии (.wwebjs_auth):", "Session folder (.wwebjs_auth):"),
    ("Последний QR на сервере:", "Последний QR на сервере:", "Last QR on server:"),
    ("Сообщение для рассылки", "Сообщение для рассылки", "Broadcast message"),
    ("Выбрать всех (", "Выбрать всех (", "Select all ("),
    ("Снять выделение", "Снять выделение", "Clear selection"),
    ("Отправить (", "Отправить (", "Send ("),
    ("Выбрано:", "Выбрано:", "Selected:"),
    ("Показать всех пользователей", "Показать всех пользователей", "Show all users"),
    ("Вставить CSV или загрузите файл", "Вставьте CSV или загрузите файл", "Paste CSV or upload a file"),
    ("Вставьте CSV или загрузите файл", "Вставьте CSV или загрузите файл", "Paste CSV or upload a file"),
    ("Выбрать файл", "Выбрать файл", "Choose file"),
    ("Импортировать", "Импортировать", "Import"),
    ("Очистить", "Очистить", "Clear"),
    ("Активные", "Активные", "Active"),
    ("Все пользователи", "Все пользователи", "All users"),
    ("Мессенджер", "Мессенджер", "Messenger"),
    # Moderation property
    ("Долги по коммунальным услугам", "Долги по коммунальным услугам", "Utility debts"),
    ("Залог у банка", "Залог у банка", "Bank mortgage"),
    ("Неоплаченные налоги на имущество", "Неоплаченные налоги на имущество", "Unpaid property taxes"),
    ("Арест / ограничения", "Арест / ограничения", "Seizure / restrictions"),
    ("Долги наследодателя", "Долги наследодателя", "Deceased’s debts"),
    ("Долги перед третьими лицами", "Долги перед третьими лицами", "Debts to third parties"),
    ("Отклонить", "Отклонить", "Reject"),
    ("Опубликовать объявление", "Опубликовать объявление", "Publish listing"),
    ("Отклонить объявление", "Отклонить объявление", "Reject listing"),
    ("Изменения в объявлении", "Изменения в объявлении", "Listing changes"),
    ("Изменений не обнаружено", "Изменений не обнаружено", "No changes found"),
    ("Одобрить и перевести", "Одобрить и перевести", "Approve and translate"),
    ("Сначала переведём текст на все языки сайта, затем опубликуем объект.", "Сначала переведём текст на все языки сайта, затем опубликуем объект.", "We will first translate the text into all site languages, then publish the property."),
    ("Объект не будет опубликован. Владелец получит уведомление об отклонении.", "Объект не будет опубликован. Владелец получит уведомление об отклонении.", "The property will not be published. The owner will receive a rejection notice."),
    ("Документы на недвижимость", "Документы на недвижимость", "Property documents"),
    ("Открыть ссылку", "Открыть ссылку", "Open link"),
    # SEO
    ("OG image — картинка превью (URL)", "OG image — картинка превью (URL)", "OG image — preview image (URL)"),
    ("Формат Twitter / Telegram card", "Формат Twitter / Telegram card", "Twitter / Telegram card format"),
    ("Включить эту страницу в sitemap.xml", "Включить эту страницу в sitemap.xml", "Include this page in sitemap.xml"),
    ("Приоритет (0.0 – 1.0)", "Приоритет (0.0 – 1.0)", "Priority (0.0 – 1.0)"),
    ("Как часто меняется", "Как часто меняется", "Change frequency"),
    ("Запросить обновление sitemap", "Запросить обновление sitemap", "Request sitemap refresh"),
    ("Шаблон Title", "Шаблон Title", "Title template"),
    ("Шаблон Description", "Шаблон Description", "Description template"),
    ("Шаблон H1", "Шаблон H1", "H1 template"),
    ("Сохранить шаблон", "Сохранить шаблон", "Save template"),
    ("Добавить", "Добавить", "Add"),
    ("Скачать CSV", "Скачать CSV", "Download CSV"),
    ("Управляйте тем, как сайт выглядит в Google и в соцсетях", "Управляйте тем, как сайт выглядит в Google и в соцсетях", "Control how the site looks in Google and social media"),
    ("Разделы", "Разделы", "Sections"),
    # User detail
    ("Разблокировать", "Разблокировать", "Unblock"),
    ("Заблокировать", "Заблокировать", "Block"),
    ("Дата:", "Дата:", "Date:"),
    ("Версия политики:", "Версия политики:", "Policy version:"),
    ("Загружен:", "Загружен:", "Uploaded:"),
    ("Причина отклонения:", "Причина отклонения:", "Rejection reason:"),
    # CRM
    ("Касаний (действия):", "Касаний (действия):", "Touches (actions):"),
    ("В «продажах»:", "В «продажах»:", "In «sales»:"),
    ("избранных объектов:", "избранных объектов:", "favorite properties:"),
    ("Отправить на", "Отправить на", "Send to"),
    # Test drive
    ("Занято", "Занято", "Booked"),
    ("Сегодня", "Сегодня", "Today"),
    ("Продавец", "Продавец", "Seller"),
    ("Автоотправка (план):", "Автоотправка (план):", "Auto-send (planned):"),
    ("Факт WA:", "Факт WA:", "WA actual:"),
    ("План WA после выезда:", "План WA после выезда:", "WA plan after checkout:"),
    ("Сообщение с ссылкой на опрос уже отправлено в WhatsApp.", "Сообщение с ссылкой на опрос уже отправлено в WhatsApp.", "Survey link message already sent via WhatsApp."),
    ("Сообщение с ссылкой на оценку после проживания уже отправлено в WhatsApp.", "Сообщение с ссылкой на оценку после проживания уже отправлено в WhatsApp.", "Post-stay rating link already sent via WhatsApp."),
    ("Нет подтверждённых броней с рассылкой опроса по этому объекту (статус «Подтверждено» у\n                            владельца).", "Нет подтверждённых броней с рассылкой опроса по этому объекту (статус «Подтверждено» у владельца).", "No confirmed bookings with survey broadcast for this property (owner status «Confirmed»)."),
    ("Нет броней с токеном пост-отзыва по этому объекту (оплаченные / подтверждённые появятся после\n                            синхронизации).", "Нет броней с токеном пост-отзыва по этому объекту (оплаченные / подтверждённые появятся после синхронизации).", "No bookings with a post-feedback token for this property (paid/confirmed appear after sync)."),
    # Objects / auctions
    ("Перейти к объекту", "Перейти к объекту", "Go to property"),
    ("Смотреть еще", "Смотреть еще", "Show more"),
    ("История ставок", "История ставок", "Bid history"),
    ("Открыть карточку на сайте", "Открыть карточку на сайте", "Open listing on site"),
    ("Нет доступных аукционов", "Нет доступных аукционов", "No auctions available"),
    ("Победитель будет отображён после фиксации в системе", "Победитель будет отображён после фиксации в системе", "Winner will appear after it is recorded in the system"),
    ("Минимальная цена продажи:", "Минимальная цена продажи:", "Minimum sale price:"),
    ("Стартовая сумма ставки:", "Стартовая сумма ставки:", "Starting bid amount:"),
    ("Продавец:", "Продавец:", "Seller:"),
    # Clients
    ("Клиенты: CRM и мессенджеры", "Клиенты: CRM и мессенджеры", "Clients: CRM and messengers"),
    ("Все зарегистрированные пользователи подтягиваются в воронку автоматически (по одной карточке на\n          аккаунт). Воронка, касания и письма; отдельно — WhatsApp.", "Все зарегистрированные пользователи подтягиваются в воронку автоматически (по одной карточке на аккаунт). Воронка, касания и письма; отдельно — WhatsApp.", "All registered users appear in the funnel automatically (one card per account). Funnel, touches and emails; WhatsApp separately."),
    ("CRM воронка", "CRM воронка", "CRM funnel"),
    ("Получатель:", "Получатель:", "Recipient:"),
    ("Отправка...", "Отправка...", "Sending..."),
    ("символов", "символов", "characters"),
    # Addition
    ("Выберите продавца, которому будет присвоен создаваемый объект.", "Выберите продавца, которому будет присвоен создаваемый объект.", "Select the seller who will own the new property."),
    ("Выберите пользователя", "Выберите пользователя", "Select a user"),
    ("Сменить", "Сменить", "Change"),
    # Private club long desc parts
    ("Участники с активным сроком в базе (vip_until) или активной подпиской VIP в Stripe. «Исключить» обнуляет даты в\n          БД; если остаётся только Stripe VIP, кнопка недоступна — отмена подписки в Stripe.", "Участники с активным сроком в базе (vip_until) или активной подпиской VIP в Stripe. «Исключить» обнуляет даты в БД; если остаётся только Stripe VIP, кнопка недоступна — отмена подписки в Stripe.", "Members with an active period in the database (vip_until) or an active Stripe VIP subscription. «Remove» clears DB dates; if only Stripe VIP remains, the button is disabled — cancel the Stripe subscription."),
    ("период до", "период до", "period until"),
    # Access
    ("Нет администраторов. Создайте первого администратора.", "Нет администраторов. Создайте первого администратора.", "No administrators. Create the first one."),
    # Debt reasons
    ("Список причин (видов долга), которые продавец может выбрать при добавлении объекта «Долги». Порядок отображения задаётся полем «Порядок».", "Список причин (видов долга), которые продавец может выбрать при добавлении объекта «Долги». Порядок отображения задаётся полем «Порядок».", "List of debt reasons sellers can pick when adding a «Debts» property. Display order is set by the «Order» field."),
    ("Добавить причину", "Добавить причину", "Add reason"),
    # Storage
    ("Импортировать в хранилище", "Импортировать в хранилище", "Import to storage"),
    ("Откройте сайт хранилища, чтобы увидеть таблицу.", "Откройте сайт хранилища, чтобы увидеть таблицу.", "Open the storage site to see the table."),
    ("Откатить", "Откатить", "Rollback"),
    # Operations / payments
    ("Все платежи", "Все платежи", "All payments"),
    ("Платежи Stripe", "Платежи Stripe", "Stripe payments"),
    ("Покупки", "Покупки", "Purchases"),
    ("Нет операций покупок", "Нет операций покупок", "No purchase operations"),
    ("Нет истории операций с акциями", "Нет истории операций с акциями", "No share operations history"),
    ("История акций", "История акций", "Shares history"),
    ("Новые сверху", "Новые сверху", "Newest first"),
    # Promotions leftovers
    ("Ожидают", "Ожидают", "Pending"),
    ("Публикация", "Публикация", "Publication"),
    ("Редактирование", "Редактирование", "Editing"),
    ("Недвижимость", "Недвижимость", "Real estate"),
    # Users list leftovers already mostly done
    ("Заблокированы", "Заблокированы", "Blocked"),
    ("Одобрены", "Одобрены", "Approved"),
    # Chat leftovers
    ("Данные профиля в базе (аккаунт на сайте).", "Данные профиля в базе (аккаунт на сайте).", "Profile data in the database (site account)."),
    ("Уточните поиск.", "Уточните поиск.", "Refine your search."),
    ("Показаны", "Показаны", "Showing"),
]

# Template / interpolated exact source replacements (full match including code)
CODE_SUBS: list[tuple[str, str, dict[str, str]]] = [
    (
        "Ошибка: {whatsappStatus.waDiag.lastError}",
        "{t('admin_errorPrefix')}{whatsappStatus.waDiag.lastError}",
        {},
    ),
    (
        "Ошибка: {error}",
        "{t('admin_errorPrefix')}{error}",
        {},
    ),
    (
        "Состояние: {whatsappStatus.waDiag.connectionState ?? '—'} · Попыток init:{' '}",
        "{t('admin_wa_state_attempts', { state: whatsappStatus.waDiag.connectionState ?? '—' })}{' '}",
        {
            "admin_wa_state_attempts": {
                "ru": "Состояние: {{state}} · Попыток init:",
                "en": "State: {{state}} · Init attempts:",
            }
        },
    ),
    (
        "{whatsappStatus.waDiag.initAttempts ?? '—'} · Длина кода пары:{' '}",
        "{t('admin_wa_init_pair_len', { n: whatsappStatus.waDiag.initAttempts ?? '—' })}{' '}",
        {
            "admin_wa_init_pair_len": {
                "ru": "{{n}} · Длина кода пары:",
                "en": "{{n}} · Pair code length:",
            }
        },
    ),
    (
        "Автосбросов сессии без QR: {whatsappStatus.waDiag.autoRecoverCount}",
        "{t('admin_wa_auto_recover', { n: whatsappStatus.waDiag.autoRecoverCount })}",
        {
            "admin_wa_auto_recover": {
                "ru": "Автосбросов сессии без QR: {{n}}",
                "en": "Session auto-resets without QR: {{n}}",
            }
        },
    ),
    (
        "<span>{property.area} м²</span>",
        "<span>{t('admin_area_m2', { n: property.area })}</span>",
        {"admin_area_m2": {"ru": "{{n}} м²", "en": "{{n}} m²"}},
    ),
    (
        "<span>Комнат: {property.rooms}</span>",
        "<span>{t('admin_rooms_count', { n: property.rooms })}</span>",
        {"admin_rooms_count": {"ru": "Комнат: {{n}}", "en": "Rooms: {{n}}"}},
    ),
    (
        "<div>Начало: {new Date(property.auction_start_date).toLocaleDateString('ru-RU')}</div>",
        "<div>{t('admin_start_colon')} {new Date(property.auction_start_date).toLocaleDateString()}</div>",
        {"admin_start_colon": {"ru": "Начало:", "en": "Start:"}},
    ),
    (
        "<div>Окончание: {new Date(property.auction_end_date).toLocaleDateString('ru-RU')}</div>",
        "<div>{t('admin_end_colon')} {new Date(property.auction_end_date).toLocaleDateString()}</div>",
        {"admin_end_colon": {"ru": "Окончание:", "en": "End:"}},
    ),
    (
        "Фотографии ({images.length})",
        "{t('admin_photos_count', { n: images.length })}",
        {"admin_photos_count": {"ru": "Фотографии ({{n}})", "en": "Photos ({{n}})"}},
    ),
    (
        "Видео ({videos.length})",
        "{t('admin_videos_count', { n: videos.length })}",
        {"admin_videos_count": {"ru": "Видео ({{n}})", "en": "Videos ({{n}})"}},
    ),
    (
        "{len} симв. · рекомендуется {ideal}",
        "{t('admin_seo_chars_ideal', { len, ideal })}",
        {
            "admin_seo_chars_ideal": {
                "ru": "{{len}} симв. · рекомендуется {{ideal}}",
                "en": "{{len}} chars · recommended {{ideal}}",
            }
        },
    ),
    (
        "Открыть полный список ({pagesMeta.total})",
        "{t('admin_seo_open_full_list', { n: pagesMeta.total })}",
        {
            "admin_seo_open_full_list": {
                "ru": "Открыть полный список ({{n}})",
                "en": "Open full list ({{n}})",
            }
        },
    ),
    (
        "<span className=\"seo-panel__muted\">Найдено: {pagesMeta.total}</span>",
        "<span className=\"seo-panel__muted\">{t('admin_found_count', { n: pagesMeta.total })}</span>",
        {"admin_found_count": {"ru": "Найдено: {{n}}", "en": "Found: {{n}}"}},
    ),
    (
        "<h3 className=\"section-title\">Резервы 10% ({user.reservationPurchases.length})</h3>",
        "<h3 className=\"section-title\">{t('admin_reserves10_count', { n: user.reservationPurchases.length })}</h3>",
        {
            "admin_reserves10_count": {
                "ru": "Резервы 10% ({{n}})",
                "en": "10% reserves ({{n}})",
            }
        },
    ),
    (
        "<h3 className=\"section-title\">Покупки долей ({user.sharePurchases.length})</h3>",
        "<h3 className=\"section-title\">{t('admin_share_purchases_count', { n: user.sharePurchases.length })}</h3>",
        {
            "admin_share_purchases_count": {
                "ru": "Покупки долей ({{n}})",
                "en": "Share purchases ({{n}})",
            }
        },
    ),
    (
        "<span>Документы на верификацию ({documents.length})</span>",
        "<span>{t('admin_docs_for_verification', { n: documents.length })}</span>",
        {
            "admin_docs_for_verification": {
                "ru": "Документы на верификацию ({{n}})",
                "en": "Documents for verification ({{n}})",
            }
        },
    ),
    (
        "Страница объекта <FiExternalLink size={14} aria-hidden />",
        "{t('admin_property_page')} <FiExternalLink size={14} aria-hidden />",
        {"admin_property_page": {"ru": "Страница объекта", "en": "Property page"}},
    ),
    (
        "Календарь записи <FiCalendar size={14} aria-hidden />",
        "{t('admin_booking_calendar')} <FiCalendar size={14} aria-hidden />",
        {
            "admin_booking_calendar": {
                "ru": "Календарь записи",
                "en": "Booking calendar",
            }
        },
    ),
    (
        "Статус check-in: {card.checkInStatus} · отправлено:{' '}",
        "{t('admin_td_checkin_status', { status: card.checkInStatus })}{' '}",
        {
            "admin_td_checkin_status": {
                "ru": "Статус check-in: {{status}} · отправлено:",
                "en": "Check-in status: {{status}} · sent:",
            }
        },
    ),
    (
        "· вложено фото: <strong>{card.photoTotal}</strong>",
        "{t('admin_td_photos_attached', { n: card.photoTotal })}",
        {
            "admin_td_photos_attached": {
                "ru": "· вложено фото: {{n}}",
                "en": "· photos attached: {{n}}",
            }
        },
    ),
    (
        "`${oldPhotos.length} фото`",
        "t('admin_photos_n', { n: oldPhotos.length })",
        {"admin_photos_n": {"ru": "{{n}} фото", "en": "{{n}} photos"}},
    ),
    (
        "`${newPhotos.length} фото`",
        "t('admin_photos_n', { n: newPhotos.length })",
        {"admin_photos_n": {"ru": "{{n}} фото", "en": "{{n}} photos"}},
    ),
    (
        "window.prompt('Тема звонка / результат')",
        "window.prompt(t('admin_crm_prompt_call'))",
        {
            "admin_crm_prompt_call": {
                "ru": "Тема звонка / результат",
                "en": "Call topic / result",
            }
        },
    ),
    (
        "window.prompt('Текст заметки')",
        "window.prompt(t('admin_crm_prompt_note'))",
        {"admin_crm_prompt_note": {"ru": "Текст заметки", "en": "Note text"}},
    ),
    (
        "window.prompt('WhatsApp / мессенджер')",
        "window.prompt(t('admin_crm_prompt_messenger'))",
        {
            "admin_crm_prompt_messenger": {
                "ru": "WhatsApp / мессенджер",
                "en": "WhatsApp / messenger",
            }
        },
    ),
    (
        "<FiDownload /> Скачать CSV",
        "<FiDownload /> {t('admin_download_csv')}",
        {"admin_download_csv": {"ru": "Скачать CSV", "en": "Download CSV"}},
    ),
    (
        "<FaDownload /> Скачать CSV",
        "<FaDownload /> {t('admin_download_csv')}",
        {"admin_download_csv": {"ru": "Скачать CSV", "en": "Download CSV"}},
    ),
]


def slug(ru: str, used: set[str]) -> str:
    h = hashlib.sha1(ru.encode()).hexdigest()[:8]
    words = re.findall(r"[A-Za-zА-Яа-яЁё0-9]+", ru)[:4]
    hint = "_".join(w.translate(TR) for w in words)[:36]
    hint = re.sub(r"[^a-z0-9_]", "", hint) or "str"
    base = f"admin_{hint}_{h}"
    key = base
    n = 2
    while key in used:
        key = f"{base}_{n}"
        n += 1
    used.add(key)
    return key


def merge_keys(entries: dict[str, dict[str, str]]) -> int:
    added = 0
    for loc_dir in LOCALE_DIRS:
        for loc in LOCALES:
            path = loc_dir / f"{loc}.json"
            data = json.loads(path.read_text(encoding="utf-8"))
            changed = False
            for key, vals in entries.items():
                val = vals.get("ru") if loc == "ru" else (vals.get(loc) or vals.get("en") or vals.get("ru"))
                if val is None:
                    continue
                if data.get(key) != val:
                    data[key] = val
                    changed = True
                    added += 1
            if changed:
                path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return added


def main() -> None:
    ru_json = json.loads((LOCALE_DIRS[0] / "ru.json").read_text(encoding="utf-8"))
    ru_to = {}
    used = set()
    for k, v in ru_json.items():
        if k.startswith("admin_") and isinstance(v, str):
            used.add(k)
            ru_to.setdefault(v, k)

    entries: dict[str, dict[str, str]] = {}

    def key_for(ru: str, en: str) -> str:
        if ru in ru_to:
            k = ru_to[ru]
        else:
            k = slug(ru, used)
            ru_to[ru] = k
        entries[k] = {"ru": ru, "en": en}
        return k

    total = 0
    for path in sorted(SRC.glob("*.jsx")):
        text = path.read_text(encoding="utf-8")
        orig = text
        # CODE_SUBS first (longer / more specific)
        for old, new, extra in CODE_SUBS:
            if old in text:
                text = text.replace(old, new)
                total += 1
                for ek, ev in extra.items():
                    entries[ek] = ev
                    used.add(ek)

        for old, ru, en in sorted(EXACT, key=lambda x: len(x[0]), reverse=True):
            if old not in text:
                continue
            # skip if already wrapped as t('...') containing this as value only in locales
            k = key_for(ru, en)
            # Replace as JSX text or string carefully
            # 1) string literals
            for q in ("'", '"'):
                lit = q + old + q
                if lit in text:
                    parts = text.split(lit)
                    rebuilt = [parts[0]]
                    for part in parts[1:]:
                        left = rebuilt[-1]
                        line_start = left.rfind("\n") + 1
                        prefix = left[line_start:]
                        if "console." in prefix or prefix.strip().startswith("//"):
                            rebuilt.append(lit + part)
                        elif left.rstrip().endswith("t("):
                            rebuilt.append(lit + part)
                        else:
                            rebuilt.append(f"t('{k}')" + part)
                            total += 1
                    text = "".join(rebuilt)
            # 2) bare JSX occurrences (not inside t already)
            # replace " OLD" patterns that aren't already {t(
            needle = old
            idx = 0
            while True:
                i = text.find(needle, idx)
                if i < 0:
                    break
                before = text[max(0, i - 3) : i]
                if before.endswith("t('") or before.endswith('t("') or before.endswith("t(`"):
                    idx = i + len(needle)
                    continue
                # check line
                ls = text.rfind("\n", 0, i) + 1
                le = text.find("\n", i)
                if le < 0:
                    le = len(text)
                line = text[ls:le]
                if "console." in line or line.strip().startswith("//") or "{/*" in line:
                    idx = i + len(needle)
                    continue
                # If already {t('key')} for this content nearby skip
                if re.search(r"\{t\('[^']+'\)\}", before[-20:]):
                    idx = i + len(needle)
                    continue
                # Replace bare text with {t('key')}
                text = text[:i] + "{t('%s')}" % k + text[i + len(needle) :]
                total += 1
                idx = i + len(k) + 6

        if text != orig:
            path.write_text(text, encoding="utf-8")
            print("updated", path.name)
        else:
            print("unchanged", path.name)

    for path in sorted(SRC.glob("*.jsx")):
        shutil.copy2(path, LEGACY / path.name)

    added = merge_keys(entries)
    print(f"subs≈{total} locale_writes≈{added} entries={len(entries)}")


if __name__ == "__main__":
    main()
