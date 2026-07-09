# Teacher Cockpit — Checkpoint v1

**Product:** Citizen Café · Vitamin Sessions — Teacher Cockpit (streaming-mode teacher view)
**Prototype file:** `teacher-cockpit-checkpoint-v1.html`
**Source of truth:** `teacher-cockpit-v15-scale-restore-board-stability.html` (approved)
**Type:** Low-to-mid fidelity, self-contained desktop HTML prototype for product/dev review
**Status:** Checkpoint (approved snapshot) — not final UI

---

## What this is

A single, self-contained HTML prototype of the **Teacher Cockpit**: the desktop screen the teacher uses while running a live Vitamin Session in streaming mode. It explores UX, interaction models, and layout — it is **not** production code and not the final visual design.

The prototype reuses the student-app design tokens (brand yellow / charcoal, Fedra Serif Pro display font, Assistant UI font) and reuses the student practice-rooms timer components (the 96px clock, the progress ring, and the 3-2-1 "cinematic" prep) so the teacher and student experiences stay visually consistent.

---

## How to run

1. Open `teacher-cockpit-checkpoint-v1.html` in a modern desktop browser (Chrome, Edge, Safari, Firefox).
2. No build step, no server, no dependencies to install. Just open the file.
3. Internet is optional: the **Assistant** UI font loads from Google Fonts; offline it falls back to a system sans-serif. Everything else (Fedra display font, teacher/student portraits, all logic) is embedded.

### Two viewing modes

- **Board mode (default):** the cockpit renders inside a fixed 1280×820 "device" frame on the page, with a **debug control board** below it for switching states and options.
- **Presentation mode:** a full-bleed, viewport-scaled render intended as the real product preview. **Presentation mode is the visual source of truth.** Enter it with the *Presentation mode* button, or by adding `?mode=presentation` to the URL.

### URL parameters (optional deep-links)

- `?mode=presentation` — open straight into presentation mode
- `?state=basic|demo|rooms` — open in a specific state (e.g. `?state=rooms`)
- `?activity=grandma|dialogue|drill|flash` — preselect the rooms activity
- `?cp=collapsed|expanded` — Control Panel option B / A
- `?center=stage|panel` — center-zone order (stage-first / panel-first)
- `?cam=off`, `?mic=off`, `?broadcast=on`, `?rtimer=…` — preset device / rooms flags

---

## The three teaching states

1. **Basic Teaching** — teacher streams their own self-view; Control Panel with Countdown Timer, Demonstration, and Activities. No student video grid.
2. **Demonstration** — teacher + one selected student (volunteer flow → waiting → split view). `Demo → End demo` when active.
3. **Students in Rooms** — students are in breakout rooms; the lower area becomes the **Rooms Status & Control** panel. Broadcast lives here only.

The teacher always sees only their **own self-view** (plus one student during a demonstration) — never a full student grid.

---

## Control Panel: two options in one file

- **Option A — Expanded:** Timer / Demonstration / Activities exposed as visible groups (fast, but busier).
- **Option B — Collapsed (default):** a 5-button action bar — **Activities · Timer · Demo · Camera · Mic** — where the first three open a popover with their controls (cleaner). Camera/Mic are icon-only circular buttons.

Switch between them from the debug board (*Control panel* row).

---

## Modular workspace (behind "Edit layout")

Lesson Plan, Chat, and Participants are modular side panels. In normal use they are clean; toggling **Edit layout** in the header reveals direct-manipulation controls:

- **Reorder:** drag a panel by its header.
- **Resize:** drag the width handle (side edge) or height handle (bottom edge); double-click a handle to reset that dimension.
- **Collapse/expand:** chevron on Chat and Participants (Participants is collapsed by default, Chat open).
- **Reset layout:** restores the default layout only (order / sizes / collapse defaults / Option B) — it does **not** touch session, rooms, activity, running timer, chat content, or mic/camera.

The **Stage** and **Control Panel** are the fixed core and are never freely draggable; they can only swap order via *Center layout* (Stage-first ↔ Panel-first).

---

## Timers

- The single live countdown appears on the **stage**, in the student-room timer language: 3-2-1 prep (large, centered), a progress ring, final-3s red emphasis, and a clean green ✓ on completion.
- While running, the countdown sits in a **light top-right HUD** (~86px, no dark banner) with a small context caption below it, so it never covers the teacher's face. The 3-2-1 prep stays large and centered.
- **Recipe-driven:** choosing an activity sets its default duration and recipe; the teacher usually just clicks **Start**. Manual chips / Custom still override (shown as *manual override* vs *recipe default*).
- **Dialogue** runs its full recipe from a single Start: Round 1 (Partner A starts) → 30s → automatic *Switching starters* → Round 2 (Partner B starts) → 30s → return.

---

## Debug control board (board mode only)

Rows: **State**, **Control panel** (A/B), **Center layout** (Stage/Panel · Edit layout · Reset layout), **Teacher device**, **Activity (rooms)**, **Activity timer**, **Rooms**, **Rooms timer (header pill)** phase, and a **▶ Play 3-2-1** helper. These exist for review only and are not part of the product UI.

---

## Checkpoint package contents

| File | Purpose |
|---|---|
| `teacher-cockpit-checkpoint-v1.html` | The approved prototype (byte-identical to the approved source) |
| `README.md` | This overview |
| `DESIGN_DECISIONS.md` | Locked design/interaction decisions + rationale |
| `CHANGELOG.md` | Version history v02 → v15 |
| `OPEN_QUESTIONS.md` | Product/dev decisions still open |
| `VALIDATION.md` | How the file was checked + known limitations |
| `teacher-cockpit-checkpoint-v1.zip` | All of the above, zipped |

---

## Technical notes

- **Single self-contained HTML file.** Fedra Serif Pro (`@font-face`, base64) and the teacher/student portraits (data-URI JPEGs) are embedded. The UI font Assistant is the only network resource.
- **No frameworks.** Vanilla JS with a scene-driven `render()` function using string concatenation (no template literals). State lives in a single `S` object.
- **Design tokens** (`:root`): brand-yellow `#F9E24C`, brand-charcoal `#373230`, surface `#F2F1EC`, neutral `#F7F6EF`, card `#FFFFFF`, text-primary `#373230`, text-muted `#716C66`, line-subtle `#D2CEC6`, status-live `#F9746B`, on-air `#7EE07C`, radius `14px`, pill `999px`.
- **Personas:** Niv (teacher) and Dana (student) portraits; teacher name is a variable placeholder.

This is a prototype for aligning product/dev decisions before higher-fidelity implementation.
