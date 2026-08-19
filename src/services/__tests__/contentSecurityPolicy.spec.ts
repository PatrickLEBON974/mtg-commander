import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const policy = indexHtml.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1]

describe('Content Security Policy', () => {
  it('allows Firebase Realtime Database regional transports', () => {
    expect(policy).toBeDefined()
    expect(policy).toContain(
      "script-src 'self' 'wasm-unsafe-eval' https://apis.google.com https://*.asia-southeast1.firebasedatabase.app",
    )
    expect(policy).toContain(
      'connect-src \'self\' https://api.scryfall.com https://*.asia-southeast1.firebasedatabase.app wss://*.asia-southeast1.firebasedatabase.app',
    )
    expect(policy).toContain(
      "frame-src 'self' https://apis.google.com https://mtg-commander-974.firebaseapp.com https://*.asia-southeast1.firebasedatabase.app",
    )
  })
})
