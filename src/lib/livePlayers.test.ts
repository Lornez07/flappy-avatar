import { describe, expect, it } from 'vitest'
import { parseLivePlayerUpdate } from './livePlayers'

const validPayload = {
  id: 'pilot-1',
  avatarEmoji: '😎',
  colorId: 'cyan',
  y: 0.5,
  score: 12,
}

describe('parseLivePlayerUpdate', () => {
  it('accepts a valid live player update', () => {
    expect(parseLivePlayerUpdate(validPayload)).toEqual(validPayload)
  })

  it('rejects unknown avatars and colors', () => {
    expect(parseLivePlayerUpdate({ ...validPayload, avatarEmoji: '<script>' })).toBeNull()
    expect(parseLivePlayerUpdate({ ...validPayload, colorId: '#fff' })).toBeNull()
  })

  it('rejects invalid positions and scores', () => {
    expect(parseLivePlayerUpdate({ ...validPayload, y: Number.NaN })).toBeNull()
    expect(parseLivePlayerUpdate({ ...validPayload, y: 1.1 })).toBeNull()
    expect(parseLivePlayerUpdate({ ...validPayload, score: -1 })).toBeNull()
    expect(parseLivePlayerUpdate({ ...validPayload, score: 1.5 })).toBeNull()
  })

  it('rejects malformed or oversized identities', () => {
    expect(parseLivePlayerUpdate(null)).toBeNull()
    expect(parseLivePlayerUpdate({ ...validPayload, id: '' })).toBeNull()
    expect(parseLivePlayerUpdate({ ...validPayload, id: 'x'.repeat(65) })).toBeNull()
  })
})
