/* =========================================================================
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

/* Shown next to the previews. If this stamp is not visible on screen, the browser
   is serving an older copy of this file and the Compare buttons below reload with
   a fresh cache-busting parameter. */
var BUILD_ID = 'hybrid-1';

var ICONS = {
  signal:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 16h3v4H2zM7 12h3v8H7zM12 8h3v12h-3zM17 4h3v16h-3z"/></svg>',
  wifi:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 18a2 2 0 110 4 2 2 0 010-4zM5 11a10 10 0 0114 0l-2 2a7 7 0 00-10 0z"/></svg>',
  battery:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="7" width="18" height="10" rx="2.5"/><rect x="4" y="9" width="12" height="6" rx="1" fill="currentColor"/></svg>'
};

/* Final lockup geometry from cafe-icon-final.svg (118x44). */
var CUP_L_FINAL = {x: 0, y: 6.695, rot: 0};
var CUP_R_FINAL = {x: 49.105, y: 0, rot: 0};

/* Cup keyframes. Cup Bézier approach is LOCKED — do not retune trajectory/easing. */
var POSES = [
  {id: 'enter', label: '1 Enter separately', left: {x: -22, y: 1.4, rot: -9}, right: {x: 72, y: 0.6, rot: 9}},
  {id: 'meeting', label: '2 First meeting', left: {x: -9, y: 1.1, rot: -2.2}, right: {x: 58.4, y: 0.1, rot: 2.2}},
  {id: 'opens', label: '3 Conversation opens', left: {x: -15, y: 1.0, rot: 0}, right: {x: 64.5, y: 0, rot: 0}},
  {id: 'continues', label: '4 Intermediate, downward motion', left: {x: -10.2, y: 3.6, rot: 0}, right: {x: 60.6, y: -0.35, rot: 0}},
  {id: 'rim', label: '5 First droplet at rim', left: {x: -2.0, y: 5.7, rot: 0}, right: {x: 51.2, y: 0.08, rot: 0}},
  {id: 'inside', label: '6 First partly inside', left: CUP_L_FINAL, right: CUP_R_FINAL},
  {id: 'bottom', label: '7 First at bottom', left: CUP_L_FINAL, right: CUP_R_FINAL},
  {id: 'partial', label: '8 Partial fill + swell', left: CUP_L_FINAL, right: CUP_R_FINAL},
  {id: 'secondIn', label: '9 Second droplet entering', left: CUP_L_FINAL, right: CUP_R_FINAL},
  {id: 'secondRise', label: '10 Second level rise', left: CUP_L_FINAL, right: CUP_R_FINAL},
  {id: 'final', label: '11 Final settled fill', left: CUP_L_FINAL, right: CUP_R_FINAL, final: true}
];

var TOTAL_MS = 3200;
/* Pause buttons freeze snapshots on the continuous timeline. */
var POSE_MS = [0, 820, 1520, 2000, 2380, 2460, 2520, 2600, 2700, 2780, 3200];
var CUP_MS = [0, 540, 900, 1980, 2680, 3000, 3200];
var LAND_L = 2420;
var LAND_R = 2700;
/* Hold the conversation cup pose until droplets leave, then approach on a depth curve. */
var CUP_HOLD_MS = 1600;
var CUP_SETTLE_MS = 2840;
var CUP_DEPTH_APPROACH = true;
var SHAPE_R_KIND = 'counterpart';
/* 'refine' = liquid character + locked cup Bézier + contained droplet→fill.
   '1437' / '1505' = recoverable approved fallbacks (cups + prior fill behavior). */
var MOTION_MODE = 'refine';
/* Review-only secondary motion. The default choreography remains byte-for-byte in
   the existing sampling functions; this flag selects an isolated sampler. */
var POLISHED_MOTION = false;
/* Bubble, droplet, and cup motion: 'none' | 'v1' | 'v2' | 'v3'. */
var POLISHED_VARIANT = 'none';
/* Liquid rise and surface, selected independently of the motion above:
   'legacy' = the staged fill + body swell, 'fluid' = the continuous rise + wave.
   Kept separate so a variant can pair one version's bubbles with another's liquid. */
var LIQUID_VARIANT = 'legacy';
var POLISH_STRENGTH = 1;
var ACTIVE_RUNTIME = 'CURRENT';
/* Contained entry: clip droplets to overlap; morph into pool; front cup above yellow. */
var ENTRY_CLIP = true;
var RIM_Y = 9.55;
var POOL_CX = 59.52;
var POOL_CY = 20.4;
var POOL_BOTTOM_Y = 29.1;
var CUP_BEZ = {L: null, R: null};

/*
  First approved fallback (2026-09-10 morning). Restore with ?restore=approved
  (timing / BUBBLE only; chat scales 0.62 / 0.58, chat [51,-41] / [62,-17]).
*/
var BASELINE_APPROVED = {
  POSE_MS: [0, 820, 1520, 2000, 2340, 2880, 3200],
  LAND_L: 2420,
  LAND_R: 2700,
  BUBBLE: {
    L: {
      launch: 520, chatT: 1500, leaveT: 1580, pairT: 2000, land: 2420, fadeEnd: 2560,
      start: [38, 3], chat: [51, -41], pairEnd: [52.4, -25], landPt: [61.4, 23.5],
      T0: [14, -56], Tchat: [8, 18], Tpair: [5, 24],
      rot0: -16, rotChat: -4,
      diveP2: [55.6, 14], morphDelay: 0
    },
    R: {
      launch: 680, chatT: 1510, leaveT: 1680, pairT: 2100, land: 2700, fadeEnd: 2840,
      start: [76, 3], chat: [62, -17], pairEnd: [64.8, -2.5], landPt: [58.8, 23.4],
      T0: [-14, -22], Tchat: [-2, 18], Tpair: [2, 18],
      rot0: 2, rotChat: 3,
      diveP2: [65.6, 7], morphDelay: 0.04
    }
  },
  chatScale: {L: 0.62, R: 0.58},
  fallScale: 1.28,
  dropScale: {L: 1.22, R: 1.18}
};

/*
  Latest restore point (2026-09-10 afternoon): left morph approved,
  stacked chat pose, SVG mid path, two landings. Restore with ?restore=latest
  (does not overwrite BASELINE_APPROVED).
*/
var BASELINE_LATEST = {
  POSE_MS: [0, 820, 1520, 2000, 2340, 2880, 3200],
  LAND_L: 2420,
  LAND_R: 2700,
  CUP_MS: [0, 540, 900, 1980, 2680, 3000, 3200],
  CUP_HOLD_MS: 1600,
  CUP_SETTLE_MS: 3000,
  CUP_DEPTH_APPROACH: false,
  SHAPE_R_KIND: 'rotate180',
  BUBBLE: {
    L: {
      launch: 520, chatT: 1500, leaveT: 1600, pairT: 2000, land: 2420, fadeEnd: 2560,
      start: [38, 3], chat: [49.5, -54], pairEnd: [51.2, -31], landPt: [61.4, 23.5],
      T0: [14, -56], Tchat: [6, 16], Tpair: [4, 22],
      rot0: -16, rotChat: -6,
      diveP2: [55.2, 12], morphDelay: 0
    },
    R: {
      launch: 680, chatT: 1510, leaveT: 1700, pairT: 2080, land: 2700, fadeEnd: 2840,
      start: [76, 3], chat: [66.8, -24], pairEnd: [65.2, -7], landPt: [58.8, 23.4],
      T0: [-14, -22], Tchat: [-3, 16], Tpair: [1, 18],
      rot0: 2, rotChat: 5,
      diveP2: [64.8, 8], morphDelay: 0
    }
  },
  cups: [
    {left: {x: -22, y: 1.4, rot: -9}, right: {x: 72, y: 0.6, rot: 9}},
    {left: {x: -9, y: 1.1, rot: -2.2}, right: {x: 58.4, y: 0.1, rot: 2.2}},
    {left: {x: -15, y: 1.0, rot: 0}, right: {x: 64.5, y: 0, rot: 0}},
    {left: {x: -15, y: 1.0, rot: 0}, right: {x: 64.5, y: 0, rot: 0}},
    {left: {x: -3.2, y: 4.0, rot: 0}, right: {x: 52.4, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}}
  ]
};

/*
  Approved fallback — 14:37 liquid-motion baseline (2026-09-10).
  Exact choreography, right-side counterpart morph, cup depth, and two landings
  before liquid-character / cup-Bézier / droplet-fill refinements.
  Restore with ?restore=1437  (does not overwrite earlier baselines).
*/
var BASELINE_1437 = {
  label: 'Approved fallback — 14:37 liquid-motion baseline',
  MOTION_MODE: '1437',
  ENTRY_CLIP: false,
  POSE_MS: [0, 820, 1520, 2000, 2380, 2600, 2760, 3200],
  LAND_L: 2420,
  LAND_R: 2700,
  CUP_MS: [0, 540, 900, 1980, 2680, 3000, 3200],
  CUP_HOLD_MS: 1600,
  CUP_SETTLE_MS: 2840,
  CUP_DEPTH_APPROACH: true,
  SHAPE_R_KIND: 'counterpart',
  BUBBLE: {
    L: {
      launch: 520, chatT: 1500, leaveT: 1600, pairT: 2000, land: 2420, fadeEnd: 2560,
      start: [38, 3], chat: [49.5, -54], pairEnd: [51.2, -31], landPt: [61.4, 23.5],
      T0: [14, -56], Tchat: [6, 16], Tpair: [4, 22],
      rot0: -16, rotChat: -6,
      diveP2: [55.2, 12], morphDelay: 0
    },
    R: {
      launch: 680, chatT: 1510, leaveT: 1700, pairT: 2080, land: 2700, fadeEnd: 2840,
      start: [76, 3], chat: [66.8, -24], pairEnd: [67.4, -6.5], landPt: [58.8, 23.4],
      T0: [-14, -22], Tchat: [-3, 16], Tpair: [0, 16],
      rot0: 2, rotChat: 5,
      diveP2: [66.0, 9.5], morphDelay: 0
    }
  },
  cups: [
    {left: {x: -22, y: 1.4, rot: -9}, right: {x: 72, y: 0.6, rot: 9}},
    {left: {x: -9, y: 1.1, rot: -2.2}, right: {x: 58.4, y: 0.1, rot: 2.2}},
    {left: {x: -15, y: 1.0, rot: 0}, right: {x: 64.5, y: 0, rot: 0}},
    {left: {x: -10.2, y: 3.6, rot: 0}, right: {x: 60.6, y: -0.35, rot: 0}},
    {left: {x: -2.0, y: 5.7, rot: 0}, right: {x: 51.2, y: 0.08, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}}
  ]
};

/*
  Newest approved fallback — 15:05 (2026-09-10).
  Cups locked (trajectory / easing / depth / z-order). Liquid character + prior fill.
  Restore with ?restore=1505  (does not overwrite earlier baselines).
*/
var BASELINE_1505 = {
  label: 'Approved fallback — 15:05 cups-locked baseline',
  MOTION_MODE: 'refine',
  ENTRY_CLIP: false,
  POSE_MS: [0, 820, 1520, 2000, 2380, 2600, 2760, 3200],
  LAND_L: 2420,
  LAND_R: 2700,
  CUP_MS: [0, 540, 900, 1980, 2680, 3000, 3200],
  CUP_HOLD_MS: 1600,
  CUP_SETTLE_MS: 2840,
  CUP_DEPTH_APPROACH: true,
  SHAPE_R_KIND: 'counterpart',
  BUBBLE: {
    L: {
      launch: 520, chatT: 1500, leaveT: 1600, pairT: 2000, land: 2420, fadeEnd: 2620,
      start: [38, 3], chat: [49.5, -54], pairEnd: [51.2, -31], landPt: [61.4, 23.5],
      T0: [14, -56], Tchat: [6, 16], Tpair: [4, 22],
      rot0: -16, rotChat: -6,
      diveP2: [55.2, 12], morphDelay: 0
    },
    R: {
      launch: 680, chatT: 1510, leaveT: 1700, pairT: 2080, land: 2700, fadeEnd: 2880,
      start: [76, 3], chat: [66.8, -24], pairEnd: [67.4, -6.5], landPt: [58.8, 23.4],
      T0: [-14, -22], Tchat: [-3, 16], Tpair: [0, 16],
      rot0: 2, rotChat: 5,
      diveP2: [66.0, 9.5], morphDelay: 0
    }
  },
  cups: [
    {left: {x: -22, y: 1.4, rot: -9}, right: {x: 72, y: 0.6, rot: 9}},
    {left: {x: -9, y: 1.1, rot: -2.2}, right: {x: 58.4, y: 0.1, rot: 2.2}},
    {left: {x: -15, y: 1.0, rot: 0}, right: {x: 64.5, y: 0, rot: 0}},
    {left: {x: -10.2, y: 3.6, rot: 0}, right: {x: 60.6, y: -0.35, rot: 0}},
    {left: {x: -2.0, y: 5.7, rot: 0}, right: {x: 51.2, y: 0.08, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}}
  ]
};

/*
  Snapshot — 15:39 (2026-09-10), before final-handoff fix.
  Contained droplet entry + cups locked. Restore with ?restore=1539
  (does not overwrite BASELINE_1505).
*/
var BASELINE_1539 = {
  label: 'Snapshot — 15:39 pre-handoff (cups locked, entry clip)',
  MOTION_MODE: 'refine',
  ENTRY_CLIP: true,
  POSE_MS: [0, 820, 1520, 2000, 2380, 2460, 2520, 2600, 2700, 2780, 3200],
  LAND_L: 2420,
  LAND_R: 2700,
  CUP_MS: [0, 540, 900, 1980, 2680, 3000, 3200],
  CUP_HOLD_MS: 1600,
  CUP_SETTLE_MS: 2840,
  CUP_DEPTH_APPROACH: true,
  SHAPE_R_KIND: 'counterpart',
  BUBBLE: {
    L: {
      launch: 520, chatT: 1500, leaveT: 1600, pairT: 2000, land: 2420, fadeEnd: 2680,
      start: [38, 3], chat: [49.5, -54], pairEnd: [51.2, -31], landPt: [61.4, 23.5],
      T0: [14, -56], Tchat: [6, 16], Tpair: [4, 22],
      rot0: -16, rotChat: -6,
      diveP2: [55.2, 12], morphDelay: 0, mergeDur: 260, fillShare: 0.43
    },
    R: {
      launch: 680, chatT: 1510, leaveT: 1700, pairT: 2080, land: 2700, fadeEnd: 2940,
      start: [76, 3], chat: [66.8, -24], pairEnd: [67.4, -6.5], landPt: [58.8, 23.4],
      T0: [-14, -22], Tchat: [-3, 16], Tpair: [0, 16],
      rot0: 2, rotChat: 5,
      diveP2: [66.0, 9.5], morphDelay: 0, mergeDur: 240, fillShare: 0.57
    }
  },
  cups: [
    {left: {x: -22, y: 1.4, rot: -9}, right: {x: 72, y: 0.6, rot: 9}},
    {left: {x: -9, y: 1.1, rot: -2.2}, right: {x: 58.4, y: 0.1, rot: 2.2}},
    {left: {x: -15, y: 1.0, rot: 0}, right: {x: 64.5, y: 0, rot: 0}},
    {left: {x: -10.2, y: 3.6, rot: 0}, right: {x: 60.6, y: -0.35, rot: 0}},
    {left: {x: -2.0, y: 5.7, rot: 0}, right: {x: 51.2, y: 0.08, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}}
  ]
};
/* Exact current choreography at the start of the motion-polish pass. Its behavior
   is the default sampler; ?motion=polished never mutates this restore point. */
var BASELINE_1620 = BASELINE_1539;
var BASELINE_1641 = BASELINE_1620;

/*
  Preserved checkpoint — the approved polished animation exactly as reviewed on
  2026-09-10 (the ?motion=polished / v2 sampler with these timings).
  Restore with ?restore=polished-0910  (aliases ?restore=polished, ?restore=1747).
  Written out in full so no later default or baseline edit can overwrite it, and
  pinned to the v2 sampler so refinement passes cannot change what it plays.
*/
var BASELINE_POLISHED_0910 = {
  label: 'Preserved checkpoint — polished motion (2026-09-10)',
  MOTION_MODE: 'refine',
  ENTRY_CLIP: true,
  POSE_MS: [0, 820, 1520, 2000, 2380, 2460, 2520, 2600, 2700, 2780, 3200],
  LAND_L: 2420,
  LAND_R: 2700,
  CUP_MS: [0, 540, 900, 1980, 2680, 3000, 3200],
  CUP_HOLD_MS: 1600,
  CUP_SETTLE_MS: 2840,
  CUP_DEPTH_APPROACH: true,
  SHAPE_R_KIND: 'counterpart',
  BUBBLE: {
    L: {
      launch: 520, chatT: 1500, leaveT: 1600, pairT: 2000, land: 2420, fadeEnd: 2680,
      start: [38, 3], chat: [49.5, -54], pairEnd: [51.2, -31], landPt: [61.4, 23.5],
      T0: [14, -56], Tchat: [6, 16], Tpair: [4, 22],
      rot0: -16, rotChat: -6,
      diveP2: [55.2, 12], morphDelay: 0, mergeDur: 260, fillShare: 0.43
    },
    R: {
      launch: 680, chatT: 1510, leaveT: 1700, pairT: 2080, land: 2700, fadeEnd: 2940,
      start: [76, 3], chat: [66.8, -24], pairEnd: [67.4, -6.5], landPt: [58.8, 23.4],
      T0: [-14, -22], Tchat: [-3, 16], Tpair: [0, 16],
      rot0: 2, rotChat: 5,
      diveP2: [66.0, 9.5], morphDelay: 0, mergeDur: 240, fillShare: 0.57
    }
  },
  cups: [
    {left: {x: -22, y: 1.4, rot: -9}, right: {x: 72, y: 0.6, rot: 9}},
    {left: {x: -9, y: 1.1, rot: -2.2}, right: {x: 58.4, y: 0.1, rot: 2.2}},
    {left: {x: -15, y: 1.0, rot: 0}, right: {x: 64.5, y: 0, rot: 0}},
    {left: {x: -10.2, y: 3.6, rot: 0}, right: {x: 60.6, y: -0.35, rot: 0}},
    {left: {x: -2.0, y: 5.7, rot: 0}, right: {x: 51.2, y: 0.08, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}}
  ]
};
var POLISHED_CHECKPOINT_Q = {'polished-0910': 1, 'polished': 1, '1747': 1};

/*
  APPROVED FOR INTEGRATION · hybrid-1 — the approved Café Welcome animation.
  Current-choreography bubbles, morphs, rotations, timings, hold and descent, the
  current cup choreography, and the continuous liquid rise + travelling wave.
  Restore with ?restore=cafe-welcome-approved-hybrid-1 (alias ?restore=approved-hybrid-1).
  Written out in full and pinned to the default bubble sampler + fluid liquid, so no
  later default or baseline edit can change what it plays. This is the version the
  mobile Welcome integrates.
*/
var BASELINE_APPROVED_HYBRID_1 = {
  label: 'Approved Caf\u00e9 Welcome animation \u2014 hybrid-1 (2026-09-14)',
  MOTION_MODE: 'refine',
  ENTRY_CLIP: true,
  POSE_MS: [0, 820, 1520, 2000, 2380, 2460, 2520, 2600, 2700, 2780, 3200],
  LAND_L: 2420,
  LAND_R: 2700,
  CUP_MS: [0, 540, 900, 1980, 2680, 3000, 3200],
  CUP_HOLD_MS: 1600,
  CUP_SETTLE_MS: 2840,
  CUP_DEPTH_APPROACH: true,
  SHAPE_R_KIND: 'counterpart',
  BUBBLE: {
    L: {
      launch: 520, chatT: 1500, leaveT: 1600, pairT: 2000, land: 2420, fadeEnd: 2680,
      start: [38, 3], chat: [49.5, -54], pairEnd: [51.2, -31], landPt: [61.4, 23.5],
      T0: [14, -56], Tchat: [6, 16], Tpair: [4, 22],
      rot0: -16, rotChat: -6,
      diveP2: [55.2, 12], morphDelay: 0, mergeDur: 260, fillShare: 0.43
    },
    R: {
      launch: 680, chatT: 1510, leaveT: 1700, pairT: 2080, land: 2700, fadeEnd: 2940,
      start: [76, 3], chat: [66.8, -24], pairEnd: [67.4, -6.5], landPt: [58.8, 23.4],
      T0: [-14, -22], Tchat: [-3, 16], Tpair: [0, 16],
      rot0: 2, rotChat: 5,
      diveP2: [66.0, 9.5], morphDelay: 0, mergeDur: 240, fillShare: 0.57
    }
  },
  cups: [
    {left: {x: -22, y: 1.4, rot: -9}, right: {x: 72, y: 0.6, rot: 9}},
    {left: {x: -9, y: 1.1, rot: -2.2}, right: {x: 58.4, y: 0.1, rot: 2.2}},
    {left: {x: -15, y: 1.0, rot: 0}, right: {x: 64.5, y: 0, rot: 0}},
    {left: {x: -10.2, y: 3.6, rot: 0}, right: {x: 60.6, y: -0.35, rot: 0}},
    {left: {x: -2.0, y: 5.7, rot: 0}, right: {x: 51.2, y: 0.08, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}},
    {left: {x: 0, y: 6.695, rot: 0}, right: {x: 49.105, y: 0, rot: 0}}
  ]
};
var APPROVED_HYBRID_Q = {'cafe-welcome-approved-hybrid-1': 1, 'approved-hybrid-1': 1};
var YELLOW_D = 'M68.3937 9.42969C68.3937 10.3411 61.0946 11.1261 50.6445 11.4721C51.1765 13.9088 51.902 16.2525 52.7985 18.4772C54.8037 23.4362 58.1222 27.5879 62.2516 30.631C63.416 28.9495 64.4093 27.1229 65.198 25.1735C67.1288 20.4005 68.2635 15.0658 68.39 9.42969H68.3937Z';

var PATH_LEFT_DROP = 'M6.70482 2.02419C6.08623 0.605855 4.61691 -0.339272 3.13821 0.116545C2.69594 0.252877 2.27738 0.427169 1.9621 0.648746C0.284165 1.82801 -0.463518 3.97784 0.300233 5.88121L1.93225 9.9484C2.00059 10.1743 2.33577 10.1698 2.40372 9.94383C2.68783 8.99903 3.20201 7.54161 3.72716 7.31257C3.92809 7.22494 4.31664 7.05801 4.78393 6.85799C6.65389 6.05756 7.51798 3.88864 6.70482 2.02419Z';
var PATH_RIGHT_DROP = 'M-1.3452 4.4397C-1.3962 2.9795 -0.5291 1.5870 0.9120 1.3460C1.4175 1.2615 1.9254 1.2257 2.3447 1.2961C4.3673 1.6359 5.9695 3.2526 6.1018 5.2992L6.3846 9.6725C6.4258 9.9406 6.0977 10.1130 5.8979 9.9296C5.0225 9.1258 3.4566 7.7735 2.8529 7.7946C2.7826 7.7971 2.6967 7.8023 2.5981 7.8099C0.5532 7.9674 -1.2736 6.4894 -1.3452 4.4397Z';
var PATH_UPPER = 'M46 12.1505C46 5.43995 40.56 0 33.8495 0H23.3657C11.3779 0 1.46916 9.34673 0.76994 21.3141L0.0629921 33.4138L9.53674e-07 34C9.53674e-07 34 0.720058 24.3009 6.53705 24.3009C9.28864 24.3009 23.3043 24.3009 33.8564 24.3009C40.5669 24.3009 46 18.861 46 12.1505Z';
var PATH_LOWER = 'M0 12.1505C0 5.43995 5.43995 0 12.1505 0H25.1718C38.442 0 49.433 10.3021 50.2909 23.5446L50.9302 33.4138L51 34C51 34 50.2017 24.3009 43.7524 24.3009C40.5855 24.3009 23.9607 24.3009 12.1443 24.3009C5.4338 24.3009 0 18.861 0 12.1505Z';
/* Frame-4 intermediate silhouette. Thick rounded body on the right, thin trailing tail on the left. */
var PATH_MID = 'M1.5 13.2 C4.2 8.6 9.0 1.6 16.8 0.45 C24.6 -0.3 32.6 3.1 36.2 10.1 C37.4 16.2 33.2 20.8 27.0 20.5 C20.6 20.2 15.2 15.4 10.0 12.1 C6.4 10.0 3.2 11.1 1.5 13.2Z';
/* Right-side counterpart of PATH_MID, prepared in static orientation: body left, tail right. Not a runtime flip. */
var PATH_MID_R = 'M37.4 13.2 C34.7 8.6 29.9 1.6 22.1 0.45 C14.3 -0.3 6.3 3.1 2.7 10.1 C1.5 16.2 5.7 20.8 11.9 20.5 C18.3 20.2 23.7 15.4 28.9 12.1 C32.5 10.0 35.7 11.1 37.4 13.2Z';

/*
  One C1 path per bubble: Hermite rise into the stacked chat pose, brief
  crest hold with leftover speed, then a cubic fall into the cup overlap.
  Tchat is the shared tangent at the crest so the rise does not restart.
*/
var NPTS = 80;
var BUBBLE = {
  L: {
    launch: 520, chatT: 1500, leaveT: 1600, pairT: 2000, land: 2420, fadeEnd: 2680,
    start: [38, 3], chat: [49.5, -54], pairEnd: [51.2, -31], landPt: [61.4, 23.5],
    T0: [14, -56], Tchat: [6, 16], Tpair: [4, 22],
    rot0: -16, rotChat: -6,
    diveP2: [55.2, 12], morphDelay: 0, mergeDur: 260, fillShare: 0.43
  },
  R: {
    launch: 680, chatT: 1510, leaveT: 1700, pairT: 2080, land: 2700, fadeEnd: 2940,
    start: [76, 3], chat: [66.8, -24], pairEnd: [67.4, -6.5], landPt: [58.8, 23.4],
    T0: [-14, -22], Tchat: [-3, 16], Tpair: [0, 16],
    rot0: 2, rotChat: 5,
    diveP2: [66.0, 9.5], morphDelay: 0, mergeDur: 240, fillShare: 0.57
  }
};
var SHAPE = {L: null, R: null};
var DEBUG_MOTION = false;

function prefersReduced(){
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function lerp(a, b, t){ return a + (b - a) * t; }
function lerpPt(a, b, t){ return {x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), rot: lerp(a.rot, b.rot, t)}; }
function smooth(t){ t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function u01(ms, a, b){ if(b <= a) return ms >= b ? 1 : 0; return clamp((ms - a) / (b - a), 0, 1); }
function lerpAngle(a, b, t){
  var d = b - a;
  while(d > 180) d -= 360;
  while(d < -180) d += 360;
  return a + d * t;
}
function cubic3(p0, p1, p2, p3, t){
  var u = 1 - t, uu = u * u, tt = t * t;
  return [
    uu * u * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + tt * t * p3[0],
    uu * u * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + tt * t * p3[1]
  ];
}
function cubic3d(p0, p1, p2, p3, t){
  var u = 1 - t;
  return [
    3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
    3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1])
  ];
}
function hermiteBez(p0, t0, p1, t1){
  return [
    p0,
    [p0[0] + t0[0] / 3, p0[1] + t0[1] / 3],
    [p1[0] - t1[0] / 3, p1[1] - t1[1] / 3],
    p1
  ];
}
function densePath(d){
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.appendChild(p);
  document.body.appendChild(svg);
  var len = p.getTotalLength();
  var pts = [], dense = 280, i;
  for(i = 0; i < dense; i++){
    var pt = p.getPointAtLength((i / dense) * len);
    pts.push([pt.x, pt.y]);
  }
  svg.remove();
  return centerPts(pts);
}
function centerPts(pts){
  var cx = 0, cy = 0, i;
  for(i = 0; i < pts.length; i++){ cx += pts[i][0]; cy += pts[i][1]; }
  cx /= pts.length; cy /= pts.length;
  return pts.map(function(p){ return [p[0] - cx, p[1] - cy]; });
}
function scalePts(pts, s){
  return pts.map(function(p){ return [p[0] * s, p[1] * s]; });
}
function rotatePts(pts, deg){
  var r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return pts.map(function(p){ return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; });
}
function rayOuter(pts, dx, dy){
  var bestT = -1, i;
  for(i = 0; i < pts.length; i++){
    var ax = pts[i][0], ay = pts[i][1];
    var hx = pts[(i + 1) % pts.length][0] - ax;
    var hy = pts[(i + 1) % pts.length][1] - ay;
    var det = hx * dy - dx * hy;
    if(Math.abs(det) < 1e-9) continue;
    var t = (hx * ay - hy * ax) / det;
    var u = (dx * ay - dy * ax) / det;
    if(t > 0 && u >= -0.001 && u <= 1.001 && t > bestT) bestT = t;
  }
  if(bestT < 0) return null;
  return [bestT * dx, bestT * dy];
}
function tipAngle(pts){
  var b = 0, y = pts[0][1], i;
  for(i = 1; i < pts.length; i++){
    if(pts[i][1] > y){ y = pts[i][1]; b = i; }
  }
  return Math.atan2(pts[b][0], pts[b][1]);
}
function tailIndex(pts, which){
  var b = 0, i;
  for(i = 1; i < pts.length; i++){
    var p = pts[i], q = pts[b];
    if(which === 'maxY' && p[1] > q[1]) b = i;
    else if(which === 'minY' && p[1] < q[1]) b = i;
    else if(which === 'minX' && p[0] < q[0]) b = i;
    else if(which === 'maxX' && p[0] > q[0]) b = i;
  }
  return b;
}
function polarRingAt(pts, n, a0){
  var ring = [], i, j;
  for(i = 0; i < n; i++){
    var ang = a0 + (i / n) * Math.PI * 2;
    var dx = Math.sin(ang), dy = Math.cos(ang);
    var hit = rayOuter(pts, dx, dy);
    if(!hit){
      var best = 0, bestDot = -2;
      for(j = 0; j < pts.length; j++){
        var len = Math.hypot(pts[j][0], pts[j][1]) || 1;
        var dot = (pts[j][0] / len) * dx + (pts[j][1] / len) * dy;
        if(dot > bestDot){ bestDot = dot; best = j; }
      }
      hit = [pts[best][0], pts[best][1]];
    }
    ring.push(hit);
  }
  return ring;
}
function ringFromTail(pts, n, which){
  var b = tailIndex(pts, which);
  return polarRingAt(pts, n, Math.atan2(pts[b][0], pts[b][1]));
}
function ringFromIdx(pts, n, idx){
  return polarRingAt(pts, n, Math.atan2(pts[idx][0], pts[idx][1]));
}
function ringPick(pts, n, which){
  if(typeof which === 'number') return ringFromIdx(pts, n, which);
  return ringFromTail(pts, n, which);
}
function polarRing(pts, n){
  return polarRingAt(pts, n, tipAngle(pts));
}
function rotateIndex(pts, k){
  var n = pts.length, out = new Array(n), i;
  for(i = 0; i < n; i++) out[i] = pts[(i + k) % n];
  return out;
}
/* The pool targets are sampled from a different contour than the falling droplet,
   so their point order has to be rotated onto it. Without this the blend spins
   points around the ring and folds the outline mid-morph. */
function bestRotation(target, source){
  var n = target.length, best = 0, bestCost = Infinity, k, i;
  for(k = 0; k < n; k++){
    var cost = 0;
    for(i = 0; i < n; i++){
      var dx = target[(i + k) % n][0] - source[i][0];
      var dy = target[(i + k) % n][1] - source[i][1];
      cost += dx * dx + dy * dy;
    }
    if(cost < bestCost){ bestCost = cost; best = k; }
  }
  return best;
}
function lerpPts(a, b, t){
  var o = new Array(a.length), i;
  for(i = 0; i < a.length; i++) o[i] = [lerp(a[i][0], b[i][0], t), lerp(a[i][1], b[i][1], t)];
  return o;
}
/* Head (index n/2) leads; tail (index 0) lags so deformation travels front to back. */
function lerpPtsStagger(a, b, t, lag){
  lag = lag == null ? 0.1 : lag;
  var n = a.length, o = new Array(n), i;
  var span = Math.max(1e-6, 1 - lag);
  for(i = 0; i < n; i++){
    var headW = Math.min(i, n - i) / (n * 0.5);
    var local = clamp((t - lag * (1 - headW)) / span, 0, 1);
    local = local * local * (3 - 2 * local);
    o[i] = [lerp(a[i][0], b[i][0], local), lerp(a[i][1], b[i][1], local)];
  }
  return o;
}
function cubicBezierEase(x1, y1, x2, y2, t){
  t = clamp(t, 0, 1);
  var s = t, i, x, dx;
  for(i = 0; i < 10; i++){
    x = 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
    dx = 3 * (1 - s) * (1 - s) * x1 + 6 * (1 - s) * s * (x2 - x1) + 3 * s * s * (1 - x2);
    if(Math.abs(dx) < 1e-6) break;
    s = clamp(s - (x - t) / dx, 0, 1);
  }
  return 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
}
/* Subtle travel stretch: body elongates along velocity, tail lags a few pixels. */
function liquidDeform(pts, vx, vy, amp){
  amp = clamp(amp, 0, 0.16);
  if(amp < 0.002) return pts;
  var spd = Math.hypot(vx, vy) || 1;
  var dx = vx / spd, dy = vy / spd;
  var n = pts.length;
  return pts.map(function(p, i){
    var tailW = Math.exp(-Math.pow(Math.min(i, n - i) / Math.max(1, n * 0.22), 2) * 1.55);
    var bodyW = 1 - tailW;
    var along = p[0] * dx + p[1] * dy;
    var perp = -p[0] * dy + p[1] * dx;
    along *= 1 + amp * 0.7 * bodyW;
    perp *= 1 - amp * 0.28 * bodyW;
    var lag = amp * 2.1 * tailW;
    return [
      along * dx - perp * dy - dx * lag,
      along * dy + perp * dx - dy * lag
    ];
  });
}
function ptsToD(pts){
  var d = 'M' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2);
  for(var i = 1; i < pts.length; i++) d += 'L' + pts[i][0].toFixed(2) + ' ' + pts[i][1].toFixed(2);
  return d + 'Z';
}
function ringArea(pts){
  var a = 0, i, j;
  for(i = 0; i < pts.length; i++){
    j = (i + 1) % pts.length;
    a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  return a / 2;
}
function matchMass(pts, area0){
  var a = Math.abs(ringArea(pts));
  if(a < 1e-4 || area0 < 1e-4) return pts;
  return scalePts(pts, Math.sqrt(area0 / a));
}
function softenRing(pts, passes, area0){
  var out = pts.map(function(p){ return [p[0], p[1]]; });
  passes = passes == null ? 1 : passes;
  for(var pass = 0; pass < passes; pass++){
    var prev = out, n = prev.length;
    out = prev.map(function(p, i){
      var a = prev[(i + n - 1) % n];
      var b = prev[(i + 1) % n];
      return [
        a[0] * 0.2 + p[0] * 0.6 + b[0] * 0.2,
        a[1] * 0.2 + p[1] * 0.6 + b[1] * 0.2
      ];
    });
  }
  return matchMass(out, area0 == null ? Math.abs(ringArea(pts)) : area0);
}
/* Closed Catmull–Rom contour converted to cubic Béziers. This keeps G1/C1
   continuity through every interpolated frame instead of exposing polygon cusps. */
function ptsToSmoothD(pts){
  var n = pts.length;
  if(n < 4) return ptsToD(pts);
  var d = 'M' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2);
  for(var i = 0; i < n; i++){
    var p0 = pts[(i + n - 1) % n];
    var p1 = pts[i];
    var p2 = pts[(i + 1) % n];
    var p3 = pts[(i + 2) % n];
    var c1 = [p1[0] + (p2[0] - p0[0]) / 8, p1[1] + (p2[1] - p0[1]) / 8];
    var c2 = [p2[0] - (p3[0] - p1[0]) / 8, p2[1] - (p3[1] - p1[1]) / 8];
    d += 'C' + c1[0].toFixed(2) + ' ' + c1[1].toFixed(2)
      + ' ' + c2[0].toFixed(2) + ' ' + c2[1].toFixed(2)
      + ' ' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
  }
  return d + 'Z';
}
function redrawLiquidTail(pts, radius, area0){
  var out = pts.map(function(p){ return [p[0], p[1]]; });
  var n = out.length;
  if(n < 10) return out;
  area0 = area0 == null ? Math.abs(ringArea(out)) : area0;

  /* Remove the hard body→tail shoulder anchor on whichever contour side carries
     the largest local turn, distributing that turn across its two neighbors. */
  function turnAt(i){
    var a = out[(i + n - 1) % n], b = out[i], c = out[(i + 1) % n];
    var u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]];
    var lu = Math.hypot(u[0], u[1]) || 1, lv = Math.hypot(v[0], v[1]) || 1;
    return 1 - clamp((u[0] * v[0] + u[1] * v[1]) / (lu * lv), -1, 1);
  }
  var candidates = [];
  var shoulderSpan = Math.max(8, Math.round(n * 0.18));
  for(var ci = 3; ci <= shoulderSpan; ci++){
    candidates.push(ci, n - ci);
  }
  var cusp = candidates[0];
  candidates.forEach(function(i){ if(turnAt(i) > turnAt(cusp)) cusp = i; });
  /* Give the shoulder a visible radius, not merely a softened mathematical
     corner. The turn is shared by five anchors so it survives phone scaling. */
  for(var pass = 0; pass < 2; pass++){
    var before = out.map(function(p){ return [p[0], p[1]]; });
    [-2, -1, 0, 1, 2].forEach(function(offset){
      var i = (cusp + offset + n) % n;
      var prev = before[(i + n - 1) % n], cur = before[i], next = before[(i + 1) % n];
      var weight = offset === 0 ? 0.34 : Math.abs(offset) === 1 ? 0.25 : 0.12;
      out[i] = [
        prev[0] * weight + cur[0] * (1 - weight * 2) + next[0] * weight,
        prev[1] * weight + cur[1] * (1 - weight * 2) + next[1] * weight
      ];
    });
  }

  /* Replace the mathematical terminal point with a five-anchor semicircle.
     Spreading the return curve across five anchors keeps the nose visibly blunt
     after antialiasing instead of producing a technically smooth needle tip. */
  radius = radius == null ? 0.46 : radius;
  var tip = out[0];
  var bridge = [(out[2][0] + out[n - 2][0]) * 0.5, (out[2][1] + out[n - 2][1]) * 0.5];
  var ax = tip[0] - bridge[0], ay = tip[1] - bridge[1];
  var al = Math.hypot(ax, ay) || 1;
  ax /= al; ay /= al;
  var px = -ay, py = ax;
  if((out[1][0] - tip[0]) * px + (out[1][1] - tip[1]) * py < 0){ px *= -1; py *= -1; }
  var leftBase = out[n - 3], rightBase = out[3];
  function sidePoint(base, progress, side, bulge){
    return [
      lerp(base[0], tip[0], progress) + px * radius * bulge * side,
      lerp(base[1], tip[1], progress) + py * radius * bulge * side
    ];
  }
  out[n - 2] = sidePoint(leftBase, 0.34, -1, 0.18);
  out[n - 1] = sidePoint(leftBase, 0.69, -1, 0.12);
  out[0] = tip;
  out[1] = sidePoint(rightBase, 0.69, 1, 0.12);
  out[2] = sidePoint(rightBase, 0.34, 1, 0.18);
  return matchMass(out, area0);
}
function deformBubble(chat, k){
  k = clamp(k, 0, 1);
  var n = chat.length;
  return chat.map(function(p, i){
    var near = Math.min(i, n - i) / Math.max(1, n * 0.18);
    var tail = Math.exp(-near * near * 1.4);
    var body = 1 - tail;
    var x = p[0] * (1 - 0.04 * k * tail);
    var y = lerp(p[1], p[1] * 0.35, k * tail);
    y = y * (1 + 0.34 * k * body);
    y += k * 1.6 * body;
    return [x, y];
  });
}
function makeSlug(chat, fall){
  var long = fall.map(function(p){ return [p[0] * 0.9, p[1] * 1.38]; });
  return matchMass(lerpPts(deformBubble(chat, 0.55), long, 0.4), Math.abs(ringArea(chat)));
}
function makePassProgress(uChat, uLeave){
  var w = 0.30;
  return function(u){
    u = clamp(u, 0, 1);
    if(u <= uChat){
      var t = u / Math.max(1e-6, uChat);
      var e = (1 - w) * (2 * t - t * t) + w * t;
      return 0.5 * e;
    }
    if(u <= uLeave){
      var t = (u - uChat) / Math.max(1e-6, uLeave - uChat);
      return 0.5 + 0.055 * t;
    }
    var t = (u - uLeave) / Math.max(1e-6, 1 - uLeave);
    var e = 0.80 * t + 0.20 * t * t;
    return 0.555 + 0.445 * e;
  };
}
function bezD(p0, p1, p2, p3){
  return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1)
    + ' C' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1)
    + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1)
    + ' ' + p3[0].toFixed(1) + ' ' + p3[1].toFixed(1);
}
function prepMotion(){
  var denseL = densePath(PATH_LEFT_DROP);
  var dropL = ringFromTail(denseL, NPTS, 'maxY');
  var dropR = ringFromTail(densePath(PATH_RIGHT_DROP), NPTS, 'maxY');
  var upper = densePath(PATH_UPPER);
  var lower = densePath(PATH_LOWER);
  var mid = densePath(PATH_MID);
  var fall = rotatePts(denseL, 180);
  var yel = densePath(YELLOW_D);
  var poolFull = ringFromTail(yel, NPTS, 'maxY');
  var poolPartial = matchMass(poolFull.map(function(p, i){
    var n = poolFull.length;
    var head = Math.min(i, n - i) / (n * 0.5);
    var squash = 0.42 + 0.1 * (1 - head);
    return [p[0] * (0.78 + 0.06 * head), p[1] * squash + 5.2];
  }), Math.abs(ringArea(poolFull)) * 0.43);
  /* Refinement-only partial pool: a plain affine squash of the resting mass, so
     this interpolation target can never fold the way an index-weighted squash can. */
  var poolPartialFluid = matchMass(poolFull.map(function(p){
    return [p[0] * 0.88, p[1] * 0.5 + 5.2];
  }), Math.abs(ringArea(poolFull)) * 0.43);
  /* Soft teardrop inside the overlap — round head down, no pointed spike. */
  var stream = matchMass(poolFull.map(function(p, i){
    var n = poolFull.length;
    var head = Math.min(i, n - i) / (n * 0.5);
    return [p[0] * (0.55 + 0.25 * head), p[1] * (0.42 + 0.4 * head) + 3.2 * (1 - head)];
  }), Math.abs(ringArea(poolFull)) * 0.18);
  function pack(drop, chatDense, midDense, fallDense, ds, cs, ms, fs, chatTail, midTail, fallTail){
    var c = ringFromTail(scalePts(chatDense, cs), NPTS, chatTail);
    var m = ringPick(scalePts(midDense, ms), NPTS, midTail);
    var f = ringPick(scalePts(fallDense, fs), NPTS, fallTail);
    var d = scalePts(drop, ds);
    /* Refinement-only: pool targets re-indexed onto this side's falling ring. */
    var k = bestRotation(poolFull, f);
    return {
      drop: d,
      chat: c,
      mid: m,
      fall: f,
      dropSoft: redrawLiquidTail(softenRing(d, 2), 1.5),
      chatSoft: redrawLiquidTail(softenRing(c, 2), 1.7),
      chatFluid: fluidChatRing(c),
      midSoft: redrawLiquidTail(softenRing(m, 2), 1.6),
      fallSoft: redrawLiquidTail(softenRing(f, 2), 1.55),
      stream: stream,
      poolPart: poolPartial,
      streamFluid: rotateIndex(stream, k),
      poolPartFluid: rotateIndex(poolPartialFluid, k),
      poolPartFluidMass: Math.abs(ringArea(poolPartialFluid)),
      poolFullFluid: rotateIndex(poolFull, k),
      poolFull: poolFull,
      mass: Math.abs(ringArea(c)),
      midMass: Math.abs(ringArea(m)),
      dropMass: Math.abs(ringArea(f)),
      poolPartMass: Math.abs(ringArea(poolPartial)),
      poolFullMass: Math.abs(ringArea(poolFull))
    };
  }
  SHAPE.L = pack(dropL, upper, mid, fall, 1.22, 0.80, 0.62, 1.28, 'maxY', 'minX', 'minY');
  var midR, fallR, midRTail, fallRTail;
  if(SHAPE_R_KIND === 'rotate180'){
    midR = rotatePts(mid, 180);
    fallR = fall;
    midRTail = 'maxX';
    fallRTail = 'minY';
  } else {
    /* Counterpart of the attached SVG: body already on the left, then a static
       CCW tilt so the rounded mass leads down-left and the tail trails upper-right. */
    var midR0 = densePath(PATH_MID_R);
    midRTail = tailIndex(midR0, 'maxX');
    midR = rotatePts(midR0, -48);
    fallRTail = tailIndex(fall, 'minY');
    fallR = rotatePts(fall, 20);
  }
  SHAPE.R = pack(dropR, lower, midR, fallR, 1.18, 0.75, 0.58, 1.28, 'maxY', midRTail, fallRTail);
  ['L', 'R'].forEach(function(side){
    var b = BUBBLE[side];
    var dur = b.land - b.launch;
    b.uChat = (b.chatT - b.launch) / dur;
    b.uLeave = (b.leaveT - b.launch) / dur;
    b.progress = makePassProgress(b.uChat, b.uLeave);
    b.riseB = hermiteBez(b.start, b.T0, b.chat, b.Tchat);
    /* Polish-only monotonic rise: no vertical segment and no downward retrace
       before the chat destination. End tangent is shallow and forward. */
    b.polishRiseB = side === 'L'
      ? [b.start, [b.start[0] + 5, b.chat[1] + 2], [b.chat[0] - 3.5, b.chat[1] + 0.5], b.chat]
      : [b.start, [b.start[0] - 4, b.chat[1] + 5], [b.chat[0] + 2.2, b.chat[1] + 0.5], b.chat];
    /* Refinement-only: identical arc and end tangent, target pushed a couple of
       units past the pose so the arrival can settle back onto it exactly. */
    var fl = side === 'L' ? FLUID.L : FLUID.R;
    /* Refinement-only rise. Same start, same crest, still monotonic, but the arc is
       spread along the curve: the polished control points packed ~85-95% of the
       length into the first segment, so the approach to the crest crawled instead
       of easing. */
    var ctl = FLUID_RISE_CTRL[side];
    var evenRise = [
      b.start,
      [b.start[0] + ctl.p1[0], lerp(b.start[1], b.chat[1], ctl.p1[1])],
      [b.chat[0] + ctl.p2[0], b.chat[1] + ctl.p2[1]],
      b.chat
    ];
    var travelTan = tangentUnit([
      evenRise[3][0] - evenRise[2][0],
      evenRise[3][1] - evenRise[2][1]
    ]);
    /* Overshoot continues the travel but also lifts, so the bubble floats a touch
       above its pose and settles down onto it. */
    var endTan = tangentUnit([travelTan[0], travelTan[1] - 0.62]);
    b.chatOver = [b.chat[0] + endTan[0] * fl.overshoot, b.chat[1] + endTan[1] * fl.overshoot];
    b.fluidRiseB = [
      evenRise[0],
      evenRise[1],
      [evenRise[2][0] + endTan[0] * fl.overshoot, evenRise[2][1] + endTan[1] * fl.overshoot],
      b.chatOver
    ];
    b.pairB = hermiteBez(b.chat, b.Tchat, b.pairEnd, b.Tpair);
    b.diveP1 = [
      b.pairEnd[0] + b.Tpair[0] / 3,
      b.pairEnd[1] + b.Tpair[1] / 3
    ];
    b.diveB = [b.pairEnd, b.diveP1, b.diveP2, b.landPt];
    b.debugD = bezD(b.riseB[0], b.riseB[1], b.riseB[2], b.riseB[3])
      + bezD(b.pairB[0], b.pairB[1], b.pairB[2], b.pairB[3])
      + bezD(b.diveB[0], b.diveB[1], b.diveB[2], b.diveB[3]);
  });
  prepCupApproach();
  prepFluidFill();
}

function prepCupApproach(){
  var Ls = POSES[2].left, Rs = POSES[2].right;
  CUP_BEZ.L = [
    [Ls.x, Ls.y],
    [-10.6, 3.15],
    [-2.2, 6.38],
    [CUP_L_FINAL.x, CUP_L_FINAL.y]
  ];
  CUP_BEZ.R = [
    [Rs.x, Rs.y],
    [61.15, -0.28],
    [50.55, 0.05],
    [CUP_R_FINAL.x, CUP_R_FINAL.y]
  ];
}

var CAFE_SYM_I = 0;
function cafeCupsSvg(vb){
  vb = vb || '0 0 118 44';
  var u = 's' + (CAFE_SYM_I++);
  return ''
    + '<svg class="cafe-cups" viewBox="' + vb + '" fill="none" overflow="visible" aria-hidden="true" shape-rendering="geometricPrecision">'
      + '<defs>'
        + '<symbol id="' + u + '-cup-left" viewBox="0 0 69 37" overflow="visible"><path d="M38.6348 0C46.8616 2.31882e-07 54.315 0.250147 59.7168 0.655273C62.4151 0.857642 64.6138 1.09969 66.1445 1.37109C66.906 1.50612 67.5256 1.65189 67.9639 1.8125C68.18 1.89171 68.3826 1.98527 68.54 2.10156C68.6657 2.19437 68.844 2.36394 68.8867 2.61816L68.8945 2.71191C68.8948 2.71874 68.8965 2.72553 68.8965 2.73242C68.8965 2.73569 68.8956 2.73894 68.8955 2.74219L68.8965 2.74316C68.862 4.29428 68.4798 7.02118 67.9248 9.90332C67.3686 12.7919 66.6308 15.8792 65.8711 18.1582C64.4372 22.4598 60.9393 27.0627 56.0625 31.0186C51.273 34.9035 45.0134 36.751 38.6309 36.751C27.9748 36.7509 18.199 30.9912 13.1113 21.8301C13.06 21.8263 13.0082 21.8166 12.958 21.7959L4.0293 18.1201L3.80273 18.0215C1.49375 16.9642 2.77145e-05 14.6571 0 12.1035C0 8.06555 3.64259 5.00243 7.62012 5.69531L8.54199 5.85547C8.45077 4.82931 8.39266 3.79133 8.36914 2.74316L8.37012 2.74219C8.37007 2.73894 8.36914 2.73569 8.36914 2.73242C8.36914 2.69415 8.37368 2.65692 8.38184 2.62109C8.42368 2.36526 8.60339 2.1947 8.72949 2.10156C8.88697 1.98527 9.08953 1.89171 9.30566 1.8125C9.74391 1.65189 10.3635 1.50612 11.125 1.37109C12.6557 1.09969 14.8545 0.857641 17.5527 0.655273C22.9545 0.250148 30.408 0 38.6348 0ZM9.40234 3.68359C9.62809 8.90444 10.7267 13.845 12.5244 18.2891C16.8141 28.8849 27.1939 35.7509 38.6309 35.751C44.8298 35.751 50.8539 33.9561 55.4326 30.2422C60.2145 26.3633 63.5667 21.9074 64.9219 17.8418C65.6622 15.6208 66.3913 12.5807 66.9434 9.71387C67.3901 7.39382 67.7128 5.21432 67.8389 3.69141C67.4108 3.83516 66.8369 3.97098 66.1445 4.09375C65.1877 4.26339 63.9699 4.42153 62.5322 4.56543C61.6699 4.65192 60.7284 4.73269 59.7168 4.80859C54.3149 5.2139 46.8611 5.46484 38.6348 5.46484H38.6309C30.4046 5.46484 22.9507 5.21389 17.5488 4.80859C16.7352 4.74755 15.9672 4.68124 15.249 4.61328C14.3394 4.52733 13.5101 4.43589 12.7705 4.33984C12.5034 4.30513 12.2481 4.26933 12.0049 4.2334C11.6912 4.18708 11.3973 4.14204 11.125 4.09375C11.0526 4.08091 10.9819 4.06578 10.9121 4.05273C10.8063 4.0329 10.7031 4.01454 10.6035 3.99414C10.4951 3.97206 10.3909 3.94749 10.29 3.9248C10.2421 3.91394 10.1946 3.90457 10.1484 3.89355C9.88208 3.83052 9.64621 3.76324 9.44238 3.69531C9.42907 3.69089 9.41538 3.68804 9.40234 3.68359ZM7.44922 6.68066C4.08321 6.09409 1 8.68637 1 12.1035C1.00003 14.3334 2.34683 16.3423 4.41113 17.1953L12.4121 20.4893C12.1213 19.8936 11.8491 19.2851 11.5977 18.6641C10.1246 15.0226 9.11029 11.0596 8.64551 6.88867L7.44922 6.68066ZM38.6348 1C30.4247 1 22.9968 1.24961 17.627 1.65234C14.9399 1.85388 12.78 2.09282 11.2988 2.35547C10.5952 2.48025 10.0654 2.60817 9.70996 2.73145C10.0654 2.85477 10.5949 2.98357 11.2988 3.1084C12.78 3.37104 14.9399 3.60998 17.627 3.81152C22.9968 4.21426 30.4247 4.46387 38.6348 4.46387C40.6753 4.46387 42.6675 4.44831 44.5918 4.41895C44.6208 4.4185 44.6498 4.41744 44.6787 4.41699C48.5277 4.35736 52.1032 4.24233 55.248 4.08301C56.8279 4.00287 58.299 3.91225 59.6416 3.81152C62.329 3.60989 64.4893 3.371 65.9707 3.1084C66.6752 2.98347 67.2051 2.85486 67.5605 2.73145C67.2051 2.60807 66.675 2.48036 65.9707 2.35547C64.4894 2.09281 62.3289 1.85389 59.6416 1.65234C54.2718 1.24963 46.8446 1 38.6348 1Z" fill="white"/></symbol>'
        + '<symbol id="' + u + '-cup-right" viewBox="0 0 69 37" overflow="visible"><path d="M59.8403 6.45248L61.3619 6.18835C65.0337 5.54848 68.3968 8.37582 68.3968 12.1034C68.3968 14.5364 66.9273 16.7276 64.6766 17.6577L55.748 21.3332" stroke="white" stroke-linecap="round" stroke-linejoin="round"/><path d="M0.5 2.73242C0.5 3.9638 13.8258 4.96453 30.2617 4.96453H30.2654C46.7014 4.96453 60.0272 3.9638 60.0272 2.73242C59.9007 8.3685 58.766 13.7032 56.8352 18.4762C52.4677 29.2648 41.9023 36.2513 30.2654 36.2513C23.9746 36.2513 17.8329 34.4297 13.1487 30.6301C8.31937 26.7127 4.89454 22.1836 3.5 18C2 13.5 0.566964 5.74577 0.5 2.73242Z" stroke="white" stroke-linecap="round" stroke-linejoin="round"/><path d="M30.2617 4.96422C46.6987 4.96422 60.0235 3.96487 60.0235 2.73211C60.0235 1.49935 46.6987 0.5 30.2617 0.5C13.8248 0.5 0.5 1.49935 0.5 2.73211C0.5 3.96487 13.8248 4.96422 30.2617 4.96422Z" stroke="white" stroke-linecap="round" stroke-linejoin="round"/></symbol>'
        + '<clipPath id="' + u + '-yclip"><path d="' + YELLOW_D + '"/></clipPath>'
        + '<clipPath id="' + u + '-ylevel"><path class="yellow-level-path" d="M50.2 30.9 H68.8 V32.2 H50.2 Z"/></clipPath>'
      + '</defs>'
      + '<g class="cafe-live">'
        + '<g class="yellow-mark" clip-path="url(#' + u + '-yclip)">'
          + '<g class="yellow-liquid" clip-path="url(#' + u + '-ylevel)">'
            + '<path class="yellow-fill-path" fill="#FFE300" d="' + YELLOW_D + '"/>'
          + '</g>'
          + '<g class="bubble b-left in"><path class="blob-path" fill="#FFE300"/></g>'
          + '<g class="bubble b-right in"><path class="blob-path" fill="#FFE300"/></g>'
        + '</g>'
        + '<g class="bubble b-left air"><path class="blob-path" fill="#FFE300"/></g>'
        + '<g class="bubble b-right air"><path class="blob-path" fill="#FFE300"/></g>'
        + '<g class="cup-right-move"><use href="#' + u + '-cup-right" width="69" height="37"/></g>'
        + '<g class="cup-left-move"><use href="#' + u + '-cup-left" width="69" height="37"/></g>'
        + '<path class="yellow-edge" d="' + YELLOW_D + '" fill="none" stroke="white" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>'
        + '<g class="debug-arcs" fill="none" pointer-events="none" aria-hidden="true">'
          + '<path class="debug-arc debug-arc-l" stroke="#7ec8e3" stroke-width="0.7" stroke-dasharray="2 1.5" opacity="0.85"/>'
          + '<path class="debug-arc debug-arc-r" stroke="#e3a07e" stroke-width="0.7" stroke-dasharray="2 1.5" opacity="0.85"/>'
          + '<line class="debug-tangent debug-tangent-l" stroke="#7ec8e3" stroke-width="0.8"/>'
          + '<line class="debug-tangent debug-tangent-r" stroke="#e3a07e" stroke-width="0.8"/>'
          + '<circle class="debug-head debug-head-l" r="1.35" fill="#7ec8e3" stroke="none"/>'
          + '<circle class="debug-head debug-head-r" r="1.35" fill="#e3a07e" stroke="none"/>'
        + '</g>'
      + '</g>'
      + '<g class="cafe-icon-final"><path d="M108.946 6.45248L110.467 6.18835C114.139 5.54848 117.502 8.37582 117.502 12.1034C117.502 14.5364 116.033 16.7276 113.782 17.6577L104.854 21.3332" stroke="white" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.0565 13.1497L7.53493 12.8856C3.86308 12.2457 0.5 15.0731 0.5 18.8007C0.5 21.2337 1.96949 23.4249 4.22022 24.3549L13.1487 28.0305" stroke="white" stroke-linecap="round" stroke-linejoin="round"/><path d="M52.7994 18.4772C51.8991 16.2562 51.1774 13.9125 50.6454 11.4721C46.9698 11.5948 42.9074 11.6618 38.6328 11.6618C22.1969 11.6618 8.87109 10.6611 8.87109 9.42969C8.99758 15.062 10.1322 20.3968 12.063 25.1735C16.4269 35.9621 26.9923 42.9486 38.6328 42.9486C48.1677 42.9486 56.9772 38.2574 62.2525 30.631C58.123 27.5879 54.8046 23.4362 52.7994 18.4772Z" stroke="white" stroke-linecap="round" stroke-linejoin="round"/><path d="M79.3672 4.96453C62.9313 4.96453 49.6055 3.9638 49.6055 2.73242C49.6724 5.74577 50.0333 8.66984 50.6434 11.4711C61.0935 11.1252 68.3926 10.3402 68.3926 9.42876C68.2661 15.0611 67.1314 20.3959 65.2006 25.1726C64.4119 27.122 63.4186 28.9449 62.2542 30.6301C67.1091 34.2089 73.08 36.2513 79.3709 36.2513C91.0078 36.2513 101.573 29.2648 105.941 18.4762C107.871 13.7033 109.006 8.3685 109.133 2.73242C109.133 3.9638 95.8068 4.96453 79.3709 4.96453H79.3672Z" stroke="white" stroke-linecap="round" stroke-linejoin="round"/><path d="M68.3937 9.42969C68.3937 10.3411 61.0946 11.1261 50.6445 11.4721C51.1765 13.9088 51.902 16.2525 52.7985 18.4772C54.8037 23.4362 58.1222 27.5879 62.2516 30.631C63.416 28.9495 64.4093 27.1229 65.198 25.1735C67.1288 20.4005 68.2635 15.0658 68.39 9.42969H68.3937Z" fill="#FFE300" stroke="white" stroke-linecap="round" stroke-linejoin="round"/><path d="M79.3672 4.96422C95.8041 4.96422 109.129 3.96487 109.129 2.73211C109.129 1.49935 95.8041 0.5 79.3672 0.5C62.9302 0.5 49.6055 1.49935 49.6055 2.73211C49.6055 3.96487 62.9302 4.96422 79.3672 4.96422Z" stroke="white" stroke-linecap="round" stroke-linejoin="round"/><path d="M38.6328 11.6595C55.0698 11.6595 68.3946 10.6602 68.3946 9.42742C68.3946 8.19466 55.0698 7.19531 38.6328 7.19531C22.1959 7.19531 8.87109 8.19466 8.87109 9.42742C8.87109 10.6602 22.1959 11.6595 38.6328 11.6595Z" fill="#373230" stroke="white" stroke-linecap="round" stroke-linejoin="round"/></g>'
    + '</svg>';
}

function welcomeHTML(){
  return '<div class="statusbar"><span>9:41</span><span class="glyphs">'
    + ICONS.signal + ICONS.wifi + ICONS.battery + '</span></div>'
    + '<section class="cafe-welcome" aria-label="Welcome">'
      + '<div class="cafe-welcome-lockup">'
        + '<div class="cafe-hero-slot">'
          + '<div class="cafe-hero-fly">' + cafeCupsSvg('0 0 118 44') + '</div>'
        + '</div>'
        + '<h2 class="cafe-display">Welcome to the <b>Café</b>!</h2>'
        + '<p class="cafe-sub">Grab a coffee and chat with a Hebrew partner, wherever they are in the world. Mistakes are welcome, this is all about having fun.</p>'
      + '</div>'
    + '</section>';
}
function zoomHTML(){
  return '<div class="cafe-hero-fly" data-zoom="1">' + cafeCupsSvg('-22 -68 162 128') + '</div>';
}

var ST = { playing: false, ms: 0, raf: 0, pose: 0, t0: 0, rate: 1 };

function poseIndexAt(ms){
  var i = 0;
  while(i < POSE_MS.length - 1 && ms >= POSE_MS[i + 1]) i++;
  return i;
}

function cupsAt(ms){
  if(ms <= CUP_MS[0]) return {left: POSES[0].left, right: POSES[0].right};
  if(ms >= TOTAL_MS) return {left: CUP_L_FINAL, right: CUP_R_FINAL};
  if(ms <= CUP_HOLD_MS){
    if(ms <= CUP_MS[2]){
      var j = 0;
      while(j < 2 && ms > CUP_MS[j + 1]) j++;
      var u = smooth(u01(ms, CUP_MS[j], CUP_MS[j + 1]));
      return {left: lerpPt(POSES[j].left, POSES[j + 1].left, u), right: lerpPt(POSES[j].right, POSES[j + 1].right, u)};
    }
    return {left: POSES[2].left, right: POSES[2].right};
  }
  if(MOTION_MODE === 'refine' && CUP_BEZ.L){
    var t = cubicBezierEase(0.42, 0.0, 0.28, 1.0, u01(ms, CUP_HOLD_MS, CUP_SETTLE_MS));
    var lp = cubic3(CUP_BEZ.L[0], CUP_BEZ.L[1], CUP_BEZ.L[2], CUP_BEZ.L[3], t);
    var rp = cubic3(CUP_BEZ.R[0], CUP_BEZ.R[1], CUP_BEZ.R[2], CUP_BEZ.R[3], t);
    if(ms >= CUP_SETTLE_MS) return {left: CUP_L_FINAL, right: CUP_R_FINAL};
    return {
      left: {x: lp[0], y: lp[1], rot: 0},
      right: {x: rp[0], y: rp[1], rot: 0}
    };
  }
  if(!CUP_DEPTH_APPROACH){
    var last = CUP_MS.length - 1;
    if(ms >= CUP_MS[last]) return {left: POSES[last].left, right: POSES[last].right};
    var i = 0;
    while(i < last && ms > CUP_MS[i + 1]) i++;
    var t0 = smooth(u01(ms, CUP_MS[i], CUP_MS[i + 1]));
    return {left: lerpPt(POSES[i].left, POSES[i + 1].left, t0), right: lerpPt(POSES[i].right, POSES[i + 1].right, t0)};
  }
  var keys = [
    {t: CUP_HOLD_MS, left: POSES[2].left, right: POSES[2].right},
    {t: 2000, left: POSES[3].left, right: POSES[3].right},
    {t: 2340, left: POSES[4].left, right: POSES[4].right},
    {t: CUP_SETTLE_MS, left: CUP_L_FINAL, right: CUP_R_FINAL}
  ];
  var k = 0;
  while(k < keys.length - 1 && ms > keys[k + 1].t) k++;
  if(ms >= keys[keys.length - 1].t) return {left: CUP_L_FINAL, right: CUP_R_FINAL};
  var s = smooth(u01(ms, keys[k].t, keys[k + 1].t));
  return {left: lerpPt(keys[k].left, keys[k + 1].left, s), right: lerpPt(keys[k].right, keys[k + 1].right, s)};
}

function cupTransform(p){
  return 'translate(' + p.x.toFixed(3) + ' ' + p.y.toFixed(3) + ') rotate(' + p.rot.toFixed(2) + ' 34.5 18.5)';
}

function pairParam(spec, ms){
  if(ms <= spec.chatT) return 0;
  if(ms <= spec.leaveT){
    var h = (ms - spec.chatT) / Math.max(1, spec.leaveT - spec.chatT);
    return 0.10 * h;
  }
  if(ms >= spec.pairT) return 1;
  var u = (ms - spec.leaveT) / Math.max(1, spec.pairT - spec.leaveT);
  var e = 0.72 * u + 0.28 * u * u;
  return 0.10 + 0.90 * e;
}

function diveParam(spec, ms){
  if(ms <= spec.pairT) return 0;
  if(ms >= spec.land) return 1;
  var t = (ms - spec.pairT) / Math.max(1, spec.land - spec.pairT);
  return 0.86 * t + 0.14 * t * t;
}

function morphPair(spec, ms){
  if(ms <= spec.leaveT) return 0;
  if(ms >= spec.pairT) return 1;
  var u = (ms - spec.leaveT) / Math.max(1, spec.pairT - spec.leaveT);
  return 0.62 * u + 0.38 * u * u;
}

function morphFromChat(shapes, u){
  u = clamp(u, 0, 1);
  var k = u * u * (3 - 2 * u);
  var pts = MOTION_MODE === 'refine'
    ? lerpPtsStagger(shapes.chat, shapes.mid, k, 0.11)
    : lerpPts(shapes.chat, shapes.mid, k);
  return matchMass(pts, lerp(shapes.mass, shapes.midMass, k));
}

function morphFromMid(shapes, u){
  u = clamp(u, 0, 1);
  var k = 1 - Math.pow(1 - u, 1.55);
  var pts = MOTION_MODE === 'refine'
    ? lerpPtsStagger(shapes.mid, shapes.fall, k, 0.09)
    : lerpPts(shapes.mid, shapes.fall, k);
  return matchMass(pts, lerp(shapes.midMass, shapes.dropMass, k));
}

function polishPulse(t){
  t = clamp(t, 0, 1);
  return Math.sin(Math.PI * t);
}

function polishedTakeoffShape(shapes, anticipation, release){
  var n = shapes.drop.length;
  var pts = shapes.drop.map(function(p, i){
    var head = Math.min(i, n - i) / (n * 0.5);
    var tail = 1 - head;
    var compress = anticipation * (1 - release);
    var pull = release * (0.35 + 0.65 * head);
    return [
      p[0] * (1 + 0.035 * compress - 0.012 * pull),
      p[1] * (1 - 0.045 * compress + 0.035 * pull) - 0.7 * pull * head + 0.25 * compress * tail
    ];
  });
  return matchMass(pts, Math.abs(ringArea(shapes.drop)));
}

function polishedGravityYield(pts, amount, sideDelay){
  if(amount <= 0) return pts;
  var n = pts.length;
  return pts.map(function(p, i){
    var head = Math.min(i, n - i) / (n * 0.5);
    var tail = 1 - head;
    var local = smooth(clamp((amount - sideDelay * tail) / Math.max(0.01, 1 - sideDelay), 0, 1));
    return [
      p[0] * (1 - 0.025 * local * tail),
      p[1] + 1.35 * local * head - 0.2 * local * tail
    ];
  });
}

function polishedAbsorbTail(pts, amount){
  amount = clamp(amount, 0, 1);
  if(amount <= 0) return pts;
  var n = pts.length;
  var span = Math.max(3, Math.round(n * 0.14));
  var bridge = [
    (pts[span][0] + pts[n - span][0]) * 0.5,
    (pts[span][1] + pts[n - span][1]) * 0.5
  ];
  return pts.map(function(p, i){
    var edge = Math.min(i, n - i);
    var w = 1 - clamp(edge / span, 0, 1);
    w = smooth(w) * amount;
    return [lerp(p[0], bridge[0], w), lerp(p[1], bridge[1], w)];
  });
}

function polishedPairParam(spec, ms){
  if(ms <= spec.leaveT) return 0;
  if(ms >= spec.pairT) return 1;
  var u = u01(ms, spec.leaveT, spec.pairT);
  var pairDur = spec.pairT - spec.leaveT;
  var diveDur = spec.land - spec.pairT;
  /* Match the pair-end speed to the gravity-led dive start for C1 continuity. */
  var desiredEndSlope = 0.72 * pairDur / Math.max(1, diveDur);
  var x2 = 0.70;
  var y2 = clamp(1 - (1 - x2) * desiredEndSlope, 0.72, 0.9);
  return cubicBezierEase(0.42, 0, x2, y2, u);
}

function polishedDiveParam(spec, ms){
  if(ms <= spec.pairT) return 0;
  if(ms >= spec.land) return 1;
  var u = u01(ms, spec.pairT, spec.land);
  return 0.72 * u + 0.28 * u * u;
}

function polishedBubbleAtV1(spec, shapes, ms){
  var isLeft = spec === BUBBLE.L;
  var anticipateDur = isLeft ? 90 : 76;
  var anticipateStart = spec.launch - anticipateDur;
  if(ms < anticipateStart){
    return {op: 0, cx: spec.start[0], cy: spec.start[1], rot: spec.rot0, sx: 1, sy: 1, d: ptsToD(shapes.drop), clipped: false, merge: 0};
  }
  if(ms < spec.launch){
    var a = smooth(u01(ms, anticipateStart, spec.launch));
    var anticipPts = polishedTakeoffShape(shapes, a, 0);
    return {
      op: smooth(u01(ms, anticipateStart, anticipateStart + 24)),
      cx: spec.start[0], cy: spec.start[1], rot: spec.rot0,
      sx: 1, sy: 1, d: ptsToD(anticipPts), clipped: false, merge: 0
    };
  }
  if(ms >= spec.fadeEnd){
    return {op: 0, cx: POOL_CX, cy: POOL_BOTTOM_Y, rot: 0, sx: 1, sy: 1, d: ptsToD(shapes.poolFull || shapes.fall), clipped: true, merge: 1};
  }
  if(ms >= spec.land){
    var impact = bubblePour(spec, shapes, ms);
    var impactT = u01(ms, spec.land, spec.land + (isLeft ? 82 : 96));
    var impactPulse = polishPulse(impactT);
    impact.sx *= 1 + 0.025 * impactPulse;
    impact.sy *= 1 - 0.035 * impactPulse;
    return impact;
  }

  var bez, t, phase;
  if(ms <= spec.chatT){
    phase = 'rise';
    bez = spec.riseB;
    var riseU = u01(ms, spec.launch, spec.chatT);
    /* Quick buoyant release, then a long ease toward the crest. */
    t = cubicBezierEase(0.18, 0.52, 0.22, 1, riseU);
  } else if(ms <= spec.leaveT){
    phase = 'hold';
    bez = spec.riseB;
    t = 1;
  } else if(ms <= spec.pairT){
    phase = 'release';
    bez = spec.pairB;
    t = polishedPairParam(spec, ms);
  } else {
    phase = 'descent';
    bez = spec.diveB;
    t = polishedDiveParam(spec, ms);
  }

  var p = cubic3(bez[0], bez[1], bez[2], bez[3], t);
  var v = cubic3d(bez[0], bez[1], bez[2], bez[3], t);
  var pts, rot = spec.rotChat, sx = 1, sy = 1;

  if(phase === 'rise'){
    var riseShape = cubicBezierEase(0.16, 0.58, 0.24, 1, u01(ms, spec.launch, spec.chatT));
    pts = lerpPtsStagger(shapes.drop, shapes.chat, riseShape, isLeft ? 0.12 : 0.15);
    pts = matchMass(pts, lerp(Math.abs(ringArea(shapes.drop)), shapes.mass, smooth(riseShape)));

    var releaseU = u01(ms, spec.launch, spec.launch + (isLeft ? 105 : 128));
    if(releaseU < 1){
      pts = polishedTakeoffShape({drop: pts}, 1, smooth(releaseU));
    }

    var settleDur = isLeft ? 220 : 190;
    var settleU = u01(ms, spec.chatT - settleDur, spec.chatT);
    var settlePulse = polishPulse(settleU);
    sx = 1 + 0.04 * settlePulse;
    sy = 1 + 0.024 * settlePulse;

    var riseAmp = clamp(Math.hypot(v[0], v[1]) / 66, 0, 1) * 0.055;
    riseAmp *= 1 - smooth(u01(ms, spec.chatT - 150, spec.chatT));
    pts = liquidDeform(pts, v[0], v[1], riseAmp);
    rot = lerp(spec.rot0, spec.rotChat, smooth(riseShape));
  } else if(phase === 'hold'){
    /* A literal hold: exact path, position, scale, and rotation. */
    p = spec.chat;
    pts = shapes.chat;
    rot = spec.rotChat;
  } else if(phase === 'release'){
    var releaseShape = smooth(t);
    pts = lerpPtsStagger(shapes.chat, shapes.mid, releaseShape, isLeft ? 0.13 : 0.17);
    pts = matchMass(pts, lerp(shapes.mass, shapes.midMass, releaseShape));
    var yieldDur = isLeft ? 105 : 145;
    var yieldAmount = polishPulse(u01(ms, spec.leaveT, spec.leaveT + yieldDur));
    pts = polishedGravityYield(pts, yieldAmount, isLeft ? 0.12 : 0.16);
    var releaseAmp = clamp(Math.hypot(v[0], v[1]) / 72, 0, 1) * 0.045;
    pts = liquidDeform(pts, v[0], v[1], releaseAmp);
  } else {
    var diveShape = polishedDiveParam(spec, ms);
    pts = lerpPtsStagger(shapes.mid, shapes.fall, 1 - Math.pow(1 - diveShape, 1.45), isLeft ? 0.09 : 0.13);
    pts = matchMass(pts, lerp(shapes.midMass, shapes.dropMass, diveShape));
    var descentAmp = clamp(Math.hypot(v[0], v[1]) / 62, 0, 1) * (isLeft ? 0.062 : 0.057);
    descentAmp *= 1 - 0.42 * smooth(u01(ms, spec.land - (isLeft ? 105 : 140), spec.land));
    pts = liquidDeform(pts, v[0], v[1], descentAmp);
    if(ms > spec.land - (isLeft ? 92 : 126)){
      /* Stretch peaks before contact, then resolves to the impact shape at the boundary. */
      var pre = polishPulse(u01(ms, spec.land - (isLeft ? 92 : 126), spec.land));
      pts = pts.map(function(q){ return [q[0] * (1 - 0.018 * pre), q[1] * (1 + 0.055 * pre)]; });
      pts = matchMass(pts, shapes.dropMass);
    }
  }

  var clipped = ENTRY_CLIP && (p[1] >= RIM_Y + 0.8 || ms >= spec.land);
  return {op: 1, cx: p[0], cy: p[1], rot: rot, sx: sx, sy: sy, d: ptsToD(pts), clipped: clipped, merge: 0};
}

function polishedTakeoffShapeV2(shapes, anticipation, release){
  var base = shapes.dropSoft || shapes.drop;
  var n = base.length;
  var pts = base.map(function(p, i){
    var head = Math.min(i, n - i) / (n * 0.5);
    var tail = 1 - head;
    var held = anticipation * (1 - release);
    var lead = smooth(release) * head;
    return [
      p[0] * (1 + 0.045 * held - 0.018 * lead),
      p[1] * (1 - 0.065 * held + 0.085 * lead) - 0.8 * lead + 0.3 * held * tail
    ];
  });
  pts = softenRing(pts, 1, Math.abs(ringArea(base)));
  return redrawLiquidTail(pts, 1.5 * Math.min(POLISH_STRENGTH, 1.6), Math.abs(ringArea(base)));
}

function tangentUnit(v){
  var len = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / len, v[1] / len];
}

function logAreaLerp(a, b, t){
  a = Math.max(0.001, a);
  b = Math.max(0.001, b);
  return Math.exp(lerp(Math.log(a), Math.log(b), clamp(t, 0, 1)));
}

function polishedBubbleAtV2(spec, shapes, ms){
  var isLeft = spec === BUBBLE.L;
  var softDrop = shapes.dropSoft || shapes.drop;
  var softChat = shapes.chatSoft || shapes.chat;
  var softMid = shapes.midSoft || shapes.mid;
  var softFall = shapes.fallSoft || shapes.fall;
  var anticipateDur = isLeft ? 104 : 116;
  var anticipateStart = spec.launch - anticipateDur;
  var initialV = cubic3d(spec.polishRiseB[0], spec.polishRiseB[1], spec.polishRiseB[2], spec.polishRiseB[3], 0);
  var releaseRot = Math.atan2(initialV[1], initialV[0]) * 180 / Math.PI + 90;

  if(ms < anticipateStart){
    return {op: 0, cx: spec.start[0], cy: spec.start[1], rot: releaseRot, sx: 1, sy: 1, d: ptsToSmoothD(softDrop), clipped: false, merge: 0};
  }
  if(ms < spec.launch){
    var anticipation = smooth(u01(ms, anticipateStart, spec.launch));
    var anticipPts = polishedTakeoffShapeV2(shapes, anticipation, 0);
    return {
      op: smooth(u01(ms, anticipateStart, anticipateStart + 22)),
      cx: spec.start[0], cy: spec.start[1], rot: releaseRot,
      sx: 1, sy: 1, d: ptsToSmoothD(anticipPts), clipped: false, merge: 0,
      tangent: isLeft ? [0.18, -1] : [-0.22, -1]
    };
  }
  if(ms >= spec.fadeEnd){
    return {op: 0, cx: POOL_CX, cy: POOL_BOTTOM_Y, rot: 0, sx: 1, sy: 1, d: ptsToSmoothD(softFall), clipped: true, merge: 1};
  }
  if(ms >= spec.land){
    var impact = bubblePour(spec, shapes, ms);
    var impactU = u01(ms, spec.land, spec.land + (isLeft ? 78 : 94));
    var compression = polishPulse(impactU);
    impact.sx *= 1 + 0.028 * compression;
    impact.sy *= 1 - 0.042 * compression;
    if(impact.pts){
      var impactPts = softenRing(impact.pts, 2, Math.abs(ringArea(impact.pts)));
      impactPts = redrawLiquidTail(impactPts, 1.55 * Math.min(POLISH_STRENGTH, 1.6), Math.abs(ringArea(impact.pts)));
      impact.d = ptsToSmoothD(impactPts);
    }
    impact.tangent = [0, 1];
    return impact;
  }

  var bez, t, phase;
  if(ms < spec.chatT){
    phase = 'rise';
    bez = spec.polishRiseB;
    var riseU = u01(ms, spec.launch, spec.chatT);
    t = cubicBezierEase(0.16, 0.5, 0.28, 1, riseU);
  } else if(ms <= spec.leaveT){
    phase = 'hold';
    bez = spec.polishRiseB;
    t = 1;
  } else if(ms <= spec.pairT){
    phase = 'release';
    bez = spec.pairB;
    t = polishedPairParam(spec, ms);
  } else {
    phase = 'descent';
    bez = spec.diveB;
    t = polishedDiveParam(spec, ms);
  }

  var p = cubic3(bez[0], bez[1], bez[2], bez[3], t);
  var v = cubic3d(bez[0], bez[1], bez[2], bez[3], t);
  var tangent = tangentUnit(v);
  var pts, rot = spec.rotChat, sx = 1, sy = 1;

  if(phase === 'rise'){
    /* Body growth starts almost immediately: midway it is already broader than
       tall, and by 70% only contour refinement remains. */
    var morphEnd = lerp(0.78, 0.64, clamp(POLISH_STRENGTH - 1, 0, 1));
    var morphLinear = clamp((riseU - 0.01) / morphEnd, 0, 1);
    var morphU = 1 - Math.pow(1 - morphLinear, lerp(3.0, 4.2, clamp(POLISH_STRENGTH - 1, 0, 1)));
    var riseMass = logAreaLerp(Math.abs(ringArea(softDrop)), shapes.mass, morphU);
    pts = lerpPtsStagger(softDrop, softChat, morphU, isLeft ? 0.17 : 0.21);
    pts = matchMass(pts, riseMass);
    /* The body opens broadside while the head pulls it through mid-arc. This
       preserves area and resolves completely before the exact chat hold. */
    var broadside = Math.sin(Math.PI * clamp((riseU - 0.08) / 0.78, 0, 1));
    var broadScale = 1 + 0.16 * POLISH_STRENGTH * broadside;
    pts = pts.map(function(q){ return [q[0] * broadScale, q[1] / broadScale]; });
    pts = matchMass(pts, riseMass);

    var releaseDur = isLeft ? 118 : 158;
    var releaseU = u01(ms, spec.launch, spec.launch + releaseDur);
    if(releaseU < 1) pts = polishedTakeoffShapeV2({dropSoft: pts}, 1, smooth(releaseU));

    /* Arrival boop follows the shallow endpoint tangent—never vertical. */
    var settleU = u01(ms, spec.chatT - (isLeft ? 226 : 208), spec.chatT);
    var boop = polishPulse(settleU);
    var endV = cubic3d(bez[0], bez[1], bez[2], bez[3], 1);
    var endTangent = tangentUnit(endV);
    p[0] += endTangent[0] * 4.2 * POLISH_STRENGTH * boop;
    p[1] += endTangent[1] * 4.2 * POLISH_STRENGTH * boop;
    sx = 1 + 0.06 * POLISH_STRENGTH * boop;
    sy = 1 + 0.035 * POLISH_STRENGTH * boop;
    pts = pts.map(function(q){ return [q[0] * (1 + 0.018 * POLISH_STRENGTH * boop), q[1] * (1 - 0.01 * POLISH_STRENGTH * boop)]; });

    var speedStretch = clamp(Math.hypot(v[0], v[1]) / 58, 0, 1) * 0.085 * POLISH_STRENGTH;
    speedStretch *= 1 - smooth(u01(ms, spec.chatT - 155, spec.chatT));
    pts = liquidDeform(pts, v[0], v[1], speedStretch);
    pts = matchMass(pts, riseMass);

    /* The visual head direction equals atan2(dy,dx). As the native contour
       morphs from up-facing droplet to side-facing bubble, this calibrated
       local heading removes only that built-in orientation. */
    var tangentAngle = Math.atan2(v[1], v[0]) * 180 / Math.PI;
    var nativeHeading = isLeft
      ? lerp(-90, 0, morphU)
      : lerp(-90, -180, morphU);
    var tangentRot = tangentAngle - nativeHeading;
    while(tangentRot > 180) tangentRot -= 360;
    while(tangentRot < -180) tangentRot += 360;
    var finishStart = lerp(0.65, 0.52, clamp(POLISH_STRENGTH - 1, 0, 1));
    var horizontalFinish = smooth(clamp((riseU - finishStart) / (1 - finishStart), 0, 1));
    rot = lerpAngle(tangentRot, spec.rotChat, horizontalFinish);
  } else if(phase === 'hold'){
    p = spec.chat;
    pts = softChat;
    rot = spec.rotChat;
    tangent = tangentUnit(cubic3d(spec.polishRiseB[0], spec.polishRiseB[1], spec.polishRiseB[2], spec.polishRiseB[3], 1));
  } else if(phase === 'release'){
    var releaseShape = smooth(t);
    var materialU = smooth(u01(ms, spec.leaveT, spec.land));
    var releaseMassFlow = logAreaLerp(shapes.mass, shapes.dropMass, materialU);
    var releaseMass = lerp(lerp(shapes.mass, shapes.midMass, releaseShape), releaseMassFlow, 0.35);
    pts = lerpPtsStagger(softChat, softMid, releaseShape, isLeft ? 0.16 : 0.21);
    pts = matchMass(pts, releaseMass);
    var yieldDur = isLeft ? 112 : 168;
    var yield = polishPulse(u01(ms, spec.leaveT, spec.leaveT + yieldDur));
    pts = polishedGravityYield(pts, yield, isLeft ? 0.16 : 0.22);
    pts = liquidDeform(pts, v[0], v[1], clamp(Math.hypot(v[0], v[1]) / 62, 0, 1) * 0.075);
    pts = matchMass(pts, releaseMass);
    rot = lerp(spec.rotChat, spec.rotChat + (isLeft ? -3 : 3), smooth(releaseShape));
  } else {
    var diveShape = polishedDiveParam(spec, ms);
    var liquidU = 1 - Math.pow(1 - diveShape, 1.5);
    var descentMaterialU = smooth(u01(ms, spec.leaveT, spec.land));
    var descentMassFlow = logAreaLerp(shapes.mass, shapes.dropMass, descentMaterialU);
    var descentMass = lerp(lerp(shapes.midMass, shapes.dropMass, liquidU), descentMassFlow, 0.35);
    pts = lerpPtsStagger(softMid, softFall, liquidU, isLeft ? 0.12 : 0.17);
    pts = matchMass(pts, descentMass);
    var descentStretch = clamp(Math.hypot(v[0], v[1]) / 55, 0, 1) * (isLeft ? 0.095 : 0.087);
    descentStretch *= 1 - 0.45 * smooth(u01(ms, spec.land - (isLeft ? 100 : 138), spec.land));
    pts = liquidDeform(pts, v[0], v[1], descentStretch);
    var preEntry = polishPulse(u01(ms, spec.land - (isLeft ? 96 : 134), spec.land));
    if(preEntry > 0){
      var preEntryMass = Math.abs(ringArea(pts));
      pts = pts.map(function(q){ return [q[0] * (1 - 0.022 * preEntry), q[1] * (1 + 0.075 * preEntry)]; });
      pts = matchMass(pts, preEntryMass);
    }
    pts = matchMass(pts, descentMass);
    rot = lerp(spec.rotChat + (isLeft ? -3 : 3), 0, smooth(clamp((diveShape - 0.7) / 0.3, 0, 1)));
  }

  var areaBeforeCap = Math.abs(ringArea(pts));
  pts = softenRing(pts, 1, areaBeforeCap);
  var capRadius = phase === 'hold' ? 1.7 : phase === 'rise' ? 1.6 : 1.55;
  pts = redrawLiquidTail(pts, capRadius * Math.min(POLISH_STRENGTH, 1.6), areaBeforeCap);
  var clipped = ENTRY_CLIP && (p[1] >= RIM_Y + 0.8 || ms >= spec.land);
  return {
    op: 1, cx: p[0], cy: p[1], rot: rot, sx: sx, sy: sy,
    d: ptsToSmoothD(pts), pts: pts, clipped: clipped, merge: 0, tangent: tangent
  };
}

/* ---- Fluid refinement (v3) ------------------------------------------------
   Same arcs, destinations, holds, landings, and final geometry as the preserved
   polished checkpoint. Refines only: release attack, crest arrival, contour
   curvature, descent onset, and the liquid surface. */
/* Sizes are viewBox units. The phone hero renders 118 units across 168 CSS px, so
   one unit is ~1.42 px there and ~2.5 px in the close-up stage. */
var FLUID = {
  L: {anticipate: 110, sink: 1.85, arrive: 155, overshoot: 5.0, releaseDur: 90, fillShare: 0.58, fillTail: 320, waveAmp: 1.75, waveTau: 250},
  R: {anticipate: 120, sink: 1.65, arrive: 120, overshoot: 4.4, releaseDur: 112, fillShare: 0.42, fillTail: 420, waveAmp: 1.30, waveTau: 270}
};
/* Inspection snapshots retimed for the refinement: every stop shows a different
   state, so no two pause frames repeat a pose. */
var FLUID_POSE_MS = [0, 760, 1360, 1800, 2330, 2400, 2470, 2570, 2680, 2820, 3200];
/* Minimum contour radius of the corrected conversation pose, in viewBox units. */
var FLUID_POSE_RADIUS = 3.4;
/* Ascent timing curve, and the rise control points as offsets: p1 is [dx from the
   start, height fraction of the climb], p2 is [dx back from the crest, dy above it].
   p2 is kept well clear of the crest so the curve still carries speed on arrival. */
var FLUID_RISE_EASE = [0.12, 0.44, 0.70, 0.88];
var FLUID_RISE_CTRL = {
  L: {p1: [1.5, 0.78], p2: [-10.0, 12.0]},
  R: {p1: [-1.5, 0.80], p2: [7.5, 10.0]}
};
var FLUID_FILL = null;

function fluidSpec(spec){ return spec === BUBBLE.L ? FLUID.L : FLUID.R; }

/* Curvature cap: a vertex may not turn tighter than minRadius, so no cusp,
   pinched corner, or angular frame can survive in any interpolated pose. The
   offending turn spreads into its neighbours pass by pass, which reads as a
   fillet rather than a dent. */
function limitCurvature(pts, minRadius, passes, area0, tipEase){
  var n = pts.length;
  if(n < 8) return pts;
  area0 = area0 == null ? Math.abs(ringArea(pts)) : area0;
  var out = pts.map(function(p){ return [p[0], p[1]]; });
  /* Index 0 is the tail terminal, so it may keep a tighter radius than the body
     and its shoulders — the tail stays tapered while the junction rounds out. */
  var tipFactor = tipEase == null ? 1 : tipEase;
  var bound = new Array(n), bi;
  for(bi = 0; bi < n; bi++){
    var edge = smooth(clamp(Math.min(bi, n - bi) / (n * 0.14), 0, 1));
    bound[bi] = 1 / Math.max(0.08, minRadius * lerp(tipFactor, 1, edge));
  }
  passes = passes == null ? 10 : passes;
  for(var pass = 0; pass < passes; pass++){
    var src = out.map(function(p){ return [p[0], p[1]]; });
    var worked = false;
    for(var i = 0; i < n; i++){
      var a = src[(i + n - 1) % n], b = src[i], c = src[(i + 1) % n];
      var ux = b[0] - a[0], uy = b[1] - a[1];
      var vx = c[0] - b[0], vy = c[1] - b[1];
      var lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
      if(lu < 1e-6 || lv < 1e-6) continue;
      var turn = Math.acos(clamp((ux * vx + uy * vy) / (lu * lv), -1, 1));
      var allowed = bound[i] * 0.5 * (lu + lv);
      if(turn <= allowed) continue;
      var w = 0.5 * clamp((turn - allowed) / Math.max(0.18, turn), 0, 1);
      out[i] = [
        b[0] + w * ((a[0] + c[0]) * 0.5 - b[0]),
        b[1] + w * ((a[1] + c[1]) * 0.5 - b[1])
      ];
      worked = true;
    }
    if(!worked) break;
  }
  return matchMass(out, area0);
}

/* Absorb the narrow trailing end onto the chord that spans it. The polished
   version pulled those points onto a single bridge point, which collapsed them
   into a pinch; spreading them along the chord flattens the end instead. */
function fluidAbsorbTail(pts, amount){
  amount = clamp(amount, 0, 1);
  if(amount <= 0) return pts;
  var n = pts.length;
  var span = Math.max(3, Math.round(n * 0.14));
  var from = pts[(n - span) % n], to = pts[span];
  var out = pts.map(function(p){ return [p[0], p[1]]; });
  var steps = 2 * span, j;
  for(j = 1; j < steps; j++){
    var idx = (n - span + j) % n;
    var t = j / steps;
    var w = amount * smooth(1 - Math.abs(2 * t - 1));
    out[idx] = [
      lerp(pts[idx][0], lerp(from[0], to[0], t), w),
      lerp(pts[idx][1], lerp(from[1], to[1], t), w)
    ];
  }
  return out;
}

/* Refinement-only conversation pose. Star-sampling the speech bubble leaves a hard
   beak where the tail meets the body; this rebuilds that region with a real radius.
   The tail keeps its direction and taper, but its shoulder, junction, and terminal
   are visibly soft — and because it is the morph target, the rise and descent
   inherit the corrected shape. */
function fluidChatRing(ring){
  var area = Math.abs(ringArea(ring));
  var pts = redrawLiquidTail(softenRing(ring, 3, area), 2.4, area);
  /* Uniform bound: the pointed terminal and its junction are the whole problem, so
     they are not exempted the way a droplet tip is. */
  return limitCurvature(pts, FLUID_POSE_RADIUS, 80, area, 1.0);
}

function fluidPairParam(spec, ms){
  if(ms <= spec.leaveT) return 0;
  if(ms >= spec.pairT) return 1;
  var u = u01(ms, spec.leaveT, spec.pairT);
  var pairDur = spec.pairT - spec.leaveT;
  var diveDur = spec.land - spec.pairT;
  /* Gravity-led onset out of the hold, with the pair-end speed still matched to
     the dive start so the return stays C1. */
  var desiredEndSlope = 0.72 * pairDur / Math.max(1, diveDur);
  var x2 = 0.70;
  var y2 = clamp(1 - (1 - x2) * desiredEndSlope, 0.72, 0.9);
  return cubicBezierEase(0.55, 0, x2, y2, u);
}

function fluidBubbleAtV3(spec, shapes, ms){
  var isLeft = spec === BUBBLE.L;
  var fl = fluidSpec(spec);
  var softDrop = shapes.dropSoft || shapes.drop;
  var softChat = shapes.chatFluid || shapes.chatSoft || shapes.chat;
  var softMid = shapes.midSoft || shapes.mid;
  var softFall = shapes.fallSoft || shapes.fall;
  var anticipateStart = spec.launch - fl.anticipate;
  var arriveMs = spec.chatT - fl.arrive;
  var over = spec.chatOver || spec.chat;
  var initialV = cubic3d(spec.fluidRiseB[0], spec.fluidRiseB[1], spec.fluidRiseB[2], spec.fluidRiseB[3], 0);
  var releaseRot = Math.atan2(initialV[1], initialV[0]) * 180 / Math.PI + 90;

  if(ms < anticipateStart){
    return {op: 0, cx: spec.start[0], cy: spec.start[1], rot: releaseRot, sx: 1, sy: 1, d: ptsToSmoothD(softDrop), clipped: false, merge: 0};
  }
  if(ms < spec.launch){
    /* Very small gather: a fraction of a unit of sink plus a slight compression,
       carried into the rise so the launch itself is continuous. */
    var anticipation = smooth(u01(ms, anticipateStart, spec.launch));
    var anticipPts = polishedTakeoffShapeV2(shapes, anticipation, 0);
    return {
      op: smooth(u01(ms, anticipateStart, anticipateStart + 20)),
      cx: spec.start[0], cy: spec.start[1] + fl.sink * anticipation, rot: releaseRot,
      sx: 1, sy: 1, d: ptsToSmoothD(anticipPts), clipped: false, merge: 0,
      tangent: isLeft ? [0.18, -1] : [-0.22, -1]
    };
  }
  if(ms >= spec.fadeEnd){
    return {op: 0, cx: POOL_CX, cy: POOL_BOTTOM_Y, rot: 0, sx: 1, sy: 1, d: ptsToSmoothD(softFall), clipped: true, merge: 1};
  }
  if(ms >= spec.land){
    var impact = bubblePour(spec, shapes, ms);
    var impactU = u01(ms, spec.land, spec.land + (isLeft ? 78 : 94));
    var compression = polishPulse(impactU);
    impact.sx *= 1 + 0.024 * compression;
    impact.sy *= 1 - 0.036 * compression;
    if(impact.pts){
      var impactArea = Math.abs(ringArea(impact.pts));
      /* The pooled mass has no tail tip to rebuild, so the curvature cap alone
         resolves the absorbed trailing end — no reconstructed nose to pinch. */
      var impactPts = softenRing(impact.pts, 3, impactArea);
      impactPts = limitCurvature(impactPts, 1.0, 24, impactArea);
      impact.pts = impactPts;
      impact.d = ptsToSmoothD(impactPts);
    }
    impact.tangent = [0, 1];
    return impact;
  }

  var bez, t, phase, riseU = 1;
  if(ms < arriveMs){
    phase = 'rise';
    bez = spec.fluidRiseB;
    riseU = u01(ms, spec.launch, arriveMs);
    /* Clearly quicker first third out of the cup, then a natural ease to the crest
       that still covers ground instead of hanging. */
    t = cubicBezierEase(FLUID_RISE_EASE[0], FLUID_RISE_EASE[1], FLUID_RISE_EASE[2], FLUID_RISE_EASE[3], riseU);
  } else if(ms < spec.chatT){
    phase = 'settle';
    bez = spec.fluidRiseB;
    t = 1;
  } else if(ms <= spec.leaveT){
    phase = 'hold';
    bez = spec.fluidRiseB;
    t = 1;
  } else if(ms <= spec.pairT){
    phase = 'release';
    bez = spec.pairB;
    t = fluidPairParam(spec, ms);
  } else {
    phase = 'descent';
    bez = spec.diveB;
    t = polishedDiveParam(spec, ms);
  }

  var p = cubic3(bez[0], bez[1], bez[2], bez[3], t);
  var v = cubic3d(bez[0], bez[1], bez[2], bez[3], t);
  var tangent = tangentUnit(v);
  var pts, rot = spec.rotChat, sx = 1, sy = 1;

  if(phase === 'rise'){
    var morphEnd = 0.78;
    var morphLinear = clamp((riseU - 0.01) / morphEnd, 0, 1);
    var morphU = 1 - Math.pow(1 - morphLinear, 3.0);
    var riseMass = logAreaLerp(Math.abs(ringArea(softDrop)), shapes.mass, morphU);
    pts = lerpPtsStagger(softDrop, softChat, morphU, isLeft ? 0.17 : 0.21);
    pts = matchMass(pts, riseMass);
    var broadside = Math.sin(Math.PI * clamp((riseU - 0.08) / 0.78, 0, 1));
    var broadScale = 1 + 0.16 * broadside;
    pts = pts.map(function(q){ return [q[0] * broadScale, q[1] / broadScale]; });
    pts = matchMass(pts, riseMass);

    if(u01(ms, spec.launch, spec.launch + fl.releaseDur) < 1){
      pts = polishedTakeoffShapeV2({dropSoft: pts}, 1, smooth(u01(ms, spec.launch, spec.launch + fl.releaseDur)));
    }
    /* The gather is carried out of the cup and released over the first stretch of
       travel, so the dip and the launch are one gesture. */
    p[1] += fl.sink * (1 - smooth(u01(ms, spec.launch, spec.launch + 110)));

    var speedStretch = clamp(Math.hypot(v[0], v[1]) / 58, 0, 1) * 0.085;
    speedStretch *= 1 - smooth(u01(ms, arriveMs - 155, arriveMs));
    pts = liquidDeform(pts, v[0], v[1], speedStretch);
    pts = matchMass(pts, riseMass);

    var tangentAngle = Math.atan2(v[1], v[0]) * 180 / Math.PI;
    var nativeHeading = isLeft ? lerp(-90, 0, morphU) : lerp(-90, -180, morphU);
    var tangentRot = tangentAngle - nativeHeading;
    while(tangentRot > 180) tangentRot -= 360;
    while(tangentRot < -180) tangentRot += 360;
    var horizontalFinish = smooth(clamp((riseU - 0.65) / 0.35, 0, 1));
    rot = lerpAngle(tangentRot, spec.rotChat + (isLeft ? -1.6 : 1.4), horizontalFinish);
  } else if(phase === 'settle'){
    /* Sails a little past the pose and above it, then eases down onto it once.
       Zero velocity at both ends of the decay: buoyant arrival, no bounce. */
    var back = 1 - smooth(u01(ms, arriveMs, spec.chatT));
    p = [lerp(spec.chat[0], over[0], back), lerp(spec.chat[1], over[1], back)];
    pts = softChat;
    sx = 1 + 0.032 * back;
    sy = 1 - 0.022 * back;
    rot = lerpAngle(spec.rotChat, spec.rotChat + (isLeft ? -3.4 : 3.0), back);
    tangent = tangentUnit(cubic3d(bez[0], bez[1], bez[2], bez[3], 1));
  } else if(phase === 'hold'){
    p = spec.chat;
    pts = softChat;
    rot = spec.rotChat;
    tangent = tangentUnit(cubic3d(bez[0], bez[1], bez[2], bez[3], 1));
  } else if(phase === 'release'){
    var releaseShape = smooth(t);
    var materialU = smooth(u01(ms, spec.leaveT, spec.land));
    var releaseMassFlow = logAreaLerp(shapes.mass, shapes.dropMass, materialU);
    var releaseMass = lerp(lerp(shapes.mass, shapes.midMass, releaseShape), releaseMassFlow, 0.35);
    pts = lerpPtsStagger(softChat, softMid, releaseShape, isLeft ? 0.16 : 0.21);
    pts = matchMass(pts, releaseMass);
    var yieldDur = isLeft ? 112 : 168;
    var yielded = polishPulse(u01(ms, spec.leaveT, spec.leaveT + yieldDur));
    pts = polishedGravityYield(pts, yielded, isLeft ? 0.16 : 0.22);
    pts = liquidDeform(pts, v[0], v[1], clamp(Math.hypot(v[0], v[1]) / 62, 0, 1) * 0.075);
    pts = matchMass(pts, releaseMass);
    rot = lerp(spec.rotChat, spec.rotChat + (isLeft ? -3 : 3), smooth(releaseShape));
  } else {
    var diveShape = polishedDiveParam(spec, ms);
    var liquidU = 1 - Math.pow(1 - diveShape, 1.5);
    var descentMaterialU = smooth(u01(ms, spec.leaveT, spec.land));
    var descentMassFlow = logAreaLerp(shapes.mass, shapes.dropMass, descentMaterialU);
    var descentMass = lerp(lerp(shapes.midMass, shapes.dropMass, liquidU), descentMassFlow, 0.35);
    pts = lerpPtsStagger(softMid, softFall, liquidU, isLeft ? 0.12 : 0.17);
    pts = matchMass(pts, descentMass);
    var descentStretch = clamp(Math.hypot(v[0], v[1]) / 55, 0, 1) * (isLeft ? 0.095 : 0.087);
    descentStretch *= 1 - 0.45 * smooth(u01(ms, spec.land - (isLeft ? 100 : 138), spec.land));
    pts = liquidDeform(pts, v[0], v[1], descentStretch);
    var preEntry = polishPulse(u01(ms, spec.land - (isLeft ? 96 : 134), spec.land));
    if(preEntry > 0){
      var preEntryMass = Math.abs(ringArea(pts));
      pts = pts.map(function(q){ return [q[0] * (1 - 0.022 * preEntry), q[1] * (1 + 0.075 * preEntry)]; });
      pts = matchMass(pts, preEntryMass);
    }
    pts = matchMass(pts, descentMass);
    rot = lerp(spec.rotChat + (isLeft ? -3 : 3), 0, smooth(clamp((diveShape - 0.7) / 0.3, 0, 1)));
  }

  var areaBeforeCap = Math.abs(ringArea(pts));
  pts = softenRing(pts, 1, areaBeforeCap);
  var capRadius = (phase === 'hold' || phase === 'settle') ? 1.7 : phase === 'rise' ? 1.6 : 1.55;
  pts = redrawLiquidTail(pts, capRadius, areaBeforeCap);
  /* Both body-to-tail shoulders — not only the sharpest one — are held above a
     minimum radius on every frame. The bound eases back to the pose's own value at
     the crest and at the start of the release, so no frame boundary steps. */
  var minRadius = 1.70, tipEase = 0.72;
  if(phase === 'rise'){
    minRadius = lerp(1.85, 1.70, smooth(riseU));
    /* A droplet terminal may stay tapered; a speech-bubble tail may not. */
    tipEase = lerp(0.50, 0.72, smooth(riseU));
  } else if(phase === 'release'){
    minRadius = lerp(1.70, 1.85, smooth(t));
    tipEase = lerp(0.72, 0.55, smooth(t));
  } else if(phase === 'descent'){
    minRadius = 1.85;
    tipEase = 0.50;
  }
  pts = limitCurvature(pts, minRadius, 12, areaBeforeCap, tipEase);
  var clipped = ENTRY_CLIP && (p[1] >= RIM_Y + 0.8 || ms >= spec.land);
  return {
    op: 1, cx: p[0], cy: p[1], rot: rot, sx: sx, sy: sy,
    d: ptsToSmoothD(pts), pts: pts, clipped: clipped, merge: 0, tangent: tangent
  };
}

/* First moment on the descent where the droplet centre passes the cup rim. */
function fluidRimCross(spec){
  for(var ms = spec.pairT; ms <= spec.land; ms += 2){
    var t = polishedDiveParam(spec, ms);
    var p = cubic3(spec.diveB[0], spec.diveB[1], spec.diveB[2], spec.diveB[3], t);
    if(p[1] >= RIM_Y) return ms;
  }
  return spec.land;
}

/* One continuous rise: the level is the integral of an inflow rate that ramps up
   from each rim crossing, peaks exactly at that droplet's landing, then decays.
   A non-negative continuous rate makes the level monotonic and C1 — impulses can
   accelerate it, but it can never step between fixed stages. */
function prepFluidFill(){
  var rim = {L: fluidRimCross(BUBBLE.L), R: fluidRimCross(BUBBLE.R)};
  var endMs = Math.min(TOTAL_MS, BUBBLE.R.land + FLUID.R.fillTail);
  function rate(side, ms){
    var spec = BUBBLE[side], tail = FLUID[side].fillTail, r = rim[side];
    if(ms <= r || ms >= spec.land + tail) return 0;
    if(ms <= spec.land) return smooth(u01(ms, r, spec.land));
    return 1 - smooth(u01(ms, spec.land, spec.land + tail));
  }
  var step = 1, side, ms, i;
  var area = {L: 0, R: 0};
  for(ms = 0; ms <= TOTAL_MS; ms += step){
    area.L += rate('L', ms) * step;
    area.R += rate('R', ms) * step;
  }
  /* The first landing drives most of the rise; the second adds momentum to a fill
     that is already moving rather than starting a second stage. */
  var kL = FLUID.L.fillShare / Math.max(1e-6, area.L);
  var kR = FLUID.R.fillShare / Math.max(1e-6, area.R);
  var lut = [], acc = 0;
  for(i = 0; i <= TOTAL_MS; i++){
    acc += (kL * rate('L', i) + kR * rate('R', i)) * step;
    lut.push(acc);
  }
  var top = Math.max(1e-6, lut[Math.round(endMs)]);
  for(i = 0; i <= TOTAL_MS; i++) lut[i] = clamp(lut[i] / top, 0, 1);
  /* Peak-normalise each landing's wave impulse so its amplitude is the stated one. */
  function peak(tau){
    var best = 0;
    for(var k = 0; k <= 900; k += 5){
      var val = Math.exp(-k / tau) * (1 - Math.exp(-k / 55));
      if(val > best) best = val;
    }
    return best || 1;
  }
  FLUID_FILL = {
    lut: lut, rimL: rim.L, rimR: rim.R, endMs: endMs,
    normL: peak(FLUID.L.waveTau), normR: peak(FLUID.R.waveTau)
  };
}

function fluidFillAmount(ms){
  if(!FLUID_FILL) return 0;
  var i = clamp(Math.round(ms), 0, TOTAL_MS);
  return FLUID_FILL.lut[i];
}

/* One shallow travelling crest. Each landing adds a single impulse with a soft
   onset; both damp out so the surface is nearly still at the end. */
function fluidWaveAt(ms){
  if(!FLUID_FILL) return {amp: 0, phase: 0};
  function impulse(t0, amp, tau, norm){
    if(ms <= t0) return 0;
    var k = ms - t0;
    return amp * Math.exp(-k / tau) * (1 - Math.exp(-k / 55)) / norm;
  }
  /* After the second landing the surface keeps damping until the very end, so the
     last stretch is monotonically calmer rather than phase-dependent. */
  var quiet = 1 - smooth(u01(ms, BUBBLE.R.land + 240, TOTAL_MS));
  return {
    amp: (impulse(BUBBLE.L.land, FLUID.L.waveAmp, FLUID.L.waveTau, FLUID_FILL.normL)
      + impulse(BUBBLE.R.land, FLUID.R.waveAmp, FLUID.R.waveTau, FLUID_FILL.normR)) * quiet,
    /* One broad crest walking across the surface, ~600 ms per pass. */
    phase: (ms - FLUID_FILL.rimL) / 600 * Math.PI * 2
  };
}

/* Open Catmull–Rom polyline as cubics, so the surface has no polygon corners. */
function openSmoothSegments(pts){
  var n = pts.length, d = '', i;
  for(i = 0; i < n - 1; i++){
    var p0 = pts[Math.max(0, i - 1)];
    var p1 = pts[i];
    var p2 = pts[i + 1];
    var p3 = pts[Math.min(n - 1, i + 2)];
    var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += 'C' + c1[0].toFixed(2) + ' ' + c1[1].toFixed(2)
      + ' ' + c2[0].toFixed(2) + ' ' + c2[1].toFixed(2)
      + ' ' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
  }
  return d;
}

function fluidLiquidClipD(fill, wave){
  var yBottom = 31.55, x0 = 49.85, x1 = 69.15;
  var yTop = lerp(31.2, 9.22, Math.sqrt(clamp(fill, 0, 1)));
  var samples = [], n = 14, i;
  for(i = 0; i <= n; i++){
    var x = lerp(x0, x1, i / n);
    var s = i / n;
    /* Pinned at both walls, so the surface stays inside the overlap. */
    var edge = Math.sin(Math.PI * s);
    var dome = 0.5 * edge;
    var travel = wave.amp * edge * Math.sin(1.25 * Math.PI * s - wave.phase);
    samples.push([x, yTop - dome + travel]);
  }
  return 'M' + x0.toFixed(2) + ' ' + yBottom.toFixed(2)
    + ' L' + samples[0][0].toFixed(2) + ' ' + samples[0][1].toFixed(2)
    + openSmoothSegments(samples)
    + ' L' + x1.toFixed(2) + ' ' + yBottom.toFixed(2) + ' Z';
}

function bubbleAt(spec, shapes, ms){
  if(POLISHED_VARIANT === 'v1') return polishedBubbleAtV1(spec, shapes, ms);
  if(POLISHED_VARIANT === 'v2') return polishedBubbleAtV2(spec, shapes, ms);
  if(POLISHED_VARIANT === 'v3') return fluidBubbleAtV3(spec, shapes, ms);
  var cx = spec.start[0], cy = spec.start[1], rot = spec.rot0, op = 0;
  var sx = 1, sy = 1, d = ptsToD(shapes.drop);
  if(ms < spec.launch){
    return {op: 0, cx: cx, cy: cy, rot: rot, sx: sx, sy: sy, d: d, clipped: false, merge: 0};
  }
  if(ms >= spec.fadeEnd){
    return {op: 0, cx: POOL_CX, cy: POOL_BOTTOM_Y, rot: 0, sx: sx, sy: sy, d: ptsToD(shapes.poolFull || shapes.fall), clipped: true, merge: 1};
  }
  op = ms < spec.launch + 70 ? u01(ms, spec.launch, spec.launch + 70) : 1;
  if(ms >= spec.land){
    return bubblePour(spec, shapes, ms);
  }
  var u = (ms - spec.launch) / (spec.land - spec.launch);
  var s = spec.progress(u);
  var bez, t;
  if(ms <= spec.chatT){
    t = s / 0.5;
    bez = spec.riseB;
  } else if(ms <= spec.pairT){
    t = pairParam(spec, ms);
    bez = spec.pairB;
  } else {
    t = diveParam(spec, ms);
    bez = spec.diveB;
  }
  var p = cubic3(bez[0], bez[1], bez[2], bez[3], t);
  var v = cubic3d(bez[0], bez[1], bez[2], bez[3], t);
  cx = p[0]; cy = p[1];
  var pts;
  if(ms <= spec.chatT){
    pts = lerpPts(shapes.drop, shapes.chat, shapeRise(s));
  } else if(ms <= spec.pairT){
    pts = morphFromChat(shapes, morphPair(spec, ms));
  } else {
    pts = morphFromMid(shapes, diveParam(spec, ms));
  }
  if(ms <= spec.chatT){
    rot = lerp(spec.rot0, spec.rotChat, shapeRise(s));
  } else {
    rot = spec.rotChat;
  }
  if(MOTION_MODE === 'refine'){
    var holding = ms >= spec.chatT && ms <= spec.leaveT;
    if(!holding){
      var amp = clamp(Math.hypot(v[0], v[1]) / 72, 0, 1) * 0.05;
      if(ms > spec.chatT - 180 && ms < spec.chatT){
        var crest = 1 - u01(ms, spec.chatT - 180, spec.chatT);
        amp *= 0.45 + 0.55 * (1 - crest);
        var broad = 0.035 * crest;
        pts = pts.map(function(q){ return [q[0] * (1 + broad), q[1] * (1 + broad * 0.4)]; });
      }
      if(ms > spec.land - 90 && ms < spec.land){
        var pre = u01(ms, spec.land - 90, spec.land);
        pts = pts.map(function(q){ return [q[0] * (1 - 0.02 * pre), q[1] * (1 + 0.045 * pre)]; });
      }
      pts = liquidDeform(pts, v[0], v[1], amp);
      if(ms > spec.leaveT){
        var mass0 = ms <= spec.pairT
          ? lerp(shapes.mass, shapes.midMass, morphPair(spec, ms))
          : lerp(shapes.midMass, shapes.dropMass, diveParam(spec, ms));
        pts = matchMass(pts, mass0);
      }
    }
  }
  /* Stay on the air layer (under both cup strokes) until the droplet center is clearly
     below the opening; then continue inside the YELLOW_D clip. */
  var clipped = ENTRY_CLIP && (cy >= RIM_Y + 0.8 || ms >= spec.land);
  return {op: op, cx: cx, cy: cy, rot: rot, sx: 1, sy: 1, d: ptsToD(pts), clipped: clipped, merge: 0};
}

/* Continuous morph: falling droplet → stream inside overlap → pooled fill mass. */
function bubblePour(spec, shapes, ms){
  if(!ENTRY_CLIP || MOTION_MODE !== 'refine'){
    return bubblePourLegacy(spec, shapes, ms);
  }
  var dur = spec.mergeDur || 250;
  var pour = clamp((ms - spec.land) / dur, 0, 1);
  var toBottom = smooth(clamp(pour / 0.45, 0, 1));
  var toPool = smooth(clamp((pour - 0.28) / 0.72, 0, 1));
  var isFirst = spec === BUBBLE.L;
  var fluidPool = POLISHED_VARIANT === 'v3' && !!shapes.poolPartFluid;
  var poolTarget = isFirst
    ? (fluidPool ? shapes.poolPartFluid : shapes.poolPart)
    : (fluidPool ? shapes.poolFullFluid : shapes.poolFull);
  var poolMass = isFirst ? (fluidPool ? shapes.poolPartFluidMass : shapes.poolPartMass) : shapes.poolFullMass;
  var streamTarget = fluidPool ? shapes.streamFluid : shapes.stream;
  /* Stay rounded on entry; only gently stretch, then widen into the pool — no spike. */
  var neck = shapes.fall.map(function(p, i){
    var n = shapes.fall.length;
    var head = Math.min(i, n - i) / (n * 0.5);
    return [p[0] * (0.92 - 0.08 * toBottom * (1 - head)), p[1] * (1 + 0.08 * toBottom * head)];
  });
  var mid = lerpPtsStagger(neck, streamTarget, toBottom * 0.28, 0.16);
  var pts = lerpPtsStagger(mid, poolTarget, toPool, 0.16);
  if(POLISHED_VARIANT === 'v3'){
    pts = fluidAbsorbTail(pts, smooth(clamp(pour / 0.28, 0, 1)) * 0.92);
  } else if(POLISHED_MOTION){
    /* The narrow trailing end folds into the mass instead of becoming an impact spike. */
    pts = polishedAbsorbTail(pts, smooth(clamp(pour / 0.28, 0, 1)) * 0.92);
  }
  pts = matchMass(pts, lerp(shapes.dropMass, poolMass, toPool));
  /* Keep the morph center inside the overlap; never climb above the rim. */
  var cx = lerp(spec.landPt[0], POOL_CX, smooth(toBottom * 0.4 + toPool * 0.6));
  var cy = lerp(spec.landPt[1], POOL_BOTTOM_Y - (isFirst ? 0.6 : 0.15), toBottom);
  cy = lerp(cy, POOL_CY + (isFirst ? 4.0 : 0.5), toPool);
  cy = Math.max(cy, RIM_Y + 1.2);
  var rot = lerp(spec.rotChat, 0, toPool);
  var op = 1 - smooth(clamp((pour - 0.8) / 0.2, 0, 1));
  return {op: op, cx: cx, cy: cy, rot: rot, sx: 1, sy: 1, d: ptsToD(pts), pts: pts, clipped: true, merge: pour};
}

function bubblePourLegacy(spec, shapes, ms){
  var pour = u01(ms, spec.land, spec.land + 150);
  var fade = MOTION_MODE === 'refine'
    ? smooth(u01(ms, spec.land + 70, spec.fadeEnd))
    : smooth(u01(ms, spec.land + 50, spec.fadeEnd));
  var op = 1 - fade;
  var cx = spec.landPt[0];
  var cy = spec.landPt[1];
  var sx = 1, sy = 1;
  var pts = shapes.fall;
  var rot = spec.rotChat;
  if(MOTION_MODE === 'refine'){
    var sq = clamp(pour / 0.22, 0, 1);
    var el = clamp((pour - 0.22) / 0.78, 0, 1);
    if(pour < 0.22){
      sx = lerp(1, 1.08, sq);
      sy = lerp(1, 0.92, sq);
      cy += sq * 0.35;
    } else {
      sx = lerp(1.08, 0.84, el);
      sy = lerp(0.92, 1.22, el);
      cy += 0.35 + el * 2.15;
    }
    pts = shapes.fall.map(function(q){
      return [q[0] * (1 - 0.05 * pour), q[1] * (1 + 0.1 * pour)];
    });
  } else {
    sx = 0.96;
    sy = 1.08;
    cy += fade * 1.6;
  }
  return {op: op, cx: cx, cy: cy, rot: rot, sx: sx, sy: sy, d: ptsToD(pts), clipped: false, merge: pour};
}

function shapeRise(s){
  return smooth(clamp(s / 0.5, 0, 1));
}

function paintBubble(el, sample){
  if(!el) return;
  var path = el.querySelector('.blob-path');
  if(!sample || sample.op <= 0.01){
    el.style.opacity = '0';
    return;
  }
  el.style.opacity = String(sample.op);
  el.setAttribute('transform',
    'translate(' + sample.cx.toFixed(2) + ' ' + sample.cy.toFixed(2) + ') rotate(' + sample.rot.toFixed(2) + ') scale(' + sample.sx.toFixed(3) + ' ' + sample.sy.toFixed(3) + ')');
  if(path) path.setAttribute('d', sample.d);
}

function paintBubbleLayers(svg, side, sample){
  var air = svg.querySelector('.bubble.b-' + side + '.air');
  var inn = svg.querySelector('.bubble.b-' + side + '.in');
  var fallback = svg.querySelector('.bubble.b-' + side);
  if(!ENTRY_CLIP || !inn){
    paintBubble(air || fallback, sample);
    if(inn){ paintBubble(inn, {op: 0}); inn.style.display = 'none'; }
    return;
  }
  /* Per-droplet only — never force the second droplet into the clip while it is still above the rim. */
  var useIn = !!(sample && sample.clipped);
  if(useIn){
    paintBubble(inn, sample);
    inn.style.display = '';
    if(air){ paintBubble(air, {op: 0}); air.style.display = 'none'; }
  } else {
    paintBubble(air, sample);
    if(air) air.style.display = '';
    paintBubble(inn, {op: 0});
    inn.style.display = 'none';
  }
}

function mergeProgress(spec, ms){
  if(ms < spec.land) return 0;
  return clamp((ms - spec.land) / (spec.mergeDur || 250), 0, 1);
}

function fillAmount(ms){
  if(LIQUID_VARIANT === 'fluid') return fluidFillAmount(ms);
  if(!ENTRY_CLIP || MOTION_MODE !== 'refine'){
    if(MOTION_MODE !== 'refine'){
      var first0 = smooth(u01(ms, LAND_L, LAND_L + 160));
      var second0 = smooth(u01(ms, LAND_R, LAND_R + 180));
      return clamp(first0 * 0.44 + second0 * 0.56, 0, 1);
    }
    var pourL = LAND_L + 50;
    var pourR = LAND_R + 45;
    var first = smooth(u01(ms, pourL, pourL + 160)) * 0.43;
    var second = smooth(u01(ms, pourR, pourR + 180)) * 0.57;
    return clamp(first + second, 0, 1);
  }
  /* Fill rises only after each droplet reaches the bottom of the overlap. */
  function driven(spec){
    var m = mergeProgress(spec, ms);
    var afterBottom = clamp((m - 0.38) / 0.62, 0, 1);
    return smooth(afterBottom) * (spec.fillShare || 0.5);
  }
  return clamp(driven(BUBBLE.L) + driven(BUBBLE.R), 0, 1);
}

function settleStartMs(){
  return BUBBLE.R.land + (BUBBLE.R.mergeDur || 240);
}

/* Cubic ease-out: zero end velocity. 0 = still waving; 1 = exact YELLOW_D resting state. */
function settleAmount(ms){
  if(LIQUID_VARIANT === 'fluid'){
    /* The level is already full when the inflow stops; this only retires the
       residual wave into the exact resting mark. */
    var uf = u01(ms, FLUID_FILL ? FLUID_FILL.endMs : TOTAL_MS - 120, TOTAL_MS);
    return 1 - Math.pow(1 - uf, 3);
  }
  if(!(ENTRY_CLIP && MOTION_MODE === 'refine')) return ms >= TOTAL_MS ? 1 : 0;
  var t0 = settleStartMs();
  var t1 = Math.min(TOTAL_MS, t0 + 220);
  var u = u01(ms, t0, t1);
  return 1 - Math.pow(1 - u, 3);
}

function noLiveFinalSwap(){
  return ENTRY_CLIP && MOTION_MODE === 'refine';
}

function swellAmount(ms){
  /* The continuous fill carries impact energy in the surface wave, not in a swell
     of the whole liquid body. */
  if(LIQUID_VARIANT === 'fluid') return 0;
  function bump(t0, amp, dur){
    var t = u01(ms, t0, t0 + dur);
    if(t <= 0 || t >= 1) return 0;
    return Math.sin(t * Math.PI) * amp;
  }
  if(!ENTRY_CLIP || MOTION_MODE !== 'refine'){
    if(MOTION_MODE !== 'refine'){
      return bump(LAND_L, 0.07, 200) + bump(LAND_R, 0.05, 220);
    }
    return bump(LAND_L + 50, 0.05, 200) + bump(LAND_R + 45, 0.038, 220);
  }
  /* One small rise-and-settle per droplet, timed to bottom contact. */
  return bump(LAND_L + 95, 0.055, 170) + bump(LAND_R + 90, 0.07, 190);
}

function liquidClipD(fill, swell){
  var yBottom = 31.55;
  var heightT = MOTION_MODE === 'refine' ? Math.sqrt(clamp(fill, 0, 1)) : fill;
  var yTop = lerp(31.2, 9.22, heightT);
  var curve = (MOTION_MODE === 'refine' ? 1.15 : 1.4) + swell * (MOTION_MODE === 'refine' ? 3.2 : 4.5);
  var live = MOTION_MODE === 'refine' ? 0 : Math.max(0, 1 - fill);
  var wave = live * 6.8 + swell * (MOTION_MODE === 'refine' ? 0 : 18);
  if(MOTION_MODE !== 'refine'){
    var yA = yTop - wave * 0.45;
    var yB = yTop + wave * 0.62;
    var yC = yTop - wave * 0.18;
    return 'M50.15 32.25 L50.15 ' + yTop.toFixed(2)
      + ' C54.2 ' + yA.toFixed(2) + ' 58.6 ' + yB.toFixed(2) + ' 62.5 ' + yC.toFixed(2)
      + ' C65.6 ' + yA.toFixed(2) + ' 67.7 ' + yTop.toFixed(2) + ' 68.85 ' + yTop.toFixed(2)
      + ' L68.85 32.25 Z';
  }
  /* Soft meniscus: local swell under impact, clipped inside overlap. */
  var overshoot = ENTRY_CLIP ? swell * 2.4 : swell * 1.6;
  var yMid = yTop - curve * 0.42 - overshoot;
  var ySide = yTop + curve * 0.1;
  var yLeft = yTop - overshoot * 0.35;
  return 'M49.85 ' + yBottom.toFixed(2)
    + ' L49.85 ' + ySide.toFixed(2)
    + ' C53.4 ' + yLeft.toFixed(2) + ' 57.2 ' + yMid.toFixed(2) + ' 60.4 ' + yMid.toFixed(2)
    + ' C63.8 ' + yMid.toFixed(2) + ' 66.8 ' + ySide.toFixed(2) + ' 69.15 ' + yTop.toFixed(2)
    + ' L69.15 ' + yBottom.toFixed(2) + ' Z';
}

function paintLiquid(svg, ms, finT){
  var mark = svg.querySelector('.yellow-mark');
  var level = svg.querySelector('.yellow-level-path') || svg.querySelector('.yellow-level-rect');
  var liquid = svg.querySelector('.yellow-liquid');
  var fillPath = svg.querySelector('.yellow-fill-path');
  var edge = svg.querySelector('.yellow-edge');
  if(!mark || !level) return;

  var continuous = noLiveFinalSwap();
  var fill = fillAmount(ms) * (continuous ? 1 : (1 - finT));
  var settle = continuous ? settleAmount(ms) : 0;
  var anyIn = ENTRY_CLIP && (ms >= BUBBLE.L.land - 40 || ms >= BUBBLE.R.land - 40);
  if(continuous && settle >= 1) anyIn = true;

  if(fill <= 0.001 && !anyIn){
    mark.style.opacity = '0';
    if(liquid) liquid.style.opacity = '0';
    if(edge){
      edge.setAttribute('d', YELLOW_D);
      edge.setAttribute('opacity', '0');
    }
    return;
  }

  mark.style.opacity = '1';
  if(fillPath) fillPath.setAttribute('d', YELLOW_D);
  if(edge) edge.setAttribute('d', YELLOW_D);

  /* Progressive edge with the fill — same path/transform for the whole sequence. */
  if(edge){
    var edgeOp = clamp(Math.max(fill * 3.2, anyIn ? 0.2 : 0), 0, 1);
    if(settle > 0) edgeOp = 1;
    edge.setAttribute('opacity', String(edgeOp));
  }

  if(continuous && settle >= 0.999){
    /* Exact resting mark: one persistent YELLOW_D path, no level clip, no transform. */
    if(liquid){
      liquid.style.opacity = '1';
      liquid.removeAttribute('clip-path');
      liquid.setAttribute('transform', '');
    }
    return;
  }

  if(liquid) liquid.style.opacity = fill <= 0.001 ? '0' : '1';
  if(liquid && !liquid.getAttribute('clip-path')){
    var yclip = svg.querySelector('clipPath[id$="-ylevel"]');
    if(yclip) liquid.setAttribute('clip-path', 'url(#' + yclip.id + ')');
  }

  var swell = swellAmount(ms);
  var fillDraw = continuous ? lerp(fill, 1, settle) : fill;
  var swellDraw = continuous ? swell * (1 - settle) : swell;

  if(level.tagName && level.tagName.toLowerCase() === 'rect'){
    var y = lerp(30.95, 9.22, fillDraw);
    level.setAttribute('y', y.toFixed(3));
    level.setAttribute('height', (32.2 - y).toFixed(3));
  } else if(LIQUID_VARIANT === 'fluid'){
    var wave = fluidWaveAt(ms);
    wave.amp *= 1 - settle;
    level.setAttribute('d', fluidLiquidClipD(Math.max(fillDraw, 0.001), wave));
  } else {
    level.setAttribute('d', liquidClipD(Math.max(fillDraw, 0.001), swellDraw));
  }
  if(liquid){
    if(LIQUID_VARIANT === 'fluid'){
      liquid.setAttribute('transform', '');
    } else if(MOTION_MODE === 'refine'){
      var sx = 1 + swellDraw * 0.22 * (1 - settle);
      var sy = 1 + swellDraw * 0.7 * (1 - settle);
      if(settle >= 0.999 || (sx === 1 && sy === 1)){
        liquid.setAttribute('transform', '');
      } else {
        liquid.setAttribute('transform',
          'translate(59.5 30.55) scale(' + sx.toFixed(4) + ' ' + sy.toFixed(4) + ') translate(-59.5 -30.55)');
      }
    } else {
      liquid.setAttribute('transform', 'translate(59.6 28.2) scale(' + (1 + swellDraw).toFixed(4) + ' ' + (1 + swellDraw * 0.55).toFixed(4) + ') translate(-59.6 -28.2)');
    }
  }
}

function paintMotionDebug(svg, ms){
  if(!DEBUG_MOTION) return;
  ['L', 'R'].forEach(function(side){
    var spec = BUBBLE[side];
    var shapes = SHAPE[side];
    var key = side.toLowerCase();
    var arc = svg.querySelector('.debug-arc-' + key);
    var line = svg.querySelector('.debug-tangent-' + key);
    var head = svg.querySelector('.debug-head-' + key);
    var rise = POLISHED_VARIANT === 'v3' ? spec.fluidRiseB : POLISHED_VARIANT === 'v2' ? spec.polishRiseB : spec.riseB;
    if(arc){
      arc.setAttribute('d',
        bezD(rise[0], rise[1], rise[2], rise[3])
        + bezD(spec.pairB[0], spec.pairB[1], spec.pairB[2], spec.pairB[3])
        + bezD(spec.diveB[0], spec.diveB[1], spec.diveB[2], spec.diveB[3]));
    }
    var sample = bubbleAt(spec, shapes, ms);
    if(!sample || !sample.tangent || sample.op <= 0.01){
      if(line) line.setAttribute('opacity', '0');
      if(head) head.setAttribute('opacity', '0');
      return;
    }
    var tangent = tangentUnit(sample.tangent);
    var hx = sample.cx + tangent[0] * 7;
    var hy = sample.cy + tangent[1] * 7;
    if(line){
      line.setAttribute('x1', (sample.cx - tangent[0] * 5).toFixed(2));
      line.setAttribute('y1', (sample.cy - tangent[1] * 5).toFixed(2));
      line.setAttribute('x2', (sample.cx + tangent[0] * 10).toFixed(2));
      line.setAttribute('y2', (sample.cy + tangent[1] * 10).toFixed(2));
      line.setAttribute('opacity', '1');
    }
    if(head){
      head.setAttribute('cx', hx.toFixed(2));
      head.setAttribute('cy', hy.toFixed(2));
      head.setAttribute('opacity', '1');
    }
  });
}

function applyFrame(root, ms){
  var svg = root.querySelector('.cafe-cups');
  if(!svg) return;
  var live = svg.querySelector('.cafe-live');
  var fin = svg.querySelector('.cafe-icon-final');
  var left = svg.querySelector('.cup-left-move');
  var right = svg.querySelector('.cup-right-move');
  var continuous = noLiveFinalSwap();

  if(prefersReduced()){
    svg.classList.add('is-final');
    if(live) live.style.opacity = '0';
    if(fin) fin.style.opacity = '1';
    return;
  }

  if(continuous){
    /* Animated liquid is the final mark — never swap to cafe-icon-final. */
    svg.classList.remove('is-final');
    if(live) live.style.opacity = '1';
    if(fin) fin.style.opacity = '0';
    var cupsC = cupsAt(ms >= TOTAL_MS ? TOTAL_MS : ms);
    if(left) left.setAttribute('transform', cupTransform(cupsC.left));
    if(right) right.setAttribute('transform', cupTransform(cupsC.right));
    paintLiquid(svg, ms >= TOTAL_MS ? TOTAL_MS : ms, 0);
    paintBubbleLayers(svg, 'left', bubbleAt(BUBBLE.L, SHAPE.L, ms >= TOTAL_MS ? TOTAL_MS : ms));
    paintBubbleLayers(svg, 'right', bubbleAt(BUBBLE.R, SHAPE.R, ms >= TOTAL_MS ? TOTAL_MS : ms));
    paintMotionDebug(svg, ms >= TOTAL_MS ? TOTAL_MS : ms);
    return;
  }

  if(ms >= TOTAL_MS){
    svg.classList.add('is-final');
    if(live) live.style.opacity = '0';
    if(fin) fin.style.opacity = '1';
    return;
  }

  var cups = cupsAt(ms);
  var finT = smooth(u01(ms, 3000, TOTAL_MS));
  svg.classList.toggle('is-final', finT >= 0.995);
  if(live) live.style.opacity = String(1 - finT);
  if(fin) fin.style.opacity = String(finT);
  if(left) left.setAttribute('transform', cupTransform(cups.left));
  if(right) right.setAttribute('transform', cupTransform(cups.right));
  paintLiquid(svg, ms, finT);
  paintBubbleLayers(svg, 'left', bubbleAt(BUBBLE.L, SHAPE.L, ms));
  paintBubbleLayers(svg, 'right', bubbleAt(BUBBLE.R, SHAPE.R, ms));
  paintMotionDebug(svg, ms);
}

function paint(){
  if(prefersReduced()) ST.ms = TOTAL_MS;
  ['stageRefine', 'zoomRefine'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) applyFrame(el, ST.ms);
  });
  var pose = POSES[poseIndexAt(ST.ms)];
  ST.pose = poseIndexAt(ST.ms);
  var note = document.getElementById('stateNote');
  var t = (ST.ms / 1000).toFixed(2);
  var mode = ST.playing ? 'Playing' : (ST.ms >= TOTAL_MS ? 'Complete' : 'Paused');
  note.innerHTML = '<b>' + pose.label + '</b><br>' + mode + ' · ' + t + 's'
    + '<br>Bubbles/cups: ' + (POLISHED_VARIANT === 'v3' ? 'fluid refinement' : POLISHED_VARIANT === 'v2' ? 'polished' : POLISHED_VARIANT === 'v1' ? 'first polish' : 'current')
    + ' · Liquid: ' + (LIQUID_VARIANT === 'fluid' ? 'continuous rise + wave' : 'staged fill')
    + (prefersReduced() ? '<br>Reduced motion: final icon only' : '');
  var scrub = document.getElementById('scrub');
  if(scrub && document.activeElement !== scrub) scrub.value = String(Math.round(ST.ms));
  document.querySelectorAll('.pose-btn').forEach(function(b){
    b.classList.toggle('on', Number(b.getAttribute('data-pose')) === ST.pose && !ST.playing && !prefersReduced());
  });
}

function stopPlay(){
  ST.playing = false;
  if(ST.raf) cancelAnimationFrame(ST.raf);
  ST.raf = 0;
}

function playFrom(ms){
  stopPlay();
  ST.ms = clamp(ms, 0, TOTAL_MS);
  if(prefersReduced()){
    ST.ms = TOTAL_MS;
    paint();
    return;
  }
  ST.playing = true;
  ST.t0 = performance.now() - ST.ms / (ST.rate || 1);
  function tick(now){
    if(!ST.playing) return;
    ST.ms = Math.min(TOTAL_MS, (now - ST.t0) * (ST.rate || 1));
    paint();
    if(ST.ms >= TOTAL_MS){
      stopPlay();
      paint();
      return;
    }
    ST.raf = requestAnimationFrame(tick);
  }
  ST.raf = requestAnimationFrame(tick);
}

function freezeAt(poseIndex){
  stopPlay();
  ST.pose = poseIndex;
  ST.ms = POSE_MS[poseIndex];
  paint();
}

function renderStages(){
  var wrap = document.getElementById('stageWrap');
  document.body.classList.toggle('is-reduced', prefersReduced());
  document.body.classList.toggle('is-shot', new URLSearchParams(location.search).get('shot') === '1');
  document.body.classList.toggle('is-debug', DEBUG_MOTION);
  var runtimeLabel = '<div class="active-runtime">' + ACTIVE_RUNTIME + ' · BUILD ' + BUILD_ID + '</div>';
  wrap.innerHTML =
    '<div class="zoom-block"><div class="phone-label">Close-up</div>' + runtimeLabel + '<div class="zoom-stage" id="zoomRefine">' + zoomHTML() + '</div></div>'
    + '<div class="phone-block"><div class="phone-label">Welcome</div>' + runtimeLabel + '<div class="phone"><div class="screen" id="stageRefine">' + welcomeHTML() + '</div></div></div>';
  paint();
}

function applyStoredBaseline(b){
  POSE_MS = b.POSE_MS.slice();
  LAND_L = b.LAND_L;
  LAND_R = b.LAND_R;
  if(b.CUP_MS) CUP_MS = b.CUP_MS.slice();
  if(b.CUP_HOLD_MS != null) CUP_HOLD_MS = b.CUP_HOLD_MS;
  if(b.CUP_SETTLE_MS != null) CUP_SETTLE_MS = b.CUP_SETTLE_MS;
  if(b.CUP_DEPTH_APPROACH != null) CUP_DEPTH_APPROACH = b.CUP_DEPTH_APPROACH;
  if(b.SHAPE_R_KIND) SHAPE_R_KIND = b.SHAPE_R_KIND;
  if(b.MOTION_MODE) MOTION_MODE = b.MOTION_MODE;
  if(b.ENTRY_CLIP != null) ENTRY_CLIP = b.ENTRY_CLIP;
  ['L', 'R'].forEach(function(side){
    var src = b.BUBBLE[side];
    var dst = BUBBLE[side];
    Object.keys(src).forEach(function(k){
      dst[k] = Array.isArray(src[k]) ? src[k].slice() : src[k];
    });
  });
  if(b.cups){
    b.cups.forEach(function(c, i){
      if(!POSES[i]) return;
      POSES[i].left = Object.assign({}, c.left);
      POSES[i].right = Object.assign({}, c.right);
    });
  }
}

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
