import React, { useEffect, useRef } from 'react'
import { PlayerPhysics, PhysicsConfig, Pipe, PipeConfig, AvatarConfig, AVATAR_SKINS, NEON_COLORS } from '../types'
import { playFlap, playScore, playHit } from '../lib/audio'
import { frameDelta, hasClearedPipe, hitsPipe, randomGap } from '../lib/gameLogic'
import { LivePlayer, LocalPlayerState } from '../lib/livePlayers'

interface Props {
  avatarConfig: AvatarConfig
  photoImage: HTMLImageElement | null
  onScore: (s: number) => void
  onGameOver: (s: number) => void
  onPlayingChange: (playing: boolean) => void
  onPlayerState: (state: LocalPlayerState) => void
  highScore: number
  restartToken: number
  remotePlayers: LivePlayer[]
}

const LIVE_PLAYER_UPDATE_MS = 250
const PHYSICS: PhysicsConfig = {
  gravity: 0.45, flapStrength: -9.5, maxVelocity: 12,
  rotationFlap: -18, rotationMax: 65, rotationLerpSpeed: 0.08,
}

const PIPE: PipeConfig = {
  width: 52, gap: 158, spacing: 60, minGapY: 90, speed: 4.5,
}

const W = 400, H = 600, GROUND_H = 100, AVATAR_R = 18, PLAYER_X = 85
const TARGET_FRAME_MS = 1000 / 60
const MAX_DT = 3

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const PARTICLE_COUNT = REDUCED_MOTION ? 0 : 8

type Screen = 'MENU' | 'PLAYING' | 'GAME_OVER'

export const GameCanvas: React.FC<Props> = ({
  avatarConfig, photoImage,
  onScore, onGameOver, onPlayingChange, onPlayerState, highScore, restartToken, remotePlayers,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastRestartToken = useRef(restartToken)
  const remotePlayersRef = useRef(remotePlayers)
  const remoteYRef = useRef(new Map<string, number>())
  remotePlayersRef.current = remotePlayers

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
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return
    // Rebind to a non-null const so the nested render helpers below keep the
    // narrowed type when they capture it.
    const ctx: CanvasRenderingContext2D = ctx2d

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

    if (lastRestartToken.current !== restartToken) {
      reset()
      lastRestartToken.current = restartToken
      onPlayingChange(false)
    }

    function onInput() {
      if (screen.current === 'MENU') {
        screen.current = 'PLAYING'
        onPlayingChange(true)
        pipeTimer.current = PIPE.spacing - 50
        const pl = p.current
        pl.velocityY = PHYSICS.flapStrength
        pl.rotation = PHYSICS.rotationFlap
        return
      }
      if (screen.current === 'GAME_OVER') {
        return
      }
      if (screen.current === 'PLAYING') {
        const pl = p.current
        if (pl.y + pl.height / 2 > H - GROUND_H) return
        playFlap()
        pl.velocityY = PHYSICS.flapStrength
        pl.rotation = PHYSICS.rotationFlap
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          particles.current.push({
            x: pl.x - 16 + Math.random() * 8,
            y: pl.y - 4 + Math.random() * 8,
            life: 0.8 + Math.random() * 0.2,
            vx: -2 - Math.random() * 2, vy: -1 + Math.random() * 3,
          })
        }
      }
    }

    function tick(dt: number) {
      const scr = screen.current
      const pl = p.current

      groundOff.current = (groundOff.current + PIPE.speed * dt) % 24
      neonPulse.current += 0.03 * dt

      if (scr === 'MENU') {
        bob.current += 0.04 * dt
        pl.y = (H / 2 - GROUND_H / 2) + Math.sin(bob.current) * 8
        return
      }
      if (scr === 'GAME_OVER') return

      pl.velocityY = Math.min(pl.velocityY + PHYSICS.gravity * dt, PHYSICS.maxVelocity)
      pl.y += pl.velocityY * dt

      const target = pl.velocityY > 0 ? PHYSICS.rotationMax : PHYSICS.rotationFlap
      pl.rotation += (target - pl.rotation) * PHYSICS.rotationLerpSpeed * dt

      if (pl.y + pl.height / 2 > H - GROUND_H || pl.y - pl.height / 2 < 0) {
        playHit()
        screen.current = 'GAME_OVER'
        onPlayingChange(false)
        const fs = score.current
        best.current = Math.max(best.current, fs)
        onGameOver(fs)
        return
      }

      pipeTimer.current += 1 * dt
      if (pipeTimer.current > PIPE.spacing) {
        const { gapStart, gapEnd } = randomGap(Math.random, PIPE.minGapY, PIPE.gap, H, GROUND_H)
        pipes.current.push({ x: W, gapStart, gapEnd, scored: false, width: PIPE.width })
        pipeTimer.current = 0
      }

      for (let i = pipes.current.length - 1; i >= 0; i--) {
        const pipe = pipes.current[i]
        pipe.x -= PIPE.speed * dt

        if (!pipe.scored && hasClearedPipe(pl, pipe)) {
          score.current++; pipe.scored = true; playScore(); onScore(score.current)
        }

        if (hitsPipe(pl, pipe, H - GROUND_H)) {
          playHit()
          screen.current = 'GAME_OVER'
          onPlayingChange(false)
          const fs = score.current
          best.current = Math.max(best.current, fs)
          onGameOver(fs)
          return
        }
        if (pipe.x + pipe.width < 0) pipes.current.splice(i, 1)
      }

      particles.current = particles.current
        .map(pt => ({ ...pt, x: pt.x + pt.vx * dt, y: pt.y + pt.vy * dt, life: pt.life - 0.035 * dt }))
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
      drawRemotePlayers(
        ctx,
        remotePlayersRef.current,
        remoteYRef.current,
        neonPulse.current,
      )

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
    let lastTime = performance.now()
    let lastLiveUpdateAt = 0
    function loop(now: number) {
      const dt = frameDelta(now - lastTime, TARGET_FRAME_MS, MAX_DT)
      lastTime = now
      tick(dt)
      if (screen.current === 'PLAYING' && now - lastLiveUpdateAt >= LIVE_PLAYER_UPDATE_MS) {
        lastLiveUpdateAt = now
        onPlayerState({ y: p.current.y / H, score: score.current })
      }
      render()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const clean = bindEvents(canvas, onInput)

    return () => {
      cancelAnimationFrame(raf)
      clean.forEach(fn => fn())
    }
  }, [avatarConfig, photoImage, onScore, onGameOver, onPlayingChange, onPlayerState, restartToken])

  return (
    <div className="w-full max-w-[400px] mx-auto select-none" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
      <canvas
        ref={canvasRef}
        role="application"
        aria-label="Flappy Avatar game. Press Space, tap, or click to flap. After game over, use the Play Again button."
        tabIndex={0}
        className="game-canvas w-full aspect-[2/3] cursor-pointer touch-none focus:outline-none"
      />
    </div>
  )
}

function drawRemotePlayers(
  ctx: CanvasRenderingContext2D,
  players: LivePlayer[],
  displayedY: Map<string, number>,
  pulse: number,
) {
  const activeIds = new Set(players.map(player => player.id))
  for (const id of displayedY.keys()) {
    if (!activeIds.has(id)) displayedY.delete(id)
  }

  players.forEach((player, index) => {
    const color = NEON_COLORS.find(candidate => candidate.id === player.colorId) ?? NEON_COLORS[0]
    const targetY = Math.max(
      AVATAR_R + 28,
      Math.min(H - GROUND_H - AVATAR_R - 8, player.y * H),
    )
    const currentY = displayedY.get(player.id) ?? targetY
    const y = currentY + (targetY - currentY) * 0.18
    displayedY.set(player.id, y)

    drawRemoteAvatar(
      ctx,
      player,
      PLAYER_X + 50 + index * 48,
      y,
      color.hex,
      pulse + index,
    )
  })
}

function drawRemoteAvatar(
  ctx: CanvasRenderingContext2D,
  player: LivePlayer,
  x: number,
  y: number,
  color: string,
  pulse: number,
) {
  ctx.save()
  ctx.globalAlpha = 0.78
  ctx.shadowColor = color
  ctx.shadowBlur = 4 + Math.sin(pulse * 2) * 2
  ctx.beginPath()
  ctx.arc(x, y, AVATAR_R + 2, 0, Math.PI * 2)
  ctx.fillStyle = '#fffaf0'
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.arc(x, y, AVATAR_R, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.font = `${AVATAR_R * 1.1}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(player.avatarEmoji, x, y + 1)
  ctx.strokeStyle = '#25231f'
  ctx.lineWidth = 2
  ctx.stroke()

  const scoreText = String(player.score)
  ctx.font = 'bold 9px "Trebuchet MS", Arial, sans-serif'
  const tagWidth = Math.max(22, ctx.measureText(scoreText).width + 8)
  roundRect(ctx, x - tagWidth / 2, y - AVATAR_R - 14, tagWidth, 13, 3)
  ctx.fillStyle = '#25231f'
  ctx.fill()
  ctx.fillStyle = '#fffaf0'
  ctx.fillText(scoreText, x, y - AVATAR_R - 7)
  ctx.restore()
}

function sky(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#8bcbd2')
  g.addColorStop(0.55, '#c5dfd4')
  g.addColorStop(1, '#f4e3ae')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)

  ctx.globalAlpha = 0.9
  ctx.fillStyle = '#f4c84e'
  ctx.beginPath(); ctx.arc(315, 105, 34, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(255,250,226,0.65)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(315, 105, 42, 0, Math.PI * 2); ctx.stroke()
  ctx.globalAlpha = 1

  ctx.fillStyle = 'rgba(71, 121, 104, 0.16)'
  ctx.beginPath()
  ctx.moveTo(0, 443); ctx.quadraticCurveTo(87, 390, 181, 444)
  ctx.quadraticCurveTo(280, 390, W, 430); ctx.lineTo(W, H - GROUND_H)
  ctx.lineTo(0, H - GROUND_H); ctx.closePath(); ctx.fill()
}

function clouds(ctx: CanvasRenderingContext2D, off: number) {
  ctx.globalAlpha = 0.7
  ctx.fillStyle = '#fffaf0'
  const list = [
    { x: 30, y: 150, w: 80, h: 24 },
    { x: 180, y: 220, w: 100, h: 20 },
    { x: 300, y: 70, w: 60, h: 19 },
    { x: 100, y: 325, w: 90, h: 25 },
  ]
  const speed = 0.2
  for (const c of list) {
    const cx = ((c.x + off * speed) % (W + 150)) - 75
    ctx.beginPath()
    ctx.ellipse(cx, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2)
    ctx.ellipse(cx - c.w * 0.2, c.y - c.h * 0.35, c.w * 0.24, c.h * 0.45, 0, 0, Math.PI * 2)
    ctx.ellipse(cx + c.w * 0.17, c.y - c.h * 0.22, c.w * 0.29, c.h * 0.52, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function ground(ctx: CanvasRenderingContext2D, off: number) {
  const gy = H - GROUND_H

  ctx.fillStyle = '#e2c36d'
  ctx.fillRect(0, gy, W, GROUND_H)

  ctx.fillStyle = '#5b7b4d'
  ctx.fillRect(0, gy, W, 12)
  ctx.fillStyle = '#344f3a'
  ctx.fillRect(0, gy + 12, W, 3)

  ctx.strokeStyle = 'rgba(98, 76, 35, 0.22)'
  ctx.lineWidth = 1
  for (let x = -off; x < W + 28; x += 28) {
    ctx.beginPath()
    ctx.moveTo(x, gy + 25)
    ctx.lineTo(x + 14, gy + 31)
    ctx.lineTo(x + 28, gy + 25)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(255, 247, 215, 0.38)'
  ctx.fillRect(0, H - 3, W, 3)
}

function obstacles(ctx: CanvasRenderingContext2D, pipes: Pipe[]) {
  for (const pipe of pipes) {
    const co = 8
    const ch = 24

    ctx.shadowColor = 'rgba(55, 39, 27, 0.18)'
    ctx.shadowBlur = 5
    ctx.fillStyle = '#c7493c'
    ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapStart)
    ctx.fillRect(pipe.x, pipe.gapEnd, pipe.width, H - pipe.gapEnd)

    ctx.shadowBlur = 6
    ctx.fillStyle = '#a93c33'
    ctx.fillRect(pipe.x - co, pipe.gapStart - ch, pipe.width + co * 2, ch)
    ctx.fillRect(pipe.x - co, pipe.gapEnd, pipe.width + co * 2, ch)

    ctx.shadowBlur = 0
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = 'rgba(255, 238, 199, 0.72)'
    ctx.fillRect(pipe.x + 8, 0, 5, Math.max(0, pipe.gapStart - ch))
    ctx.fillRect(pipe.x + 8, pipe.gapEnd + ch, 5, Math.max(0, H - pipe.gapEnd - ch - GROUND_H))
    ctx.strokeStyle = '#74362e'
    ctx.lineWidth = 2
    ctx.strokeRect(pipe.x, 0, pipe.width, pipe.gapStart)
    ctx.strokeRect(pipe.x, pipe.gapEnd, pipe.width, H - pipe.gapEnd)
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
  const glowIntensity = 0.45 + Math.sin(pulse * 2) * 0.12

  ctx.save()
  ctx.translate(pl.x, pl.y)
  ctx.rotate((pl.rotation * Math.PI) / 180)

  ctx.shadowColor = neon.glow
  ctx.shadowBlur = 9 * glowIntensity

  ctx.beginPath()
  ctx.arc(0, 0, r + 2, 0, Math.PI * 2)
  ctx.fillStyle = '#fffaf0'
  ctx.fill()

  ctx.shadowBlur = 3
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fillStyle = '#fffaf0'
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

  ctx.shadowBlur = 2
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.strokeStyle = '#25231f'
  ctx.lineWidth = 2
  ctx.globalAlpha = glowIntensity
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, r + 2, 0, Math.PI * 2)
  ctx.strokeStyle = neon.hex
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0

  ctx.restore()
}

function drawScore(ctx: CanvasRenderingContext2D, score: number, screen: Screen) {
  if (screen === 'MENU' || screen === 'GAME_OVER') return

  ctx.font = 'bold 54px Impact, "Arial Narrow", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  ctx.shadowColor = 'rgba(37, 35, 31, 0.18)'
  ctx.shadowBlur = 2
  ctx.fillStyle = '#25231f'
  ctx.fillText(String(score), W / 2, 20)

  ctx.shadowBlur = 0
  ctx.strokeStyle = '#fffaf0'
  ctx.lineWidth = 4
  ctx.strokeText(String(score), W / 2, 20)
  ctx.fillStyle = '#25231f'
  ctx.fillText(String(score), W / 2, 20)
}

function drawMenu(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = 'center'

  ctx.shadowColor = 'rgba(37, 35, 31, 0.12)'
  ctx.shadowBlur = 2
  ctx.font = 'bold 37px Impact, "Arial Narrow", sans-serif'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = '#25231f'
  ctx.fillText('Flappy Avatar', W / 2, H / 2 - GROUND_H / 2 - 50)
  ctx.shadowBlur = 0

  ctx.font = 'bold 11px "Trebuchet MS", Arial, sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#625e54'
  ctx.fillText('YOUR AVATAR. YOUR FLIGHT.', W / 2, H / 2 - GROUND_H / 2 + 48)

  const blink = Math.sin(Date.now() / 380) > 0
  if (blink) {
    const x = W / 2 - 73
    const y = H / 2 - GROUND_H / 2 + 72
    ctx.fillStyle = '#d84c3f'
    roundRect(ctx, x, y, 146, 34, 5)
    ctx.fill()
    ctx.font = 'bold 14px "Trebuchet MS", Arial, sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fffaf0'
    ctx.fillText('TAP TO START', W / 2, y + 17)
    ctx.shadowBlur = 0
  }
}

function drawGameOver(ctx: CanvasRenderingContext2D, score: number, best: number) {
  ctx.fillStyle = 'rgba(243, 237, 223, 0.84)'
  ctx.fillRect(0, 0, W, H - GROUND_H)

  ctx.textAlign = 'center'

  ctx.shadowColor = 'rgba(37, 35, 31, 0.12)'
  ctx.shadowBlur = 2
  ctx.font = 'bold 39px Impact, "Arial Narrow", sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#b83b32'
  ctx.fillText('FLIGHT OVER', W / 2, H / 2 - GROUND_H / 2 - 90)
  ctx.shadowBlur = 0

  const cx = W / 2
  const cy = H / 2 - GROUND_H / 2 - 5
  const cw = 230, ch = 110

  ctx.shadowColor = 'rgba(37, 35, 31, 0.2)'
  ctx.shadowBlur = 3
  ctx.fillStyle = '#fffaf0'
  roundRect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 5)
  ctx.fill()
  ctx.strokeStyle = '#25231f'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.shadowBlur = 0

  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'

  ctx.font = 'bold 11px "Trebuchet MS", Arial, sans-serif'
  ctx.fillStyle = '#625e54'
  ctx.fillText('SCORE', cx - 35, cy - 18)
  ctx.fillText('BEST', cx - 35, cy + 18)

  ctx.textAlign = 'right'
  ctx.font = 'bold 23px Impact, "Arial Narrow", sans-serif'
  ctx.fillStyle = '#25231f'
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
    ctx.fillStyle = '#fffaf0'
    ctx.fillText(medal.icon, cx - cw / 2 + 35, cy + 1)
    ctx.restore()
  }

  const blink = Math.sin(Date.now() / 380) > 0
  if (blink) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 12px "Trebuchet MS", Arial, sans-serif'
    ctx.fillStyle = '#b83b32'
    ctx.fillText('USE PLAY AGAIN BELOW', W / 2, H / 2 - GROUND_H / 2 + 70)
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

function bindEvents(canvas: HTMLCanvasElement, input: () => void): (() => void)[] {
  const kd = (e: KeyboardEvent) => {
    if (e.code !== 'Space') return
    const target = e.target
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return
    e.preventDefault()
    input()
  }
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
