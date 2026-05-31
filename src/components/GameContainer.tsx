import React, { useState, useCallback, useRef } from 'react'
import { AvatarPicker } from './AvatarPicker'
import { CropModal } from './CropModal'
import { GameCanvas } from './GameCanvas'
import { Leaderboard } from './Leaderboard'
import { AvatarConfig } from '../types'
import {
  uploadAvatarToStorage,
  submitScore,
  fetchPlayerBest,
} from '../lib/supabaseClient'

const DEFAULT_AVATAR: AvatarConfig = {
  type: 'skin', skinId: 'cool', photoData: null, neonColorId: 'cyan',
}

export const GameContainer: React.FC = () => {
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    const saved = localStorage.getItem('flappyAvatar_config')
    return saved ? JSON.parse(saved) : DEFAULT_AVATAR
  })
  const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null)
  const [showCrop, setShowCrop] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const s = localStorage.getItem('flappyAvatar_best')
    return s ? parseInt(s) : 0
  })
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('flappyAvatar_name') || '')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)

  const originalImageRef = useRef<HTMLImageElement | null>(null)

  const handleConfigChange = useCallback((cfg: AvatarConfig) => {
    setAvatarConfig(cfg)
    localStorage.setItem('flappyAvatar_config', JSON.stringify(cfg))
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
      localStorage.setItem('flappyAvatar_best', String(best))
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
    if (!playerName.trim()) { setSubmitError('Enter your name'); return }
    setSubmitting(true)
    setSubmitError(null)
    try {
      localStorage.setItem('flappyAvatar_name', playerName.trim())
      const avatarUrl = photoImage?.src
        ? await uploadAvatarToStorage(photoImage.src, playerName.trim()) ?? undefined
        : undefined
      const result = await submitScore(playerName.trim(), score, avatarUrl)
      if (!result.success) {
        setSubmitError(result.error || 'Failed to submit')
        setSubmitting(false)
        return
      }
      await fetchPlayerBest(playerName.trim())
      setSubmitting(false)
      setSubmitted(true)
    } catch {
      setSubmitError('Failed to submit score')
      setSubmitting(false)
    }
  }, [playerName, score, photoImage])

  const showPhoto = avatarConfig.type === 'photo' && photoImage
  const isNewBest = score >= highScore && score > 0

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #0f0c29, #1a1a4e, #0a0a1a)',
        WebkitUserSelect: 'none', userSelect: 'none',
      }}
    >
      <div className="w-full max-w-[400px] space-y-3">

        <GameCanvas
          avatarConfig={avatarConfig}
          photoImage={showPhoto ? photoImage : null}
          onScore={handleScore}
          onGameOver={handleGameOver}
          onRestart={handleRestart}
          highScore={highScore}
        />

        {showSubmit ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-3 border border-white/10 shadow-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-xs font-semibold tracking-wider">Score</span>
                <span className="text-xl font-bold text-white">{score}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-xs font-semibold tracking-wider">Best</span>
                <span className="text-xl font-bold text-cyan-400">{highScore}</span>
              </div>
            </div>

            {isNewBest && (
              <p className="text-center text-amber-400 text-xs font-bold">New Personal Best!</p>
            )}

            {!submitted ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your name"
                  maxLength={50}
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-cyan-400/50 transition"
                />
                <button
                  onClick={handleSubmitScore}
                  disabled={submitting}
                  className="shrink-0 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-cyan-500/20"
                >
                  {submitting ? '...' : 'Submit'}
                </button>
              </div>
            ) : (
              <p className="text-center text-green-400 text-xs font-semibold">Score submitted!</p>
            )}

            {submitError && (
              <p className="text-red-400 text-xs">{submitError}</p>
            )}

            <div className="border-t border-white/10 pt-2 max-h-[220px] overflow-y-auto scrollbar-none">
              <Leaderboard
                playerName={playerName}
                limit={5}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl space-y-3">
            <AvatarPicker
              config={avatarConfig}
              onChange={handleConfigChange}
              onUploadClick={() => document.getElementById('avatar-upload-input')?.click()}
            />

            <input
              id="avatar-upload-input"
              type="file"
              accept="image/*"
              className="hidden"
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
              }}
            />
          </div>
        )}
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
