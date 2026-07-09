# Chat System v1

Status: **stable / unchanged** except one approved refinement (light avatar stroke). Chat v1 is the middle rail CTA and the default sheet branch.
- Clean file: `components/chat-v1.html`. Live: `integrated/classroom-integrated-v1.html`.

## Purpose
In-call class chat for a Vitamin Session: students + teacher/helper exchange messages, with tabs to filter the stream.

## Structure
- **Tabs row** (`.tabs`): `All · Mine · Helper` — interactive filter tabs, 15px/600, with a 2px active underline. This is the divider reference for every other sheet header.
- **Message list** (`.msgs`): grouped messages, reply quotes, helper/own styling.
- **Composer**: input + send.

## The divider source of truth
The `.tabs` bottom border is the canonical bottom-sheet divider, reused by Timeline and Participants:
- weight **1px**; light `rgba(55,50,48,.12)`; dark `rgba(255,255,255,.14)`.
- rhythm: title/tab row `padding:6px var(--s16) 0`, label `padding:6px 0 10px`, then the border.

## The avatar stroke source of truth
Chat **light** avatars carry a `box-shadow: 0 0 0 .5px #373230` ring — the canonical light-mode **object outline**, reused by Participants (avatars, search, level dot) and Timeline (live row, next card). Chat **dark** avatars have **no** stroke, so dark variants elsewhere stay minimal.

> Divider ≠ object outline. Divider = `.tabs` alpha colors; object outlines = 0.5px `#373230`. Keep them distinct.

## Approved refinement in this batch
- Light avatar stroke formalized as the 0.5px `#373230` ring. No other Chat change. Validation marker `class="t on">All<` must remain present.

## Not changed
Tabs, message grouping, reply quotes, composer, dark translucency, helper/own bubble logic — all unchanged. Helper visual differentiation is an open refinement (see DESIGN_DECISIONS).
