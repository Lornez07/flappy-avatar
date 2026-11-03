# Flappy Avatar

A Flappy Bird clone with two twists: your avatar is **yours** (an emoji skin or a
circular-cropped photo), and there is a **global leaderboard**.

Built with Vite + React 18 + TypeScript + Tailwind CSS v4, backed by Supabase.

## Status

Playable, with a global leaderboard when Supabase is configured. See
[Known limitations](#known-limitations) — the game is fun, the repo is honest
about what is not finished.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase credentials
npm run dev
```

Open http://localhost:5173.

Without Supabase credentials the game still runs — the leaderboard degrades to a
"not configured" message and score submission is disabled. It will not crash.

## Supabase setup

1. Create a project at https://supabase.com.
2. Run [`schema.sql`](./schema.sql) in the SQL editor. It creates the
   `leaderboards` table, indexes, RLS policies, and an anti-abuse trigger.
3. Put the project URL and **anon** key in `.env.local`:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

No storage bucket is needed — avatars are stored as small inline data URLs
(capped at 64 KB by a database constraint) alongside the score.

> Never put a `service_role` key in `.env.local`. Anything prefixed `VITE_` is
> bundled into the client and is public. Row Level Security is what protects the
> table, not the key.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check, then production build |
| `npm run typecheck` | `tsc --noEmit` (no emit, app config) |
| `npm run lint` | ESLint over `src` |
| `npm run test:run` | Vitest, single run |
| `npm test` | Vitest in watch mode |
| `npm run preview` | Serve the production build |

## Architecture

```
src/
├── App.tsx                  # Root, renders GameContainer
├── main.tsx                 # Entry point, splash screen teardown
├── components/
│   ├── GameContainer.tsx    # Orchestrator: state machine, score submission, layout
│   ├── GameCanvas.tsx       # Canvas engine: physics loop + all rendering
│   ├── CropModal.tsx        # Circular photo cropper with pan/zoom
│   ├── AvatarPicker.tsx     # Emoji skin + neon colour picker
│   └── Leaderboard.tsx      # Top scores with player-rank highlighting
├── lib/
│   ├── gameLogic.ts         # Pure collision/scoring/timing helpers (tested)
│   ├── validation.ts        # Name and score sanitisation (tested)
│   ├── supabaseClient.ts    # Lazily-created client + leaderboard queries
│   └── audio.ts             # Web Audio SFX with mute support
└── types/index.ts           # Shared interfaces and the skin/colour catalogues
```

Design notes:

- **Arcade-poster presentation.** Warm paper, ink-heavy typography, tomato-red
  accents, and tactile cards give the game a distinct visual identity.
- **Separation of concerns.** Anything that can be a pure function lives in
  `lib/gameLogic.ts` and is unit-tested; `GameCanvas.tsx` owns only the canvas
  lifecycle, mutable refs, and drawing.
- **Frame-rate independence.** Physics is scaled by a delta-time factor measured
  in 60 fps frame units, so a 30 fps or 144 fps display plays identically.
- **Graceful degradation.** The Supabase client is constructed on first use, so
  a missing environment never breaks the game.
- **High-DPI rendering.** The canvas backing store is scaled by
  `devicePixelRatio` while its CSS size stays fixed.

## Known limitations

- **Leaderboard scores are client-reported and therefore forgeable.** The
  database constraints and per-name rate limit discourage casual cheating, but
  a determined player can POST any score to the REST API. This is inherent to an
  anonymous, serverless leaderboard. If scores ever carry stakes, move validation
  into an Edge Function and require authentication.
- **Collision runs against the pipe shaft only**, not the wider cap the renderer
  draws. A near-miss on the cap lip can look like it should have counted.
- **No end-to-end tests.** Unit tests cover the pure logic; the rendering and
  Supabase paths are only covered manually.
- **The anon key in git history should be rotated** if this repository is ever
  made public. It was tracked in early commits before `.gitignore` was fixed.

## Roadmap

See [`plan.md`](./plan.md) for the original phased plan. Remaining work:
server-side score validation, end-to-end tests, and offline play.