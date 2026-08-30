# Design QA — вертикальное положение hero-контента

## Source visual truth

- Focused reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-186a1694-a4c4-4738-b817-0e31f90fa311.png` (764 × 594 px).
- Explicit follow-up: поднять выше весь мобильный контент «Долей», затем так же поднять «Аукцион»; на «Тест-драйве» выровнять правый отступ кнопки вопроса с другими страницами.
- Earlier browser captures used as before-state evidence:
  - `/Users/vtichonenko/newsellyourbrick/qa/section-info-heading/shares-mobile.png`
  - `/Users/vtichonenko/newsellyourbrick/qa/section-info-heading/auction-mobile.png`
  - `/Users/vtichonenko/newsellyourbrick/qa/section-info-heading/test-drive-mobile.png`

## Implementation evidence

- `/Users/vtichonenko/newsellyourbrick/qa/section-info-heading/shares-mobile-lifted.png`
- `/Users/vtichonenko/newsellyourbrick/qa/section-info-heading/auction-mobile-refined.png`
- `/Users/vtichonenko/newsellyourbrick/qa/section-info-heading/test-drive-mobile-refined.png`
- Each implementation capture: 352 × 800 px at a 352 × 800 CSS viewport, device scale factor 1.
- State: Russian locale, signed-out mobile hero, drawer closed in screenshots.
- Density normalization: the supplied shares reference is a focused crop rather than a full viewport. The focused hero region was compared by relative spacing; before/after implementation captures are equal-size native 1× screenshots.

## Full-view comparison

- Shares and auction hero content each moved upward by 20 CSS px as one block; internal spacing, heading hierarchy, CTA size, imagery, and scroll controls remain unchanged.
- At 352 px, shares CTA now ends at y=512 and auction CTA at y=500, leaving clearer separation above their fixed scroll controls.
- Test-drive title row now spans from x=18 to x=334; the question trigger has an 18 px right edge, matching the debts page and the shared mobile page inset.
- No horizontal overflow, clipping, or collision is visible.

## Focused region comparison

- The supplied shares crop and the before/after shares captures were reviewed together: the complete content stack is higher without changing its internal rhythm.
- Auction before/after captures show the same 20 px upward shift from copy top y=269 to y=249.
- Test-drive before/after captures show the question trigger moving from a 12 px to an 18 px right inset while retaining a 44 × 44 px target.

## Required fidelity surfaces

- Fonts and typography: unchanged; headings remain unwrapped and retain existing weights, line height, and hierarchy.
- Spacing and layout rhythm: shares and auction receive an identical 1.25rem mobile lift; test-drive uses the shared 18 px horizontal inset at smartphone widths.
- Colors and visual tokens: unchanged; white/black question control and Tiffany drawer accent remain intact.
- Image quality and asset fidelity: hero images, crops, and 3D drawer assets are unchanged.
- Copy and content: unchanged.

## Primary interactions and console

- Opened and closed the repositioned test-drive question control successfully.
- Drawer retained the computed Tiffany accent `#16a7b3`.
- Browser console errors: none.

## Findings

- No actionable P0/P1/P2 differences remain in the requested scope.

## Open questions

- None.

## Implementation checklist

- [x] Lift shares mobile hero stack by 20 px.
- [x] Lift auction mobile hero stack by the same 20 px.
- [x] Align test-drive question control to an 18 px smartphone edge.
- [x] Verify 352 × 800 responsive layout and interaction.
- [x] Run regression tests.

## Comparison history

- Earlier finding: shares and auction content sat slightly too low relative to the fixed scroll control; test-drive question control used a 12 px right inset instead of the 18–20 px rhythm used elsewhere.
- Fix: added a 1.25rem bottom margin to the two mobile content stacks and standardized test-drive mobile content padding to 18 px, including phones at or below 374 px.
- Post-fix evidence: the three refined screenshots above, measured 20 px upward motion for auction, and measured 18 px test-drive trigger inset.

## Follow-up polish

- No P3 item is required for this scoped adjustment.

final result: passed

---

# Design QA — упрощённое сканирование лица

## Source visual truth

- Исходник: прикреплённый пользователем мобильный экран сканирования лица (720 × 1118 px в отображённом референсе).
- Уточнения: убрать чёрные блоки со стадиями, сократить текст, оставить понятную иконку и стрелки.

## Implementation evidence

- Изменены `/Users/vtichonenko/newsellyourbrick/src/components/VerificationModal.jsx` и `/Users/vtichonenko/newsellyourbrick/src/components/VerificationModal.css`.
- Целевой viewport: 430 × 850 CSS px, device scale factor 1.
- Состояние: шаг selfie, лицо по центру, камера в preview-режиме без запроса доступа к устройству.
- Browser-rendered implementation screenshot: отсутствует — локальный URL был заблокирован политикой Browser после перезапуска preview.

## Full-view comparison evidence

- Исходное состояние открыто и изучено.
- Реализация не может быть визуально сопоставлена в одном comparison input без browser-rendered screenshot.

## Focused region comparison evidence

- Заблокировано по той же причине: скриншот реализации недоступен.

## Required fidelity surfaces

- Fonts and typography: код использует существующий Montserrat; тексты сокращены до заголовка и одной строки подсказки.
- Spacing and layout rhythm: удалены верхняя карточка этапов и крупная нижняя карточка; добавлена одна компактная светлая подсказка.
- Colors and visual tokens: тёмные панели удалены; сохранены Tiffany-контур и светлые пиктограммы.
- Image quality and asset fidelity: новые растровые ассеты не добавлялись; используются иконки из `react-icons/fi`, камера остаётся живым video-feed.
- Copy and content: подсказки сокращены до простых команд «Лицо в центре», «Следуйте за стрелкой», «Не двигайтесь — делаем фото».

## Primary interactions and console

- Production build прошёл успешно.
- Визуальная проверка направления стрелок, адаптивности и runtime console заблокирована политикой локального URL.

## Findings

- [P2] Нет browser-rendered evidence после последней правки.
  Location: экран selfie liveness.
  Evidence: исходник доступен, но финальный локальный экран не удалось повторно открыть после browser policy block.
  Impact: нельзя подтвердить расположение подсказки и стрелок на реальном viewport.
  Fix: открыть preview вручную или повторить Browser QA после снятия ограничения локального URL.

## Implementation checklist

- [x] Удалить верхний чёрный блок со стадиями.
- [x] Удалить нижний чёрный блок с повторяющимися статусами.
- [x] Оставить одну компактную светлую подсказку.
- [x] Заменить рисованные SVG на понятные иконки и стрелки из библиотеки.
- [x] Сохранить liveness-логику и автоматическое фото.
- [ ] Получить финальный browser-rendered screenshot и завершить визуальное сравнение.

## Comparison history

- Исходная версия содержала две крупные тёмные панели, progress bars, eyebrow, title, detail и дополнительный live-feedback.
- Код упрощён до овала, одной иконки, направляющих стрелок и компактной светлой подсказки.
- Post-fix visual evidence отсутствует из-за блокировки Browser URL policy.

## Follow-up polish

- После визуального открытия проверить положение стрелок относительно лица на узком экране 320 px.

final result: blocked

---

# Design QA — QR-модалка оплаты в кошельке

## Source visual truth

- Исходный фрагмент кошелька: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-4bdd79e2-5938-4fda-980b-d0e8c6c7825d.png` (682 × 482 px, 144 ppi).
- Уточнения пользователя: QR предназначен для оплаты; внутри оставить только кнопку копирования; модальное окно расположить по центру экрана.

## Implementation evidence

- Рендер модального состояния: `/Users/vtichonenko/newsellyourbrick/audit-output/wallet-payment-qr-modal.png`.
- Совмещённое сравнение: `/Users/vtichonenko/newsellyourbrick/audit-output/wallet-payment-qr-comparison.png`.
- Viewport и CSS-размер: 430 × 850 px; нативный снимок 430 × 850 px; device scale factor 1.
- Состояние: русский язык, `walletPreview=1`, платёжная QR-модалка открыта.
- Нормализация: исходник является частичным кропом закрытого экрана, поэтому сравнение оценивает расположение и стиль чёрного QR-триггера и визуальную совместимость новой модалки; точное попиксельное сравнение открытого состояния невозможно, так как его нет в исходнике.

## Full-view comparison evidence

- Чёрный QR-триггер сохранён в исходной строке действий и открывает диалог вместо перехода на страницу торгов.
- Диалог расположен по центру viewport: измеренное смещение центра по вертикали — 1 CSS px.
- Затемнение и размытие сохраняют контекст кошелька, а белая карточка, скругления, Tiffany-акценты и тёмная типографика продолжают визуальный язык исходного экрана.
- QR остаётся крупным и контрастным; единственное основное действие — «Скопировать».

## Focused region comparison evidence

- Дополнительный focused crop не нужен: исходное изображение уже является сфокусированным кропом нужной строки действий, а совмещённый файл показывает этот кроп рядом с полным открытым состоянием.

## Required fidelity surfaces

- Fonts and typography: используется существующий Montserrat; заголовок, описание и подсказка имеют ясную иерархию и не обрезаются на 430 px.
- Spacing and layout rhythm: модалка центрирована, QR и текст выровнены по общей оси; внутренние отступы и радиусы согласованы с кошельком.
- Colors and visual tokens: белая поверхность, Tiffany-акценты и тёмный ink соответствуют исходной палитре; контраст текста и QR достаточный.
- Image quality and asset fidelity: QR генерируется библиотекой `qrcode` в 640 px с error correction H и отображается без растяжения; интерфейсные пиктограммы взяты из существующей icon library.
- Copy and content: весь текст относится к безопасной оплате; торговая терминология удалена из модалки.

## Primary interactions and console

- Проверено открытие по чёрной QR-кнопке.
- Проверено закрытие по фону и клавише Escape.
- Проверено состояние «Скопировано» после нажатия единственной основной кнопки.
- Ошибки консоли: отсутствуют.

## Findings

- Actionable P0/P1/P2 различий в согласованном объёме не осталось.

## Open questions

- Платёжный провайдер и финальный payload пока не заданы; текущий QR ведёт на `/wallet?payment=qr`, что оставляет стабильную точку для последующей интеграции.

## Implementation checklist

- [x] Открывать QR-модалку по чёрному триггеру.
- [x] Переписать заголовок, описание, alt и подсказку под оплату.
- [x] Убрать вторую чёрную кнопку и оставить только копирование.
- [x] Центрировать диалог на мобильном viewport.
- [x] Проверить открытие, копирование и два способа закрытия.

## Comparison history

- Первая версия была посвящена переходу к торгам и содержала вторую чёрную CTA.
- После уточнений пользователя QR переведён на платёжный entry URL, торговые тексты заменены, CTA удалена, мобильное выравнивание изменено с нижнего sheet на центрированное окно.
- Post-fix evidence: финальный рендер и совмещённое сравнение, перечисленные выше.

## Follow-up polish

- После подключения платёжного провайдера заменить временный entry URL на подписанный платёжный payload с суммой и сроком действия.

final result: passed

---

# Design QA — сетка удобств объекта

## Source visual truth

- Layout reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-6f783237-7d62-4338-a82c-5f4b182dc046.png` (696 × 1378 px).
- Selected-state reference: `/var/folders/c8/gpqh9xf946vd864n2qjcts640000gp/T/codex-clipboard-d4817f11-f22c-440e-b2c4-a10b54d53a51.png` (556 × 178 px).
- Explicit follow-up: keep amenity buttons directly on the white page background and use the shared primary-button Tiffany treatment for selected amenities.

## Implementation evidence

- `/Users/vtichonenko/newsellyourbrick/qa/amenities/amenities-grid-696.png`
- Full comparison: `/Users/vtichonenko/newsellyourbrick/qa/amenities/amenities-comparison-696.png`
- Selected-state comparison: `/Users/vtichonenko/newsellyourbrick/qa/amenities/amenities-active-state-comparison.png`
- Viewport: 696 × 1378 CSS px, native 696 × 1378 screenshot, device scale factor 1.
- Responsive check: 320 × 700 CSS px.
- State: Russian locale, house amenities, “Эксплуатируемая кровля” selected.
- Density normalization: layout source and implementation are both 696 px wide at native 1×. The focused active-state implementation crop was resized with aspect-fit beside the 556 × 178 source crop.

## Full-view comparison evidence

- The source's uneven auto-width chip rows were replaced with a consistent two-column rhythm; long labels span both columns.
- Category headings and controls remain directly on the white page background, with no enclosing category cards.
- Pill geometry, icon circles, section order, copy, and white/tiffany palette remain faithful to the supplied references.
- No horizontal overflow, clipping, or collisions are visible at 696 px or 320 px.

## Focused region comparison evidence

- `amenities-active-state-comparison.png` compares the supplied active pill and the rendered active pill in one image.
- Both use a full-width pill, white label and icon, Tiffany gradient, soft glow, and light sheen. The implementation deliberately uses the project's shared `--syb-tiffany-btn-*` tokens and sheen animation, matching the “Далее” CTA.

## Required fidelity surfaces

- Fonts and typography: existing product font and hierarchy retained; labels wrap without truncation and keep readable weight at 320 px.
- Spacing and layout rhythm: equal columns and 8 px gaps replace ragged rows; 22 px category spacing remains clear without wrapper cards.
- Colors and visual tokens: inactive buttons stay white; active buttons use the shared primary Tiffany fill, shadow, sheen, and white foreground.
- Image quality and asset fidelity: no raster assets are introduced or changed; existing Lucide amenity icons remain crisp and correctly scaled.
- Copy and content: all amenity names, category headings, and the additional-details field remain unchanged.

## Primary interactions and console

- Toggled the “Эксплуатируемая кровля” amenity on and off; `aria-pressed` behavior and visual selection state update correctly.
- Checked the rendered page logs; no application errors were present. Existing development-only third-party warnings are unrelated to this change.

## Findings

- No actionable P0/P1/P2 differences remain in the requested scope.

## Open questions

- None.

## Implementation checklist

- [x] Replace uneven wrapping with a stable two-column grid.
- [x] Span long amenity names across both columns.
- [x] Keep groups directly on the page background.
- [x] Match selected amenities to the shared Tiffany CTA style.
- [x] Verify 696 px and 320 px layouts and selection interaction.

## Comparison history

- Earlier finding: auto-width pills produced ragged rows and long labels broke the visual rhythm; selected amenities used a separate dark gradient.
- First fix: introduced equal tracks and category panels, then removed the panels after the user's follow-up so controls sit directly on the white background.
- Final fix: restored pill geometry and applied the shared CTA gradient, shadow, white foreground, and sheen animation to selected amenities.
- Post-fix evidence: the full and focused comparison images listed above.

## Follow-up polish

- No P3 item is required for this scoped adjustment.

final result: passed
