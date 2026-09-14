"""Regenerate cafe-welcome-anim.js from the approved motion playground.

The engine body is copied verbatim out of the playground's inline <script>, so
the product plays the identical sampler and renderer rather than a second
implementation of it. Only the playground's boot/UI tail is dropped, and a small
mount API is appended.

Run from anywhere:  python3 Current/cafe-playground-mobile/js/cafe-welcome-anim.build.py
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[3]
SRC = ROOT / 'Current/cafe-welcome-cups-animation-playground/index.html'
OUT = ROOT / 'Current/cafe-playground-mobile/js/cafe-welcome-anim.js'

html = SRC.read_text()
m = re.search(r'\n<script>\n(.*?)\n</script>\n', html, re.S)
assert m, 'inline script not found'
body = m.group(1)

boot = body.index('\n(function boot(){')
engine = body[:boot].rstrip() + '\n'
assert 'function applyFrame' in engine and 'BASELINE_APPROVED_HYBRID_1' in engine

HEAD = """/* =========================================================================
   CAFÉ WELCOME CUPS — APPROVED FOR INTEGRATION · hybrid-1
   -------------------------------------------------------------------------
   GENERATED FILE. Do not hand-edit.

   The engine below is a verbatim copy of the motion playground's inline
   script (Current/cafe-welcome-cups-animation-playground/index.html), minus
   its boot/UI tail. The approved animation is the locked checkpoint
   ?restore=cafe-welcome-approved-hybrid-1: the current-choreography bubbles,
   morphs, rotations, timings, hold and descent, the current cup
   choreography, and the continuous liquid fill with its travelling surface
   wave and settle. Sampler pinned here, once, at the bottom of the file:
   POLISHED_VARIANT = 'none', LIQUID_VARIANT = 'fluid', baseline
   BASELINE_APPROVED_HYBRID_1.

   Regenerate with js/cafe-welcome-anim.build.py after any approved change in
   the playground. Nothing in here is playground UI: no controls, no
   compare, no scrubber, no debug labels.

   Everything is scoped inside the closure. Only window.CafeWelcomeAnim
   escapes, so the playground's names (ST, cafeCupsSvg, prefersReduced, …)
   cannot collide with the Café mobile globals of the same name.
   ========================================================================= */
(function(){
/* Deliberately not strict mode: the playground engine runs non-strict, and the
   copy below must behave identically. */

"""

TAIL = """
/* --------------------------------------------------------- approved playback
   The product plays the approved 3200ms source faster than the playground
   does, and reduces the finished mark. Those decisions are approved once and
   shared by every surface that mounts this animation, so mobile and desktop
   cannot drift apart. Nothing here reinterprets the choreography: the same
   source milliseconds simply arrive sooner.

   Values as approved on mobile (cafe-playground-mobile/js/cafe-mobile-states.js
   carries its own copy of them); change them together. */
var PLAY = {
  /* Reference rate: the 3200ms source over this. The opening runs hotter than
     it, so the real playback is shorter than this number. */
  REFERENCE_MS: 2650,
  /* The cups meeting and the droplets launching want urgency, so they run this
     much above the reference rate — full strength through the toast and the
     launch, easing back to the reference as the bubbles reach their
     conversation pose (left 1500, right 1510). From there the mapping is the
     reference rate exactly, so the settle, the hold, the return to the cups and
     the liquid fill keep their timing to the millisecond. */
  OPEN_BOOST: 0.24,
  BOOST_HOT: 1100,
  BOOST_END: 1510,
  /* Source ms at which the Welcome copy begins its fade-and-rise: as the mark
     closes, so the screen is never empty once the gesture has finished. */
  COPY_MS: 2860,
  /* Readable stillness after the mark completes, before the surface moves on. */
  HOLD_MS: 750,
  /* Advancing early runs the rest of the gesture out over this rather than
     cutting to the final frame. */
  RESOLVE_MS: 280,
  /* The finished mark is smaller than the animation that drew it, reduced
     across the cups' own closing phase. */
  MARK_SETTLE: 0.78,
  SETTLE_FROM: 2600
};
/* How much above the reference rate the gesture runs at a point of the source. */
function playBoostAt(ms){
  if(ms <= PLAY.BOOST_HOT) return 1 + PLAY.OPEN_BOOST;
  if(ms >= PLAY.BOOST_END) return 1;
  return 1 + PLAY.OPEN_BOOST
    * (1 - smooth((ms - PLAY.BOOST_HOT) / (PLAY.BOOST_END - PLAY.BOOST_HOT)));
}
/* On-screen milliseconds at which each step of the source is due, integrated
   once from the rate above. Sampling it, rather than multiplying by a rate, is
   what keeps the changing rate free of steps. */
var playMap = null;
function playTable(){
  if(playMap) return playMap;
  var base = TOTAL_MS / PLAY.REFERENCE_MS;
  var step = 8, real = 0, due = [0];
  for(var ms = 0; ms < TOTAL_MS; ms += step){
    real += Math.min(step, TOTAL_MS - ms) / (base * playBoostAt(ms + step / 2));
    due.push(real);
  }
  playMap = {step: step, due: due};
  return playMap;
}

/* ------------------------------------------------------------------ mount API
   The product surface gets the SVG markup, a "paint this millisecond" call,
   the durations above, and the source-time mapping. Where the mark sits, when
   the copy arrives on screen and how the header handoff runs are the surface's
   business, not the engine's. */

var READY = false;
function ensure(){
  if(READY) return;
  READY = true;
  applyStoredBaseline(BASELINE_APPROVED_HYBRID_1);
  POLISHED_VARIANT = 'none';   /* current-choreography bubbles and cups */
  LIQUID_VARIANT = 'fluid';    /* continuous rise + travelling wave */
  POLISHED_MOTION = false;
  POLISH_STRENGTH = 1;
  DEBUG_MOTION = false;
  MOTION_MODE = BASELINE_APPROVED_HYBRID_1.MOTION_MODE;
  prepMotion();
}

window.CafeWelcomeAnim = {
  BUILD: BUILD_ID,
  CHECKPOINT: 'cafe-welcome-approved-hybrid-1',
  TOTAL_MS: TOTAL_MS,
  /* Same viewBox the approved playground previews use. */
  markup: function(viewBox){
    ensure();
    return cafeCupsSvg(viewBox || '0 0 118 44');
  },
  frame: function(root, ms){
    if(!root) return;
    ensure();
    applyFrame(root, clamp(ms, 0, TOTAL_MS));
  },
  /* Approved product playback. */
  PLAY: PLAY,
  playDuration: function(){
    var m = playTable();
    return m.due[m.due.length - 1];
  },
  /* Source millisecond to draw at a given point of the playback. */
  sourceAt: function(real){
    var m = playTable(), due = m.due;
    if(!(real > 0)) return 0;
    if(real >= due[due.length - 1]) return TOTAL_MS;
    var lo = 0, hi = due.length - 1;
    while(hi - lo > 1){
      var mid = (lo + hi) >> 1;
      if(due[mid] <= real) lo = mid; else hi = mid;
    }
    var span = due[hi] - due[lo];
    return Math.min(TOTAL_MS, (lo + (span > 0 ? (real - due[lo]) / span : 0)) * m.step);
  },
  /* How large the mark is drawn at a given point of the choreography: full size
     while the gesture plays, easing down to its settled size across the closing
     phase, so it is already small when the cups come to rest. */
  markScaleAt: function(ms){
    var span = TOTAL_MS - PLAY.SETTLE_FROM;
    if(span <= 0) return PLAY.MARK_SETTLE;
    return 1 + (PLAY.MARK_SETTLE - 1) * smooth((ms - PLAY.SETTLE_FROM) / span);
  },
  reduced: prefersReduced
};
})();
"""

OUT.write_text(HEAD + engine + TAIL)
print('wrote', OUT.relative_to(ROOT), OUT.stat().st_size, 'bytes')
print('engine lines:', engine.count('\n'))
