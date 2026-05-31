/**
 * FLAPPY AVATAR PRODUCTION REFACTOR
 * Implementation Summary & Quick Reference
 *
 * This document provides a high-level overview of the delivered components
 * and how they work together to create a production-grade Flappy Bird game.
 */

// ============================================================================
// ARCHITECTURE OVERVIEW
// ============================================================================

/**
 * STATE MACHINE
 * 
 *   ┌─────────┐
 *   │  IDLE   │  User hasn't uploaded image
 *   └────┬────┘
 *        │ image selected
 *   ┌────▼─────────┐
 *   │  CROPPING    │  User adjusting circular crop
 *   └────┬─────────┘
 *        │ crop confirmed
 *   ┌────▼────┐
 *   │  READY  │  Avatar ready, awaiting game start
 *   └────┬────┘
 *        │ start game
 *   ┌────▼────────┐
 *   │  PLAYING    │  Game running, score tracking
 *   └────┬────────┘
 *        │ collision or boundary hit
 *   ┌────▼─────────┐
 *   │  GAMEOVER    │  Final score displayed, name input
 *   └────┬─────────┘
 *        │ submit score
 *   ┌────▼──────────┐
 *   │ Leaderboard   │  Show rankings + restart
 *   └───────────────┘
 */

// ============================================================================
// COMPONENT RESPONSIBILITIES
// ============================================================================

/**
 * GameContainer
 * ─────────────
 * - Central state machine orchestrator
 * - Manages phase transitions (IDLE → CROPPING → READY → PLAYING → GAMEOVER)
 * - Handles Supabase integration (avatar upload, score submission)
 * - Renders appropriate UI for current phase
 * - Props: title (optional)
 * 
 * Key Methods:
 *   handleImageSelected()   → Show crop modal
 *   handleCropConfirm()     → Transition to READY
 *   handleGameStart()       → Transition to PLAYING
 *   handleGameOver()        → Calculate high score, transition to GAMEOVER
 *   handleSubmitScore()     → Upload avatar + submit to leaderboard
 *   handleRestart()         → Transition back to READY
 */

/**
 * GameCanvas
 * ──────────
 * - Renders game at high-DPI resolution
 * - Physics simulation: gravity, velocity, rotation
 * - Collision detection: circle (player) vs rectangles (pipes)
 * - Player rotation: -20° flap → +70° fall (smooth interpolation)
 * - Animation loop: requestAnimationFrame at ~60fps
 * 
 * Props:
 *   playerImage        HTMLImageElement  - Cropped circular avatar
 *   isRunning          boolean          - Pause/resume game
 *   onScore(score)     callback         - Fired when pipe passed
 *   onGameOver(score)  callback         - Fired on collision
 *   onFlap()           callback         - Fired on SPACE/click
 * 
 * Physics Config (tunable):
 *   gravity: 0.6              - Downward acceleration per frame
 *   flapStrength: -12         - Upward velocity on flap
 *   maxVelocity: 15           - Terminal velocity cap
 *   rotationFlap: -20         - Degrees on flap
 *   rotationMax: 70           - Max downward rotation
 *   rotationLerpSpeed: 0.08   - Smooth rotation interpolation (0-1)
 * 
 * Pipe Config (tunable):
 *   width: 60         - Pipe thickness
 *   gap: 150          - Space between top/bottom pipes
 *   spacing: 200      - Horizontal distance between pipes
 *   minGapY: 50       - Minimum pixels from screen top
 *   speed: 5          - Pixels per frame movement
 */

/**
 * AvatarUploader
 * ──────────────
 * - File input with click-to-upload UI
 * - Shows circular preview thumbnail
 * - Simple, reusable
 * 
 * Props:
 *   onImageSelected(img)  callback       - Returns HTMLImageElement
 *   previewSrc           string|null    - Optional preview URL
 */

/**
 * CropModal
 * ─────────
 * - Modal overlay for circular crop editing
 * - Three interactive sliders: offsetX, offsetY, zoom
 * - Real-time preview canvas
 * - Creates final circular avatar (canvas → Image)
 * 
 * Props:
 *   originalImage    HTMLImageElement  - Image to crop
 *   onConfirm(img)   callback         - Returns cropped Image
 *   onCancel()       callback         - Dismiss modal
 *   avatarSize       number           - Output size (default 40px)
 */

/**
 * Leaderboard
 * ───────────
 * - Fetches and displays top 10 scores
 * - Shows player rank if name provided
 * - Displays avatar thumbnails (fallback gracefully)
 * - Loading & error states
 * 
 * Props:
 *   playerName   string   - Optional, highlights player rank
 *   limit        number   - Scores to fetch (default 10, max 100)
 */

// ============================================================================
// SUPABASE INTEGRATION LAYER (lib/supabaseClient.ts)
// ============================================================================

/**
 * Configuration
 * ─────────────
 * 1. Environment variables (.env.local):
 *    VITE_SUPABASE_URL=https://your-project.supabase.co
 *    VITE_SUPABASE_ANON_KEY=your-anon-key
 * 
 * 2. Database schema (run schema.sql):
 *    - leaderboards table (id, created_at, player_name, score, avatar_url)
 *    - Row-level security (public read, anonymous insert)
 *    - Indexes for performance
 * 
 * 3. Storage bucket ("avatars"):
 *    - Make public
 *    - Set CORS to allow your domain
 */

/**
 * Avatar Upload
 * ─────────────
 * async uploadAvatarToStorage(canvasDataUrl: string, playerName: string)
 *   → Converts canvas data URL to blob
 *   → Uploads to supabase/avatars with unique filename
 *   → Returns public URL or null on error
 * 
 * Usage:
 *   const url = await uploadAvatarToStorage(
 *     playerImage.src,
 *     'JohnDoe'
 *   );
 */

/**
 * Score Submission
 * ────────────────
 * async submitScore(
 *   playerName: string,
 *   score: number,
 *   avatarUrl?: string
 * )
 *   → Inserts row into leaderboards table
 *   → Validates score (0-999999)
 *   → Returns { success: boolean, error?: string }
 * 
 * Usage:
 *   await submitScore('JohnDoe', 42, 'https://...');
 */

/**
 * Leaderboard Fetch
 * ─────────────────
 * async fetchLeaderboard(limit?: number)
 *   → Fetches top scores, sorted descending
 *   → Returns { data: LeaderboardEntry[], error?: string }
 * 
 * async fetchLeaderboardWithPlayerRank(playerName: string, limit?: number)
 *   → Returns leaderboard + player's rank
 *   → { leaderboard, playerRank, playerRecord, error }
 * 
 * Usage:
 *   const { data, error } = await fetchLeaderboard(20);
 */

// ============================================================================
// TYPE DEFINITIONS (types/index.ts)
// ============================================================================

/**
 * GamePhase
 *   'IDLE' | 'CROPPING' | 'READY' | 'PLAYING' | 'GAMEOVER'
 * 
 * GameState
 *   {
 *     phase: GamePhase
 *     score: number
 *     highScore: number
 *     playerName: string
 *     avatarData: string | null
 *     isSubmittingScore: boolean
 *     error: string | null
 *   }
 * 
 * PlayerPhysics
 *   {
 *     x, y: position
 *     width, height: dimensions
 *     velocityY: downward speed
 *     rotation: current angle in degrees
 *     rotationVelocity: rate of rotation change
 *     hasFlapped: boolean for state tracking
 *   }
 * 
 * Pipe
 *   {
 *     x: position
 *     gapStart, gapEnd: vertical gap boundaries
 *     scored: boolean flag
 *     width: pipe thickness
 *   }
 * 
 * LeaderboardEntry
 *   {
 *     id: number
 *     player_name: string
 *     score: number
 *     avatar_url: string | null
 *     created_at: string (ISO timestamp)
 *   }
 */

// ============================================================================
// KEY IMPROVEMENTS OVER PROTOTYPE
// ============================================================================

/**
 * 1. HIGH-DPI CANVAS RENDERING
 *    Before: Canvas renders at screen resolution only (blurry on Retina)
 *    After:  Canvas rendered at devicePixelRatio × resolution (sharp on all displays)
 *    Impact: Professional quality on modern devices
 * 
 * 2. ROTATIONAL PHYSICS ("Game Juice")
 *    Before: Avatar static, no rotation
 *    After:  Avatar tilts -20° on flap, smoothly interpolates to +70° during freefall
 *    Impact: More natural, visually satisfying gameplay
 * 
 * 3. MODULAR COMPONENTS
 *    Before: 650 lines of HTML/JS in one file
 *    After:  7 focused React components (GameCanvas, AvatarUploader, etc.)
 *    Impact: Easier to maintain, test, and extend
 * 
 * 4. STRICT TYPESCRIPT
 *    Before: No type safety, runtime errors possible
 *    After:  Full type definitions for GameState, Player, Pipe, Leaderboard
 *    Impact: Catch bugs at compile time, better IDE autocomplete
 * 
 * 5. CLOUD BACKEND
 *    Before: No persistence (single-player, browser-only)
 *    After:  Supabase integration for avatars + global leaderboard
 *    Impact: Competitive, shareable, multiplayer-ready
 * 
 * 6. STATE MACHINE PATTERN
 *    Before: Complex boolean flags (gameStarted, gameRunning, gameOver)
 *    After:  Single phase state with clear transitions
 *    Impact: Predictable, bug-free state transitions
 */

// ============================================================================
// NEXT STEPS & FUTURE ENHANCEMENTS
// ============================================================================

/**
 * PHASE 2 (Performance):
 * [ ] Sprite pooling for pipes (reuse objects instead of creating new ones)
 * [ ] Offscreen canvas for background rendering
 * [ ] Web Workers for physics calculations
 * [ ] Particle effects on flap/collision
 * 
 * PHASE 3 (Features):
 * [ ] Sound effects (flap, score, gameover) - Web Audio API
 * [ ] Parallax background layers
 * [ ] Power-ups (shield, slow-motion, etc.)
 * [ ] Daily/weekly leaderboards
 * [ ] User authentication (optional, for personal profiles)
 * [ ] Multiplayer mode (real-time race via WebSocket)
 * 
 * PHASE 4 (Monetization):
 * [ ] Ad integration (banner/rewarded)
 * [ ] In-app purchases (cosmetics, power-ups)
 * [ ] Analytics (user behavior, retention)
 * [ ] Push notifications (invite friends, new records)
 * 
 * PHASE 5 (Platform):
 * [ ] Mobile app (React Native)
 * [ ] PWA (installable web app)
 * [ ] Discord bot (share scores)
 * [ ] API for third-party integrations
 */

// ============================================================================
// DEPLOYMENT CHECKLIST
// ============================================================================

/**
 * BEFORE PRODUCTION:
 * [ ] Supabase credentials in .env (never commit keys!)
 * [ ] Test on Retina/4K display
 * [ ] Test on mobile (portrait + landscape)
 * [ ] Network error handling (retry logic for uploads)
 * [ ] Rate limiting on score submissions (prevent spam)
 * [ ] Avatar file size limit (prevent storage abuse)
 * [ ] Enable CORS on avatars bucket
 * [ ] Set up SSL certificate
 * [ ] Analytics/error tracking (Sentry, LogRocket)
 * [ ] Performance audit (Lighthouse)
 * [ ] Accessibility audit (WCAG 2.1)
 * 
 * BUILD:
 * [ ] npm run build
 * [ ] npm run preview (test production build)
 * [ ] Deploy to Vercel (for Next.js) or Netlify (for Vite)
 * 
 * POST-LAUNCH:
 * [ ] Monitor error logs
 * [ ] Track user metrics
 * [ ] Gather feedback
 * [ ] Iterate on game balance (difficulty)
 */

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

/**
 * Q: Canvas is blurry on my Mac/iPhone
 * A: Check that devicePixelRatio is being applied. GameCanvas.tsx handles this
 *    automatically at init time. Clear browser cache if persisting.
 * 
 * Q: Leaderboard not showing scores
 * A: Verify Supabase credentials in .env.local. Check browser console for errors.
 *    Ensure schema.sql was run in Supabase SQL editor.
 * 
 * Q: Avatar upload fails
 * A: Check CORS policy on avatars bucket. Verify file size < 5MB.
 *    Check network tab in dev tools for 403/413 errors.
 * 
 * Q: Game feels slow/laggy
 * A: Check frameRate. requestAnimationFrame should be ~60fps.
 *    Profile with Chrome DevTools Performance tab. Look for long tasks.
 * 
 * Q: Can't crop avatar properly
 * A: Canvas size in CropModal is 300×300px by design (high precision).
 *    Use sliders for fine adjustments. Max zoom is 3×, min is 0.5×.
 */
