# Student Practice Rooms — Desktop · Checkpoint

**Checkpoint name:** `student-practice-rooms-desktop-v1-checkpoint`
**File:** `student-practice-rooms-desktop-v21.html`
**MD5:** `a02b8078c64096dc31df3c2f1b5702bc`
**Size:** 741,435 bytes
**Frozen at:** v21

> ⚠️ **Naming note.** This checkpoint carries the same folder name as the earlier
> checkpoint that was cut from **v9**. It is a *re-issue* of that name with v21
> content. If the v9 package is still referenced anywhere, archive or rename it
> before dropping this one in, or you will overwrite it.

---

## 1. What this checkpoint covers

The **Student Practice Rooms — Desktop** prototype: everything a student sees
after the teacher sends the class into practice rooms, up to the moment they
return to the Main Room.

It is a **single standalone HTML file**. No build step, no dependencies to
install. Open it in a browser and it runs. The only external request is the
Lottie player from a CDN (`bodymovin 5.12.2`); all other assets — the licensed
**FedraSerifPro** font, the matkot animation JSON, the portrait JPEGs and the
Spark/reaction SVGs — are embedded as base64 inside the file.

Two viewing modes:

- **Debug / review mode** (default) — the prototype sits in a 1280×760 frame with
  a full control panel above it and design notes below it.
- **Presentation mode** — `Presentation mode` button (top right), or append
  `?mode=presentation` to the URL. The frame goes full-viewport.

Deep-linkable via query params: `scene`, `activity`, `vb`, `width`, `roomPhase`,
`enforceTarget`, `transVariant`, `bcast=on`, and `start=1` to auto-run an activity.

### Not in this file

Teacher Cockpit, Student Main Classroom, mobile, and the practice primitives all
live in separate files and were **never touched** by any pass that produced this
checkpoint.

---

## 2. Main states

### Scenes

| Scene | What it is |
| --- | --- |
| `duo` | Duo / Couples Room — the split-view practice room. The default. |
| `consent` | Pre-room camera & mic consent (Yes / No, ~10s auto-decline) |
| `enforce` | The student turned their **own** camera or mic off — “Leave the practice room?” popup |
| `partnerleft` | The partner left / went unavailable |
| `wait` | Waiting / return-to-main-room — branded matkot transition + synchronised room countdown |
| `report` | Leave & report → the dedicated report screen |
| `trans` | Short transition (matkot), solo variant |
| `solo` | Solo Room — independent practice placeholder |
| `return` | “Time’s up — heading back to class” |

### Activity states

Every activity moves through the same four-state engine:

`idle` → `prepared` → `running` → `done`

- **prepared** — the activity is selected but the timer has **not** started. The
  room shows a calm *“Waiting for your teacher to start”* pill. No frame, no timer.
- **running** — steps: `prep` (5s countdown) · `turn` · `trans` / `break` · `round`
- **done** — the branded Done badge, then either a return flow (Dialogue) or a wait
  for the teacher to start another set.

### Tile states

Default · yellow active-turn frame · turn chip (`Your turn` / `Dana’s turn`) ·
camera off · mic off · brief START chip on the first second of a turn.

---

## 3. Main behaviors

### Activities are teacher-triggered

Selecting an activity only **prepares** it. The timer starts only on a simulated
Teacher Cockpit **Start timer** event (the instruction is assumed to have been
broadcast and recorded first). Nothing auto-starts on room entry.

| Activity | Recipe |
| --- | --- |
| **Timed round** | 5s prep → 30s round → Done |
| **Dialogue** | 5s prep → You 20s → 5s transition → Dana 20s → Done → return flow |
| **Intensive Exercise** | 5s prep → You 10s → 5s transition → Dana 10s → Done. Another set is a **manual** teacher action. |
| **Operation Grandma** | 5s prep → R1/You → R1/Dana → **5s break** → R2/You → R2/Dana → Done. **One full set runs automatically** — the teacher does not start Round 2 inside a set. |
| **Carousel** | 5s prep → You 20s → 5s transition → Dana 20s → Done. A central cue card shows a masculine / feminine / plural silhouette that **switches every 5s** during a turn. Visual only — no text labels, no explanatory copy. |

The **5-second prep countdown** replaced the old 3-2-1 everywhere. The yellow focus
frame is on from the **first countdown tick** — there is no green pulse and no green
handoff anywhere in the file.

### The activity timer

- **Fill-forward model:** charcoal track → brand-yellow progress fills it → the
  **final 5 seconds** re-colour the progress arc and the moving ball to coral
  `#F9746B`. The track and the number stay charcoal. This is a warning state, not
  an error state.
- Geometry (64 viewBox): band r 26.5 · one stroke weight of **1.4** for the track,
  the arc and the ball · ball fill r **4.6** (6.6× the arc’s half-width), painted
  last, so the arc endpoint is structurally impossible to expose.
- **Motion:** the number ticks once a second; the **arc and the ball are
  interpolated every animation frame** from the wall clock (`requestAnimationFrame`).
  They never jump.
- **Size:** one token, `--d` — **144px** regular, **162px** presentation. Identical
  markup, geometry, strokes and colours in both modes. No SVG filters anywhere.

### The room clock — one source of truth

`ST.roomLeft` is the **only** room-time value in the file. The header pill and the
waiting / return screen both read it; `roomPhase` (final 10s) is derived from it.
It keeps ticking while the student waits, uses the same yellow emphasis in both
places, and at **00:00** ends the rooms and returns the student to the Main Room.

The clock **never triggers a full re-render** — it writes the two DOM nodes that
show the time and nothing else. (That was the root cause of the “scratched disc”
matkot glitch: a full render destroys and reloads the Lottie.)

### Routing matrix (confirmed)

| Trigger | Destination |
| --- | --- |
| Consent declined | Waiting / return — **not Solo** |
| **Own** camera or mic off → Leave room, or 10s timeout | Waiting / return — **not Solo** |
| Own camera or mic off → **Stay in room** | Device back on, stay in the Duo Room |
| Leave & report → Leave room | Waiting / return |
| Report → Submit or Skip | Waiting / return |
| **Partner** leaves / off / unavailable | **Solo Room** |
| **Uneven number of students** | **Solo Room** |
| Room clock reaches 00:00 | Return to Main Room, muted |

Solo is **only** for partner-left/unavailable and uneven-student cases.

### TIP

TIP replays the teacher’s **recorded instruction** for the activity (recorded in
Teacher Cockpit via *Broadcast & record instructions*). It opens a small player —
serif title *Replay instruction*, yellow sparkle, play/pause, waveform, elapsed
time, close. It is not chat and not generic tips.

### Rooms are focused

No chat, no reactions, no participants/timeline rail, no written dialogue prompts.
The footer is **TIP · Camera · Mic**, with **Leave & report** as a separated ghost
safety action at lower-right.

### Locked visual decisions

- Yellow `#F9E24C` is the single canonical brand yellow across the timer, name
  chips, the TIP sparkle, the Done check disc, the Carousel loader, the waiting
  dots and the final-10s room timer.
- Coral `#F9746B` is used **only** for the timer’s final-5s warning.
- **No green** anywhere — no green active-speaker frame, no green handoff, no green
  success badge.
- The header room timer is **flat text**, not a pill. It turns brand yellow, bolder,
  with a soft glow and a calm pulse in the final 10 seconds.
- The **Done** badge is one milky pill, thin charcoal stroke, small yellow check
  disc, “Done!” in the brand serif, and **one** sparkle outside the badge that spins
  and settles. No yellow back layer, no green.
- **START** is a small chip under the name chip on the first second of a turn
  (~0.95s, fades). The full-tile START overlay is retired.
- Regular hyphens, not em-dashes, in UI copy.
- `prefers-reduced-motion` disables the coral pulse, the START chip, the Done
  sparkle and the room-pill pulse.

---

## 4. Validation notes

Everything below was run against **this exact file** (md5 `a02b8078c64096dc31df3c2f1b5702bc`).

- **`node --check`** — passes on both inline script blocks.
- **Structure** — 1 `<style>`, 3 `<script>` (1 CDN + 2 inline), well-formed open/close.
- **Headless DOM-stub harness** — **163 / 163 PASS**, covering:
  - teacher-triggered start; no auto-start on room entry
  - the 5s prep countdown and the yellow frame from tick 1
  - Dialogue, Intensive, Operation Grandma (full automatic set) and Carousel timing
  - Carousel cue switching every 5s, with zero text labels
  - the full routing matrix above, including the uneven-students Solo case
  - TIP open / play / pause / close
  - the fill-forward timer model at 20s / 10s / 5s, and the coral threshold
  - sub-second rAF interpolation (progress advances **between** whole seconds)
  - turn chips across all four activities
  - the room clock as a single source of truth, in the header and on the waiting screen
  - **Lottie instrumentation**: mounted once, **zero reloads across 15 room ticks**,
    idempotent mount, playhead preserved across scene changes
  - Done identical across all four activities, one sparkle, no green
- **Pixel probes** on the rendered timer at its real sizes (144px and 162px), across
  9–10 progress values in each mode: zero exposed arc edge, unbroken ball outline,
  0 failures.
- **CSS cascade resolver** run over the whole stylesheet: regular and presentation
  mode resolve to **identical declarations** for every timer property; the only
  difference is the `--d` size token.

**No live browser was available.** All validation is via `node --check`, the
headless harness, offline SVG rasterisation, CSS/stacking analysis and diffs. This
is noted explicitly rather than implied.

---

## 5. Known open questions / future work

See `notes-for-next-pass.md` for the full list. The headline items:

1. **Carousel** — built as a prototype activity with placeholder silhouettes; the
   real activity (final art, content model, pedagogy) is still ahead.
2. **Copy** — several waiting / report / Solo strings are still explicitly marked
   `[Placeholder copy]`.
3. **The matkot ball’s baked yellow is `#FEE300`**, not the `#F9E24C` token.
4. **Solo Room pedagogy** — the activity itself is `TBD`.
5. **Mobile** — no mobile adaptation exists for this surface.
6. **Teacher Cockpit integration** — every teacher event here is simulated by a
   debug button.
7. **Dead CSS** — the superseded `.clock.v11` / `.clock.vt` rule blocks are inert
   but still in the file. A sweep is safe but was deliberately not done inside a
   packaging task.
