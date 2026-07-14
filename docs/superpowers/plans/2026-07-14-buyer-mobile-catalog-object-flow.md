# Buyer Mobile Wave 2: Catalog and Object Flow

## Goal

Перевести мобильный путь `главная → каталог/поиск/карта → карточка → объект` на общую buyer-систему, сохранив desktop и существующие доменные обработчики.

## Tasks

1. Подключить единый `resolveBuyerListingState` и `BuyerStatusRibbon` к основным карточкам каталога; различить `sold`, `auction-ended`, `reserved` и заблокировать устаревшие денежные CTA.
2. Добавить общий mobile surface/action contract для карточек: реальные фото, 44 px favorite/actions, не более двух характеристик, финальный recovery-action.
3. Проверить и выровнять header/navigation touch targets и safe-area offsets на 320–767 px.
4. Провести runtime-аудит `/`, `/auction`, `/search-results`, `/map`, `/favorites` и property detail на 320/390/767 px; исправить overflow, перекрытия и сломанные изображения.
5. Перевести success/guard состояния detail-действий на `BuyerSheetShell`, не меняя серверные проверки и порядок login → role → KYC → availability → deposit.
6. Запустить component/unit suite, build и визуальную матрицу; зафиксировать волну отдельным коммитом.

## Verification

- sold и ended визуально/семантически различаются;
- финальные карточки не показывают bid/buy controls;
- отсутствует горизонтальный scroll на 320, 360, 390, 430 и 767 px;
- header и основные actions имеют минимум 44×44 px;
- detail сохраняет один доминирующий CTA и server-confirmed success;
- desktop smoke-check не показывает регрессий.
