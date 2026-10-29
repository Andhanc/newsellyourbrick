#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pass 2: localize remaining admin UI Cyrillic across src + legacy mirrors."""
from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_ADMIN = ROOT / "src/components/admin"
LEGACY_ADMIN = ROOT / "apps/client/src/legacy/components/admin"
SRC_PANEL = ROOT / "src/admin/AdminPanelPage.jsx"
LEGACY_PANEL = ROOT / "apps/client/src/legacy/admin/AdminPanelPage.jsx"

LOCALE_DIRS = [
    ROOT / "src/i18n/locales/mainPage",
    ROOT / "apps/client/src/legacy/i18n/locales/mainPage",
]
LOCALES = ["ru", "en", "de", "es", "fr", "pl", "sv"]

MOCK_NAMES = {
    "Петр",
    "Петров",
    "Иванович",
    "Мария",
    "Иванова",
    "Сергеевна",
    "Сергей",
    "Волков",
    "Александрович",
    "Анна Сидорова",
    "Петр Петров",
    "Анна",
    "Сидорова",
    "Квартира в центре города",
    "Вилла на берегу моря",
    "Дом в тихом районе",
    "Прекрасная квартира с видом на океан",
    "Роскошная вилла с бассейном",
    "Договор купли-продажи",
    "Лицензия",
    "Российская Федерация",
}

# Manual EN for strings not yet keyed (pass2 unmapped)
EN_MAP: dict[str, str] = {
    "ID в базе": "Database ID",
    "WA рассылка": "WA broadcast",
    "Администратор": "Administrator",
    "Администратор успешно обновлен": "Administrator updated successfully",
    "Администратор успешно создан": "Administrator created successfully",
    "Администратор успешно удален": "Administrator deleted successfully",
    "Активна": "Active",
    "Активный участник": "Active member",
    "Акция": "Promotion",
    "Апартаменты/коммерческая": "Apartments / commercial",
    "Аукцион завершён": "Auction ended",
    "Аукционные": "Auction",
    "Без имени": "No name",
    "Ближайшие аукционы": "Upcoming auctions",
    "Бронь / объект": "Booking / property",
    "Видео в TikTok #sellyoubrick": "TikTok video #sellyoubrick",
    "Владелец объекта": "Property owner",
    "Все цены": "All prices",
    "Всего баллов": "Total points",
    "Всего пользователей:": "Total users:",
    "Вы уверены, что хотите одобрить этого пользователя? Все его документы будут одобрены, и пользователь получит статус верифицированного.": "Are you sure you want to approve this user? All their documents will be approved and the user will become verified.",
    "Вы уверены, что хотите отклонить этого пользователя? Все его документы будут отклонены.": "Are you sure you want to reject this user? All their documents will be rejected.",
    "Вы уверены, что хотите удалить этого администратора?": "Are you sure you want to delete this administrator?",
    "Вы уверены, что хотите удалить эту акцию?": "Are you sure you want to delete this promotion?",
    "Выберите чат для начала общения": "Select a chat to start messaging",
    "Выберите чат из списка слева, чтобы начать переписку": "Choose a chat from the list on the left to start the conversation",
    "Выйти": "Log out",
    "Выставлено объектов:": "Listed properties:",
    "Гость": "Guest",
    "Готов помочь с вопросами по админ-панели": "Ready to help with admin panel questions",
    "Готово.": "Done.",
    "Дата начала": "Start date",
    "Дата окончания": "End date",
    "Дата оплаты": "Payment date",
    "Дата покупки": "Purchase date",
    "Депозит €": "Deposit €",
    "Детали": "Details",
    "Диалоги": "Conversations",
    "До 500 000 $": "Up to $500,000",
    "Добавить причину долга": "Add debt reason",
    "Документы не предоставлены": "Documents not provided",
    "Другой документ": "Other document",
    "Есть диалог": "Conversation exists",
    "Ещё нет диалога — можно написать первым": "No conversation yet — you can write first",
    "Завершён": "Completed",
    "Загрузка аукционов…": "Loading auctions…",
    "Загрузка объектов...": "Loading properties...",
    "Загрузка пользователей…": "Loading users…",
    "Загрузка продавцов...": "Loading sellers...",
    "Загрузка ставок…": "Loading bids…",
    "Исключить": "Remove",
    "История операций": "Operations history",
    "Категория:": "Category:",
    "Клиенты / CRM": "Clients / CRM",
    "Код": "Code",
    "Код (латиница, для связи с формой)": "Code (Latin, for form linking)",
    "Куплено объектов:": "Purchased properties:",
    "Меню разделов": "Sections menu",
    "Мин. цена": "Min. price",
    "Название (рус) *": "Name (RU) *",
    "Название акции": "Promotion name",
    "Найдено:": "Found:",
    "Написать первым": "Write first",
    "Написать пользователю…": "Message user…",
    "Написать сообщение…": "Write a message…",
    "Не удалось загрузить список продавцов": "Failed to load sellers list",
    "Не удалось получить ответ от AI. Попробуйте ещё раз.": "Could not get an AI response. Please try again.",
    "Необходимо указать username и пароль": "Username and password are required",
    "Нет активного срока в БД — только Stripe VIP или доступ уже снят": "No active period in DB — Stripe VIP only or access already removed",
    "Нет активных аукционов по текущим фильтрам.": "No active auctions for the current filters.",
    "Нет активных участников.": "No active members.",
    "Нет доступа": "No access",
    "Нет завершённых аукционов по текущим фильтрам.": "No completed auctions for the current filters.",
    "Нет зарегистрированных пользователей": "No registered users",
    "Нет заявок на проверке.": "No submissions under review.",
    "Нет контактов": "No contacts",
    "Нет платежей тест-драйва с опросами": "No test-drive payments with surveys",
    "Нет причин долга. Добавьте первую.": "No debt reasons. Add the first one.",
    "Нет резервов 10%": "No 10% reserves",
    "Нет чатов в этом фильтре": "No chats in this filter",
    "Новая акция": "New promotion",
    "Обновлена": "Updated",
    "Обычные": "Regular",
    "Описание отсутствует": "No description",
    "Оплата": "Payment",
    "Опрос": "Survey",
    "Осталось": "Remaining",
    "От 1 000 000 $": "From $1,000,000",
    "Ответы (кратко)": "Answers (summary)",
    "Открываем диалог…": "Opening conversation…",
    "Открыть диалог": "Open conversation",
    "Отправить полный снимок базы во внешнее хранилище? Пароли и данные карт в снимке маскируются.": "Send a full database snapshot to external storage? Passwords and card data are masked in the snapshot.",
    "Офлайн": "Offline",
    "Ошибка при сохранении": "Error while saving",
    "Ошибка при сохранении администратора": "Error while saving administrator",
    "Ошибка при удалении": "Error while deleting",
    "Ошибка при удалении администратора": "Error while deleting administrator",
    "Пароль *": "Password *",
    "Паспорт + лицо": "Passport + face",
    "План": "Plan",
    "По этому лоту ставок пока нет.": "No bids for this lot yet.",
    "Поддержка": "Support",
    "Пока нет платежей": "No payments yet",
    "Полное имя": "Full name",
    "Пользователь": "User",
    "Порядок": "Order",
    "Порядок отображения": "Display order",
    "Пост в Instagram #sellyoubrick": "Instagram post #sellyoubrick",
    "Потрачено баллов": "Points spent",
    "Права доступа:": "Access permissions:",
    "Преаукцион": "Pre-auction",
    "Привет! Я Умный помощник. Готов помочь с любыми вопросами по работе админ-панели!": "Hi! I'm the Smart Assistant. Ready to help with any admin panel questions!",
    "Причина": "Reason",
    "Причины долга": "Debt reasons",
    "Проверьте ссылки пользователей и одобрите или отклоните заявки.": "Review user links and approve or reject submissions.",
    "Продажа": "Sale",
    "Произошла ошибка при обращении к AI. Попробуйте позже.": "An error occurred while contacting AI. Please try later.",
    "Профиль в базе": "Profile in database",
    "Редактирование акции": "Edit promotion",
    "Редактировать администратора": "Edit administrator",
    "Редактировать причину долга": "Edit debt reason",
    "Роль SEO": "SEO role",
    "Самый ближайший аукцион": "Nearest auction",
    "Селфи": "Selfie",
    "Снять статус в БД (vip_until, vip_granted_at)": "Clear status in DB (vip_until, vip_granted_at)",
    "Создана": "Created",
    "Создать администратора": "Create administrator",
    "Ссылка в описании профиля": "Link in profile bio",
    "Ссылка в посте в Instagram": "Link in Instagram post",
    "Ставки — нажмите": "Bids — click",
    "Стартовая цена:": "Starting price:",
    "Статус:": "Status:",
    "Сумма покупки": "Purchase amount",
    "Супер-админ": "Super admin",
    "Текущая ставка:": "Current bid:",
    "Тип продажи:": "Sale type:",
    'У вас пока нет акций. Создайте первую акцию, нажав кнопку "Новая акция"': 'You have no promotions yet. Create the first one with the "New promotion" button',
    "Удалена": "Deleted",
    "Удаление акции": "Delete promotion",
    "Удалить эту причину долга? Она может использоваться в объявлениях.": "Delete this debt reason? It may be used in listings.",
    "Укажите название причины долга": "Enter the debt reason name",
    "Укажите причину отклонения (необязательно):": "Enter rejection reason (optional):",
    "Управление акциями": "Promotions management",
    "Управление доступами": "Access management",
    "Участник": "Participant",
    "Фото пользователя": "User photo",
    "Чаты": "Chats",
    "да": "yes",
    "дней": "days",
    "и": "and",
    "мин": "min",
    "ожидает": "pending",
    "отправлено": "sent",
    "сек": "sec",
    "только что": "just now",
    "часов": "hours",
    # Extra common leftovers discovered in harder files
    "Экспорт в excel": "Export to Excel",
    "Закрытый клуб": "Private club",
    "Умный помощник": "Smart assistant",
    "Добавление": "Addition",
    "Объекты": "Properties",
    "Аукционы": "Auctions",
    "Тест-драйв": "Test drive",
    "Причина долга": "Debt reason",
    "Необходимые документы": "Required documents",
    "Запросы на покупку": "Purchase requests",
    "Бонусные задания": "Bonus tasks",
    "Тестирование": "Testing",
    "Доступы": "Access",
    "Хранилище": "Storage",
    "Модерация": "Moderation",
    "Статистика": "Statistics",
    "Пользователи": "Users",
    "Всё просмотрено": "Mark all viewed",
    "Просмотрено": "Mark viewed",
    "Календарь": "Calendar",
    "Проверка качества": "Quality check",
    "Объявления": "Listings",
    "Отмены": "Cancellations",
    "Занято": "Booked",
    "Сегодня": "Today",
    "Подсвечены все даты внутри интервала брони (включительно).": "All dates inside the booking interval are highlighted (inclusive).",
    "Нет заполненных анкет по этому объекту.": "No completed surveys for this property.",
    "Продавец": "Seller",
    "Положительных:": "Positive:",
    "Отрицательных:": "Negative:",
    "Пока нет оценок после выезда по этому объекту.": "No post-stay ratings for this property yet.",
    "Отправлено:": "Sent:",
    "Опрос при проживании": "In-stay survey",
    "Завершение брони": "Booking completion",
    "Непросмотренных отмен:": "Unseen cancellations:",
    "Нет бронирований.": "No bookings.",
    "Создано:": "Created:",
    "Страница объекта": "Property page",
    "Календарь записи": "Booking calendar",
    "Обновить": "Refresh",
    "период до": "period until",
    "Лот #": "Lot #",
    "Ставки:": "Bids:",
    "Сумма": "Amount",
    "Дата": "Date",
    "Текущие": "Current",
    "Завершённые": "Completed",
    "Старт:": "Start:",
    "· Купить сейчас:": "· Buy now:",
    "Открыть карточку на сайте": "Open listing on site",
    "История ставок": "Bid history",
    "Нет доступных аукционов": "No auctions available",
    "Победитель будет отображён после фиксации в системе": "Winner will appear after it is recorded in the system",
    "Номер телефона": "Phone number",
    "Сообщение": "Message",
    "символов": "characters",
    "Получатель:": "Recipient:",
    "Отправка...": "Sending...",
    "Отправить": "Send",
    "Клиенты: CRM и мессенджеры": "Clients: CRM and messengers",
    "CRM воронка": "CRM funnel",
    "Роль:": "Role:",
    "Покупатели": "Buyers",
    "Продавцы": "Sellers",
    "На модерации": "Pending moderation",
    "Одобрены": "Approved",
    "Заблокированы": "Blocked",
    "Загрузка пользователей...": "Loading users...",
    "Пользователи не найдены": "No users found",
    "Заблокирован": "Blocked",
    "Регистрация:": "Registered:",
    "Одобрен": "Approved",
    "Загрузка...": "Loading...",
    "Нет администраторов. Создайте первого администратора.": "No administrators. Create the first one.",
    "Действия": "Actions",
    "Чат": "Chat",
    "SEO-кабинет": "SEO cabinet",
    "Редактор": "Editor",
    "Маркетолог": "Marketer",
    "Админ SEO": "SEO admin",
    "Отмена": "Cancel",
    "Создать": "Create",
    "Выберите продавца, которому будет присвоен создаваемый объект.": "Select the seller who will own the new property.",
    "Выберите пользователя": "Select a user",
    "Сменить": "Change",
    "Данные профиля в базе (аккаунт на сайте).": "Profile data in the database (site account).",
    "Имя": "Name",
    "Онлайн": "Online",
    "Участник VIP Club": "VIP Club member",
    "Клиент": "Client",
    "Показаны": "Showing",
    "из": "of",
    "Уточните поиск.": "Refine your search.",
    "мин назад": "min ago",
    "Нет сообщений": "No messages",
    "Тел.:": "Tel.:",
    "Страна:": "Country:",
    "Объект #": "Property #",
    "Тип:": "Type:",
    "Все типы": "All types",
    "Дома": "Houses",
    "Квартиры": "Apartments",
    "Виллы": "Villas",
    "Цена:": "Price:",
    "Минимальная цена продажи:": "Minimum sale price:",
    "Стартовая сумма ставки:": "Starting bid amount:",
    "Перейти к объекту": "Go to property",
    "Смотреть еще": "Show more",
    "Закрытый клуб": "Private club",
}

string_re = re.compile(
    r"""(['"])((?:(?!\1)[^\\]|\\.)*?[А-Яа-яЁё](?:(?!\1)[^\\]|\\.)*)\1"""
)
jsx_re = re.compile(r">(\s*)([^<>{}\n]*[А-Яа-яЁё][^<>{}\n]*?)(\s*)<")
cyr_re = re.compile(r"[А-Яа-яЁё]")
tmpl_re = re.compile(
    r"`((?:[^`$]|\\`)*?[А-Яа-яЁё](?:[^`$]|\\`)*)`"
)

TR = str.maketrans(
    {
        "а": "a",
        "б": "b",
        "в": "v",
        "г": "g",
        "д": "d",
        "е": "e",
        "ё": "e",
        "ж": "zh",
        "з": "z",
        "и": "i",
        "й": "y",
        "к": "k",
        "л": "l",
        "м": "m",
        "н": "n",
        "о": "o",
        "п": "p",
        "р": "r",
        "с": "s",
        "т": "t",
        "у": "u",
        "ф": "f",
        "х": "h",
        "ц": "c",
        "ч": "ch",
        "ш": "sh",
        "щ": "sch",
        "ъ": "",
        "ы": "y",
        "ь": "",
        "э": "e",
        "ю": "yu",
        "я": "ya",
        "А": "a",
        "Б": "b",
        "В": "v",
        "Г": "g",
        "Д": "d",
        "Е": "e",
        "Ё": "e",
        "Ж": "zh",
        "З": "z",
        "И": "i",
        "Й": "y",
        "К": "k",
        "Л": "l",
        "М": "m",
        "Н": "n",
        "О": "o",
        "П": "p",
        "Р": "r",
        "С": "s",
        "Т": "t",
        "У": "u",
        "Ф": "f",
        "Х": "h",
        "Ц": "c",
        "Ч": "ch",
        "Ш": "sh",
        "Щ": "sch",
        "Ъ": "",
        "Ы": "y",
        "Ь": "",
        "Э": "e",
        "Ю": "yu",
        "Я": "ya",
    }
)


def should_skip_line(line: str) -> bool:
    s = line.strip()
    if s.startswith("//") or s.startswith("*") or s.startswith("/*"):
        return True
    if "console." in line:
        return True
    return False


def strip_trailing_comment(line: str) -> str:
    """Remove // comments outside of strings (best-effort)."""
    out = []
    i = 0
    in_q = None
    while i < len(line):
        ch = line[i]
        if in_q:
            out.append(ch)
            if ch == "\\" and i + 1 < len(line):
                out.append(line[i + 1])
                i += 2
                continue
            if ch == in_q:
                in_q = None
            i += 1
            continue
        if ch in "'\"`":
            in_q = ch
            out.append(ch)
            i += 1
            continue
        if ch == "/" and i + 1 < len(line) and line[i + 1] == "/":
            break
        out.append(ch)
        i += 1
    return "".join(out)


def slug_key(ru: str, used: set[str]) -> str:
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


def ensure_i18n(text: str) -> str:
    if "from 'react-i18next'" not in text and 'from "react-i18next"' not in text:
        text = re.sub(
            r"(import React[^\n]*\n)",
            r"\1import { useTranslation } from 'react-i18next';\n",
            text,
            count=1,
        )
    if "useTranslation()" not in text:
        patterns = [
            r"(export default function \w+\([^)]*\) \{)",
            r"(const \w+ = \(\{[^}]*\}\) => \{)",
            r"(const \w+ = \(\) => \{)",
            r"(function \w+\([^)]*\) \{)",
        ]
        for pat in patterns:
            m = re.search(pat, text)
            if m:
                insert_at = m.end()
                text = (
                    text[:insert_at]
                    + "\n  const { t } = useTranslation();"
                    + text[insert_at:]
                )
                break
    return text


def build_ru_to_key() -> tuple[dict[str, str], dict[str, dict[str, str]], set[str]]:
    ru_json = json.loads(
        (LOCALE_DIRS[0] / "ru.json").read_text(encoding="utf-8")
    )
    en_json = json.loads(
        (LOCALE_DIRS[0] / "en.json").read_text(encoding="utf-8")
    )
    ru_to_key: dict[str, str] = {}
    entries: dict[str, dict[str, str]] = {}
    used: set[str] = set()

    # Prefer shorter / more semantic admin_ keys without hash when duplicate RU values
    items = [
        (k, v)
        for k, v in ru_json.items()
        if k.startswith("admin_") and isinstance(v, str)
    ]
    items.sort(key=lambda kv: (0 if re.search(r"_[0-9a-f]{8}$", kv[0]) else -1, len(kv[0])))
    for key, ru in items:
        used.add(key)
        if ru not in ru_to_key:
            ru_to_key[ru] = key
            entries[key] = {
                "ru": ru,
                "en": en_json.get(key) if isinstance(en_json.get(key), str) else EN_MAP.get(ru, ru),
            }

    # Prefer known panel keys for sidebar
    preferred = {
        "Статистика": "admin_panel_statistics",
        "Пользователи": "admin_panel_users",
        "Модерация": "admin_panel_moderation",
        "Объекты": "admin_panel_objects",
        "Аукционы": "admin_panel_auctions",
        "Клиенты / CRM": "admin_panel_clients",
        "Запросы на покупку": "admin_panel_purchase_requests",
        "Тестирование": "admin_panel_testing",
        "Доступы": "admin_panel_access",
        "Хранилище": "admin_panel_storage",
        "SEO": "admin_panel_seo",
        "WhatsApp": "admin_panel_whatsapp",
    }
    for ru, key in preferred.items():
        if key in ru_json:
            ru_to_key[ru] = key
            entries[key] = {
                "ru": ru_json[key],
                "en": en_json.get(key, EN_MAP.get(ru, ru)),
            }

    return ru_to_key, entries, used


def resolve(
    ru: str,
    ru_to_key: dict[str, str],
    entries: dict[str, dict[str, str]],
    used: set[str],
) -> str:
    if ru in ru_to_key:
        return ru_to_key[ru]
    key = slug_key(ru, used)
    en = EN_MAP.get(ru, ru)
    ru_to_key[ru] = key
    entries[key] = {"ru": ru, "en": en}
    return key


def collect_from_text(text: str) -> list[str]:
    collected: list[str] = []
    for line in text.splitlines():
        if should_skip_line(line):
            continue
        work = strip_trailing_comment(line)
        if not cyr_re.search(work):
            continue
        for m in string_re.finditer(work):
            s = m.group(2)
            if s in MOCK_NAMES or "${" in s:
                continue
            if "{" in s or "}" in s:
                continue
            collected.append(s)
        for m in jsx_re.finditer(work):
            s = m.group(2).strip()
            if not s or s in MOCK_NAMES:
                continue
            if "{" in s or "}" in s:
                continue
            if s.startswith("}}") or "/>" in s or "</" in s:
                continue
            collected.append(s)
    return collected


def replace_in_text(
    text: str,
    ru_to_key: dict[str, str],
    collected: list[str],
) -> tuple[str, int]:
    text = ensure_i18n(text)
    replacements = 0
    for ru in sorted(set(collected), key=len, reverse=True):
        key = ru_to_key[ru]
        for q in ("'", '"'):
            lit = q + ru + q
            if lit not in text:
                continue
            parts = text.split(lit)
            rebuilt = [parts[0]]
            for part in parts[1:]:
                left = rebuilt[-1]
                # Don't replace inside comments / console / already t(
                # Find the line of the join point
                line_start = left.rfind("\n") + 1
                line_prefix = left[line_start:]
                if should_skip_line(line_prefix) or "console." in line_prefix:
                    rebuilt.append(lit + part)
                    continue
                tail = left.rstrip()
                if tail.endswith("t("):
                    rebuilt.append(lit + part)
                else:
                    rebuilt.append(f"t('{key}')" + part)
                    replacements += 1
            text = "".join(rebuilt)

        def jsx_sub(m, _ru=ru, _key=key):
            nonlocal replacements
            # skip if surrounding line is comment-ish — jsx_re only matches markup
            inner = m.group(2).strip()
            if inner != _ru:
                return m.group(0)
            replacements += 1
            return f">{m.group(1)}{{t('{_key}')}}{m.group(3)}<"

        text = jsx_re.sub(jsx_sub, text)
    return text, replacements



def apply_templates(
    text: str,
    entries: dict[str, dict[str, str]],
    used: set[str],
) -> tuple[str, int]:
    n = 0
    specs = [
        (
            r"`Объект #\$\{([^}]+)\}`",
            "admin_objectNum_tmpl",
            "Объект #{{id}}",
            "Property #{{id}}",
            lambda g: f"t('admin_objectNum_tmpl', {{ id: {g[0]} }})",
        ),
        (
            r"`Лот #\$\{([^}]+)\}`",
            "admin_lotNum_tmpl",
            "Лот #{{id}}",
            "Lot #{{id}}",
            lambda g: f"t('admin_lotNum_tmpl', {{ id: {g[0]} }})",
        ),
        (
            r"`Чат #\$\{([^}]+)\}`",
            "admin_chatNum_tmpl",
            "Чат #{{id}}",
            "Chat #{{id}}",
            lambda g: f"t('admin_chatNum_tmpl', {{ id: {g[0]} }})",
        ),
        (
            r"`Бронь #\$\{([^}]+)\}`",
            "admin_bookingNum_tmpl",
            "Бронь #{{id}}",
            "Booking #{{id}}",
            lambda g: f"t('admin_bookingNum_tmpl', {{ id: {g[0]} }})",
        ),
        (
            r"`Ошибка \$\{([^}]+)\}`",
            "admin_errorStatus_tmpl",
            "Ошибка {{status}}",
            "Error {{status}}",
            lambda g: f"t('admin_errorStatus_tmpl', {{ status: {g[0]} }})",
        ),
        (
            r"`\$\{([^}]+)\} мин назад`",
            "admin_minAgo_tmpl",
            "{{n}} мин назад",
            "{{n}} min ago",
            lambda g: f"t('admin_minAgo_tmpl', {{ n: {g[0]} }})",
        ),
        (
            r"`Время отмены: \$\{([^}]+)\}`",
            "admin_cancelTime_tmpl",
            "Время отмены: {{at}}",
            "Cancelled at: {{at}}",
            lambda g: f"t('admin_cancelTime_tmpl', {{ at: {g[0]} }})",
        ),
        (
            r"`Время: \$\{([^}]+)\}`",
            "admin_timeAt_tmpl",
            "Время: {{at}}",
            "Time: {{at}}",
            lambda g: f"t('admin_timeAt_tmpl', {{ at: {g[0]} }})",
        ),
        (
            r"`Тел\.: \$\{([^}]+)\}`",
            "admin_tel_tmpl",
            "Тел.: {{phone}}",
            "Tel.: {{phone}}",
            lambda g: f"t('admin_tel_tmpl', {{ phone: {g[0]} }})",
        ),
        (
            r"`Страна: \$\{([^}]+)\}`",
            "admin_country_tmpl",
            "Страна: {{country}}",
            "Country: {{country}}",
            lambda g: f"t('admin_country_tmpl', {{ country: {g[0]} }})",
        ),
        (
            r"`Роль: \$\{([^}]+)\}`",
            "admin_role_tmpl",
            "Роль: {{role}}",
            "Role: {{role}}",
            lambda g: f"t('admin_role_tmpl', {{ role: {g[0]} }})",
        ),
    ]
    for pat, key, ru, en, builder in specs:
        if key not in used:
            used.add(key)
            entries[key] = {"ru": ru, "en": en}

        def sub(m, _b=builder, _src=None):
            nonlocal n
            return _b(m.groups())

        # Apply only outside console/comment lines
        lines = text.splitlines(keepends=True)
        out = []
        for line in lines:
            if should_skip_line(line) or "console." in line:
                out.append(line)
                continue
            def line_sub(m, _b=builder):
                nonlocal n
                n += 1
                return _b(m.groups())
            out.append(re.sub(pat, line_sub, line))
        text = "".join(out)
    return text, n


def merge_keys(entries: dict[str, dict[str, str]]) -> int:
    added = 0
    for loc_dir in LOCALE_DIRS:
        for loc in LOCALES:
            path = loc_dir / f"{loc}.json"
            data = json.loads(path.read_text(encoding="utf-8"))
            changed = False
            for key, vals in entries.items():
                if loc == "ru":
                    val = vals.get("ru") or vals.get("en")
                else:
                    val = vals.get(loc) or vals.get("en") or vals.get("ru")
                if val is None:
                    continue
                if data.get(key) != val:
                    data[key] = val
                    changed = True
                    added += 1
            if changed:
                path.write_text(
                    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
    return added


def mirror_file(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def main() -> None:
    ru_to_key, entries, used = build_ru_to_key()

    files = sorted(SRC_ADMIN.glob("*.jsx"))
    if SRC_PANEL.exists():
        files.append(SRC_PANEL)

    stats: dict[str, int] = {}
    for path in files:
        original = path.read_text(encoding="utf-8")
        collected = collect_from_text(original)
        for ru in collected:
            resolve(ru, ru_to_key, entries, used)
        text, n1 = replace_in_text(original, ru_to_key, collected)
        text, n2 = apply_templates(text, entries, used)
        if text != original:
            path.write_text(text, encoding="utf-8")
        stats[path.name] = n1 + n2
        print(f"{path.name}: +{n1 + n2}")

    # Mirror admin components + panel
    for path in sorted(SRC_ADMIN.glob("*.jsx")):
        mirror_file(path, LEGACY_ADMIN / path.name)
    if SRC_PANEL.exists():
        mirror_file(SRC_PANEL, LEGACY_PANEL)

    # Also mirror css if needed? no — only jsx content changed

    added = merge_keys(entries)
    cyr_en = sum(1 for v in entries.values() if cyr_re.search(v.get("en", "")))
    print(f"entries_touched={len(entries)} locale_writes≈{added} cyr_en_left={cyr_en}")
    print("TOTAL_REPL", sum(stats.values()))

    # leftover report
    leftovers: dict[str, int] = {}
    for path in files:
        text = path.read_text(encoding="utf-8")
        n = 0
        for line in text.splitlines():
            if should_skip_line(line):
                continue
            work = strip_trailing_comment(line)
            if cyr_re.search(work):
                n += 1
        if n:
            leftovers[path.name] = n
    Path("/tmp/admin_pass2_leftovers.json").write_text(
        json.dumps(leftovers, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("leftover_lines", leftovers)


if __name__ == "__main__":
    main()
