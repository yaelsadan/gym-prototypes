# Notes for the next Café mobile pass

Frozen at **mobile v02 — the early flow reworked**.

Mobile is now the primary Café design surface. `Current/cafe-playground-desktop/` is the
frozen initial scaffold and reference; it was not modified in this pass and nothing here has
been propagated back to it.

---

## What v02 changed

Entry, A/V check and searching only. Match found, the agreement, live and the ending are
unchanged from v01 and are still awaiting their own pass.

1. **The flow order changed.** A/V check moved from between the agreement and the room to
   before matching, and runs on **every** Café entry — not only on first use, and not only when
   browser permissions are missing. The canonical path is now
   `entry → A/V check → start matching → searching → match found → agreement → live`.
   Entry's CTA is therefore a continuation (*Check camera & mic*) and the real *Start matching*
   lives at the end of the check. The agreement now leads straight into the room.
2. **The A/V check serves two jobs, and the screen has to show both.** Technical readiness —
   the right camera, the right microphone, the right output when headphones are attached, and
   a mic test you can actually hear back. And personal readiness — a large self-view, and a
   beat to fix your framing before a stranger sees it. The Gym A/V block is untouched: the mic
   test and the device row are additions in the same glass, and the only geometry change is
   that the block starts higher to fit them.
3. **Entry opens with only your own level selected.** v01 opened with everything selected.
   *Select all levels* is now an accelerator, not the default.
4. **The pool bar is gone.** Widening a search is not progress toward completion, so it no
   longer looks like a progress indicator. It is a sentence now:
   *1 level selected · A narrower search may take longer.*
5. **Your level is said once.** v01 said it in a pill above the chips and again inside the chip
   marked YOU. The chip is the only place now — ringed in yellow, marked *· your level*,
   selected. The heading above the chips just asks the question.
6. **Type went up across the early flow.** The Café headline is 42px, supporting copy is 19px,
   the level chips are 17px in 48px targets, and the small uppercase helper labels are gone.
7. **Searching gained an optional deck and lost its pill row.** The selected levels are one
   line — *Searching across 4 levels · Edit* — and *Edit* opens the same chips in a milky sheet
   without pausing the queue. *While you wait / Practice a few flashcards* is offered as a
   secondary activity; it is the Gym Solo Room deck, and a match interrupts it exactly as it
   interrupts the Hub. Declining returns you to the card you were on.
8. **No self-view while searching.** Readiness was settled before the queue, and the queue is
   not a pre-call lobby.

---

## Part 1 — Decisions this pass locks

### Design system

1. **Café is a sibling of Gym on mobile too.** The phone shell, statusbar, transition shell,
   session lockup, A/V check block, live video stack, participant labels, room clock, glass
   dock, Leave & report and milky bottom sheets are the existing Gym mobile components at
   their existing values, taken from `student-practice-rooms-mobile` and
   `student-transition-screens-mobile`. There is no separate Café visual system.
2. **The file boundary is the point.** `gym-mobile.css` / `gym-mobile.js` are product-neutral:
   they may not name a product or encode a flow. Anything that needs to know it is Café lives
   in `cafe-mobile.css` / `cafe-mobile-states.js`.
3. **Live Café is the Practice Room shell, not a generic video call.** Vertical stacked split,
   cream Assistant participant labels in one fixed position per tile, the flat top-right room
   clock with the yellow final-seconds treatment, the floating milky-glass dock, the mic-off
   flag, the cream camera-off face, Leave & report.
4. **No drill countdown ring in Café.** The `.clock` fill-forward ring with its coral final
   five seconds is Gym activity language. Café uses the ambient room clock only.
5. **No turn system in Café.** No yellow active-turn frame, no "Your turn" chips.
6. **Decision surfaces are milky sheets with a scrim; tool panels are dark glass with none.**
   Match found, the agreement and Leave & report scrim and blur what is behind them. The
   activity/text panel does not, because dimming the person you are speaking to is wrong.
7. **Coral is error only** — the device-off slash and the Leave action. Never in the happy path.
8. **Fedra is display only** — Café headlines, the A/V check title, the partner's name on the
   match card. Every control, chip, timer and body string is Assistant.
9. **Prototype tooling never enters the phone.** Controls, the state note and the note cards
   live outside `#screen`.

### Product

10. **Matching preferences are eligible levels, not scope presets.** The three abstract cards
    from the desktop scaffold (`Exactly my level` / `and below` / `and above`) are replaced.
    The choice is a multi-select set of levels, opening with only your own. The screen must
    always answer three things at once, and currently does: which level is yours, which levels
    you are open to, and how the size of that set changes the pool — each said exactly once.
11. **No ladder is asserted anywhere.** `LEVEL_DATA` is an unordered set. Nothing in the UI
    implies an ordering, a count, an above/below relationship, or a top and bottom edge. The
    desktop scaffold's `eligibleBand()` / `LADDER_ABOVE` machinery is deliberately **not**
    ported — it existed to model "3 levels lower", which this model no longer needs.
12. **Searching is not a waiting room.** Matching is a background process. It starts at
    "Start matching" and stops only at "Stop matching". Leaving the search screen does not stop
    it; the persistent indicator carries it. What is offered on the screen — the flashcard deck
    — is optional and must never become a reason to stay.
12b. **The A/V check is mandatory on every entry, and it is not only technical.** Its second
    job is giving the student a moment to be comfortable being seen before someone is matched
    to them. That is why it sits before matching rather than after the agreement, and why the
    self-view is the largest thing on the screen.
13. **Match found is a 30-second interrupt with real content** — avatar, name, level, location,
    one onboarding-derived icebreaker. Accepting keeps the same surface and moves it to
    "waiting for the partner to confirm" instead of navigating. Decline, partner decline and
    expiry all route to the same place: background matching.
14. **The agreement appears only after both sides accepted.** Four product-specified
    principles, one acknowledgement, no decline. `AGREEMENT_TERMS` is the only copy of the list.
    The principles are statements, not tasks — no ticks, no per-item state.
15. **Café text is session-only.** It is an ephemeral contextual activity panel, not the Hub's
    chat product and not the Main Room's expanded chat. It shows the current activity by
    default, takes short typed answers, and says on the surface that nothing survives the chat.
16. **The ending has no primary CTA.** Matching never stopped, so "find someone now" would be
    a lie. The screen is an interstitial that returns to the Hub with the indicator running.

---

## Part 2 — Open questions

### Blocking

1. **Real level data.** `LEVEL_DATA` in `js/cafe-mobile-states.js` is the single declaration
   and is placeholder. What is needed:
   - the actual set of levels a given student is eligible to match with, and how it is derived
   - whether eligibility is symmetric (if A can meet B, can B meet A?)
   - whether the set is genuinely unordered from the student's point of view, or whether the
     product wants to communicate "easier / harder than you" — that is a substantive product
     question and would change this screen materially
   - whether the level *names* shown here (the sampled colour palette) are the names students
     actually see
2. **Can your own level be deselected? — PM confirmation.** It is currently selected by default
   and *is* deselectable, i.e. you can ask to meet only people at other levels. This is
   provisional and deliberately not hard-coded as product logic: `LOCK_OWN_LEVEL` in
   `js/cafe-mobile-states.js` is a one-line switch that makes your own chip mandatory and
   disabled. Flip it if product says the pool must always include your own level.
3. **Pool feedback honesty.** "A narrower search may take longer" is a claim about matching
   behaviour, hedged on purpose. If real pool sizes or wait estimates exist, this line should
   show them instead of asserting a direction.
4. **Editing levels mid-search.** *Edit* on the searching screen opens the chips in a sheet and
   the queue keeps running against the old set until the sheet is dismissed. Whether changing
   the set should restart the queue, and whether it should cost the elapsed time already
   waited, is unverified.
5. **The audio-output row.** It appears whenever an external output exists (`HEADPHONES` in the
   mock). Whether it should appear at all on a phone with no headphones attached, and whether
   output can be switched from inside a browser at all, needs a technical answer.
6. **Does the mic test gate anything?** *Start matching* is currently enabled whether or not the
   student ran the test. Making the test mandatory would guarantee working audio but adds a
   step to every single entry.

### Deliberately deferred

7. **Spin the Wheel** and **Challenge / Indie Practice** are entry points only. What this pass
   fixes is their place and weight: they lead the dock as conversation-support tools, ahead of
   the divider, with the Wheel carrying the yellow accent the way TIP does in Gym. The
   experiences themselves are a separate pass.
8. **Flashcards are a reference, not a system.** Five placeholder cards on the Gym Solo deck,
   enough to prove the interrupt and the return. No scheduling, no real deck, no progress, and
   no decision yet about *which* deck a waiting student should see.
9. **The Hub is not designed.** The grey field on state 3b exists only so the indicator has
   something to sit over, and says so on screen. When the Hub lands, the indicator needs a real
   home: it is currently a full-width pill above a placeholder tab bar. The final Café icon is
   also still open — the indicator uses the wordmark and a yellow dot.
10. **Whether the indicator can also deliver the match.** Right now the match arrives as a sheet
    over the Hub. Whether the indicator itself should ever become the notification, or whether
    there is an OS-level push when the app is closed, is undefined.

### Still unresolved from the desktop scaffold, unchanged

11. **Long wait / nobody available.** The search screen says one thing indefinitely. There is no
    threshold, no "nobody is around right now", and no moment where we suggest widening the
    selection. Now that entry opens narrow — your own level only — this matters more than it did
    in v01, and *Edit* on the searching screen is the obvious place to point at.
12. **Does declining affect the queue?** Can the same partner be re-offered?
13. **Does the agreement have a timeout?** Gym consent auto-declines after 10s with a
    `.respline`; the primitive is available and unused here.
14. **Partner drops mid-session.** Gym has a full routing matrix. Café has none.
15. **Report route.** "Leave & report" is the Gym language and both actions currently end the
    session. Café has no report screen; Gym's is `.report-wrap` and could be ported.
16. **Does the ending collect anything?** Gym's ending has feedback and a partner recap.
    Café's is deliberately thin.

---

## Part 3 — Smaller items

1. **One upstream Gym collision was not inherited.** Practice Rooms mobile moved the leave X to
   the top-left in a later polish pass without moving the top tile's participant label, so the
   two overlap there. Café shifts the top label to `left:56px` in `cafe-mobile.css` and leaves
   the Gym file alone. If Gym fixes it upstream, delete the Café override.
2. **The session is the real 6:00.** `DUR.session` is 360 so the clock reads truthfully. Use
   the "Jump to final 20s" control to review the final-seconds treatment. Everything else —
   search timeout, partner confirmation, the ending interstitial — is shortened for review.
   The 30-second response window is the real product value.
3. **No real media.** The video tiles and the A/V preview use the Gym mock portraits
   (`teacher-gai.png` as the partner, `pip-you.png` as you). There is no `getUserMedia` call;
   permission states are switched from the dev panel. The transition-screens prototype does
   request real permission and that code could be ported. The device list is mock hardware —
   two options per input, in `DEVICES` — and the mic test records and plays nothing.
4. **The partner is hardcoded** as Daniel, Light Blue, Berlin. The icebreaker is the sample
   string from the brief.
5. **No Lottie.** Gym uses the matkot animation for transitions; Café has no motif and the
   search orb is CSS-only. If Café gets one, `mountLottie()` in the Gym prototypes is the
   playhead-preserving version to copy.
6. **Copy is provisional throughout**, per the brief. Headlines, the pool line, "Keep looking
   instead", "Got it — let's talk" and the clock's "Chat" caption are all placeholders.
7. **Not linked from the root prototype index.**
8. **Unused but ported primitives**, kept because they are part of the shared language:
   `.btn.danger-soft` (used once), `.respline` at its Gym 10s default, `GM.loadLine`,
   `GM.toast`. Delete Café *usage* if it turns out unnecessary, never the primitive.

---

## Scope discipline

One pass, one surface. Do not touch the Gym prototypes from a Café pass. Do not redesign a
shared primitive to solve a Café problem — if Café needs something different, it needs a Café
class. Do not propagate mobile decisions back to the desktop scaffold without an explicit
decision to unfreeze it.
