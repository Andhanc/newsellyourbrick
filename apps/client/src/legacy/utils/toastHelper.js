import { showToast } from '../components/ToastContainer'
import { isStructuredToastEvent } from './toastModel'

/**
 * Replaces alert() with toast notifications.
 * Infers toast type from message content when type is omitted.
 */
export const showNotification = (messageOrEvent, type = null, duration = 4000) => {
  if (isStructuredToastEvent(messageOrEvent)) {
    return showToast(messageOrEvent)
  }

  if (!type) {
    const messageLower = typeof messageOrEvent === 'string' ? messageOrEvent.toLowerCase() : ''

    if (
      messageLower.includes('success') ||
      messageLower.includes('saved') ||
      messageLower.includes('sent') ||
      messageLower.includes('uploaded') ||
      messageLower.includes('copied') ||
      messageLower.includes('confirmed') ||
      messageLower.includes('✅') ||
      messageLower.includes('успешно') ||
      messageLower.includes('сохранен') ||
      messageLower.includes('отправлен') ||
      messageLower.includes('загружен') ||
      messageLower.includes('скопирован') ||
      messageLower.includes('подтвержден')
    ) {
      type = 'success'
    } else if (
      messageLower.includes('error') ||
      messageLower.includes('failed') ||
      messageLower.includes('not found') ||
      messageLower.includes('unauthorized') ||
      messageLower.includes('unavailable') ||
      messageLower.includes('not supported') ||
      messageLower.includes('exceeds') ||
      messageLower.includes('❌') ||
      messageLower.includes('ошибка') ||
      messageLower.includes('не удалось') ||
      messageLower.includes('не найден') ||
      messageLower.includes('не авторизован') ||
      messageLower.includes('недоступн') ||
      messageLower.includes('не поддерживается') ||
      messageLower.includes('превышает')
    ) {
      type = 'error'
    } else if (
      messageLower.includes('please') ||
      messageLower.includes('required') ||
      messageLower.includes('maximum') ||
      messageLower.includes('cannot') ||
      messageLower.includes('temporarily') ||
      messageLower.includes('пожалуйста') ||
      messageLower.includes('необходимо') ||
      messageLower.includes('максимум') ||
      messageLower.includes('нельзя') ||
      messageLower.includes('временно')
    ) {
      type = 'warning'
    } else {
      type = 'info'
    }
  }

  return showToast(messageOrEvent, type, duration)
}

export default showNotification
