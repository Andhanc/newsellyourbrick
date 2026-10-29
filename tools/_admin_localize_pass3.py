#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pass 3: multiline JSX text, icon+text, remaining admin leftovers."""
from __future__ import annotations

import hashlib
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_ADMIN = ROOT / "src/components/admin"
LEGACY_ADMIN = ROOT / "apps/client/src/legacy/components/admin"
LOCALE_DIRS = [
    ROOT / "src/i18n/locales/mainPage",
    ROOT / "apps/client/src/legacy/i18n/locales/mainPage",
]
LOCALES = ["ru", "en", "de", "es", "fr", "pl", "sv"]

# Exact multiline / JSX-text replacements: old -> (key, en)
# Keep indentation of surrounding JSX; replace only the text node content.
BLOCKS: list[tuple[str, str, str]] = [
    (
        "Объекты с активным тест-драйвом и объекты, по которым есть бронирования. Выберите строку —\n            календарь и таблица с данными бронирующих.",
        "admin_td_intro_main",
        "Properties with an active test drive and properties that have bookings. Select a row — calendar and bookers table.",
    ),
    (
        "<strong>{t('admin_v_levom_menyu_338b13b1')}</strong> — сколько отмен бронирования ещё не отмечены как просмотренные\n            (кнопка «Всё просмотрено» или «Просмотрено» во вкладке «Отмены» у объекта). Сейчас:{' '}",
        "admin_td_intro_note_left",
        "<strong>{{badge}}</strong> — how many booking cancellations are not yet marked as viewed (button «Mark all viewed» or «Mark viewed» on the property Cancellations tab). Now:{' '}",
    ),
]

# Simple standalone text nodes (trimmed), with EN
TEXTS: dict[str, str] = {
    "Всё просмотрено": "Mark all viewed",
    "Просмотрено": "Mark viewed",
    "Страница объекта": "Property page",
    "Календарь записи": "Booking calendar",
    "Календарь": "Calendar",
    "Проверка качества": "Quality check",
    "Объявления": "Listings",
    "Отмены": "Cancellations",
    "Занято": "Booked",
    "Сегодня": "Today",
    "Подсвечены все даты внутри интервала брони (включительно).": "All dates inside the booking interval are highlighted (inclusive).",
    "Нет заполненных анкет по этому объекту.": "No completed surveys for this property.",
    "Пока нет оценок после выезда по этому объекту.": "No post-stay ratings for this property yet.",
    "Опрос при проживании": "In-stay survey",
    "Завершение брони": "Booking completion",
    "Нет бронирований.": "No bookings.",
    "Назад": "Back",
    "Долг": "Debt",
    "Причина удаления:": "Deletion reason:",
    "WhatsApp Рассылка": "WhatsApp Broadcast",
    "Подключите номер, с которого уходят рассылки (в том числе опросы тест-драйва): отсканируйте QR ниже.": "Connect the number used for broadcasts (including test-drive surveys): scan the QR below.",
    "Последний QR уже протух": "The last QR has already expired",
    "Секрет сброса (WA_PAIRING_RESET_SECRET):": "Reset secret (WA_PAIRING_RESET_SECRET):",
    "Экспорт в excel": "Export to Excel",
    "Добавить вручную": "Add manually",
    "Обновить": "Refresh",
    "Создать": "Create",
    "Отмена": "Cancel",
    "Имя": "Name",
    "Номер телефона": "Phone number",
    "Роль": "Role",
    "Привязанная банковская карта": "Linked bank card",
    "Номер карты": "Card number",
    "Последние 4 цифры": "Last 4 digits",
    "Тип карты": "Card type",
    "Срок действия": "Expiry",
    "Имя держателя": "Cardholder name",
    "Фото пользователя": "User photo",
    "Комнат:": "Rooms:",
    "Начало:": "Start:",
    "Окончание:": "End:",
    "Детали": "Details",
    "Title — заголовок в Google": "Title — Google headline",
    "Meta description — текст под заголовком в поиске": "Meta description — text under the headline in search",
    "H1 — главный заголовок на странице": "H1 — main heading on the page",
    "Canonical — основной URL страницы": "Canonical — primary page URL",
    "Индексация в Google": "Google indexing",
    "Целевые ключевые слова": "Target keywords",
    "SEO-заметки команды": "Team SEO notes",
    "OG title — заголовок в превью": "OG title — preview headline",
    "Перейти к списку страниц": "Go to page list",
    "Письмо клиенту (EmailJS из браузера)": "Email to client (EmailJS from browser)",
}

# Fragments with surrounding Cyrillic that need full-string keys (JSX mixed)
MIXED: list[tuple[str, str, str]] = [
    (
        "из <strong>{testDriveTotalCancelledInDb}</strong> отменённых броней в базе.",
        "admin_td_of_cancelled_in_db",
        "of <strong>{{count}}</strong> cancelled bookings in the database.",
    ),
    (
        "<strong>{t('admin_chislo_sprava_u_obekta_aaf57e1b')}</strong> — всего бронирований (любой статус), не только\n            отмены.",
        "admin_td_intro_note_right",
        "<strong>{{label}}</strong> — total bookings (any status), not only cancellations.",
    ),
    (
        ". Нажмите «Запросить новый QR» и сканируйте сразу, как появится картинка.",
        "admin_wa_scan_new_qr_hint",
        ". Click «Request new QR» and scan as soon as the image appears.",
    ),
]

TR = str.maketrans(
    {
        **{c: l for c, l in zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя", "abvgdeezziyklmnoprstufhccss_y_eua")},
        **{c.upper(): l for c, l in zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюя", "abvgdeezziyklmnoprstufhccss_y_eua")},
    }
)
# Fix translit properly
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


def build_index() -> tuple[dict[str, str], set[str]]:
    ru = json.loads((LOCALE_DIRS[0] / "ru.json").read_text(encoding="utf-8"))
    ru_to: dict[str, str] = {}
    used = set()
    for k, v in ru.items():
        if k.startswith("admin_") and isinstance(v, str):
            used.add(k)
            ru_to.setdefault(v, k)
    return ru_to, used


def resolve(ru: str, en: str, ru_to: dict[str, str], used: set[str], entries: dict) -> str:
    if ru in ru_to:
        key = ru_to[ru]
        entries[key] = {"ru": ru, "en": en}
        return key
    key = slug(ru, used)
    ru_to[ru] = key
    entries[key] = {"ru": ru, "en": en}
    return key


def replace_text_nodes(text: str, ru_to: dict, used: set, entries: dict) -> tuple[str, int]:
    """Replace pure Cyrillic JSX text nodes on their own line or after />."""
    n = 0
    # Sort longer first
    items = sorted(TEXTS.items(), key=lambda kv: len(kv[0]), reverse=True)
    for ru, en in items:
        key = resolve(ru, en, ru_to, used, entries)
        # Pattern A: >\n   RU\n<
        pat_a = re.compile(
            r"(>\s*\n)([ \t]*)" + re.escape(ru) + r"(\s*\n[ \t]*<)"
        )
        text, c = pat_a.subn(rf"\1\2{{t('{key}')}}\3", text)
        n += c
        # Pattern B: /> RU   or </i> RU  (same line)
        pat_b = re.compile(
            r"(/(?:>|\w+)\s+)" + re.escape(ru) + r"(?=\s*<|\s*$)"
        )
        def sub_b(m, _k=key):
            nonlocal n
            # avoid replacing inside comments
            return f"{m.group(1)}{{t('{_k}')}}"
        text2, c2 = pat_b.subn(sub_b, text)
        n += c2
        text = text2
        # Pattern C: plain between tags same line already handled in pass2
        # Pattern D: button/label children: >RU<
        lit = f">{ru}<"
        if lit in text:
            text = text.replace(lit, f"{{t('{key}')}}<")
            # count approx
    return text, n


def apply_special_admin_testdrive(text: str, entries: dict, ru_to: dict, used: set) -> str:
    # Intro paragraph
    old = """          <p className="admin-test-drive__intro">
            Объекты с активным тест-драйвом и объекты, по которым есть бронирования. Выберите строку —
            календарь и таблица с данными бронирующих.
          </p>"""
    key = resolve(
        "Объекты с активным тест-драйвом и объекты, по которым есть бронирования. Выберите строку — календарь и таблица с данными бронирующих.",
        "Properties with an active test drive and properties that have bookings. Select a row — calendar and bookers table.",
        ru_to,
        used,
        entries,
    )
    new = f"""          <p className="admin-test-drive__intro">
            {{t('{key}')}}
          </p>"""
    if old in text:
        text = text.replace(old, new)

    # note left part
    old2 = """            <strong>{t('admin_v_levom_menyu_338b13b1')}</strong> — сколько отмен бронирования ещё не отмечены как просмотренные
            (кнопка «Всё просмотрено» или «Просмотрено» во вкладке «Отмены» у объекта). Сейчас:{' '}"""
    key2 = resolve(
        "{{badge}} — сколько отмен бронирования ещё не отмечены как просмотренные (кнопка «Всё просмотрено» или «Просмотрено» во вкладке «Отмены» у объекта). Сейчас:",
        "{{badge}} — how many booking cancellations are not yet marked as viewed («Mark all viewed» or «Mark viewed» on the property Cancellations tab). Now:",
        ru_to,
        used,
        entries,
    )
    # Use Trans-like: t with interpolation of badge label
    new2 = (
        f"            {{t('{key2}', {{ badge: t('admin_v_levom_menyu_338b13b1') }})}}{{' '}}"
    )
    if old2 in text:
        text = text.replace(old2, new2)

    old3 = """                из <strong>{testDriveTotalCancelledInDb}</strong> отменённых броней в базе."""
    key3 = resolve(
        "из {{count}} отменённых броней в базе.",
        "of {{count}} cancelled bookings in the database.",
        ru_to,
        used,
        entries,
    )
    new3 = f"                {{t('{key3}', {{ count: testDriveTotalCancelledInDb }})}}"
    if old3 in text:
        text = text.replace(old3, new3)

    old4 = """            <strong>{t('admin_chislo_sprava_u_obekta_aaf57e1b')}</strong> — всего бронирований (любой статус), не только
            отмены."""
    key4 = resolve(
        "{{label}} — всего бронирований (любой статус), не только отмены.",
        "{{label}} — total bookings (any status), not only cancellations.",
        ru_to,
        used,
        entries,
    )
    new4 = f"            {{t('{key4}', {{ label: t('admin_chislo_sprava_u_obekta_aaf57e1b') }})}}"
    if old4 in text:
        text = text.replace(old4, new4)

    # Positive/negative counts
    for ru, en, expr in [
        ("Положительных: {card.positiveCount}", "Positive: {{count}}", "card.positiveCount"),
        ("Отрицательных: {card.negativeCount}", "Negative: {{count}}", "card.negativeCount"),
    ]:
        # actual source has: Положительных: {card.positiveCount}
        pass

    text = text.replace(
        "Положительных: {card.positiveCount}",
        "{t('admin_td_positive_count', { count: card.positiveCount })}",
    )
    entries["admin_td_positive_count"] = {"ru": "Положительных: {{count}}", "en": "Positive: {{count}}"}
    used.add("admin_td_positive_count")

    text = text.replace(
        "Отрицательных: {card.negativeCount}",
        "{t('admin_td_negative_count', { count: card.negativeCount })}",
    )
    entries["admin_td_negative_count"] = {"ru": "Отрицательных: {{count}}", "en": "Negative: {{count}}"}
    used.add("admin_td_negative_count")

    text = text.replace(
        "Непросмотренных отмен: <strong>{unseenCancelCount}</strong>",
        "{t('admin_td_unseen_cancels', { count: unseenCancelCount })}",
    )
    entries["admin_td_unseen_cancels"] = {
        "ru": "Непросмотренных отмен: {{count}}",
        "en": "Unseen cancellations: {{count}}",
    }
    used.add("admin_td_unseen_cancels")

    text = text.replace(
        "Создано: {b.created_at || '—'}",
        "{t('admin_td_created', { at: b.created_at || '—' })}",
    )
    entries["admin_td_created"] = {"ru": "Создано: {{at}}", "en": "Created: {{at}}"}
    used.add("admin_td_created")

    text = text.replace(
        "Отправлено: {ef.submittedAt ? formatBroadcastDt(ef.submittedAt) : '—'}",
        "{t('admin_td_sent_at', { at: ef.submittedAt ? formatBroadcastDt(ef.submittedAt) : '—' })}",
    )
    entries["admin_td_sent_at"] = {"ru": "Отправлено: {{at}}", "en": "Sent: {{at}}"}
    used.add("admin_td_sent_at")

    # Booking # with expression (JSX text)
    text = re.sub(
        r"Бронь #\{card\.bookingId\}",
        "{t('admin_bookingNum_tmpl', { id: card.bookingId })}",
        text,
    )
    text = re.sub(
        r"Бронь #\{ef\.bookingId\}: \{ef\.buyerDisplayName\}",
        "{t('admin_td_booking_buyer', { id: ef.bookingId, name: ef.buyerDisplayName })}",
        text,
    )
    entries["admin_td_booking_buyer"] = {
        "ru": "Бронь #{{id}}: {{name}}",
        "en": "Booking #{{id}}: {{name}}",
    }
    used.add("admin_td_booking_buyer")

    text = re.sub(
        r"Бронь #\{c\.id\}",
        "{t('admin_bookingNum_tmpl', { id: c.id })}",
        text,
    )
    text = re.sub(
        r"Бронь #\{br\.id\} · \{br\.start_date\} — \{br\.end_date\}",
        "{t('admin_td_booking_range', { id: br.id, start: br.start_date, end: br.end_date })}",
        text,
    )
    entries["admin_td_booking_range"] = {
        "ru": "Бронь #{{id}} · {{start}} — {{end}}",
        "en": "Booking #{{id}} · {{start}} — {{end}}",
    }
    used.add("admin_td_booking_range")

    text = re.sub(
        r"Бронь #\{br\.id\} · выезд \{br\.end_date\}",
        "{t('admin_td_booking_checkout', { id: br.id, end: br.end_date })}",
        text,
    )
    entries["admin_td_booking_checkout"] = {
        "ru": "Бронь #{{id}} · выезд {{end}}",
        "en": "Booking #{{id}} · checkout {{end}}",
    }
    used.add("admin_td_booking_checkout")

    return text


def main() -> None:
    ru_to, used = build_index()
    entries: dict[str, dict[str, str]] = {}

    # Seed TEXTS into entries
    for ru, en in TEXTS.items():
        resolve(ru, en, ru_to, used, entries)

    for path in sorted(SRC_ADMIN.glob("*.jsx")):
        original = path.read_text(encoding="utf-8")
        text = original
        if path.name == "AdminTestDrive.jsx":
            text = apply_special_admin_testdrive(text, entries, ru_to, used)
        text, n = replace_text_nodes(text, ru_to, used, entries)

        # Header export: icon + text same line
        if "Экспорт в excel" in text:
            key = resolve("Экспорт в excel", "Export to Excel", ru_to, used, entries)
            text = text.replace(
                '<i className="fas fa-download"></i> Экспорт в excel',
                f'<i className="fas fa-download"></i> {{t(\'{key}\')}}',
            )

        # Common mixed after icons
        for ru, en in [
            ("Добавить вручную", "Add manually"),
            ("Обновить", "Refresh"),
            ("Письмо клиенту (EmailJS из браузера)", "Email to client (EmailJS from browser)"),
        ]:
            if ru in text and f"t('" not in text[max(0, text.find(ru) - 20) : text.find(ru)]:
                key = resolve(ru, en, ru_to, used, entries)
                # replace bare occurrence after /> 
                text2 = re.sub(
                    rf"(/>\s*){re.escape(ru)}",
                    rf"\1{{t('{key}')}}",
                    text,
                )
                text = text2

        # WhatsApp expired QR mixed paragraph
        if path.name == "WhatsApp.jsx":
            old = """                    Последний QR уже протух
                    {typeof whatsappStatus.waDiag.qrAgeMs === 'number'
                      ? ` (~${Math.round(whatsappStatus.waDiag.qrAgeMs / 1000)} с назад)`
                      : ''}
                    . Нажмите «Запросить новый QR» и сканируйте сразу, как появится картинка."""
            key_a = resolve("Последний QR уже протух", "The last QR has already expired", ru_to, used, entries)
            key_b = resolve("(~{{sec}} с назад)", "(~{{sec}} s ago)", ru_to, used, entries)
            key_c = resolve(
                ". Нажмите «Запросить новый QR» и сканируйте сразу, как появится картинка.",
                ". Click «Request new QR» and scan as soon as the image appears.",
                ru_to,
                used,
                entries,
            )
            new = f"""                    {{t('{key_a}')}}
                    {{typeof whatsappStatus.waDiag.qrAgeMs === 'number'
                      ? t('{key_b}', {{ sec: Math.round(whatsappStatus.waDiag.qrAgeMs / 1000) }})
                      : ''}}
                    {{t('{key_c}')}}"""
            if old in text:
                text = text.replace(old, new)

            # subtitle / title handled by text nodes

        if text != original:
            path.write_text(text, encoding="utf-8")
            print(f"updated {path.name}")
        else:
            print(f"unchanged {path.name}")

    for path in sorted(SRC_ADMIN.glob("*.jsx")):
        shutil.copy2(path, LEGACY_ADMIN / path.name)

    added = merge_keys(entries)
    print(f"locale_writes≈{added} new_entries={len(entries)}")


if __name__ == "__main__":
    main()
