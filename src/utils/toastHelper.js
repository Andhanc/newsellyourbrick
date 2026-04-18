import { showToast } from '../components/ToastContainer'

/**
 * Утилита для замены alert() на красивые toast-уведомления
 * Автоматически определяет тип уведомления по содержимому сообщения
 */
export const showNotification = (message, type = null, duration = 4000) => {
  // Если тип не указан, определяем автоматически
  if (!type) {
    const messageLower = typeof message === 'string' ? message.toLowerCase() : ''
    
    // Успешные сообщения
    if (
      messageLower.includes('успешно') ||
      messageLower.includes('успешно') ||
      messageLower.includes('сохранен') ||
      messageLower.includes('отправлен') ||
      messageLower.includes('загружен') ||
      messageLower.includes('✅') ||
      messageLower.includes('скопирован') ||
      messageLower.includes('подтвержден')
    ) {
      type = 'success'
    }
    // Ошибки
    else if (
      messageLower.includes('ошибка') ||
      messageLower.includes('не удалось') ||
      messageLower.includes('не найден') ||
      messageLower.includes('не авторизован') ||
      messageLower.includes('❌') ||
      messageLower.includes('недоступн') ||
      messageLower.includes('не поддерживается') ||
      messageLower.includes('превышает')
    ) {
      type = 'error'
    }
    // Предупреждения
    else if (
      messageLower.includes('пожалуйста') ||
      messageLower.includes('необходимо') ||
      messageLower.includes('максимум') ||
      messageLower.includes('нельзя') ||
      messageLower.includes('временно')
    ) {
      type = 'warning'
    }
    // Информационные сообщения
    else {
      type = 'info'
    }
  }

  return showToast(message, type, duration)
}

// Экспортируем также прямую функцию для обратной совместимости
export default showNotification

