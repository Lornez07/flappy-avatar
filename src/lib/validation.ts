export const MAX_NAME_LENGTH = 24
export const MAX_SCORE = 999_999

/**
 * Normalize a player name for submission. Strips control characters and trims.
 * Returns an empty string when nothing usable remains.
 */
export function sanitizePlayerName(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
}

export function isValidPlayerName(raw: string): boolean {
  return sanitizePlayerName(raw).length > 0
}

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(Math.trunc(score), MAX_SCORE))
}