# Teacher Cockpit — Desktop — v1 Checkpoint

**Package:** `teacher-cockpit-desktop-v1-checkpoint`
**File:** `teacher-cockpit-desktop-v1-checkpoint.html` (standalone, self-contained)
**Frozen from:** `teacher-cockpit-v25.html`
**md5:** `a5619c4a0b2885fdb8a6d6e0ef1b6409` · **445,928 bytes**
**Date:** 12 July 2026

> This is an **export only**. Nothing was rebuilt, refactored, restyled or re-behaved.
> The HTML in this package is **byte-identical** to `teacher-cockpit-v25.html`.

---

## What this checkpoint covers

The **Teacher Cockpit (Desktop)** prototype — the teacher-facing control surface for Vitamin Sessions.
It is a single standalone HTML file with no external dependencies: fonts, portraits and all placeholder
artwork are embedded or drawn inline.

It covers the **teacher-control model** and the **prepared activity states**. It deliberately does
**not** build the student room UI, real pairing, real media, real TIP playback, or mobile.

### Scope in this file
- Teacher states: Basic / Demonstration / Students-in-Rooms
- Helper mode
- The Activity Control System (activity → prepared recipe → manual Start)
- The instruction model (Broadcast & record → TIP → Start unlocks)
- Visual tools (Carousel) for Main Room / Demonstration, and Carousel as a Rooms activity
- Modular side panels (Lesson plan / Chat / Participants), drag + resize
- A debug board above the frame for driving every state, and a Presentation mode

### Explicitly out of scope here
Duo / Solo room UI · real pairing logic · real media, broadcast or recording · real TIP playback ·
final Carousel artwork · mobile · Helper as a separate layout

---

## Main Teacher states

| State | What the cockpit shows |
|---|---|
| **Basic teaching** | Teacher self-view fills the stage. Control panel offers **Activities · Timer · Demo · Visuals**. Mic + camera are overlay controls on the video. |
| **Demonstration** | Teacher + one selected student, split stage. Flow: *Start demonstration* → *Waiting for volunteers…* → live split → *End demonstration*. Calm layout, no red/danger treatment. |
| **Students in rooms** | Stage keeps the teacher streaming; the **Rooms Status & Control** panel replaces the control panel. |

**Control panel** — two options, both available (Option B = collapsed bar is the default):
- **Collapsed bar (default):** four **equal-width** buttons filling the row — Activities / Timer / Demo / Visuals — each opening a popover.
- **Expanded panel:** the same four as stacked groups.
- Mic and camera are **never** in this row. They live on the teacher video, bottom-centre.
  On = **neutral** (never green). Off = **red with a slash**. Both keep their safety confirmation popups.

**Main-room countdown timer**
- Presets 5 / 10 / 20 / 30s + custom.
- Start → **Pause** → **Resume** (resumes from the exact remaining second, including mid-prep). **Reset** available while running and while paused.
- There is no dead “Counting down…” state.

**Header**
- One row. Left: exit + brand. Centre: session progress. Right: status, then a hairline, then layout actions.
- **ON AIR** is a flat green dot + label (not a pill). Session time is plain text.
- When rooms are active, **Rooms 07:30 becomes the primary time** and **16:42 recedes**. No decorative dots between the clocks.
- **Edit layout / Reset layout** live behind the hairline as secondary actions.
- There is **no TEACHER chip** — the teacher does not need to be told they are the teacher.

---

## Main Helper states

Helper is the same cockpit with teacher control removed — not a separate layout.

- **Helper sees the live teacher feed** (what the students see). Not a black “you are not broadcasting” slate, and **not** a helper self-view.
- Helper **camera and microphone are off**, and the helper is **not broadcasting**. A single flat chip on the feed states this. No device controls are rendered.
- **Every teacher control is inert**: Activities, Timer, Demonstration, Broadcast, Rooms, Visuals, and the TIP. They are greyed out *and* blocked in the action handler (allow-list), not just visually.
- **Chat is the helper’s live surface** and is chat-centred by default: chat expanded, chat column widened (440px), lesson column narrowed (320px), participants collapsed.
- **Helper can edit and reset their own layout.** Layout is a personal workspace, not a teacher action. Reset layout is **role-aware** — resetting as Helper restores the *helper’s* chat-centred default.
- **HELPER** appears in the header as a subtle, centred mode indicator (yellow dot + holder), never a CTA.
- **Switch to Teacher** is a small ghost action in the **Helper Mode panel header** (same pattern as *Close rooms* in the Rooms panel) — not in the global header, not a full-width primary CTA.
  - Switching always asks for confirmation.
  - If a Teacher is already present, it shows a **takeover** confirmation instead.

---

## Main room-control behaviours

### Activity Control System — the core rule
> **Selecting an activity PREPARES its timer recipe. It never starts it.**
> **Start is always manual**, and “manual” means *starting the activity/set* — never stepping between internal rounds.

Four activities, four recipes. Every one begins with a **5-second countdown**.

| Activity | Sequence |
|---|---|
| **Dialogue** | 5s countdown › Round 1 **20s** › Transition **5s** › Round 2 **20s** › *Start again* (manual) |
| **Intensive Exercise** | 5s countdown › Student 1 **10s** › Transition **5s** › Student 2 **10s** › *Run another set* (manual) |
| **Operation Grandma** | 5s countdown › Round 1 / Student 1 **10s** › Round 1 / Student 2 **10s** › **5s break** › Round 2 / Student 1 **10s** › Round 2 / Student 2 **10s** › Done › *Run another set* (manual) — **the whole set runs through on its own** |
| **Carousel** | 5s countdown › Student 1 **20s** › Transition **5s** › Student 2 **20s** › *Run another set* (manual) — the framed student gets a **new visual every 5s** |

- The manual **turn duration override** (5/10/20/30/custom) applies to **turn steps only**. Transitions, breaks and Carousel swaps stay fixed at their PRD durations.
- The **Timer recipe** is a **hover-only tooltip** on a small ⓘ next to the Timer label. Not clickable, no open state, no layout space, no scroll. Flat metadata, e.g.
  `5s countdown · Round 1 · 5s break · Round 2 · Next set manual`

### Instruction model (Broadcast vs TIP)
1. **Before any recording** there is exactly one action: **“Broadcast & record instructions”** — the teacher speaks live to all rooms *and* the same instruction is recorded for the room TIP. While it runs the button reads *End & save instructions*.
2. **Ending it** makes the **TIP ready** — and that, and only that, **unlocks Start**.
3. **After the first recording**, the actions split:
   - **Broadcast to rooms** — live talk only, repeatable, and it **never** replaces or clears the TIP. A live broadcast alone never unlocks Start.
   - **Re-record TIP** — a small circular record button that replaces the TIP. It briefly disables Start while recording.
4. Clicking a **gated Start** shows a transient popover — *“Broadcast & record instructions first.”* — which dismisses itself. There is no permanent instructional copy and **no “start without broadcast” path**.

### Rooms Status & Control panel
- **Never scrolls.** `overflow:hidden`, nothing clipped, nothing under the header. Anything that would not fit was removed from the default state, moved to a tooltip, or moved to the debug board — never solved with a scrollbar.
- Header: `ROOMS STATUS & CONTROL` + a small ghost-red **Close rooms** action.
- Status summary: *Rooms are active* + activity chip · `8 students · 4 duo rooms · 0 solo ⓘ · 07:30 left`.
- **Instruction** section: the button whose label *is* the state, plus the circular re-record dot once a TIP exists. Live statuses (*TIP ready · Broadcasting… · Round 1 · Student 2*) ride on the **right of the Instruction title row** as flat metadata — small dot + text, never a pill, never on top of the divider.
- **Timer** section: duration controls are **always visible**, next to Start / Pause / Resume / Reset.
- **Done** is brief: it shows on the stage HUD only, for ~1.8s, then the panel returns to a ready state whose primary action is the next real one (*Run another set*).

### Solo
Solo happens **only** for an uneven number of students, or when a partner leaves / turns camera or mic off.
Students who decline consent or leave their own room **wait in the Main room** — they are never routed to Solo.
This rule is a **tooltip on the solo count** and a dev note; it is not teacher-facing body copy.

### Colour language
- **Yellow** = active / current turn / handoff / running timer / selected activity / active focus frame.
- **Green** = **success and ON AIR only** (Done, TIP ready, on-air dot, camera-on status).
- Device controls on = **neutral**, never green. Off = red + slash.

---

## Visual tools / Carousel behaviour

Carousel is **two things**:

**1. A Main Room / Demonstration visual tool** — a pedagogical aid on the **shared stage**, deliberately *not* in the camera/filter area.
- Reachable from the **Visuals** control in the collapsed bar, the **Visual tools** group in the expanded panel, and next to the Demonstration controls.
- *Carousel visuals* puts a card on the shared stage and **switches it automatically every 5 seconds**. *Next* and *Stop* give manual control.
- Popover lifecycle: **click outside dismisses the popover but never stops a running layer**. *Stop carousel* stops the layer **and** closes the popover. Starting also closes it. Reopening while it runs shows only compact Stop / Next.

**2. A Rooms activity** — with its own recipe (above). While it runs, a contained **Room mirror** (picture-in-picture, ~196px, capped at 38% of the stage) sits in the **right-hand activity HUD stack**, directly under the timer.
- The mirror shows **only the visual**: the current card and a yellow active frame. No turn pills, no second countdown, no Done state, no labels — turn and time are the HUD’s job, right above it.
- The teacher video stays visible and dominant. Top-left stays free for the rooms status chip; bottom-centre for mic/camera.

**Placeholders are grammar cues, not a character deck.**
The Carousel practises **grammatical gender / number**, so the visuals are three built-in inline-SVG silhouettes:
**Masculine (זכר)** · **Feminine (נקבה)** · **Plural (רבים)**, rotating randomly.
No word is printed on the card — producing it is the exercise. No external assets. Final art replaces these.

---

## Known open questions

1. **Does a live broadcast pause the running activity timer?** Today they are independent.
2. **Does re-recording the TIP also broadcast live?** Today it records only — the teacher is not heard live while re-recording.
3. **TIP review** — the record button is a two-state toggle. Does the teacher need to listen back to / discard a TIP before it reaches the rooms?
4. **Room mirror scope** — the mirror exists for Carousel only. Do Dialogue / Intensive / Operation Grandma need an equivalent “what students see” preview?
5. **Carousel visual tool + Rooms Carousel together** — opening a Rooms activity currently stops the shared-stage carousel. Correct, or should it keep running?
6. **Carousel turn length** in Rooms is 20s per student = 4 visuals each. Right number?
7. **Helper layout** — still the same cockpit with controls removed. Does Helper eventually need its own layout?
8. **Timer duration** — preset-only, custom, or both? *(current: both, applying to turn steps only)*
9. **Can the teacher edit an activity’s timer sequence directly**, or only pick a predefined recipe?
10. **Lesson-plan generator** — final logic is still a placeholder.
11. **Sound** — exact behaviour for timer start and the final 3 seconds.
12. **Naming** — the PRD writes “Grandma Operation”; the build uses **“Operation Grandma”** throughout. Which is final?

---

## Validation performed before packaging

- `node --check` passes on **both** script blocks.
- The document is well-formed: `<!doctype>`, one `<style>`, two `<script>`, `</body>` + `</html>` closed.
- Headless boot renders the cockpit with **no runtime errors** (header, stage and control bar all present).
- The packaged HTML is **byte-identical** to `teacher-cockpit-v25.html` (md5 verified).
- No browser was available, so pixel-level layout was **not** verified here — see `notes-for-next-pass.md`.
