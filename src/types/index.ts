export type GamePhase = 'LOBBY' | 'PLAYING' | 'GAME_OVER'

export interface GameState {
  phase: GamePhase
  score: number
  highScore: number
  playerName: string
  avatar: AvatarConfig
  isSubmittingScore: boolean
  error: string | null
}

export interface AvatarSkin {
  id: string
  label: string
  emoji: string
}

export interface NeonColor {
  id: string
  label: string
  glow: string
  hex: string
}

export const AVATAR_SKINS: AvatarSkin[] = [
  { id: 'cool', label: 'Cool', emoji: '😎' },
  { id: 'superhero', label: 'Hero', emoji: '🦸' },
  { id: 'alien', label: 'Alien', emoji: '👾' },
  { id: 'robot', label: 'Robot', emoji: '🤖' },
  { id: 'pumpkin', label: 'Pumpkin', emoji: '🎃' },
  { id: 'ghost', label: 'Ghost', emoji: '👻' },
  { id: 'cat', label: 'Cat', emoji: '🐱' },
  { id: 'fox', label: 'Fox', emoji: '🦊' },
]

export const NEON_COLORS: NeonColor[] = [
  { id: 'cyan', label: 'Sky', glow: '#4a8f9b', hex: '#4a8f9b' },
  { id: 'magenta', label: 'Berry', glow: '#bd5962', hex: '#bd5962' },
  { id: 'lime', label: 'Clover', glow: '#66834f', hex: '#66834f' },
  { id: 'gold', label: 'Sunshine', glow: '#d2a43d', hex: '#d2a43d' },
  { id: 'red', label: 'Tomato', glow: '#d84c3f', hex: '#d84c3f' },
  { id: 'blue', label: 'Cobalt', glow: '#536c9a', hex: '#536c9a' },
  { id: 'purple', label: 'Grape', glow: '#80618b', hex: '#80618b' },
  { id: 'white', label: 'Cream', glow: '#d5c6a5', hex: '#d5c6a5' },
]

export interface AvatarConfig {
  type: 'skin' | 'photo'
  skinId: string
  photoData: string | null
  neonColorId: string
}

export interface PlayerPhysics {
  x: number
  y: number
  width: number
  height: number
  velocityY: number
  rotation: number
  rotationVelocity: number
}

export interface PhysicsConfig {
  gravity: number
  flapStrength: number
  maxVelocity: number
  rotationFlap: number
  rotationMax: number
  rotationLerpSpeed: number
}

export interface Pipe {
  x: number
  gapStart: number
  gapEnd: number
  scored: boolean
  width: number
}

export interface PipeConfig {
  width: number
  gap: number
  spacing: number
  minGapY: number
  speed: number
}

export interface LeaderboardEntry {
  id: number
  player_name: string
  score: number
  avatar_url: string | null
  created_at: string
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[]
  error: string | null
}

export interface CanvasContext {
  width: number
  height: number
  dpr: number
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

export interface CropState {
  image: HTMLImageElement | null
  offsetX: number
  offsetY: number
  zoom: number
}
