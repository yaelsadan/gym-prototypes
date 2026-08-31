# Citizen Café — Desktop Playground

**Status:** scaffold, first pass
**Surface:** Café, student, desktop
**Entry point:** `index.html`

Café is a sibling of Gym, not a new product with a new visual system. It reuses the Gym
design system and interaction language. The difference is posture, not styling: Gym is
structured, guided and workout-like; Café is spontaneous, social, warm and lightweight.

This playground is the source of truth for Café states. It is not wired into any Hub page
and does not contain first-use onboarding.

---

## 1. How to open

Open `index.html` in a browser. No build step.

Two external requests: Assistant from Google Fonts, and nothing else. Fedra is loaded from
`../FedraSerifPRO_HL-*.otf` and falls back to Georgia when those files are absent (they are
gitignored, so a clean clone renders the fallback — see section 6).

Deep links:

| URL | Effect |
|---|---|
| `index.html#live` | opens straight into a state |
| `index.html?state=agreement` | same, via query string |
| `index.html?mode=presentation` | boots with the dev chrome hidden |

---

## 2. File structure

The repo convention is a single self-contained HTML file. This prototype deliberately splits
into five files so that the boundary between *reusable Gym primitives* and *Café-specific work*
is visible rather than implied.

```
cafe-playground-desktop/
├── index.html              playground chrome + #frame. No product markup.
├── css/
│   ├── gym-primitives.css  shared design system. Product-neutral.
│   └── cafe.css            Café only.
├── js/
│   ├── gym-primitives.js   shared component builders (GP namespace). Product-neutral.
│   └── cafe-states.js      ST + render() + the seven states.
├── README.md
├── CHANGELOG.md
└── notes-for-next-pass.md
```

**The rule that keeps this honest:** nothing in a `gym-primitives.*` file may name a product or
encode a flow. If a change needs to know it is Café, it belongs in `cafe.*`.

---

## 3. The seven states

The happy path is a loop, not a line:
`entry → searching → matched → agreement → avcheck → live → ending → searching → …`

| # | `ST.state` | What it is | Leaves when |
|---|---|---|---|
| 1 | `entry` | Café entry. The three matching scope options on a frosted panel. | "Find someone" |
| 2 | `searching` | Looking for a partner. Concentric-ring orb, elapsed time. | 8s → `matched`; "Stop matching" → `entry` |
| 3 | `matched` | Match found. Two faces, a link, and the partner's level. | 4s → `agreement` |
| 4 | `agreement` | Session agreement. The four specified terms, two-sided accept. | both accepted → `avcheck`; "Not this one" → `searching` |
| 5 | `avcheck` | A/V check. The Gym A/V check reused, Café copy. | "I'm ready" → `live` |
| 6 | `live` | Live Café session. 2-up tiles, ambient session pill, contextual chat. | 0:00 → `ending`, or "Leave" → `ending` |
| 7 | `ending` | Interstitial. Matching resumes on its own. | 10s → `searching`; "Stop matching" → `entry` |

Playground durations are shortened so a full loop is reviewable in under 90 seconds
(`DUR` in `js/cafe-states.js`). They are not product timings.

### The matching session vs. a single chat

These are two different lifetimes, and the distinction is specified.

A **chat** ends at 0:00 or when the student leaves. A **matching session** starts at "Find
someone" and ends only when the student explicitly stops matching or the app closes. One chat
ending never ends matching: the student is returned to the matching flow automatically and does
not re-enter Café. `ST.matching` models this — it survives `endSession()` and is cleared only by
`stopMatching()`.

### Matching preferences

Three options, exactly as specified. There is no topic and no length preference.

| Option | Window |
|---|---|
| Exactly my level | your level only |
| My level and below | up to 3 levels lower |
| My level and above | up to 3 levels higher |

#### The bottom edge is specified. The rest of the ladder is not.

The spec defines the Red / Orange edge behaviour: Red is the lowest level and Orange sits
directly above it, so "up to 3 levels lower" cannot be honoured in full for either. Red on "and
below" resolves to Red alone; Orange to Red–Orange. That clamp is enforced in `eligibleBand()`.

**There is no top edge.** The spec does not say how many levels exist, what follows Orange, or
what the highest level is, so no top-edge behaviour is implemented — `hi` is simply
`your level + 3`, unclamped. See section 4 for why the colour list in the repo does not
authorise an ordering.

The UI does not explain any of this. Each option carries its own qualifier and nothing more, and
the bottom-edge line appears **only for Red or Orange on "and below"** — the two cases where the
choice genuinely cannot be honoured. Nothing above Orange ever shows it.

##### Level data is TBD

`LADDER` in `js/cafe-states.js` is split so the boundary is impossible to miss:

```js
var LADDER_BOTTOM = ['red', 'orange'];   // specified, load-bearing
var LADDER_ABOVE  = ['pink', 'yellow', …];  // provisional filler, replace wholesale
var LADDER_TOP_KNOWN = false;
```

`LADDER_ABOVE` exists only so the playground has something to render. It is not product data and
must not be cited as such. When the real ladder lands, replace that one array and set
`LADDER_TOP_KNOWN`; if a top-edge rule comes with it, `eligibleBand()` is the only place that
needs to change.

### Session agreement

Shown on every match, per the spec. Not onboarding. Four terms:

> Be respectful and welcoming. · Keep your camera on throughout the session. ·
> Make your best effort to speak in Hebrew. · Create a safe and supportive environment for your
> partner.

`AGREEMENT_TERMS` in `js/cafe-states.js` is the only copy of this list.

---

## 4. What was reused from Gym, and from where

Values were ported unchanged. Nothing in the Gym design system was re-derived or "improved".

| Primitive | Ported from |
|---|---|
| `:root` tokens, playground chrome, `.frame`, `.btn` family, `.lockup`, glass panel/card, `.preview`, A/V check, `.t-loadline`, `.soft-loading-ball`, `.w-dots` | `student-transition-screens-desktop/index.html` |
| Video tile (`.g-tile`, name pill, yellow turn inset, `.tile-flag`), footer capsule + `.rc-btn`, `.clock.vt3` ring geometry, milky modal + `.respline`, `.schip` | `student-practice-rooms-desktop/index.html` |
| Chat panel, message bubbles, composer, send button | `student-main-classroom-desktop/Mainclassroom- Student view-playground.html` |
| Icon set (inline SVG), `hubTipAttrs()` + `.hub-tip-layer` | `student-transition-screens-desktop/index.html` |
| `ST` + `render()` + `setState()` + `seedFor()` + 1s `clockTick` + hash routing + `syncSwitcher()` | all three Gym playgrounds |

**No Gym file was modified.** The primitives were copied out, not imported.

### Renamed on the way in

Gym class names that carried Practice-Room meaning were given neutral names so they read
correctly in a Café context. Structure, sizes and colours are identical.

| Gym | Here |
|---|---|
| `.demo-half` | `.g-tile` |
| `.demo-split` | `.g-split` |
| `.controls-footer` / `.room-footer` | `.g-footer` |
| `.w-panel` | `.g-panel` |
| `.av-card` glass treatment | `.g-card` |

---

## 5. Café-specific components

Everything below is new and lives only in `css/cafe.css` + `js/cafe-states.js`.

| Component | Class | Why it could not be a Gym primitive |
|---|---|---|
| Warm ambient shell | `.cafe-shell`, `.cafe-shell.deep` | Café sits lighter and warmer than a Practice Room. |
| Scope chooser | `.pref-groups`, `.pref-row`, `.pref-me`, `.pref-edge` (on the shared `.g-choice.stacked`) | No Gym surface lets a student state a matching preference. |
| Search orb | `.search-orb` | Calm concentric rings, not a spinner. Gym has no "waiting on a stranger" state. |
| Match reveal | `.match-pair`, `.match-face`, `.match-link` | Gym never introduces you to anyone; pairing is assigned. |
| Agreement card | `.agree-card`, `.agree-terms`, `.agree-partner` | Two-sided consent with a visible partner state. Gym consent is one-sided and teacher-driven. |
| Café room shell | `.cafe-room`, `.cafe-topbar`, `.cafe-tiles` | No teacher lockup, no activity recipe, no drill ring. |
| Ending / re-queue | `.cafe-ending`, `.ending-again` | Gym sessions end; Café loops. |

Two things moved the other way, into the shared primitives, because they are Citizen-wide rather
than Café-specific: the level colour **palette** (`GP.LEVEL_PALETTE`, `GP.levelMeta()`,
`GP.levelDot()`, `.level-dot` — the same charcoal-stroked dot the Gym Participants row uses) and
a two-line variant of the choice chip (`.g-choice.stacked`).

The palette is an unordered map of swatches, deliberately. Level **order** is product data and
stays in `cafe-states.js` with the flow that needs it, so nothing can read a ladder out of a list
of colours.

### Why the repo's colour list is not the ladder

The only full colour list here is in
`Checkpoints/student-main-classroom-mobile/docs/TIMELINE_PARTICIPANTS_SHEETS_V1.md` (line 58). It
does not authorise an ordering, for three independent reasons:

1. It is headed **"Level palette (real — sampled)"** — swatches lifted off designs, not a
   curriculum definition.
2. It says of itself: **"Not in the Design Bible yet — adopt as named `level.*` tokens."** The
   Design Bible, `ASSET_MANIFEST` and `DESIGN_DECISIONS` it points at are not in this repo.
3. It lives under `Checkpoints/`, and `Docs/gym-functional-flow-contract-v1.md` line 24 states:
   *"Files in Archive, Checkpoints, or playground files are not source of truth."*

Everywhere else the colour names appear — the Participants rows, the chat halo maps, the Teacher
Cockpit roster — they are hardcoded mock data. Nothing in `Docs/`, in the active `Current/` Gym
prototypes, or in `.cursor/rules/` defines a level count or an ordering, and no `level.*` tokens
exist. A sequence of hex swatches is not a progression, so this scaffold does not treat it as
one.

---

## 6. Deliberate divergences from Gym

These are the places where "same language, different posture" shows up. They are choices, not
oversights.

1. **No drill countdown on the live surface.** Gym Practice Rooms put a `.clock.vt3` ring on the
   tile and turn it coral in the final 5 seconds. Café uses the flat `.g-timepill` instead: time
   is ambient status, not pressure. The ring primitive is still available and is used once, at a
   small size, for the re-queue countdown on the ending screen.
2. **No turn system.** The `.g-tile.turn` yellow inset exists in the primitives and is
   intentionally unused. Café has no assigned speaker.
3. **Chat is present.** Gym allows chat only in the Main Room and forbids it in Practice Rooms.
   Café is neither. Chat here is a lightweight social channel next to a live conversation and is
   scoped to the live session only.
4. **Fedra is used for display only** — the entry headline, state headlines, the agreement title,
   and tile initials. Every control, chip, timer and body string is Assistant.
5. **Coral appears only as error.** It is on the A/V permission block and the device-off slash.
   Nothing in the Café happy path is coral.

---

## 7. Validation

Run against the files in this folder.

- **Syntax** — both JS files parse cleanly.
- **Headless harness — 35 / 35 pass.**
  - *Rendering* — every state produces non-empty HTML with no `undefined` or `NaN`.
  - *Transitions* — each timed hop fires on the right tick; the agreement resolves whichever
    side accepts first; entry and A/V check are correctly untimed.
  - *Spec: matching* — the three scopes are exactly the product options with their exact
    qualifiers; a student above the specified rungs gets a full 3-level window; Red "and below"
    resolves to Red alone; Orange "and below" stops at Red; the bottom-edge line shows only for
    those two cases and never for Red on "exactly my level"; the drawn partner always lands
    inside the eligible band.
  - *Level data discipline* — only two rungs are marked specified and `LADDER_TOP_KNOWN` is
    false; the primitives expose an unordered palette with no `GP.LEVELS` or `GP.levelIndex` to
    imply a ladder; **no top-edge clamping is applied**; and the UI never surfaces the word
    "ladder" or a placeholder level name in any level × scope combination.
  - *Spec: agreement* — all four terms are present, and the agreement appears again on the
    second match of the same matching session (so it is per-session, not onboarding).
  - *Spec: re-queue* — `ST.matching` survives a chat ending and is cleared only by an explicit
    stop; the ending screen offers no pause affordance and does communicate auto-requeue.
  - *Regression* — no invented topic or length content survives anywhere.
  - *Other* — the A/V ready button is gated on permission; camera-off reaches the tile; chat is
    absent outside the live session; the live surface carries no drill ring; `mmss` is correct.

**No live browser was available.** A human still needs to open this and look at it.

---

## 8. Font / licensing note

Fedra is a licensed face. Unlike the Gym prototypes, this folder does **not** base64-embed it —
`css/gym-primitives.css` points `@font-face` at `../FedraSerifPRO_HL-*.otf`, which are present
locally and gitignored.

- **Locally:** Fedra renders.
- **On a clean clone or GitHub Pages:** the files are absent and `--font-brand` falls through to
  Georgia. The layout is unaffected; only display type changes.

If a shared-link review needs real Fedra, embed it as base64 at that point, the way the Gym
prototypes do, and treat the result as a private export.

---

## 9. Known open questions

See `notes-for-next-pass.md`.

The one the spec deliberately leaves open is **the long wait**: matching continues in the
background, but what we communicate during an unusually long wait is undefined. The sharpest
version of it is that a Red student on "exactly my level" has the thinnest possible pool and a
predictably long wait — whether we ever suggest widening the band, and whether that reads as
helpful or as a downgrade, is a product call. The scaffold currently shows one unchanging
searching screen that always succeeds after 8s, standing in for that decision.

Also still unspecified: whether a partner can decline, whether the agreement has a timeout, real
session length, partner-drops-mid-session, and whether Café needs a safety route. There is no
mobile Café surface yet.

**Not open any more** (corrected in v02): matching preferences, the agreement content and its
per-session placement, and automatic re-queue. All three are specified and are now recorded in
Part 1 of the notes.
