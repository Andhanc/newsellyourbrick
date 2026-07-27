export function createCompareAiRequestGuard() {
  let activeRequestId = 0
  let activeController = null

  return {
    start() {
      activeController?.abort()
      activeController = new AbortController()
      activeRequestId += 1
      return { requestId: activeRequestId, signal: activeController.signal }
    },
    isCurrent(requestId) {
      return requestId === activeRequestId
    },
    cancel() {
      activeRequestId += 1
      activeController?.abort()
      activeController = null
    },
  }
}
