import React, { useEffect, useRef } from 'react'
import { PlayerPhysics, PhysicsConfig, Pipe, PipeConfig } from '../types'

interface GameCanvasProps {
  playerImage: HTMLImageElement | null
  onScore: (score: number) => void
  onGameOver: (score: number) => void
  onRestart: () => void
  highScore: number
}

const PHYSICS: PhysicsConfig = {
  gravity: 0.6,
  flapStrength: -12,
  maxVelocity: 15,
  rotationFlap: -20,
  rotationMax: 70,
  rotationLerpSpeed: 0.08,
}

const PIPE_CFG: PipeConfig = {
  width: 52,
  gap: 148,
  spacing: 196,
  minGapY: 60,
  speed: 5,
}

const CANVAS_W = 400
const CANVAS_H = 600
const AVATAR_SIZE = 36
const GROUND_H = 100
const PLAYER_X = 80

type GameScreen = 'MENU' | 'PLAYING' | 'GAME_OVER'

export const GameCanvas: React.FC<GameCanvasProps> = ({
  playerImage,
  onScore,
  onGameOver,
  onRestart,
  highScore,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const screenRef = useRef<GameScreen>('MENU')
  const playerRef = useRef<PlayerPhysics>({
    x: PLAYER_X, y: CANVAS_H / 2 - GROUND_H / 2,
    width: AVATAR_SIZE, height: AVATAR_SIZE,
    velocityY: 0, rotation: 0, rotationVelocity: 0, hasFlapped: false,
  })
  const pipesRef = useRef<Pipe[]>([])
  const scoreRef = useRef(0)
  const bestRef = useRef(highScore)
  const pipeTimerRef = useRef(0)
  const groundOffsetRef = useRef(0)
  const menuBobRef = useRef(0)
  const flapParticlesRef = useRef<{ x: number; y: number; life: number }[]>([])

  useEffect(() => {
    bestRef.current = highScore
  }, [highScore])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = CANVAS_W * dpr
    canvas.height = CANVAS_H * dpr
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const W = CANVAS_W, H = CANVAS_H

    function resetGame() {
      const p = playerRef.current
      p.x = PLAYER_X
      p.y = H / 2 - GROUND_H / 2
      p.velocityY = 0
      p.rotation = 0
      p.rotationVelocity = 0
      p.hasFlapped = false
      pipesRef.current = []
      scoreRef.current = 0
      pipeTimerRef.current = 0
      flapParticlesRef.current = []
      screenRef.current = 'MENU'
    }

    function flap() {
      const screen = screenRef.current
      if (screen === 'MENU') {
        screenRef.current = 'PLAYING'
        const p = playerRef.current
        p.velocityY = PHYSICS.flapStrength
        p.rotation = PHYSICS.rotationFlap
        p.rotationVelocity = 0
        p.hasFlapped = true
        return
      }
      if (screen === 'GAME_OVER') {
        resetGame()
        onRestart()
        return
      }
      if (screen === 'PLAYING') {
        const p = playerRef.current
        if (p.y + p.height / 2 > H - GROUND_H) return
        p.velocityY = PHYSICS.flapStrength
        p.rotation = PHYSICS.rotationFlap
        p.rotationVelocity = 0
        p.hasFlapped = true
        flapParticlesRef.current.push({ x: p.x, y: p.y, life: 1 })
      }
    }

    function update() {
      const screen = screenRef.current
      const p = playerRef.current

      groundOffsetRef.current = (groundOffsetRef.current + PIPE_CFG.speed) % 24

      if (screen === 'MENU') {
        menuBobRef.current += 0.04
        p.y = (H / 2 - GROUND_H / 2) + Math.sin(menuBobRef.current) * 8
        return
      }

      if (screen === 'GAME_OVER') return

      p.velocityY = Math.min(p.velocityY + PHYSICS.gravity, PHYSICS.maxVelocity)
      p.y += p.velocityY

      const targetRot = p.velocityY > 0 ? PHYSICS.rotationMax : PHYSICS.rotationFlap
      p.rotation += (targetRot - p.rotation) * PHYSICS.rotationLerpSpeed

      if (p.y + p.height / 2 > H - GROUND_H || p.y - p.height / 2 < 0) {
        screenRef.current = 'GAME_OVER'
        const finalScore = scoreRef.current
        bestRef.current = Math.max(bestRef.current, finalScore)
        onGameOver(finalScore)
        return
      }

      pipeTimerRef.current++
      if (pipeTimerRef.current > PIPE_CFG.spacing) {
        const minY = PIPE_CFG.minGapY
        const maxY = H - GROUND_H - PIPE_CFG.gap - PIPE_CFG.minGapY
        const gapStart = minY + Math.random() * (maxY - minY)
        pipesRef.current.push({
          x: W, gapStart, gapEnd: gapStart + PIPE_CFG.gap,
          scored: false, width: PIPE_CFG.width,
        })
        pipeTimerRef.current = 0
      }

      for (let i = pipesRef.current.length - 1; i >= 0; i--) {
        const pipe = pipesRef.current[i]
        pipe.x -= PIPE_CFG.speed

        if (!pipe.scored && pipe.x + pipe.width < p.x - p.width / 2) {
          scoreRef.current++
          pipe.scored = true
          onScore(scoreRef.current)
        }

        if (checkCollision(p, pipe, H - GROUND_H)) {
          screenRef.current = 'GAME_OVER'
          const finalScore = scoreRef.current
          bestRef.current = Math.max(bestRef.current, finalScore)
          onGameOver(finalScore)
          return
        }

        if (pipe.x + pipe.width < 0) pipesRef.current.splice(i, 1)
      }

      flapParticlesRef.current = flapParticlesRef.current
        .map(pt => ({ ...pt, life: pt.life - 0.04 }))
        .filter(pt => pt.life > 0)
    }

    function draw() {
      const screen = screenRef.current
      const p = playerRef.current

      ctx.clearRect(0, 0, W, H)

      drawSky(ctx, W, H)
      drawClouds(ctx, W, groundOffsetRef.current)
      drawPipes(ctx, pipesRef.current)
      drawGround(ctx, W, H, GROUND_H, groundOffsetRef.current)

      if (playerImage) {
        drawAvatar(ctx, playerImage, p, AVATAR_SIZE)
      }

      drawFlapParticles(ctx, flapParticlesRef.current)

      drawScore(ctx, W, scoreRef.current, screen)

      if (screen === 'MENU') {
        drawMenuOverlay(ctx, W, H, GROUND_H)
      }

      if (screen === 'GAME_OVER') {
        drawGameOver(ctx, W, H, GROUND_H, scoreRef.current, bestRef.current)
      }
    }

    function loop() {
      update()
      draw()
      requestAnimationFrame(loop)
    }

    const events = setupEvents(canvas, flap)
    loop()

    return () => {
      events.forEach(fn => fn())
    }
  }, [playerImage, onScore, onGameOver, onRestart])

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <canvas
        ref={canvasRef}
        className="w-full aspect-[2/3] shadow-xl cursor-pointer touch-none"
      />
    </div>
  )
}

// ===== DRAWING HELPERS =====

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#4dc9f6')
  g.addColorStop(1, '#aee4f7')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function drawClouds(ctx: CanvasRenderingContext2D, w: number, offset: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  const clouds = [
    { x: 40, y: 60, r1: 20, r2: 16 },
    { x: 90, y: 55, r1: 24, r2: 18 },
    { x: 300, y: 80, r1: 18, r2: 14 },
    { x: 350, y: 75, r1: 22, r2: 16 },
    { x: 180, y: 110, r1: 15, r2: 12 },
  ]
  const speed = 0.3
  for (const c of clouds) {
    const cx = ((c.x + offset * speed) % (w + 100)) - 50
    ctx.beginPath()
    ctx.ellipse(cx, c.y, c.r1, c.r2, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, gh: number, offset: number) {
  const gy = h - gh

  ctx.fillStyle = '#ded895'
  ctx.fillRect(0, gy, w, gh)

  ctx.fillStyle = '#5a4a32'
  ctx.fillRect(0, gy + 8, w, gh - 8)

  ctx.fillStyle = '#7ec850'
  ctx.fillRect(0, gy, w, 8)

  ctx.strokeStyle = '#6ab040'
  ctx.lineWidth = 1
  for (let x = -offset; x < w + 24; x += 24) {
    ctx.beginPath()
    ctx.moveTo(x, gy)
    ctx.lineTo(x + 12, gy - 4)
    ctx.lineTo(x + 24, gy)
    ctx.stroke()
  }

  ctx.fillStyle = '#5a4a32'
  ctx.strokeStyle = '#4a3a22'
  ctx.lineWidth = 1
  for (let x = -offset; x < w + 24; x += 24) {
    ctx.fillRect(x, gy + 8, 24, 3)
    ctx.strokeRect(x, gy + 8, 24, 3)
  }
}

function drawPipes(ctx: CanvasRenderingContext2D, pipes: Pipe[]) {
  for (const pipe of pipes) {
    const capOverhang = 8
    const capH = 22

    ctx.fillStyle = '#73bf2e'
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapStart)
    ctx.fillRect(pipe.x, pipe.gapEnd, pipe.width, CANVAS_H - pipe.gapEnd)

    ctx.fillStyle = '#558b2f'
    ctx.fillRect(pipe.x - capOverhang, pipe.gapStart - capH, pipe.width + capOverhang * 2, capH)
    ctx.fillRect(pipe.x - capOverhang, pipe.gapEnd, pipe.width + capOverhang * 2, capH)

    ctx.fillStyle = '#4a7a28'
    ctx.fillRect(pipe.x - capOverhang, pipe.gapStart - capH, pipe.width + capOverhang * 2, 3)
    ctx.fillRect(pipe.x - capOverhang, pipe.gapEnd, pipe.width + capOverhang * 2, 3)

    ctx.fillStyle = '#5a9a25'
    ctx.fillRect(pipe.x + 4, 0, 6, pipe.gapStart - capH)
    ctx.fillRect(pipe.x + 4, pipe.gapEnd + capH, 6, CANVAS_H - pipe.gapEnd - capH)
  }
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  player: PlayerPhysics,
  size: number,
) {
  ctx.save()
  ctx.translate(player.x, player.y)
  ctx.rotate((player.rotation * Math.PI) / 180)

  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(image, -size / 2, -size / 2, size, size)
  ctx.restore()

  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

function drawFlapParticles(
  ctx: CanvasRenderingContext2D,
  particles: { x: number; y: number; life: number }[],
) {
  for (const pt of particles) {
    ctx.fillStyle = `rgba(255,255,255,${pt.life * 0.5})`
    ctx.beginPath()
    ctx.arc(pt.x - 20, pt.y, 4 * pt.life, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawScore(ctx: CanvasRenderingContext2D, w: number, score: number, screen: GameScreen) {
  if (screen === 'MENU' || screen === 'GAME_OVER') return

  ctx.font = 'bold 48px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 4
  ctx.strokeText(String(score), w / 2, 30)
  ctx.fillStyle = '#fff'
  ctx.fillText(String(score), w / 2, 30)
}

function drawMenuOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, gh: number) {
  ctx.textAlign = 'center'

  ctx.font = 'bold 36px Arial, sans-serif'
  ctx.textBaseline = 'bottom'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 4
  ctx.strokeText('Flappy Avatar', w / 2, h / 2 - gh / 2 - 40)
  ctx.fillStyle = '#fff'
  ctx.fillText('Flappy Avatar', w / 2, h / 2 - gh / 2 - 40)

  const blink = Math.sin(Date.now() / 400) > 0
  if (blink) {
    ctx.font = '18px Arial, sans-serif'
    ctx.textBaseline = 'top'
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 3
    ctx.strokeText('Tap to Start', w / 2, h / 2 - gh / 2 + 40)
    ctx.fillStyle = '#fff'
    ctx.fillText('Tap to Start', w / 2, h / 2 - gh / 2 + 40)
  }
}

function drawGameOver(
  ctx: CanvasRenderingContext2D,
  w: number, h: number, gh: number,
  score: number, best: number,
) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 0, w, h - gh)

  ctx.textAlign = 'center'

  ctx.font = 'bold 40px Arial, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 4
  ctx.strokeText('GAME OVER', w / 2, h / 2 - gh / 2 - 90)
  ctx.fillStyle = '#fff'
  ctx.fillText('GAME OVER', w / 2, h / 2 - gh / 2 - 90)

  const cx = w / 2
  const cy = h / 2 - gh / 2 - 10
  const cardW = 220
  const cardH = 100

  ctx.fillStyle = '#deb887'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 2
  roundRect(ctx, cx - cardW / 2, cy - cardH / 2, cardW, cardH, 8)
  ctx.fill()
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  ctx.font = '14px Arial, sans-serif'
  ctx.fillStyle = '#666'
  ctx.fillText('SCORE', cx - 30, cy - 18)
  ctx.fillText('BEST', cx - 30, cy + 18)

  ctx.textAlign = 'right'
  ctx.font = 'bold 20px Arial, sans-serif'
  ctx.fillStyle = '#333'
  ctx.fillText(String(score), cx + cardW / 2 - 15, cy - 18)
  ctx.fillText(String(best), cx + cardW / 2 - 15, cy + 18)

  const medal = getMedal(score)
  if (medal) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx - cardW / 2 + 36, cy, 18, 0, Math.PI * 2)
    ctx.fillStyle = medal.color
    ctx.fill()
    ctx.strokeStyle = medal.border
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.font = '18px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.fillText(medal.icon, cx - cardW / 2 + 36, cy + 1)
    ctx.restore()
  }

  const blink = Math.sin(Date.now() / 400) > 0
  if (blink) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = '16px Arial, sans-serif'
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 3
    ctx.strokeText('Tap to Restart', w / 2, h / 2 - gh / 2 + 60)
    ctx.fillStyle = '#fff'
    ctx.fillText('Tap to Restart', w / 2, h / 2 - gh / 2 + 60)
  }
}

function getMedal(score: number): { color: string; border: string; icon: string } | null {
  if (score >= 40) return { color: '#e5e4e2', border: '#aaa', icon: '★' }
  if (score >= 20) return { color: '#ffd700', border: '#b8860b', icon: '★' }
  if (score >= 10) return { color: '#c0c0c0', border: '#888', icon: '◆' }
  if (score >= 1) return { color: '#cd7f32', border: '#8b5a2b', icon: '●' }
  return null
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ===== COLLISION =====

function checkCollision(player: PlayerPhysics, pipe: Pipe, groundY: number): boolean {
  const r = player.width / 2
  const cx = player.x, cy = player.y

  const rects = [
    { l: pipe.x, r: pipe.x + pipe.width, t: 0, b: pipe.gapStart },
    { l: pipe.x, r: pipe.x + pipe.width, t: pipe.gapEnd, b: groundY },
  ]
  for (const rect of rects) {
    const closestX = Math.max(rect.l, Math.min(cx, rect.r))
    const closestY = Math.max(rect.t, Math.min(cy, rect.b))
    const dx = cx - closestX, dy = cy - closestY
    if (dx * dx + dy * dy < r * r) return true
  }
  return false
}

// ===== EVENTS =====

function setupEvents(canvas: HTMLCanvasElement, flap: () => void): (() => void)[] {
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space') { e.preventDefault(); flap() }
  }
  const onClick = () => flap()
  const onTouch = (e: TouchEvent) => { e.preventDefault(); flap() }

  window.addEventListener('keydown', onKey)
  canvas.addEventListener('click', onClick)
  canvas.addEventListener('touchstart', onTouch, { passive: false })

  return [
    () => window.removeEventListener('keydown', onKey),
    () => canvas.removeEventListener('click', onClick),
    () => canvas.removeEventListener('touchstart', onTouch),
  ]
}
