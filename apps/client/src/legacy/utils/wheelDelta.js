/** WheelEvent deltas use pixels, lines, or pages depending on the device/browser. */
export function wheelDeltaYInPixels(event, pageHeight) {
  if (event.deltaMode === 1) return event.deltaY * 16
  if (event.deltaMode === 2) return event.deltaY * Math.max(1, pageHeight)
  return event.deltaY
}
