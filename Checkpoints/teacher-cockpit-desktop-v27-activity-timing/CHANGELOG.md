# Teacher Cockpit — Desktop — CHANGELOG

From the first Teacher Cockpit build through to `teacher-cockpit-desktop-v1-checkpoint`.

Every pass was **additive and surgical** on top of the previous stable file — never a rebuild.
Each version was validated with `node --check` on all script blocks plus a headless DOM-stub harness
before delivery, and each source file was left byte-unchanged.

---

## Phase 1 — Foundation (v02 → v15)

The cockpit shell, layout system and core states.
*(Summarised — these predate this working stream and are documented in the earlier
`teacher-cockpit-checkpoint-v1` package.)*

- **v02–v10** — Cockpit frame, header, stage, modular side panels (Lesson plan / Chat / Participants),
  the two control-panel options (Option A expanded, Option B collapsed bar), the countdown engine with
  a smooth continuous ring, camera/mic safety popups, the debug board and Presentation mode.
- **v11–v13** — Recipe timers, layout constraints, and restoring visual presence.
- **v14** — Rollback + stabilisation: lighter running-timer HUD, clean green Done, Spark helper asset.
- **v15** — *Scale restore + board stability.* Fixed the board-mode bug where the collapsed bar’s camera
  button was clipped — solved with **constraints, not global shrinking**. This is the file that became
  `teacher-cockpit-checkpoint-v1.html` (md5 `2b17bac7676b1dcc8876d4254021ad52`), the source of everything below.

---

## Phase 2 — The Activity Control System (v16)

**v16 — PRD alignment.** The single biggest behavioural pass.

- **Activity = prepare. Start = start.** Choosing an activity opens rooms, highlights the activity, and
  presets its timer recipe — but the countdown does **not** begin. Added a *Prepared timer* strip so the
  teacher could review the sequence before starting.
- **Broadcast → recorded → TIP → manual Start**, made explicit with a flow strip.
- **Four activities, four recipes:** Dialogue, Intensive Exercise, Operation Grandma, Carousel.
- **Yellow became the active colour** — active turn, handoff, running timer, selected activity.
  **Green was reserved for success and ON AIR only.** The running-timer status, the activity chip and the
  selected activity card were all moved off green.
- **Solo** restricted to the product rule: uneven students, or a partner leaving / turning devices off.
  Declining consent or leaving your own room → wait in the Main room, never Solo.
- **Helper mode created.** It did not exist in v15 — this was a first pass, not a preservation.

---

## Phase 3 — Carousel and the teacher-facing panel (v17 → v18)

**v17 — Rooms panel cleanup + Carousel as a visual tool.**
- Stripped the PRD paragraphs out of the Rooms panel; the solo rule moved to an info tooltip.
- Broadcast button + state collapsed into one compact row.
- **Start hard-gated** — disabled until the broadcast had ended and the TIP was ready.
- **Carousel became two things:** still a Rooms activity, *and* a Main Room / Demonstration visual tool
  on the shared stage — explicitly not a camera filter. Introduced 8 built-in placeholder characters.

**v18 — Device controls, rooms panel, TIP recording.**
- **Mic and camera left the Control panel** and became overlay controls on the teacher video
  (neutral when on, red slash when off). The panel kept only Activities / Timer / Demo / Visuals.
- The Rooms panel became **no-scroll** (`overflow:hidden`) — crowding was solved by *removing* content
  from the default state, never by adding a scrollbar.
- **Close rooms** moved to the panel header.
- **Broadcast and TIP separated** into two controls; the timer recipe went behind a collapsed disclosure.

---

## Phase 4 — Hierarchy, layout and interaction (v19 → v21)

**v19 — Hierarchy refinement.**
- Control panel became **four equal-width buttons filling the row**; a global rule fixed button label
  alignment (the old `vertical-align` / `margin-right` icon hack was replaced with flex + gap).
- Timer duration controls made **permanently visible**; the recipe disclosure removed.
- **Corrected instruction model:** first action = *Broadcast & record instructions* (live + recorded together);
  only after it ends do the actions split into *Broadcast to rooms* + *Re-record TIP*.
- Carousel gained a real room preview.
- 🐞 **Bug caught by the harness:** the preview did not repaint on the 5s character swap, because
  `stepTick` paints in place rather than re-rendering. Fixed with a `slideSwapped` flag.

**v20 — Surgical fixes.**
- Removed the “recipe default” chip.
- 🐞 **“TIMER /” root cause:** `.info` was scoped to `.rp-meta` only, so the same `<i>` inside the Timer
  label fell back to a plain *italic letter i* — which reads as a slash. Made `.info` a proper global icon.
- **Prep countdown 3s → 5s** across all four recipes; the prep runner generalised to any N.
- 🐞 **Carousel “full-stage white overlay” root cause:** the character card was `inline-flex` with a
  `width:100%` child and an `aspect-ratio` — a circular sizing dependency that let it expand across the
  stage. Rebuilt as a contained **Room mirror** with fixed pixel sizes.
- Removed the last “Characters switch every 5s” leak — it was living in the recipe `cue`, which surfaced
  in the HUD caption.

**v21 — Visual-layer cleanup.**
- **Popover lifecycle:** click-outside dismisses the Visual tools popover but **never** stops a running
  Carousel layer; *Stop carousel* stops the layer *and* closes the popover.
- **One activity HUD stack, top-right:** timer on top, room visual underneath, capped at 34% of the stage.
  Timer trimmed 96px → 74px so the teacher stays dominant.
- The room visual shows **only the visual** — no pills, no second countdown, no Done, no labels.
- **Placeholders became grammar cues:** Masculine (זכר) / Feminine (נקבה) / Plural (רבים).
  Deliberately not a roleplay character deck — the Carousel practises gender and number.
- Timer recipe reduced to flat metadata rows.

---

## Phase 5 — Behaviour and polish (v22 → v25)

**v22 — Running-timer controls, Grandma auto-flow, compact recipe.**
- **The running timer is never locked.** The disabled “Counting down…” button is gone.
  Start → **Pause** → **Resume** (from the exact remaining second, including mid-prep), with **Reset**
  available throughout — in both the Main-room timer and the Rooms panel.
- **Operation Grandma: one set, one Start.** The whole set now runs through automatically
  (5s › R1/S1 › R1/S2 › 5s break › R2/S1 › R2/S2 › Done). *“Start round 2” removed.*
  **Manual means starting the activity/set**, never stepping between internal rounds.
- Timer recipe collapsed to **one compact horizontal metadata line**.
- **Done** made brief and non-duplicated: HUD only, then the panel returns to ready with the next real action.

**v23 — Visual hierarchy + Helper-mode cleanup.**
- Timer recipe became a **hover-only tooltip** — not clickable, no open state, zero layout space.
- **Header flattened:** the TEACHER chip removed; ON AIR and the Rooms clock became status (dot + label)
  rather than buttons; a hairline separates statuses from layout actions; Reset layout demoted to a ghost.
- Panel statuses (*TIP ready*, *Paused · Student 1*) lost their pill borders.
- **Helper now sees the live teacher feed** — the black “you are not broadcasting” slate is gone.
- *Switch to Teacher* became a small secondary action.

**v24 — Header hierarchy + Helper layout polish.**
- When rooms run, **Rooms 07:30 becomes the primary time** and the session clock recedes; the decorative
  dot before it removed.
- **Helper can Edit and Reset their own layout** (a personal workspace, not a teacher action).
  🐞 Caught: `resetLayout()` handed the helper the *teacher’s* layout — made role-aware.
- *Switch to Teacher* moved out of the global header into the **Helper Mode panel header**.
- Helper mode became visibly **chat-centred** (chat column widened, lesson narrowed, info card lightened).

**v25 — Alignment cleanup.** *(this checkpoint)*
- Running statuses moved **into the Instruction title row** — they had been a separate row landing on top
  of the section divider.
- Header clocks lifted out of their nested wrapper into **one shared flex row**, so every status item sits
  on the same optical centre line and the two clocks share a baseline.
- 🐞 **HELPER label root cause:** `.tc-role.helper` (0,2,0) kept a yellow fill from an older block while a
  newer `.tc-role` rule (0,1,0) zeroed its padding — the label was jammed inside a zero-padding holder.
  Now a subtle holder with symmetric padding and the text exactly centred.

---

## Running principles across every pass

- **Scope discipline.** Each pass had an explicit scope and an explicit “not covered” list.
- **Additive, provably isolated changes.** Targeted `str_replace` edits with exact-count assertions,
  followed by a diff proving the change was confined to the intended regions.
- **No scrollbars as a crowding fix.** The Rooms panel’s no-scroll rule was treated as a hard constraint:
  content was removed, collapsed or moved to a tooltip instead.
- **Validated before delivery, every time.** `node --check` on all script blocks + a headless DOM-stub
  harness asserting behaviour *and* CSS. Several real bugs (the preview repaint, the “TIMER /” slash, the
  full-stage Carousel overlay, the helper reset layout) were caught this way rather than by eye.
- **Source files never mutated.** Every pass copied the previous stable file to a new version; checksums
  were verified before and after.
