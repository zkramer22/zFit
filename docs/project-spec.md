# zFit — Project Specification

Personal fitness tracking app built around post-surgical hip recovery and progressive strength training.

## Overview

A mobile-first PWA for logging workouts at the gym, managing exercise programs, tracking progression over time, and building a personal library of exercise references with video links. Designed for a single user (me) recovering from right hip posterior labral repair (Dec 2025), with goals of full functional recovery and ski-season readiness by winter 2026.

Not a social app. Not a cosmetic/bodybuilding app. Focused on functional movement, recovery-aware progression, and long-term athletic readiness.

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | **SvelteKit** | PWA with service worker, mobile-first responsive design |
| Backend | **PocketBase** | Go-based, SQLite-backed, REST API + JS SDK |
| Local cache | **Dexie.js** (IndexedDB) | Offline session logging, sync to PocketBase when online |
| Styling | **Tailwind CSS** | Utility-first, easy to iterate |
| Charts | **Chart.js** or **Layercake** (Svelte-native) | Progress visualization |
| Video embeds | **YouTube oEmbed** | Paste a URL, auto-fetch title + thumbnail, no API key needed |
| Deployment | **Home Mac** (PocketBase on local network), **Vercel** (SvelteKit, optional) | No paid hosting needed |

---

## Data Model (PocketBase Collections)

### exercises

Individual exercises in the library.

| Field | Type | Notes |
|-------|------|-------|
| id | auto | PocketBase default |
| name | text | e.g., "Leg Press", "Dead Bug" |
| description | text | Optional. Form cues, personal notes |
| muscle_groups | JSON array | e.g., ["quads", "glutes"] |
| category | select | "strength", "stability", "core", "warmup", "posterior_chain" |
| video_urls | JSON array | Array of { url, title, thumbnail } objects |
| created/updated | auto | PocketBase default |

### programs

A workout plan template (e.g., "Day 1 — Lower Body Strength + Core").

| Field | Type | Notes |
|-------|------|-------|
| id | auto | |
| name | text | e.g., "Day 1 — Lower Body Strength + Core" |
| description | text | Optional. Purpose/theme of the day |
| order | number | Display order (1, 2, 3) |
| created/updated | auto | |

### program_exercises

Join table: which exercises belong to which program, with prescribed targets.

| Field | Type | Notes |
|-------|------|-------|
| id | auto | |
| program | relation → programs | |
| exercise | relation → exercises | |
| order | number | Exercise order within the program |
| section | select | "warmup", "main", "core", "cooldown" |
| target_sets | number | Prescribed sets |
| target_reps | text | "12-15" or "30 sec" (text to handle holds) |
| target_weight | text | Optional. "20 lb KB", "bodyweight", etc. |
| notes | text | Optional. "Heels elevated", "Partial ROM only" |

### sessions

A single logged workout.

| Field | Type | Notes |
|-------|------|-------|
| id | auto | |
| program | relation → programs | Which day template was used (optional, could be freeform) |
| date | date | |
| notes | text | Overall session notes ("No pain throughout", "Felt strong") |
| duration_minutes | number | Optional |
| created/updated | auto | |

### session_entries

Individual exercise logs within a session.

| Field | Type | Notes |
|-------|------|-------|
| id | auto | |
| session | relation → sessions | |
| exercise | relation → exercises | |
| order | number | Order performed |
| sets | JSON array | Array of { reps, weight, weight_unit, duration_sec, notes } |
| rpe | number | Optional. Rate of perceived exertion (1-10) |
| pain_flag | boolean | Quick flag if something didn't feel right |
| notes | text | Optional. Per-exercise notes |

### goals

Trackable targets tied to specific exercises.

| Field | Type | Notes |
|-------|------|-------|
| id | auto | |
| exercise | relation → exercises | |
| metric | select | "weight", "reps", "hold_time", "rom" |
| target_value | number | e.g., 200 (lbs), 60 (seconds) |
| target_unit | text | "lb", "sec", "reps" |
| target_date | date | Optional deadline |
| achieved | boolean | |
| achieved_date | date | |
| notes | text | |

---

## Backend Details

### PocketBase Connection

- **URL:** `http://192.168.1.89:8090` (PocketBase runs on a separate home Mac, started with `./pocketbase serve --http 0.0.0.0:8090`)
- **SDK:** `pocketbase` npm package (`npm install pocketbase`)
- **Auth approach:** Single-user app. All collections use default "locked" API rules (superuser only). The SvelteKit app authenticates as a superuser using email/password via `pb.collection('_superusers').authWithPassword(email, password)`. Store credentials in environment variables, not in code.
- **PocketBase version:** v0.36.3 — field properties are flat on the field object (no `options` wrapper). Relations use `collectionId` and `maxSelect` at the top level of the field definition.

### JSON Field Structures

**session_entries.sets** — Array of set objects:
```json
[
  {
    "reps": 15,
    "weight": 140,
    "weight_unit": "lb",
    "duration_sec": null,
    "notes": ""
  },
  {
    "reps": 15,
    "weight": 140,
    "weight_unit": "lb",
    "duration_sec": null,
    "notes": "near failure"
  }
]
```
- `reps` and `weight` are the primary fields for strength exercises
- `duration_sec` is used for timed exercises (iso holds, planks, balance holds) where `reps` may be null
- `weight_unit` defaults to `"lb"` — support `"lb"`, `"kg"`, `"band"`, `"bw"` (bodyweight)
- Each set is logged individually to capture variance (e.g., warm-up set at 90 lb, working sets at 140 lb)

**exercises.video_urls** — Array of video reference objects:
```json
[
  {
    "url": "https://www.youtube.com/watch?v=abc123",
    "title": "How to Do Dead Bugs — Proper Form",
    "thumbnail_url": "https://img.youtube.com/vi/abc123/hqdefault.jpg"
  }
]
```
- Populated via YouTube oEmbed endpoint: `https://www.youtube.com/oembed?url={url}&format=json`
- `thumbnail_url` can also be constructed directly: `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`

---

## Key Screens / Routes

### Mobile-primary screens (gym use)

**`/log` — Quick Session Logger** ⭐ Most important screen
- Select a program day (or start freeform)
- Pre-populates exercise list from program template
- For each exercise: tap to log sets — reps, weight, and optional notes
- Minimal taps. Big touch targets. One-hand usable
- "Add exercise" for anything not in the template
- Save session when done
- Must work offline (queue to IndexedDB, sync later)

**`/log/:sessionId` — Active Session View**
- In-progress workout with current exercise highlighted
- Previous session data shown for reference ("last time: 3x15x140lb")
- Quick-add set with +/- buttons for reps and weight
- Rest timer (optional, tap to start between sets)

**`/exercises` — Exercise Library**
- Searchable/filterable list
- Tap an exercise to see description, cues, linked videos, and recent history
- "Search YouTube" button that opens YouTube search pre-filled with exercise name
- Paste video URL to add to exercise

**`/exercises/:id` — Exercise Detail**
- Name, description, muscle groups, category
- Embedded video thumbnails (tap to open YouTube)
- Progress chart for this specific exercise (weight/reps over time)
- Link to related goals

### Desktop-friendly screens (planning, review)

**`/programs` — Program Manager**
- View/edit Day 1, Day 2, Day 3 structure
- Drag to reorder exercises within a day
- Edit prescribed sets/reps/weight targets
- Add/remove exercises from a program

**`/history` — Session History**
- Calendar or list view of past sessions
- Tap to see full session detail
- Filter by program day, date range

**`/progress` — Progress Dashboard**
- Charts: weight progression per exercise over time
- Volume trends (total sets × reps × weight per session/week)
- Goal progress bars
- Body area breakdown (how much quad vs glute vs hamstring work this week)

**`/goals` — Goals Tracker**
- List of active goals with progress indicators
- Mark achieved, edit targets
- Link to relevant exercise history

---

## Offline Strategy

The gym may have poor signal. Session logging must work offline.

1. When starting a session, the app writes to **IndexedDB** (via Dexie.js) first
2. A background sync process pushes completed sessions to PocketBase when online
3. Exercise library and program data are cached locally on load and refreshed when online
4. Conflict resolution: last-write-wins is fine for single-user

---

## Video Reference System

Not building a video player or scraper. Keeping it simple:

1. On an exercise detail page, tap "Find Videos" → opens YouTube search in a new tab with exercise name pre-filled
2. Find a good video → copy URL → paste into app
3. App calls YouTube oEmbed endpoint (`https://www.youtube.com/oembed?url={url}&format=json`) to fetch title + thumbnail
4. Stores `{ url, title, thumbnail_url }` in the exercise's `video_urls` array
5. Display as clickable thumbnail cards on the exercise detail page

---

## PWA Configuration

- **Service worker** for offline caching (SvelteKit has built-in support via `@sveltejs/adapter-static` or `vite-plugin-pwa`)
- **Web app manifest** with app name, icons, theme color, `"display": "standalone"`
- **Add to Home Screen** prompt on mobile
- Should feel native-ish: no browser chrome, full-screen, smooth transitions

---

## Design Principles

- **Mobile-first, gym-first.** The logging screen is the most used screen. It must be fast, tappable, and work with one hand and sweaty fingers
- **Minimal UI.** No decoration. Clear type, high contrast, large touch targets
- **Data density on desktop.** Progress charts and planning views can be richer on larger screens
- **Recovery-aware.** Pain flags, RPE tracking, and notes are first-class — not afterthoughts
- **Progressive disclosure.** Basic logging is dead simple. Charts, goals, video library are there when you want them

---

## Phase Plan

### Phase 1 — Foundation
- [ ] Initialize SvelteKit project with Tailwind
- [ ] Configure PWA (manifest, service worker, icons)
- [ ] Set up PocketBase locally, define all collections
- [ ] PocketBase JS SDK integration in SvelteKit
- [ ] Build `/log` session logging screen (the core UX)
- [ ] Build basic `/exercises` list + detail pages

### Phase 2 — Core Features
- [ ] `/programs` — view and edit Day 1/2/3 templates
- [ ] Pre-populate session log from selected program
- [ ] "Last session" reference data shown during logging
- [ ] YouTube oEmbed video linking on exercise pages
- [ ] `/history` — session list and detail views

### Phase 3 — Progress & Goals
- [ ] `/progress` — charts (weight over time, volume trends)
- [ ] `/goals` — goal CRUD and progress tracking
- [ ] Exercise detail page progress mini-chart
- [ ] RPE and pain flag analytics (flag trends over time)

### Phase 4 — Offline & Polish
- [ ] Dexie.js IndexedDB layer for session logging
- [ ] Background sync to PocketBase
- [ ] Cache exercise/program data locally
- [ ] Rest timer between sets
- [ ] Set up PocketBase on home Mac (launchd auto-start, sleep disabled)
- [ ] SvelteKit dev server or deploy to Vercel (optional)
- [ ] Remote access via Tailscale if needed later

### Phase 5 — Future Ideas
- [ ] AI-powered progression suggestions (when to increase weight/ROM)
- [ ] Custom Go endpoints in PocketBase for analytics
- [ ] iOS widget via native wrapper (Capacitor or similar)
- [ ] Export session data as CSV/PDF
- [ ] Workout templates shareable as JSON

---

## Current Workout Program Reference

The app should ship with this initial data pre-seeded.

See separate file: `WORKOUT_PLAN.md` (the 3-day post-op recovery program)

Program structure:
- **Day 1:** Lower Body Strength + Core (bilateral machines, controlled loading)
- **Day 2:** Posterior Chain + Back (hip hinge, back extension progression, core)
- **Day 3:** Stability & Unilateral + Core (balance, single-leg, anti-rotation)

Each session starts with a PT warm-up/activation block (~10 min) that is shared across all 3 days.
