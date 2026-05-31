import React, { useEffect, useRef } from 'react'
import { PlayerPhysics, PhysicsConfig, Pipe, PipeConfig, AvatarConfig, AVATAR_SKINS, NEON_COLORS } from '../types'

interface Props {
  avatarConfig: AvatarConfig
  photoImage: HTMLImageElement | null
  onScore: (s: number) => void
  onGameOver: (s: number) => void
  onRestart: () => void
  highScore: number
}

const PHYSICS: PhysicsConfig = {
  gravity: 0.45, flapStrength: -9.5, maxVelocity: 12,
  rotationFlap: -18, rotationMax: 65, rotationLerpSpeed: 0.08,
}

const PIPE: PipeConfig = {
  width: 52, gap: 158, spacing: 175, minGapY: 90, speed: 4.5,
}

const W = 400, H = 600, GROUND_H = 100, AVATAR_R = 18, PLAYER_X = 85

type Screen = 'MENU' | 'PLAYING' | 'GAME_OVER'

export const GameCanvas: React.FC<Props> = ({
  avatarConfig, photoImage,
  onScore, onGameOver, onRestart, highScore,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const screen = useRef<Screen>('MENU')
  const p = useRef<PlayerPhysics>({
    x: PLAYER_X, y: H / 2 - GROUND_H / 2,
    width: AVATAR_R * 2, height: AVATAR_R * 2,
    velocityY: 0, rotation: 0, rotationVelocity: 0,
  })
  const pipes = useRef<Pipe[]>([])
  const score = useRef(0)
  const best = useRef(highScore)
  const pipeTimer = useRef(0)
  const groundOff = useRef(0)
  const bob = useRef(0)
  const particles = useRef<{ x: number; y: number; life: number; vx: number; vy: number }[]>([])
  const neonPulse = useRef(0)

  useEffect(() => { best.current = highScore }, [highScore])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const neonColor = NEON_COLORS.find(c => c.id === avatarConfig.neonColorId) ?? NEON_COLORS[0]
    const avatarSkin = AVATAR_SKINS.find(s => s.id === avatarConfig.skinId) ?? AVATAR_SKINS[0]

    function reset() {
      const pl = p.current
      pl.x = PLAYER_X; pl.y = H / 2 - GROUND_H / 2
      pl.velocityY = 0; pl.rotation = 0; pl.rotationVelocity = 0
      pipes.current = []; score.current = 0; pipeTimer.current = 0
      particles.current = []; screen.current = 'MENU'
    }

    function onInput() {
      if (screen.current === 'MENU') {
        screen.current = 'PLAYING'
        pipeTimer.current = PIPE.spacing - 50
        const pl = p.current
        pl.velocityY = PHYSICS.flapStrength
        pl.rotation = PHYSICS.rotationFlap
        return
      }
      if (screen.current === 'GAME_OVER') {
        reset(); onRestart(); return
      }
      if (screen.current === 'PLAYING') {
        const pl = p.current
        if (pl.y + pl.height / 2 > H - GROUND_H) return
        pl.velocityY = PHYSICS.flapStrength
        pl.rotation = PHYSICS.rotationFlap
        for (let i = 0; i < 8; i++) {
          particles.current.push({
            x: pl.x - 16 + Math.random() * 8,
            y: pl.y - 4 + Math.random() * 8,
            life: 0.8 + Math.random() * 0.2,
            vx: -2 - Math.random() * 2, vy: -1 + Math.random() * 3,
          })
        }
      }
    }

    function tick() {
      const scr = screen.current
      const pl = p.current

      groundOff.current = (groundOff.current + PIPE.speed) % 24
      neonPulse.current += 0.03

      if (scr === 'MENU') {
        bob.current += 0.04
        pl.y = (H / 2 - GROUND_H / 2) + Math.sin(bob.current) * 8
        return
      }
      if (scr === 'GAME_OVER') return

      pl.velocityY = Math.min(pl.velocityY + PHYSICS.gravity, PHYSICS.maxVelocity)
      pl.y += pl.velocityY

      const target = pl.velocityY > 0 ? PHYSICS.rotationMax : PHYSICS.rotationFlap
      pl.rotation += (target - pl.rotation) * PHYSICS.rotationLerpSpeed

      if (pl.y + pl.height / 2 > H - GROUND_H || pl.y - pl.height / 2 < 0) {
        screen.current = 'GAME_OVER'
        const fs = score.current
        best.current = Math.max(best.current, fs)
        onGameOver(fs)
        return
      }

      pipeTimer.current++
      if (pipeTimer.current > PIPE.spacing) {
        const minY = PIPE.minGapY
        const maxY = H - GROUND_H - PIPE.gap - PIPE.minGapY
        const gs = minY + Math.random() * (maxY - minY)
        pipes.current.push({ x: W, gapStart: gs, gapEnd: gs + PIPE.gap, scored: false, width: PIPE.width })
        pipeTimer.current = 0
      }

      for (let i = pipes.current.length - 1; i >= 0; i--) {
        const pipe = pipes.current[i]
        pipe.x -= PIPE.speed

        if (!pipe.scored && pipe.x + pipe.width < pl.x - pl.width / 2) {
          score.current++; pipe.scored = true; onScore(score.current)
        }

        if (hit(pl, pipe, H - GROUND_H)) {
          screen.current = 'GAME_OVER'
          const fs = score.current
          best.current = Math.max(best.current, fs)
          onGameOver(fs)
          return
        }
        if (pipe.x + pipe.width < 0) pipes.current.splice(i, 1)
      }

      particles.current = particles.current
        .map(pt => ({ ...pt, x: pt.x + pt.vx, y: pt.y + pt.vy, life: pt.life - 0.035 }))
        .filter(pt => pt.life > 0)
    }

    function render() {
      const scr = screen.current
      const pl = p.current

      ctx.clearRect(0, 0, W, H)

      sky(ctx)
      clouds(ctx, groundOff.current)
      obstacles(ctx, pipes.current)
      ground(ctx, groundOff.current)

      drawAvatar(ctx, pl, avatarSkin, avatarConfig.type === 'photo', photoImage, neonColor, neonPulse.current)

      particles.current.forEach(pt => {
        ctx.globalAlpha = pt.life * 0.6
        ctx.fillStyle = neonColor.hex
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3 * pt.life, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
      })

      drawScore(ctx, score.current, scr)

      if (scr === 'MENU') drawMenu(ctx)
      if (scr === 'GAME_OVER') drawGameOver(ctx, score.current, best.current)
    }

    let raf: number
    function loop() { tick(); render(); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)

    const clean = bindEvents(canvas, onInput)

    return () => {
      cancelAnimationFrame(raf)
      clean.forEach(fn => fn())
    }
  }, [avatarConfig, photoImage, onScore, onGameOver, onRestart])

  return (
    <div className="w-full max-w-[400px] mx-auto select-none" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        className="w-full aspect-[2/3] shadow-2xl cursor-pointer touch-none rounded-2xl"
      />
    </div>
  )
}

function sky(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0f0c29')
  g.addColorStop(0.4, '#1a1a4e')
  g.addColorStop(0.7, '#243b80')
  g.addColorStop(1, '#4a6fa5')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)

  for (let i = 0; i < 30; i++) {
    const x = (i * 37 + 13) % W
    const y = (i * 53 + 7) % (H - GROUND_H)
    const r = 0.5 + (i % 3) * 0.4
    ctx.globalAlpha = 0.3 + (i % 5) * 0.1
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  ctx.globalAlpha = 1
}

function clouds(ctx: CanvasRenderingContext2D, off: number) {
  ctx.globalAlpha = 0.08
  ctx.fillStyle = '#fff'
  const list = [
    { x: 30, y: 50, w: 80, h: 16 },
    { x: 180, y: 30, w: 100, h: 14 },
    { x: 300, y: 70, w: 60, h: 12 },
    { x: 100, y: 100, w: 90, h: 18 },
  ]
  const speed = 0.2
  for (const c of list) {
    const cx = ((c.x + off * speed) % (W + 150)) - 75
    ctx.beginPath()
    ctx.ellipse(cx, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function ground(ctx: CanvasRenderingContext2D, off: number) {
  const gy = H - GROUND_H

  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, gy, W, GROUND_H)

  const g2 = ctx.createLinearGradient(0, gy, 0, gy + 4)
  g2.addColorStop(0, '#1a1a2e')
  g2.addColorStop(1, '#16213e')
  ctx.fillStyle = g2
  ctx.fillRect(0, gy, W, 4)

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)'
  ctx.lineWidth = 1
  for (let x = -off; x < W + 24; x += 24) {
    ctx.beginPath()
    ctx.moveTo(x, gy + 4)
    ctx.lineTo(x + 12, gy + 8)
    ctx.lineTo(x + 24, gy + 4)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(0, 240, 255, 0.03)'
  for (let x = -off; x < W + 24; x += 24) {
    ctx.fillRect(x, gy + 8, 24, 2)
  }

  ctx.fillStyle = 'rgba(0, 240, 255, 0.06)'
  ctx.fillRect(0, H - 2, W, 2)
}

function obstacles(ctx: CanvasRenderingContext2D, pipes: Pipe[]) {
  for (const pipe of pipes) {
    const co = 8
    const ch = 24

    ctx.shadowColor = 'rgba(0, 240, 255, 0.15)'
    ctx.shadowBlur = 8

    const grad1 = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0)
    grad1.addColorStop(0, '#1a3a5c')
    grad1.addColorStop(0.5, '#2a5a8c')
    grad1.addColorStop(1, '#1a3a5c')
    ctx.fillStyle = grad1
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapStart)
    ctx.fillRect(pipe.x, pipe.gapEnd, pipe.width, H - pipe.gapEnd)

    ctx.shadowBlur = 12
    const capGrad = ctx.createLinearGradient(pipe.x - co, 0, pipe.x + pipe.width + co * 2, 0)
    capGrad.addColorStop(0, '#0f3460')
    capGrad.addColorStop(0.5, '#1a5276')
    capGrad.addColorStop(1, '#0f3460')
    ctx.fillStyle = capGrad
    ctx.fillRect(pipe.x - co, pipe.gapStart - ch, pipe.width + co * 2, ch)
    ctx.fillRect(pipe.x - co, pipe.gapEnd, pipe.width + co * 2, ch)

    ctx.shadowBlur = 4
    ctx.fillStyle = 'rgba(0, 240, 255, 0.08)'
    ctx.fillRect(pipe.x + 6, ch, 4, pipe.gapStart - ch)
    ctx.fillRect(pipe.x + 6, pipe.gapEnd + ch, 4, H - pipe.gapEnd - ch - GROUND_H)

    ctx.shadowBlur = 0
    ctx.shadowColor = 'transparent'

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)'
    ctx.lineWidth = 1
    ctx.strokeRect(pipe.x - co, pipe.gapStart - ch, pipe.width + co * 2, ch)
    ctx.strokeRect(pipe.x - co, pipe.gapEnd, pipe.width + co * 2, ch)
  }
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  pl: PlayerPhysics,
  skin: { emoji: string },
  isPhoto: boolean,
  photoImage: HTMLImageElement | null,
  neon: { hex: string; glow: string },
  pulse: number,
) {
  const r = AVATAR_R
  const glowIntensity = 0.6 + Math.sin(pulse * 2) * 0.3

  ctx.save()
  ctx.translate(pl.x, pl.y)
  ctx.rotate((pl.rotation * Math.PI) / 180)

  ctx.shadowColor = neon.glow
  ctx.shadowBlur = 20 * glowIntensity

  ctx.beginPath()
  ctx.arc(0, 0, r + 2, 0, Math.PI * 2)
  ctx.fillStyle = `${neon.hex}22`
  ctx.fill()

  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = '#1a1a2e'
  ctx.fill()

  ctx.shadowBlur = 0
  ctx.save()
  ctx.beginPath()
  ctx.arc(0, 0, r - 1, 0, Math.PI * 2)
  ctx.clip()

  if (isPhoto && photoImage) {
    ctx.drawImage(photoImage, -r + 1, -r + 1, (r - 1) * 2, (r - 1) * 2)
  }

  ctx.restore()

  if (!isPhoto) {
    ctx.font = `${r * 1.1}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.fillText(skin.emoji, 0, 1)
  }

  ctx.shadowBlur = 4
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.strokeStyle = neon.hex
  ctx.lineWidth = 2
  ctx.globalAlpha = glowIntensity
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0

  ctx.restore()
}

function drawScore(ctx: CanvasRenderingContext2D, score: number, screen: Screen) {
  if (screen === 'MENU' || screen === 'GAME_OVER') return

  ctx.font = 'bold 52px "Segoe UI", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  ctx.shadowColor = 'rgba(0, 240, 255, 0.5)'
  ctx.shadowBlur = 16
  ctx.fillStyle = '#ffffff'
  ctx.fillText(String(score), W / 2, 20)

  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 2
  ctx.strokeText(String(score), W / 2, 20)
}

function drawMenu(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = 'center'

  ctx.shadowColor = 'rgba(0, 240, 255, 0.4)'
  ctx.shadowBlur = 20
  ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = '#fff'
  ctx.fillText('Flappy Avatar', W / 2, H / 2 - GROUND_H / 2 - 50)
  ctx.shadowBlur = 0

  ctx.font = '12px "Segoe UI", Arial, sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillText('CUSTOMIZE YOUR AVATAR — THEN TAP TO FLY', W / 2, H / 2 - GROUND_H / 2 + 50)

  const blink = Math.sin(Date.now() / 380) > 0
  if (blink) {
    ctx.shadowColor = 'rgba(0, 240, 255, 0.6)'
    ctx.shadowBlur = 12
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#fff'
    ctx.fillText('TAP TO START', W / 2, H / 2 - GROUND_H / 2 + 80)
    ctx.shadowBlur = 0
  }
}

function drawGameOver(ctx: CanvasRenderingContext2D, score: number, best: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(0, 0, W, H - GROUND_H)

  ctx.textAlign = 'center'

  ctx.shadowColor = 'rgba(255, 0, 68, 0.4)'
  ctx.shadowBlur = 24
  ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ff3355'
  ctx.fillText('GAME OVER', W / 2, H / 2 - GROUND_H / 2 - 90)
  ctx.shadowBlur = 0

  const cx = W / 2
  const cy = H / 2 - GROUND_H / 2 - 5
  const cw = 230, ch = 110

  ctx.shadowColor = 'rgba(0, 240, 255, 0.1)'
  ctx.shadowBlur = 16
  ctx.fillStyle = 'rgba(15, 12, 41, 0.85)'
  roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 12)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.shadowBlur = 0

  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  ctx.font = '12px "Segoe UI", Arial, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillText('SCORE', cx - 35, cy - 18)
  ctx.fillText('BEST', cx - 35, cy + 18)

  ctx.textAlign = 'right'
  ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif'
  ctx.fillStyle = '#fff'
  ctx.fillText(String(score), cx + cw / 2 - 16, cy - 18)
  ctx.fillText(String(best), cx + cw / 2 - 16, cy + 18)

  const medal = getMedal(score)
  if (medal) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx - cw / 2 + 35, cy, 17, 0, Math.PI * 2)
    ctx.fillStyle = medal.color
    ctx.shadowColor = medal.color
    ctx.shadowBlur = 12
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.strokeStyle = medal.border
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.font = '16px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.fillText(medal.icon, cx - cw / 2 + 35, cy + 1)
    ctx.restore()
  }

  const blink = Math.sin(Date.now() / 380) > 0
  if (blink) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif'
    ctx.shadowColor = 'rgba(0, 240, 255, 0.5)'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#fff'
    ctx.fillText('TAP TO RESTART', W / 2, H / 2 - GROUND_H / 2 + 65)
    ctx.shadowBlur = 0
  }
}

function getMedal(score: number): { color: string; border: string; icon: string } | null {
  if (score >= 40) return { color: '#e5e4e2', border: '#aaa', icon: '★' }
  if (score >= 20) return { color: '#ffd700', border: '#b8860b', icon: '★' }
  if (score >= 10) return { color: '#c0c0c0', border: '#888', icon: '◆' }
  if (score >= 1) return { color: '#cd7f32', border: '#8b5a2b', icon: '●' }
  return null
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function hit(pl: PlayerPhysics, pipe: Pipe, groundY: number): boolean {
  const r = pl.width / 2
  const cx = pl.x, cy = pl.y
  const rects = [
    { l: pipe.x, r: pipe.x + pipe.width, t: 0, b: pipe.gapStart },
    { l: pipe.x, r: pipe.x + pipe.width, t: pipe.gapEnd, b: groundY },
  ]
  for (const rect of rects) {
    const cx2 = Math.max(rect.l, Math.min(cx, rect.r))
    const cy2 = Math.max(rect.t, Math.min(cy, rect.b))
    const dx = cx - cx2, dy = cy - cy2
    if (dx * dx + dy * dy < r * r) return true
  }
  return false
}

function bindEvents(canvas: HTMLCanvasElement, input: () => void): (() => void)[] {
  const kd = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); input() } }
  const cl = () => input()
  const tc = (e: TouchEvent) => { e.preventDefault(); input() }
  window.addEventListener('keydown', kd)
  canvas.addEventListener('click', cl)
  canvas.addEventListener('touchstart', tc, { passive: false })
  return [
    () => window.removeEventListener('keydown', kd),
    () => canvas.removeEventListener('click', cl),
    () => canvas.removeEventListener('touchstart', tc),
  ]
}
