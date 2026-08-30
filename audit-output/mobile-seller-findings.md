# Mobile UX/UI-аудит продавца и владельца

Дата: 26 августа 2026. Реальный проход выполнен во встроенном браузере на **390×844** и контрольном **360×800**. Проверены seller landing, CTA, 11-шаговый wizard, AI comparison, owner dashboard, mobile menu и subscriptions. Тестовые названия, значения форм и демонстрационные балансы полностью исключены из оценки.

## Итог

Seller mobile выглядит зрелее типичного responsive MVP: лендинг хорошо перестраивается в одну колонку, кабинет имеет отдельную mobile header/navigation, dashboard cards сохраняют приоритеты, AI dialog и тарифы помещаются без горизонтальной прокрутки. Основные трудности находятся не в визуальной красоте, а в порядке контента wizard и узком breakpoint 360 px.

Главный mobile blocker — мастер добавления: прежде чем пользователь увидит рабочий первый шаг, экран показывает большой блок советов. На 360 px destructive CTA «Сбросить» частично выходит за правую границу. AI dialog адаптирован хорошо, но ответ функционально обрывается. В меню кабинета по-прежнему нет продаж и кошелька.

**Общая mobile-оценка продавца: 7,0/10.** Лендинг и кабинет готовы для controlled beta; wizard и reachability ключевых разделов требуют P1-исправлений.

## Цель продавца

1. понять ценность и открыть расчёт;
2. добавить объект с телефона;
3. использовать AI без потери контроля;
4. открыть аналитику, объекты, test-drive, сделки и выплаты;
5. выбрать тариф;
6. завершить действия без горизонтального overflow и hidden CTA.

## Пройденные mobile-шаги и здоровье

| Шаг | Что проверено | Здоровье |
|---:|---|---|
| 1 | Seller landing, 390×844 | **Хорошо:** обещание, CTA и основной visual помещаются; stats начинаются в конце первого экрана. |
| 2 | CTA «Рассчитать продажу» | **Хорошо:** крупный и однозначный переход в мастер. |
| 3 | Wizard header/progress | **Частично:** progress читаемый, но заголовок занимает две строки, Reset target небольшой. |
| 4 | Wizard content order | **Проблема:** большой блок «Советы» идёт перед рабочей формой и отодвигает первый выбор ниже fold. |
| 5 | AI generation (~13 s) | **Частично:** ожидание терпимое с понятным результатом, но generated text обрывается. |
| 6 | AI compare dialog | **Хорошо по адаптиву:** обе версии, close и два действия помещаются в 844 px. |
| 7 | Owner dashboard | **Хорошо:** mobile header, KPI carousel, quick actions и ближайшие аукционы читаются. |
| 8 | Owner mobile menu | **Хорошо визуально / неполно продуктово:** крупные пункты, profile/logout закреплены; нет «Продажи» и «Кошелёк». |
| 9 | Seller subscriptions | **Хорошо:** вертикальный radio-list тарифов и billing toggle; primary action заметен. |
| 10 | Контроль 360×800 | **Проблема:** «Сбросить» обрезан справа, wizard всё ещё начинает с блока советов. |

## Что сделано хорошо

- Seller landing сохраняет визуальную иерархию: header → обещание → пояснение → CTA → social proof visual.
- Основной CTA доступен до прокрутки и не конкурирует с несколькими равными действиями.
- Dashboard действительно mobile-specific: отдельная шапка, горизонтальная KPI-карусель и быстрые действия.
- Sidebar превращается в полноценный drawer шириной около 77% экрана, фон затемняется, close понятен.
- AI comparison превращается в одну колонку, исходник и вариант AI остаются сопоставимыми.
- Тарифы представлены компактным vertical picker, поэтому не нужно горизонтально листать три сложные price cards.
- Большинство ключевых targets около 44–56 px, текст не требует горизонтального scroll.

## Основные проблемы

### P1 — wizard показывает советы раньше действия

На `14-seller-wizard-390.png` и `23-seller-wizard-360.png` почти весь первый экран после progress занимает блок «Советы». Сам «Шаг 1» только начинается внизу. Пользователь нажал «Рассчитать продажу», но не может сразу начать.

Рекомендация: на mobile порядок должен быть `header → progress → активный шаг → collapsed tips`. Советы — accordion/contextual hint после поля. Показывать следующий шаг только после текущего, не рендерить длинную форму целиком.

### P1 — Reset обрезан на 360 px

На контрольной ширине `23-seller-wizard-360.png` кнопка «Сбросить» частично выходит за правую границу. Это подтверждённый horizontal/reflow defect.

Рекомендация: compact icon+label или overflow menu; заголовок в отдельной строке; side padding 12–16 px; visual regression 320/360/390/430.

### P1 — AI-result обрывается

На `15-seller-ai-modal-390.png` текст AI заканчивается внутри слова. Modal адаптирован хорошо, но принять такой вариант нельзя безопасно.

Рекомендация: server/client completion validator, retry/continue, disabled «Принять» для незавершённого предложения, история версий. Показать live-status и ожидаемое время.

### P1 — продажи и кошелёк отсутствуют в mobile navigation

Drawer содержит Аналитику, Объекты, Тест-драйв, Подписки, Сообщения и Настройки, но не ключевые seller goals «Сделки/Продажи» и «Кошелёк» (`17-owner-menu-390.png`).

Рекомендация: одинаковая IA на desktop/mobile: Аналитика, Объекты, Test-drive, Сделки, Кошелёк, Подписки, Сообщения, Настройки. Bottom nav может иметь 4 пункта + «Ещё», drawer — полный набор.

### P1/P2 — repeated dialogs в accessibility tree

На переходе в subscriptions DOM содержит несколько экземпляров «Центр событий». Это не зависит от демонстрационных значений и может нарушить focus/read order.

Рекомендация: один dialog instance; закрытые dialogs размонтировать или делать inert; common portal, Escape и restore focus.

### P2 — dashboard carousel требует явной affordance

На `16-owner-dashboard-390.png` следующая KPI-card обрезана справа как намёк на swipe. Это понятно визуально, но screen reader/keyboard не получают инструкции, а важное действие может оказаться за горизонтальным жестом.

Рекомендация: pagination/status, buttons «назад/вперёд», `scroll-snap`, announce current card; критичные CTA не прятать только в carousel.

### P2 — seller tariffs показывают мало контекста

`18-owner-subscriptions-390.png` хорошо сравнивает цены, но benefits каждого тарифа не видны до выбора, а статус бесплатного Standard не объясняет срок/следующее списание.

Рекомендация: под выбранным тарифом сразу раскрывать 3–5 differentiators, billing date и условия изменения; сохранять CTA над fold.

## Accessibility risks

- Reset target и часть вторичных controls могут быть меньше 44×44.
- Drawer/dialog должны иметь initial focus, focus trap, Escape/back и return focus.
- Горизонтальные KPI cards требуют альтернативных controls и status announcement.
- Disabled actions должны объяснять причину.
- Не проверены TalkBack/VoiceOver, font scale 2.0, landscape и реальная клавиатура.

## Оценки

| Критерий | Оценка /10 |
|---|---:|
| Seller landing | 8,5 |
| CTA и task entry | 8,0 |
| Wizard reflow | 5,5 |
| Wizard clarity | 5,5 |
| AI comparison adaptive | 8,0 |
| AI reliability | 5,0 |
| Dashboard | 8,0 |
| Mobile navigation | 6,5 |
| Subscriptions | 7,5 |
| Touch/accessibility | 6,0 |

## Приоритетный план

### 0–2 недели

1. Переставить active wizard step выше tips.
2. Исправить header/Reset на 320–360 px.
3. Не разрешать принимать обрезанный AI output.
4. Добавить Сделки и Кошелёк в mobile IA.
5. Устранить повторные dialogs.

### 2–6 недель

1. Рендерить один активный шаг, остальные — overview/collapsed.
2. Общий accessible Drawer/Dialog primitive.
3. Pagination и keyboard controls для KPI carousel.
4. Раскрывать benefits и billing state выбранного тарифа.
5. Device matrix: iOS Safari, Android Chrome, keyboard, font scale, landscape.

## Принятые mobile screenshots

`13-seller-390.png`, `14-seller-wizard-390.png`, `15-seller-ai-modal-390.png`, `16-owner-dashboard-390.png`, `17-owner-menu-390.png`, `18-owner-subscriptions-390.png`, `23-seller-wizard-360.png`.

Папка: `audit-output/screenshots/mobile-root/`.

## Ограничения

- Responsive browser viewport не заменяет физическое устройство и screen reader.
- Финальная публикация, покупка тарифа, вывод средств и документы не подтверждались.
- Тестовые данные намеренно не оценивались и не влияли на severity/score.
- Аналитика и wallet не перепроверялись как отдельные mobile screens: текущий фокус — adaptive entry/navigation/wizard.
