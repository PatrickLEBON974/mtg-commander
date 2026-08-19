import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from 'vitest'
import { useCardSwipeGesture, type CardSwipeCallbacks } from '../useCardSwipeGesture'

function makeTouch(identifier: number, clientX: number, clientY: number): Touch {
  return { identifier, clientX, clientY } as Touch
}

function makeTouchList(touches: Touch[]): TouchList {
  const touchList = touches as unknown as TouchList & { item: (index: number) => Touch | null }
  touchList.item = (index: number) => touches[index] ?? null
  return touchList
}

function makeTouchEvent(options: {
  touches?: Touch[]
  changedTouches?: Touch[]
  target?: EventTarget | null
}): TouchEvent {
  return {
    touches: makeTouchList(options.touches ?? []),
    changedTouches: makeTouchList(options.changedTouches ?? []),
    target: options.target ?? null,
    preventDefault: vi.fn(),
  } as unknown as TouchEvent
}

describe('useCardSwipeGesture', () => {
  let callbacks: { [K in keyof CardSwipeCallbacks]: MockedFunction<CardSwipeCallbacks[K]> }
  let gesture: ReturnType<typeof useCardSwipeGesture>
  let cardContainer: HTMLDivElement
  let tapZone: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    callbacks = {
      onTap: vi.fn<CardSwipeCallbacks['onTap']>(),
      onLongPressStart: vi.fn<CardSwipeCallbacks['onLongPressStart']>(),
      onLongPressEnd: vi.fn<CardSwipeCallbacks['onLongPressEnd']>(),
      onFlip: vi.fn<CardSwipeCallbacks['onFlip']>(),
    }
    gesture = useCardSwipeGesture(callbacks)

    // Card measuring 200×400 in SCREEN space (getBoundingClientRect accounts
    // for CSS rotation, unlike clientWidth/clientHeight)
    cardContainer = document.createElement('div')
    cardContainer.className = 'card-flip-container'
    tapZone = document.createElement('div')
    cardContainer.appendChild(tapZone)
    document.body.appendChild(cardContainer)
    cardContainer.getBoundingClientRect = () =>
      ({ width: 200, height: 400, top: 0, left: 0, right: 200, bottom: 400, x: 0, y: 0 }) as DOMRect
  })

  afterEach(() => {
    gesture.cleanup()
    cardContainer.remove()
    vi.useRealTimers()
  })

  it('fires onTap with the touched side for a quick small-movement touch', () => {
    const fingerDown = makeTouch(1, 100, 300)
    gesture.onTouchStart(makeTouchEvent({ changedTouches: [fingerDown] }), 'right')
    vi.advanceTimersByTime(100)
    gesture.onTouchEnd(makeTouchEvent({ changedTouches: [fingerDown] }))

    expect(callbacks.onTap).toHaveBeenCalledExactlyOnceWith('right')
    expect(callbacks.onFlip).not.toHaveBeenCalled()
  })

  it('flips on a vertical swipe past 30% of the card SCREEN height', () => {
    gesture.onTouchStart(makeTouchEvent({ changedTouches: [makeTouch(1, 100, 300)] }), 'left')
    const fingerMoved = makeTouch(1, 100, 160) // 140px up = 35% of 400px height
    gesture.onTouchMove(makeTouchEvent({ touches: [fingerMoved], target: tapZone }))

    expect(gesture.flipDirection.value).toBe('up')
    expect(gesture.flipDragProgress.value).toBeCloseTo(0.35)

    gesture.onTouchEnd(makeTouchEvent({ changedTouches: [fingerMoved] }))
    expect(callbacks.onFlip).toHaveBeenCalledOnce()
    expect(callbacks.onTap).not.toHaveBeenCalled()
  })

  it('normalizes horizontal swipes by the card SCREEN width', () => {
    gesture.onTouchStart(makeTouchEvent({ changedTouches: [makeTouch(1, 50, 300)] }), 'left')
    const fingerMoved = makeTouch(1, 190, 300) // 140px right = 70% of 200px width
    gesture.onTouchMove(makeTouchEvent({ touches: [fingerMoved], target: tapZone }))

    expect(gesture.flipDirection.value).toBe('right')
    expect(gesture.flipDragProgress.value).toBeCloseTo(0.7)
  })

  it('does not flip when the swipe is released below the 30% threshold', () => {
    gesture.onTouchStart(makeTouchEvent({ changedTouches: [makeTouch(1, 100, 300)] }), 'left')
    const fingerMoved = makeTouch(1, 100, 200) // 100px = 25% of 400px height
    gesture.onTouchMove(makeTouchEvent({ touches: [fingerMoved], target: tapZone }))
    gesture.onTouchEnd(makeTouchEvent({ changedTouches: [fingerMoved] }))

    expect(callbacks.onFlip).not.toHaveBeenCalled()
    expect(callbacks.onTap).not.toHaveBeenCalled() // classified as swipe, not tap
  })

  it('ignores other players fingers (multi-touch isolation)', () => {
    const playerOneFinger = makeTouch(1, 100, 300)
    gesture.onTouchStart(makeTouchEvent({ changedTouches: [playerOneFinger] }), 'left')

    // A second player touches elsewhere on the shared screen
    const playerTwoFinger = makeTouch(2, 500, 80)
    gesture.onTouchStart(makeTouchEvent({ changedTouches: [playerTwoFinger] }), 'right')

    // Player two drags far — must NOT classify player one's gesture as a swipe
    const playerTwoMoved = makeTouch(2, 500, 400)
    gesture.onTouchMove(makeTouchEvent({ touches: [playerOneFinger, playerTwoMoved], target: tapZone }))
    expect(gesture.flipDragProgress.value).toBe(0)

    // Player two lifting must NOT conclude player one's gesture
    gesture.onTouchEnd(makeTouchEvent({ changedTouches: [playerTwoMoved] }))
    expect(callbacks.onTap).not.toHaveBeenCalled()
    expect(gesture.isGestureActive.value).toBe(true)

    // Player one lifts → their tap resolves with their side
    vi.advanceTimersByTime(100)
    gesture.onTouchEnd(makeTouchEvent({ changedTouches: [playerOneFinger] }))
    expect(callbacks.onTap).toHaveBeenCalledExactlyOnceWith('left')
    expect(callbacks.onFlip).not.toHaveBeenCalled()
  })

  it('fires long-press callbacks when held without moving', () => {
    const fingerDown = makeTouch(1, 100, 300)
    gesture.onTouchStart(makeTouchEvent({ changedTouches: [fingerDown] }), 'left')
    vi.advanceTimersByTime(400)
    expect(callbacks.onLongPressStart).toHaveBeenCalledExactlyOnceWith('left')

    gesture.onTouchEnd(makeTouchEvent({ changedTouches: [fingerDown] }))
    expect(callbacks.onLongPressEnd).toHaveBeenCalledOnce()
    expect(callbacks.onTap).not.toHaveBeenCalled()
  })
})
