/**
 * GameCanvas Component
 *
 * High-DPI canvas rendering with advanced physics:
 * - Rotational avatar that tilts on flap and falls naturally
 * - Gravity-based physics with smooth interpolation
 * - State-driven rendering loop
 * - Responsive to Retina/4K displays
 *
 * Physics:
 * - Player rotation: -20° on flap, smoothly interpolates to +70° during freefall
 * - Velocity capped to prevent excessive falling speed
 * - Collision detection for pipes and boundaries
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PlayerPhysics,
  PhysicsConfig,
  Pipe,
  PipeConfig,
  CanvasContext,
} from '../types';

interface GameCanvasProps {
  playerImage: HTMLImageElement | null;
  isRunning: boolean;
  onScore: (newScore: number) => void;
  onGameOver: (finalScore: number) => void;
  onFlap: () => void;
}

const PHYSICS_CONFIG: PhysicsConfig = {
  gravity: 0.6,
  flapStrength: -12,
  maxVelocity: 15,
  rotationFlap: -20,
  rotationMax: 70,
  rotationLerpSpeed: 0.08,
};

const PIPE_CONFIG: PipeConfig = {
  width: 60,
  gap: 150,
  spacing: 200,
  minGapY: 50,
  speed: 5,
};

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const AVATAR_SIZE = 40;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  playerImage,
  isRunning,
  onScore,
  onGameOver,
  onFlap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameRunning, setGameRunning] = useState(false);

  // Game state refs (persistent across renders)
  const playerRef = useRef<PlayerPhysics>({
    x: 60,
    y: CANVAS_HEIGHT / 2,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    velocityY: 0,
    rotation: 0,
    rotationVelocity: 0,
    hasFlapped: false,
  });

  const pipeRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const pipeCounterRef = useRef(0);
  const gameStateRef = useRef({
    isGameOver: false,
    lastFrameTime: 0,
  });

  // Canvas context with high-DPI support
  const canvasContextRef = useRef<CanvasContext | null>(null);

  /**
   * Initialize high-DPI canvas
   */
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Set canvas size accounting for DPI
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;

    // CSS size (display size)
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    // Scale context to match DPI
    ctx.scale(dpr, dpr);

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    canvasContextRef.current = {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      dpr,
      canvas,
      ctx,
    };
  }, []);

  /**
   * Player flap: set rotation and upward velocity
   */
  const flap = useCallback(() => {
    if (gameStateRef.current.isGameOver || !gameRunning) return;

    playerRef.current.velocityY = PHYSICS_CONFIG.flapStrength;
    playerRef.current.rotation = PHYSICS_CONFIG.rotationFlap;
    playerRef.current.rotationVelocity = 0;
    playerRef.current.hasFlapped = true;

    onFlap?.();
  }, [gameRunning, onFlap]);

  /**
   * Update physics: gravity, rotation, collision
   */
  const update = useCallback(() => {
    const player = playerRef.current;
    const ctx = canvasContextRef.current;

    if (!ctx || gameStateRef.current.isGameOver) return;

    // Apply gravity
    player.velocityY = Math.min(
      player.velocityY + PHYSICS_CONFIG.gravity,
      PHYSICS_CONFIG.maxVelocity
    );

    // Update position
    player.y += player.velocityY;

    // Boundary collision
    if (
      player.y + player.height / 2 > ctx.height ||
      player.y - player.height / 2 < 0
    ) {
      gameStateRef.current.isGameOver = true;
      setGameRunning(false);
      onGameOver(scoreRef.current);
      return;
    }

    // Update rotation: smooth lerp towards angle based on velocity
    const targetRotation =
      player.velocityY > 0
        ? PHYSICS_CONFIG.rotationMax
        : PHYSICS_CONFIG.rotationFlap;

    player.rotation = lerp(
      player.rotation,
      targetRotation,
      PHYSICS_CONFIG.rotationLerpSpeed
    );

    // Pipe generation
    pipeCounterRef.current++;
    if (pipeCounterRef.current > PIPE_CONFIG.spacing) {
      const gapStart = Math.random() * (ctx.height - PIPE_CONFIG.gap - 100) + PIPE_CONFIG.minGapY;
      pipeRef.current.push({
        x: ctx.width,
        gapStart,
        gapEnd: gapStart + PIPE_CONFIG.gap,
        scored: false,
        width: PIPE_CONFIG.width,
      });
      pipeCounterRef.current = 0;
    }

    // Update pipes and check collisions
    for (let i = pipeRef.current.length - 1; i >= 0; i--) {
      const pipe = pipeRef.current[i];
      pipe.x -= PIPE_CONFIG.speed;

      // Scoring
      if (
        !pipe.scored &&
        pipe.x + pipe.width < player.x - player.width / 2
      ) {
        scoreRef.current++;
        pipe.scored = true;
        onScore(scoreRef.current);
      }

      // Collision detection (circle-based)
      if (checkCircleRectCollision(player, pipe, ctx.height)) {
        gameStateRef.current.isGameOver = true;
        setGameRunning(false);
        onGameOver(scoreRef.current);
        return;
      }

      // Remove off-screen pipes
      if (pipe.x + pipe.width < 0) {
        pipeRef.current.splice(i, 1);
      }
    }
  }, [gameRunning, onScore, onGameOver]);

  /**
   * Draw frame: background, pipes, player
   */
  const draw = useCallback(() => {
    const canvasCtx = canvasContextRef.current;
    if (!canvasCtx) return;

    const { ctx, width, height } = canvasCtx;

    // Draw sky gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(1, '#e0f6ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw pipes
    ctx.fillStyle = '#2ecc71';
    for (const pipe of pipeRef.current) {
      ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapStart);
      ctx.fillRect(
        pipe.x,
        pipe.gapEnd,
        pipe.width,
        height - pipe.gapEnd
      );

      // Pipe cap (darker green)
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(pipe.x - 5, pipe.gapStart - 10, pipe.width + 10, 10);
      ctx.fillRect(pipe.x - 5, pipe.gapEnd, pipe.width + 10, 10);
      ctx.fillStyle = '#2ecc71';
    }

    // Draw player with rotation
    if (playerImage) {
      drawRotatedCircle(
        ctx,
        playerImage,
        playerRef.current,
        AVATAR_SIZE
      );
    }
  }, [playerImage]);

  /**
   * Game loop
   */
  useEffect(() => {
    if (!isRunning) {
      setGameRunning(false);
      return;
    }

    setGameRunning(true);
    gameStateRef.current.isGameOver = false;
  }, [isRunning]);

  useEffect(() => {
    if (!gameRunning) return;

    const gameLoop = () => {
      update();
      draw();

      if (gameRunning && !gameStateRef.current.isGameOver) {
        requestAnimationFrame(gameLoop);
      }
    };

    const rafId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafId);
  }, [gameRunning, update, draw]);

  /**
   * Keyboard & click controls
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        flap();
      }
    };

    const handleClick = () => {
      flap();
    };

    window.addEventListener('keydown', handleKeyDown);
    canvasRef.current?.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvasRef.current?.removeEventListener('click', handleClick);
    };
  }, [flap]);

  /**
   * Initialize canvas on mount
   */
  useEffect(() => {
    initializeCanvas();
    draw();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-[400px] h-auto border-4 border-white rounded-lg shadow-xl cursor-pointer"
      style={{ background: 'linear-gradient(to bottom, #87ceeb 0%, #e0f6ff 100%)' }}
    />
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Linear interpolation between two values
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Draw player circle with rotation
 */
function drawRotatedCircle(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  player: PlayerPhysics,
  size: number
) {
  ctx.save();

  // Move to player position
  ctx.translate(player.x, player.y);

  // Rotate based on physics rotation
  ctx.rotate((player.rotation * Math.PI) / 180);

  // Draw circle with clipping
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.clip();

  // Draw image centered
  ctx.drawImage(image, -size / 2, -size / 2, size, size);

  ctx.restore();

  // Draw circle outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(player.x, player.y, size / 2, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Circle-rectangle collision detection
 * Player is a circle; pipes are rectangles
 */
function checkCircleRectCollision(
  player: PlayerPhysics,
  pipe: Pipe,
  canvasHeight: number
): boolean {
  const radius = player.width / 2;
  const circleX = player.x;
  const circleY = player.y;

  // Check collision with upper pipe
  if (circleY - radius < pipe.gapStart) {
    const rect = {
      left: pipe.x,
      right: pipe.x + pipe.width,
      top: 0,
      bottom: pipe.gapStart,
    };
    if (isCircleInRect(circleX, circleY, radius, rect)) {
      return true;
    }
  }

  // Check collision with lower pipe
  if (circleY + radius > pipe.gapEnd) {
    const rect = {
      left: pipe.x,
      right: pipe.x + pipe.width,
      top: pipe.gapEnd,
      bottom: canvasHeight,
    };
    if (isCircleInRect(circleX, circleY, radius, rect)) {
      return true;
    }
  }

  return false;
}

/**
 * Circle-rectangle collision check
 */
function isCircleInRect(
  circleX: number,
  circleY: number,
  radius: number,
  rect: { left: number; right: number; top: number; bottom: number }
): boolean {
  const closestX = Math.max(rect.left, Math.min(circleX, rect.right));
  const closestY = Math.max(rect.top, Math.min(circleY, rect.bottom));
  const distX = circleX - closestX;
  const distY = circleY - closestY;
  return distX * distX + distY * distY < radius * radius;
}
