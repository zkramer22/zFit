# zFit

Personal fitness tracking PWA for post-surgical hip recovery and progressive strength training.

Mobile-first, gym-first. Built for logging workouts with one hand and sweaty fingers — not for social sharing or bodybuilding aesthetics. Focused on functional movement, recovery-aware progression, and long-term athletic readiness.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite SPA, Svelte 5, sv-router, TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | PocketBase (self-hosted, SQLite-backed) |
| PWA | vite-plugin-pwa (service worker, manifest, installable) |
| Hosting | PocketBase serves the built app; Cloudflare Tunnel at zfit.ztkweb.com |

## Deploy

Merging to `main` deploys. The `Deploy` workflow builds the app and force-pushes a single commit to the `deploy` branch containing `pb_public/` (the build) and `pb_hooks/`. A broken build fails the workflow and never reaches the server.

The server's `~/zfit` is a clone of the `deploy` branch with the `pocketbase` binary and `pb_data/` beside the tracked folders. Two launchd daemons, installed by `scripts/setup-server.sh`, run as that user and start at boot without a login (FileVault is off, so a restart needs no one at the machine):

- `com.zfit.pocketbase` serves the API, admin, and app on `127.0.0.1:8080`, where cloudflared's ingress (`/etc/cloudflared/config.yml`) already points.
- `com.zfit.deploy` fetches the `deploy` branch every 60 seconds and hard-resets `~/zfit` to it. PocketBase serves new files on the next request.

The `Health check` workflow requests `/api/health` every 15 minutes; a failed run emails the owner. GitHub pauses scheduled workflows on public repos after 60 days without commits, and emails before it does.

Remote shell access goes through the same tunnel: `ssh.ztkweb.com` routes to the server's SSH, gated by a Cloudflare Access application (email one-time code). Use the browser terminal at that address, or `ssh` with `ProxyCommand cloudflared access ssh --hostname %h`.

## Development

Live data is touched only by deploys and by scripts run with `--live`. Every checkout runs against its own local copy of live, so a branch, its migration included, can be tried in the browser before it merges and deploys.

Branches run from zDev (`~/dev/me/zdev`), which reads `zdev.json`. zFit has zDev's slot 1: main's web is on `21000` and its PocketBase on `31000`, and #12's on `21012` and `31012`. In a worktree, `zdev setup <issue or PR number>` gives it those ports, labels it from GitHub and copies main's `.env` with its `PB_PORT`. A Start on the zDev page pulls a copy if the checkout has none, then runs its PocketBase and Vite. Vite runs with `--host`, so its QR code opens the branch on a phone on the home network.

- `npm run pull` replaces this checkout's copy with a fresh one from live. Live makes a backup, the pull downloads it and deletes it from the server, and swaps the copy in only once it unpacked whole. It refuses while this checkout's PocketBase runs.
- `npm run pb` serves the copy on `PB_PORT` with the repo's `pb_hooks`. Its admin is at `http://127.0.0.1:<PB_PORT>/_/`. The binary, pinned to the server's version in `scripts/pocketbase.ts`, downloads into main's `.pb/bin/` the first time.
- The app calls its own address: PocketBase serves it on live, and Vite forwards `/api` to the copy in dev.
- Scripts work on this checkout's copy, and on live only with `--live`. Each prints its target first.

Google sign-in can't return to a local address, so each pull sets `LOCAL_USER_PASSWORD` on the `LOCAL_USER_EMAIL` account in the copy. Over the network's `http://` address the phone gets the whole app but no service worker, so installing and offline use are tried on live.

`.env`, in main's checkout:

```
POCKETBASE_SUPERUSER_EMAIL=…
POCKETBASE_SUPERUSER_PASSWORD=…
LOCAL_USER_EMAIL=…
LOCAL_USER_PASSWORD=…
```

zDev adds `PB_PORT` to each checkout's `.env` when it starts it.

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

**Client-side SPA talking to PocketBase directly.** Users sign in with PocketBase auth (email/password or Google), and collection API rules scope every record to its owner. Superuser credentials live only in `.env` for the scripts in `scripts/`.

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
