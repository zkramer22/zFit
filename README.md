# zFit

Personal fitness tracking PWA for post-surgical hip recovery and progressive strength training.

Mobile-first, gym-first. Built for logging workouts with one hand and sweaty fingers — not for social sharing or bodybuilding aesthetics. Focused on functional movement, recovery-aware progression, and long-term athletic readiness.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit v2, Svelte 5, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | PocketBase (self-hosted, SQLite-backed) |
| PWA | @vite-pwa/sveltekit (service worker, manifest, installable) |
| Runtime | adapter-node (SSR, server-side PB auth) |

## Getting Started

### Prerequisites

- Node.js 20+
- PocketBase running on your network with all collections created (see [Data Model](#data-model))

### Setup

```bash
npm install
```

Create a `.env` file in the project root:

```
POCKETBASE_URL=http://192.168.1.89:8090
POCKETBASE_SUPERUSER_EMAIL=your-email
POCKETBASE_SUPERUSER_PASSWORD=your-password
```

### Seed Data

Populates PocketBase with all exercises (23), programs (3 day split), and program_exercises (36 join records) from the gym plan. Idempotent — safe to run multiple times.

```bash
npm run seed
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173`. The root `/` redirects to `/log`.

### Build

```bash
npm run build
npm run preview
```

## Routes

### Phase 1 (current)

| Route | Description |
|-------|-------------|
| `/log` | Program picker — tap a day to start a session |
| `/log/[sessionId]` | Active session logger — the core UX |
| `/exercises` | Searchable/filterable exercise library |
| `/exercises/[id]` | Exercise detail with recent history |
| `/more` | Placeholder for settings/history |

### Planned

| Route | Phase | Description |
|-------|-------|-------------|
| `/programs` | 2 | View/edit program templates |
| `/history` | 2 | Session history list + detail |
| `/progress` | 3 | Charts — weight/volume over time |
| `/goals` | 3 | Goal tracking with progress bars |

## Architecture

**SSR with server-side PocketBase auth.** All PB calls happen in `+page.server.ts` and `+server.ts` files — superuser credentials never reach the browser. The only client-side fetch is the auto-save PATCH for real-time set logging during an active session.

**Svelte 5 runes only.** Reactive state uses `$state`, `$derived`, `$effect` in `.svelte.ts` files. No legacy stores.

**Tailwind v4 CSS-first config.** Theme defined in `@theme` block in `src/app.css`. No `tailwind.config.js`.

## Data Model

Seven PocketBase collections:

- **exercises** — name, description, muscle_groups (select), category (select), video_urls (JSON)
- **programs** — name, description, display order
- **program_exercises** — join table with prescribed sets/reps/weight/section/order
- **sessions** — a logged workout linked to a program
- **session_entries** — per-exercise log with sets (JSON array of {reps, weight, weight_unit, duration_sec, notes}), RPE, pain_flag
- **goals** — exercise-specific targets (weight, reps, hold_time, rom)

See `docs/project-spec.md` for full field definitions.

## Project Structure

```
src/
  app.css                               Tailwind v4 theme
  app.html                              HTML shell with PWA meta
  hooks.server.ts                       Server middleware
  lib/
    pocketbase/client.ts                PB singleton + superuser auth
    pocketbase/types.ts                 TypeScript interfaces for all collections
    components/ui/Button.svelte         Shared button component
    components/ui/NumberStepper.svelte   +/- stepper (48px touch targets)
    components/log/ExerciseCard.svelte  Exercise card with sets, RPE, pain flag
    components/log/SetRow.svelte        Single set: weight + reps steppers
    components/log/SessionHeader.svelte Sticky header with finish button
    stores/session.svelte.ts            Active session state (Svelte 5 runes)
  routes/
    +layout.svelte                      Root layout + bottom/top nav
    +page.server.ts                     Redirect / → /log
    log/+page.svelte                    Program picker
    log/[sessionId]/+page.svelte        Active session logger
    log/[sessionId]/+server.ts          PATCH endpoint for auto-save
    exercises/+page.svelte              Exercise list with search/filter
    exercises/[id]/+page.svelte         Exercise detail + history
    more/+page.svelte                   Placeholder
scripts/
  seed.ts                               PocketBase seed script
docs/
  project-spec.md                       Full project specification
  gym-plan-v1.md                        3-day post-op recovery program
```

## Workout Program

Three-day split for post-surgical hip recovery (right hip posterior labral repair). Every session follows the same template:

1. **PT Warm-Up / Activation** (~10 min) — banded clamshells, fire hydrants, monster walks, leg lifts, balance holds
2. **Main Block** (~35-40 min)
3. **Cooldown** (~5 min)

| Day | Focus |
|-----|-------|
| Day 1 | Lower Body Strength + Core — bilateral machines, controlled loading |
| Day 2 | Posterior Chain + Back — hip hinge, back extension progression |
| Day 3 | Stability & Unilateral + Core — balance, single-leg, anti-rotation |

## Phase Roadmap

- [x] **Phase 1** — Scaffold, PB integration, session logger, exercise library
- [ ] **Phase 2** — Program editor, last-session reference, YouTube video linking, session history
- [ ] **Phase 3** — Progress charts, goals tracking, RPE/pain analytics
- [ ] **Phase 4** — Offline-first (Dexie.js + IndexedDB), background sync, rest timer
- [ ] **Phase 5** — AI progression suggestions, data export, iOS wrapper
