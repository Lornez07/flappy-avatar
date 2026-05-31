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
  { id: 'cyan', label: 'Cyan', glow: '#00f0ff', hex: '#00f0ff' },
  { id: 'magenta', label: 'Magenta', glow: '#ff00e6', hex: '#ff00e6' },
  { id: 'lime', label: 'Lime', glow: '#00ff66', hex: '#00ff66' },
  { id: 'gold', label: 'Gold', glow: '#ffd700', hex: '#ffd700' },
  { id: 'red', label: 'Red', glow: '#ff0044', hex: '#ff0044' },
  { id: 'blue', label: 'Blue', glow: '#4488ff', hex: '#4488ff' },
  { id: 'purple', label: 'Purple', glow: '#8800ff', hex: '#8800ff' },
  { id: 'white', label: 'White', glow: '#ffffff', hex: '#ffffff' },
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
