# CHANGELOG — Student Practice Rooms · Mobile

From the first mobile rooms pass to this checkpoint (**v6**).

Each version was built on top of the previous stable file, with the source left byte-identical and a
diff proving every change was confined to its intended region.

---

## v1 — the first mobile-native pass

The first mobile Practice Rooms surface. Behaviour taken wholesale from the **Desktop v21 checkpoint**;
the layout designed from scratch for a phone.

### Mobile stack layout
- **Vertical Duo stack** — partner on top, self on the bottom, closest to the thumb. No two-column
  assumption from the desktop survived.
- Popups became **bottom sheets** (consent, camera/mic, partner-left, Leave & report) — thumb-reachable,
  not centred modals.
- Controls in the thumb zone: **TIP · Camera · Mic** as 58px targets, with **Leave & report** as a lighter
  ghost pill beneath them.

### The activity seam area
- The portraits put the faces at roughly **y 208** (partner) and **y 624** (you). The seam band between
  them (**y 344–488**) became the **single activity zone**: the 5s countdown, the timer, the prepared
  pill, the Carousel cue and the Done badge all live there, so **none of them can cover a face**.
- **One timer position.** Desktop attaches the timer to a tile corner for Grandma and Carousel; on a
  378px-wide phone that crowds. Mobile keeps one timer, on the seam, for every activity.
- **Carousel collision rule:** a running Carousel puts the timer (112) + gap (22) + cue (116) = 250px on
  the seam inside a 378px screen — both fully visible, neither overlapping.

### The mobile activity timer
- The desktop v21 component, unchanged in geometry: **fill-forward** (charcoal track → yellow progress →
  **coral `#F9746B` in the final 5 seconds**), one stroke weight of 1.4, ball fill r 4.6 painted last so
  the arc endpoint can never be exposed, and **`requestAnimationFrame` interpolation** so the arc and the
  ball never jump once a second. Sized 112px for mobile.

### Waiting / return transition
- The **matkot** transition, mobile-sized. `ST.roomLeft` is the single source of truth for the header
  *and* the waiting screen; the countdown keeps running while the student waits, goes yellow in the
  final 10s, and returns them to the Main Room at 00:00. The loader is a fallback only.
- The **matkot fix** came across intact: the ball carries a charcoal stroke, and the room clock **never
  re-renders the frame** — it writes the countdown in place, so the Lottie is never destroyed and
  reloaded. No scratched-disc loop.

### Report screen
- Full-height dark surface, safe-space chip, textarea, **Submit** / **Skip** — both routing to
  waiting / return.

### Solo state
- Placeholder: a Solo chip, a heading, a one-line reason (partner-left vs uneven students) and an
  explicit **Activity TBD** tag.

### Routing matrix inherited from desktop
- Consent decline, own camera/mic off, leave room, report submit/skip → **waiting / return, never Solo**.
- Partner left / unavailable, and uneven students → **Solo**.
- Room clock 00:00 → return to the Main Room, muted.

### Kept out
- No chat, no reactions, no participant rail, no written dialogue prompts.

> **Caught during the pass:** the room clock was being auto-started on room entry — a divergence from
> desktop v21, where it starts only on a waiting path. It was ending the room mid-Grandma. Aligned.

---

## v2a / v2b — two layout variants for comparison

Two directions were produced side by side so they could be compared. Shared refinements landed in both:

- **The 5-4-3-2-1 countdown** grew from 96px to **144px** (A) / 124px (B).
- **The room timer** grew from 14px to **19px**, bold and tabular.
- **The name chips rose** — the bottom one from `top:68px` to the tile's own top edge.

**Variant A — immersive / minimized header.** Full-bleed video. The header collapsed to just the **X**
and the **room timer**; tapping the timer revealed `Gym · with Niv Rubin · Dialogue`. No hover anywhere.

**Variant B — contained video tiles.** A visible compact header, the stage as a padded column on a warm
dark surface, tiles rounded with a hairline edge, and a footer with more room.

**The comparison that mattered:** containing the video **costs face clearance**. Variant A kept 76–92px
between the seam UI and the faces; Variant B — with shorter tiles — dropped to 22–28px. That trade-off
was surfaced with numbers rather than hidden.

**Variant B was stopped. The immersive direction continued.**

---

## v4 — transition typography + auto-hide chrome

### Matkot transition typography
- **FedraSerifPro** was embedded from the same licensed base64 as the desktop checkpoint and applied to
  **exactly one selector**: `.t-headline`. Supporting copy, the muted pill, the waiting countdown, the
  chips, the controls and the room timer all stay on **Assistant**.

### Auto-hide chrome
- On room entry the chrome shows for **3s**, then fades over **200ms**. A tap on the video brings it back
  for **3.8s**. A tap on a control **resets** the timer instead of hiding. No hover.
- **Opacity only** — no `display:none`, no height change, no reflow. The video cannot jump. Hidden chrome
  is `pointer-events:none` so it never swallows a tap.
- The class is toggled on `#screen`; the room is **never re-rendered** to hide chrome, so the START chip
  and the Carousel loader are not restarted.
- **What hides:** the close X, the expanded room context, TIP / Camera / Mic, Leave & report, the footer
  scrim. The header scrim only dims to 50%.
- **What never hides:** the room timer, the **name chips**, the START chip, the active-turn frame, the
  activity timer, the countdown, the Carousel cue and the Done badge — asserted explicitly in CSS so a
  future pass cannot sweep them in.
- **Blocking surfaces pin the chrome open:** consent, the camera/mic warning, partner-left, Leave &
  report, TIP, report, waiting / return and Solo.

---

## v5 — the top name chip stops moving

Two problems, not one.

1. **It moved.** The partner chip sat at `top:104px`, jumped to **156px** when the header reveal opened,
   and went back when the chrome hid. It should never have moved.
2. **It could not simply rise.** The close X sat at `x 16–48, y 52–84`. Anything 32–44px above 104px lands
   inside it.

**The X moved to the right cluster**, and the tile's top-left corner became the chip's.

- Name chip: **`top: 64px`** — **40px up**, 16px clear of the status bar.
- The chip's `top` is declared once across the base, `hdr-open` and `chrome-off` selectors, so **every
  state resolves to the same value**. It cannot animate.
- The header reveal became right-aligned so it can never reach the chip.
- Left alignment and the layered chip styling were untouched. The bottom chip stayed at 12px.

---

## v6 — header hierarchy: status vs chrome (this checkpoint)

The header was a flex row — `[spacer][timer][X]` — so the **X reserved 32px + a 10px gap and pushed the
room timer inward**. That is backwards: the **room timer is persistent status**, the **X is chrome**, and
chrome must never dictate where status sits.

- **The chevron was removed** from the markup and the CSS.
- **Both became absolutely positioned** inside the header box — no flex interaction, no reserved space, no
  relationship between them at all.
  - Room timer: `top:4 right:12` → **y 52–83, x 242–366**. Its right edge moved **46px further right**
    (320 → 366), 12px from the screen edge.
  - Close X: `top:44 right:12` → y 92–124, x 334–366 — a floating overlay action, 9px below the timer.
  - The reveal drops below the X, still right-aligned.
- The timer's `position / top / right` now resolve **identically with the chrome on and off**, and the X's
  opacity cannot move it, because the X is not in its layout flow.
