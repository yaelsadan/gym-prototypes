# Notes for the next pass — Student Main Classroom · Desktop

Frozen at **v8** (`index.html`, md5 `f35d28ba8011706dfd6aae0d509f6f8c`). Nothing below was changed in the
packaging task.

---

## Part 1 — Decisions this checkpoint locks in

A future pass should not quietly reverse these.

- **The Carousel visual is a placeholder image slot, not final artwork.** Each cue is a data-URI in an
  `<img>` with `object-fit: contain`, sized by `--car-slot-w` / `--car-slot-h`. **The final Carousel image
  or illustration will be chosen later.** Do not treat the three silhouettes as design decisions — they
  are stand-ins, and the slot exists so the real asset can be dropped in by replacing one string.
- **Operation Grandma in the Main Room is legacy / debug only.** The real activity now belongs to Practice
  Rooms. The Main Room version was not expanded and its logic was not rebuilt; it survives only as a debug
  scene.
- **The no-volunteers state is not shown to students.** Only the teacher / Cockpit should know. An empty
  pool returns the student silently to the normal Main Room — no popup, no card, no toast, no empty state.
- **The Main Room does not use Practice Rooms camera/mic enforcement.** No requirement, no warning modal,
  no routing, no leave flow. Enforcement lives only behind the room-consent bridge, on the Rooms side.
- **The Main Room mic is teacher-controlled / disabled** unless the teacher invites the student or an
  activity opens it. Clicking it explains itself; it never blocks or routes.
- **Desktop is checkpointed here; mobile alignment comes later.** There is no mobile Main Classroom in this
  package.

---

## Part 2 — Open product questions

### 1. What are Carousel visuals, exactly?

A Main Room **visual tool**, a **Demonstration aid**, a **Practice Rooms activity** — or all three,
depending on what the teacher picks? This pass built the Main Room layer only. Undefined: the content
model, the deck, who authors it, how the teacher selects it, and whether the same deck appears in the
Rooms carousel cue.

### 2. Where does the volunteer draw actually happen?

In the product it is a Cockpit / server event. This prototype draws locally so the branches can be
reviewed. Undefined:

- Can the teacher **override** the draw and pick a specific student?
- What does the **teacher** see when nobody volunteers? (The student sees nothing — that part is settled.)
- Is the pool visible to the teacher while the 10s window runs?

### 3. What if the chosen student drops mid-demonstration?

There is no re-draw, no timeout and no exit except *End demonstration*.

### 4. The Main Room camera policy has never been written down

The Main Room lets the camera toggle freely; Practice Rooms enforce camera + mic. The line is intentional
but has never been stated as a rule. Write it down before someone "aligns" the two by accident.

### 5. Operation Grandma in the Main Room — retire it, or keep a variant?

It is currently dead weight. It should be **removed or retired before the final checkpoint unless product
decides otherwise**.

---

## Part 3 — Visual polish notes

- **The 3-2-1 handoff is still 3-2-1.** The circular timer is now the Rooms component, but the Operation
  Grandma cinematic handoff overlay still counts **3 → 2 → 1**, while Practice Rooms prep uses **5
  seconds**. Left alone deliberately (v7 was not allowed to change timings). If Grandma is retired from the
  Main Room, this question disappears with it.
- **The Carousel slot's dashed frame is provisional chrome.** When the final asset lands, decide whether
  the frame goes away entirely or becomes a real card.
- **The Carousel card's position (left-centred) was chosen to clear the teacher's face**, not because it is
  the best composition. Once the real artwork exists, revisit it — especially at the narrow width, where
  the stage is tighter.
- **Copy is still prototype copy** in the short transition, the intermission card and the room-consent
  bridge. None of it has been through a copy pass.
- **The `dialogue` scene is an older MVP split view** that predates Practice Rooms. It probably has the
  same status as Operation Grandma — worth a look.
- **Presentation mode** has only been solved properly for the timer and the Carousel slot. The rest of the
  screen has never had a dedicated presentation pass.

---

## Part 4 — Technical cleanup notes

- **Dead CSS.** The superseded clock rules (`.clock.s-y`, `.clock.s-r`, `.clock.ok`, `.clock .ring .track` /
  `.prog`) are inert — the timer now emits `.clock.vt` with `.face` / `.arc` / `.ball` — but they are still
  in the stylesheet. A sweep is safe and would shrink it. It was deliberately **not** done inside an
  alignment or packaging task.
- **`.demo-half .onstage`** rules survive but nothing renders that class any more (the "You're on stage"
  label was removed in v5).
- **FedraSerifPro is embedded as a base64 `@font-face`.** It is a **licensed** face. **For a git-safe or
  public export:** strip the `@font-face` block at the top of the `<style>` and repoint `--font-brand` to
  `Georgia, "Times New Roman", serif`. The Practice Rooms checkpoints carry the same face and the same
  caveat — if an export process is ever formalised, it should cover all three surfaces with one script.
- **Every teacher event is a debug button.** Starting the Demonstration, running the draw, activating
  Carousel and opening a student's mic all need a real Cockpit contract.
- **The volunteer draw is `Math.random()` in the client.** Fine for a prototype; obviously not the product.
- **No live browser was ever available** during these passes. Validation was `node --check`, a headless
  DOM-stub harness (132 assertions), CSS inspection and computed geometry. A human should still open the
  file in Chrome and Safari.

---

## Part 5 — Known legacy / debug states

| State | Status |
| --- | --- |
| **Operation Grandma** (`grandma`) | **Legacy / debug only.** The real activity is a Practice Rooms activity. Retire it before the final checkpoint unless product decides otherwise. |
| **Dialogue split** (`dialogue`) | An older MVP scene that predates Practice Rooms. Same question. |
| **Activity timer A / B** (`activity`) | A layout comparison (top-center vs corner-attached), not a product state. |
| **Rig the draw** / **others in the pool** | Debug controls for the volunteer draw. Not product. |
| **Timer phase snapshots** (30s / ≤10s / ≤5s / Done) | Static review states, deliberately not interpolated. The real motion is on *▶ Run 30s (smooth)*. |
| **Carousel Start / Next / End** | Debug triggers standing in for teacher events. |
| **Video bg: Flat / Realistic** | A review toggle for testing overlays against video-like stills. |
| **The debug note line** | The only place a no-volunteers outcome is ever surfaced. It must never become student-facing UI. |
