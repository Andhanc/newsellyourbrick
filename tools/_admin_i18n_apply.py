#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Apply admin_* i18n: merge locale keys and help with file transforms."""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALE_DIRS = [
    ROOT / "src/i18n/locales/mainPage",
    ROOT / "apps/client/src/legacy/i18n/locales/mainPage",
]
LOCALES = ["ru", "en", "de", "es", "fr", "pl", "sv"]
LEGACY_ADMIN = ROOT / "apps/client/src/legacy/components/admin"
SRC_ADMIN = ROOT / "src/components/admin"


def merge_keys(entries: dict[str, dict[str, str]]) -> int:
    """entries: { key: {ru, en, de?, es?, fr?, pl?, sv?} } — missing non-ru fall back to en."""
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


def mirror_admin(*names: str) -> None:
    for name in names:
        src = SRC_ADMIN / name
        dst = LEGACY_ADMIN / name
        if src.exists():
            shutil.copy2(src, dst)
            print(f"mirrored {name}")


if __name__ == "__main__":
    print("helper module — import merge_keys / mirror_admin")
