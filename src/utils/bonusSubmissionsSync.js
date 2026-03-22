const CHANNEL_NAME = 'sellyourbrick-bonus-submissions-v1'

/** Сообщает всем вкладкам приложения, что данные по бонусным заявкам изменились (без polling). */
export function notifyBonusSubmissionsChanged() {
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME)
    bc.postMessage({})
    bc.close()
  } catch {
    /* ignore */
  }
}

export function subscribeBonusSubmissionsChanged(callback) {
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME)
    bc.onmessage = () => callback()
    return () => bc.close()
  } catch {
    return () => {}
  }
}
