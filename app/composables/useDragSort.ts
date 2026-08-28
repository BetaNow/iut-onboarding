// Pointer-driven list reordering. Pointer events rather than HTML5 drag-and-drop,
// which does not fire on touch, and the admin is used on a phone as often as at
// a desk.
//
// Nothing is reordered while the finger moves: the dragged row is drawn
// translated, an insertion line marks the landing spot, and the move is committed
// on release. Reordering live would invalidate the rectangles the drop target is
// computed from.
export function useDragSort(commit: (from: number, to: number) => void) {
  const container = ref<HTMLElement | null>(null)
  const draggingIndex = ref<number | null>(null)
  const targetIndex = ref<number | null>(null)
  const offsetY = ref(0)

  let rects: DOMRect[] = []
  let startY = 0
  let handle: HTMLElement | null = null
  let pointerId = -1

  function measure() {
    const items = container.value?.querySelectorAll<HTMLElement>('[data-sort-item]') ?? []

    rects = Array.from(items, item => item.getBoundingClientRect())
  }

  function move(event: PointerEvent) {
    const from = draggingIndex.value

    if (from === null || !rects[from]) {
      return
    }

    offsetY.value = event.clientY - startY

    const centre = rects[from].top + rects[from].height / 2 + offsetY.value
    let target = from

    for (let index = 0; index < rects.length; index += 1) {
      const rect = rects[index]!
      const middle = rect.top + rect.height / 2

      if (index < from && centre < middle) {
        target = index
        break
      }

      if (index > from && centre > middle) {
        target = index
      }
    }

    targetIndex.value = target
  }

  function end() {
    const from = draggingIndex.value
    const to = targetIndex.value

    if (from !== null && to !== null && from !== to) {
      commit(from, to)
    }

    if (handle && pointerId !== -1 && handle.hasPointerCapture(pointerId)) {
      handle.releasePointerCapture(pointerId)
    }

    draggingIndex.value = null
    targetIndex.value = null
    offsetY.value = 0
    handle = null
    pointerId = -1

    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
  }

  function start(event: PointerEvent, index: number) {
    // Left button only for a mouse; touch and pen report button 0 anyway.
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    measure()

    if (!rects.length) {
      return
    }

    handle = event.currentTarget as HTMLElement
    pointerId = event.pointerId
    draggingIndex.value = index
    targetIndex.value = index
    startY = event.clientY
    offsetY.value = 0

    handle.setPointerCapture(pointerId)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)

    // Stops the gesture turning into a text selection or a page scroll.
    event.preventDefault()
  }

  onUnmounted(() => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
  })

  /** Where the insertion line goes for a given row, if anywhere. */
  function dropEdge(index: number): 'before' | 'after' | null {
    const from = draggingIndex.value
    const to = targetIndex.value

    if (from === null || to === null || from === to || index !== to) {
      return null
    }

    return to < from ? 'before' : 'after'
  }

  return { container, draggingIndex, targetIndex, offsetY, start, dropEdge }
}
