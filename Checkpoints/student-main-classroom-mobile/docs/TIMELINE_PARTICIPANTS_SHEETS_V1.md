# Timeline + Participants Sheets v1

Two sheets sharing the Chat v1 shell, rail, snaps, and tokens. Refinement-only batch — no new visual direction.

## Where to find them
- **Clean (no classroom):** `components/timeline-v1.html`, `components/participants-v1.html` — each sheet alone on a plain background, dark + light, structural render.
- **Integrated (in the classroom):** `integrated/classroom-integrated-v1.html` — live, with teacher-video background, header gradient, rail, and switching.
- **Side-by-side review:** `integrated/sheet-states-previews.html` — reviewed states in phone frames (simplified self-view stand-in).

> Any self-view or header shown around these sheets in the integrated/preview files is a **simplified contextual stand-in**, not a redefinition of Self-view Behavior v1 or Classroom Chrome v1. See `source-of-truth/` and `INTEGRATION_NOTES.md`.

---

## TIMELINE (top rail CTA)

### Purpose
Show the session's lesson flow — done / live / next — plus an expandable next-session card.

### Structure
- Header: title **"Timeline"** (19px/700/-.2px — unified with Participants), divider matching Chat `.tabs`.
- Step list: node + connector + title. States: **done · live · upcoming**.
- Break divider ("3 min. break").
- Next-session card: expandable (eyebrow → title → subtitle → chevron); no date, no participant count.

### States
- **done** — warm taupe node, dotted softer connector, faded text.
- **live** — yellow node + pulse on a quiet warm-neutral surface; "Live now" dot+label. No yellow side bar.
- **upcoming** — neutral solid connector, neutral node.

### Light treatment (this batch)
- Divider = Chat `.tabs` `rgba(55,50,48,.12)`, 1px (heavy `.5px #373230` override removed).
- Nodes thinner (border 1px `rgba(55,50,48,.55)`; done node `rgba(55,50,48,.45)`); connector subtle.
- Live row + next card carry the 0.5px `#373230` object stroke. Yellow restricted to live node + "Live now".

### Dark treatment
Minimal — divider `rgba(255,255,255,.14)`; no object-outline language.

---

## PARTICIPANTS (bottom rail CTA)

### Purpose
Browse who's in the session. **Browsing only — no DM / no private messaging.**

### Structure
- Header: title **"Participants"** (19px/700/-.2px — the title size source of truth), divider matching Chat `.tabs`. **No count pill.**
- Search field (`var(--s24)` space above it).
- Grouped list: **Teaching team** → **You** → **Classmates**.
- Row = avatar (initial) + name + role chip + secondary text.
- **Level markers** kept: colored dot on the avatar; level name is the secondary text.

### Role chips
- **Teacher** — solid yellow (the one stronger chip), both themes.
- **Helper** — quiet: dark = subtle light outline; light = soft `rgba(55,50,48,.28)` outline, no fill.
- **You** — quietest: light = `rgba(55,50,48,.2)` outline.

### Level palette (real — sampled)
Red `#F9746B` · Orange `#F69601` · Pink `#F7A9F4` · Yellow `#FEE300` · Light Blue `#90C7FD` · Blue `#449CFD` · Lime `#D9EF82` · Green `#7EE07D` · Dark Green `#6E8C58` · Turquoise `#6BBEC4` · Indigo `#8A90FE`.
> Not in the Design Bible yet — adopt as named `level.*` tokens. See ASSET_MANIFEST + DESIGN_DECISIONS.

### Light treatment (this batch)
- Divider = Chat `.tabs` `rgba(55,50,48,.12)` (heavy override removed).
- Avatars + search: 0.5px `#373230` ring (== Chat light avatar).
- **Level dot: 0.5px `#373230` ring** added (light only), over the warm separator ring.
- Helper/You chips: softer outlines than the avatar/search stroke.

### Dark treatment
Minimal — only search field + Helper chip get a subtle light stroke.

### Responsive / snaps
Shared min/half/max snaps; content scrolls within the rail safe-zone (`--rail-zone` right padding); scrollbars hidden.

---

## Not in this batch
DM/private messaging, Group Room, Classroom Chrome, Self-view, Whiteboard. Open polish items in DESIGN_DECISIONS.
