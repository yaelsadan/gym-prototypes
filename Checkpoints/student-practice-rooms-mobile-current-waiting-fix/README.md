# Student Practice Rooms — Mobile · Checkpoint

**Checkpoint name:** `student-practice-rooms-mobile-v1-checkpoint`
**File:** `index.html`
**Source file:** `student-practice-rooms-mobile-v6.html`
**MD5:** `24b67a1f82091965e72c271e5b42db34`
**Size:** 574,541 bytes
**Frozen at:** mobile v6

`index.html` is a **byte-identical copy** of `student-practice-rooms-mobile-v6.html`. Nothing was
changed, refactored or rebuilt in the packaging step.

---

## 1. What this checkpoint covers

The **Student Practice Rooms — Mobile** prototype: everything a student sees on a phone after the
teacher sends the class into practice rooms, up to the moment they return to the Main Room.

Single standalone HTML file. No build step. Open it in a browser and it runs. The only external
requests are Google Fonts (Assistant) and the Lottie player from a CDN; everything else — the
portraits, the matkot animation, the Spark icon and the FedraSerifPro face — is base64-embedded.

The file also carries a **review harness**: a 390×844 phone next to a control panel that drives every
scene, activity, device state, routing path and chrome state.

### Lineage

- **Behavioural source of truth:** the desktop checkpoint `student-practice-rooms-desktop-v21.html`
  (md5 `a02b8078c64096dc31df3c2f1b5702bc`). The activity engine, the recipes, the routing matrix, the
  timer maths, the room clock and the Lottie lifecycle are the desktop ones.
- **Mobile system reference:** *Default Classroom Self-view v1*. Tokens, the phone shell, the status
  bar, the header language and the bottom-sheet language come from there.
- **It is not a desktop port.** The layout was designed for a phone.

### Not in this file

Desktop Practice Rooms, Teacher Cockpit and Main Classroom live in separate files and were **never
touched** by any pass that produced this checkpoint. Variant B (contained video tiles) was explored
and then stopped; only the immersive direction survives here.

---

## 2. Mobile layout approach

**Vertical Duo stack.** Partner on top, you on the bottom — closest to your thumb. No two-column
assumption from the desktop survives.

**The seam is the activity zone.** On the 378×832 screen the tiles run 0–416 and 416–832, and the
portraits put the faces at roughly **y 208** (partner) and **y 624** (you). The seam band runs
**y 344–488** — precisely between them. Every piece of activity UI lives there:

- the 5-second prep countdown (144px)
- the activity timer (112px)
- the *Waiting for your teacher to start* pill
- the Carousel cue
- the Done badge

so **none of them can ever cover a face**. Face clearance is 76–92px in every state.

**Carousel collision rule.** A running Carousel puts the timer (112px) + a 22px gap + the cue (116px)
= **250px** on the seam. In that one case the bottom name chip drops below the band
(`.rstage.car-run`); in every other state it stays high.

**Header hierarchy (v6).** The room timer is **persistent status**; the close X is **chrome**. Both are
absolutely positioned, so the X reserves no space and cannot push the timer:

| | position |
| --- | --- |
| Room timer | `top:4 right:12` → y 52–83, x 242–366 |
| Close X (floating) | `top:44 right:12` → y 92–124, x 334–366 |
| Header reveal | y 132–175, x 134–366 |
| Partner name chip | y 64–93, x 14–111 — **one fixed value in every state** |

**Bottom controls.** TIP · Camera · Mic as 58px targets in the thumb zone, with **Leave & report** as a
lighter ghost pill beneath them.

**Popups are bottom sheets** — consent, the camera/mic warning, partner-left and Leave & report. Not
centred modals.

---

## 3. Main states

### Scenes

| Scene | What it is |
| --- | --- |
| `duo` | The Duo Room — the vertical stacked split. The default. |
| `consent` | Pre-room camera & mic consent (bottom sheet, ~10s auto-decline) |
| `enforce` | The student turned their **own** camera or mic off — the leave-the-room sheet |
| `partnerleft` | The partner left / went unavailable (calm sheet) |
| `wait` | Waiting / return-to-main — matkot transition + the synchronised room countdown |
| `report` | Leave & report → the report screen |
| `trans` | The matkot transition, Solo variant |
| `solo` | Solo Room — placeholder |
| `return` | *Time's up — heading back to class* |

### Activity states

`idle` → `prepared` → `running` → `done`, with the running steps
`prep` (5s) · `turn` · `trans` / `break`.

### Chrome states

`visible` (3s on entry, 3.8s after a tap) and `hidden` (faded, `pointer-events:none`).
Chrome is **pinned open** by any blocking surface.

---

## 4. Main behaviors

### Activities are teacher-triggered

Selecting an activity only **prepares** it. The timer starts on a simulated Teacher Cockpit
**Start timer** event. Nothing auto-starts on room entry.

| Activity | Recipe |
| --- | --- |
| **Dialogue** | 5s prep → You 20s → 5s transition → Dana 20s → Done → return flow |
| **Intensive Exercise** | 5s prep → You 10s → 5s transition → Dana 10s → Done. Another set is a **manual** teacher action. |
| **Operation Grandma** | 5s prep → R1/You → R1/Dana → **5s break** → R2/You → R2/Dana → Done. **One full set runs automatically** — there is no *Start round 2*. |
| **Carousel** | 5s prep → You 20s → 5s transition → Dana 20s → Done. The cue **switches every 5s** during a turn. Visual only — no `זכר` / `נקבה` / `רבים` labels. |

The 5-second prep countdown carries the yellow frame from its **first tick**.

### The activity timer

Fill-forward: **charcoal track → brand-yellow progress fills it → the final 5 seconds re-colour the
arc and the moving ball to coral `#F9746B`**. The number stays charcoal.

- Geometry (64 viewBox): band r 26.5, **one stroke weight of 1.4** for the track, the arc and the ball,
  ball fill r 4.6 — 6.6× the arc's half-width — painted last, so the arc endpoint is structurally
  impossible to expose.
- **Motion:** the number ticks once a second; the arc and the ball are interpolated **every animation
  frame** by a `requestAnimationFrame` loop reading the wall clock. They never jump.
- 112px on mobile. No SVG filters, no glow.

### Turn state

Yellow frame + the name chip carries it: **"Your turn" / "Dana's turn"** when active, plain
**"You" / "Dana"** when not. During prep it reads *You start*; during a transition, *You're next*.
Never "Speaking". Yellow means current turn, not speech detection. **No green anywhere.**

### The room clock

`ST.roomLeft` is the **only** room-time value in the file. The header and the waiting screen both read
it; `roomPhase` (final 10s) is derived from it. It keeps ticking while the student waits, goes brand
yellow in the final 10 seconds, and at **00:00** ends the rooms and returns the student to the Main
Room. **It never triggers a full re-render** — it writes the countdown DOM in place, which is what keeps
the matkot Lottie alive.

### Routing matrix (inherited from desktop, verified here)

| Trigger | Destination |
| --- | --- |
| Consent declined | Waiting / return — **not Solo** |
| **Own** camera or mic off → Leave room, or 10s timeout | Waiting / return — **not Solo** |
| Own camera or mic off → **Stay in room** | Device back on, stay in the Duo Room |
| Leave & report → Leave room | Waiting / return |
| Report → Submit or Skip | Waiting / return |
| **Partner** leaves / off / unavailable | **Solo Room** |
| **Uneven number of students** | **Solo Room** |
| Room clock reaches 00:00 | Return to the Main Room, muted |

### TIP

A compact player: the yellow sparkle, one title — **Replay instruction** — play/pause, a waveform,
elapsed time and close. It replays the teacher's recorded instruction. It is not chat.

### The matkot transition

The ball carries a charcoal stroke so it stays visible over the white paddles. The Lottie is mounted
once, is idempotent, and preserves its playhead across scene changes — **it is never destroyed and
reloaded on a room-clock tick**, which is what caused the old "scratched disc" loop.

### Typography

Assistant everywhere, with **exactly one exception**: the emotional transition headline
(`.t-headline`) is **FedraSerifPro**. Supporting copy, the muted pill, the waiting countdown, the
chips, the controls and the room timer all stay on Assistant.

### Rooms are focused

No chat, no reactions, no participant rail, no written dialogue prompts.

---

## 5. Interaction rules

### Auto-hide chrome

- On room entry the chrome shows for **3s**, then fades out over **200ms** if nothing is touched.
- **A tap anywhere on the video** brings it back for **3.8s**.
- **A tap on a control resets** the timer rather than hiding — the header and the footer bump it on any
  tap inside them.
- **No hover anywhere.** This is a phone.
- **Opacity only.** No `display:none`, no height change, no reflow — the video cannot jump. Hidden
  chrome carries `pointer-events:none` so it never swallows a tap.
- The class is toggled on `#screen`; the room is **never re-rendered** to hide chrome, so the START chip
  and the Carousel loader are not restarted.

### What auto-hides

The close X, the expanded room context, the TIP / Camera / Mic controls, Leave & report, and the footer
scrim. The header scrim only dims to 50%, because the room timer and the partner chip sit on it.

### What NEVER auto-hides

The **room timer**, the **name chips**, the START chip, the active-turn yellow frame, the activity timer,
the 5s countdown, the prepared pill, the Carousel cue and the Done badge. These are asserted explicitly
in CSS (`opacity:1` under `.chrome-off`) so a future pass cannot sweep them into the chrome rules.

### Blocking surfaces pin the chrome open

The consent sheet, the camera/mic warning, the partner-left sheet, Leave & report, the TIP player, the
report screen, the waiting / return screen and the Solo room. The auto-hide timer is never armed while
one of them is up.

### The name chips never move

The partner chip resolves to `top: 64px` in **every** state — default, header-revealed and
chrome-hidden. It is declared once across all three selectors, so it cannot animate.

---

## 6. Validation notes

Everything below was run against **this exact file** (md5 `24b67a1f82091965e72c271e5b42db34`).

- **`node --check`** — passes on both inline script blocks.
- **Structure** — 1 `<style>`, 3 `<script>` (1 CDN + 2 inline), well-formed open/close.
- **Headless DOM-stub harness — 177 / 177 PASS**, including every item on the checkpoint list:
  teacher-triggered start · the 5s prep countdown · Dialogue · Intensive · **Operation Grandma's
  automatic set** (`prep → R1/you → R1/dana → break → R2/you → R2/dana`) · Carousel cue switching every
  5s with zero text labels · TIP opens · own camera/mic off → waiting, **not Solo** · consent decline →
  waiting, **not Solo** · Leave & report → report → waiting · partner-left and uneven-students → **Solo**
  · the waiting countdown continues **with the matkot Lottie mounted once and reloaded zero times** ·
  the room timer and the name chips stay rendered with the chrome hidden · chrome reappears on tap · no
  "Speaking" label · no chat, no reactions, no rail.
- **CSS cascade resolvers** were run over the stylesheet to prove two structural claims rather than eyeball
  them: the partner name chip resolves to a single `top` value across all four chrome/reveal states, and
  the room timer's `position/top/right` are **identical** with the chrome on and off.
- **Collision maps** were computed for the seam zone, the name chips, the room timer, the X and the header
  reveal. Zero overlaps.

**No live browser was available.** All validation is via `node --check`, the headless harness, cascade
resolution and computed geometry. A human still needs to open this on a real device.

---

## 7. Known open questions

See `notes-for-next-pass.md` for the full list. The headline items:

1. **Solo should become a short popup / acknowledgement flow** before a simple activity — not a full
   static screen. This needs aligning on desktop too.
2. **The exact Solo activity is TBD.**
3. **Placeholder copy** survives in several transition, report and Solo states.
4. **Real-device QA** is required for safe areas, the Dynamic Island / notch and thumb reach.
5. **FedraSerifPro licensing** — see the export note below.
6. **The close X sits below the room timer**, which is an unusual pattern. It was the only arrangement
   that satisfied "timer hugs the corner" + "X must not push it" + "no overlap" simultaneously. Worth a
   second look.

---

## ⚠️ Export / licensing note

`index.html` embeds **FedraSerifPro** as a base64 `@font-face`. It is a **licensed** face and it is used
for exactly one element (the transition headline).

**For a git-safe or public export:** strip the `@font-face` block at the top of the `<style>` and repoint
`--font-brand` to `Georgia, "Times New Roman", serif`. The rest of the file is unaffected — every other
string is on Assistant, which is loaded from Google Fonts.
