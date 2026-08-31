# Notes for the next Café pass

Frozen at **v03 — level data correction**.

---

## Part 1 — Decisions that are now locked

Do not reverse these without an explicit product decision.

### Design system

1. **Café is a sibling of Gym, not a new visual system.** Tokens, buttons, tiles, modals,
   tooltips, loading language and typography come from the Gym prototypes at their existing
   values. A Café pass is never the place to redesign a shared primitive.
2. **The file boundary is the point.** `gym-primitives.css` and `gym-primitives.js` are
   product-neutral: they may not name a product or encode a flow. If a change needs to know it is
   Café, it belongs in `cafe.css` / `cafe-states.js`. Breaking this collapses the whole reason
   the prototype is split into files.
3. **No drill countdown on the live Café surface.** The `.clock.vt3` ring with its coral final
   5 seconds is Gym's activity language. Café uses the ambient `.g-timepill`.
4. **No turn system in Café.** `.g-tile.turn` stays in the primitives, unused here.
5. **Chat is scoped to the live session only.** It must not appear in entry, searching, matched,
   agreement, A/V check or ending. The harness asserts this.
6. **Coral is error only.** A/V permission block and the device-off slash. Never in the happy
   path.
7. **Fedra is display only.** Headlines, the agreement title, tile initials. Every control, chip,
   timer and body string is Assistant.
8. **Prototype tooling never enters `#frame`.** Controls, the note line and the presentation
   toggle live outside the product viewport.

### Product — from the Café spec

9. **Matching preferences are exactly three options.** No more, no fewer, and not paraphrased:

   | Option | Window |
   |---|---|
   | Exactly my level | your level only |
   | My level and below | up to 3 levels lower |
   | My level and above | up to 3 levels higher |

   There is no topic preference and no session-length preference. Both existed in v01 and were
   invented; they have been removed.

10. **The bottom edge is specified and enforced in the matching model.** Red is the lowest level
    and Orange sits directly above it, so "up to 3 levels lower" resolves to a narrower band for
    both: Red on "and below" gives Red alone, Orange gives Red–Orange. `eligibleBand()` in
    `js/cafe-states.js` is the only place this is computed.

11. **There is no top edge, and none may be added by inference.** The spec does not define how
    many levels exist, what follows Orange, or what the highest level is. `eligibleBand()`
    therefore does not clamp the upper bound at all. A top-edge rule may only be implemented
    from an actual product source.

12. **The edge rule is not overexposed.** The three options show their own qualifier
    ("up to 3 levels lower"), and that is all. The bottom-edge line appears only for Red or
    Orange on "and below" — never for Red on "exactly my level", and never above Orange. The
    words "ladder" and any placeholder level name are kept out of the UI entirely; the harness
    asserts this across every level × scope combination.

13. **The session agreement is per-match, per-session.** It appears on every match and does not
    move into first-use onboarding. Its content is defined by the spec:

    - Be respectful and welcoming.
    - Keep your camera on throughout the session.
    - Make your best effort to speak in Hebrew.
    - Create a safe and supportive environment for your partner.

    `AGREEMENT_TERMS` in `js/cafe-states.js` is the only copy of this list.

14. **Automatic re-queue is specified behaviour, not a design choice.** When a Café session ends,
    matching begins again on its own and the student returns to the matching flow. No re-entry
    into Café is required. The ending screen is an interstitial, not a decision point.

15. **The Café matching session ends only on an explicit stop or when the app closes.** One chat
    ending never ends matching. `ST.matching` models this and survives `endSession()`; only
    `stopMatching()` clears it. "Stop matching" is the single exit affordance, on both the
    searching and the ending screen.

---

## Part 2 — Open questions

### Missing product data — blocks real matching

0. **There is no canonical level ladder anywhere in this repo.** This was searched thoroughly.
   What exists:

   | Source | What it is | Why it is not authoritative |
   |---|---|---|
   | `Checkpoints/.../TIMELINE_PARTICIPANTS_SHEETS_V1.md` L57–59 | 11 colour names + hex | Headed *"Level palette (real — sampled)"*; says *"Not in the Design Bible yet"*; lives under `Checkpoints/`, which `Docs/gym-functional-flow-contract-v1.md` L24 excludes from source of truth |
   | Participants rows, chat halo maps, Teacher Cockpit roster | 4–9 colour names each | Hardcoded mock data, partial and inconsistent between files |
   | `Docs/`, active `Current/` Gym prototypes, `.cursor/rules/` | — | Contain no level count, no ordering, no `level.*` tokens |

   The Design Bible, `ASSET_MANIFEST` and `DESIGN_DECISIONS` referenced by the palette note are
   not in this repo. What is needed before matching can be built for real:

   - the ordered list of levels, and how many there are
   - confirmation that Red is the lowest — currently taken from the Café spec's edge rule, not
     from a level source
   - what the highest level is, and whether a top edge behaves like the bottom one
   - whether levels are even a linear ladder, or whether "3 levels lower" means something other
     than three positions in a list

   Until then `LADDER_ABOVE` in `js/cafe-states.js` is placeholder filler and `LADDER_TOP_KNOWN`
   stays false. Replace that one array; do not infer an ordering from a palette again.

### The one the spec deliberately leaves open

1. **Long wait / no eligible partner found.** The spec establishes that matching continues in the
   background, but not what we say during an unusually long wait. Everything below is unresolved:
   - At what elapsed time does the searching screen change what it says? Is there a threshold at
     all, or does it stay identical indefinitely?
   - Does a narrow eligible band get acknowledged? A Red student on "exactly my level" has the
     thinnest possible pool, and a Red student on "and below" has the same pool — the bottom
     edge means that choice buys them nothing. Their wait will predictably be the longest.
     Whether we ever suggest widening the band, and whether that would read as helpful or as a
     downgrade, is the substantive question here, and it is a product call, not a copy tweak.
   - Is there any state at all for "nobody is around right now", or does searching simply
     continue forever until stopped?
   - If matching genuinely continues in the background, can the student leave the screen? That
     implies a Hub-level presence indicator, which is out of scope for this playground but would
     change what the searching screen is for.

   The scaffold currently shows one unchanging searching screen with an elapsed counter, and it
   always succeeds after 8s. That is a placeholder standing in for this decision.

### Still genuinely unspecified

2. **Can a partner decline a match?** The prototype shows the partner accepting on a timer. What
   the student sees if the partner declines, or never responds, is undefined.
3. **Does declining a match affect the queue?** "Not this one" drops back to `searching` with no
   memory. Whether the same partner can be re-offered is undefined.
4. **Does the agreement have a timeout?** The spec defines the content and the placement but not
   a grace window. Gym consent auto-declines after 10s with a `.respline`; that primitive is
   ported and available if Café wants the same.
5. **Real session length.** `DUR.session` is 45s so the loop is reviewable. The actual length is
   unknown. Since the length preference was removed, nothing in the UI now claims a duration.
6. **Partner drops mid-session.** Gym has a full routing matrix for this. Café has none.
7. **Is there a safety or report route?** Café has no equivalent of Gym's "Leave & report", which
   sits oddly against an agreement whose fourth term is about a safe environment. The primitive
   (`.btn.danger-soft` in a milky modal) is ported and unused.
8. **Should leaving a chat confirm?** "Leave" is immediate. The milky modal primitive is ready.
9. **Does the ending screen collect anything?** Gym's ending has feedback and a partner recap.
   Café's is deliberately thin.

---

## Part 3 — Smaller items

1. **Mobile Café does not exist.** Gym has separate mobile files with a 390×844 `.phone` shell,
   bottom sheets instead of centred modals, and a thumb-zone footer. Café will need the same, and
   it is a separate pass — not a responsive tweak to this file.
2. **Level data is stubbed.** `ST.myLevel` defaults to Yellow — itself a placeholder rung — and
   is switched from the dev panel, which offers Red and Orange (the two specified rungs) plus
   Yellow as a stand-in for "somewhere above them". The partner's level is drawn from the middle
   of the eligible band so the band is visible in review. Real matching supplies both.
3. **The level palette should become shared tokens.** The Participants doc already flags this:
   *"Not in the Design Bible yet — adopt as named `level.*` tokens."* It currently lives as an
   unordered map in `GP.LEVEL_PALETTE`. When those tokens land, point the palette at them rather
   than restating the hexes — and keep it unordered, so ordering cannot leak back into a
   primitive.
4. **Unused-but-ported primitives**, kept because they are part of the shared language and will
   almost certainly be needed: `.g-tile.turn`, `GP.modal()`, `GP.toast()`, `GP.loadLine()`,
   `GP.progressDots()`, `.btn.danger-soft`, `.respline`. If a later pass decides Café genuinely
   never needs one of these, delete it from `cafe.*` usage, not from the primitives file.
5. **`.preview` mic level bars use green** (`--status-success`). That is the inherited Gym A/V
   check behaviour and is correct there, but it is worth confirming green reads right in Café,
   where green is not otherwise used.
6. **No real media.** Tiles are gradients; the A/V preview has no camera stream. The Gym
   transition-screens prototype does request real `getUserMedia` permission — that code was not
   ported, and the permission states here are switched from the dev panel instead.
7. **Partner is hardcoded** as "Noa". No portrait assets.
8. **No Lottie.** Gym uses the matkot animation for transitions. Café has no motif yet, and the
   search orb is CSS-only. If Café gets its own motif, `mountLottie()` from the Gym prototypes is
   the playhead-preserving version to copy.
9. **Not linked from the root prototype index.** `index.html` at the repo root was intentionally
   left untouched. Add a Café card there once the surface is worth reviewing.

---

## Scope discipline

One pass, one surface. Do not touch the Gym prototypes from a Café pass. Do not redesign a shared
primitive to solve a Café problem — if Café needs something different, it needs a Café class.
Validate with a syntax check and the headless harness before freezing.
