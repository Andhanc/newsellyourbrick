import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.join(__dirname, '../src/i18n/locales/mainPage')

const EXTRA = {
  en: {
    oap_fileSizeB: '{{size}} B',
    oap_fileSizeKB: '{{size}} KB',
    oap_fileSizeMB: '{{size}} MB',
    oap_fileTooLarge: '«{{name}}» exceeds 10 MB',
    oap_docsMaxAdditional: 'Maximum {{count}} additional documents',
    oap_docsAddedPartial: 'Added {{added}} of {{total}} — limit {{max}}',
    oap_fileReadError: 'Could not read «{{name}}»',
    oap_docsOptionalMark: '(optional)',
    oap_docsRemoveDoc: 'Remove {{name}}',
    oap_docsUploadFile: 'Upload file',
    oap_docsFormats: 'PDF, JPG, PNG up to 10 MB',
    oap_docsSecurityTitle: 'Important',
    oap_docsSecurityText:
      'All documents are encrypted and used only for verification and publication.',
    oap_docsMaxFilesHint: 'Up to {{count}} additional files allowed',
    oap_docsMaxDebtFilesHint: 'Up to {{count}} debt-sale files allowed',
    oap_mediaMaxPhotos: 'Maximum {{count}} photos allowed',
    oap_mediaPhotosAddedPartial: 'Added {{added}} of {{total}} — limit {{max}} photos',
    oap_mediaMaxVideos: 'Maximum {{count}} videos allowed',
    oap_mediaVideosRemaining: 'You can upload {{count}} more video(s)',
    oap_mediaNotVideoFile: '«{{name}}» is not a video file',
    oap_mediaVideoTooLong: '«{{name}}» is longer than 1 minute ({{seconds}} sec.) — upload a shorter clip',
    oap_mediaReadVideoError: 'Could not read video «{{name}}»',
    oap_mediaPhotoTipTitle: 'Add at least 5 photos',
    oap_mediaPhotoTipText: 'Listings without photos or with few photos get <strong>60% fewer views</strong>',
    oap_mediaAddMore: 'Add more',
    oap_mediaAddShort: 'Add',
    oap_mediaNoPhotosTitle: 'No photos yet',
    oap_mediaNoPhotosDesc:
      'Start with the facade, living room, kitchen and window view — buyers will understand the property faster',
    oap_mediaVideoTip: 'Listings with video — <strong>30% higher test-drive conversion</strong>',
    oap_mediaVideoBadge: 'Video',
    oap_mediaVideoSourceTitle: 'Choose video source',
    oap_mediaVideoSourceSubtitle: 'Add video in one of three ways',
    oap_mediaFromDevice: 'From device',
    oap_cancel: 'Cancel',
    oap_add: 'Add',
    ownerTestDriveDetailCancelledByOwner: 'Cancelled by owner',
    ownerTestDriveDetailCancelledByBuyer: 'Cancelled by buyer',
    ownerTestDriveDetailCancelled: 'Cancelled',
    ownerTestDriveDetailApproved: 'Test drive confirmed',
    ownerTestDriveDetailRejected: 'Request declined',
    ownerTestDriveDetailActionFailed: 'Could not complete action',
    ownerTestDriveDetailCancelReasonRequired: 'Enter a reason for cancellation',
    ownerTestDriveDetailCancelSuccess: 'Booking cancelled; reason sent to buyer',
    ownerTestDriveDetailCancelFailed: 'Could not cancel booking',
    ownerTestDriveDetailReject: 'Decline',
    ownerTestDriveDetailCancelBooking: 'Cancel booking',
    ownerTestDriveDetailConfirm: 'Confirm',
    ownerTestDriveDetailConfirmTitle: 'Confirm request',
    ownerTestDriveDetailConfirmHint:
      'Tell the buyer check-in time, where to pick up keys and other instructions — confirmation will not be sent without this.',
    ownerTestDriveDetailCommentLabel: 'Comment for buyer',
    ownerTestDriveDetailCommentPlaceholder:
      'E.g.: Check-in from 3 PM, keys at concierge, intercom code 1234.',
    ownerTestDriveDetailBack: 'Back',
    ownerTestDriveDetailConfirmSend: 'Confirm and send',
    ownerTestDriveDetailSending: 'Sending…',
    ownerTestDriveDetailCancelTitle: 'Cancel booking',
    ownerTestDriveDetailCancelHint: 'Enter a reason — it will be sent to the buyer.',
    ownerTestDriveDetailCancelReasonLabel: 'Cancellation reason',
    ownerTestDriveDetailCancelPlaceholder:
      'E.g.: property temporarily unavailable, rescheduling to other dates.',
    ownerTestDriveDetailCancelling: 'Cancelling…',
    ownerTestDriveDetailClose: 'Close',
    ownerTestDriveDetailTenant: 'Tenant',
    ownerTestDriveDetailDates: 'Dates',
    ownerTestDriveDetailDeposit: 'Deposit',
    ownerTestDriveDetailCheckedIn: 'Guest checked in',
    ownerTestDriveDetailIssuesReported: 'Buyer reported issues',
    ownerTestDriveDetailInstructions: 'Instructions for buyer',
    ownerTestDriveDetailInstructionsRequired:
      'After confirming, specify where to pick up keys, check-in time and intercom code — this is required.',
    ownerTestDriveNights_few: '{{count}} nights',
    ownerTestDriveNights_many: '{{count}} nights',
    oap_locationMapTitle: 'Address on map',
    oap_locationMapSubtitle:
      'Country and city from searchable lists. Pick a street from suggestions, then fine-tune the point with the map marker.',
    oap_calculatorCardTitle: 'Price calculator',
    oap_calculatorCardHint:
      'Property details are already filled — adjust the district if needed and run the estimate.',
    oap_calculatorAutoTitle: 'Automatic price estimate',
    oap_calculatorAutoDesc:
      'Estimate based on similar listings. You can adjust amounts on the next step after calculation.',
    oap_calculatorSidebarAria: 'Tip',
    oap_calculatorSidebarTitle: 'Tip',
    oap_calculatorSidebarP1:
      'The estimate uses similar listings in the selected city. It is a guide — you set final amounts on the pricing step.',
    oap_calculatorSidebarP2:
      'The more accurate the area, district and property type, the closer the estimate. Adjust the district in the form before calculating if needed.',
    oap_calculatorSidebarLi1: 'Use the result as a starting point for an auction',
    oap_calculatorSidebarLi2: 'After calculation, apply amounts to price fields in one click',
    oap_calculatorSidebarLi3: 'Markets change — you always control the final price',
    oap_listingChooseFormat: 'Choose sale format',
    oap_listingChooseFormatDesc: 'Define how the property will be published on the platform',
    oap_listingPlacementType: 'Listing type',
    oap_listingSidebarAria: 'Tip',
    oap_listingSidebarTitle: 'Tip',
    oap_listingSidebarP1:
      'Pick a format for your property: classic auction, bidding with instant buy, fractional shares, or debt assets.',
    oap_listingSidebarP2:
      'Auction with buy-now speeds up deals. Shares suit multiple investors. You can change the format before publishing.',
    oap_tdPricingTitle: 'Test-drive pricing',
    oap_tdPricePerDay: 'Price per day',
    oap_tdPricePerDayHint: 'Cost for one day of viewing or stay',
    oap_tdInsuranceDeposit: 'Insurance deposit',
    oap_tdInsuranceDepositHint: 'Refunded after viewing if there is no damage',
    oap_tdFormatNoteTitle: 'Sale format',
    oap_tdFormatNoteBody:
      'Test drive works only with «Auction + Buy now» — select it in the sale format block below.',
    oap_tdConfigureView: 'Set up viewing option',
    oap_tdConfigureViewDesc: 'Interested buyers can book a viewing or short stay',
    oap_tdConfigureViewShort: 'Set up viewing',
    oap_tdBuyersCanBook: 'Buyers can book a viewing or short stay at your property',
    oap_tdSidebarAria: 'Tip',
    oap_tdSidebarTitle: 'Tip',
    oap_tdSidebarText:
      'Test drive attracts more interested buyers — they can «try» the property before the deal and feel the atmosphere on site.',
  },
  ru: {
    oap_fileSizeB: '{{size}} Б',
    oap_fileSizeKB: '{{size}} КБ',
    oap_fileSizeMB: '{{size}} МБ',
    oap_fileTooLarge: '«{{name}}» больше 10 МБ',
    oap_docsMaxAdditional: 'Максимум {{count}} дополнительных документов',
    oap_docsAddedPartial: 'Добавлено {{added}} из {{total}} — лимит {{max}}',
    oap_fileReadError: 'Не удалось прочитать «{{name}}»',
    oap_docsOptionalMark: '(необязательно)',
    oap_docsRemoveDoc: 'Удалить {{name}}',
    oap_docsUploadFile: 'Загрузить файл',
    oap_docsFormats: 'PDF, JPG, PNG до 10 МБ',
    oap_docsSecurityTitle: 'Важно',
    oap_docsSecurityText:
      'Все документы шифруются и используются только для проверки и публикации объекта.',
    oap_docsMaxFilesHint: 'Можно загрузить до {{count}} дополнительных файлов',
    oap_docsMaxDebtFilesHint: 'Можно загрузить до {{count}} файлов по продаже долга',
    oap_mediaMaxPhotos: 'Можно загрузить максимум {{count}} фото',
    oap_mediaPhotosAddedPartial: 'Добавлено {{added}} из {{total}} — лимит {{max}} фото',
    oap_mediaMaxVideos: 'Можно загрузить максимум {{count}} видео',
    oap_mediaVideosRemaining: 'Можно загрузить ещё {{count}} видео',
    oap_mediaNotVideoFile: '«{{name}}» не является видеофайлом',
    oap_mediaVideoTooLong:
      '«{{name}}» длиннее 1 минуты ({{seconds}} сек.) — загрузите короче',
    oap_mediaReadVideoError: 'Не удалось прочитать видео «{{name}}»',
    oap_mediaPhotoTipTitle: 'Добавьте минимум 5 фото',
    oap_mediaPhotoTipText:
      'Объекты без фото или с малым количеством фотографий получают на <strong>60% меньше просмотров</strong>',
    oap_mediaAddMore: 'Добавить еще',
    oap_mediaAddShort: 'Добавить',
    oap_mediaNoPhotosTitle: 'Пока нет фото',
    oap_mediaNoPhotosDesc:
      'Начните с фасада, гостиной, кухни и вида из окна — так покупатель быстрее представит объект',
    oap_mediaVideoTip: 'Объекты с видео — <strong>выше конверсия в тест-драйв на 30%</strong>',
    oap_mediaVideoBadge: 'Видео',
    oap_mediaVideoSourceTitle: 'Выберите источник видео',
    oap_mediaVideoSourceSubtitle: 'Добавьте видео одним из трёх способов',
    oap_mediaFromDevice: 'С устройства',
    oap_cancel: 'Отмена',
    oap_add: 'Добавить',
    ownerTestDriveDetailCancelledByOwner: 'Отменено владельцем',
    ownerTestDriveDetailCancelledByBuyer: 'Отменено покупателем',
    ownerTestDriveDetailCancelled: 'Отменено',
    ownerTestDriveDetailApproved: 'Тест-драйв подтверждён',
    ownerTestDriveDetailRejected: 'Заявка отклонена',
    ownerTestDriveDetailActionFailed: 'Не удалось выполнить действие',
    ownerTestDriveDetailCancelReasonRequired: 'Укажите причину снятия брони',
    ownerTestDriveDetailCancelSuccess: 'Бронь снята, покупателю отправлена причина',
    ownerTestDriveDetailCancelFailed: 'Не удалось снять бронь',
    ownerTestDriveDetailReject: 'Отклонить',
    ownerTestDriveDetailCancelBooking: 'Снять бронь',
    ownerTestDriveDetailConfirm: 'Подтвердить',
    ownerTestDriveDetailConfirmTitle: 'Подтверждение заявки',
    ownerTestDriveDetailConfirmHint:
      'Укажите покупателю время заезда, где забрать ключи и другие инструкции — без этого подтверждение не отправится.',
    ownerTestDriveDetailCommentLabel: 'Комментарий для покупателя',
    ownerTestDriveDetailCommentPlaceholder:
      'Например: Заезд с 15:00, ключи у консьержа, код домофона 1234.',
    ownerTestDriveDetailBack: 'Назад',
    ownerTestDriveDetailConfirmSend: 'Подтвердить и отправить',
    ownerTestDriveDetailSending: 'Отправляем…',
    ownerTestDriveDetailCancelTitle: 'Снятие брони',
    ownerTestDriveDetailCancelHint: 'Укажите причину — она будет отправлена покупателю.',
    ownerTestDriveDetailCancelReasonLabel: 'Причина отмены',
    ownerTestDriveDetailCancelPlaceholder:
      'Например: объект временно недоступен, переносим на другие даты.',
    ownerTestDriveDetailCancelling: 'Снимаем…',
    ownerTestDriveDetailClose: 'Закрыть',
    ownerTestDriveDetailTenant: 'Арендатор',
    ownerTestDriveDetailDates: 'Даты',
    ownerTestDriveDetailDeposit: 'Залог',
    ownerTestDriveDetailCheckedIn: 'Клиент заселился',
    ownerTestDriveDetailIssuesReported: 'Покупатель сообщил о проблемах',
    ownerTestDriveDetailInstructions: 'Инструкции для покупателя',
    ownerTestDriveDetailInstructionsRequired:
      'После подтверждения укажите, где забрать ключи, время заезда и код домофона — это обязательно.',
    oap_locationMapTitle: 'Адрес на карте',
    oap_locationMapSubtitle:
      'Страна и город — из списка с поиском. Улицу выберите из подсказок, затем уточните точку маркером на карте.',
    oap_calculatorCardTitle: 'Калькулятор стоимости',
    oap_calculatorCardHint:
      'Параметры объекта уже заполнены — уточните район при необходимости и запустите расчёт.',
    oap_calculatorAutoTitle: 'Автоматический расчёт стоимости',
    oap_calculatorAutoDesc:
      'Оценка по похожим объявлениям с площадок. После расчёта ориентировочные суммы можно скорректировать на следующем шаге.',
    oap_calculatorSidebarAria: 'Совет',
    oap_calculatorSidebarTitle: 'Совет',
    oap_calculatorSidebarP1:
      'Расчёт основан на похожих объявлениях в выбранном городе. Это ориентир — финальные суммы вы задаёте сами на шаге «Цена и дата».',
    oap_calculatorSidebarP2:
      'Чем точнее площадь, район и тип объекта, тем ближе оценка к реальному рынку. При необходимости уточните район в форме слева перед расчётом.',
    oap_calculatorSidebarLi1: 'Используйте результат как стартовую точку для аукциона',
    oap_calculatorSidebarLi2: 'После расчёта суммы можно подставить в поля цены одним кликом',
    oap_calculatorSidebarLi3: 'Рынок меняется — итоговую цену всегда контролируете вы',
    oap_listingChooseFormat: 'Выберите формат продажи',
    oap_listingChooseFormatDesc: 'Определите способ публикации объекта на платформе',
    oap_listingPlacementType: 'Тип размещения',
    oap_listingSidebarAria: 'Совет',
    oap_listingSidebarTitle: 'Совет',
    oap_listingSidebarP1:
      'Выберите формат под ваш объект: классический аукцион, торги с мгновенным выкупом, продажа долей или работа с долговыми активами.',
    oap_listingSidebarP2:
      'Аукцион с выкупом ускоряет сделку — покупатель может сразу забрать объект по фиксированной цене. Продажа долей подойдёт, если хотите привлечь нескольких инвесторов. Формат можно изменить до публикации объявления.',
    oap_tdPricingTitle: 'Стоимость тест-драйва',
    oap_tdPricePerDay: 'Стоимость за сутки',
    oap_tdPricePerDayHint: 'Цена одних суток просмотра или проживания',
    oap_tdInsuranceDeposit: 'Страховой депозит',
    oap_tdInsuranceDepositHint: 'Возвращается после осмотра, если нет повреждений',
    oap_tdFormatNoteTitle: 'Формат продажи',
    oap_tdFormatNoteBody:
      'Тест-драйв сочетается только с вариантом «Аукцион + Продать сейчас» — выберите его в блоке формата продажи ниже.',
    oap_tdConfigureView: 'Настройте возможность просмотра',
    oap_tdConfigureViewDesc: 'Покупатели смогут записаться на просмотр или краткое проживание вашего объекта',
    oap_tdConfigureViewShort: 'Настройте возможность просмотра',
    oap_tdBuyersCanBook: 'Покупатели смогут записаться на просмотр или краткое проживание вашего объекта',
    oap_tdSidebarAria: 'Совет',
    oap_tdSidebarTitle: 'Совет',
    oap_tdSidebarText:
      'Тест-драйв позволяет привлечь больше заинтересованных покупателей — они смогут «примерить» объект перед сделкой и оценить атмосферу на месте.',
  },
}

for (const lang of ['en', 'ru', 'de', 'es', 'fr', 'sv']) {
  const filePath = path.join(localesDir, `${lang}.json`)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const source = lang === 'ru' ? EXTRA.ru : EXTRA.en
  for (const [k, v] of Object.entries(source)) {
    data[k] = v
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log('patched', lang, Object.keys(source).length, 'extra keys')
}
