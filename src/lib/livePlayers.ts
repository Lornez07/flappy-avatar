import { AVATAR_SKINS, NEON_COLORS } from '../types'

export interface LivePlayer {
  id: string
  avatarEmoji: string
  colorId: string
  y: number
  score: number
  receivedAt: number
}

export interface LivePlayerUpdate {
  id: string
  avatarEmoji: string
  colorId: string
  y: number
  score: number
}

export interface LocalPlayerState {
  y: number
  score: number
}

export function parseLivePlayerUpdate(value: unknown): LivePlayerUpdate | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as Record<string, unknown>

  if (typeof payload.id !== 'string' || payload.id.length === 0 || payload.id.length > 64) return null
  if (typeof payload.avatarEmoji !== 'string' || !AVATAR_SKINS.some(skin => skin.emoji === payload.avatarEmoji)) return null
  if (typeof payload.colorId !== 'string' || !NEON_COLORS.some(color => color.id === payload.colorId)) return null
  if (typeof payload.y !== 'number' || !Number.isFinite(payload.y) || payload.y < 0 || payload.y > 1) return null
  if (typeof payload.score !== 'number' || !Number.isInteger(payload.score) || payload.score < 0 || payload.score > 999_999) return null

  return {
    id: payload.id,
    avatarEmoji: payload.avatarEmoji,
    colorId: payload.colorId,
    y: payload.y,
    score: payload.score,
  }
}
