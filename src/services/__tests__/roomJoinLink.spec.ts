import { describe, expect, it } from 'vitest'
import { MultiplayerServiceError } from '@/services/firebase'
import { createRoomJoinLink, parseRoomJoinPayload } from '@/services/roomJoinLink'

function expectInvalidPayload(payload: string): void {
  expect(() => parseRoomJoinPayload(payload)).toThrowError(MultiplayerServiceError)
}

describe('room join QR payloads', () => {
  it('creates a deep link containing only the normalized six-letter code', () => {
    expect(createRoomJoinLink(' hjctnx ')).toBe('mtgcommander://join?code=HJCTNX')
  })

  it('accepts both the app QR payload and a raw room code', () => {
    expect(parseRoomJoinPayload('mtgcommander://join?code=HJCTNX')).toBe('HJCTNX')
    expect(parseRoomJoinPayload(' hjctnx ')).toBe('HJCTNX')
  })

  it('rejects foreign schemes, routes, malformed codes, and oversized payloads', () => {
    expectInvalidPayload('https://attacker.test/join?code=HJCTNX')
    expectInvalidPayload('mtgcommander://settings?code=HJCTNX')
    expectInvalidPayload('mtgcommander://join?code=ABC123')
    expectInvalidPayload(`mtgcommander://join?code=${'A'.repeat(300)}`)
  })
})
