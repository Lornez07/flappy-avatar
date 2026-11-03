import { describe, expect, it } from 'vitest'
import {
  circleIntersectsRect,
  clampVelocity,
  frameDelta,
  hasClearedPipe,
  hitsPipe,
  randomGap,
} from './gameLogic'
import { Pipe, PlayerPhysics } from '../types'

const AVATAR_R = 18

function player(overrides: Partial<PlayerPhysics> = {}): PlayerPhysics {
  return {
    x: 85,
    y: 250,
    width: AVATAR_R * 2,
    height: AVATAR_R * 2,
    velocityY: 0,
    rotation: 0,
    rotationVelocity: 0,
    ...overrides,
  }
}

function pipe(overrides: Partial<Pipe> = {}): Pipe {
  return { x: 400, gapStart: 200, gapEnd: 358, scored: false, width: 52, ...overrides }
}

const GROUND_Y = 500

describe('circleIntersectsRect', () => {
  it('detects overlap when the circle centre is inside the rect', () => {
    expect(circleIntersectsRect(50, 50, 10, 0, 0, 100, 100)).toBe(true)
  })

  it('detects overlap when the circle clips a rect corner', () => {
    // Centre is 6px diagonally outside the corner at (0,0); radius 10 reaches it.
    expect(circleIntersectsRect(-6, -6, 10, 0, 0, 100, 100)).toBe(true)
  })

  it('misses when the circle is beyond the corner outside the radius', () => {
    expect(circleIntersectsRect(-20, -20, 10, 0, 0, 100, 100)).toBe(false)
  })

  it('misses when fully clear of the rect', () => {
    expect(circleIntersectsRect(200, 200, 10, 0, 0, 100, 100)).toBe(false)
  })
})

describe('hitsPipe', () => {
  it('reports no collision when the avatar is inside the gap', () => {
    const p = player({ x: 100, y: 279 })
    expect(hitsPipe(p, pipe({ x: 80 }), GROUND_Y)).toBe(false)
  })

  it('collides with the top shaft', () => {
    const p = player({ x: 100, y: 150 })
    expect(hitsPipe(p, pipe({ x: 80, gapStart: 200 }), GROUND_Y)).toBe(true)
  })

  it('collides with the bottom shaft', () => {
    const p = player({ x: 100, y: 470 })
    expect(hitsPipe(p, pipe({ x: 80, gapEnd: 358 }), GROUND_Y)).toBe(true)
  })

  it('does not collide once the pipe is horizontally clear', () => {
    const p = player({ x: 100, y: 150 })
    expect(hitsPipe(p, pipe({ x: 300 }), GROUND_Y)).toBe(false)
  })

  it('collides when touching the pipe edge exactly at the radius boundary', () => {
    // Centre sits 17px left of the pipe edge, radius is 18 -> overlap.
    const p = player({ x: 63, y: 150 })
    const adjacent = pipe({ x: 80, gapStart: 200 })
    expect(hitsPipe(p, adjacent, GROUND_Y)).toBe(true)
  })
})

describe('hasClearedPipe', () => {
  it('does not score while the pipe trailing edge is still right of the avatar', () => {
    const p = player({ x: 100 })
    expect(hasClearedPipe(p, pipe({ x: 60, width: 52 }))).toBe(false)
  })

  it('scores once the trailing edge passes the avatar left edge', () => {
    const p = player({ x: 100 })
    // trailing edge = 55, avatar left edge = 100 - 18 = 82 -> not yet
    expect(hasClearedPipe(p, pipe({ x: 3, width: 52 }))).toBe(true)
  })

  it('is strictly exclusive at the exact boundary', () => {
    const p = player({ x: 100 })
    // trailing edge = 82 exactly equals avatar left edge -> no score yet
    expect(hasClearedPipe(p, pipe({ x: 30, width: 52 }))).toBe(false)
  })
})

describe('clampVelocity', () => {
  it('caps terminal velocity', () => {
    expect(clampVelocity(20, 12)).toBe(12)
  })

  it('leaves negative (flap) velocity untouched', () => {
    expect(clampVelocity(-9.5, 12)).toBe(-9.5)
  })
})

describe('frameDelta', () => {
  const TARGET = 1000 / 60
  const MAX_DT = 3

  it('returns 1 for a frame at exactly 60fps', () => {
    expect(frameDelta(TARGET, TARGET, MAX_DT)).toBeCloseTo(1)
  })

  it('returns 2 for a 30fps frame so movement matches 60fps', () => {
    expect(frameDelta(TARGET * 2, TARGET, MAX_DT)).toBeCloseTo(2)
  })

  it('returns ~0.42 for a 144fps frame', () => {
    expect(frameDelta(1000 / 144, TARGET, MAX_DT)).toBeCloseTo(0.4167, 3)
  })

  it('clamps a huge stall to MAX_DT', () => {
    expect(frameDelta(10_000, TARGET, MAX_DT)).toBe(3)
  })

  it('treats non-finite and negative elapsed time as no movement', () => {
    expect(frameDelta(Number.NaN, TARGET, MAX_DT)).toBe(0)
    expect(frameDelta(-5, TARGET, MAX_DT)).toBe(0)
  })
})

describe('randomGap', () => {
  const MIN_GAP_Y = 90
  const GAP = 158
  const WORLD_H = 600
  const GROUND_H = 100

  it('keeps the gap inside the playable area at the lower bound', () => {
    const { gapStart, gapEnd } = randomGap(() => 0, MIN_GAP_Y, GAP, WORLD_H, GROUND_H)
    expect(gapStart).toBe(MIN_GAP_Y)
    expect(gapEnd).toBe(MIN_GAP_Y + GAP)
  })

  it('keeps the bottom shaft clear of the ground at the upper bound', () => {
    const { gapEnd } = randomGap(() => 1, MIN_GAP_Y, GAP, WORLD_H, GROUND_H)
    expect(gapEnd).toBeLessThanOrEqual(WORLD_H - GROUND_H)
  })

  it('always produces a gap of the configured size', () => {
    for (let i = 0; i <= 10; i++) {
      const { gapStart, gapEnd } = randomGap(() => i / 10, MIN_GAP_Y, GAP, WORLD_H, GROUND_H)
        // (a + b) - a is not bit-exact in IEEE-754, so compare with tolerance.
        expect(gapEnd - gapStart).toBeCloseTo(GAP, 9)
      }
    })

  it('degenerates to the minimum when the gap cannot fit', () => {
    const { gapStart } = randomGap(() => 0.5, MIN_GAP_Y, GAP, 200, GROUND_H)
    expect(gapStart).toBe(MIN_GAP_Y)
  })
})