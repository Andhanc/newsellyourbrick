#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src/components/admin"

FILES = [
    "Moderation.jsx",
    "ModerationPropertyDetail.jsx",
    "AdminTestDrive.jsx",
    "SeoPanel.jsx",
    "WhatsApp.jsx",
    "UserDetailModal.jsx",
    "CrmBoard.jsx",
    "Statistics.jsx",
]

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
}

string_re = re.compile(
    r"""(['"])((?:(?!\1)[^\\]|\\.)*?[А-Яа-яЁё](?:(?!\1)[^\\]|\\.)*)\1"""
)
jsx_re = re.compile(r">(\s*)([^<>{}\n]*[А-Яа-яЁё][^<>{}\n]*?)(\s*)<")


def should_skip_line(line: str) -> bool:
    s = line.strip()
    if s.startswith("//") or s.startswith("*") or s.startswith("/*"):
        return True
    if "console." in line:
        return True
    return False


def slug_key(ru: str, used: set[str]) -> str:
    h = hashlib.sha1(ru.encode()).hexdigest()[:8]
    words = re.findall(r"[A-Za-zА-Яа-яЁё0-9]+", ru)[:4]
    tr = str.maketrans(
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
    hint = "_".join(w.translate(tr) for w in words)[:36]
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


def main() -> None:
    ns: dict = {}
    exec((ROOT / "tools/_admin_i18n_entries.py").read_text(encoding="utf-8"), ns)
    shared: dict = ns["E"]
    debt_entries = json.loads(
        Path("/tmp/debt_entries.json").read_text(encoding="utf-8")
    )
    extra_en = json.loads(
        Path("/tmp/admin_extra_en.json").read_text(encoding="utf-8")
    )

    ru_to: dict[str, tuple[str, str]] = {}
    all_entries: dict[str, dict[str, str]] = {}
    used_keys: set[str] = set()

    for key, vals in shared.items():
        ru_to[vals["ru"]] = (key, vals["en"])
        all_entries[key] = vals
        used_keys.add(key)
    for key, vals in debt_entries.items():
        ru_to[vals["ru"]] = (key, vals["en"])
        all_entries[key] = vals
        used_keys.add(key)
    for ru, en in extra_en.items():
        if ru not in ru_to:
            key = slug_key(ru, used_keys)
            ru_to[ru] = (key, en)
            all_entries[key] = {"ru": ru, "en": en}

    def resolve(ru: str) -> tuple[str, str]:
        if ru in ru_to:
            return ru_to[ru]
        en = extra_en.get(ru, ru)
        key = slug_key(ru, used_keys)
        ru_to[ru] = (key, en)
        all_entries[key] = {"ru": ru, "en": en}
        return key, en

    stats: dict[str, int] = {}

    for name in FILES:
        path = SRC / name
        original = path.read_text(encoding="utf-8")
        collected: list[str] = []
        for line in original.splitlines():
            if should_skip_line(line):
                continue
            for m in string_re.finditer(line):
                s = m.group(2)
                if s in MOCK_NAMES or "${" in s:
                    continue
                if "{" in s or "}" in s:
                    continue
                collected.append(s)
            for m in jsx_re.finditer(line):
                s = m.group(2).strip()
                if not s or s in MOCK_NAMES:
                    continue
                if "{" in s or "}" in s:
                    continue
                # skip fragments that look like broken JSX captures
                if s.startswith("}}") or "/>" in s or "</" in s:
                    continue
                collected.append(s)

        for ru in collected:
            resolve(ru)

        text = ensure_i18n(original)
        replacements = 0
        for ru in sorted(set(collected), key=len, reverse=True):
            key, _en = ru_to[ru]
            for q in ("'", '"'):
                lit = q + ru + q
                if lit not in text:
                    continue
                parts = text.split(lit)
                rebuilt = [parts[0]]
                for part in parts[1:]:
                    left = rebuilt[-1]
                    tail = left.rstrip()
                    if tail.endswith("t("):
                        rebuilt.append(lit + part)
                    else:
                        rebuilt.append(f"t('{key}')" + part)
                        replacements += 1
                text = "".join(rebuilt)

            def jsx_sub(m, _ru=ru, _key=key):
                nonlocal replacements
                inner = m.group(2).strip()
                if inner != _ru:
                    return m.group(0)
                replacements += 1
                return f">{m.group(1)}{{t('{_key}')}}{m.group(3)}<"

            text = jsx_re.sub(jsx_sub, text)

        path.write_text(text, encoding="utf-8")
        remain = 0
        for line in text.splitlines():
            if should_skip_line(line):
                continue
            if string_re.search(line) or jsx_re.search(line):
                remain += 1
        stats[name] = replacements
        print(f"{name}: ~{replacements} replacements, remain_lines={remain}")

    Path("/tmp/admin_all_entries.json").write_text(
        json.dumps(all_entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    cyr_en = sum(
        1
        for v in all_entries.values()
        if re.search(r"[А-Яа-яЁё]", v["en"])
    )
    print(f"entries={len(all_entries)} cyr_en_left={cyr_en}")
    print("TOTAL", sum(stats.values()))


if __name__ == "__main__":
    main()
