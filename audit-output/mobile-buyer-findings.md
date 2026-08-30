# Mobile UX/UI-аудит покупателя и инвестора

Дата: 26 августа 2026. Проверены реальные состояния локального продукта во встроенном браузере на **390×844** и контрольном узком breakpoint **360×800**. Все выводы относятся к адаптиву, навигации, взаимодействию и доступности. Тестовые названия, фотографии, адреса, демонстрационные балансы и другое содержимое тестовых записей полностью исключены из оценки.

## Итог

Mobile-направление сильнее desktop-впечатления: большинство ключевых экранов не просто сжаты, а имеют отдельную композицию. Onboarding, главное меню, каталог, фильтры, сравнение, бонусная инструкция и тарифы читаются без горизонтальной прокрутки и сохраняют крупные CTA. Особенно удачно выполнены mobile-версии сравнения и умной панели инвестора.

Основные дефекты появляются из-за конкуренции фиксированных слоёв: на карточке объекта ставка и launcher AI перекрывают контент, а на ширине 360 px AI-кнопка закрывает фильтр каталога. В форме умной панели заголовок уходит под fixed header. Дополнительно на Compare и Bonuses код намеренно запрещает pinch zoom.

**Общая mobile-оценка покупателя: 6,7/10.** Базовые задачи доступны одной рукой, но property/AI/filter overlays и запрет масштабирования требуют исправления до production mobile launch.

## Цель пользователя

1. открыть каталог и быстро отфильтровать варианты;
2. изучить объект, фото, цену и тест-драйв;
3. сохранить и сравнить два объекта;
4. рассчитать сценарий в умной панели;
5. понять бонусы и VIP;
6. выполнить действия без desktop-паттернов, скрытых контролов и горизонтального overflow.

## Пройденные mobile-шаги и здоровье

| Шаг | Что проверено | Здоровье |
|---:|---|---|
| 1 | Onboarding, 390×844 | **Хорошо:** полноэкранный hero, читаемый текст, один явный CTA, нет обрезки. |
| 2 | Главная и mobile header | **Хорошо:** header и карусель стратегий reflow корректно; первичная ценность видна сразу. |
| 3 | Полноэкранное меню | **Хорошо:** разделы сгруппированы, профиль закреплён снизу, tap targets крупные. |
| 4 | Каталог, 390×844 | **Частично:** hero и карточки адаптированы, но поиск обрезает placeholder, AI/chat перекрывают результаты. |
| 5 | Фильтры | **Хорошо:** настоящий drawer, логичные accordion-секции, sticky actions доступны внизу. |
| 6 | Карточка объекта | **Проблема:** bottom sheet тест-драйва адаптирован, но появляется до изучения; fixed ставка и AI перекрывают описание. |
| 7 | Compare picker | **Хорошо:** отдельная mobile-композиция, крупные карточки пары, явный CTA. |
| 8 | Compare result | **Хорошо с оговорками:** desktop-таблица заменена последовательными карточками; sticky identity занимает заметную высоту. |
| 9 | Умная панель — landing/source | **Хорошо:** сильный visual, CTA и source cards помещаются на экран; low-contrast secondary text требует проверки. |
| 10 | Умная панель — inputs | **Проблема:** заголовок и инструкция скрыты под fixed header, disabled CTA находится далеко от полей, много пустого пространства. |
| 11 | Бонусы | **Хорошо:** hero и task drawer адаптированы; первый task находится только ниже большого hero. |
| 12 | Покупательские тарифы/VIP | **Хорошо:** один тариф на экран, крупная цена и features, понятный billing toggle. |
| 13 | Контроль 360×800 | **Серьёзная проблема:** AI launcher закрывает кнопку фильтров, а search placeholder обрезан сильнее. |

## Что сделано хорошо

- Mobile header сохраняет главные действия и меняет их состав на 360 px, не создавая горизонтального body overflow.
- Меню использует accordion-группы и не превращает навигацию в длинный плоский список.
- Каталог сохраняет крупную типографику, search и карточки; двухколоночный preview даёт понять, что список продолжается.
- Фильтры оформлены как bottom/right sheet с крупной зоной закрытия и фиксированными «Применить»/«Сбросить».
- Compare использует специальные mobile cards вместо сжатой таблицы. Значения двух объектов остаются параллельно видимыми.
- Smart Investor помещает три примера и primary CTA в 844 px, а source selection имеет крупные кликабельные карточки.
- Bonus task превращается в читаемый ticket без nested-scroll: инструкция, поле и CTA помещаются в одном modal.
- Starter/Pro/VIP читаются вертикально, billing switch доступен до карточек.

## Основные проблемы

### P0 — pinch zoom запрещён на Compare и Bonuses

Код маршрутов выставляет `maximum-scale=1`, `user-scalable=no` и перехватывает pinch/keyboard zoom. На mobile это лишает пользователя со слабым зрением возможности увеличить labels и supporting text.

Рекомендация: оставить `width=device-width, initial-scale=1, viewport-fit=cover`; удалить gesture interception; проверить 200% text zoom и browser zoom на 320/360/390/430 px.

### P1 — floating AI перекрывает фильтр на 360 px

На `22-auction-360.png` круглая кнопка AI расположена в зоне фильтра справа от поиска. Контрол фильтров присутствует в DOM, но визуально закрыт. Пользователь не может уверенно понять, как открыть фильтры.

Рекомендация: единый overlay manager и зарезервированная safe-zone; на <=390 px объединить AI/chat в одну кнопку либо переносить launcher ниже первой карточки. Проверять пересечения автоматически.

### P1 — карточка объекта перегружена fixed-слоями

На `07-property-390.png` в нижней части одновременно находятся pill «Недвижимость AI» и sticky-панель текущей ставки. Они перекрывают начало описания. Вверху broken-media alt text визуально конфликтует с floating actions.

Рекомендация: один sticky action layer; AI открыть из явного действия в карточке, а не отдельным launcher поверх контента; добавить bottom padding по фактической высоте sticky bar и safe area.

### P1 — Smart Investor inputs скрываются под header

На `12-calculator-inputs-390.png` заголовок шага и инструкция обрезаны сверху. Header перекрывает контент, а текст внутри inputs имеет низкий контраст. Primary CTA отделён от полей большим пустым участком.

Рекомендация: измерять реальную высоту header через CSS variable; добавить scroll-padding-top; не использовать жёсткий `100svh - 112px`; подсвечивать заполненные значения, держать CTA сразу после формы и над keyboard safe area.

### P1 — popup тест-драйва появляется слишком рано

Bottom sheet хорошо адаптирован (`06-property-popup-390.png`), но занимает около половины экрана до изучения объекта. Это interruption, а не responsive defect.

Рекомендация: первый вход — неблокирующий card/banner; sheet после выраженного интереса, просмотра характеристик или повторного визита; закрытие запоминать.

### P1 — mobile data contract остаётся desktop-sized

Compare и Investor загружают несколько полных каталогов, хотя экрану нужны только избранные ID и краткая projection. На реальной мобильной сети bottleneck станет transfer/parse/render.

Рекомендация: endpoint `/users/me/favorites?include=compare-card`; initial JSON <150 KB, общий initial image budget <300 KB, LCP p75 <2.5 s 4G.

### P2 — search placeholder и hero занимают лишнее место

На 390 и особенно 360 px placeholder поиска визуально обрывается. Bonus hero занимает почти весь первый экран, поэтому задания начинаются ниже fold.

Рекомендация: short label «Поиск» на <=390 px; отдельно подписать фильтр; bonus hero сократить до 55–65svh и показать первый task/выгоду в пределах 1–1.5 экранов.

### P2 — touch/typography exceptions

В коде остаются controls 38–42 px и labels 8–12 px. Базовый mobile pattern в целом крупный, но исключения особенно заметны рядом с AI, close и sticky elements.

Рекомендация: минимум 44×44 CSS px, 48–56 px для primary; body/supporting >=14 px; минимум 8 px между соседними targets.

## Accessibility risks

- Zoom lock — подтверждённый критический риск.
- Dialogs должны возвращать фокус, закрываться Escape/back и делать background inert; визуальный fit сам по себе этого не доказывает.
- Низкий контраст secondary text в Smart Investor нужно измерить инструментально.
- Sticky/floating layers требуют keyboard и screen-reader проверки порядка чтения.
- Не проверены VoiceOver/TalkBack, landscape, Android font scale 2.0 и реальная mobile keyboard occlusion.

## Оценки

| Критерий | Оценка /10 |
|---|---:|
| Onboarding и первое впечатление | 8,5 |
| Mobile navigation | 8,0 |
| Каталог и фильтры | 6,8 |
| Карточка объекта | 5,0 |
| Compare picker/result | 8,0 |
| Smart Investor | 6,5 |
| Бонусы | 7,0 |
| VIP/подписки | 7,5 |
| Touch ergonomics | 6,5 |
| Accessibility | 4,5 |
| Mobile performance readiness | 5,0 |

## Приоритетный план

### 0–2 недели

1. Снять zoom lock.
2. Устранить пересечение AI/filter/chat на 360–390 px.
3. Оставить один sticky action layer на property page.
4. Исправить top offset формы Smart Investor и contrast.
5. Добавить 320/360/390/430 visual regression matrix.

### 2–6 недель

1. Lightweight favorites/compare endpoint и shared query cache.
2. Responsive public images AVIF/WebP и budgets.
3. Общий accessible Dialog/Sheet primitive.
4. Сжать bonus hero и первый task поднять выше.
5. iOS/Android keyboard, landscape, font-scale и reduced-motion testing.

## Принятые mobile screenshots

`01-onboarding-390.png`, `02-home-390.png`, `03-menu-390.png`, `04-auction-390.png`, `05-filter-390.png`, `06-property-popup-390.png`, `07-property-390.png`, `08-compare-390.png`, `09-compare-result-390.png`, `10-calculator-entry-390.png`, `11-calculator-source-390.png`, `12-calculator-inputs-390.png`, `19-bonuses-390.png`, `20-bonus-modal-390.png`, `21-buyer-subscriptions-390.png`, `22-auction-360.png`.

Папка: `audit-output/screenshots/mobile-root/`.

## Ограничения

- Это responsive browser viewport, а не физический iOS/Android device.
- Не проводились реальные платежи, ставка, покупка или отправка бонусной ссылки.
- Тестовые данные намеренно не оценивались и не влияли на severity/score.
- Production RUM, 3G throttling, VoiceOver/TalkBack и mobile keyboard требуют отдельного device run.
