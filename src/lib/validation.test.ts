import { describe, expect, it } from 'vitest'
import { MAX_NAME_LENGTH, MAX_SCORE, clampScore, isValidPlayerName, sanitizePlayerName } from './validation'

describe('sanitizePlayerName', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizePlayerName('  Ada  ')).toBe('Ada')
  })

  it('collapses internal whitespace runs', () => {
    expect(sanitizePlayerName('Ada   Lovelace')).toBe('Ada Lovelace')
  })

  it('strips control characters', () => {
    expect(sanitizePlayerName('Ada\u0000\u001fLovelace')).toBe('AdaLovelace')
  })

  it('requires sanitization to reject names that empty out', () => {
    expect(sanitizePlayerName('\u0000\u0001\u0002')).toBe('')
    expect(isValidPlayerName('\u0000\u0001\u0002')).toBe(false)
  })

  it('enforces the maximum length', () => {
    const long = 'a'.repeat(MAX_NAME_LENGTH + 25)
    expect(sanitizePlayerName(long)).toHaveLength(MAX_NAME_LENGTH)
  })

  it('accepts a normal name', () => {
    expect(isValidPlayerName('  Player One ')).toBe(true)
  })

  it('rejects whitespace-only names', () => {
    expect(isValidPlayerName('   ')).toBe(false)
  })
})

describe('clampScore', () => {
  it('rejects negative scores', () => {
    expect(clampScore(-5)).toBe(0)
  })

  it('clamps to the maximum', () => {
    expect(clampScore(MAX_SCORE + 1)).toBe(MAX_SCORE)
  })

  it('truncates fractional scores', () => {
    expect(clampScore(12.9)).toBe(12)
  })

  it('maps non-finite values to zero', () => {
    expect(clampScore(Number.NaN)).toBe(0)
    expect(clampScore(Infinity)).toBe(0)
  })

  it('passes through a valid score', () => {
    expect(clampScore(42)).toBe(42)
  })
})