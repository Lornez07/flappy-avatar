import React, { useState, useCallback, useEffect, useRef } from 'react'
import { AvatarPicker } from './AvatarPicker'
import { CropModal } from './CropModal'
import { GameCanvas } from './GameCanvas'
import { Leaderboard } from './Leaderboard'
import { AvatarConfig, AVATAR_SKINS } from '../types'
import {
  submitScore,
  fetchPlayerBest,
  isSupabaseConfigured,
} from '../lib/supabaseClient'
import { sanitizePlayerName, MAX_NAME_LENGTH } from '../lib/validation'
import { setMuted as setAudioMuted } from '../lib/audio'

function emojiToDataUrl(emoji: string): string {
  const c = document.createElement('canvas')
  c.width = 40; c.height = 40
  const cx = c.getContext('2d')!
  cx.fillStyle = '#1a1a2e'; cx.beginPath(); cx.arc(20, 20, 18, 0, Math.PI * 2); cx.fill()
  cx.font = '22px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'
  cx.fillStyle = '#fff'; cx.fillText(emoji, 20, 21)
  return c.toDataURL()
}

function resizeImageToDataUrl(img: HTMLImageElement, size: number): string {
  const c = document.createElement('canvas')
  c.width = size; c.height = size
  const cx = c.getContext('2d')!
  cx.beginPath(); cx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); cx.clip()
  cx.drawImage(img, 0, 0, size, size)
  return c.toDataURL()
}

const DEFAULT_AVATAR: AvatarConfig = {
  type: 'skin', skinId: 'cool', photoData: null, neonColorId: 'cyan',
}

export const GameContainer: React.FC = () => {
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    try {
      const saved = localStorage.getItem('flappyAvatar_config')
      return saved ? (JSON.parse(saved) as AvatarConfig) : DEFAULT_AVATAR
    } catch {
      return DEFAULT_AVATAR
    }
  })
  const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null)
  const [showCrop, setShowCrop] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const s = localStorage.getItem('flappyAvatar_best')
    const parsed = s ? parseInt(s, 10) : 0
    return Number.isFinite(parsed) ? parsed : 0
  })
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('flappyAvatar_name') || '')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem('flappyAvatar_muted') === '1' } catch { return false }
  })

  const originalImageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => { setAudioMuted(muted) }, [muted])

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      try { localStorage.setItem('flappyAvatar_muted', next ? '1' : '0') } catch { /* best-effort */ }
      return next
    })
  }, [])

  const handleConfigChange = useCallback((cfg: AvatarConfig) => {
    setAvatarConfig(cfg)
    try {
      localStorage.setItem('flappyAvatar_config', JSON.stringify(cfg))
    } catch {
      // Persisting the avatar is best-effort; never block the picker on quota.
    }
  }, [])

  const handleImageSelected = useCallback((img: HTMLImageElement) => {
    originalImageRef.current = img
    setShowCrop(true)
  }, [])

  const handleCropConfirm = useCallback((cropped: HTMLImageElement) => {
    setPhotoImage(cropped)
    setShowCrop(false)
    handleConfigChange({ ...avatarConfig, type: 'photo', photoData: cropped.src })
  }, [avatarConfig, handleConfigChange])

  const handleCropCancel = useCallback(() => setShowCrop(false), [])

  const handleScore = useCallback((s: number) => setScore(s), [])

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore)
    setHighScore(prev => {
      const best = Math.max(prev, finalScore)
      try {
        localStorage.setItem('flappyAvatar_best', String(best))
      } catch {
        // Storage may be unavailable (private mode); keep the in-memory best.
      }
      return best
    })
    setSubmitted(false)
    setSubmitError(null)
    setShowSubmit(true)
  }, [])

  const handleRestart = useCallback(() => {
    setShowSubmit(false)
    setSubmitError(null)
    setSubmitted(false)
  }, [])

  const handleSubmitScore = useCallback(async () => {
    const name = sanitizePlayerName(playerName)
    if (!name) { setSubmitError('Enter your name'); return }
    setSubmitting(true)
    setSubmitError(null)
    try {
      localStorage.setItem('flappyAvatar_name', name)
      const skin = AVATAR_SKINS.find(s => s.id === avatarConfig.skinId) ?? AVATAR_SKINS[0]
      const avatarUrl = photoImage ? resizeImageToDataUrl(photoImage, 40) : emojiToDataUrl(skin.emoji)
      const result = await submitScore(name, score, avatarUrl)
      if (!result.success) {
        setSubmitError(result.error || 'Failed to submit')
        setSubmitting(false)
        return
      }
      await fetchPlayerBest(name)
      setSubmitting(false)
      setSubmitted(true)
    } catch {
      setSubmitError('Failed to submit score')
      setSubmitting(false)
    }
  }, [playerName, score, photoImage, avatarConfig.skinId])

  const showPhoto = avatarConfig.type === 'photo' && photoImage
  const isNewBest = score >= highScore && score > 0

  return (
    <div className="poster-page">
      <div className="poster-wrap">
        <header className="masthead">
          <div className="masthead-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> THE ONE-BUTTON ARCADE</p>
            <h1 className="brand-title">FLAPPY <span>AVATAR</span></h1>
            <p className="brand-tagline">Pick a face. Find your wings. Beat your best.</p>
          </div>
          <div className="masthead-actions">
            <div className="issue-stamp" aria-label="First edition">
              <span>ARCADE</span>
              <strong>NO.<br />01</strong>
            </div>
            <button
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
              className="sound-button"
            >
              <span aria-hidden="true">{muted ? '◖' : '♫'}</span>
              {muted ? 'SOUND OFF' : 'SOUND ON'}
            </button>
          </div>
        </header>

        <div className="poster-rule">
          <span>ONE BUTTON</span>
          <i />
          <span>ENDLESS BRAGGING RIGHTS</span>
          <i />
          <span>YOUR TURN</span>
        </div>

        <main className="arcade-layout">
          <section className="flight-column" aria-label="Game">
            <div className="column-heading">
              <span className="section-number">01</span>
              <h2>THE FLIGHT DECK</h2>
              <span className="heading-note">TAP TO FLY</span>
            </div>

            <div className="game-cabinet">
              <div className="cabinet-topline">
                <span><i className="live-dot" /> INSERT AVATAR</span>
                <span>SOLO RUN / 01</span>
              </div>
              <div className="game-canvas-frame">
                <GameCanvas
                  avatarConfig={avatarConfig}
                  photoImage={showPhoto ? photoImage : null}
                  onScore={handleScore}
                  onGameOver={handleGameOver}
                  onRestart={handleRestart}
                  highScore={highScore}
                />
              </div>
              <div className="cabinet-bottomline">
                <span>FLAP</span><span className="cabinet-dashes" /><span>DON'T BONK</span>
              </div>
            </div>

            <div className="play-tip">
              <span className="tip-arrow" aria-hidden="true">↗</span>
              <div>
                <strong>Tap anywhere to flap</strong>
                <span>Spacebar works too. Keep your cool.</span>
              </div>
              <kbd>SPACE</kbd>
            </div>
          </section>

          <aside className="details-column">
            {!showSubmit ? (
              <>
                <section className="poster-card customize-card">
                  <div className="card-overline"><span>02</span> PLAYER SETUP</div>
                  <div className="customize-heading">
                    <div>
                      <h2>Make it yours.</h2>
                      <p>Every great flight needs a co-pilot.</p>
                    </div>
                    <div className="avatar-preview" aria-label="Selected avatar">
                      {showPhoto
                        ? <img src={photoImage.src} alt="Your selected photo avatar" />
                        : <span>{AVATAR_SKINS.find(s => s.id === avatarConfig.skinId)?.emoji ?? AVATAR_SKINS[0].emoji}</span>}
                    </div>
                  </div>
                  <AvatarPicker
                    config={avatarConfig}
                    onChange={handleConfigChange}
                    onUploadClick={() => document.getElementById('avatar-upload-input')?.click()}
                  />
                  <input
                    id="avatar-upload-input"
                    type="file"
                    accept="image/*"
                    className="visually-hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => {
                        const img = new Image()
                        img.onload = () => handleImageSelected(img)
                        img.src = ev.target?.result as string
                      }
                      reader.readAsDataURL(file)
                      e.currentTarget.value = ''
                    }}
                  />
                </section>

                <section className="best-score-card" aria-label="Personal best">
                  <div className="best-score-copy">
                    <span>YOUR PERSONAL BEST</span>
                    <strong>{highScore.toString().padStart(2, '0')}</strong>
                  </div>
                  <span className="best-score-star" aria-hidden="true">★</span>
                </section>

                <div className="side-note">
                  <span className="side-note-mark" aria-hidden="true">!</span>
                  <p><strong>Quick tip</strong> The gaps get tighter. Tiny taps beat panic flaps.</p>
                </div>
              </>
            ) : (
              <section className="poster-card results-card">
                <div className="card-overline"><span>03</span> FLIGHT REPORT</div>
                <div className="result-heading">
                  <div>
                    <h2>Nice flight.</h2>
                    <p>Every bonk is a new beginning.</p>
                  </div>
                  {isNewBest && <span className="new-best-sticker">NEW<br />BEST!</span>}
                </div>

                <div className="scoreboard">
                  <div><span>THIS FLIGHT</span><strong>{score.toString().padStart(2, '0')}</strong></div>
                  <div><span>PERSONAL BEST</span><strong>{highScore.toString().padStart(2, '0')}</strong></div>
                </div>

                {!submitted ? (
                  <div className="submit-block">
                    <label htmlFor="player-name">Put your name on the board</label>
                    <div className="submit-row">
                      <input
                        id="player-name"
                        type="text"
                        placeholder="Your name"
                        maxLength={MAX_NAME_LENGTH}
                        value={playerName}
                        onChange={e => setPlayerName(e.target.value)}
                      />
                      <button
                        onClick={handleSubmitScore}
                        disabled={submitting || !isSupabaseConfigured}
                        className="submit-button"
                      >
                        {submitting ? 'SENDING…' : 'SUBMIT ↗'}
                      </button>
                    </div>
                    {!isSupabaseConfigured && (
                      <p className="service-note">Leaderboard unavailable — Supabase is not configured.</p>
                    )}
                    {submitError && <p className="form-error" role="alert">{submitError}</p>}
                  </div>
                ) : (
                  <p className="submit-success" role="status">✦ Score submitted. You're on the board!</p>
                )}

                <div className="leaderboard-block">
                  <Leaderboard playerName={playerName} limit={5} />
                </div>
              </section>
            )}
          </aside>
        </main>

        <footer className="poster-footer">
          <span>FLAPPY AVATAR</span>
          <span>MADE FOR THE LOVE OF ONE MORE TRY</span>
          <span>© HIGH SCORE CLUB</span>
        </footer>
      </div>

      {showCrop && originalImageRef.current && (
        <CropModal
          originalImage={originalImageRef.current}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          avatarSize={40}
        />
      )}
    </div>
  )
}
