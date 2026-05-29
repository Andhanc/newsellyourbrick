# TZ Coverage Audit

Дата аудита: 2026-05-28  
Источник: `tz.txt`  
Текущая модель данных фронта/бэка: базовые bool-поля + `feature1..feature26` + `additional_amenities`.

## 1) Покрыто (работает сейчас)

- Типозависимые группы удобств в форме добавления:
  - `apartment/apartments` (Residential-профиль),
  - `house/villa` (Residential-профиль),
  - `commercial` (Commercial-профиль),
  - `land` (Land-профиль),
  - `other` (временный Hospitality-профиль).
- Сохранение удобств в API/БД:
  - базовые поля (`balcony`, `parking`, `elevator`, `pool`, `garden`, `electricity`, `internet`, `security`, `furniture`);
  - `feature1..feature26` (все отправляются);
  - `additional_amenities`.
- Отображение удобств:
  - публичная деталка объекта (`PropertyDetailInfoSection`) обновлена под новый маппинг;
  - модерация (`ModerationPropertyDetail`) показывает новые значения и умеет читать `amenities` массив + fallback по bool/feature.
- Защита от "перетекания" удобств между типами:
  - при смене типа объекта сбрасываются все amenity-ключи.

## 2) Покрыто частично (через совместимый маппинг)

Из-за ограничений текущей схемы (`feature1..26`) часть пунктов `tz.txt` объединена в общие ключи.

- Residential:
  - большая часть парковки/безопасности/комфорта/outdoor покрыта;
  - отдельные пункты (например, `pool_private` vs `pool_communal`, отдельные view-флаги) сведены к общим чекбоксам.
- Commercial:
  - покрыты ключевые блоки парковки, тех.характеристик и security;
  - некоторые специфичные параметры (например `parking_ratio`, `ceiling_height_m`, `conference_rooms`) пока не отдельные поля.
- Land:
  - utilities/access перенесены в доступные bool/feature;
  - часть семантики объединена (например в одном feature может жить несколько близких пунктов).
- Hotel/Hospitality:
  - реализовано как профиль типа `other` (UI-логика есть);
  - не выделено отдельным backend-type и отдельной моделью.

## 3) Требует бэкенд-расширения (нет 1:1 в текущей БД/API)

Чтобы соответствовать `tz.txt` буквально, нужны новые API/БД поля (вместо перегрузки `feature1..26`).

- Новые каноничные amenity-id из TZ:
  - пример: `underground_parking`, `security_24_7`, `pool_private`, `pool_communal`, `loading_dock`, `smart_building_bms` и др.
- Параметры-диапазоны/селекты по типам:
  - Commercial: `parking_ratio`, `ceiling_height_m`, `remaining_lease_term`, `noi_eur_yr`, `wault_yr`;
  - Land: `plot_area` c unit toggle, `far_floor_area_ratio`, `max_build_height_m`, `terrain`;
  - Hotel: `number_of_rooms_keys`, `revpar_eur`, `adr_eur`, `management_model` и др.
- Инвестиционные/юридические флаги из TZ:
  - `rental_income_confirmed`, `tenanted`, `holiday_rental_licence`, `golden_visa_eligible`,
  - `anchor_tenant`, `multi_tenant`, `sale_leaseback`, `change_of_use_permission`, `planning_permission`.
- Отдельный тип недвижимости:
  - `hotel/hospitality` как отдельный backend `property_type` (сейчас используется `other` -> `commercial`).
- Локали:
  - полный перевод новых ключей во все языки (`de/es/fr/sv`), сейчас полноценно добавлено в `ru/en`.

## 4) Риски и замечания

- Семантический риск: один `featureX` может обозначать разные вещи в разных типах (компромисс совместимости).
- Аналитика/фильтры по новым canonical-полям пока ограничены, потому что данные хранятся в legacy-ключах.
- Для модераторов желательно отдельное поле "тип профиля удобств", чтобы проще интерпретировать одинаковые `featureX` для разных типов.

## 5) Рекомендуемый следующий этап

1. Согласовать canonical-схему amenity/filters на бэке (по `tz.txt` без сжатия).  
2. Добавить миграцию и версионирование API (legacy + new).  
3. Переключить фронт с `feature1..26` на новые id.  
4. Добавить серверный маппер обратной совместимости для старых объектов.  
5. Довести переводы всех локалей и e2e-проверки публикации/модерации.












