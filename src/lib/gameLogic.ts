import { Pipe, PlayerPhysics } from '../types'

/** Vertical inset of the pipe cap from the gap edge, in canvas px. */
export const PIPE_CAP_HEIGHT = 24

export function circleIntersectsRect(
  cx: number,
  cy: number,
  r: number,
  l: number,
  t: number,
  rectR: number,
  b: number,
): boolean {
  const nx = Math.max(l, Math.min(cx, rectR))
  const ny = Math.max(t, Math.min(cy, b))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy < r * r
}

/**
 * Circle-vs-pipe collision. The avatar is a circle of radius width/2; each pipe
 * contributes a top and a bottom rectangle that stops at the ground.
 *
 * Note: this tests against the pipe *shaft* only. The wider cap that the
 * renderer draws extends PIPE_CAP_HEIGHT beyond the gap on both sides, so a
 * collision with the cap lip is not detected here.
 */
export function hitsPipe(pl: PlayerPhysics, pipe: Pipe, groundY: number): boolean {
  const r = pl.width / 2
  const cx = pl.x
  const cy = pl.y
  if (circleIntersectsRect(cx, cy, r, pipe.x, 0, pipe.x + pipe.width, pipe.gapStart)) return true
  return circleIntersectsRect(cx, cy, r, pipe.x, pipe.gapEnd, pipe.x + pipe.width, groundY)
}

/** Score is credited once the pipe's trailing edge clears the avatar's left edge. */
export function hasClearedPipe(pl: PlayerPhysics, pipe: Pipe): boolean {
  return pipe.x + pipe.width < pl.x - pl.width / 2
}

export function clampVelocity(velocityY: number, maxVelocity: number): number {
  return Math.min(velocityY, maxVelocity)
}

/**
 * Frame-rate independent movement delta. `dt` is measured in 60fps frame units,
 * so a 30fps frame is 2 and a 144fps frame is ~0.42.
 */
export function frameDelta(elapsedMs: number, targetFrameMs: number, maxDt: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 0
  return Math.min(elapsedMs / targetFrameMs, maxDt)
}

export interface PipeBounds {
  gapStart: number
  gapEnd: number
}

/**
 * Choose a vertical gap position such that the whole pipe stays on screen:
 * the top shaft is at least `minGapY`, and the bottom shaft clears the ground.
 */
export function randomGap(
  random: () => number,
  minGapY: number,
  gap: number,
  worldHeight: number,
  groundHeight: number,
): PipeBounds {
  const maxY = worldHeight - groundHeight - gap - minGapY
  const span = Math.max(0, maxY - minGapY)
  const gapStart = minGapY + random() * span
  return { gapStart, gapEnd: gapStart + gap }
}