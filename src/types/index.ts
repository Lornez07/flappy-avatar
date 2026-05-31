/**
 * Core game type definitions
 * Strict TypeScript interfaces for game state, physics, and leaderboard
 */

// ============================================================================
// GAME STATE MACHINE
// ============================================================================

export type GamePhase = 'IDLE' | 'CROPPING' | 'READY' | 'PLAYING' | 'GAMEOVER';

export interface GameState {
  phase: GamePhase;
  score: number;
  highScore: number;
  playerName: string;
  avatarData: string | null; // Base64 or URL
  isSubmittingScore: boolean;
  error: string | null;
}

// ============================================================================
// PLAYER PHYSICS
// ============================================================================

export interface PlayerPhysics {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  rotation: number; // Current rotation in degrees (-20 to +70)
  rotationVelocity: number; // Rate of rotation change
  hasFlapped: boolean;
}

export interface PhysicsConfig {
  gravity: number; // 0.6
  flapStrength: number; // -12
  maxVelocity: number; // Terminal velocity cap
  rotationFlap: number; // -20 (degrees on flap)
  rotationMax: number; // 70 (max downward rotation)
  rotationLerpSpeed: number; // 0.1 (smoothness of rotation interpolation)
}

// ============================================================================
// PIPES & OBSTACLES
// ============================================================================

export interface Pipe {
  x: number;
  gapStart: number;
  gapEnd: number;
  scored: boolean;
  width: number;
}

export interface PipeConfig {
  width: number; // 60
  gap: number; // 150
  spacing: number; // 200
  minGapY: number; // 50 (minimum pixels from top)
  speed: number; // 5 pixels/frame
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export interface LeaderboardEntry {
  id: number;
  player_name: string;
  score: number;
  avatar_url: string | null;
  created_at: string;
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  error: string | null;
}

// ============================================================================
// CANVAS HIGH-DPI
// ============================================================================

export interface CanvasContext {
  width: number;
  height: number;
  dpr: number; // devicePixelRatio
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

// ============================================================================
// CROP STATE
// ============================================================================

export interface CropState {
  image: HTMLImageElement | null;
  offsetX: number; // Slider range: -100 to +100
  offsetY: number;
  zoom: number; // Range: 0.5 to 3
}
