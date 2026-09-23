/** Keep layout reads out of the scroll hot path and only publish changed controls. */
export function createShowcaseScroller(scroller, onChange) {
  let frame = 0
  let dirty = true
  let disposed = false
  let previous = ''
  let maxScroll = 0
  let stride = 0
  let targets = [0]
  const slot = scroller.querySelector('.home-showcase__slot')

  const measure = () => {
    const width = scroller.clientWidth
    maxScroll = Math.max(0, scroller.scrollWidth - width)
    const gap = Number.parseFloat(getComputedStyle(scroller).columnGap) || 0
    stride = (slot?.getBoundingClientRect().width || width) + gap
    const visible = Math.max(1, Math.floor((width + gap) / Math.max(1, stride)))
    const count = scroller.children.length
    targets = [...new Set(Array.from(
      { length: Math.max(1, Math.ceil(count / visible)) },
      (_, index) => Math.min(maxScroll, index * visible * stride),
    ))]
    dirty = false
  }

  const update = () => {
    frame = 0
    if (disposed) return
    if (dirty) measure()
    const left = Math.max(0, Math.min(maxScroll, scroller.scrollLeft))
    let activePage = 0
    targets.forEach((target, index) => {
      if (Math.abs(target - left) < Math.abs(targets[activePage] - left)) activePage = index
    })
    const next = {
      activePage,
      pageCount: targets.length,
      canScrollPrev: maxScroll > 8 && left > 8,
      canScrollNext: maxScroll > 8 && left < maxScroll - 8,
    }
    const key = JSON.stringify(next)
    if (key !== previous) {
      previous = key
      onChange(next)
    }
  }
  const schedule = () => {
    if (!frame && !disposed) frame = window.requestAnimationFrame(update)
  }
  const invalidate = () => { dirty = true; schedule() }
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(invalidate) : null
  observer?.observe(scroller)
  if (slot) observer?.observe(slot)
  scroller.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', invalidate)
  update()

  const behavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  return {
    scrollByDirection(direction) {
      if (dirty) measure()
      scroller.scrollBy({ left: direction * stride, behavior: behavior() })
    },
    goToPage(index) {
      if (dirty) measure()
      scroller.scrollTo({ left: targets[index] ?? 0, behavior: behavior() })
    },
    destroy() {
      disposed = true
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
      scroller.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', invalidate)
    },
  }
}
