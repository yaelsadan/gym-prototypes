# CHANGELOG — Citizen Café · Desktop Playground

---

## v03 — level data correction (this pass)

v02 treated the colour list in
`Checkpoints/student-main-classroom-mobile/docs/TIMELINE_PARTICIPANTS_SHEETS_V1.md` as the
canonical level ladder and built a symmetrical top edge on top of it. That was wrong on both
counts. Product-data only; no structural or visual changes.

### Why the previous source did not qualify

A search of the whole repo — `Current/`, `Checkpoints/`, `Archive/`, `Docs/`, `.cursor/`, all
READMEs and CHANGELOGs, and inside the large prototype HTML files — found **no authoritative
level ladder**. The list v02 relied on fails on three independent grounds:

- It is headed **"Level palette (real — sampled)"** — swatches lifted off designs.
- It says of itself **"Not in the Design Bible yet"**, and the Design Bible, `ASSET_MANIFEST` and
  `DESIGN_DECISIONS` it points at are not in this repo.
- It lives under `Checkpoints/`, and `Docs/gym-functional-flow-contract-v1.md` L24 says plainly:
  *"Files in Archive, Checkpoints, or playground files are not source of truth."*

Every other appearance of those colour names — Participants rows, chat halo maps, the Teacher
Cockpit roster — is hardcoded mock data, partial and inconsistent between files. No `level.*`
tokens exist. Nothing in `Docs/` or in the active Gym prototypes states a level count or an
ordering.

### Removed

- **The inferred Indigo top edge.** `eligibleBand()` no longer clamps the upper bound at all. The
  spec defines the Red / Orange bottom edge and says nothing about a top, so no top-edge rule is
  implemented and none is implied.
- **`GP.LEVELS` and `GP.levelIndex`** from the shared primitives. An ordered array sitting in a
  product-neutral file was exactly the thing that made an ordering look established.
- The **Indigo (top edge)** dev-panel button.

### Changed

- The primitives now expose **`GP.LEVEL_PALETTE`**, an unordered map of swatches, plus
  `GP.levelMeta()`. The comment states in full why it carries no ordering. Level order is product
  data and now lives in `cafe-states.js` with the flow that needs it.
- The ladder is split so the boundary cannot be missed:
  `LADDER_BOTTOM = ['red','orange']` (specified, load-bearing),
  `LADDER_ABOVE` (provisional filler, replace wholesale),
  `LADDER_TOP_KNOWN = false`.
- `eligibleBand()` returns `atBottomEdge` — the one specified clamp — instead of a generic
  `clamped` covering both ends. `beyondPlaceholder` and `renderableHi` exist purely so the
  playground can draw a band when the filler runs out, and are never shown in product UI.
- The bottom-edge line is rephrased away from ladder language: *"You're at the lowest level…"*
  and *"There aren't three levels below you…"* rather than *"You're at the edge of the ladder"*.
- Dev panel levels relabelled to mark what is real: **Red — lowest (specified)**, **Orange
  (specified)**, **Yellow — placeholder**.

### Validation

Harness 32 → **35 / 35 passing**. The Indigo assertion was replaced by its inverse. New coverage:
only two rungs are marked specified and `LADDER_TOP_KNOWN` is false; the primitives expose an
unordered palette with no `GP.LEVELS` or `GP.levelIndex`; **no top-edge clamping is applied** and
no edge line is shown at the top of the placeholder data; the bottom-edge line appears only for
Red or Orange on "and below", and not for Red on "exactly my level"; and the UI never surfaces
the word "ladder" or a placeholder level name in any level × scope combination.

### Docs

`README.md` gains a section explaining why the repo's colour list is not the ladder.
`notes-for-next-pass.md` gains a new blocking item at the top of Part 2 listing what is actually
needed: the ordered list and its length, confirmation that Red is lowest from a level source
rather than from the Café edge rule, whether a top edge exists, and whether levels are a linear
ladder at all — since "3 levels lower" presumes they are.

---

## v02 — spec corrections (this pass)

v01 guessed at three things that the Café product spec already defines. This pass replaces the
guesses with the specified behaviour and moves them out of the open-questions list. No new
screens; no visual refinement.

### Matching preferences — invented content replaced

- Removed the v01 **topic** preference (Anything / Small talk / Food & ordering / Work & studies)
  and the **session length** preference (5 / 10 / 15 min). Both were invented.
- Added the three product options, exactly: **Exactly my level**, **My level and below** (up to
  3 levels lower), **My level and above** (up to 3 levels higher).
- The knock-on removals matter as much as the addition: the length claim is gone from the
  agreement intro and the ending copy, and the **topic strip on the live surface**
  (`.cafe-prompt`) was deleted outright — it existed only to display an invented preference.

### Level-edge rules — modelled, not narrated

> **Superseded by v03.** The claim below that the sampled palette was canonical, and the Indigo
> top edge built on it, were both wrong. Kept for history — do not cite this section.

- Added the canonical Citizen level ladder to the shared primitives as `GP.LEVELS`, sourced from
  `Checkpoints/student-main-classroom-mobile/docs/TIMELINE_PARTICIPANTS_SHEETS_V1.md` rather than
  invented: Red · Orange · Pink · Yellow · Light Blue · Blue · Lime · Green · Dark Green ·
  Turquoise · Indigo. Red is the bottom rung, Indigo the top, which is exactly what makes the
  ends of the ladder the edge cases.
- `eligibleBand()` computes the window and clamps it at both ends. Red on "and below" resolves to
  Red alone; Orange to Red–Orange; Indigo on "and above" to Indigo alone. One function, one place.
- **Kept out of the UI.** Each option shows its own qualifier and nothing else. The resolved band
  appears as one quiet `.pref-edge` line *only* when clamping actually narrows the choice, and
  never mid-ladder. Your own level shows as a quiet `.pref-me` identity line, not as a rule.
- Added a **Your level** row to the dev panel (Red / Orange / Yellow / Indigo) so all four edge
  cases are reviewable without editing code.
- The partner is now drawn from inside the eligible band and carries a level chip on the match
  screen, so the band is visible in review rather than implied.

### Session agreement — real content, per-session placement confirmed

- Replaced the three invented terms with the four specified ones: be respectful and welcoming;
  keep your camera on throughout the session; make your best effort to speak in Hebrew; create a
  safe and supportive environment for your partner.
- Hoisted them to a named `AGREEMENT_TERMS` constant so there is one copy.
- v01 raised "should this move into onboarding?" as an open question. It should not. The
  agreement is part of each match/session flow, and that is now recorded as locked.

### Automatic re-queue — specified, not a design choice

- Introduced `ST.matching` to separate the two lifetimes that v01 conflated. A **chat** ends at
  0:00 or on leave; a **matching session** ends only on an explicit stop or when the app closes.
  `ST.matching` survives `endSession()` and is cleared only by `stopMatching()`.
- Renamed the affordances to match: `leaveCafe()` → `endSession()` (it ends the chat, not Café),
  and searching's "Cancel" → **"Stop matching"**.
- Removed `ST.autoAgain` and the ending screen's **"Take a break"** button. They framed
  auto-requeue as an optional preference; it is not. The ending screen is now an interstitial
  with one shortcut ("Find someone now") and one exit ("Stop matching").

### Moved into the shared primitives

Two additions were product-neutral and belong to the Citizen system, not to Café: the level
ladder with its charcoal-stroked `.level-dot` (the same treatment as the Gym Participants row),
and `.g-choice.stacked`, a two-line variant of the choice chip for an option with a qualifier.

### Validation

Harness grew from 21 to **32 / 32 passing**. Eleven new assertions cover the corrections: the
three scopes are exactly the product options with their exact qualifiers; a mid-ladder student
gets a full 3-level window; each of the three ladder-edge cases clamps correctly; the edge line
renders only when clamping bites; the drawn partner lands inside the band across every level ×
scope combination; all four agreement terms are present; the agreement reappears on the second
match of the same matching session; `ST.matching` survives a chat ending and is cleared only by
an explicit stop; the ending screen has no pause affordance; and no invented topic or length
content survives in any state.

### Still open

The long-wait / no-eligible-partner question stays open, deliberately. It is now the headline
item in the notes, with the Red-on-"exactly my level" case called out as its sharpest form.

---

## v01 — scaffold (this pass)

The first Café surface. Built as a sibling of Gym: the design system was ported out of the
existing prototypes rather than re-derived, and the Café-specific work was kept in its own files
so the boundary stays visible.

### Structure

- Split into five files instead of the usual single self-contained HTML, specifically so that
  `gym-primitives.*` and `cafe.*` can be read as separate things. Plain `<link>` and `<script>`
  tags, no modules, so it still opens from `file://` with no build step.
- Adopted the Gym playground contract unchanged: fixed `#modeBtn`, `body.present`, `.controls`
  rows with `.grp-lbl` / `.on` / `.play` buttons, a live `#stateNote`, a 1280×760 `#frame`, and
  hash + query deep links.

### Ported from Gym, values unchanged

- Tokens, `.frame` ambient, `.btn` family, `.lockup`, glass panel/card, `.preview`, the full A/V
  check layout, `.t-loadline`, `.soft-loading-ball`, `.w-dots` — from
  **student-transition-screens-desktop**.
- Video tile with name pill and yellow turn inset, footer capsule and `.rc-btn`, the `.clock.vt3`
  ring (r 26.5 in a 64 viewBox, 1.4 stroke, ball r 4.6 painted last, coral at ≤5s), the milky
  modal with `.respline.s10`, `.schip` — from **student-practice-rooms-desktop**.
- Chat panel, message bubbles, composer — from **student-main-classroom-desktop**.
- Inline SVG icon set and the `hubTipAttrs()` / `.hub-tip-layer` tooltip contract.

Practice-Room-specific class names were neutralised on the way in (`.demo-half` → `.g-tile`,
`.demo-split` → `.g-split`, `.controls-footer` → `.g-footer`, `.w-panel` → `.g-panel`) so they
read correctly outside a Gym room. Nothing about their geometry or colour changed.

### The seven states

`entry → searching → matched → agreement → avcheck → live → ending → searching`.

- **Entry** — frosted panel, two placeholder preference groups on the shared `.g-choice` chip.
- **Searching** — concentric-ring orb, elapsed counter, cancel. Auto-advances.
- **Matched** — two faces and a link, topic and length as chips. A 4s beat, then advances.
- **Agreement** — three terms, two-sided accept. Resolves correctly whichever side accepts first.
- **A/V check** — the Gym A/V check reused, Café copy. The ready button is gated on permission.
- **Live** — 2-up tiles, ambient session pill, contextual chat, footer controls, topic strip.
- **Ending** — recap, then re-queues automatically with a small ring countdown.

### Café posture decisions

- **No drill ring on the live surface.** Gym Practice Rooms put a `.clock.vt3` on the tile and
  turn it coral in the final 5 seconds. Café uses the flat `.g-timepill`, which warms to yellow
  in the last 15s and never goes coral. Time is status, not pressure. The ring appears once, at
  `sm`, for the re-queue countdown — the one moment where a hard deadline is the point.
- **No turn system.** `.g-tile.turn` is carried in the primitives and left unused. Café has no
  assigned speaker.
- **Chat is in.** Gym forbids chat in Practice Rooms; Café is not a Practice Room. Scoped to the
  live session only, and the harness asserts it cannot leak into any other state.
- **Warmer shell.** `.cafe-shell` adds a yellow wash at the top-left and sits lighter than the
  Practice Room `#1e1b18`. `.cafe-shell.deep` is the live-session variant.
- **Fewer chips.** Chips appear on exactly two surfaces (match found, and the live topic strip).

### Held back on purpose

No first-use onboarding. No Hub integration. No mobile surface. No functionality beyond the seven
supplied states — in particular the topic strip only reflects what the pair agreed to, it is not
a prompt generator.

### Validation

Both JS files parse. A headless DOM-stub harness runs **21 / 21**: every state renders clean HTML
with no `undefined` or `NaN`, every timed transition fires on the right tick, the agreement
resolves from either side, the A/V ready button is gated, camera-off reaches the tile, chat is
absent everywhere except the live session, the live surface carries no drill ring, entry
preferences survive into session copy, and `mmss` is correct.

> **Caught during the pass:** the topic label "Food & ordering" was being injected into markup
> unescaped. `topicLabel()` and `lengthLabel()` now return HTML-safe strings, and the preference
> chips escape their own labels.

### Font handling — a deliberate divergence

The Gym prototypes base64-embed Fedra, which costs ~500KB per file. This scaffold points
`@font-face` at `../FedraSerifPRO_HL-*.otf` instead. Those files are gitignored, so Fedra renders
locally and falls back to Georgia on a clean clone. Embed at export time if a shared review needs
the real face.

### Untouched

No file outside `Current/cafe-playground-desktop/` was created, modified or renamed. The root
`index.html` prototype directory was left alone.
