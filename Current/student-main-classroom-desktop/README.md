# Student Main Classroom — Desktop · Checkpoint

**Checkpoint name:** `student-main-classroom-desktop-v1-checkpoint`
**File:** `index.html`
**Source file:** `student-classroom-desktop-main-room-v8.html`
**MD5:** `f35d28ba8011706dfd6aae0d509f6f8c`
**Size:** 633,583 bytes
**Frozen at:** Main Room v8

`index.html` is a **byte-identical copy** of `student-classroom-desktop-main-room-v8.html`. Nothing was
changed, refactored or rebuilt in the packaging step.

---

## 1. What this checkpoint covers

The **Student Main Classroom — Desktop** prototype: what a student sees in the main room of a Vitamin
Session — the teacher broadcast, the sidebar (Chat / Timeline / Participants), the Ask composer, the
self-view, the Demonstration flow, the Carousel visual layer, and the bridge out to Practice Rooms.

Single standalone HTML file. No build step. The only external requests are Google Fonts and the Lottie
player from a CDN; the portraits, the matkot animation, the Spark icon and FedraSerifPro are all
base64-embedded.

A review harness ships in the file: a 1280×760 frame with a control panel above it that drives every
scene, the demonstration draw, the timer, the Carousel and the panels. `Presentation mode` (top right,
or `?mode=presentation`) takes it full-viewport.

### Alignment sources

- **Practice Rooms Desktop v21 checkpoint** — the timer model, the Done badge and the colour semantics
  are ported from it. No Practice Rooms *code* was copied into this file.
- **Teacher Cockpit** — the Demonstration draw and the Carousel activation are modelled as teacher
  events; here they are simulated by debug buttons.

---

## 2. Main states

| Scene | What it is |
| --- | --- |
| `default` | The Main Room. Full-bleed teacher broadcast, self-view, footer controls, rail. |
| `volunteer` | The Demonstration volunteer popup (10s window) |
| `demonstrate` | Teacher + the chosen student, split view |
| `activity` | A standalone activity timer on the stage (A · top-center / B · corner) |
| `dialogue` | Dialogue split view (legacy MVP scene) |
| `grandma` | Operation Grandma — **legacy / debug only** (see below) |
| `intermission` | The calm branded between-sessions card |
| `roomconsent` | The pre-room consent bridge, before students are sent to Practice Rooms |
| `transition` | The short matkot transition into Practice Rooms |

**Panels** (Chat / Timeline / Participants) are overlay sheets anchored by the fixed right rail. They
stay active over any scene. The **Ask composer** docks in the footer and minimises when the Chat panel
is open.

**Header:** title **Gym**, subtitle **with Niv Rubin**, a *Now · <activity>* chip, a flat **Session**
timer, and a **REC** chip.

---

## 3. Demonstration behaviour

**One popup. Consent is captured there and nowhere else.**

- Title: *“Who wants to volunteer for class demonstration?”*
- Body: *“If you’re chosen, your camera and audio will be shared with the rest of the class.”*
- Buttons: **“Yes, let’s go!”** / **“Not this time”**
- A **10-second** timer.

**There is no second confirmation popup for the chosen student.**

### The 10s window is a class event, not a personal one

- **Yes** → you join the volunteer pool, and a calm *“You’re in — picking a volunteer…”* state replaces
  the popup. The window keeps running; it is not restarted.
- **Not this time** → the popup closes and you are back in the normal Main Room — but **the draw keeps
  running behind it**, which is what actually happens in a class.
- After 10 seconds, **one student is picked at random from everyone who said yes.** A student who said
  *Not this time* can never be selected.

### No volunteers

If the window closes with an empty pool, the student is **simply returned to the normal Main Room**.
**No popup, no card, no toast, no empty state.** Only the teacher / Cockpit would know. In this
prototype it surfaces in the **debug note line only**.

### The demonstration view

- **Everyone** sees teacher + the chosen student in a split view. The sidebar / chat / participants
  structure is unchanged.
- **The chosen student** sees themselves in the split, and their **self-view folds** into the edge tab
  (*“You · in the demonstration”*, green on-air dot). It does not disappear.
- Their **camera and mic are shared for this state only**. The footer mic reads *“Your mic is on for
  this demonstration.”*
- **End demonstration** returns everyone to the basic Main Room, and the chosen student returns to
  **muted / non-broadcasting**.

### Debug

*Teacher starts Demonstration* · *End demonstration* · **Rig the draw** (Random / I get picked /
Someone else / Nobody volunteered) · **how many other students said yes** (0 / 3 / 8).

---

## 4. Main Room mic / camera behaviour

**The Main Room does not use Practice Rooms camera/mic enforcement.** There is no requirement, no
warning modal, no routing and no leave flow.

- **The mic is muted and teacher-controlled.** Clicking the disabled mic shows a calm popover:
  > *“Your mic opens only during class activities or when the teacher invites you.”*

  The same string appears on hover. It explains; it does not block or route.
- The mic opens **only** when an activity opens it, or when the teacher invites the student (the
  Demonstration).
- **The camera is free to toggle.** Turning it off simply turns it off; nothing is enforced and nothing
  routes away.
- Practice Rooms enforcement (camera + mic required, leave-the-room flow) lives **only** behind the
  room-consent bridge, on the Practice Rooms side.

---

## 5. Carousel placeholder behaviour

The Main Room carries a **Carousel visual layer** — a character cue card on the shared stage while the
teacher runs the exercise.

**It is a placeholder image slot, not final artwork.**

- Each cue is a standalone **data-URI** dropped into an `<img>` with **`object-fit: contain`**. Swapping
  in the final image or illustration means **replacing one string** in `CAR_SLOTS` — no markup change,
  no CSS change. A different aspect ratio will still sit correctly inside the same slot.
- **One token pair drives the size:** `--car-slot-w` / `--car-slot-h` (160×186; 132×154 narrow;
  208×242 in presentation). Resize in one place.
- The slot carries a soft dashed frame so it **reads as provisional**.
- **Visual only.** No `זכר` / `נקבה` / `רבים`, no Masculine / Feminine / Plural, no explanations, no
  pedagogy, no room controls.
- **It is a layer, not a transition.** Nothing routes anywhere. No chat, no reactions.
- It **auto-switches every 5 seconds**, advances with the debug *Next character*, and disappears on
  *End Carousel*.
- **It does not cover the teacher's face.** On the 1280×760 frame the stage is 1218px wide and the face
  is centred at x ≈ 609; the card occupies **x 44–244**, vertically centred at y 262–498 — **365px
  clear** of the face, and clear of the topbar and the footer. It scales in presentation mode.

---

## 6. Timer / Done state behaviour

**The activity timer is the Practice Rooms component**, ported with identical geometry.

- Milky face, **charcoal track**, progress that **fills forward** into brand yellow, and in the
  **final 5 seconds** the arc and the leading ball turn **coral `#F9746B`**. The number stays charcoal.
- R 26.5 · **one stroke weight of 1.4** for track, progress and ball · ball fill r 4.6, painted last, so
  the arc endpoint is structurally impossible to expose · **no SVG filters**.
- **The ball moves every animation frame.** A `requestAnimationFrame` loop interpolates the arc and the
  ball from the wall clock; only the number ticks once a second. Debug: *▶ Run 30s (smooth)*.
- The phase buttons (30s / ≤10s / ≤5s / Done) remain **static review snapshots** and are deliberately
  not interpolated — the same pattern Practice Rooms uses.
- **Activity logic and timings are unchanged.** The existing phase model still drives the timer; the
  phases map onto a remaining-seconds value on a 30s total, so the coral state falls out of the ≤5s
  phase that already existed.

**Done** uses the Practice Rooms badge: a milky pill, a thin charcoal stroke, a yellow check disc,
**“Done!”** optically centred, and **one** sparkle outside the pill. **No green. No yellow backing
layer.** It appears wherever the timer completes — on the stage, and in the Operation Grandma tile
corner (a smaller variant there).

### Colour semantics

- **Yellow** = active / current / turn / CTA. The active-speaker frame is yellow, and there is no
  “Speaking” label.
- **Green** = success / on-air only (the camera dot, the demonstration on-air dot).
- **Red / coral** = off / error / safety, and the timer's final-5s warning.
- Plain metadata is **not** a chip: the Session timer is flat status text. *Now* and *REC* keep their
  chips because they are semantic status.

---

## 7. Intentionally out of scope

- **Mobile.** Only the desktop Main Classroom is checkpointed here. **Mobile alignment comes later.**
- **Practice Rooms.** The room activities, the room timer, the room routing matrix and the Solo flow all
  live in the Practice Rooms checkpoints. This file only carries the **bridge**: the room-consent popup
  and the short matkot transition. **No Practice Rooms code was copied in.**
- **Teacher Cockpit.** Every teacher event here — starting the Demonstration, running the draw,
  activating Carousel, opening a student's mic — is simulated by a debug button. The real contract is
  undefined.
- **Carousel pedagogy.** No content model, no deck, no scoring, no written prompts. The three
  silhouettes are placeholders.
- **Copy.** The transition, the intermission and the room-consent bridge still carry prototype copy.

---

## 8. Validation notes

Everything below was run against **this exact file** (md5 `f35d28ba8011706dfd6aae0d509f6f8c`).

- **`node --check`** — passes on both inline script blocks.
- **Structure** — 1 `<style>`, 3 `<script>` (1 CDN + 2 inline), well-formed open/close.
- **Headless DOM-stub harness — 132 / 132 PASS**, covering every item on the checkpoint list:
  the title says **Gym** and the subtitle **with Niv Rubin** · the volunteer popup with its exact copy
  and its **10-second** timer · **no second confirmation** for the chosen student · **200 randomised
  draws** proving the pick really is random and reaches both outcomes, and **200 more** proving a
  *Not this time* student is **never** selected · **no student-facing no-volunteers UI anywhere in the
  markup** · the chosen student in the split view with a **folded self-view** · **End demonstration**
  returning everyone to the Main Room, muted · the disabled-mic tooltip copy, exact, on hover and in the
  popover · **no room-style enforcement** in the Main Room · the timer's fill-forward model, the
  **coral `#F9746B`** at ≤5s, the **sub-second rAF motion**, and the **Done badge** at 0 · the Carousel
  placeholder appearing, auto-switching, advancing on *Next character* and clearing on *End Carousel* ·
  the rail, the panels, the Ask composer, the room-consent bridge and the short transition all preserved.

**No live browser was available.** All validation is via `node --check`, the headless harness, CSS
inspection and computed geometry. A human should still open this in Chrome and Safari.
