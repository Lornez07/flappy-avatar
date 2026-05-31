import React, { useState, useRef, useCallback } from 'react'
import { AvatarUploader } from './AvatarUploader'
import { CropModal } from './CropModal'
import { GameCanvas } from './GameCanvas'
import { Leaderboard } from './Leaderboard'
import {
  uploadAvatarToStorage,
  submitScore,
  fetchPlayerBest,
} from '../lib/supabaseClient'

export const GameContainer: React.FC = () => {
  const [playerImage, setPlayerImage] = useState<HTMLImageElement | null>(null)
  const [showCrop, setShowCrop] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('flappyAvatar_best')
    return saved ? parseInt(saved) : 0
  })
  const [phase, setPhase] = useState<'UPLOAD' | 'GAME'>(
    localStorage.getItem('flappyAvatar_hasAvatar') ? 'GAME' : 'UPLOAD',
  )

  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showSubmit, setShowSubmit] = useState(false)

  const originalImageRef = useRef<HTMLImageElement | null>(null)

  const handleImageSelected = useCallback((img: HTMLImageElement) => {
    originalImageRef.current = img
    setShowCrop(true)
  }, [])

  const handleCropConfirm = useCallback((cropped: HTMLImageElement) => {
    setPlayerImage(cropped)
    setShowCrop(false)
    setPhase('GAME')
    localStorage.setItem('flappyAvatar_hasAvatar', '1')
  }, [])

  const handleCropCancel = useCallback(() => {
    setShowCrop(false)
  }, [])

  const handleScore = useCallback((s: number) => {
    setScore(s)
  }, [])

  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore)
    const best = Math.max(highScore, finalScore)
    setHighScore(best)
    localStorage.setItem('flappyAvatar_best', String(best))
    setShowSubmit(true)
  }, [highScore])

  const handleRestart = useCallback(() => {
    setShowSubmit(false)
    setSubmitError(null)
    setPlayerName('')
  }, [])

  const handleSubmitScore = useCallback(async () => {
    if (!playerName.trim()) {
      setSubmitError('Enter your name')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      let avatarUrl: string | undefined
      if (playerImage?.src) {
        avatarUrl = await uploadAvatarToStorage(playerImage.src, playerName.trim()) ?? undefined
      }
      const result = await submitScore(playerName.trim(), score, avatarUrl)
      if (!result.success) {
        setSubmitError(result.error || 'Failed to submit')
        setSubmitting(false)
        return
      }
      await fetchPlayerBest(playerName.trim())
      setSubmitting(false)
      setLeaderboardOpen(true)
    } catch {
      setSubmitError('Failed to submit score')
      setSubmitting(false)
    }
  }, [playerName, score, playerImage])

  if (phase === 'UPLOAD' && !showCrop) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-300 to-sky-500 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
          <h1 className="text-3xl font-bold text-sky-800 mb-2">Flappy Avatar</h1>
          <p className="text-gray-500 text-sm mb-6">Upload your photo to play</p>
          <AvatarUploader onImageSelected={handleImageSelected} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-sky-200 to-sky-400 p-2 sm:p-4">
      <div className="w-full max-w-[400px]">
        {phase === 'GAME' && playerImage && (
          <GameCanvas
            playerImage={playerImage}
            onScore={handleScore}
            onGameOver={handleGameOver}
            onRestart={handleRestart}
            highScore={highScore}
          />
        )}

        {showSubmit && (
          <div className="bg-white/90 backdrop-blur rounded-2xl p-4 mt-3 shadow-lg space-y-2">
            <input
              type="text"
              placeholder="Enter your name"
              maxLength={50}
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
            {submitError && (
              <p className="text-red-500 text-xs">{submitError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSubmitScore}
                disabled={submitting}
                className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:bg-gray-300 text-white font-bold py-2 rounded-lg text-sm transition"
              >
                {submitting ? 'Submitting...' : '📊 Submit Score'}
              </button>
              <button
                onClick={() => setLeaderboardOpen(!leaderboardOpen)}
                className="px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg text-sm transition"
              >
                🏆
              </button>
            </div>
          </div>
        )}

        {leaderboardOpen && (
          <div className="bg-white/90 backdrop-blur rounded-2xl p-4 mt-3 shadow-lg">
            <Leaderboard
              playerName={showSubmit ? playerName : undefined}
              limit={10}
            />
          </div>
        )}

        {!showSubmit && !leaderboardOpen && (
          <div className="text-center mt-3">
            <button
              onClick={() => setLeaderboardOpen(true)}
              className="text-white/80 hover:text-white text-sm font-bold transition"
            >
              🏆 View Leaderboard
            </button>
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
