import { describe, it, expect } from 'vitest'
import { findTouchById } from '../trackedTouch'

function makeTouchList(touches: { identifier: number }[]): TouchList {
  const touchList = touches as unknown as TouchList & { item: (index: number) => Touch | null }
  touchList.item = (index: number) => (touches[index] as Touch | undefined) ?? null
  return touchList
}

describe('findTouchById', () => {
  it('finds the touch matching the identifier among several fingers', () => {
    const touchList = makeTouchList([{ identifier: 3 }, { identifier: 7 }, { identifier: 1 }])
    expect(findTouchById(touchList, 7)).toMatchObject({ identifier: 7 })
  })

  it('returns undefined when the tracked finger is not in the list', () => {
    const touchList = makeTouchList([{ identifier: 3 }])
    expect(findTouchById(touchList, 9)).toBeUndefined()
  })

  it('handles identifier 0 (first finger on many platforms)', () => {
    const touchList = makeTouchList([{ identifier: 0 }])
    expect(findTouchById(touchList, 0)).toMatchObject({ identifier: 0 })
  })

  it('returns undefined for an empty list', () => {
    expect(findTouchById(makeTouchList([]), 0)).toBeUndefined()
  })
})
