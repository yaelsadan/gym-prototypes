# Set transition playground — Mobile · Checkpoint

**Checkpoint name:** `student-transition-screens-set-animation-playground-v1-approved`
**File:** `index.html`
**Source file:** `Current/student-transition-screens-set-animation-playground/index.html` (md5 `42fa40cf5e43aaabe465a0d77191123c`)
**Frozen:** 23 Nov 2026, the approved 1st, 2nd and 3rd Set variations, before they were integrated into
`Current/student-transition-screens-mobile/index.html`.

`index.html` is the source file with one packaging change: its four relative asset URLs (two
FedraSerifPro fonts and two session images) were repointed from `../` to `../../Current/`, so the copy
renders from this folder. Nothing else differs.

## What it covers

- **1st Set** — the ball drops between the open paddles, squashes the "s" of "1st", rebounds and is
  caught as the paddles close into the Gym mark.
- **2nd Set** — enters low on the left, bounces off the right edge and higher off the left edge, and is
  lobbed into the closing paddles. One ballistic flight under one gravity.
- **3rd Set** — thrown in from beyond the right edge onto the left paddle, passed left → right → middle
  (each hit a short swing from the handle butt), and caught as the paddles close. The ball is yellow
  throughout.

Review harness: Replay, Pause, 1× / 0.5× / 0.25× / 0.1× speed, a scrubber with marks, background
opacity. URL params `?set=1|2|3`, `?t=<ms>` (paused frame), `?op=<0–100>`. Keys 1 / 2 / 3, R, Space.
