/**
 * PROJECT DIRECTORY STRUCTURE & FILE MAPPING
 *
 * Copy files from session folder into your new project
 */

/*
RECOMMENDED DIRECTORY LAYOUT (Vite + React + TypeScript):

flappy-avatar-production/
│
├── src/
│   ├── components/
│   │   ├── index.ts                    ← Export all components
│   │   ├── GameContainer.tsx           ✓ COPY FROM: GameContainer.tsx
│   │   ├── GameCanvas.tsx              ✓ COPY FROM: GameCanvas.tsx
│   │   ├── AvatarUploader.tsx          ✓ COPY FROM: AvatarUploader.tsx
│   │   ├── CropModal.tsx               ✓ COPY FROM: CropModal.tsx
│   │   ├── Leaderboard.tsx             ✓ COPY FROM: Leaderboard.tsx
│   │   └── StatusDisplay.tsx           (future enhancement)
│   │
│   ├── hooks/
│   │   ├── useGamePhysics.ts           (future: extract physics logic)
│   │   ├── useLeaderboard.ts           (future: extract fetch logic)
│   │   └── index.ts
│   │
│   ├── lib/
│   │   ├── supabaseClient.ts           ✓ COPY FROM: supabaseClient.ts
│   │   ├── physics.ts                  (future: utility functions)
│   │   ├── canvas.ts                   (future: canvas utilities)
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── index.ts                    ✓ COPY FROM: types.ts
│   │   └── supabase.ts                 (auto-generated: npx supabase gen types)
│   │
│   ├── pages/
│   │   └── (Next.js only)
│   │
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
│
├── public/
│   ├── index.html
│   └── (static assets)
│
├── database/
│   └── schema.sql                      ✓ COPY FROM: schema.sql
│
├── .env.example
├── .env.local                          ← Add your Supabase credentials
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── README.md

---

ALTERNATIVE LAYOUT (Next.js):

flappy-avatar-production/
├── src/
│   ├── app/
│   │   ├── page.tsx                    ← Renders GameContainer
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── GameContainer.tsx           ✓ COPY
│   │   ├── GameCanvas.tsx              ✓ COPY
│   │   ├── AvatarUploader.tsx          ✓ COPY
│   │   ├── CropModal.tsx               ✓ COPY
│   │   └── Leaderboard.tsx             ✓ COPY
│   ├── lib/
│   │   ├── supabaseClient.ts           ✓ COPY
│   │   └── index.ts
│   └── types/
│       └── index.ts                    ✓ COPY
├── database/
│   └── schema.sql                      ✓ COPY
├── .env.local
├── .env.example
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
└── postcss.config.js

---

FILE COPY CHECKLIST:

COMPONENTS (6 files):
[ ] GameContainer.tsx      → src/components/
[ ] GameCanvas.tsx         → src/components/
[ ] AvatarUploader.tsx     → src/components/
[ ] CropModal.tsx          → src/components/
[ ] Leaderboard.tsx        → src/components/

CORE LOGIC (2 files):
[ ] types.ts               → src/types/index.ts
[ ] supabaseClient.ts      → src/lib/

DATABASE (1 file):
[ ] schema.sql             → database/schema.sql or keep as reference

UTILITIES (1 file):
[ ] plan.md                → Root (project reference)

TOTAL: 9 core files, ~50KB of TypeScript/React code

---

STEP-BY-STEP SETUP:

1. INITIALIZE VITE PROJECT
   $ npm create vite@latest flappy-avatar -- --template react-ts
   $ cd flappy-avatar

2. INSTALL DEPENDENCIES
   $ npm install
   $ npm install @supabase/supabase-js
   $ npm install -D tailwindcss postcss autoprefixer
   $ npx tailwindcss init -p

3. CREATE DIRECTORY STRUCTURE
   $ mkdir -p src/components
   $ mkdir -p src/lib
   $ mkdir -p src/types
   $ mkdir -p database

4. COPY FILES
   Copy from session folder:
   → types.ts                 to src/types/index.ts
   → GameContainer.tsx        to src/components/
   → GameCanvas.tsx           to src/components/
   → AvatarUploader.tsx       to src/components/
   → CropModal.tsx            to src/components/
   → Leaderboard.tsx          to src/components/
   → supabaseClient.ts        to src/lib/
   → schema.sql               to database/

5. CREATE COMPONENT INDEX
   File: src/components/index.ts
   ─────────────────────────────
   export { GameContainer } from './GameContainer';
   export { GameCanvas } from './GameCanvas';
   export { AvatarUploader } from './AvatarUploader';
   export { CropModal } from './CropModal';
   export { Leaderboard } from './Leaderboard';

6. UPDATE src/App.tsx
   ───────────────────
   import { GameContainer } from './components';
   
   function App() {
     return <GameContainer />;
   }
   
   export default App;

7. UPDATE src/index.css
   ──────────────────────
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   
   * {
     margin: 0;
     padding: 0;
     box-sizing: border-box;
   }
   
   body {
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
   }

8. CONFIGURE TAILWIND
   File: tailwind.config.js
   ────────────────────────
   export default {
     content: ['./index.html', './src/**\/*.{js,ts,jsx,tsx}'],
     theme: { extend: {} },
     plugins: [],
   };

9. CREATE .env.local
   ──────────────────
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here

10. CREATE .env.example
    ────────────────────
    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-key-here

11. UPDATE .gitignore
    ──────────────────
    .env
    .env.local
    .env.*.local
    node_modules/
    dist/
    .DS_Store

12. RUN DEVELOPMENT SERVER
    $ npm run dev
    Open: http://localhost:5173

13. CREATE SUPABASE PROJECT
    → supabase.com
    → Create new project
    → SQL Editor → Run schema.sql
    → Storage → Create "avatars" bucket
    → Settings → API → Copy credentials

14. BUILD FOR PRODUCTION
    $ npm run build
    $ npm run preview

---

IMPORT PATHS & USAGE:

In any component:
   import { GameContainer } from '@/components';
   import type { GameState, PlayerPhysics } from '@/types';
   import { submitScore } from '@/lib/supabaseClient';

Path aliases (tsconfig.json):
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }

---

EXPECTED FILE SIZES:

Component bundles (development):
  GameContainer.tsx      ~12 KB
  GameCanvas.tsx         ~11 KB
  CropModal.tsx          ~7.7 KB
  Leaderboard.tsx        ~3.7 KB
  AvatarUploader.tsx     ~1.7 KB
  supabaseClient.ts      ~6.7 KB
  ─────────────────────────────
  Total before bundling: ~42 KB
  After gzip: ~12-15 KB

Production bundle (Vite):
  ~150-200 KB (gzipped, including React + Supabase SDK)

---

TROUBLESHOOTING SETUP:

ERROR: "Cannot find module '@supabase/supabase-js'"
FIX:   npm install @supabase/supabase-js

ERROR: "Tailwind classes not applying"
FIX:   Check tailwind.config.js content paths
       Restart dev server
       Check @tailwind imports in index.css

ERROR: "GameCanvas is not exported"
FIX:   Verify GameCanvas.tsx is in src/components/
       Check src/components/index.ts exports it

ERROR: "devicePixelRatio is undefined"
FIX:   window.devicePixelRatio is always defined
       Check browser console for other errors

ERROR: Supabase connection fails
FIX:   Check .env.local has correct credentials
       Verify VITE_ prefix on env variables
       Check Supabase project is running
       Test with: curl $VITE_SUPABASE_URL

ERROR: TypeScript compilation errors
FIX:   npm install @types/react @types/react-dom
       Verify tsconfig.json extends vite's config
       Restart TypeScript server in IDE
*/

export {};
