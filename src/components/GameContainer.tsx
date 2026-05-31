/**
 * GameContainer Component
 *
 * Main orchestrator for the Flappy Avatar game
 * Manages state machine: IDLE → CROPPING → READY → PLAYING → GAMEOVER
 * Handles avatar upload, crop, game flow, and leaderboard submission
 */

import React, { useState, useRef, useCallback } from 'react';
import { GameState, GamePhase } from '../types';
import { AvatarUploader } from './AvatarUploader';
import { CropModal } from './CropModal';
import { GameCanvas } from './GameCanvas';
import { Leaderboard } from './Leaderboard';
import {
  uploadAvatarToStorage,
  submitScore,
  fetchPlayerBest,
} from '../lib/supabaseClient';

interface GameContainerProps {
  title?: string;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  title = '🎮 Flappy Avatar',
}) => {
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    phase: 'IDLE',
    score: 0,
    highScore: 0,
    playerName: '',
    avatarData: null,
    isSubmittingScore: false,
    error: null,
  });

  // UI state
  const [showCropModal, setShowCropModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);

  // Refs
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const playerImageRef = useRef<HTMLImageElement | null>(null);

  /**
   * Handle image upload
   */
  const handleImageSelected = useCallback((image: HTMLImageElement) => {
    originalImageRef.current = image;
    setShowCropModal(true);
    setGameState((prev) => ({ ...prev, phase: 'CROPPING' }));
  }, []);

  /**
   * Handle crop confirmation
   */
  const handleCropConfirm = useCallback((croppedImage: HTMLImageElement) => {
    playerImageRef.current = croppedImage;
    setPreviewImageSrc(croppedImage.src);
    setShowCropModal(false);
    setGameState((prev) => ({ ...prev, phase: 'READY', avatarData: croppedImage.src }));
  }, []);

  /**
   * Handle crop cancellation
   */
  const handleCropCancel = useCallback(() => {
    setShowCropModal(false);
    setGameState((prev) => ({ ...prev, phase: 'IDLE' }));
  }, []);

  /**
   * Handle game start
   */
  const handleGameStart = useCallback(() => {
    setGameState((prev) => ({ ...prev, phase: 'PLAYING', score: 0 }));
  }, []);

  /**
   * Handle score increase during game
   */
  const handleScore = useCallback((newScore: number) => {
    setGameState((prev) => ({ ...prev, score: newScore }));
  }, []);

  /**
   * Handle game over
   */
  const handleGameOver = useCallback(async (finalScore: number) => {
    setGameState((prev) => ({
      ...prev,
      phase: 'GAMEOVER',
      score: finalScore,
      highScore: Math.max(prev.highScore, finalScore),
    }));
  }, []);

  /**
   * Handle flap (game sound, analytics, etc.)
   */
  const handleFlap = useCallback(() => {
    // Placeholder for sound effects or analytics
    // Example: playSound('flap');
  }, []);

  /**
   * Submit score to leaderboard
   */
  const handleSubmitScore = useCallback(async () => {
    if (!gameState.playerName.trim()) {
      setGameState((prev) => ({ ...prev, error: 'Please enter a name' }));
      return;
    }

    setGameState((prev) => ({ ...prev, isSubmittingScore: true, error: null }));

    try {
      // Upload avatar to storage
      let avatarUrl: string | undefined;
      if (playerImageRef.current?.src) {
        const uploadedUrl = await uploadAvatarToStorage(
          playerImageRef.current.src,
          gameState.playerName
        );
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      // Submit score
      const result = await submitScore(
        gameState.playerName,
        gameState.score,
        avatarUrl
      );

      if (!result.success) {
        setGameState((prev) => ({
          ...prev,
          isSubmittingScore: false,
          error: result.error || 'Failed to submit score',
        }));
        return;
      }

      // Fetch updated high score
      const playerBest = await fetchPlayerBest(gameState.playerName);

      setGameState((prev) => ({
        ...prev,
        isSubmittingScore: false,
        phase: 'READY',
        highScore: playerBest?.score || prev.highScore,
      }));

      setShowLeaderboard(true);
    } catch (error) {
      setGameState((prev) => ({
        ...prev,
        isSubmittingScore: false,
        error: String(error),
      }));
    }
  }, [gameState.playerName, gameState.score]);

  /**
   * Restart game
   */
  const handleRestart = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      phase: 'READY',
      score: 0,
      error: null,
    }));
  }, []);

  /**
   * Upload new image
   */
  const handleUploadNew = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      phase: 'IDLE',
      avatarData: null,
    }));
    setPreviewImageSrc(null);
    playerImageRef.current = null;
    originalImageRef.current = null;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600 flex items-center justify-center p-2 sm:p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-4xl font-bold text-white drop-shadow-lg mb-1 sm:mb-2">
            {title}
          </h1>
          {gameState.phase !== 'IDLE' && (
            <p className="text-white/80 text-sm">
              {gameState.phase === 'CROPPING' && 'Crop your avatar...'}
              {gameState.phase === 'READY' && 'Ready to play! Press SPACE or click'}
              {gameState.phase === 'PLAYING' && `Score: ${gameState.score}`}
              {gameState.phase === 'GAMEOVER' && `Game Over! Final Score: ${gameState.score}`}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/20">
          {/* IDLE: Avatar Upload */}
          {gameState.phase === 'IDLE' && (
            <div>
              <AvatarUploader
                onImageSelected={handleImageSelected}
                previewSrc={previewImageSrc || undefined}
              />
              <p className="text-white/80 text-center text-sm">
                Upload an image to get started
              </p>
            </div>
          )}

          {/* READY: Game Setup */}
          {gameState.phase === 'READY' && playerImageRef.current && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-center mb-2 sm:mb-4">
                <img
                  src={previewImageSrc || ''}
                  alt="Your avatar"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white shadow-lg"
                />
              </div>
              <button
                onClick={handleGameStart}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 sm:py-3 rounded-lg transition text-sm sm:text-base"
              >
                🚀 Start Game
              </button>
              <button
                onClick={handleUploadNew}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded-lg transition text-xs sm:text-sm"
              >
                📤 Upload Different Image
              </button>
            </div>
          )}

          {/* PLAYING: Game Canvas */}
          {gameState.phase === 'PLAYING' && playerImageRef.current && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-black/20 rounded-lg p-2 sm:p-3 text-center">
                <p className="text-yellow-300 text-xl sm:text-2xl font-bold">
                  Score: {gameState.score}
                </p>
              </div>
              <GameCanvas
                playerImage={playerImageRef.current}
                isRunning={gameState.phase === 'PLAYING'}
                onScore={handleScore}
                onGameOver={handleGameOver}
                onFlap={handleFlap}
              />
              <p className="text-white/80 text-center text-xs">
                Tap/click or press SPACE to flap!
              </p>
            </div>
          )}

          {/* GAMEOVER: Score Submission */}
          {gameState.phase === 'GAMEOVER' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-red-500/30 rounded-lg p-3 sm:p-4 text-center border-2 border-red-400">
                <p className="text-white text-base sm:text-lg font-bold mb-2">Game Over!</p>
                <p className="text-white/90">
                  Your Score: <span className="text-2xl sm:text-3xl font-bold text-yellow-300">{gameState.score}</span>
                </p>
                {gameState.score > gameState.highScore && (
                  <p className="text-green-300 font-bold mt-2 text-sm sm:text-base">🎉 New Personal Best!</p>
                )}
              </div>

              {gameState.error && (
                <div className="bg-red-500/30 rounded-lg p-3 text-red-200 text-sm">
                  {gameState.error}
                </div>
              )}

              <input
                type="text"
                placeholder="Enter your name"
                maxLength={50}
                value={gameState.playerName}
                onChange={(e) =>
                  setGameState((prev) => ({
                    ...prev,
                    playerName: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 rounded-lg text-black text-sm sm:text-base"
              />

              <button
                onClick={handleSubmitScore}
                disabled={gameState.isSubmittingScore}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white font-bold py-2 sm:py-2 rounded-lg transition text-sm sm:text-base"
              >
                {gameState.isSubmittingScore ? 'Submitting...' : '📊 Submit Score'}
              </button>

              <button
                onClick={handleRestart}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 sm:py-2 rounded-lg transition text-sm sm:text-base"
              >
                🔄 Play Again
              </button>
            </div>
          )}

          {/* Instructions */}
          {gameState.phase === 'IDLE' && (
            <div className="mt-4 bg-black/20 rounded-lg p-3 text-white/80 text-xs space-y-1">
              <p>📤 Upload your image</p>
              <p>✏️ Position it in the circle</p>
              <p>🚀 Start the game</p>
              <p>⌨️ Press SPACE to flap</p>
              <p>🏆 Dodge pipes &amp; score!</p>
            </div>
          )}
        </div>

        {/* Leaderboard Toggle */}
        <div className="mt-3 sm:mt-4 text-center">
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="text-white hover:text-yellow-300 font-bold transition text-sm sm:text-base"
          >
            {showLeaderboard ? '↓ Hide Leaderboard' : '↑ View Leaderboard'}
          </button>
        </div>

        {/* Leaderboard */}
        {showLeaderboard && (
          <div className="mt-3 sm:mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/20">
            <Leaderboard
              playerName={
                gameState.playerName && gameState.phase === 'GAMEOVER'
                  ? gameState.playerName
                  : undefined
              }
              limit={10}
            />
          </div>
        )}
      </div>

      {/* Crop Modal */}
      {showCropModal && originalImageRef.current && (
        <CropModal
          originalImage={originalImageRef.current}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          avatarSize={40}
        />
      )}
    </div>
  );
};
