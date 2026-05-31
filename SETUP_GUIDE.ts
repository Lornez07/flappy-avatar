/**
 * PROJECT STRUCTURE & SETUP GUIDE
 *
 * Directory layout for scalable, modular Flappy Avatar production app
 */

/*
flappy-avatar/
├── src/
│   ├── components/
│   │   ├── GameContainer.tsx      ← Main orchestrator (state machine)
│   │   ├── GameCanvas.tsx         ← Canvas rendering + physics (HIGH-DPI)
│   │   ├── AvatarUploader.tsx     ← File input + preview
│   │   ├── CropModal.tsx          ← Circular crop modal
│   │   ├── Leaderboard.tsx        ← Top scores display
│   │   └── index.ts               ← Component exports
│   │
│   ├── hooks/
│   │   ├── useGamePhysics.ts      ← Physics simulation hook (future)
│   │   ├── useLeaderboard.ts      ← Leaderboard fetch logic (future)
│   │   └── index.ts
│   │
│   ├── lib/
│   │   ├── supabaseClient.ts      ← Supabase configuration & queries
│   │   ├── physics.ts             ← Physics utility functions (future)
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── index.ts               ← All TypeScript interfaces
│   │   └── supabase.ts            ← Supabase types (auto-generated, future)
│   │
│   ├── pages/
│   │   ├── index.tsx              ← Home page (Vite/Next.js)
│   │   └── _app.tsx               ← App wrapper (Next.js only)
│   │
│   ├── App.tsx                    ← Main app component (Vite)
│   ├── main.tsx                   ← Entry point (Vite)
│   └── index.css                  ← Tailwind imports + globals
│
├── public/
│   └── (static assets)
│
├── .env.local                     ← Supabase credentials (LOCAL ONLY)
├── .env.example                   ← Template for env vars
├── vite.config.ts                 ← Vite configuration
├── tailwind.config.js             ← Tailwind configuration
├── tsconfig.json                  ← TypeScript configuration
├── package.json                   ← Dependencies
└── README.md                       ← Project documentation

KEY FILES DELIVERED:
✓ types/index.ts                  - TypeScript interfaces
✓ components/GameCanvas.tsx       - High-DPI physics rendering
✓ components/AvatarUploader.tsx   - File input handler
✓ components/CropModal.tsx        - Circular crop editor
✓ components/Leaderboard.tsx      - Leaderboard display
✓ components/GameContainer.tsx    - State machine orchestrator
✓ lib/supabaseClient.ts           - Supabase queries & upload
✓ schema.sql                       - Database DDL + RLS policies
*/

// ============================================================================
// SETUP INSTRUCTIONS FOR NEXT.JS/VITE
// ============================================================================

/**
 * STEP 1: Initialize Project
 * 
 * For Vite:
 *   npm create vite@latest flappy-avatar -- --template react-ts
 *   cd flappy-avatar
 * 
 * For Next.js:
 *   npx create-next-app@latest flappy-avatar --typescript --tailwind
 *   cd flappy-avatar
 */

/**
 * STEP 2: Install Dependencies
 * 
 *   npm install @supabase/supabase-js
 *   npm install -D tailwindcss postcss autoprefixer
 * 
 * For Vite, run:
 *   npx tailwindcss init -p
 */

/**
 * STEP 3: Configure Tailwind CSS
 * 
 * tailwind.config.js:
 *   export default {
 *     content: ['./index.html', './src/**\/*.{js,ts,jsx,tsx}'],
 *     theme: { extend: {} },
 *     plugins: [],
 *   }
 * 
 * src/index.css:
 *   @tailwind base;
 *   @tailwind components;
 *   @tailwind utilities;
 */

/**
 * STEP 4: Create Supabase Project
 * 
 * 1. Go to https://supabase.com
 * 2. Create new project (Free tier works!)
 * 3. In SQL Editor, run schema.sql
 * 4. Go to Storage > Buckets, create new bucket named "avatars"
 * 5. Make bucket PUBLIC
 * 6. Set CORS policy (see schema.sql comments)
 * 7. Get API URL and ANON KEY from Settings > API
 */

/**
 * STEP 5: Environment Variables
 * 
 * .env.local:
 *   VITE_SUPABASE_URL=https://your-project.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your-anon-key-here
 */

/**
 * STEP 6: Create Component Structure
 * 
 * Copy provided components into src/components/
 * Copy types into src/types/
 * Copy supabaseClient.ts into src/lib/
 */

/**
 * STEP 7: Use GameContainer in Main App
 * 
 * src/App.tsx (Vite):
 *   import { GameContainer } from './components/GameContainer';
 * 
 *   export default function App() {
 *     return <GameContainer />;
 *   }
 * 
 * src/pages/index.tsx (Next.js):
 *   import { GameContainer } from '../components/GameContainer';
 * 
 *   export default function Home() {
 *     return <GameContainer />;
 *   }
 */

/**
 * STEP 8: Run Development Server
 * 
 * Vite:
 *   npm run dev
 * 
 * Next.js:
 *   npm run dev
 * 
 * Open http://localhost:5173 (Vite) or http://localhost:3000 (Next.js)
 */

// ============================================================================
// PHYSICS IMPROVEMENTS IMPLEMENTED
// ============================================================================

/**
 * 1. ROTATIONAL PHYSICS
 *    - Player.rotation: -20° on flap, +70° max during freefall
 *    - Smooth interpolation via lerp() function
 *    - Rotation velocity influences avatar tilt
 * 
 * 2. HIGH-DPI SUPPORT
 *    - Canvas rendered at devicePixelRatio resolution
 *    - CSS size independent from render size
 *    - Automatic Retina/4K scaling
 * 
 * 3. COLLISION DETECTION
 *    - Circle-based player hitbox (accurate for circular avatar)
 *    - Rectangle-based pipes
 *    - Precise circle-rect collision math
 * 
 * 4. STATE-DRIVEN RENDERING
 *    - Game loop runs only during PLAYING phase
 *    - requestAnimationFrame for smooth 60fps
 *    - No redundant renders
 */

// ============================================================================
// PERFORMANCE OPTIMIZATIONS
// ============================================================================

/**
 * CURRENT:
 * - Canvas context scaled for DPI at init time
 * - Image smoothing enabled for quality
 * - Efficient collision detection (early exit)
 * - Minimal DOM updates (ref-based game state)
 * 
 * FUTURE OPPORTUNITIES:
 * - Sprite pooling for pipes (object reuse)
 * - OffscreenCanvas for background rendering
 * - Web Workers for physics calculations
 * - Canvas texture atlasing
 * - Particle system pooling for effects
 */

// ============================================================================
// SUPABASE FEATURES IMPLEMENTED
// ============================================================================

/**
 * 1. AVATAR STORAGE
 *    ✓ Upload cropped canvas to public bucket
 *    ✓ Get public URL automatically
 *    ✓ CORS-enabled for web use
 * 
 * 2. LEADERBOARD DATABASE
 *    ✓ Global high scores table
 *    ✓ Per-player queries
 *    ✓ Indexed for fast queries
 *    ✓ Row-level security (RLS) enabled
 * 
 * 3. REAL-TIME CAPABILITIES
 *    ✓ Can subscribe to leaderboard changes
 *    ✓ Realtime score updates (add to Leaderboard.tsx)
 * 
 * 4. BACKUP & SCALING
 *    ✓ Supabase handles backups
 *    ✓ Free tier: 1GB storage, unlimited API calls
 *    ✓ Auto-scales to paid tier as needed
 */

// ============================================================================
// TESTING & QA CHECKLIST
// ============================================================================

/**
 * FUNCTIONALITY:
 * [ ] Upload image -> crop -> confirm -> game starts
 * [ ] SPACE key to flap (works in-game)
 * [ ] Click canvas to flap
 * [ ] Pipes generate with random gaps
 * [ ] Score increments when passing pipe
 * [ ] Collision detection (hit pipe or boundary = game over)
 * [ ] Avatar rotation smooth (tilt on flap, fall rotation)
 * 
 * LEADERBOARD:
 * [ ] Submit score with player name
 * [ ] Avatar uploads to Supabase Storage
 * [ ] Score appears in leaderboard
 * [ ] Top 10 scores display correctly
 * [ ] Player rank highlighted if applicable
 * 
 * HIGH-DPI:
 * [ ] Game renders sharp on Retina (cmd+alt+i > scales)
 * [ ] Canvas doesn't pixelate
 * [ ] Works on mobile (test on real device)
 * 
 * EDGE CASES:
 * [ ] Network error during upload (retry logic)
 * [ ] Long player name (truncate to 50 chars)
 * [ ] Invalid image format
 * [ ] Multiple rapid clicks
 */
