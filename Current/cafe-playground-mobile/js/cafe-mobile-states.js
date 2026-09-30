/* ============================================================================
   CAFE MOBILE — state machine + screens
   ----------------------------------------------------------------------------
   One global ST, one render() that rebuilds #screen, setState() for
   transitions, a 1s tick for timed states, hash routing, and a switcher that
   stays in sync.

   Canonical path:
     entry -> avcheck -> searching -> (hub / flashcards, matching continues)
           -> matched -> matched/accepted -> agreement -> live -> ending

   A/V check sits before matching and runs on every Café entry, not only on
   first use or when permissions are missing. Its CTA is the actual
   "Start matching" action.

   Matching is a background process. It starts at the end of the A/V check and
   stops only on an explicit "Stop matching". One chat ending never stops it.
   ========================================================================= */

/* ------------------------------------------------------------- constants */
var ORDER = ['entry','avcheck','searching','hub','flashcards','matched','agreement','live','ending'];

var IMG_PARTNER = '../student-main-classroom-desktop/assets/teacher-gai.png';
var IMG_YOU     = '../student-main-classroom-desktop/assets/pip-you.png';

/* Playground durations. The session is the real 6 minutes so the clock reads
   truthfully; everything else is shortened so a loop is reviewable. */
function cafeLocation(state){
  var p = new URLSearchParams(location.search);
  p.set('state', state);
  p.delete('searchmotion');
  p.delete('build');
  var q = p.toString();
  return (q ? '?' + q : '') + '#' + state;
}

var DUR = {
  searchTo:22,        // searching -> a match is offered. Long enough to see two avatar blooms.
  offer:30,           // the response window. Product value.
  partnerConfirm:4,   // the partner answers this long after you accept
  session:360,        // 6:00
  sessionFinal:30,    // the clock warms to yellow at or below this
  sessionCenter:20,   // ...and glides to the seam as the large final countdown at or below this (matches desktop)
  ending:7,           // unused as a timer; ending waits for a new partner or home
  partnerOffWait:9    // connection-issue sheet, then "Find me a new partner"
};

var SEARCH_COPY = 'We\u2019ll tell you the moment someone\u2019s free.';

var INTERVIEW = false;

/* =========================================================================
   LEVEL DATA — CONFIGURABLE, NOT CANONICAL
   -------------------------------------------------------------------------
   Replace this object wholesale when real product data lands. It is the only
   place level data is declared.

   `eligible` is the matching spectrum in canonical product order, lower → higher.
   Yellow is the mock learner for this pass so both sides of the range are visible.
   ========================================================================= */
var LEVEL_DATA = {
  source:'placeholder',
  myLevel:'yellow',
  eligible:['red','orange','pink','yellow','lightblue','blue','lime']
};

/* -------------------------------------------------------------- partner */
/* One personal, onboarding-derived detail. Sample content from the brief. */
var PARTNER = {
  name:'Daniel',
  level:'pink',
  location:'Berlin, Germany',
  img:IMG_PARTNER,
  ice:{
    label:'Why do they study Hebrew?',
    text:'I want to speak with my family in their own language, and to feel at home when I visit.'
  }
};
var IMG_PIN = 'assets/location-pin.png';

/* Content of the agreement is product-specified. This is the only copy of it.
   Three principles to scan, then one acknowledgement. No per-item ticks. */
var AGREEMENT_TERMS = [
  {icon:'hebrew',  lead:'Give Hebrew your best shot', support:'Mistakes are welcome!'},
  {icon:'present', lead:'Stay present',               support:'The session is just 6 minutes'},
  {icon:'kind',    lead:'Be kind to your partner',    support:'This is a safe space'}
];

/* The activity the text panel shows by default. Placeholder content. */
var ACTIVITY = {
  title:'Order a coffee, out loud',
  body:'Ask for what you would actually drink. Your partner is the barista.'
};

/* A/V devices. Mock hardware so "correct camera / mic / output" is a real
   choice on the screen without building a settings surface. */
var DEVICES = {
  camera:{label:'Camera', icon:'cam', options:['FaceTime HD Camera','Continuity Camera'], value:'FaceTime HD Camera'},
  mic:{label:'Microphone', icon:'mic', options:['AirPods Pro','MacBook Pro Microphone'], value:'AirPods Pro'},
  output:{label:'Speaker', icon:'headphone', options:['AirPods Pro','MacBook Pro Speakers'], value:'AirPods Pro'}
};
/* Headphones are connected in the default mock, so the output row applies.
   Whether the row appears at all when there is no external output is a product
   question, not a layout one. */
var HEADPHONES = true;

/* The waiting deck. Placeholder content lifted from the Gym Solo Room deck. */
var DECK = [
  {dir:'Translate to Hebrew', en:'Coffee',      he:'\u05e7\u05e4\u05d4'},
  {dir:'Translate to Hebrew', en:'Thank you',   he:'\u05ea\u05d5\u05d3\u05d4'},
  {dir:'Translate to Hebrew', en:'Good morning',he:'\u05d1\u05d5\u05e7\u05e8 \u05d8\u05d5\u05d1'},
  {dir:'Translate to Hebrew', en:'Friend',      he:'\u05d7\u05d1\u05e8'},
  {dir:'Translate to Hebrew', en:'Water',       he:'\u05de\u05d9\u05dd'}
];

var NOTES = {
  entry:'1 \u00b7 Entry. Welcome, then who to meet. All levels selected by default as a continuous range; own level stays inside it. Nothing is matching yet.',
  avcheck:'2 \u00b7 A/V check, now before matching and mandatory on every entry. Its CTA is the real "Start matching".',
  searching:'3 \u00b7 Active search. Matching is felt first. Flashcards stay optional; the first search line holds for the whole wait.',
  hub:'3b \u00b7 Placeholder Hub carrying the persistent matching indicator. The Hub itself is not designed in this pass.',
  flashcards:'3c \u00b7 Optional practice while waiting. The Gym Solo deck. A match interrupts it; declining returns here.',
  matched:'4 \u00b7 Match found. A 30s interrupt over whatever you were doing. Accept keeps the same surface and waits for the partner.',
  agreement:'5 \u00b7 Session agreement. Only after both accepted. Quiet back returns to the partner card. The offer countdown keeps running; it does not reject on its own.',
  live:'6 \u00b7 Live Cafe. The Gym Practice Room shell. One footer row: a glass group (Chat \u00b7 Topics \u00b7 Practice), then Camera \u00b7 Mic in their own circles. Topics opens the glass wheel over the lower video and lifts Camera / Mic to a vertical stack at the top-right of the lower video (Hebrew-only wedges); the chosen topic lands as a strip on the seam for 10s. Practice opens one shared exercise card on the seam: Previous / Reveal / Next in one action panel, swipe left / right for next / previous. The top-left X is the only way out (Leave & report sheet). Clock: small top-right, yellow at 0:30, large yellow on the seam at 0:20 (above the footer instead while Practice, the wheel or a topic strip holds the seam), then the ending.',
  ending:'7 \u00b7 Ending. Time flies, then Find me another partner, or Go back to homepage.'
};

/* ------------------------------------------------------------------ state */
var ST = {
  state:'entry',
  /* what the match interrupt is layered over */
  bg:'searching',
  /* the Cafe matching session. Survives a chat ending; only stopMatching clears it. */
  matching:false,
  /* Continuous matching range. Derived list stays in ST.selected so later
     Café states can keep reading the same field. Own level is always inside. */
  rangeLo:0,
  rangeHi:LEVEL_DATA.eligible.length - 1,
  selected:LEVEL_DATA.eligible.slice(),
  matchPhase:'offer',     // offer | accepted
  matchEnter:false,
  offerLeft:DUR.offer,
  searchElapsed:0,
  closeSheet:false,
  left:0,
  clockOn:true,
  camOff:false, micOff:false, blur:false,
  perm:'granted',
  mic:{phase:'idle', left:0, pos:0},   // idle | recording | ready | playing
  devSheet:false,
  devMenu:null,
  levelsSheet:false,
  levelsSaved:null,   // [lo, hi] captured when the edit sheet opens; restored on dismiss
  card:0, cardRevealed:false, cardMarked:false, cardPlaying:false,
  textOpen:false,
  chatExpanded:true,
  textDraft:'',
  textLog:[],
  leaveSheet:false,
  keepOnSheet:false,
  partnerOffSheet:false,
  partnerCamOff:false,
  partnerMicOff:false,
  partnerOffFind:false,
  agreed:false,
  dockTip:false,
  dockTipSeen:false,
  finalNote:false,
  finalNoteSeen:false,
  welcomePlayed:false,
  animDebugFrame:0,
  handleCuePlayed:false,
  rangeHintSeen:false,
  specPreview:'full',
  specHot:-1,
  specActiveHandle:null,
  specInset:true
};

/* ---------------------------------------------------------------- helpers */
function isSelected(id){ return ST.selected.indexOf(id) !== -1; }
function myLevelIndex(){
  var i = LEVEL_DATA.eligible.indexOf(LEVEL_DATA.myLevel);
  return i < 0 ? 0 : i;
}
function clampLevelRange(lo, hi){
  var n = LEVEL_DATA.eligible.length;
  var me = myLevelIndex();
  if(n < 1) return [0, 0];
  lo = Math.max(0, Math.min(n - 1, lo|0));
  hi = Math.max(0, Math.min(n - 1, hi|0));
  if(lo > hi){ var t = lo; lo = hi; hi = t; }
  if(lo > me) lo = me;
  if(hi < me) hi = me;
  return [lo, hi];
}
function selectedFromRange(lo, hi){
  return LEVEL_DATA.eligible.slice(lo, hi + 1);
}
function applyLevelRange(lo, hi, opts){
  var r = clampLevelRange(lo, hi);
  ST.rangeLo = r[0];
  ST.rangeHi = r[1];
  ST.selected = selectedFromRange(ST.rangeLo, ST.rangeHi);
  if(document.getElementById('levelSpectrum')){
    updateSpectrumDOM(opts || {});
    updateNote();
    return;
  }
  render();
}
function cafeLockup(sub){
  var mark = '<img class="cafe-mark" src="cafe-mark.png" alt="" aria-hidden="true">';
  return GM.lockup(mark, 'Caf\u00e9', sub);
}
function cafeWelcomeHeroMark(){
  return '<svg class="cafe-hero-mark" width="118" height="44" viewBox="0 0 118 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    + '<path d="M108.946 6.45248L110.467 6.18835C114.139 5.54848 117.502 8.37582 117.502 12.1034C117.502 14.5364 116.033 16.7276 113.782 17.6577L104.854 21.3332" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M9.0565 13.1497L7.53493 12.8856C3.86308 12.2457 0.5 15.0731 0.5 18.8007C0.5 21.2337 1.96949 23.4249 4.22022 24.3549L13.1487 28.0305" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M52.7994 18.4772C51.8991 16.2562 51.1774 13.9125 50.6454 11.4721C46.9698 11.5948 42.9074 11.6618 38.6328 11.6618C22.1969 11.6618 8.87109 10.6611 8.87109 9.42969C8.99758 15.062 10.1322 20.3968 12.063 25.1735C16.4269 35.9621 26.9923 42.9486 38.6328 42.9486C48.1677 42.9486 56.9772 38.2574 62.2525 30.631C58.123 27.5879 54.8046 23.4362 52.7994 18.4772Z" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M79.3672 4.96453C62.9313 4.96453 49.6055 3.9638 49.6055 2.73242C49.6724 5.74577 50.0333 8.66984 50.6434 11.4711C61.0935 11.1252 68.3926 10.3402 68.3926 9.42876C68.2661 15.0611 67.1314 20.3959 65.2006 25.1726C64.4119 27.122 63.4186 28.9449 62.2542 30.6301C67.1091 34.2089 73.08 36.2513 79.3709 36.2513C91.0078 36.2513 101.573 29.2648 105.941 18.4762C107.871 13.7033 109.006 8.3685 109.133 2.73242C109.133 3.9638 95.8068 4.96453 79.3709 4.96453H79.3672Z" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M68.3937 9.42969C68.3937 10.3411 61.0946 11.1261 50.6445 11.4721C51.1765 13.9088 51.902 16.2525 52.7985 18.4772C54.8037 23.4362 58.1222 27.5879 62.2516 30.631C63.416 28.9495 64.4093 27.1229 65.198 25.1735C67.1288 20.4005 68.2635 15.0658 68.39 9.42969H68.3937Z" fill="#FFE300" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M79.3672 4.96422C95.8041 4.96422 109.129 3.96487 109.129 2.73211C109.129 1.49935 95.8041 0.5 79.3672 0.5C62.9302 0.5 49.6055 1.49935 49.6055 2.73211C49.6055 3.96487 62.9302 4.96422 79.3672 4.96422Z" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<path d="M38.6328 11.6595C55.0698 11.6595 68.3946 10.6602 68.3946 9.42742C68.3946 8.19466 55.0698 7.19531 38.6328 7.19531C22.1959 7.19531 8.87109 8.19466 8.87109 9.42742C8.87109 10.6602 22.1959 11.6595 38.6328 11.6595Z" fill="#373230" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>';
}
/* Vector cups traced from the supplied single-cup artwork (276x147).
   Final lockup traced from the supplied complete Café icon (472x174). */
var CAFE_CUP_D = 'M71.50 0.50 L170.50 0.50 L171.50 1.50 L192.50 1.50 L193.50 2.50 L207.50 2.50 L208.50 3.50 L218.50 3.50 L219.50 4.50 L226.50 4.50 L227.50 5.50 L232.50 5.50 L233.50 6.50 L236.50 6.50 L237.50 7.50 L239.50 7.50 L241.50 9.50 L241.50 22.50 L242.50 23.50 L244.50 23.50 L245.50 22.50 L254.50 22.50 L255.50 23.50 L257.50 23.50 L263.50 26.50 L265.50 28.50 L266.50 28.50 L272.50 35.50 L273.50 37.50 L273.50 39.50 L274.50 40.50 L274.50 43.50 L275.50 44.50 L275.50 52.50 L274.50 53.50 L274.50 56.50 L271.50 62.50 L269.50 64.50 L269.50 65.50 L266.50 68.50 L265.50 68.50 L263.50 70.50 L257.50 73.50 L255.50 73.50 L250.50 76.50 L248.50 76.50 L245.50 78.50 L243.50 78.50 L233.50 83.50 L231.50 83.50 L228.50 85.50 L226.50 85.50 L224.50 86.50 L221.50 89.50 L221.50 90.50 L219.50 92.50 L219.50 93.50 L217.50 95.50 L215.50 99.50 L212.50 102.50 L212.50 103.50 L201.50 115.50 L200.50 115.50 L194.50 121.50 L193.50 121.50 L190.50 124.50 L189.50 124.50 L181.50 130.50 L165.50 138.50 L163.50 138.50 L160.50 140.50 L158.50 140.50 L157.50 141.50 L154.50 141.50 L150.50 143.50 L147.50 143.50 L146.50 144.50 L142.50 144.50 L141.50 145.50 L135.50 145.50 L134.50 146.50 L106.50 146.50 L105.50 145.50 L99.50 145.50 L98.50 144.50 L94.50 144.50 L93.50 143.50 L86.50 142.50 L85.50 141.50 L80.50 140.50 L77.50 138.50 L75.50 138.50 L61.50 131.50 L59.50 129.50 L55.50 127.50 L45.50 118.50 L44.50 118.50 L32.50 106.50 L32.50 105.50 L24.50 96.50 L24.50 95.50 L20.50 90.50 L19.50 87.50 L17.50 85.50 L14.50 79.50 L14.50 77.50 L12.50 74.50 L11.50 69.50 L10.50 68.50 L10.50 65.50 L8.50 61.50 L8.50 58.50 L7.50 57.50 L7.50 53.50 L6.50 52.50 L6.50 49.50 L5.50 48.50 L5.50 44.50 L4.50 43.50 L4.50 39.50 L3.50 38.50 L3.50 34.50 L2.50 33.50 L2.50 28.50 L1.50 27.50 L1.50 21.50 L0.50 20.50 L0.50 9.50 L2.50 7.50 L4.50 7.50 L5.50 6.50 L8.50 6.50 L9.50 5.50 L14.50 5.50 L15.50 4.50 L22.50 4.50 L23.50 3.50 L33.50 3.50 L34.50 2.50 L48.50 2.50 L49.50 1.50 L70.50 1.50 Z M238.50 15.50 L238.50 14.50 L237.50 14.50 L236.50 15.50 L232.50 15.50 L231.50 16.50 L226.50 16.50 L225.50 17.50 L217.50 17.50 L216.50 18.50 L206.50 18.50 L205.50 19.50 L191.50 19.50 L190.50 20.50 L166.50 20.50 L165.50 21.50 L75.50 21.50 L74.50 20.50 L51.50 20.50 L50.50 19.50 L36.50 19.50 L35.50 18.50 L24.50 18.50 L23.50 17.50 L16.50 17.50 L15.50 16.50 L10.50 16.50 L9.50 15.50 L5.50 15.50 L4.50 16.50 L4.50 22.50 L5.50 23.50 L5.50 29.50 L6.50 30.50 L6.50 34.50 L7.50 35.50 L7.50 40.50 L8.50 41.50 L8.50 45.50 L9.50 46.50 L9.50 49.50 L10.50 50.50 L10.50 53.50 L11.50 54.50 L11.50 57.50 L12.50 58.50 L13.50 65.50 L14.50 66.50 L14.50 68.50 L15.50 69.50 L16.50 74.50 L22.50 86.50 L24.50 88.50 L24.50 89.50 L26.50 91.50 L28.50 95.50 L32.50 99.50 L32.50 100.50 L52.50 120.50 L53.50 120.50 L56.50 123.50 L57.50 123.50 L63.50 128.50 L77.50 135.50 L79.50 135.50 L80.50 136.50 L82.50 136.50 L83.50 137.50 L85.50 137.50 L89.50 139.50 L92.50 139.50 L93.50 140.50 L97.50 140.50 L98.50 141.50 L103.50 141.50 L104.50 142.50 L113.50 142.50 L114.50 143.50 L127.50 143.50 L128.50 142.50 L136.50 142.50 L137.50 141.50 L142.50 141.50 L143.50 140.50 L147.50 140.50 L148.50 139.50 L151.50 139.50 L152.50 138.50 L154.50 138.50 L155.50 137.50 L160.50 136.50 L163.50 134.50 L165.50 134.50 L177.50 128.50 L179.50 126.50 L185.50 123.50 L188.50 120.50 L189.50 120.50 L192.50 117.50 L193.50 117.50 L208.50 102.50 L208.50 101.50 L212.50 97.50 L212.50 96.50 L218.50 88.50 L225.50 74.50 L225.50 72.50 L227.50 69.50 L227.50 67.50 L228.50 66.50 L228.50 64.50 L229.50 63.50 L229.50 61.50 L231.50 57.50 L231.50 54.50 L232.50 53.50 L233.50 46.50 L234.50 45.50 L234.50 41.50 L235.50 40.50 L235.50 36.50 L236.50 35.50 L236.50 29.50 L237.50 28.50 L237.50 18.50 L238.50 16.50 Z M145.50 4.50 L145.50 3.50 L97.50 3.50 L96.50 4.50 L62.50 4.50 L61.50 5.50 L43.50 5.50 L42.50 6.50 L30.50 6.50 L29.50 7.50 L20.50 7.50 L19.50 8.50 L13.50 8.50 L12.50 9.50 L8.50 9.50 L7.50 10.50 L9.50 12.50 L13.50 12.50 L14.50 13.50 L21.50 13.50 L22.50 14.50 L31.50 14.50 L32.50 15.50 L45.50 15.50 L46.50 16.50 L65.50 16.50 L66.50 17.50 L108.50 17.50 L109.50 18.50 L132.50 18.50 L133.50 17.50 L176.50 17.50 L177.50 16.50 L196.50 16.50 L197.50 15.50 L209.50 15.50 L210.50 14.50 L220.50 14.50 L221.50 13.50 L227.50 13.50 L228.50 12.50 L232.50 12.50 L234.50 10.50 L233.50 9.50 L229.50 9.50 L228.50 8.50 L221.50 8.50 L220.50 7.50 L212.50 7.50 L211.50 6.50 L199.50 6.50 L198.50 5.50 L180.50 5.50 L179.50 4.50 L146.50 4.50 Z M255.50 27.50 L255.50 26.50 L243.50 26.50 L240.50 28.50 L240.50 33.50 L239.50 34.50 L239.50 39.50 L238.50 40.50 L237.50 49.50 L236.50 50.50 L236.50 53.50 L234.50 57.50 L234.50 60.50 L233.50 61.50 L233.50 63.50 L232.50 64.50 L231.50 69.50 L226.50 79.50 L227.50 81.50 L233.50 78.50 L235.50 78.50 L238.50 76.50 L240.50 76.50 L243.50 74.50 L245.50 74.50 L250.50 71.50 L252.50 71.50 L255.50 69.50 L257.50 69.50 L261.50 67.50 L268.50 60.50 L270.50 56.50 L270.50 54.50 L271.50 53.50 L271.50 43.50 L270.50 42.50 L270.50 40.50 L268.50 36.50 L261.50 29.50 L256.50 27.50 Z';
var CAFE_ICON_YELLOW_D = 'M269.50 42.50 L270.50 42.50 L270.50 51.50 L269.50 52.50 L269.50 59.50 L268.50 60.50 L268.50 66.50 L267.50 67.50 L267.50 71.50 L266.50 72.50 L266.50 75.50 L265.50 76.50 L265.50 79.50 L264.50 80.50 L264.50 82.50 L263.50 83.50 L263.50 86.50 L262.50 87.50 L262.50 89.50 L261.50 90.50 L261.50 92.50 L259.50 95.50 L259.50 97.50 L258.50 98.50 L258.50 100.50 L257.50 101.50 L257.50 102.50 L256.50 103.50 L256.50 104.50 L255.50 105.50 L255.50 106.50 L254.50 107.50 L254.50 108.50 L253.50 109.50 L253.50 110.50 L252.50 111.50 L251.50 114.50 L249.50 116.50 L249.50 117.50 L248.50 118.50 L247.50 118.50 L243.50 114.50 L242.50 114.50 L233.50 105.50 L233.50 104.50 L228.50 99.50 L228.50 98.50 L225.50 95.50 L225.50 94.50 L221.50 89.50 L221.50 88.50 L220.50 87.50 L219.50 84.50 L217.50 82.50 L217.50 81.50 L216.50 80.50 L216.50 78.50 L215.50 77.50 L215.50 76.50 L213.50 73.50 L213.50 71.50 L211.50 68.50 L211.50 66.50 L210.50 65.50 L210.50 63.50 L209.50 62.50 L209.50 60.50 L208.50 59.50 L208.50 57.50 L207.50 56.50 L207.50 53.50 L206.50 52.50 L206.50 49.50 L205.50 48.50 L216.50 48.50 L217.50 47.50 L234.50 47.50 L235.50 46.50 L246.50 46.50 L247.50 45.50 L256.50 45.50 L257.50 44.50 L263.50 44.50 L264.50 43.50 L268.50 43.50 Z';
var CAFE_ICON_STROKE_D = 'M268.50 0.50 L367.50 0.50 L368.50 1.50 L389.50 1.50 L390.50 2.50 L404.50 2.50 L405.50 3.50 L415.50 3.50 L416.50 4.50 L423.50 4.50 L424.50 5.50 L429.50 5.50 L430.50 6.50 L433.50 6.50 L437.50 8.50 L438.50 10.50 L438.50 18.50 L437.50 19.50 L437.50 22.50 L438.50 23.50 L440.50 23.50 L441.50 22.50 L450.50 22.50 L451.50 23.50 L454.50 23.50 L458.50 25.50 L460.50 27.50 L461.50 27.50 L467.50 33.50 L470.50 39.50 L470.50 41.50 L471.50 42.50 L471.50 54.50 L466.50 64.50 L461.50 69.50 L460.50 69.50 L456.50 72.50 L454.50 72.50 L444.50 77.50 L442.50 77.50 L439.50 79.50 L437.50 79.50 L434.50 81.50 L432.50 81.50 L427.50 84.50 L425.50 84.50 L422.50 86.50 L420.50 86.50 L418.50 88.50 L418.50 89.50 L416.50 91.50 L416.50 92.50 L414.50 94.50 L414.50 95.50 L412.50 97.50 L410.50 101.50 L406.50 105.50 L406.50 106.50 L394.50 118.50 L393.50 118.50 L385.50 125.50 L384.50 125.50 L379.50 129.50 L376.50 130.50 L374.50 132.50 L364.50 137.50 L362.50 137.50 L359.50 139.50 L357.50 139.50 L356.50 140.50 L354.50 140.50 L350.50 142.50 L347.50 142.50 L346.50 143.50 L343.50 143.50 L342.50 144.50 L338.50 144.50 L337.50 145.50 L331.50 145.50 L330.50 146.50 L303.50 146.50 L302.50 145.50 L296.50 145.50 L295.50 144.50 L292.50 144.50 L291.50 143.50 L284.50 142.50 L283.50 141.50 L281.50 141.50 L280.50 140.50 L275.50 139.50 L272.50 137.50 L270.50 137.50 L260.50 132.50 L258.50 130.50 L255.50 129.50 L253.50 127.50 L249.50 125.50 L241.50 134.50 L241.50 135.50 L226.50 149.50 L225.50 149.50 L219.50 154.50 L216.50 155.50 L214.50 157.50 L198.50 165.50 L196.50 165.50 L195.50 166.50 L193.50 166.50 L192.50 167.50 L190.50 167.50 L189.50 168.50 L187.50 168.50 L183.50 170.50 L179.50 170.50 L178.50 171.50 L174.50 171.50 L173.50 172.50 L167.50 172.50 L166.50 173.50 L142.50 173.50 L141.50 172.50 L135.50 172.50 L134.50 171.50 L125.50 170.50 L124.50 169.50 L122.50 169.50 L121.50 168.50 L119.50 168.50 L118.50 167.50 L116.50 167.50 L115.50 166.50 L110.50 165.50 L94.50 157.50 L92.50 155.50 L91.50 155.50 L89.50 153.50 L85.50 151.50 L82.50 148.50 L81.50 148.50 L67.50 135.50 L67.50 134.50 L62.50 129.50 L62.50 128.50 L59.50 125.50 L59.50 124.50 L51.50 113.50 L47.50 111.50 L45.50 111.50 L42.50 109.50 L40.50 109.50 L37.50 107.50 L35.50 107.50 L25.50 102.50 L23.50 102.50 L20.50 100.50 L18.50 100.50 L12.50 97.50 L10.50 95.50 L9.50 95.50 L3.50 88.50 L1.50 84.50 L1.50 82.50 L0.50 81.50 L0.50 69.50 L1.50 68.50 L2.50 63.50 L4.50 61.50 L4.50 60.50 L11.50 53.50 L17.50 50.50 L19.50 50.50 L20.50 49.50 L31.50 49.50 L33.50 50.50 L34.50 49.50 L34.50 45.50 L33.50 44.50 L33.50 36.50 L35.50 34.50 L37.50 34.50 L38.50 33.50 L41.50 33.50 L42.50 32.50 L46.50 32.50 L47.50 31.50 L54.50 31.50 L55.50 30.50 L64.50 30.50 L65.50 29.50 L78.50 29.50 L79.50 28.50 L98.50 28.50 L99.50 27.50 L143.50 27.50 L144.50 26.50 L164.50 26.50 L165.50 27.50 L196.50 27.50 L197.50 26.50 L197.50 20.50 L196.50 19.50 L196.50 10.50 L197.50 8.50 L201.50 6.50 L205.50 6.50 L206.50 5.50 L211.50 5.50 L212.50 4.50 L219.50 4.50 L220.50 3.50 L230.50 3.50 L231.50 2.50 L244.50 2.50 L245.50 1.50 L267.50 1.50 Z M202.50 15.50 L202.50 14.50 L200.50 15.50 L200.50 23.50 L202.50 27.50 L210.50 27.50 L211.50 28.50 L230.50 28.50 L231.50 29.50 L243.50 29.50 L244.50 30.50 L254.50 30.50 L255.50 31.50 L261.50 31.50 L262.50 32.50 L267.50 32.50 L268.50 33.50 L273.50 34.50 L275.50 36.50 L275.50 46.50 L274.50 47.50 L274.50 56.50 L273.50 57.50 L273.50 63.50 L272.50 64.50 L272.50 69.50 L271.50 70.50 L271.50 73.50 L270.50 74.50 L270.50 77.50 L269.50 78.50 L268.50 85.50 L267.50 86.50 L267.50 88.50 L266.50 89.50 L266.50 91.50 L265.50 92.50 L264.50 97.50 L262.50 100.50 L262.50 102.50 L255.50 116.50 L251.50 121.50 L254.50 124.50 L260.50 127.50 L262.50 129.50 L270.50 133.50 L272.50 133.50 L275.50 135.50 L277.50 135.50 L278.50 136.50 L280.50 136.50 L281.50 137.50 L283.50 137.50 L287.50 139.50 L290.50 139.50 L291.50 140.50 L295.50 140.50 L296.50 141.50 L300.50 141.50 L301.50 142.50 L310.50 142.50 L311.50 143.50 L323.50 143.50 L324.50 142.50 L333.50 142.50 L334.50 141.50 L339.50 141.50 L340.50 140.50 L347.50 139.50 L348.50 138.50 L350.50 138.50 L351.50 137.50 L353.50 137.50 L354.50 136.50 L359.50 135.50 L364.50 132.50 L366.50 132.50 L370.50 130.50 L372.50 128.50 L380.50 124.50 L383.50 121.50 L384.50 121.50 L387.50 118.50 L388.50 118.50 L400.50 107.50 L400.50 106.50 L406.50 100.50 L406.50 99.50 L409.50 96.50 L409.50 95.50 L415.50 87.50 L421.50 75.50 L421.50 73.50 L423.50 70.50 L423.50 68.50 L424.50 67.50 L424.50 65.50 L425.50 64.50 L425.50 62.50 L426.50 61.50 L426.50 59.50 L428.50 55.50 L429.50 48.50 L430.50 47.50 L430.50 43.50 L431.50 42.50 L431.50 38.50 L432.50 37.50 L432.50 32.50 L433.50 31.50 L433.50 23.50 L434.50 22.50 L434.50 15.50 L433.50 14.50 L432.50 15.50 L429.50 15.50 L428.50 16.50 L422.50 16.50 L421.50 17.50 L414.50 17.50 L413.50 18.50 L403.50 18.50 L402.50 19.50 L387.50 19.50 L386.50 20.50 L363.50 20.50 L362.50 21.50 L272.50 21.50 L271.50 20.50 L248.50 20.50 L247.50 19.50 L232.50 19.50 L231.50 18.50 L221.50 18.50 L220.50 17.50 L212.50 17.50 L211.50 16.50 L206.50 16.50 L205.50 15.50 L203.50 15.50 Z M40.50 42.50 L40.50 41.50 L38.50 41.50 L37.50 42.50 L37.50 49.50 L38.50 50.50 L38.50 58.50 L39.50 59.50 L39.50 64.50 L40.50 65.50 L40.50 69.50 L41.50 70.50 L41.50 74.50 L42.50 75.50 L43.50 82.50 L44.50 83.50 L44.50 85.50 L45.50 86.50 L45.50 88.50 L46.50 89.50 L46.50 91.50 L47.50 92.50 L48.50 97.50 L51.50 102.50 L51.50 104.50 L55.50 112.50 L57.50 114.50 L58.50 117.50 L63.50 123.50 L63.50 124.50 L66.50 127.50 L66.50 128.50 L83.50 145.50 L84.50 145.50 L87.50 148.50 L88.50 148.50 L96.50 154.50 L110.50 161.50 L112.50 161.50 L115.50 163.50 L117.50 163.50 L121.50 165.50 L124.50 165.50 L125.50 166.50 L128.50 166.50 L129.50 167.50 L133.50 167.50 L134.50 168.50 L139.50 168.50 L140.50 169.50 L168.50 169.50 L169.50 168.50 L175.50 168.50 L176.50 167.50 L179.50 167.50 L180.50 166.50 L187.50 165.50 L188.50 164.50 L193.50 163.50 L196.50 161.50 L198.50 161.50 L212.50 154.50 L214.50 152.50 L215.50 152.50 L217.50 150.50 L221.50 148.50 L225.50 144.50 L226.50 144.50 L243.50 127.50 L243.50 126.50 L246.50 123.50 L241.50 118.50 L240.50 118.50 L228.50 106.50 L228.50 105.50 L224.50 101.50 L224.50 100.50 L221.50 97.50 L221.50 96.50 L217.50 91.50 L209.50 75.50 L209.50 73.50 L207.50 70.50 L207.50 68.50 L206.50 67.50 L206.50 65.50 L205.50 64.50 L205.50 62.50 L203.50 58.50 L203.50 55.50 L202.50 54.50 L202.50 51.50 L201.50 50.50 L201.50 48.50 L200.50 47.50 L192.50 47.50 L191.50 48.50 L116.50 48.50 L115.50 47.50 L89.50 47.50 L88.50 46.50 L72.50 46.50 L71.50 45.50 L60.50 45.50 L59.50 44.50 L51.50 44.50 L50.50 43.50 L44.50 43.50 L43.50 42.50 L41.50 42.50 Z M206.50 31.50 L206.50 30.50 L102.50 30.50 L101.50 31.50 L81.50 31.50 L80.50 32.50 L67.50 32.50 L66.50 33.50 L56.50 33.50 L55.50 34.50 L48.50 34.50 L47.50 35.50 L43.50 35.50 L42.50 36.50 L39.50 36.50 L38.50 37.50 L41.50 39.50 L45.50 39.50 L46.50 40.50 L52.50 40.50 L53.50 41.50 L61.50 41.50 L62.50 42.50 L74.50 42.50 L75.50 43.50 L92.50 43.50 L93.50 44.50 L122.50 44.50 L123.50 45.50 L185.50 45.50 L186.50 44.50 L216.50 44.50 L217.50 43.50 L234.50 43.50 L235.50 42.50 L246.50 42.50 L247.50 41.50 L255.50 41.50 L256.50 40.50 L262.50 40.50 L263.50 39.50 L267.50 39.50 L270.50 37.50 L269.50 36.50 L266.50 36.50 L265.50 35.50 L260.50 35.50 L259.50 34.50 L252.50 34.50 L251.50 33.50 L242.50 33.50 L241.50 32.50 L228.50 32.50 L227.50 31.50 L207.50 31.50 Z M341.50 4.50 L341.50 3.50 L293.50 3.50 L292.50 4.50 L258.50 4.50 L257.50 5.50 L240.50 5.50 L239.50 6.50 L226.50 6.50 L225.50 7.50 L217.50 7.50 L216.50 8.50 L210.50 8.50 L209.50 9.50 L204.50 9.50 L203.50 10.50 L205.50 12.50 L210.50 12.50 L211.50 13.50 L217.50 13.50 L218.50 14.50 L227.50 14.50 L228.50 15.50 L241.50 15.50 L242.50 16.50 L261.50 16.50 L262.50 17.50 L305.50 17.50 L306.50 18.50 L328.50 18.50 L329.50 17.50 L372.50 17.50 L373.50 16.50 L392.50 16.50 L393.50 15.50 L406.50 15.50 L407.50 14.50 L416.50 14.50 L417.50 13.50 L423.50 13.50 L424.50 12.50 L429.50 12.50 L430.50 11.50 L429.50 9.50 L425.50 9.50 L424.50 8.50 L418.50 8.50 L417.50 7.50 L408.50 7.50 L407.50 6.50 L395.50 6.50 L394.50 5.50 L376.50 5.50 L375.50 4.50 L342.50 4.50 Z M271.50 42.50 L271.50 41.50 L269.50 41.50 L268.50 42.50 L264.50 42.50 L263.50 43.50 L257.50 43.50 L256.50 44.50 L248.50 44.50 L247.50 45.50 L236.50 45.50 L235.50 46.50 L219.50 46.50 L218.50 47.50 L206.50 47.50 L205.50 48.50 L205.50 51.50 L206.50 52.50 L206.50 55.50 L208.50 59.50 L208.50 62.50 L210.50 65.50 L210.50 67.50 L213.50 73.50 L213.50 75.50 L219.50 87.50 L221.50 89.50 L221.50 90.50 L223.50 92.50 L225.50 96.50 L228.50 99.50 L228.50 100.50 L232.50 104.50 L232.50 105.50 L241.50 114.50 L242.50 114.50 L247.50 119.50 L248.50 119.50 L252.50 114.50 L258.50 102.50 L258.50 100.50 L260.50 97.50 L260.50 95.50 L261.50 94.50 L261.50 92.50 L262.50 91.50 L262.50 89.50 L263.50 88.50 L263.50 86.50 L265.50 82.50 L265.50 79.50 L266.50 78.50 L266.50 75.50 L267.50 74.50 L267.50 71.50 L268.50 70.50 L268.50 66.50 L269.50 65.50 L269.50 59.50 L270.50 58.50 L270.50 51.50 L271.50 50.50 L271.50 43.50 Z M452.50 27.50 L452.50 26.50 L440.50 26.50 L437.50 28.50 L436.50 30.50 L436.50 36.50 L435.50 37.50 L435.50 42.50 L434.50 43.50 L434.50 46.50 L433.50 47.50 L433.50 50.50 L432.50 51.50 L431.50 58.50 L430.50 59.50 L430.50 61.50 L429.50 62.50 L429.50 64.50 L428.50 65.50 L427.50 70.50 L425.50 73.50 L425.50 75.50 L422.50 80.50 L423.50 81.50 L427.50 79.50 L429.50 79.50 L432.50 77.50 L434.50 77.50 L437.50 75.50 L439.50 75.50 L444.50 72.50 L446.50 72.50 L449.50 70.50 L451.50 70.50 L457.50 67.50 L459.50 65.50 L460.50 65.50 L465.50 59.50 L467.50 55.50 L467.50 51.50 L468.50 50.50 L467.50 41.50 L465.50 37.50 L463.50 35.50 L463.50 34.50 L459.50 30.50 L453.50 27.50 Z M26.50 53.50 L26.50 52.50 L24.50 53.50 L19.50 53.50 L13.50 56.50 L7.50 62.50 L4.50 68.50 L4.50 72.50 L3.50 73.50 L3.50 77.50 L4.50 78.50 L4.50 81.50 L5.50 82.50 L5.50 84.50 L6.50 86.50 L14.50 94.50 L18.50 96.50 L20.50 96.50 L23.50 98.50 L25.50 98.50 L35.50 103.50 L37.50 103.50 L40.50 105.50 L42.50 105.50 L47.50 108.50 L49.50 107.50 L46.50 102.50 L46.50 100.50 L43.50 94.50 L43.50 92.50 L41.50 88.50 L41.50 85.50 L39.50 81.50 L39.50 78.50 L38.50 77.50 L38.50 74.50 L37.50 73.50 L37.50 69.50 L36.50 68.50 L36.50 63.50 L35.50 62.50 L35.50 56.50 L32.50 53.50 L27.50 53.50 Z';
/* Organic yellow silhouette traced from the supplied Frame 4 reference.
   Rounded body with one tapered tail at the bottom-left; flip for the right. */
var CAFE_BLOB_D = 'M-8 -31.5 C 12 -33.5 28 -32 36 -26.5 C 48 -18.5 54.5 -7 53 3 C 51.5 15 43.5 26.5 27 30 C 6 32.5 -22 31.5 -42 30 C -49.5 33 -54.5 39 -56.1 45.5 C -55.5 28 -54.2 12 -49 -4 C -42 -18 -28 -27.5 -12 -30.8 C -10 -31.2 -8.5 -31.4 -8 -31.5 Z';
function cafeIconFinalMarkup(){
  return '<g class="cafe-icon-final">'
    + '<path fill="#F9E24C" d="' + CAFE_ICON_YELLOW_D + '"/>'
    + '<path fill="#F7F6EF" fill-rule="evenodd" d="' + CAFE_ICON_STROKE_D + '"/>'
    + '</g>';
}
function cafeCupArt(flip){
  var path = '<path fill="#F7F6EF" fill-rule="evenodd" d="' + CAFE_CUP_D + '"/>';
  if(flip) return '<g transform="translate(276 0) scale(-1 1)">' + path + '</g>';
  return path;
}
var CAFE_LIQUID_D = 'M0 -13.6 C 7.5 -13.6 12.9 -7.9 12.9 -0.9 C 12.9 8.4 4.6 16.8 0 24.2 C -4.6 16.8 -12.9 8.4 -12.9 -0.9 C -12.9 -7.9 -7.5 -13.6 0 -13.6 Z';
function cafeCupsSvg(cls){
  var isStatic = !!(cls && cls.indexOf('is-static') !== -1);
  var svg = '<svg class="cafe-cups' + (cls?' '+cls:'') + '" viewBox="0 0 472 174" fill="none" overflow="visible" aria-hidden="true">';
  if(isStatic){
    return svg + cafeIconFinalMarkup() + '</svg>';
  }
  var morph = '<path class="drop-morph" fill="#F9E24C" d="' + CAFE_LIQUID_D + '"/>';
  return svg
    + '<g class="cafe-live">'
      + '<g transform="translate(196 0)"><g class="cup-right cup-piece">' + cafeCupArt(false) + '</g></g>'
      + '<g transform="translate(0 27)"><g class="cup-left cup-piece">' + cafeCupArt(true) + '</g></g>'
      + '<g class="cup-drops">'
        + '<g class="drop d1"><g class="drop-move">' + morph + '</g></g>'
        + '<g class="drop d2"><g class="drop-move">' + morph + '</g></g>'
      + '</g>'
    + '</g>'
    + cafeIconFinalMarkup()
  + '</svg>';
}
var DROP_MORPH = null;
var welcomeAnim = 0;
var CAFE_WELCOME_MS = 2050;
function cafeSmooth(a, b, t){
  if(t <= 0) return a;
  if(t >= 1) return b;
  var u = t * t * (3 - 2 * t);
  return a + (b - a) * u;
}
function cafeSamplePath(d, n){
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '472');
  svg.setAttribute('height', '174');
  svg.setAttribute('viewBox', '0 0 472 174');
  svg.style.cssText = 'position:absolute;left:-999px;top:-999px;width:1px;height:1px;overflow:hidden';
  var path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  document.body.appendChild(svg);
  var len = path.getTotalLength();
  var pts = [];
  var i;
  for(i = 0; i < n; i++){
    var p = path.getPointAtLength(len * i / n);
    pts.push([p.x, p.y]);
  }
  svg.parentNode.removeChild(svg);
  var minI = 0;
  for(i = 1; i < pts.length; i++){
    if(pts[i][1] > pts[minI][1]) minI = i;
  }
  pts = pts.slice(minI).concat(pts.slice(0, minI));
  var area = 0;
  for(i = 0; i < pts.length; i++){
    var j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
  }
  if(area < 0) pts.reverse();
  var cx = 0, cy = 0;
  for(i = 0; i < pts.length; i++){ cx += pts[i][0]; cy += pts[i][1]; }
  cx /= pts.length; cy /= pts.length;
  return pts.map(function(p){ return [p[0] - cx, p[1] - cy]; });
}
function ensureDropMorph(){
  if(DROP_MORPH) return DROP_MORPH;
  var n = 64;
  DROP_MORPH = {
    drop: cafeSamplePath(CAFE_LIQUID_D, n),
    speech: cafeSamplePath(CAFE_BLOB_D, n)
  };
  return DROP_MORPH;
}
function cafePtsToD(pts){
  var d = 'M' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2);
  for(var i = 1; i < pts.length; i++){
    d += 'L' + pts[i][0].toFixed(2) + ' ' + pts[i][1].toFixed(2);
  }
  return d + 'Z';
}
function cafeLerpPts(a, b, t){
  var out = [];
  for(var i = 0; i < a.length; i++){
    out.push([a[i][0] + (b[i][0] - a[i][0]) * t, a[i][1] + (b[i][1] - a[i][1]) * t]);
  }
  return out;
}
function cancelWelcomeAnim(){
  if(welcomeAnim){
    cancelAnimationFrame(welcomeAnim);
    welcomeAnim = 0;
  }
  welcomeResolve = null;
}

/* =========================================================================
   WELCOME OPENING — approved Café animation · hybrid-1
   The motion itself lives in js/cafe-welcome-anim.js, generated from the
   locked playground checkpoint ?restore=cafe-welcome-approved-hybrid-1. This
   surface only decides when it starts, when the copy arrives, how long the
   finished mark is held, and when it leaves for the header. No timing,
   easing or geometry of the animation is reinterpreted here.
   ========================================================================= */
/* The approved choreography is 3200ms. The product plays that same source
   faster, so the whole gesture reads livelier. This is the reference rate the
   gesture returns to; the opening runs hotter than it (see below), so the real
   playback is shorter. The playground and the checkpoint still run at 1×. */
var WELCOME_PLAY_MS = 2650;
/* The opening is the part that wants urgency: the cups meeting and the droplets
   launching off them. It is played at this much above the reference rate, at
   full strength through the toast and the launch, easing back to the reference
   as the bubbles reach their conversation pose. Nothing is reordered or skipped
   — the same source frames arrive sooner. */
var WELCOME_OPEN_BOOST = 0.24;
/* Source ms of full boost, then the source ms where both bubbles have arrived at
   the conversation pose (left 1500, right 1510). From there the mapping is the
   reference rate exactly, so the settle, the hold, the return to the cups and
   the liquid fill keep their current timing to the millisecond. */
var WELCOME_BOOST_HOT = 1100;
var WELCOME_BOOST_END = 1510;
/* Copy begins its fade-and-rise as the mark closes, so the screen is never
   empty once the animation has finished. In source milliseconds, so it keeps
   its place in the choreography at any playback rate. */
var WELCOME_COPY_MS = 2860;
/* Readable stillness after the mark completes, before the guided scroll. */
var WELCOME_HOLD_MS = 750;
/* The finished mark is smaller than the animation that drew it: it closes down
   into the size it will fly to the header from. */
var WELCOME_MARK_SETTLE = 0.78;
/* Source window over which that reduction runs — the cups' own closing phase. */
var WELCOME_SETTLE_FROM = 2600;
/* Advancing early runs the rest of the animation out over this, rather than
   cutting to the final frame. */
var WELCOME_RESOLVE_MS = 280;
var welcomeResolve = null;
/* Millisecond currently on screen, so an early advance resolves from it. */
var welcomeLastMs = 0;

function welcomeAnimMarkup(){
  if(window.CafeWelcomeAnim) return window.CafeWelcomeAnim.markup();
  return cafeWelcomeHeroMark();
}
function welcomeAnimTotal(){
  return window.CafeWelcomeAnim ? window.CafeWelcomeAnim.TOTAL_MS : 0;
}
/* How much above the reference rate the gesture runs at a point of the source. */
function welcomeOpenBoostAt(ms){
  if(ms <= WELCOME_BOOST_HOT) return 1 + WELCOME_OPEN_BOOST;
  if(ms >= WELCOME_BOOST_END) return 1;
  return 1 + WELCOME_OPEN_BOOST
    * (1 - cafeSmooth(0, 1, (ms - WELCOME_BOOST_HOT) / (WELCOME_BOOST_END - WELCOME_BOOST_HOT)));
}
/* On-screen milliseconds at which each step of the source is due, integrated
   once from the rate above. Sampling it, rather than multiplying by a rate, is
   what keeps the changing rate free of steps. */
var welcomeTimeMap = null;
function welcomeTimeTable(){
  var total = welcomeAnimTotal();
  if(welcomeTimeMap && welcomeTimeMap.total === total) return welcomeTimeMap;
  var base = total > 0 ? total / WELCOME_PLAY_MS : 1;
  var step = 8, real = 0, due = [0];
  for(var ms = 0; ms < total; ms += step){
    real += Math.min(step, total - ms) / (base * welcomeOpenBoostAt(ms + step / 2));
    due.push(real);
  }
  welcomeTimeMap = {total: total, step: step, due: due};
  return welcomeTimeMap;
}
function welcomePlayDuration(){
  var m = welcomeTimeTable();
  return m.due[m.due.length - 1];
}
/* Source millisecond to draw at a given point of the playback. */
function welcomeSourceAt(real){
  var m = welcomeTimeTable();
  var due = m.due;
  if(!(real > 0)) return 0;
  if(real >= due[due.length - 1]) return m.total;
  var lo = 0, hi = due.length - 1;
  while(hi - lo > 1){
    var mid = (lo + hi) >> 1;
    if(due[mid] <= real) lo = mid; else hi = mid;
  }
  var span = due[hi] - due[lo];
  return Math.min(m.total, (lo + (span > 0 ? (real - due[lo]) / span : 0)) * m.step);
}
/* Auto-scroll must not start before the mark is finished and read. */
function welcomeProgressDelay(){
  return (welcomeAnimTotal() ? welcomePlayDuration() : 0) + WELCOME_HOLD_MS;
}
/* How large the hero mark is drawn at a given point of the choreography: full
   size while the gesture plays, easing down to its settled size across the
   closing phase, so it is already small when the cups come to rest. */
function welcomeMarkScaleAt(ms){
  var total = welcomeAnimTotal();
  if(!total) return WELCOME_MARK_SETTLE;
  var span = total - WELCOME_SETTLE_FROM;
  if(span <= 0) return WELCOME_MARK_SETTLE;
  var k = cafeSmooth(0, 1, cafeClamp01((ms - WELCOME_SETTLE_FROM) / span));
  return 1 + (WELCOME_MARK_SETTLE - 1) * k;
}
function welcomeAnimPaint(el, ms){
  if(el && window.CafeWelcomeAnim) window.CafeWelcomeAnim.frame(el, ms);
}
/* Size the mark currently wants in the hero, and how far it has travelled to
   the header. Both feed one layout pass so the closing reduction and the flight
   are the same continuous shrink, never two competing transforms. */
var welcomeMarkScale = 1;
var welcomeFlightT = 0;
/* How far the hero has been scrolled past the point where the flight begins.
   The mark flies from where it stood then, not from the slot's live position:
   the slot is being scrolled away faster than the flight travels, so following
   it would sweep the mark up off the top of the screen and back down again. */
var welcomeFlightHold = 0;
function layoutWelcomeMark(){
  var fly = document.getElementById('cafeHeroFly');
  var slot = document.getElementById('cafeHeroSlot');
  var dest = document.getElementById('cafeHeaderMark');
  if(!fly || !slot || !dest) return;
  /* The slot is the mark's full-size box; the fly's own box is already scaled,
     so measuring that instead would compound every frame. */
  var a = slot.getBoundingClientRect();
  var b = dest.getBoundingClientRect();
  if(!a.width) return;
  var t = welcomeFlightT;
  var target = b.width ? b.width / a.width : 0.36;
  var sc = welcomeMarkScale + (target - welcomeMarkScale) * t;
  /* Reduced by its own box rather than by transform:scale, so the mark is drawn
     at its true size on every frame — strokes and fill scale together and the
     last frame rasterises exactly as the header's own copy does. */
  var w = a.width * sc, h = a.height * sc;
  fly.style.width = w + 'px';
  fly.style.height = h + 'px';
  var cx = lerp01(a.left + a.width / 2, b.left + b.width / 2, t);
  var cy = lerp01(a.top + a.height / 2 + welcomeFlightHold, b.top + b.height / 2, t);
  fly.style.transform = 'translate('
    + (cx - (a.left + w / 2)) + 'px,'
    + (cy - (a.top + h / 2)) + 'px)';
  fly.style.opacity = '1';
}
function setWelcomeMarkScale(ms){
  welcomeMarkScale = welcomeMarkScaleAt(ms);
  layoutWelcomeMark();
}
/* The header icon is the same renderer parked on the final frame. */
function paintWelcomeHeaderMark(){
  welcomeAnimPaint(document.getElementById('cafeHeaderMark'), welcomeAnimTotal());
}
function revealWelcomeCopy(welcome){
  if(welcome) welcome.classList.add('is-copy-in');
}
/* First frame under the cursor before anything moves, so entry does not flash
   the finished mark and then restart. */
function primeCafeWelcomeGesture(welcome){
  cancelWelcomeAnim();
  welcomeFlightT = 0;
  paintWelcomeHeaderMark();
  var fly = document.getElementById('cafeHeroFly');
  if(!window.CafeWelcomeAnim || !fly){
    revealWelcomeCopy(welcome);
    return;
  }
  if(prefersReducedMotion()){
    settleCafeWelcomeGesture(welcome);
    return;
  }
  welcomeAnimPaint(fly, 0);
  setWelcomeMarkScale(0);
}
/* Reduced motion: the approved final mark at its settled size, softly, and the
   copy with it. */
function settleCafeWelcomeGesture(welcome){
  cancelWelcomeAnim();
  var fly = document.getElementById('cafeHeroFly');
  welcomeAnimPaint(fly, welcomeAnimTotal());
  setWelcomeMarkScale(welcomeAnimTotal());
  if(welcome) welcome.classList.add('is-mark-in');
  revealWelcomeCopy(welcome);
}
function playCafeWelcomeGesture(welcome){
  cancelWelcomeAnim();
  paintWelcomeHeaderMark();
  var fly = document.getElementById('cafeHeroFly');
  if(!window.CafeWelcomeAnim || !fly){
    revealWelcomeCopy(welcome);
    return;
  }
  if(prefersReducedMotion()){
    settleCafeWelcomeGesture(welcome);
    return;
  }
  var total = welcomeAnimTotal();
  var t0 = performance.now();
  welcomeLastMs = 0;
  welcomeAnimPaint(fly, 0);
  setWelcomeMarkScale(0);
  welcomeAnim = requestAnimationFrame(function tick(now){
    var ms = welcomeSourceAt(now - t0);
    if(welcomeResolve){
      /* Hand over quickly without jumping: the remaining span is run out on
         its own easing from wherever the mark had got to. */
      var r = cafeSmooth(0, 1, cafeClamp01((now - welcomeResolve.at) / WELCOME_RESOLVE_MS));
      ms = welcomeResolve.from + (total - welcomeResolve.from) * r;
    }
    if(ms > total) ms = total;
    welcomeLastMs = ms;
    welcomeAnimPaint(fly, ms);
    setWelcomeMarkScale(ms);
    if(ms >= WELCOME_COPY_MS) revealWelcomeCopy(welcome);
    if(ms >= total){
      welcomeAnim = 0;
      welcomeResolve = null;
      revealWelcomeCopy(welcome);
      return;
    }
    welcomeAnim = requestAnimationFrame(tick);
  });
}
/* The student advanced — scroll, chevron, swipe or keyboard. Finish the mark
   at speed, bring the copy in, and let the header handoff carry on. */
function finishCafeWelcomeGesture(){
  var welcome = document.querySelector('.cafe-welcome');
  if(!welcomeAnim){
    revealWelcomeCopy(welcome);
    return;
  }
  if(!welcomeResolve) welcomeResolve = {from: welcomeLastMs, at: performance.now()};
  revealWelcomeCopy(welcome);
}
function cafeClamp01(t){ return t < 0 ? 0 : t > 1 ? 1 : t; }

var CAFE_POSE_VB = '-30 -130 532 330';
var ANIM_DEBUG_FRAMES = [
  {
    id:'separate',
    label:'Two separate empty cups',
    cup:{sep:98, rot:5, y:-18},
    drops:null,
    showFinal:false
  },
  {
    id:'clink',
    label:'Cheers \u2014 inner rims clink',
    cup:{sep:40, rot:16, y:-20},
    drops:null,
    showFinal:false
  },
  {
    id:'drops',
    label:'Two drops launch from the inner rims',
    cup:{sep:42, rot:14, y:-20},
    drops:{
      L:{kind:'liquid', x:198, y:30, sx:0.82, sy:1.28, ang:-22, flip:false},
      R:{kind:'liquid', x:272, y:26, sx:0.82, sy:1.28, ang:24, flip:false}
    },
    showFinal:false
  },
  {
    id:'blobs',
    label:'Large reference shapes above the cups',
    cup:{sep:44, rot:10, y:-18},
    drops:{
      L:{kind:'blob', x:148, y:-68, sx:1.58, sy:1.58, ang:-6, flip:false},
      R:{kind:'blob', x:342, y:-4, sx:1.58, sy:1.58, ang:6, flip:true}
    },
    showFinal:false
  },
  {
    id:'fall',
    label:'Large shapes falling inward toward the overlap',
    cup:{sep:16, rot:6, y:-8},
    drops:{
      L:{kind:'blob', x:214, y:-6, sx:1.5, sy:1.5, ang:8, flip:false},
      R:{kind:'blob', x:272, y:42, sx:1.5, sy:1.5, ang:-10, flip:true}
    },
    showFinal:false
  },
  {
    id:'final',
    label:'Final overlapping Caf\u00e9 icon',
    cup:{sep:0, rot:0, y:0},
    drops:null,
    showFinal:true
  }
];
function cafeCupPoseT(side, cup){
  var sep = cup.sep || 0;
  var rot = cup.rot || 0;
  var y = cup.y || 0;
  if(side === 'left'){
    return 'translate(' + (-sep) + ' ' + y + ') rotate(' + rot + ' 78 118)';
  }
  return 'translate(' + sep + ' ' + y + ') rotate(' + (-rot) + ' 198 118)';
}
function cafeShapeMarkup(spec){
  if(!spec) return '';
  var d = spec.kind === 'blob' ? CAFE_BLOB_D : CAFE_LIQUID_D;
  var sx = spec.sx != null ? spec.sx : 1;
  var sy = spec.sy != null ? spec.sy : 1;
  if(spec.flip) sx = -sx;
  var ang = spec.ang || 0;
  return '<g transform="translate(' + spec.x + ' ' + spec.y + ') rotate(' + ang + ') scale(' + sx + ' ' + sy + ')">'
    + '<path fill="#F9E24C" d="' + d + '"/>'
    + '</g>';
}
function cafePoseSvg(fr){
  var liveInner = '<g transform="translate(196 0)"><g class="cup-right cup-piece" transform="' + cafeCupPoseT('right', fr.cup) + '">' + cafeCupArt(false) + '</g></g>'
    + '<g transform="translate(0 27)"><g class="cup-left cup-piece" transform="' + cafeCupPoseT('left', fr.cup) + '">' + cafeCupArt(true) + '</g></g>'
    + (fr.drops ? cafeShapeMarkup(fr.drops.L) + cafeShapeMarkup(fr.drops.R) : '');
  return '<svg class="cafe-cups cafe-pose" viewBox="' + CAFE_POSE_VB + '" fill="none" overflow="visible" aria-hidden="true">'
    + '<g class="cafe-live" style="opacity:' + (fr.showFinal ? '0' : '1') + '">' + liveInner + '</g>'
    + '<g style="opacity:' + (fr.showFinal ? '1' : '0') + '">' + cafeIconFinalMarkup() + '</g>'
  + '</svg>';
}
function animDebugSet(index){
  var n = ANIM_DEBUG_FRAMES.length;
  ST.animDebugFrame = ((index % n) + n) % n;
  applyAnimDebugFrame();
  renderAnimDebugGrid();
  var fr = ANIM_DEBUG_FRAMES[ST.animDebugFrame];
  var note = document.getElementById('animDebugNote');
  if(note) note.textContent = 'Frame ' + (ST.animDebugFrame + 1) + ' / ' + n + ' \u2014 ' + fr.label;
}
function animDebugPrev(){ animDebugSet(ST.animDebugFrame - 1); }
function animDebugNext(){ animDebugSet(ST.animDebugFrame + 1); }
function applyAnimDebugFrame(){
  /* Welcome stays the canonical static icon. The six-frame storyboard
     lives only in the hidden debug grid. */
}
function renderAnimDebugGrid(){
  var host = document.getElementById('animDebugGrid');
  if(!host) return;
  var html = '';
  ANIM_DEBUG_FRAMES.forEach(function(fr, i){
    var on = i === ST.animDebugFrame ? ' is-on' : '';
    html += '<button type="button" class="anim-debug-cell' + on + '" onclick="animDebugSet(' + i + ')">'
      + '<span class="anim-debug-kicker">Frame ' + (i + 1) + '</span>'
      + '<span class="anim-debug-title">' + fr.label + '</span>'
      + cafePoseSvg(fr)
      + '</button>';
  });
  host.innerHTML = html;
}
function cafeCardsIcon(){
  var back = 'M22.3808 7.78128L46.026 11.7121C48.6139 12.1423 50.3567 14.5878 49.9187 17.1743L44.186 51.0293C43.7478 53.6156 41.295 55.3639 38.7073 54.9337L15.0621 51.0029C12.4744 50.5728 10.7317 48.127 11.1694 45.5407L16.9021 11.6857C17.3401 9.09913 19.793 7.35108 22.3808 7.78128Z';
  var front = 'M4.94493 6.21876L28.3942 1.27471C30.9612 0.733506 33.4886 2.37401 34.0394 4.93888L41.2505 38.5161C41.8013 41.0809 40.1669 43.5989 37.6 44.1401L14.1507 49.0842C11.5838 49.6254 9.05634 47.9849 8.50551 45.42L1.29448 11.8428C0.760843 9.358 2.27805 6.9169 4.70727 6.27486L4.94493 6.21876Z';
  return '<svg class="wp-cards" viewBox="0 0 51 56" fill="none" aria-hidden="true">'
    + '<defs><mask id="wpCardMask" maskUnits="userSpaceOnUse" x="-8" y="-8" width="67" height="72">'
    + '<rect x="-8" y="-8" width="67" height="72" fill="#000"/>'
    + '<g class="wp-card wp-card-back"><path d="' + back + '" fill="#fff"/></g>'
    + '</mask></defs>'
    + '<g class="wp-card wp-card-front"><path d="' + front + '" fill="#FFE300" mask="url(#wpCardMask)"/></g>'
    + '<g class="wp-card wp-card-back"><path d="' + back + '" stroke="#F7F6EF" stroke-width="1"/></g>'
    + '<g class="wp-card wp-card-front"><path d="' + front + '" stroke="#F7F6EF" stroke-width="1"/></g>'
    + '</svg>';
}
/* Draw the partner's level from inside the selected set, so the choice is
   visible in the match card. */
function drawPartnerLevel(){
  if(!ST.selected.length) return LEVEL_DATA.myLevel;
  if(isSelected(PARTNER.level)) return PARTNER.level;
  return ST.selected[Math.floor(ST.selected.length / 2)];
}


/* =========================================================================
   1 · ENTRY / MATCHING PREFERENCES
   ========================================================================= */

function rangeFeedbackCopy(){
  var ids = LEVEL_DATA.eligible;
  var n = ids.length;
  var span = ST.rangeHi - ST.rangeLo + 1;
  if(span >= n){
    return 'All levels selected - your best chance of meeting someone';
  }
  if(span === 1){
    return 'Matching you with other Yellow-level learners';
  }
  if(span <= 2){
    return 'A wider range may help you meet someone faster';
  }
  if(span >= Math.ceil(n * 0.6)){
    return 'Great range - you\u2019re more likely to meet someone quickly';
  }
  var lo = GM.levelMeta(ids[ST.rangeLo]).label;
  var hi = GM.levelMeta(ids[ST.rangeHi]).label;
  return 'Matching you from ' + lo + ' through ' + hi;
}

var LEVEL_ICONS = {
  red: 'assets/level-red.png',
  orange: 'assets/level-orange.png',
  pink: 'assets/level-pink.png',
  yellow: 'assets/level-yellow.png',
  lightblue: 'assets/level-lightblue.png',
  blue: 'assets/level-blue.png',
  lime: 'assets/level-lime.png'
};
function specRingFor(color){
  var hex = String(color || '').replace('#','');
  if(hex.length !== 6) return 'rgba(55,50,48,.26)';
  var r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
  var l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.58 ? 'rgba(55,50,48,.28)' : 'rgba(247,246,239,.34)';
}

function spectrumNodeHtml(id, index){
  var meta = GM.levelMeta(id);
  var mine = id === LEVEL_DATA.myLevel;
  var on = index >= ST.rangeLo && index <= ST.rangeHi;
  var label = meta.label + (mine ? ', your level' : '');
  var icon = LEVEL_ICONS[id]
    ? '<img class="spec-ico" src="' + LEVEL_ICONS[id] + '" alt="" aria-hidden="true" draggable="false">'
    : '';
  return '<button type="button" class="spec-node' + (on?' is-on':'') + (mine?' is-you':'') + '"'
    + ' data-idx="' + index + '" data-id="' + id + '"'
    + ' style="--lvl:' + meta.color + ';--spec-ring:' + specRingFor(meta.color) + '"'
    + ' aria-pressed="' + on + '"'
    + ' aria-label="' + GM.esc(label) + '"'
    + ' onclick="tapSpectrumLevel(' + index + ')">'
    + '<span class="spec-dot" aria-hidden="true">' + icon + '</span>'
  + '</button>';
}

/* Inverted arch ∩. Two symmetric cubics (ellipse quarters) so Yellow sits
   at the geometric apex and path-length midpoint. Handles travel the full
   path; nodes sit on an inset equal-length span, never under a handle. */
var SPEC_VB = {
  w:360,
  h:248,
  d:'M30 222 C30 155.77 97.21 102 180 102 C262.79 102 330 155.77 330 222'
};
var SPEC_GLASS_CAP = 56;
var SPEC_PREVIEWS = {
  full:   {lo:0, hi:6, active:null, hot:-1},
  narrow: {lo:2, hi:4, active:null, hot:-1},
  handle: {lo:2, hi:5, active:'hi', hot:5},
  solo:    {lo:3, hi:3, active:null, hot:-1}
};
function specArcD(){ return SPEC_VB.d; }
function specRoot(){ return document.getElementById('levelSpectrum'); }
function specPadT(root){
  if(root && root._padT != null) return root._padT;
  return 0.085;
}
function specIndexToT(index, n, padT){
  n = n == null ? LEVEL_DATA.eligible.length : n;
  if(padT == null) padT = specPadT(specRoot());
  if(n < 2) return 0.5;
  return padT + index * (1 - 2 * padT) / (n - 1);
}
function specTToIndex(t, n, padT){
  n = n == null ? LEVEL_DATA.eligible.length : n;
  if(n < 2) return 0;
  if(padT == null) padT = specPadT(specRoot());
  var usable = 1 - 2 * padT;
  if(usable <= 0) return 0;
  var u = (t - padT) / usable;
  return Math.round(Math.max(0, Math.min(1, u)) * (n - 1));
}
function specSlotT(side, idx, n, padT){
  n = n == null ? LEVEL_DATA.eligible.length : n;
  if(padT == null) padT = specPadT(specRoot());
  if(side === 'lo'){
    if(idx <= 0) return 0;
    return (specIndexToT(idx - 1, n, padT) + specIndexToT(idx, n, padT)) / 2;
  }
  if(idx >= n - 1) return 1;
  return (specIndexToT(idx, n, padT) + specIndexToT(idx + 1, n, padT)) / 2;
}
function specYellowGuardT(root, side, n, me, padT){
  var slot = specSlotT(side, me, n, padT);
  var path = root && root.querySelector('.spec-hair');
  var pts = root && root._pts;
  if(!path || !pts || !pts[me]) return slot;
  var clear = specPxToVb(root, 20 + 11 + 8);
  var guarded = specTBeyondNode(path, pts[me], pts[me].t, side === 'lo' ? -1 : 1, clear);
  if(side === 'lo') return Math.min(slot, guarded);
  return Math.max(slot, guarded);
}
function specClampHandleT(side, t, n, me, padT){
  if(padT == null) padT = specPadT(specRoot());
  var root = specRoot();
  var loMax = specYellowGuardT(root, 'lo', n, me, padT);
  var hiMin = specYellowGuardT(root, 'hi', n, me, padT);
  if(side === 'lo') return Math.max(0, Math.min(loMax, t));
  return Math.max(hiMin, Math.min(1, t));
}
function specRangeFromHandles(loT, hiT, n, me, padT){
  var lo = me, hi = me;
  var i, nt;
  for(i = 0; i < n; i++){
    nt = specIndexToT(i, n, padT);
    if(nt + 0.0008 >= loT && nt - 0.0008 <= hiT){
      if(i < lo) lo = i;
      if(i > hi) hi = i;
    }
  }
  if(lo > me) lo = me;
  if(hi < me) hi = me;
  return [lo, hi];
}
function specPxToVb(root, px){
  var stage = root && root.querySelector('.spec-stage');
  var w = stage ? stage.getBoundingClientRect().width : SPEC_VB.w;
  return px * SPEC_VB.w / Math.max(1, w);
}
function specPathNormalIn(path, t){
  var len = path.getTotalLength();
  var along = len * Math.max(0, Math.min(1, t));
  var p = path.getPointAtLength(along);
  var p2 = path.getPointAtLength(Math.max(0, Math.min(len, along + 2)));
  var dx = p2.x - p.x, dy = p2.y - p.y;
  var L = Math.hypot(dx, dy) || 1;
  var nx = -dy / L, ny = dx / L;
  if(nx * (180 - p.x) + ny * (248 - p.y) < 0){ nx = -nx; ny = -ny; }
  return {x:p.x, y:p.y, nx:nx, ny:ny};
}
function specTBeyondNode(path, nodePt, startT, dir, minDist){
  var len = path.getTotalLength();
  var t = startT;
  var step = dir * 0.0035;
  var i, p, d;
  for(i = 0; i < 90; i++){
    t += step;
    if(t <= 0) return 0;
    if(t >= 1) return 1;
    p = path.getPointAtLength(len * t);
    d = Math.hypot(p.x - nodePt.x, p.y - nodePt.y);
    if(d >= minDist) return t;
  }
  return Math.max(0, Math.min(1, t));
}
function specRestHandleT(root, side, idx, n, padT){
  n = n == null ? LEVEL_DATA.eligible.length : n;
  if(padT == null) padT = specPadT(root);
  var me = myLevelIndex();
  if(idx === me) return specYellowGuardT(root, side, n, me, padT);
  return specSlotT(side, idx, n, padT);
}
function specHandlePoint(root, t, nudge){
  var path = root.querySelector('.spec-hair');
  if(!path) return {x:0, y:0};
  var nrm = specPathNormalIn(path, t);
  var x = nrm.x, y = nrm.y;
  if(!nudge) return {x:x, y:y};
  var knobR = specPxToVb(root, 11);
  var gap = specPxToVb(root, 4);
  var need = 0;
  root.querySelectorAll('.spec-node').forEach(function(node){
    var pill = node.querySelector('.spec-dot');
    if(!pill) return;
    var r = pill.getBoundingClientRect();
    var stage = root.querySelector('.spec-stage').getBoundingClientRect();
    var pcx = (r.left + r.width / 2 - stage.left) / stage.width * SPEC_VB.w;
    var pcy = (r.top + r.height / 2 - stage.top) / stage.height * SPEC_VB.h;
    var rx = specPxToVb(root, r.width / 2);
    var ry = specPxToVb(root, r.height / 2);
    var dx = Math.max(Math.abs(x - pcx) - rx, 0);
    var dy = Math.max(Math.abs(y - pcy) - ry, 0);
    var outside = Math.hypot(dx, dy);
    var overlap = knobR + gap - outside;
    if(Math.abs(x - pcx) <= rx && Math.abs(y - pcy) <= ry){
      overlap = knobR + gap + Math.min(rx - Math.abs(x - pcx), ry - Math.abs(y - pcy));
    }
    if(overlap > need) need = overlap;
  });
  need = Math.min(need, specPxToVb(root, 18));
  return {x: x + nrm.nx * need, y: y + nrm.ny * need};
}
function specNearestSlot(side, t, n, me, padT){
  var from = side === 'lo' ? 0 : me;
  var to = side === 'lo' ? me : n - 1;
  var i, best = from, bestD = Infinity, s, d;
  for(i = from; i <= to; i++){
    s = specSlotT(side, i, n, padT);
    d = Math.abs(s - t);
    if(d < bestD){ bestD = d; best = i; }
  }
  return best;
}
function levelSpectrum(){
  var ids = LEVEL_DATA.eligible;
  var me = myLevelIndex();
  var nodes = '';
  var tips = '';
  ids.forEach(function(id, i){
    nodes += spectrumNodeHtml(id, i);
    var meta = GM.levelMeta(id);
    var mine = id === LEVEL_DATA.myLevel;
    tips += '<div class="spec-tip" data-idx="' + i + '" data-id="' + id + '">'
      + '<span class="spec-tip-card">'
        + '<span class="spec-tip-name">' + GM.esc(meta.label) + '</span>'
        + (mine ? '<span class="spec-tip-you">You</span>' : '')
      + '</span>'
      + '<span class="spec-tip-anchor" aria-hidden="true"></span>'
    + '</div>';
  });
  var loLabel = GM.esc(GM.levelMeta(ids[ST.rangeLo]).label);
  var hiLabel = GM.esc(GM.levelMeta(ids[ST.rangeHi]).label);
  return '<div class="level-spectrum" id="levelSpectrum" role="group"'
    + ' aria-labelledby="cafeLevelsHeading" aria-describedby="specHintSr">'
    + '<div class="spec-board">'
      + '<div class="spec-stage">'
        + '<svg class="spec-svg" viewBox="0 0 ' + SPEC_VB.w + ' ' + SPEC_VB.h + '" overflow="visible" aria-hidden="true" focusable="false">'
          + '<defs>'
            + '<filter id="cafeSpecInset" x="-48" y="-48" width="456" height="344" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">'
              + '<feGaussianBlur in="SourceAlpha" stdDeviation="4.5" result="blur"/>'
              + '<feComposite in="blur" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="inner"/>'
              + '<feFlood flood-color="#000000" flood-opacity="0.32" result="color"/>'
              + '<feComposite in="color" in2="inner" operator="in" result="shadow"/>'
              + '<feComposite in="shadow" in2="SourceGraphic" operator="over"/>'
            + '</filter>'
          + '</defs>'
          + '<path class="spec-track" d="' + specArcD() + '"' + (ST.specInset === false ? '' : ' filter="url(#cafeSpecInset)"') + '/>'
          + '<path class="spec-hair" d="' + specArcD() + '"/>'
          + '<path class="spec-glass spec-glass-shadow" d="' + specArcD() + '" transform="translate(0 7)"/>'
          + '<path class="spec-glass spec-glass-contact" d="' + specArcD() + '" transform="translate(0 3)"/>'
          + '<path class="spec-glass spec-glass-body" d="' + specArcD() + '"/>'
          + '<path class="spec-glass spec-glass-volume" d="' + specArcD() + '"/>'
          + '<path class="spec-glass spec-glass-lower" d="' + specArcD() + '" transform="translate(0.8 2.2)"/>'
          + '<path class="spec-glass spec-glass-rim" d="' + specArcD() + '" transform="translate(-1.4 -2.1)"/>'
        + '</svg>'
        + '<div class="spec-nodes">' + nodes + '</div>'
        + '<button type="button" class="spec-handle spec-handle-lo" id="specHandleLo"'
          + ' role="slider" aria-label="Lower end of matching range"'
          + ' aria-valuemin="0" aria-valuemax="' + me + '" aria-valuenow="' + ST.rangeLo + '"'
          + ' aria-valuetext="' + loLabel + '">'
          + '<span class="spec-knob" aria-hidden="true"></span>'
        + '</button>'
        + '<button type="button" class="spec-handle spec-handle-hi" id="specHandleHi"'
          + ' role="slider" aria-label="Higher end of matching range"'
          + ' aria-valuemin="' + me + '" aria-valuemax="' + (ids.length - 1) + '" aria-valuenow="' + ST.rangeHi + '"'
          + ' aria-valuetext="' + hiLabel + '">'
          + '<span class="spec-knob" aria-hidden="true"></span>'
        + '</button>'
        + '<p class="spec-hint' + (ST.rangeHintSeen ? ' is-faded' : '') + '" id="specHintVis"'
          + ' aria-hidden="' + (ST.rangeHintSeen ? 'true' : 'false') + '">'
          + '<span class="spec-hint-arrow spec-hint-arrow-lo" aria-hidden="true">' + GM.I.chevRt + '</span>'
          + '<span class="spec-hint-copy">Drag the edges<br>to adjust your range</span>'
          + '<span class="spec-hint-arrow spec-hint-arrow-hi" aria-hidden="true">' + GM.I.chevRt + '</span>'
        + '</p>'
      + '</div>'
      + '<div class="spec-labels" id="specLabels" aria-hidden="true">' + tips + '</div>'
      + '<div class="spec-orient spec-orient-ends" aria-hidden="true">'
        + '<span><span class="spec-orient-full">Below<br>your level</span><span class="spec-orient-short">Lower<br>levels</span></span>'
        + '<span><span class="spec-orient-full">Above<br>your level</span><span class="spec-orient-short">Higher<br>levels</span></span>'
      + '</div>'
    + '</div>'
    + '<p class="spec-sr" id="specHintSr">Drag either handle to adjust a continuous matching range. Your level always stays inside it.</p>'
  + '</div>';
}
function toggleSpecInset(force){
  ST.specInset = force == null ? ST.specInset !== true : !!force;
  var track = document.querySelector('#levelSpectrum .spec-track');
  if(track){
    if(ST.specInset) track.setAttribute('filter', 'url(#cafeSpecInset)');
    else track.removeAttribute('filter');
  }
  syncSpecInsetButton();
}
function syncSpecInsetButton(){
  var btn = document.getElementById('specInsetToggle');
  if(!btn) return;
  var on = ST.specInset !== false;
  btn.classList.toggle('on', on);
  btn.textContent = on ? 'Inner shadow On' : 'Inner shadow Off';
}
function specPreview(name){
  var p = SPEC_PREVIEWS[name];
  if(!p) return;
  if(specSettle){ cancelAnimationFrame(specSettle); specSettle = 0; }
  specDrag = null;
  ST.specPreview = name;
  ST.specActiveHandle = p.active;
  ST.specHot = p.hot;
  applyLevelRange(p.lo, p.hi);
  syncSpecPreviewButtons();
}
function syncSpecPreviewButtons(){
  document.querySelectorAll('[data-spec-preview]').forEach(function(b){
    b.classList.toggle('on', b.getAttribute('data-spec-preview') === ST.specPreview);
  });
}
function applySpecPreviewVisuals(root){
  if(!root || specDrag) return;
  root.querySelectorAll('.spec-handle').forEach(function(el){
    el.classList.toggle('is-active', false);
    el.classList.toggle('is-pressed', false);
  });
  if(ST.specActiveHandle === 'lo'){
    var lo = document.getElementById('specHandleLo');
    if(lo) lo.classList.add('is-active');
  }
  if(ST.specActiveHandle === 'hi'){
    var hi = document.getElementById('specHandleHi');
    if(hi) hi.classList.add('is-active');
  }
}

function screenEntry(){
  return '<div class="cafe-entry-chrome" id="cafeEntryChrome">'
      + '<div class="cafe-entry-header" id="cafeEntryHeader">'
        /* Same renderer as the hero, frozen on the approved final frame, so the
           hero mark can hand over to it without a size, position or art shift.
           Its box is reserved from the start; only its opacity changes. */
        + '<span class="cafe-header-mark" id="cafeHeaderMark">' + welcomeAnimMarkup() + '</span>'
        + '<span class="cafe-header-title">Caf\u00e9</span>'
      + '</div>'
      + '<button type="button" class="cafe-entry-close" onclick="leaveCafeHome()"'
        + ' aria-label="Close Caf\u00e9 and return home">' + GM.I.x + '</button>'
    + '</div>'
    + '<main class="cafe-entry-page">'
      + '<section class="cafe-welcome' + (ST.welcomePlayed ? '' : ' is-opening') + '" aria-label="Welcome">'
        + '<div class="cafe-welcome-lockup">'
          + '<div class="cafe-hero-slot" id="cafeHeroSlot">'
            + '<div class="cafe-hero-fly" id="cafeHeroFly">'
              + welcomeAnimMarkup()
            + '</div>'
          + '</div>'
          + '<h2 class="cafe-display cafe-welcome-title">Welcome to the <b>Caf\u00e9</b>!</h2>'
          + '<p class="cafe-sub cafe-welcome-sub">Grab a coffee and chat with a Hebrew partner from anywhere in the world.</p>'
        + '</div>'
        + '<button type="button" class="cafe-scroll-cue" id="cafeScrollCue"'
          + ' aria-label="Scroll to choose partner levels">'
          + '<span class="cue-icon" aria-hidden="true">' + GM.I.chevUp + '</span>'
        + '</button>'
      + '</section>'
      + '<section class="cafe-levels" id="cafeLevels" aria-labelledby="cafeLevelsHeading">'
        + '<div class="cafe-levels-inner" id="cafeLevelsFocus">'
          + '<div class="pref-copy">'
            + '<h2 class="pref-intro" id="cafeLevelsHeading">Choose partner levels</h2>'
            + '<p class="pref-lead">Wider range, better odds of finding someone.</p>'
          + '</div>'
          + levelSpectrum()
          + '<div class="cafe-acts">'
            + '<button class="primary-cta" type="button" onclick="goAvCheck()"'
              + (ST.selected.length?'':' disabled') + '>Continue</button>'
          + '</div>'
        + '</div>'
      + '</section>'
    + '</main>';
}

var entryIo = null;
var entryOnScroll = null;
var entryCleanup = [];
var mobileWelcomeTimer = 0;
var mobileWelcomeScrollRaf = 0;
var mobileWelcomeScrollActive = false;
var specDrag = null;
var specSettle = 0;
var specDidDrag = false;
function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function unbindEntryPage(){
  cancelWelcomeAnim();
  cancelMobileWelcomeProgression();
  if(entryIo){ entryIo.disconnect(); entryIo = null; }
  if(entryOnScroll){
    var el = document.getElementById('screen');
    if(el) el.removeEventListener('scroll', entryOnScroll);
    entryOnScroll = null;
  }
  entryCleanup.forEach(function(fn){ try{ fn(); }catch(e){} });
  entryCleanup = [];
  if(specSettle){ cancelAnimationFrame(specSettle); specSettle = 0; }
  specDrag = null;
  specDidDrag = false;
}
function cancelMobileWelcomeProgression(userInterrupted){
  var screen = document.getElementById('screen');
  var wasPending = !!mobileWelcomeTimer || mobileWelcomeScrollActive
    || !!(screen && screen.classList.contains('is-auto-settled'));
  if(mobileWelcomeTimer){
    window.clearTimeout(mobileWelcomeTimer);
    mobileWelcomeTimer = 0;
  }
  if(mobileWelcomeScrollRaf){
    cancelAnimationFrame(mobileWelcomeScrollRaf);
    mobileWelcomeScrollRaf = 0;
  }
  mobileWelcomeScrollActive = false;
  if(screen){
    screen.classList.remove('is-auto-scrolling','is-auto-settled');
    if(userInterrupted && wasPending) screen.classList.add('is-user-controlling');
    else if(!userInterrupted) screen.classList.remove('is-user-controlling');
  }
}
function sizeEntryWelcome(screen){
  var h = screen.clientHeight;
  screen.classList.toggle('is-short', h < 680);
  screen.style.setProperty('--cafe-stage-h', h + 'px');
  screen.style.setProperty('--cafe-levels-h', h + 'px');
  screen.style.removeProperty('--cafe-peek');
  screen.style.removeProperty('--cafe-welcome-h');
}

function cafeLevelStageTop(screen, levels){
  var screenRect = screen.getBoundingClientRect();
  var levelsRect = levels.getBoundingClientRect();
  return levelsRect.top - screenRect.top + screen.scrollTop;
}

function cafeLevelScrollTarget(screen, levels){
  var maxScroll = Math.max(0, screen.scrollHeight - screen.clientHeight);
  var levelTop = cafeLevelStageTop(screen, levels);
  return Math.max(0, Math.min(maxScroll, levelTop));
}

function afterMobileWelcomeReady(welcome, done){
  var started = false;
  function run(){
    if(started) return;
    started = true;
    window.requestAnimationFrame(function(){
      window.requestAnimationFrame(done);
    });
  }
  var cups = welcome && (welcome.querySelector('.cafe-hero-slot') || welcome.querySelector('.cafe-cups'));
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  fontsReady.then(function(){
    if(cups && cups.getBoundingClientRect().height < 2){
      window.setTimeout(run, 40);
    } else {
      run();
    }
  }, run);
  window.setTimeout(run, 480);
}
function specPoints(svg){
  var path = (svg && svg.querySelector('.spec-hair')) || (svg && svg.querySelector('.spec-track'));
  if(!path || !path.getTotalLength) return [];
  var len = path.getTotalLength();
  var n = LEVEL_DATA.eligible.length;
  var padT = specPadT(specRoot());
  var pts = [];
  for(var i = 0; i < n; i++){
    var t = specIndexToT(i, n, padT);
    var p = path.getPointAtLength(len * t);
    pts.push({x:p.x, y:p.y, t:t, len:len * t, total:len});
  }
  return pts;
}
function layoutSpectrum(){
  var root = document.getElementById('levelSpectrum');
  if(!root) return;
  var svg = root.querySelector('.spec-svg');
  var path = svg && svg.querySelector('.spec-hair');
  if(path && path.getTotalLength){
    var len = path.getTotalLength();
    root._padT = Math.max(0.078, Math.min(0.12, 48 / len));
  }
  var pts = specPoints(svg);
  root._pts = pts;
  var vbW = SPEC_VB.w, vbH = SPEC_VB.h;
  pts.forEach(function(p, i){
    var node = root.querySelector('.spec-node[data-idx="' + i + '"]');
    if(!node) return;
    node.style.left = (p.x / vbW * 100) + '%';
    node.style.top = (p.y / vbH * 100) + '%';
  });
  updateSpectrumDOM();
}
function setFeedbackCopy(text, immediate){
  var live = document.getElementById('specFeedback');
  if(!live) return;
  live.setAttribute('data-copy', text);
  if(live.textContent === text){
    live.classList.remove('is-swap');
    return;
  }
  live.textContent = text;
  if(immediate || specDrag || prefersReducedMotion()){
    live.classList.remove('is-swap');
    return;
  }
  live.classList.remove('is-swap');
  void live.offsetWidth;
  live.classList.add('is-swap');
  window.setTimeout(function(){ live.classList.remove('is-swap'); }, 180);
}
function fadeRangeHint(){
  ST.rangeHintSeen = true;
  var hint = document.getElementById('specHintVis');
  if(hint){
    hint.classList.add('is-faded');
    hint.setAttribute('aria-hidden', 'true');
  }
}
function updateGlassPath(root, loT, hiT){
  var path = root.querySelector('.spec-hair');
  if(!path || !path.getTotalLength) return;
  var len = path.getTotalLength();
  var t0 = Math.max(0, Math.min(1, loT));
  var t1 = Math.max(0, Math.min(1, hiT));
  if(t1 < t0){ var s = t0; t0 = t1; t1 = s; }
  var span = Math.max(1, len * (t1 - t0));
  var cap = Math.min(SPEC_GLASS_CAP, Math.max(0, span - 10));
  var selected = Math.max(2, span - cap);
  var start = len * t0 + cap / 2;
  var dash = selected + ' ' + len;
  var off = String(-start);
  root.querySelectorAll('.spec-glass').forEach(function(g){
    g.setAttribute('stroke-dasharray', dash);
    g.setAttribute('stroke-dashoffset', off);
  });
}
function specPathPoint(path, t){
  var len = path.getTotalLength();
  var along = len * Math.max(0, Math.min(1, t));
  return path.getPointAtLength(along);
}
function placeHandleAt(el, xPct, yPct, snapping){
  if(!el) return;
  el.classList.toggle('is-snap', !!snapping);
  el.style.left = xPct;
  el.style.top = yPct;
}
function syncHandleAria(el, now, min, max, label){
  if(!el) return;
  el.setAttribute('aria-valuenow', String(now));
  el.setAttribute('aria-valuemin', String(min));
  el.setAttribute('aria-valuemax', String(max));
  el.setAttribute('aria-valuetext', label);
}
function specTipsOverlap(a, b, padX, padY){
  return !(a.right < b.left + padX || a.left > b.right - padX || a.bottom < b.top + padY || a.top > b.bottom - padY);
}
function layoutSpecLabels(root){
  var board = root.querySelector('.spec-board');
  var screen = document.getElementById('screen');
  if(!board || !screen) return;
  var boardBox = board.getBoundingClientRect();
  var screenBox = screen.getBoundingClientRect();
  var pad = 16;
  var me = myLevelIndex();
  var hot = ST.specHot;
  var lo = ST.rangeLo, hi = ST.rangeHi;
  var visible = {};
  visible[me] = 'you';
  if(hot >= 0 && hot !== me) visible[hot] = 'hot';
  var placed = [];
  root.querySelectorAll('.spec-tip').forEach(function(tip){
    var i = parseInt(tip.getAttribute('data-idx'), 10);
    var kind = visible[i];
    tip.classList.toggle('is-on', !!kind);
    tip.classList.toggle('is-you', kind === 'you');
    tip.classList.toggle('is-hot', kind === 'hot' || (kind && i === hot));
    tip.classList.toggle('is-bound', kind === 'bound');
    tip.style.setProperty('--tip-shift', '0px');
    tip.style.setProperty('--tip-lift', '0px');
    if(!kind) return;
    var node = root.querySelector('.spec-node[data-idx="' + i + '"]');
    if(!node) return;
    var nb = node.getBoundingClientRect();
    tip.style.left = (nb.left + nb.width / 2 - boardBox.left) + 'px';
    tip.style.top = (nb.top - boardBox.top) + 'px';
    placed.push({
      el: tip,
      i: i,
      pri: kind === 'you' ? 1 : kind === 'hot' || i === hot ? 2 : 3
    });
  });
  function applyShift(el, extra){
    el.style.setProperty('--tip-shift', extra + 'px');
    var r = el.getBoundingClientRect();
    var shift = extra;
    if(r.left < screenBox.left + pad) shift += (screenBox.left + pad) - r.left;
    if(r.right > screenBox.right - pad) shift += (screenBox.right - pad) - r.right;
    el.style.setProperty('--tip-shift', shift + 'px');
    return shift;
  }
  placed.forEach(function(p){ applyShift(p.el, 0); });
  placed.sort(function(a, b){ return a.pri - b.pri; });
  var kept = [];
  placed.forEach(function(p){
    if(!p.el.classList.contains('is-on')) return;
    var extra = 0;
    var lift = 0;
    var tries;
    for(tries = 0; tries < 5; tries++){
      applyShift(p.el, extra);
      p.el.style.setProperty('--tip-lift', lift + 'px');
      var ra = p.el.getBoundingClientRect();
      var hit = null;
      kept.some(function(k){
        if(specTipsOverlap(ra, k.el.getBoundingClientRect(), 8, 4)){
          hit = k;
          return true;
        }
        return false;
      });
      if(!hit || p.pri === 1) break;
      var hb = hit.el.getBoundingClientRect();
      lift = Math.min(64, lift + Math.max(22, Math.ceil(ra.bottom - hb.top) + 6));
      extra += (ra.left + ra.width / 2 < hb.left + hb.width / 2) ? -18 : 18;
    }
    applyShift(p.el, extra);
    p.el.style.setProperty('--tip-lift', lift + 'px');
    var still = kept.some(function(k){
      return specTipsOverlap(p.el.getBoundingClientRect(), k.el.getBoundingClientRect(), 8, 4);
    });
    if(still && p.pri === 2 && p.i !== lo && p.i !== hi && p.i !== me){
      p.el.classList.remove('is-on', 'is-hot', 'is-bound');
      return;
    }
    kept.push(p);
  });
}
function updateSpectrumDOM(opts){
  opts = opts || {};
  var root = document.getElementById('levelSpectrum');
  if(!root) return;
  var ids = LEVEL_DATA.eligible;
  var n = ids.length;
  var me = myLevelIndex();
  var hot = ST.specHot;
  var padT = specPadT(root);
  var liveT = opts.liveT;
  root.querySelectorAll('.spec-node').forEach(function(node){
    var i = parseInt(node.getAttribute('data-idx'), 10);
    var on = i >= ST.rangeLo && i <= ST.rangeHi;
    var bound = i === ST.rangeLo || i === ST.rangeHi;
    node.classList.toggle('is-on', on);
    node.classList.toggle('is-hot', i === hot);
    node.classList.toggle('is-bound', bound);
    node.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  var loT = liveT ? liveT.lo : specRestHandleT(root, 'lo', ST.rangeLo, n, padT);
  var hiT = liveT ? liveT.hi : specRestHandleT(root, 'hi', ST.rangeHi, n, padT);
  if(loT > hiT){
    var mid = (loT + hiT) / 2;
    loT = Math.min(loT, mid);
    hiT = Math.max(hiT, mid);
  }
  updateGlassPath(root, loT, hiT);
  function placeHandle(el, t){
    if(!el) return;
    var pt = specHandlePoint(root, t, !liveT);
    placeHandleAt(el, (pt.x / SPEC_VB.w * 100) + '%', (pt.y / SPEC_VB.h * 100) + '%', !!opts.snapping);
  }
  var loEl = document.getElementById('specHandleLo');
  var hiEl = document.getElementById('specHandleHi');
  placeHandle(loEl, loT);
  placeHandle(hiEl, hiT);
  syncHandleAria(loEl, ST.rangeLo, 0, me, GM.levelMeta(ids[ST.rangeLo]).label);
  syncHandleAria(hiEl, ST.rangeHi, me, n - 1, GM.levelMeta(ids[ST.rangeHi]).label);
  applySpecPreviewVisuals(root);
  setFeedbackCopy(rangeFeedbackCopy(), !!liveT);
  layoutSpecLabels(root);
}
function specClientToVb(svg, clientX, clientY){
  if(!svg || !svg.createSVGPoint || !svg.getScreenCTM) return null;
  var ctm = svg.getScreenCTM();
  if(!ctm) return null;
  var pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(ctm.inverse());
}
function specClosestOnPath(path, x, y){
  var len = path.getTotalLength();
  var samples = 60;
  var bestL = 0, bestD = Infinity, bestP = path.getPointAtLength(0);
  var i, l, p, d;
  for(i = 0; i <= samples; i++){
    l = len * i / samples;
    p = path.getPointAtLength(l);
    d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if(d < bestD){ bestD = d; bestL = l; bestP = p; }
  }
  var step = len / samples;
  for(i = 0; i < 7; i++){
    step *= 0.5;
    var left = Math.max(0, bestL - step);
    var right = Math.min(len, bestL + step);
    var pl = path.getPointAtLength(left);
    var pr = path.getPointAtLength(right);
    var dl = (pl.x - x) * (pl.x - x) + (pl.y - y) * (pl.y - y);
    var dr = (pr.x - x) * (pr.x - x) + (pr.y - y) * (pr.y - y);
    if(dl < bestD){ bestD = dl; bestL = left; bestP = pl; }
    if(dr < bestD){ bestD = dr; bestL = right; bestP = pr; }
  }
  return {t: bestL / len, x:bestP.x, y:bestP.y, len:len, along:bestL};
}
function specPointFromEvent(root, clientX, clientY){
  var svg = root && root.querySelector('.spec-svg');
  var path = svg && svg.querySelector('.spec-hair');
  if(!path || !path.getTotalLength) return null;
  var loc = specClientToVb(svg, clientX, clientY);
  if(!loc) return null;
  return specClosestOnPath(path, loc.x, loc.y);
}
function nearestSpecIndex(root, clientX, clientY){
  var hit = specPointFromEvent(root, clientX, clientY);
  if(!hit) return 0;
  return specTToIndex(hit.t);
}
function hapticTick(){
  try{ if(navigator.vibrate) navigator.vibrate(8); }catch(e){}
}
function tapSpectrumLevel(index){
  var n = LEVEL_DATA.eligible.length;
  if(index < 0 || index >= n) return;
  if(specDrag || specDidDrag) return;
  fadeRangeHint();
  ST.specPreview = 'live';
  ST.specActiveHandle = null;
  ST.specHot = index;
  var me = myLevelIndex();
  if(index !== me){
    if(index < me) applyLevelRange(index, ST.rangeHi);
    else applyLevelRange(ST.rangeLo, index);
  } else {
    updateSpectrumDOM();
  }
  window.setTimeout(function(){
    if(ST.specHot === index && !specDrag){
      ST.specHot = -1;
      updateSpectrumDOM();
    }
  }, 420);
}
function specEaseOutSoftBack(t){
  var c1 = 0.26;
  var c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function specLockScroll(on){
  var screen = document.getElementById('screen');
  var root = document.getElementById('levelSpectrum');
  if(screen) screen.classList.toggle('is-spec-dragging', !!on);
  if(root) root.classList.toggle('is-dragging', !!on);
}
function specApplyLiveRange(side, t){
  var n = LEVEL_DATA.eligible.length;
  var me = myLevelIndex();
  var padT = specPadT(specRoot());
  t = specClampHandleT(side, t, n, me, padT);
  var loT = side === 'lo' ? t : specRestHandleT(specRoot(), 'lo', ST.rangeLo, n, padT);
  var hiT = side === 'hi' ? t : specRestHandleT(specRoot(), 'hi', ST.rangeHi, n, padT);
  if(loT > hiT){
    if(side === 'lo') loT = hiT;
    else hiT = loT;
  }
  var range = specRangeFromHandles(loT, hiT, n, me, padT);
  ST.rangeLo = range[0];
  ST.rangeHi = range[1];
  ST.selected = selectedFromRange(ST.rangeLo, ST.rangeHi);
  var hot = specTToIndex(t, n, padT);
  if(hot !== me && specDrag && specDrag.lastHot !== hot) hapticTick();
  ST.specHot = hot;
  if(specDrag){
    specDrag.lastHot = hot;
    specDrag.t = t;
    specDrag.loT = loT;
    specDrag.hiT = hiT;
  }
  updateSpectrumDOM({liveT:{lo:loT, hi:hiT}});
}
function specSettleTo(side, fromT, toT){
  if(specSettle){ cancelAnimationFrame(specSettle); specSettle = 0; }
  var n = LEVEL_DATA.eligible.length;
  var padT = specPadT(specRoot());
  var loT = side === 'lo' ? toT : specRestHandleT(specRoot(), 'lo', ST.rangeLo, n, padT);
  var hiT = side === 'hi' ? toT : specRestHandleT(specRoot(), 'hi', ST.rangeHi, n, padT);
  function finish(){
    ST.specHot = -1;
    ST.specActiveHandle = null;
    updateSpectrumDOM();
    updateNote();
  }
  if(prefersReducedMotion() || Math.abs(toT - fromT) < 0.003){
    finish();
    return;
  }
  var start = performance.now();
  var dur = 210;
  function frame(now){
    var p = Math.min(1, (now - start) / dur);
    var e = specEaseOutSoftBack(p);
    var t = fromT + (toT - fromT) * e;
    var liveLo = side === 'lo' ? t : loT;
    var liveHi = side === 'hi' ? t : hiT;
    updateSpectrumDOM({liveT:{lo:liveLo, hi:liveHi}, snapping:p > 0.72});
    if(p < 1) specSettle = requestAnimationFrame(frame);
    else {
      specSettle = 0;
      finish();
    }
  }
  specSettle = requestAnimationFrame(frame);
}
function specOnHandleMove(e){
  if(!specDrag || e.pointerId !== specDrag.pointerId) return;
  e.preventDefault();
  var dx = e.clientX - specDrag.startX;
  var dy = e.clientY - specDrag.startY;
  if((dx * dx + dy * dy) > 9) specDidDrag = true;
  var hit = specPointFromEvent(specDrag.root, e.clientX, e.clientY);
  if(!hit) return;
  specApplyLiveRange(specDrag.side, hit.t);
}
function specOnHandleUp(e){
  if(!specDrag || e.pointerId !== specDrag.pointerId) return;
  e.preventDefault();
  var drag = specDrag;
  try{ drag.el.releasePointerCapture(e.pointerId); }catch(ex){}
  drag.el.removeEventListener('pointermove', specOnHandleMove);
  drag.el.removeEventListener('pointerup', specOnHandleUp);
  drag.el.removeEventListener('pointercancel', specOnHandleUp);
  drag.el.classList.remove('is-pressed', 'is-active');
  specLockScroll(false);
  var n = LEVEL_DATA.eligible.length;
  var me = myLevelIndex();
  var padT = specPadT(drag.root);
  var fromT = drag.t;
  var snapIdx = specNearestSlot(drag.side, fromT, n, me, padT);
  var next = drag.side === 'lo'
    ? clampLevelRange(snapIdx, ST.rangeHi)
    : clampLevelRange(ST.rangeLo, snapIdx);
  ST.rangeLo = next[0];
  ST.rangeHi = next[1];
  ST.selected = selectedFromRange(ST.rangeLo, ST.rangeHi);
  var toT = specRestHandleT(drag.root, drag.side, drag.side === 'lo' ? ST.rangeLo : ST.rangeHi, n, padT);
  specDrag = null;
  specSettleTo(drag.side, fromT, toT);
  window.setTimeout(function(){ specDidDrag = false; }, 80);
}
function specOnHandleDown(e){
  if(e.button != null && e.button !== 0) return;
  var el = e.currentTarget;
  var root = document.getElementById('levelSpectrum');
  if(!root || !el) return;
  e.preventDefault();
  e.stopPropagation();
  if(specSettle){ cancelAnimationFrame(specSettle); specSettle = 0; }
  fadeRangeHint();
  ST.specPreview = 'live';
  ST.specActiveHandle = el.id === 'specHandleLo' ? 'lo' : 'hi';
  specDidDrag = false;
  var n = LEVEL_DATA.eligible.length;
  var padT = specPadT(root);
  var t = specRestHandleT(root, ST.specActiveHandle, ST.specActiveHandle === 'lo' ? ST.rangeLo : ST.rangeHi, n, padT);
  specDrag = {
    side: ST.specActiveHandle,
    pointerId: e.pointerId,
    el: el,
    root: root,
    startX: e.clientX,
    startY: e.clientY,
    t: t,
    loT: specRestHandleT(root, 'lo', ST.rangeLo, n, padT),
    hiT: specRestHandleT(root, 'hi', ST.rangeHi, n, padT),
    lastHot: ST.specActiveHandle === 'lo' ? ST.rangeLo : ST.rangeHi
  };
  el.classList.add('is-pressed', 'is-active');
  specLockScroll(true);
  try{ el.setPointerCapture(e.pointerId); }catch(ex){}
  el.addEventListener('pointermove', specOnHandleMove);
  el.addEventListener('pointerup', specOnHandleUp);
  el.addEventListener('pointercancel', specOnHandleUp);
}
function specOnHandleKey(e){
  var side = e.currentTarget.id === 'specHandleLo' ? 'lo' : 'hi';
  var me = myLevelIndex();
  var n = LEVEL_DATA.eligible.length;
  var lo = ST.rangeLo, hi = ST.rangeHi;
  var key = e.key;
  if(side === 'lo'){
    if(key === 'ArrowLeft' || key === 'ArrowDown') lo -= 1;
    else if(key === 'ArrowRight' || key === 'ArrowUp') lo += 1;
    else if(key === 'Home') lo = 0;
    else if(key === 'End') lo = me;
    else return;
  } else {
    if(key === 'ArrowLeft' || key === 'ArrowDown') hi -= 1;
    else if(key === 'ArrowRight' || key === 'ArrowUp') hi += 1;
    else if(key === 'Home') hi = me;
    else if(key === 'End') hi = n - 1;
    else return;
  }
  e.preventDefault();
  fadeRangeHint();
  ST.specPreview = 'live';
  ST.specActiveHandle = null;
  ST.specHot = -1;
  applyLevelRange(lo, hi);
}
function bindSpectrum(screen){
  var root = document.getElementById('levelSpectrum');
  if(!root) return;
  layoutSpectrum();
  var lo = document.getElementById('specHandleLo');
  var hi = document.getElementById('specHandleHi');
  function bindHandle(el){
    if(!el) return;
    el.addEventListener('pointerdown', specOnHandleDown);
    el.addEventListener('keydown', specOnHandleKey);
    el.addEventListener('click', function(ev){
      if(specDidDrag){ ev.preventDefault(); ev.stopPropagation(); }
    });
  }
  bindHandle(lo);
  bindHandle(hi);
  function onNodeFocus(ev){
    var node = ev.target.closest && ev.target.closest('.spec-node');
    if(!node) return;
    ST.specHot = parseInt(node.getAttribute('data-idx'), 10);
    layoutSpecLabels(root);
  }
  function onNodeBlur(ev){
    var node = ev.target.closest && ev.target.closest('.spec-node');
    if(!node || specDrag) return;
    if(ST.specHot === parseInt(node.getAttribute('data-idx'), 10)){
      ST.specHot = -1;
      layoutSpecLabels(root);
    }
  }
  root.addEventListener('focusin', onNodeFocus);
  root.addEventListener('focusout', onNodeBlur);
  function onNodeHover(ev){
    var node = ev.target.closest && ev.target.closest('.spec-node');
    if(!node || specDrag) return;
    ST.specHot = parseInt(node.getAttribute('data-idx'), 10);
    layoutSpecLabels(root);
  }
  function onNodeUnhover(ev){
    var node = ev.target.closest && ev.target.closest('.spec-node');
    if(!node || specDrag) return;
    if(document.activeElement === node) return;
    if(ST.specHot === parseInt(node.getAttribute('data-idx'), 10)){
      ST.specHot = -1;
      layoutSpecLabels(root);
    }
  }
  root.addEventListener('pointerenter', onNodeHover, true);
  root.addEventListener('pointerleave', onNodeUnhover, true);
  entryCleanup.push(function(){
    root.removeEventListener('focusin', onNodeFocus);
    root.removeEventListener('focusout', onNodeBlur);
    root.removeEventListener('pointerenter', onNodeHover, true);
    root.removeEventListener('pointerleave', onNodeUnhover, true);
  });
  function onTouchMove(ev){
    if(specDrag) ev.preventDefault();
  }
  screen.addEventListener('touchmove', onTouchMove, {passive:false});
  entryCleanup.push(function(){
    screen.removeEventListener('touchmove', onTouchMove);
    specLockScroll(false);
  });
  function onResize(){ if(!specDrag) layoutSpectrum(); }
  window.addEventListener('resize', onResize);
  entryCleanup.push(function(){ window.removeEventListener('resize', onResize); });
  if(typeof ResizeObserver !== 'undefined'){
    var ro = new ResizeObserver(onResize);
    ro.observe(root);
    entryCleanup.push(function(){ ro.disconnect(); });
  }
}

function lerp01(a, b, t){ return a + (b - a) * t; }
function syncEntryChoreography(screen){
  var welcome = screen.querySelector('.cafe-welcome');
  var cue = document.getElementById('cafeScrollCue');
  var levels = document.getElementById('cafeLevels');
  var fly = document.getElementById('cafeHeroFly');
  var slot = document.getElementById('cafeHeroSlot');
  var header = document.getElementById('cafeEntryHeader');
  if(!welcome || !levels) return;

  var maxWelcome = Math.max(1, welcome.offsetHeight);
  var raw = screen.scrollTop / maxWelcome;
  /* The mark travels with the scroll across almost all of it, tracked straight:
     under a finger that is direct manipulation, and under the guided scroll the
     scroll's own easing carries it, so the flight stays smooth instead of being
     squeezed into the fast middle of the movement. */
  var start = 0.03, end = 0.86;
  var t = Math.max(0, Math.min(1, (raw - start) / (end - start)));
  var reduced = prefersReducedMotion();
  if(reduced) t = raw > 0.22 ? 1 : 0;

  screen.style.setProperty('--entry-head', String(t));
  /* The wordmark belongs to the arrival, not to the opening: it comes in over
     the last stretch of the icon's flight, so the header resolves into the
     complete lockup in one move instead of waiting for its other half. */
  screen.style.setProperty('--entry-title', String(cafeClamp01((t - 0.45) / 0.4)));
  /* One mark, one journey. The mark the animation finished on is the mark that
     ends up beside the wordmark: it is reduced and moved into the header box
     and simply stays there. There is no second icon to fade in and no handoff,
     so no duplication, blink, size jump or position jump is possible.
     #cafeHeaderMark is a transparent placeholder that reserves the header
     space and gives the flight its target box — except under reduced motion,
     where there is no flight and it takes the mark's place directly. */
  var handedOver = reduced && t >= 1;
  screen.style.setProperty('--entry-mark', handedOver ? '1' : '0');
  screen.classList.toggle('is-entry-deep', t > 0.4);

  if(fly && slot && !reduced){
    welcomeFlightT = t;
    welcomeFlightHold = Math.max(0, screen.scrollTop - start * maxWelcome);
    layoutWelcomeMark();
  } else if(fly){
    /* Reduced motion: the mark stays at its settled size in the hero and the
       header's own copy takes over in one step instead of flying. */
    welcomeFlightT = 0;
    layoutWelcomeMark();
    fly.style.opacity = handedOver ? '0' : '1';
  }

  var title = welcome.querySelector('.cafe-welcome-title');
  var sub = welcome.querySelector('.cafe-welcome-sub');
  function fadeCopy(el){
    if(!el) return;
    el.style.animation = 'none';
    if(reduced){
      el.style.opacity = t > 0.5 ? '0' : '1';
      el.style.transform = '';
    } else {
      /* The copy clears over the first stretch of the flight: the mark holds its
         place on screen while the page scrolls up under it, so the headline
         rises past it and needs to be gone by the time it gets there. */
      var f = cafeClamp01(t / 0.3);
      el.style.opacity = String(1 - f);
      el.style.transform = 'translateY(' + (-14 * f) + 'px)';
    }
  }
  if(t > 0.02){
    fadeCopy(title);
    fadeCopy(sub);
  } else if(!welcome.classList.contains('is-opening')){
    [title, sub].forEach(function(el){
      if(!el) return;
      el.style.opacity = '';
      el.style.transform = '';
      el.style.animation = '';
    });
  }

  var root = screen.getBoundingClientRect();
  var box = levels.getBoundingClientRect();
  var visible = Math.min(root.bottom, box.bottom) - Math.max(root.top, box.top);
  var ratio = box.height ? Math.max(0, visible) / box.height : 0;
  var hideCue = screen.scrollTop > 1 || mobileWelcomeScrollActive
    || screen.classList.contains('is-auto-scrolling')
    || screen.classList.contains('is-auto-settled')
    || raw > 0.02;
  if(cue){
    cue.classList.toggle('is-hidden', hideCue);
    cue.setAttribute('aria-hidden', hideCue ? 'true' : 'false');
    if(hideCue) cue.setAttribute('tabindex', '-1');
    else cue.removeAttribute('tabindex');
  }
  levels.classList.toggle('is-in', ratio >= 0.22 || raw > 0.18);
  if(ratio >= 0.48 || raw > 0.52) playHandleCue();
}
function playHandleCue(){
  if(ST.handleCuePlayed) return;
  var root = document.getElementById('levelSpectrum');
  if(!root) return;
  ST.handleCuePlayed = true;
  if(prefersReducedMotion()) return;
  root.classList.add('is-cue');
  window.setTimeout(function(){ root.classList.remove('is-cue'); }, 760);
}
function bindEntryPage(screen){
  unbindEntryPage();
  var cue = document.getElementById('cafeScrollCue');
  var levels = document.getElementById('cafeLevels');
  var focus = document.getElementById('cafeLevelsFocus');
  if(!cue || !levels || !focus) return;

  sizeEntryWelcome(screen);
  var shouldAutoProgress = !ST.welcomePlayed;
  ST.welcomePlayed = true;
  var welcome = screen.querySelector('.cafe-welcome');
  /* Returning from a later Café state: the header already carries the mark and
     the Welcome is a settled page. The opening plays once per fresh entry. */
  if(!shouldAutoProgress){
    paintWelcomeHeaderMark();
    welcomeAnimPaint(document.getElementById('cafeHeroFly'), welcomeAnimTotal());
    setWelcomeMarkScale(welcomeAnimTotal());
  } else if(welcome){
    primeCafeWelcomeGesture(welcome);
  }

  function startGuidedScroll(){
    cancelMobileWelcomeProgression();
    screen.classList.remove('is-user-controlling');
    var target = cafeLevelScrollTarget(screen, levels);
    var start = screen.scrollTop;
    var distance = target - start;
    if(Math.abs(distance) < 2) return;
    var reduced = prefersReducedMotion();
    var duration = reduced ? 180 : 675;
    var started = performance.now();
    mobileWelcomeScrollActive = true;
    screen.classList.add('is-auto-scrolling');
    syncEntryChoreography(screen);
    function step(now){
      if(!mobileWelcomeScrollActive) return;
      var t = Math.max(0, Math.min(1, (now - started) / duration));
      var eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      screen.scrollTop = start + distance * eased;
      if(t < 1){
        mobileWelcomeScrollRaf = requestAnimationFrame(step);
      } else {
        mobileWelcomeScrollRaf = 0;
        mobileWelcomeScrollActive = false;
        screen.scrollTop = target;
        screen.classList.remove('is-auto-scrolling');
        screen.classList.add('is-auto-settled');
        syncEntryChoreography(screen);
      }
    }
    mobileWelcomeScrollRaf = requestAnimationFrame(step);
  }

  var welcomeHoldCancelled = false;
  function stopForUserInput(e){
    if(e && cue && (e.target === cue || cue.contains(e.target))) return;
    welcomeHoldCancelled = true;
    cancelMobileWelcomeProgression(true);
    /* Never trap the student behind the animation: run it out at speed and
       bring the copy in, then hand control over. */
    finishCafeWelcomeGesture();
  }

  cue.addEventListener('click', function(){
    finishCafeWelcomeGesture();
    startGuidedScroll();
  });

  bindSpectrum(screen);
  syncSpecInsetButton();
  syncEntryChoreography(screen);
  entryOnScroll = function(){ syncEntryChoreography(screen); };
  screen.addEventListener('scroll', entryOnScroll, {passive:true});
  screen.addEventListener('touchstart', stopForUserInput, {passive:true});
  screen.addEventListener('pointerdown', stopForUserInput, {passive:true});
  screen.addEventListener('wheel', stopForUserInput, {passive:true});
  document.addEventListener('keydown', stopForUserInput, true);
  entryCleanup.push(function(){
    screen.removeEventListener('touchstart', stopForUserInput);
    screen.removeEventListener('pointerdown', stopForUserInput);
    screen.removeEventListener('wheel', stopForUserInput);
    document.removeEventListener('keydown', stopForUserInput, true);
  });
  if(shouldAutoProgress && prefersReducedMotion()){
    settleCafeWelcomeGesture(welcome);
  } else if(shouldAutoProgress){
    entryCleanup.push(function(){ welcomeHoldCancelled = true; });
    entryCleanup.push(cancelWelcomeAnim);
    afterMobileWelcomeReady(welcome, function(){
      if(welcomeHoldCancelled || !screen.isConnected || !screen.classList.contains('is-entry')) return;
      /* The animation and the hold that follows it start together, so the
         scroll can never begin before the mark has finished and been read. */
      playCafeWelcomeGesture(welcome);
      mobileWelcomeTimer = window.setTimeout(function(){
        mobileWelcomeTimer = 0;
        if(welcomeHoldCancelled) return;
        startGuidedScroll();
      }, welcomeProgressDelay());
    });
  }
  var onWinResize = function(){
    sizeEntryWelcome(screen);
    syncEntryChoreography(screen);
  };
  window.addEventListener('resize', onWinResize);
  entryCleanup.push(function(){ window.removeEventListener('resize', onWinResize); });
  entryIo = new IntersectionObserver(function(){
    syncEntryChoreography(screen);
  }, {root:screen, threshold:[0, 0.08, 0.18, 0.22, 0.32, 0.45, 0.6, 0.8]});
  entryIo.observe(levels);
}


/* =========================================================================
   2 · A/V CHECK  —  before matching, on every Café entry
   Gym A/V block as-is: self-view, Camera / Mic / Blur, live mic echo rings.
   Device choice and an optional playback test live in a settings sheet,
   reached from one quiet affordance — not stacked cards on the happy path.
   ========================================================================= */
function permHelper(){
  if(ST.perm === 'needed'){
    return '<button type="button" class="av-perm av-perm-needed" onclick="setPerm(\'granted\')">'
      + 'To join a Caf\u00e9 chat, allow camera and microphone access.</button>';
  }
  if(ST.perm === 'blocked'){
    return '<div class="av-perm av-perm-blocked" role="status">'
      + '<span class="av-perm-mark" aria-hidden="true"></span>'
      + '<div class="av-perm-copy"><p>Camera and microphone access is required to talk in Caf\u00e9. '
      + 'Enable them for this site in your <button type="button" class="av-perm-retry" onclick="setPerm(\'granted\')">browser or site settings</button>.</p></div>'
      + '</div>';
  }
  return '';
}

/* idle -> recording -> ready -> playing. Optional, and only inside the sheet. */
function micTest(){
  var m = ST.mic, title, sub, btn, extra = '';
  if(m.phase === 'recording'){
    title = 'Listening\u2026';
    sub = GM.wave(0, true, 'is-rec');
    btn = '<button class="gm-playbtn" type="button" onclick="micStop()" aria-label="Stop">' + GM.I.pause + '</button>';
    extra = '<span class="mt-count">' + m.left + 's</span>';
  } else if(m.phase === 'playing'){
    title = 'Playing back\u2026';
    sub = GM.wave(m.pos / MIC_LEN, true);
    btn = '<button class="gm-playbtn" type="button" onclick="micPause()" aria-label="Pause">' + GM.I.pause + '</button>';
    extra = '<button class="mic-redo" type="button" onclick="micRecord()">Redo</button>';
  } else if(m.phase === 'ready'){
    title = 'Hear yourself';
    sub = '<span class="av-row-sub">Check the volume sounds right</span>';
    btn = '<button class="gm-playbtn" type="button" onclick="micPlay()" aria-label="Play back">' + GM.I.play + '</button>';
    extra = '<button class="mic-redo" type="button" onclick="micRecord()">Redo</button>';
  } else {
    title = 'Test your mic';
    sub = '<span class="av-row-sub">Say something and hear it back</span>';
    btn = '<button class="gm-playbtn" type="button" onclick="micRecord()" aria-label="Test your mic">' + GM.I.mic + '</button>';
  }
  return '<div class="av-row mic-test' + (m.phase === 'idle' ? '' : ' is-live') + '">'
    + btn
    + '<span class="av-row-copy"><span class="av-row-title">' + title + '</span>' + sub + '</span>'
    + extra
    + '</div>';
}

function avSettingsLink(){
  return '<button type="button" class="av-settings" onclick="openDevices()">'
    + 'Audio &amp; camera settings'
    + '<span class="chev" aria-hidden="true">' + GM.I.chevRt + '</span>'
    + '</button>';
}
function deviceDropdown(key){
  var d = DEVICES[key];
  var open = ST.devMenu === key;
  var opts = '';
  d.options.forEach(function(o){
    opts += '<button type="button" class="dev-dd-opt' + (o === d.value ? ' is-on' : '') + '"'
      + ' role="option" aria-selected="' + (o === d.value ? 'true' : 'false') + '"'
      + ' onclick="pickDevice(\'' + key + '\',\'' + o.replace(/'/g,"\\'") + '\')">'
      + GM.esc(o) + '</button>';
  });
  return '<div class="dev-group">'
    + '<span class="dev-group-label" id="devLbl-' + key + '">' + GM.esc(d.label) + '</span>'
    + '<div class="dev-dd' + (open ? ' is-open' : '') + '">'
      + '<button type="button" class="dev-dd-btn" aria-haspopup="listbox"'
      + ' aria-expanded="' + (open ? 'true' : 'false') + '"'
      + ' aria-labelledby="devLbl-' + key + '"'
      + ' onclick="toggleDevMenu(\'' + key + '\')">'
      + '<span>' + GM.esc(d.value) + '</span>'
      + '<span class="chev" aria-hidden="true">' + GM.I.chevRt + '</span>'
      + '</button>'
      + (open ? '<div class="dev-dd-menu" role="listbox">' + opts + '</div>' : '')
    + '</div>'
  + '</div>';
}

function devicesSheet(){
  var body = '<h4>Audio &amp; camera settings</h4>'
    + '<div class="dev-grid">'
    + deviceDropdown('camera')
    + deviceDropdown('mic')
    + deviceDropdown('output')
    + '<div class="dev-group dev-test"><span class="dev-group-label">Microphone test</span>' + micTest() + '</div>'
    + '</div>';
  return GM.sheet({
    milky:true,
    cls:'dev-sheet',
    onScrim:'closeDevices()',
    body:body,
    acts:'<button class="btn primary" type="button" onclick="closeDevices()">Done</button>'
  });
}

function screenAvCheck(){
  var liveMic = (ST.perm === 'granted' && !ST.micOff);
  return '<div class="transition-shell"></div>'
    + cafeLockup()
    + chromeBackBtn('goBackFromAvCheck()', 'Back to partner levels')
    + '<button type="button" class="search-close" onclick="leaveCafeHome()"'
      + ' aria-label="Close Café and return home">' + GM.I.x + '</button>'
    + '<main class="av-canon cafe-av">'
      + '<header class="av-head"><h2>Check your setup</h2></header>'
      + '<section class="av-card" aria-label="Camera and microphone check"><div class="av-stage">'
        + GM.preview({camOff:ST.camOff, blur:ST.blur, img:IMG_YOU, label:'You'})
        + GM.avTools(ST, {cam:'toggleCam()', mic:'toggleMic()', blur:'toggleBlur()',
                          echo:liveMic})
      + '</div></section>'
      + permHelper()
      + '<footer class="av-foot">'
        + avSettingsLink()
        + '<button class="primary-cta" type="button" onclick="startMatching()"'
          + (ST.perm === 'granted' ? '' : ' disabled') + '>Start matching</button>'
      + '</footer>'
    + '</main>'
    + (ST.devSheet ? devicesSheet() : '');
}


/* =========================================================================
   3 · ACTIVE SEARCHING  (+ the persistent indicator over a placeholder Hub)
   Not a waiting room, and not a pre-call lobby either: the camera is off here.
   A/V readiness was settled before the student joined the queue.
   ========================================================================= */
function levelsSheet(){
  return GM.sheet({
    milky:true,
    cls:'levels-sheet',
    onScrim:'dismissLevels()',
    body:'<h4 id="cafeLevelsHeading">Choose partner levels</h4>'
      + '<p class="pool-line">Adding more levels may help you match faster.</p>'
      + levelSpectrum(),
    acts:'<button class="btn primary" type="button" onclick="applyLevels()">Keep searching</button>'
  });
}
/* Ambient dotted globe — the Citizen Café map. Presence is yellow pins;
   a couple of them briefly bloom into a face, then recede. Scan is thin
   cream arcs that fade in and out as they travel, never a hard line.

   Restore checkpoint: search-scan-canonical */
function searchMap(){
  var faces = {
    2:'../student-main-classroom-desktop/assets/dana.png',
    5:'../student-main-classroom-desktop/assets/teacher-yael.png'
  };
  var pins = [
    [48, 42], [50, 28], [36, 70], [24, 42], [72, 30], [18, 48]
  ];
  var pinHtml = pins.map(function(p, i){
    var n = i + 1;
    var face = faces[n];
    return '<span class="search-pin p' + n + (face ? ' has-face' : '')
      + '" style="left:' + p[0] + '%;top:' + p[1] + '%">'
      + '<span class="pin-dot"></span>'
      + (face ? '<span class="pin-face"><img src="' + face + '" alt=""></span>' : '')
      + '</span>';
  }).join('');
  return '<div class="search-map-bleed" aria-hidden="true">'
    + '<div class="search-map">'
    + '<img class="search-map-art" src="World map.svg" alt="">'
    + '<svg class="search-echoes" viewBox="0 0 616 275" focusable="false">'
      + '<defs><linearGradient id="echoFade" x1="0" y1="0" x2="1" y2="0">'
        + '<stop offset="0" stop-color="#F7F6EF" stop-opacity="0"/>'
        + '<stop offset=".16" stop-color="#F7F6EF" stop-opacity=".5"/>'
        + '<stop offset=".5" stop-color="#F7F6EF" stop-opacity=".85"/>'
        + '<stop offset=".84" stop-color="#F7F6EF" stop-opacity=".5"/>'
        + '<stop offset="1" stop-color="#F7F6EF" stop-opacity="0"/>'
      + '</linearGradient></defs>'
      + '<path class="search-echo" d="M36 232 A 290 78 0 0 1 580 232"/>'
      + '<path class="search-echo e2" d="M22 236 A 298 102 0 0 1 594 236"/>'
      + '<path class="search-echo e3" d="M48 228 A 284 62 0 0 1 568 228"/>'
      + '<path class="search-echo e4" d="M16 240 A 302 118 0 0 1 600 240"/>'
      + '<path class="search-echo e5" d="M42 234 A 288 88 0 0 1 574 234"/>'
    + '</svg>'
    + pinHtml
    + '</div>'
  + '</div>';
}

function searchScopeLine(){
  var n = ST.selected.length;
  var meta = n <= 1 ? 'Matching with: My level only' : ('Matching across ' + n + ' levels');
  return '<p class="search-summary">'
    + '<span>' + meta + '</span>'
    + '<span class="search-summary-sep" aria-hidden="true">\u00b7</span>'
    + '<button type="button" class="edit" onclick="openLevels()">Edit levels</button>'
    + '</p>';
}
function searchPracticeBtn(){
  return '<button type="button" class="wait-practice" onclick="openFlashcards()">'
    + '<span class="wp-icon" aria-hidden="true">' + cafeCardsIcon() + '</span>'
    + '<span class="wp-copy">'
      + '<span class="wp-kicker">While you wait</span>'
      + '<span class="wp-title">Practice flashcards</span>'
    + '</span>'
    + '<span class="chev" aria-hidden="true">' + GM.I.chevRt + '</span>'
    + '</button>';
}
function searchSupportCopy(){
  return '<p class="search-support" aria-live="polite">' + SEARCH_COPY + '</p>';
}
function searchActionRail(){
  return '<div class="search-actions" id="searchActions">'
    + searchPracticeBtn()
    + '</div>';
}
function chromeBackBtn(onclick, label){
  return '<button type="button" class="search-back" onclick="' + onclick + '"'
    + ' aria-label="' + label + '">' + GM.I.chevLt + '</button>';
}
function searchBackBtn(){
  return chromeBackBtn('goBackFromSearch()', 'Back to camera and microphone check');
}
function searchCloseBtn(){
  return '<button type="button" class="search-close" id="searchClose"'
    + ' aria-label="Close matching" aria-haspopup="dialog" aria-controls="searchClosePop"'
    + ' aria-expanded="' + (ST.closeSheet ? 'true' : 'false') + '"'
    + ' onclick="openCloseDecision()">' + GM.I.x + '</button>';
}
function closeDecisionMarkup(){
  var html = GM.sheet({
    milky:true,
    cls:'search-close-sheet',
    onScrim:'dismissCloseDecision()',
    body:'<h4 id="searchCloseTitle">What would you like to do?</h4>'
      + '<p id="searchCloseBody">We can keep looking while you explore the Hub, or stop matching altogether.</p>',
    acts:'<button class="btn primary" type="button" onclick="keepMatchingExplore()">Keep matching</button>'
      + '<button class="btn" type="button" onclick="stopMatching()">Stop matching</button>'
      + '<button class="btn search-close-cancel" type="button" onclick="dismissCloseDecision()">Cancel</button>'
  });
  return html.replace('role="dialog"', 'id="searchClosePop" role="dialog" aria-labelledby="searchCloseTitle" aria-describedby="searchCloseBody"');
}
function screenSearching(){
  return '<div class="transition-shell"></div>'
    + cafeLockup()
    + searchBackBtn()
    + searchCloseBtn()
    + '<main class="cafe-stage searching-stage">'
      + '<div class="search-hero">'
        + '<div class="search-stack">'
          + searchMap()
          + '<div class="search-status">'
            + '<h2 class="cafe-display">Looking for a partner\u2026</h2>'
            + searchSupportCopy()
          + '</div>'
          + searchScopeLine()
          + searchActionRail()
        + '</div>'
      + '</div>'
    + '</main>'
    + (ST.levelsSheet ? levelsSheet() : '')
    + (ST.closeSheet ? closeDecisionMarkup() : '');
}

/* Optional practice. Matching is visibly still running at the top, and a match
   interrupts this screen exactly as it interrupts the Hub. */
function screenFlashcards(){
  var card = DECK[((ST.card % DECK.length) + DECK.length) % DECK.length];
  return '<div class="transition-shell"></div>'
    + '<div class="fc-screen">'
      + '<div class="fc-top">'
        + '<button class="icon-btn" type="button" onclick="closeFlashcards()" aria-label="Back to searching">' + GM.I.x + '</button>'
        + '<span class="fc-status"><span class="mi-dot" aria-hidden="true"></span>Still looking for a partner\u2026</span>'
      + '</div>'
      + GM.flashcard(card,
          {revealed:ST.cardRevealed, marked:ST.cardMarked, playing:ST.cardPlaying},
          {flip:'cardFlip()', mark:'cardMark()', play:'cardPlay()',
           prev:'cardPrev()', next:'cardNext()', reveal:'cardReveal()'})
    + '</div>';
}

/* The indicator is the whole point of this screen. The grey field behind it is
   an explicit placeholder: the Hub is not designed in this pass. */
function matchIndicator(){
  return '<button type="button" class="match-indicator" onclick="openSearch()">'
    + '<span class="mi-dot" aria-hidden="true"></span>'
    + '<span class="mi-copy">'
      + '<span class="mi-title">Caf\u00e9</span>'
      + '<span class="mi-line">Finding your Caf\u00e9 partner...</span>'
    + '</span>'
    + '<span class="mi-chev" aria-hidden="true">' + GM.I.chevRt + '</span>'
    + '</button>';
}
function screenHub(){
  return '<div class="hub-mock">'
      + '<div class="hub-stamp">Hub \u2014 placeholder, not designed in this pass</div>'
      + '<div class="hub-blocks"><i></i><i></i><i></i><i></i></div>'
      + '<div class="hub-tabbar"><i></i><i></i><i></i><i></i></div>'
    + '</div>'
    + (ST.matching ? matchIndicator() : '');
}


/* =========================================================================
   4 · MATCH FOUND  —  a celebratory full-screen takeover
   Gym ending confetti (shapes, colors, motion) burst around the partner card.
   ========================================================================= */
function matchCupIcon(){
  return '<img class="ice-cup" src="assets/cafe-cup-icon.png" alt="" aria-hidden="true">';
}
function matchLevelFact(id){
  var meta = GM.levelMeta(id);
  var icon = LEVEL_ICONS[id]
    ? '<img class="fact-ico" src="' + LEVEL_ICONS[id] + '" alt="" aria-hidden="true">'
    : GM.levelDot(id);
  return '<span class="fact fact-level">'
    + icon + GM.esc(meta.label) + '</span>';
}

/* Gym completion confetti: same pieces, ink, spin, and fall as the Ending
   Done burst. Origins are shifted around the partner card instead of a badge. */
function matchConfetti(){
  var C = '#373230';
  var colors = ['#F9E24C','#FFE300','#F69700','#F9746B','#90C7FC','#449CFC','#DAEF81','#7EE07C','#6D8C58','#6BBFC4','#8B90FF','#CEB1FF'];
  var nextKind = {stroke:'circ', circ:'dia', dia:'stroke'};
  function ink(fill){
    return 'fill="'+fill+'" stroke="'+C+'" stroke-width="0.5" vector-effect="non-scaling-stroke"';
  }
  function shape(kind, fill){
    var a = ink(fill);
    if(kind === 'stroke') return '<svg viewBox="0 0 16 6" aria-hidden="true"><rect x="1.2" y="1.9" width="13.6" height="2.2" rx="1.1" '+a+'/></svg>';
    if(kind === 'circ') return '<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3.55" '+a+'/></svg>';
    return '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.2 L8.8 5 L5 8.8 L1.2 5 Z" '+a+'/></svg>';
  }
  function spin(x,y,deg){
    var r = deg * Math.PI / 180;
    return [Math.round(x*Math.cos(r)-y*Math.sin(r)), Math.round(x*Math.sin(r)+y*Math.cos(r))];
  }
  var bits = [
    {k:'stroke',dx:-80,dy:-92,ex:-122,ey:28,rot0:-16,rot:-38,rot2:18,sc:1.08,s:22,d:.22,dur:2.72},
    {k:'circ',dx:16,dy:-124,ex:48,ey:-40,rot0:8,rot:26,rot2:54,sc:.92,s:13,d:.28,dur:3.08},
    {k:'dia',dx:98,dy:-68,ex:154,ey:36,rot0:18,rot:42,rot2:78,sc:1,s:14,d:.24,dur:2.58},
    {k:'circ',dx:-40,dy:-108,ex:-28,ey:52,rot0:-10,rot:16,rot2:50,sc:1.12,s:16,d:.31,dur:3.18},
    {k:'stroke',dx:114,dy:-30,ex:168,ey:44,rot0:12,rot:34,rot2:14,sc:.95,s:20,d:.26,dur:2.84},
    {k:'dia',dx:-118,dy:-46,ex:-164,ey:22,rot0:-22,rot:-14,rot2:28,sc:1,s:13,d:.34,dur:2.66},
    {k:'circ',dx:56,dy:-96,ex:92,ey:-8,rot0:6,rot:-22,rot2:16,sc:.86,s:12,d:.38,dur:2.48},
    {k:'dia',dx:-12,dy:-120,ex:36,ey:48,rot0:14,rot:32,rot2:64,sc:1.18,s:17,d:.25,dur:3.24},
    {k:'stroke',dx:44,dy:-36,ex:18,ey:56,rot0:-8,rot:18,rot2:48,sc:1,s:21,d:.4,dur:2.76},
    {k:'circ',dx:-72,dy:-80,ex:-118,ey:40,rot0:-14,rot:8,rot2:42,sc:.9,s:15,d:.33,dur:2.96},
    {k:'stroke',dx:8,dy:-62,ex:-42,ey:50,rot0:10,rot:-24,rot2:22,sc:1.05,s:19,d:.29,dur:2.88},
    {k:'dia',dx:78,dy:-116,ex:126,ey:-22,rot0:20,rot:48,rot2:34,sc:.88,s:13,d:.36,dur:3.02}
  ];
  var pieces = [], i, b, p, q;
  for(i=0;i<bits.length;i++){
    b = bits[i];
    pieces.push({k:b.k,dx:b.dx,dy:b.dy,ex:b.ex,ey:b.ey,rot0:b.rot0,rot:b.rot,rot2:b.rot2,sc:b.sc,s:b.s,d:b.d,dur:b.dur,fill:colors[i%colors.length]});
    p = spin(b.dx,b.dy,i%2?124:-132);
    q = spin(b.ex,b.ey,i%2?124:-132);
    pieces.push({
      k:nextKind[b.k],dx:Math.round(p[0]*.88),dy:Math.round(p[1]*.88),
      ex:Math.round(q[0]*.9),ey:Math.round(q[1]*.9+22),
      rot0:b.rot0+(i%2?26:-26),rot:b.rot+(i%2?-22:22),rot2:b.rot2+34,
      sc:b.sc,s:Math.max(11,b.s-3),d:+(b.d+.07).toFixed(2),dur:+(b.dur+.22).toFixed(2),fill:colors[(i+4)%colors.length]
    });
    p = spin(b.dx,b.dy,i%3?228:-214);
    q = spin(b.ex,b.ey,i%3?228:-214);
    pieces.push({
      k:nextKind[nextKind[b.k]],dx:Math.round(p[0]*.78),dy:Math.round(p[1]*.78),
      ex:Math.round(q[0]*.82),ey:Math.round(q[1]*.82+28),
      rot0:b.rot0+(i%2?-18:20),rot:b.rot+(i%2?16:-28),rot2:b.rot2-12,
      sc:+(b.sc*.82).toFixed(2),s:Math.max(10,b.s-5),d:+(b.d+.11).toFixed(2),dur:+(b.dur+.34).toFixed(2),fill:colors[(i+7)%colors.length]
    });
  }
  var origins = [
    {ox:-22,oy:10},{ox:26,oy:-14},{ox:-8,oy:18},{ox:16,oy:6},
    {ox:-28,oy:-6},{ox:8,oy:22},{ox:32,oy:4},{ox:-14,oy:-18}
  ];
  var html = '<span class="match-confetti" aria-hidden="true">';
  var burst = 2.35;
  for(i=0;i<pieces.length;i++){
    b = pieces[i];
    var o = origins[i % origins.length];
    var jx = (i % 5) - 2;
    var jy = (i % 3) - 1;
    var ox = o.ox + jx * 7;
    var oy = o.oy + jy * 9;
    var dx = Math.round(b.dx*burst), dy = Math.round(b.dy*burst);
    var ex = Math.round(b.ex*burst), ey = Math.round(b.ey*burst);
    var mx = Math.round(dx+(ex-dx)*.62), my = Math.round(dy+(ey-dy)*.62);
    var vx = Math.round(dx+(ex-dx)*.84), vy = Math.round(dy+(ey-dy)*.84);
    var lx = Math.round(ex+(i%2?16:-22)), ly = Math.round(ey+(i%2?28:-12)+(i%5)*6);
    var rotm = Math.round(b.rot+(b.rot2-b.rot)*.62), rotv = Math.round(b.rot+(b.rot2-b.rot)*.84);
    html += '<span class="match-cf" style="'
      + '--ox:'+ox+'px;--oy:'+oy+'px;'
      + '--dx:'+dx+'px;--dy:'+dy+'px;--mx:'+mx+'px;--my:'+my+'px;'
      + '--vx:'+vx+'px;--vy:'+vy+'px;--lx:'+lx+'px;--ly:'+ly+'px;'
      + '--rot0:'+b.rot0+'deg;--rot:'+b.rot+'deg;--rotm:'+rotm+'deg;--rotv:'+rotv+'deg;'
      + '--rotl:'+(b.rot2+(i%2?16:-14))+'deg;--sc:'+b.sc+';--s:'+Math.max(9, Math.round(b.s*.78))+'px;--d:'+b.d+'s;--dur:'+b.dur+'s">'
      + shape(b.k, b.fill) + '</span>';
  }
  return html + '</span>';
}

function matchSheet(){
  var accepted = (ST.matchPhase === 'accepted');
  var low = ST.offerLeft <= 10;
  var enter = ST.matchEnter ? ' is-enter' : '';

  var card = '<div class="match-card' + (accepted?' is-waiting':'') + '">'
    + '<img class="match-card-deco" src="assets/match-card-deco.png" alt="" aria-hidden="true">'
    + '<div class="match-intro">'
      + '<span class="match-photo"><img src="' + PARTNER.img + '" alt="' + GM.esc(PARTNER.name) + '"></span>'
      + '<div class="match-who">'
        + '<h4 class="match-name">' + GM.esc(PARTNER.name) + '</h4>'
        + '<div class="match-facts">'
          + matchLevelFact(PARTNER.level)
          + '<span class="fact fact-place"><img class="fact-pin" src="' + IMG_PIN + '" alt="" aria-hidden="true">' + GM.esc(PARTNER.location) + '</span>'
        + '</div>'
      + '</div>'
    + '</div>'
    + '<div class="ice">'
      + '<span class="ice-label">' + matchCupIcon() + '<span>' + GM.esc(PARTNER.ice.label) + '</span></span>'
      + '<span class="ice-text">' + GM.esc(PARTNER.ice.text) + '</span>'
    + '</div>'
    + (accepted
        ? '<div class="match-waiting">'
          + '<p class="mw-line">Waiting for ' + GM.esc(PARTNER.name) + ' to confirm\u2026</p>'
          + GM.loadLine()
          + '</div>'
        : '')
    + '</div>';

  var acts = accepted
    ? '<button class="btn match-keep" type="button" onclick="declineMatch()">Keep looking instead</button>'
    : '<button class="btn primary" type="button" onclick="acceptMatch()">Meet ' + GM.esc(PARTNER.name) + '</button>'
      + '<button class="btn match-keep" type="button" onclick="declineMatch()">Keep looking</button>';

  var footer = accepted ? ''
    : '<div class="match-timer' + (low?' is-low':'') + '">'
      + '<span class="match-timer-num" id="offerNum">' + ST.offerLeft + 's</span>'
      + '<div class="respline"><i style="animation-duration:' + ST.offerLeft + 's"></i></div>'
    + '</div>';

  return '<div class="match-takeover' + enter + '" id="matchTakeover" role="dialog" aria-modal="true" aria-labelledby="matchHeadline">'
    + '<div class="match-scrim"></div>'
    + '<div class="match-stage">'
      + '<h4 class="match-headline" id="matchHeadline"><span class="match-kicker">Congratulations!</span>We found you a <i>Caf\u00e9</i> partner</h4>'
      + '<div class="match-card-wrap">'
        + (ST.matchEnter ? matchConfetti() : '')
        + card
      + '</div>'
      + '<div class="match-acts">' + acts + '</div>'
      + footer
    + '</div>'
  + '</div>';
}
/* The match lands on top of whatever the student was doing — the Hub, the
   search screen, or a flashcard mid-deck. Searching stays visible behind. */
function screenMatched(){
  var behind = screenHub();
  if(ST.bg === 'searching') behind = screenSearching();
  else if(ST.bg === 'flashcards') behind = screenFlashcards();
  return '<div class="match-behind" inert aria-hidden="true">' + behind + '</div>' + matchSheet();
}


/* =========================================================================
   5 · SESSION AGREEMENT  —  both sides accepted
   A/V was settled before matching, so this leads straight into the chat.
   Principles are statements, not tasks. One acknowledgement enables the CTA.
   ========================================================================= */
function agreeIcon(kind){
  var src = {
    hebrew:'assets/agree-hebrew.png?v=4',
    present:'assets/agree-clock.png?v=6',
    kind:'assets/agree-hearts.png?v=4'
  }[kind];
  if(!src) return '';
  return '<span class="agree-mark" aria-hidden="true"><img src="' + src + '" alt=""></span>';
}
function screenAgreement(){
  var list = '';
  AGREEMENT_TERMS.forEach(function(t){
    list += '<li>'
      + agreeIcon(t.icon)
      + '<span class="agree-copy"><span class="agree-lead">' + GM.esc(t.lead) + '</span>'
      + '<span class="agree-support">' + GM.esc(t.support) + '</span></span>'
    + '</li>';
  });
  var ack = '<label class="agree-ack' + (ST.agreed?' is-on':'') + '">'
      + '<input id="agreeAck" class="agree-ack-input" type="checkbox"'
        + (ST.agreed?' checked':'') + ' onchange="onAgreeAck(this)">'
      + '<span class="agree-check" aria-hidden="true"><span class="agree-box"></span></span>'
      + '<span class="agree-ack-copy">100% agree</span>'
    + '</label>';
  var back = '<button type="button" class="agree-back" onclick="backFromAgreement()"'
    + ' aria-label="Back to partner">' + GM.I.chevLt + '</button>';
  return '<div class="transition-shell"></div>'
    + cafeLockup('with ' + PARTNER.name)
    + GM.sheet({
        milky:true,
        cls:'agree-sheet',
        body:'<div class="agree-head">'
          + back
          + '<h4>Before jumping into the Caf\u00e9\u2026</h4>'
          + '</div>'
          + '<p class="agree-intro">Here\u2019s what we\u2019re both agreeing to:</p>'
          + '<ul class="agree-list">' + list + '</ul>'
          + ack,
        acts:'<button class="btn primary" id="agreeCta" type="button" onclick="enterCafe()"'
          + (ST.agreed?'':' disabled') + '>Yalla, Caf\u00e9 time!</button>'
      });
}


/* =========================================================================
   6 · LIVE CAFE  —  the Gym Practice Room mobile shell
   Conversation-support tools lead the dock; device controls follow the divider.
   Topics opens the approved Topics wheel (CafeTopicsWheel, below); Practice is an
   entry point only in this pass.
   ========================================================================= */
/* Gym Main Room chat — overlay on the live video, composer above the dock.
   Visual language is copied from student-main-classroom-mobile; Café keeps
   the Practice Room dock (Topics / Practice / Text / Camera / Mic). */
var CAFE_CHAT_HALO = {
  Yellow:'#DAEF81', 'Light Blue':'#90C7FC', Green:'#DAEF81', Orange:'#F69700',
  Blue:'#90C7FC', Pink:'#F7AAF3', Red:'#F9746B', Turquoise:'#6BBEC4'
};
function cafeChatSeed(){
  return [
    {sender:'classmate', name:PARTNER.name, level:PARTNER.level, text:'Want to try ordering in Hebrew first?'},
    {sender:'own', name:'You', text:'Yes \u2014 I\u2019ll ask for a coffee.'}
  ];
}
function cafeMsgSamePerson(a, b){
  if(!a || !b) return false;
  return (a.sender||'') === (b.sender||'') && (a.name||'') === (b.name||'');
}
function cafeMsgIsLead(i){
  var msgs = ST.textLog || [];
  return i === 0 || !cafeMsgSamePerson(msgs[i], msgs[i-1]);
}
function renderCafeMsg(m, opts){
  opts = opts || {};
  var own = (m.sender === 'own');
  var helper = (m.sender === 'helper');
  var teacher = (m.sender === 'teacher');
  var expanded = !!opts.expanded;
  var isLead = (opts.isLead !== undefined) ? opts.isLead : true;
  var cls = 'mo' + (helper?' is-helper':'') + (teacher?' is-teacher':'') + (own?' is-own':'')
    + (expanded ? (isLead?' has-av':' cont') : '');
  var nm = own ? 'You' : (helper ? (m.name === 'Helper' || m.name === 'helper' ? 'Helper' : GM.esc(m.name) + ' \u00B7 Helper') : GM.esc(m.name));
  var body = m.reply
    ? '<div class="reply-group"><div class="quote"><span class="qn">' + GM.esc(m.reply.name) + '</span> ' + GM.esc(m.reply.text) + '</div><div class="tx">' + GM.esc(m.text) + '</div></div>'
    : '<div class="tx">' + GM.esc(m.text) + '</div>';
  var haloCol = m.level ? CAFE_CHAT_HALO[m.level] : (own ? CAFE_CHAT_HALO.Green : null);
  var av = (haloCol ? '<span class="av-halo" style="background:' + haloCol + '" aria-hidden="true"></span>' : '')
    + '<span class="av-face">' + GM.esc(GM.initial(m.name)) + '</span>';
  var avInner = (expanded && isLead) ? ('<span class="av">' + av + '</span>') : '';
  return '<div class="' + cls + '"><div class="av-gutter">' + avInner + '</div><div class="bd"><div class="nm">' + nm + '</div>' + body + '</div></div>';
}
function cafeChatOverlay(){
  var expanded = !!ST.chatExpanded;
  var msgs = ST.textLog || [];
  var html = '';
  if(expanded){
    msgs.forEach(function(m, i){ html += renderCafeMsg(m, {expanded:true, isLead:cafeMsgIsLead(i)}); });
  } else {
    msgs.slice(-3).forEach(function(m){ html += renderCafeMsg(m, {expanded:false}); });
  }
  return '<div class="cafe-chat-overlay ' + (expanded?'is-expanded':'is-compact') + '" id="ovl" aria-label="Chat">'
    + '<button type="button" class="chat-grow" onclick="toggleChatExpand()" aria-label="' + (expanded?'Collapse chat':'Expand chat') + '">'
    + (expanded ? GM.I.chevDn : GM.I.chevUp) + '</button>'
    + '<div class="chat-history" id="cafeChatHistory">'
    + '<div class="chat-stack" id="cafeChatStack">' + html + '</div>'
    + '</div></div>';
}
function cafeComposer(){
  var draft = ST.textDraft || '';
  var active = draft.trim() ? ' active' : '';
  return '<div class="cafe-composer">'
    + '<div class="footer-capsule">'
    + '<div class="ask">'
    + '<button class="react-trigger" type="button" aria-label="Reactions">' + GM.I.smiley + '</button>'
    + '<input id="cafeChatInput" class="ph" type="text" placeholder="Message ' + GM.esc(PARTNER.name) + '\u2026" value="' + GM.esc(draft) + '" autocomplete="off" oninput="cafeChatType(this)">'
    + '<button class="send' + active + '" id="cafeChatSend" type="button" onclick="sendText()" aria-label="Send">' + GM.I.sendPlane + '</button>'
    + '</div></div></div>';
}
function leaveSheet(){
  return GM.sheet({
    milky:true,
    onScrim:'closeLeave()',
    body:'<h4>End this Caf\u00e9?</h4>'
      + '<p>If something feels wrong or uncomfortable, you can leave right away \u2014 and let the team know what happened.</p>',
    acts:'<button class="btn danger-soft" type="button" onclick="endSession()">End session</button>'
      + '<button class="btn" type="button" onclick="endSession()">Report an issue</button>'
      + '<button class="btn" type="button" onclick="closeLeave()">Stay</button>'
  });
}
function keepOnSheet(){
  return GM.sheet({
    milky:true,
    cls:'keep-on-sheet',
    onScrim:'closeKeepOn()',
    body:'<h4>Caf\u00e9 needs the camera and mic on to keep going.</h4>'
      + '<p class="keep-on-q">Want to leave the session?</p>',
    acts:'<button class="btn primary" type="button" onclick="closeKeepOn()">Stay</button>'
      + '<button class="btn" type="button" onclick="endSession()">Leave</button>'
  });
}
function partnerOffSheet(){
  return GM.sheet({
    milky:true,
    cls:'partner-off-sheet' + (ST.partnerOffFind?' is-wait':''),
    body:'<h4>' + GM.esc(PARTNER.name) + '\u2019s camera or mic seems to be off.</h4>'
      + '<p>We\u2019ll find you a new partner if they don\u2019t come back soon.</p>'
      + '<div class="po-status" role="status" aria-live="polite">'
        + '<span class="po-spin" aria-hidden="true"></span>'
        + '<span class="po-status-copy">Trying to reconnect\u2026</span>'
      + '</div>'
      + '<div class="po-acts" aria-hidden="' + (ST.partnerOffFind?'false':'true') + '">'
        + '<button class="btn po-find" type="button" onclick="findNewPartner()">Find me a new partner</button>'
      + '</div>'
  });
}
function dockTipHtml(){
  return '<button class="dock-tip" type="button" onclick="dismissDockTip()">'
    + '<span class="dock-tip-copy">Stuck? Lean on the toolbar for topics and exercises</span>'
    + '<span class="dock-tip-arrow" aria-hidden="true"></span>'
    + '</button>';
}
function finalNoteHtml(){
  return '<button class="dock-tip final-note" type="button" onclick="dismissFinalNote()"'
    + ' role="status">'
    + '<span class="dock-tip-copy">20 seconds left in this chat</span>'
    + '</button>';
}
/* ---- Live header: session-exit X + the one session clock ----------------
   The X is the only way out of the session: it opens the Leave & report
   sheet. It is not the wheel's close button (that one lives on the wheel
   layer and only dismisses the wheel). The clock is one element: a small
   top-right readout that turns yellow at sessionFinal and glides to the seam
   between the tiles at sessionCenter, exactly as on desktop. */
var centerClockShown = false;
function cafeRoomHeader(){
  var center = ST.left <= DUR.sessionCenter;
  return '<div class="header-scrim"></div>'
    + '<div class="rheader">'
      + '<button class="icon-btn session-exit" type="button" onclick="openLeave()"'
      + ' aria-label="Leave session" aria-haspopup="dialog">' + GM.I.x + '</button>'
    + '</div>'
    + '<div class="cafe-clock' + (center ? ' is-center' : '') + '" id="cafeClock">'
      + GM.roomTime(ST.left, {cap:'Chat', final:ST.left <= DUR.sessionFinal})
    + '</div>';
}
/* A fresh render that lands inside the last 20s would otherwise draw the
   clock already centred. Replay the glide once, then never again. */
function armCenterClock(){
  if(ST.state !== 'live' || ST.left > DUR.sessionCenter){ centerClockShown = false; return; }
  if(centerClockShown) return;
  var box = document.getElementById('cafeClock');
  if(!box) return;
  centerClockShown = true;
  box.classList.remove('is-center');
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      if(box.isConnected && ST.state === 'live' && ST.left <= DUR.sessionCenter) box.classList.add('is-center');
    });
  });
}

/* ---- Live footer: one row -------------------------------------------------
   Chat / Topics / Practice sit in a compact frosted-glass group; Camera and
   Mic follow in their own charcoal circles. The two circles are positioned
   (not flowed) so that while the wheel is open they can travel to the bottom
   corners with a transition, without ever being re-created. */
function cafeDockItem(it){
  return '<div class="rc-item"><button class="rc-btn' + (it.cls||'') + (it.on?' is-on':'') + (it.off?' is-off':'') + '"'
    + ' type="button" onclick="' + it.onclick + '" aria-label="' + GM.esc(it.aria||it.cap) + '">'
    + it.icon + (it.off?'<span class="slash"></span>':'') + '</button>'
    + '<span class="rc-cap">' + GM.esc(it.cap) + '</span></div>';
}
function camAria(){ return ST.camOff ? 'Turn camera on' : 'Turn camera off'; }
function micAria(){ return ST.micOff ? 'Unmute' : 'Mute'; }
function cafeDock(){
  return '<div class="footer-scrim"></div><div class="rfooter">'
    + '<div class="cafe-dock">'
      + '<div class="rc-tools" role="group" aria-label="Conversation tools">'
        + cafeDockItem({icon:GM.I.chat,  cap:'Chat',     cls:' quiet', on:ST.textOpen, onclick:'toggleText()', aria:'Chat'})
        + cafeDockItem({icon:GM.I.wheel, cap:'Topics',   cls:' emph', onclick:'openWheel()',      aria:'Topics'})
        + cafeDockItem({icon:GM.I.bolt,  cap:'Practice', cls:' emph', onclick:'openChallenge()',  aria:'Practice'})
      + '</div>'
      + '<div class="rc-av rc-av-cam">' + cafeDockItem({icon:GM.I.cam, cap:'Camera', off:ST.camOff, onclick:'toggleCam()', aria:camAria()}) + '</div>'
      + '<div class="rc-av rc-av-mic">' + cafeDockItem({icon:GM.I.mic, cap:'Mic',    off:ST.micOff, onclick:'toggleMic()', aria:micAria()}) + '</div>'
    + '</div></div>';
}
function cafeStage(){
  return '<div class="rstage">'
    + GM.half('top', PARTNER.name, {img:PARTNER.img, camOff:ST.partnerCamOff, micOff:ST.partnerMicOff})
    + GM.half('bottom', 'You', {img:IMG_YOU, camOff:ST.camOff, micOff:ST.micOff})
    + '</div>';
}
/* Camera / Mic change only the tile and the two buttons, so they are patched
   in place. A full render would rebuild the footer under the user's thumb and
   re-attach the wheel layer mid-spin. Returns false when there is nothing to
   patch (any state but Live), and the caller falls back to render(). */
function paintAvButton(btn, off, label){
  if(!btn) return;
  btn.classList.toggle('is-off', off);
  btn.setAttribute('aria-label', label);
  var sl = btn.querySelector('.slash');
  if(off && !sl) btn.insertAdjacentHTML('beforeend', '<span class="slash"></span>');
  if(!off && sl) sl.remove();
}
function syncLiveAV(){
  if(ST.state !== 'live') return false;
  var stage = document.querySelector('#screen .rstage');
  var cam = document.querySelector('#screen .rc-av-cam .rc-btn');
  var mic = document.querySelector('#screen .rc-av-mic .rc-btn');
  if(!stage || !cam || !mic) return false;
  var tmp = document.createElement('div');
  tmp.innerHTML = cafeStage();
  stage.replaceWith(tmp.firstChild);
  paintAvButton(cam, ST.camOff, camAria());
  paintAvButton(mic, ST.micOff, micAria());
  updateNote();
  return true;
}

function screenLive(){
  var dock = cafeDock();
  var sheetOpen = ST.leaveSheet || ST.keepOnSheet || ST.partnerOffSheet;
  var chatOpen = ST.textOpen && !sheetOpen;
  var tip = '';
  if(!sheetOpen && !ST.textOpen){
    if(ST.finalNote) tip = finalNoteHtml();
    else if(ST.dockTip) tip = dockTipHtml();
  }
  if(tip){
    dock = dock.replace('<div class="rfooter">', '<div class="rfooter">' + tip);
  }

  return cafeRoomHeader()
    + cafeStage()
    + (chatOpen ? cafeChatOverlay() : '')
    + dock
    + (chatOpen ? cafeComposer() : '')
    + (ST.leaveSheet ? leaveSheet() : '')
    + (ST.keepOnSheet ? keepOnSheet() : '')
    + (ST.partnerOffSheet ? partnerOffSheet() : '');
}


/* =========================================================================
   6b · TOPICS WHEEL  —  CafeTopicsWheel
   The approved cropped glass wheel (References:topics-wheel), wired to the
   Topics button in the Live dock. It is an overlay layer, not a screen: it
   mounts once inside #screen and is re-attached after every Live render, so
   toggling the camera or mic never tears it down. Everything it owns (DOM,
   listeners, timers, animation frames, Web Animations) is released in
   destroy(), which render() calls as soon as the screen leaves Live.

   Geometry is relative to the bottom-centre of the screen. The wheel is 380px
   across (outer radius 190) and cropped by the bottom edge; its rotation centre
   sits 46px above the bottom safe line. The wheel only ever carries Hebrew: the
   English translation appears in the result strip, never on a wedge. The strip
   sits on the seam between the two videos (50% of the screen height).
   ========================================================================= */
var CafeTopicsWheel = (function(){
  /* ---------- Content: all 31 supplied topics, Hebrew + English (Hebrew only on the wheel) ---------- */
  const TOPICS = [
    ["משהו שחיבר אותי לאנשים שונים","Something that connected me to people from a different background"],
    ["מקרה הזוי שקרה לי","A bizarre incident that happened to me"],
    ["אתגר פיזי או מנטלי קשה","A tough physical or mental challenge"],
    ["ציפייה מוגזמת שהתנפצה","An unrealistic expectation that fell apart"],
    ["הרגל שהייתי רוצה לשנות","An automatic habit I'd like to change"],
    ["אדם יוצא דופן שפגשתי","An exceptional person I met"],
    ["יום שבו הכל היה על הפנים","A day when everything went wrong"],
    ["טעות שעשיתי כי לא נזהרתי","A mistake I made because I wasn't careful"],
    ["לעשות בשביל עצמי מול בשביל אחרים","Doing things for myself vs. for others"],
    ["משהו שפעם היה מסובך והיום בא בקלות","Something that was once complex and now comes easily"],
    ["מקום קסום או מיוחד שגיליתי","A magical or special place I discovered"],
    ["התחלה חדשה במקום חדש","A fresh start in a new place"],
    ["אני והעבודה שלי","Me and my work"],
    ["מכור ל…","Addicted to..."],
    ["בלעדיי / בלעדיו","Without me / without it"],
    ["משהו שהוא כבר מאחוריי","Something that is behind me"],
    ["כמוני / כמוךָ","Like me / like you"],
    ["נמשך יותר מדי זמן","Dragging on / lasting too long"],
    ["מקום שהשתנה","A place that has changed"],
    ["כשהייתי ילד/ה","When I was a child"],
    ["דברים שאני פחות טוב בהם","Things I'm less good at"],
    ["מבחינתי / מכל הבחינות","As far as I'm concerned / in every aspect"],
    ["אתגר פיזי ואתגר מנטלי","Physical vs. mental challenge"],
    ["לדחות / דחיינות","To postpone / procrastination"],
    ["עבודה וזמן פנוי","Workaholism and life balance"],
    ["הדירה הכי גרועה שהייתה לי","The worst apartment I ever had"],
    ["להעביר את הזמן","To pass the time"],
    ["עצה טובה","Good advice"],
    ["מטלות בבית","Household chores"],
    ["הדברים הקטנים שמעצבנים","Pet peeves"],
    ["יום טיפוסי בחיי","A day in my life"]
  ];

  /* ---------- Geometry ---------- */
  const SVGNS = "http://www.w3.org/2000/svg";
  const R = 190, C = R, D = R * 2, N = 8, SEG = 360 / N;
  const W_OUT = R - 6.4, W_IN = 30, GAP = 5, CORNER = 6;   // wedge geometry (px)
  /* Labels live in a band between the rim and the Camera / Mic circles that flank the
     spin button (they reach r = 98 from the centre): RIM_PAD keeps glyphs off the rim,
     MIN_GLYPH_R keeps the innermost glyph edge clear of those circles. */
  const RIM_PAD = 16, SIDE_PAD = 11, MIN_GLYPH_R = 106, MAX_LINES = 4;
  const HIDDEN_FROM = 140, HIDDEN_TO = 220;              // labels re-deal while hidden behind the dock

  /* ---------- Timing ---------- */
  const HOLD_MS = 800, FLY_MS = 720, EN_LAG_MS = 50, STRIP_VISIBLE_MS = 10000, STRIP_FADE_MS = 800;

  const mqReduce = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches:false };
  const isReduced = () => !!mqReduce.matches;

  /* ---------- Live state (all reset by destroy) ---------- */
  let layer = null, wheel, spinner, arcs, frost, drop, flap, closeBtn, live, fly;
  let slots = [], queue = [], rot = 0, spinning = false, isOpen = false, selected = -1;
  let rafId = 0, handoffTimer = 0, stripTimer = 0, strip = null, gen = 0;
  let timers = [], listening = false, fontsReady = false, pendingOpen = false;
  let lastTick = 0, flapAngle = 0;
  const layoutCache = new Map();

  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const pt = (r, a) => [C + r * Math.sin(rad(a)), C - r * Math.cos(rad(a))];
  const f2 = n => n.toFixed(2);
  const norm = a => ((a % 360) + 360) % 360;
  const hostEl = () => document.getElementById("screen");

  /* every delayed call goes through here so destroy() can cancel it */
  function later(fn, ms){
    const id = setTimeout(() => { timers = timers.filter(t => t !== id); fn(); }, ms);
    timers.push(id);
    return id;
  }

  /* ---------- Rounded wedge shapes ---------- */
  // point s px along the radial at angle a, shifted `off` px toward decreasing angle
  const P = (s, a, off) => [C + s * Math.sin(rad(a)) - off * Math.cos(rad(a)), C - s * Math.cos(rad(a)) - off * Math.sin(rad(a))];
  function wedgePath(c){
    const h = SEG / 2, g = GAP / 2, d = W_OUT - CORNER;
    const delta = deg(Math.asin((CORNER + g) / d));
    const along = d * Math.cos(rad(delta));
    const lIn = P(W_IN, c - h, -g), lSide = P(along, c - h, -g), lOut = pt(W_OUT, c - h + delta);
    const rOut = pt(W_OUT, c + h - delta), rSide = P(along, c + h, g), rIn = P(W_IN, c + h, g);
    return `M${f2(lIn[0])} ${f2(lIn[1])}L${f2(lSide[0])} ${f2(lSide[1])}` +
      `A${CORNER} ${CORNER} 0 0 1 ${f2(lOut[0])} ${f2(lOut[1])}` +
      `A${W_OUT} ${W_OUT} 0 0 1 ${f2(rOut[0])} ${f2(rOut[1])}` +
      `A${CORNER} ${CORNER} 0 0 1 ${f2(rSide[0])} ${f2(rSide[1])}` +
      `L${f2(rIn[0])} ${f2(rIn[1])}Z`;
  }

  /* ---------- Text layout ---------- */
  const ctx = document.createElement("canvas").getContext("2d");
  const measure = (s, w, size) => { ctx.font = `${w} ${size}px Assistant`; return ctx.measureText(s).width; };
  const avail = r => rad(SEG) * r - 2 * SIDE_PAD;
  const HEB = /[\u0590-\u05FF]/;

  function tokenize(s){
    const raw = s.match(/\([^)]*\)|\S+/g) || [], out = [];
    raw.forEach(t => { if (t === "/" && out.length) out[out.length - 1] += " /"; else out.push(t); });
    return out;
  }
  // returns lines as arrays of tokens
  function wrap(tokens, radii, weight, size){
    const lines = []; let i = 0;
    const fits = (arr, r) => measure(arr.join(" "), weight, size) <= avail(r);
    for (let li = 0; li < radii.length && i < tokens.length; li++) {
      const line = [tokens[i]];
      if (!fits(line, radii[li])) return null;
      i++;
      while (i < tokens.length && fits([...line, tokens[i]], radii[li])) line.push(tokens[i++]);
      lines.push(line);
    }
    if (i < tokens.length) return null;
    for (let k = lines.length - 1; k > 0; k--) {        // avoid a lone last word
      if (lines[k].length === 1 && lines[k - 1].length >= 2) {
        const cand = [lines[k - 1][lines[k - 1].length - 1], ...lines[k]];
        if (fits(cand, radii[k])) { lines[k] = cand; lines[k - 1] = lines[k - 1].slice(0, -1); }
      }
    }
    return lines;
  }
  /* Hebrew only. The largest size that fits wins; when a long label does not fit on the
     outer arcs it continues on further concentric lines toward the centre (each line is
     shorter, because the arc is), so sizes stay readable instead of shrinking together. */
  function layout(idx){
    if (layoutCache.has(idx)) return layoutCache.get(idx);
    const heT = tokenize(TOPICS[idx][0]);
    let best = null;
    for (const hs of [15, 14.5, 14, 13.5, 13, 12.5, 12]) {
      const lead = hs * 1.16, r0 = R - RIM_PAD - hs * 0.5;
      const heR = [];
      for (let n = 0; n < MAX_LINES; n++) { const r = r0 - n * lead; if (r - hs * 0.5 >= MIN_GLYPH_R) heR.push(r); }
      for (let hl = 1; hl <= heR.length && !best; hl++) {
        const heLines = wrap(heT, heR.slice(0, hl), 600, hs);
        if (heLines && heLines.length === hl) best = { hs, heLines, heR };
      }
      if (best) break;
    }
    if (!best) best = { hs: 12, heLines: [heT], heR: [R - RIM_PAD - 6] };
    layoutCache.set(idx, best);
    return best;
  }

  /* Shared arc paths for label lines (drawn at the top, left→right so text sits upright) */
  const arcCache = new Set();
  function arcId(r){
    r = Math.round(r * 10) / 10;
    const id = "twArc" + String(r).replace(".", "_");
    if (!arcCache.has(id)) {
      const half = SEG / 2 - 0.5;
      const [x1, y1] = pt(r, -half), [x2, y2] = pt(r, half);
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("id", id);
      p.setAttribute("d", `M${f2(x1)} ${f2(y1)} A${r} ${r} 0 0 1 ${f2(x2)} ${f2(y2)}`);
      arcs.appendChild(p); arcCache.add(id);
    }
    return id;
  }
  function addLine(g, tokens, r, cls, size, dir){
    const t = document.createElementNS(SVGNS, "text");
    t.setAttribute("class", cls);
    t.setAttribute("font-size", size);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "central");
    t.setAttribute("direction", dir);
    t.style.direction = dir; t.style.unicodeBidi = "plaintext";
    const tp = document.createElementNS(SVGNS, "textPath");
    tp.setAttribute("href", "#" + arcId(r));
    tp.setAttribute("startOffset", "50%");
    tp.textContent = tokens.join(" ");
    t.appendChild(tp); g.appendChild(t);
  }
  function renderLabel(slot){
    const g = slot.g; g.textContent = "";
    const L = layout(slot.topic);
    L.heLines.forEach((s, i) => addLine(g, s, L.heR[i], "he", L.hs, "rtl"));
    g.setAttribute("aria-label", TOPICS[slot.topic][0]);
  }

  /* ---------- Mount: the layer is built once, on first open ---------- */
  const DROP_D = "M53.0996 17.1C64.9911 24.9711 89.0992 54.1863 89.0996 68.3871C89.0996 69.0474 89.0645 69.7022 88.9961 70.35C89.0647 71.2577 89.0996 72.1747 89.0996 73.1C89.0996 92.9822 72.9819 109.1 53.0996 109.1C33.2174 109.1 17.0996 92.9822 17.0996 73.1C17.0996 72.1748 17.1336 71.2576 17.2021 70.35C17.1337 69.7022 17.0996 69.0473 17.0996 68.3871C17.1001 54.1863 41.7413 23.9216 53.0996 17.1Z";
  function mount(){
    if (layer) return;
    layer = document.createElement("div");
    layer.className = "tw-layer";
    layer.innerHTML =
      '<div class="tw-wheel" aria-hidden="true">' +
        '<div class="tw-glass"></div>' +
        '<div class="tw-frost"></div>' +
        '<svg class="tw-face" viewBox="0 0 ' + D + ' ' + D + '" aria-hidden="true">' +
          '<defs>' +
            '<linearGradient id="twRimSheen" x1="' + (D * .28) + '" y1="0" x2="' + (D * .7) + '" y2="' + D + '" gradientUnits="userSpaceOnUse">' +
              '<stop offset="0" stop-color="#fff" stop-opacity=".16"/>' +
              '<stop offset=".28" stop-color="#fff" stop-opacity=".05"/>' +
              '<stop offset=".6" stop-color="#fff" stop-opacity="0"/>' +
            '</linearGradient>' +
            '<radialGradient id="twSheen" cx="' + C + '" cy="' + C + '" r="' + R + '" gradientUnits="userSpaceOnUse">' +
              '<stop offset=".55" stop-color="#fff" stop-opacity="0"/>' +
              '<stop offset="1" stop-color="#fff" stop-opacity=".09"/>' +
            '</radialGradient>' +
          '</defs>' +
          '<defs class="tw-arcs"></defs>' +
          '<g class="tw-spinner"></g>' +
          /* glass rim: a clear band outside the inset wedges, faint tint + diffuse reflection, no hard edge */
          '<circle cx="' + C + '" cy="' + C + '" r="' + (R - 3) + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="6"/>' +
          '<circle cx="' + C + '" cy="' + C + '" r="' + (R - 3) + '" fill="none" stroke="url(#twRimSheen)" stroke-width="6"/>' +
        '</svg>' +
        '<button class="tw-drop" type="button" aria-label="Spin the wheel">' +
          '<svg viewBox="0 0 107 127" aria-hidden="true">' +
            '<defs>' +
              '<filter id="twDropShadow" x="-30%" y="-30%" width="160%" height="160%">' +
                '<feGaussianBlur in="SourceAlpha" stdDeviation="8.55"/>' +
                '<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .25 0"/>' +
                '<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>' +
              '</filter>' +
            '</defs>' +
            '<g class="tw-flap">' +
              '<path filter="url(#twDropShadow)" fill="var(--tw-drop)" d="' + DROP_D + '"/>' +
              '<circle class="tw-ring" cx="53.1" cy="73.1" r="41"/>' +
            '</g>' +
          '</svg>' +
        '</button>' +
      '</div>' +
      '<button class="tw-close" type="button" aria-label="Close topics wheel">' +
        '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12"/></svg>' +
      '</button>' +
      '<div class="tw-fly" aria-hidden="true"></div>' +
      '<div class="tw-sr" aria-live="polite"></div>';

    wheel = layer.querySelector(".tw-wheel");
    spinner = layer.querySelector(".tw-spinner");
    arcs = layer.querySelector(".tw-arcs");
    frost = layer.querySelector(".tw-frost");
    drop = layer.querySelector(".tw-drop");
    flap = layer.querySelector(".tw-flap");
    closeBtn = layer.querySelector(".tw-close");
    fly = layer.querySelector(".tw-fly");
    live = layer.querySelector(".tw-sr");

    // mask (not clip-path) so the backdrop blur itself is confined to the wedges
    const wedgeUnion = Array.from({ length: N }, (_, i) => wedgePath(i * SEG)).join("");
    const maskUrl = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${D}' height='${D}' viewBox='0 0 ${D} ${D}'><path fill='#000' d='${wedgeUnion}'/></svg>`)}")`;
    frost.style.webkitMaskImage = maskUrl; frost.style.maskImage = maskUrl;
    frost.style.webkitMaskSize = frost.style.maskSize = D + "px " + D + "px";
    frost.style.webkitMaskRepeat = frost.style.maskRepeat = "no-repeat";

    drop.addEventListener("click", spin);
    closeBtn.addEventListener("click", () => close());
  }

  /* ---------- Wheel build ---------- */
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function nextTopic(){
    const onWheel = new Set(slots.map(s => s.topic));
    for (let n = 0; n < queue.length; n++) { const t = queue.shift(); queue.push(t); if (!onWheel.has(t)) return t; }
    return queue[0];
  }
  function build(){
    spinner.textContent = "";
    arcs.textContent = ""; arcCache.clear();
    const wedges = document.createElementNS(SVGNS, "g");
    spinner.appendChild(wedges);
    queue = shuffle(TOPICS.map((_, i) => i));
    slots = [];
    for (let i = 0; i < N; i++) {
      const w = document.createElementNS(SVGNS, "path");
      w.setAttribute("class", "tw-wedge"); w.setAttribute("d", wedgePath(i * SEG));
      wedges.appendChild(w);
      const g = document.createElementNS(SVGNS, "g");
      g.setAttribute("class", "tw-lbl");
      g.setAttribute("transform", `rotate(${i * SEG} ${C} ${C})`);
      spinner.appendChild(g);
      const slot = { i, g, w, topic: -1, swapped: false };
      slots.push(slot);
      slot.topic = nextTopic(); renderLabel(slot);
    }
    rot = 0; applyRot();
  }
  const worldAngle = s => norm(s.i * SEG + rot);
  function applyRot(){
    spinner.setAttribute("transform", `rotate(${rot.toFixed(3)} ${C} ${C})`);
    frost.style.transform = `rotate(${rot.toFixed(3)}deg)`;
  }
  function swapHidden(){
    for (const s of slots) {
      const a = worldAngle(s), hidden = a > HIDDEN_FROM && a < HIDDEN_TO;
      if (hidden && !s.swapped) { s.topic = nextTopic(); renderLabel(s); s.swapped = true; }
      else if (!hidden) s.swapped = false;
    }
  }

  /* ---------- Drop "clapper" ---------- */
  const tickIndex = () => Math.floor((rot + SEG / 2) / SEG);
  function updateFlap(){
    const t = tickIndex();
    if (t !== lastTick) { flapAngle = -8; lastTick = t; }
    flapAngle *= 0.8;
    flap.setAttribute("transform", `rotate(${flapAngle.toFixed(2)} 53.1 73.1)`);
  }

  /* ---------- Easing ---------- */
  function bezier(p1x, p1y, p2x, p2y){
    const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
    const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t;
    return x => { let lo = 0, hi = 1, t = x; for (let i = 0; i < 32; i++) { t = (lo + hi) / 2; sx(t) < x ? lo = t : hi = t; } return sy(t); };
  }
  const spinEase = bezier(0.34, 0.02, 0.12, 1);
  const settleEase = t => 1 - Math.pow(1 - t, 3);

  /* ---------- Spin ---------- */
  function setSelected(slotIdx){
    slots.forEach(s => { const on = s.i === slotIdx; s.g.classList.toggle("sel", on); s.w.classList.toggle("sel", on); });
    selected = slotIdx;
  }
  function spin(){
    if (spinning || !isOpen) return;
    clearTimeout(handoffTimer);
    spinning = true;
    const reduce = isReduced();
    drop.setAttribute("aria-disabled", "true");
    setSelected(-1);
    const dist = s => Math.min(worldAngle(s), 360 - worldAngle(s));
    const onTop = slots.reduce((b, s) => dist(s) < dist(b) ? s : b);
    let k; do { k = Math.random() * N | 0; } while (k === onTop.i);
    const turns = reduce ? 1 : 4 + (Math.random() * 2 | 0);
    const total = turns * 360 + norm(-k * SEG - rot);
    const overshoot = reduce ? 0 : 3.2, main = reduce ? 1100 : 2750, settle = reduce ? 0 : 380;
    const start = rot, t0 = performance.now(), myGen = gen;
    const frame = now => {
      if (myGen !== gen) return;
      const el = now - t0;
      if (el < main) rot = start + (total + overshoot) * spinEase(el / main);
      else if (el < main + settle) rot = start + total + overshoot * (1 - settleEase((el - main) / settle));
      else { rot = norm(start + total); applyRot(); swapHidden(); lastTick = tickIndex(); finish(k); return; }
      applyRot(); swapHidden(); updateFlap();
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
  }
  function finish(k){
    spinning = false;
    drop.removeAttribute("aria-disabled");
    const myGen = gen;
    const relax = () => {
      if (myGen !== gen || !flap) return;
      flapAngle *= 0.75; flap.setAttribute("transform", `rotate(${flapAngle.toFixed(2)} 53.1 73.1)`);
      if (Math.abs(flapAngle) > .05) requestAnimationFrame(relax);
    };
    relax();
    setSelected(k);
    drop.classList.remove("pop"); void drop.offsetWidth; drop.classList.add("pop");
    const [he, en] = TOPICS[slots[k].topic];
    live.textContent = `Topic: ${he}. ${en}`;
    handoffTimer = later(() => handoff(k), HOLD_MS);
  }

  /* ---------- Handoff: selected wedge text → conversation strip ---------- */
  const layerScale = () => layer.getBoundingClientRect().width / (layer.offsetWidth || 1);

  function removeStrip(fast){
    clearTimeout(stripTimer);
    if (!strip) return;
    const s = strip; strip = null;
    s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fast ? 180 : STRIP_FADE_MS, easing: "ease", fill: "forwards" })
      .onfinish = () => s.remove();
  }
  function buildStrip(he, en){
    const el = document.createElement("div");
    el.className = "tw-strip flying";
    el.setAttribute("role", "status");
    const mk = (cls, dir, tokens) => {
      const p = document.createElement("p"); p.className = cls; p.dir = dir;
      tokens.forEach((tk, i) => {
        if (i) p.appendChild(document.createTextNode(" "));
        const s = document.createElement("span"); s.textContent = tk;
        if (dir === "rtl" && !HEB.test(tk)) s.dir = "ltr";
        p.appendChild(s);
      });
      return p;
    };
    el.appendChild(mk("he", "rtl", tokenize(he)));
    el.appendChild(mk("en", "ltr", tokenize(en)));
    return el;
  }
  // centre point + tangent angle of every token on the wheel, in logical order, layer px
  function sourcePositions(lines, radii, size, weight, dir){
    const out = [], space = measure(" ", weight, size);
    const ox = wheel.offsetLeft, oy = wheel.offsetTop;
    lines.forEach((tokens, li) => {
      const r = radii[li];
      const widths = tokens.map(t => measure(t, weight, size));
      const W = widths.reduce((a, b) => a + b, 0) + space * (tokens.length - 1);
      const visual = tokens.map((t, i) => i);
      if (dir === "rtl") visual.reverse();
      let cursor = 0; const pos = [];
      visual.forEach(i => {
        const centre = cursor + widths[i] / 2;
        const a = deg((centre - W / 2) / r);
        const [x, y] = pt(r, a);
        pos[i] = { x: ox + x, y: oy + y, a };
        cursor += widths[i] + space;
      });
      out.push(...pos);
    });
    return out;
  }

  function handoff(k){
    if (!isOpen || spinning || selected !== k) return;
    const slot = slots[k], L = layout(slot.topic), [he, en] = TOPICS[slot.topic];
    removeStrip(true);
    const el = buildStrip(he, en);
    layer.appendChild(el);
    strip = el;

    if (isReduced()) {
      el.classList.remove("flying");
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: "backwards" });
      close(true); armStripTimer(); return;
    }

    const sc = layerScale(), lr = layer.getBoundingClientRect();
    const measureSpan = s => {
      const r = s.getBoundingClientRect();
      return { left: (r.left - lr.left) / sc, top: (r.top - lr.top) / sc, w: r.width / sc, h: r.height / sc, span: s };
    };
    const heTargets = [...el.querySelectorAll(".he span")].map(measureSpan);
    const enTargets = [...el.querySelectorAll(".en span")].map(measureSpan);
    const heSrc = sourcePositions(L.heLines, L.heR, L.hs, 600, "rtl");

    slot.g.style.opacity = "0";          // the flying words take over from the wedge label
    const anims = [];
    const mkFly = (t, cls, color) => {
      const f = document.createElement("span");
      f.className = cls; f.textContent = t.span.textContent;
      f.dir = cls === "he" && HEB.test(f.textContent) ? "rtl" : "ltr";
      f.style.left = t.left + "px"; f.style.top = t.top + "px";
      if (color) f.style.color = color;
      fly.appendChild(f);
      return f;
    };
    // Hebrew: each word travels from its place on the wedge to its slot in the strip
    heSrc.forEach((s, i) => {
      const t = heTargets[i]; if (!t) return;
      const f = mkFly(t, "he");
      const sk = L.hs / 18;
      const dx = s.x - (t.left + t.w / 2), dy = s.y - (t.top + t.h / 2);
      anims.push(f.animate([
        { transform: `translate(${dx}px, ${dy}px) rotate(${s.a}deg) scale(${sk})`, color: "var(--tw-yellow)" },
        // columns settle first, rows second: words slide into their final x-slots before the lines merge, so they never collide
        { transform: `translate(${dx * .08}px, ${dy * .5}px) rotate(${s.a * .15}deg) scale(${(sk + 1) / 2})`, offset: .5 },
        { transform: "none", color: "var(--tw-yellow)" }
      ], { duration: FLY_MS, easing: "cubic-bezier(.45,0,.2,1)", fill: "both" }));
    });
    // English was never on the wheel: the translation settles in beneath the Hebrew as it lands
    enTargets.forEach(t => {
      const f = mkFly(t, "en", "var(--tw-yellow-soft)");
      anims.push(f.animate([
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" }
      ], { duration: FLY_MS * .55, delay: FLY_MS * .45, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }));
    });
    el.animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(.96)" }, { opacity: 1, transform: "translate(-50%,-50%)" }],
      { duration: 380, delay: FLY_MS * .45, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });

    close(true);                          // wheel slides down while the words travel up

    const myGen = gen;
    Promise.all(anims.map(a => a.finished)).then(() => {
      if (myGen !== gen) return;
      if (strip !== el) { fly.textContent = ""; return; }
      el.classList.remove("flying");
      fly.textContent = "";
      armStripTimer();
    }).catch(() => {});
  }
  function armStripTimer(){
    clearTimeout(stripTimer);
    stripTimer = later(() => removeStrip(false), STRIP_VISIBLE_MS);
  }

  /* ---------- Open / close ---------- */
  const topicsBtn = () => document.querySelector("#screen .rc-btn[aria-label=\"Topics\"]");
  function setExpanded(on){
    const b = topicsBtn();
    if (b) b.setAttribute("aria-expanded", on ? "true" : "false");
  }
  function doOpen(){
    const host = hostEl();
    if (isOpen || !host || ST.state !== "live") return;
    mount();
    if (layer.parentNode !== host) host.appendChild(layer);
    host.classList.add("tw-armed");
    isOpen = true;
    if (!slots.length) build();
    slots.forEach(s => s.g.style.opacity = "");
    wheel.classList.remove("closing");
    wheel.setAttribute("aria-hidden", "false");
    host.classList.add("tw-open");
    setExpanded(true);
    if (!isReduced()) {
      const to = rot, from = rot - 24, t0 = performance.now(), dur = 620, myGen = gen;
      rot = from; applyRot();
      const f = now => {
        if (myGen !== gen) return;
        const p = Math.min(1, (now - t0) / dur);
        rot = from + (to - from) * settleEase(p); applyRot();
        if (p < 1 && isOpen) requestAnimationFrame(f);
        else { rot = norm(to); applyRot(); lastTick = tickIndex(); }
      };
      requestAnimationFrame(f);
    }
    const myOpen = gen;
    requestAnimationFrame(() => { if (myOpen === gen && isOpen) wheel.classList.add("open"); });
    closeBtn.classList.add("show");
    later(() => { if (isOpen) drop.focus({ preventScroll: true }); }, 350);
    listen(true);
  }
  function open(){
    if (isOpen) return;
    if (fontsReady) { doOpen(); return; }
    pendingOpen = true;   // fonts are still loading: measure once they are in
  }
  function close(fromHandoff){
    if (!isOpen) return;
    cancelAnimationFrame(rafId);
    clearTimeout(handoffTimer);
    if (spinning) { spinning = false; drop.removeAttribute("aria-disabled"); rot = norm(rot); applyRot(); }
    isOpen = false;
    listen(false);
    wheel.classList.remove("open"); wheel.classList.add("closing");
    wheel.setAttribute("aria-hidden", "true");
    closeBtn.classList.remove("show");
    setExpanded(false);
    later(() => {
      const host = hostEl();
      if (!isOpen && host) host.classList.remove("tw-open");
    }, fromHandoff === true ? FLY_MS : 200);
    later(() => { if (!isOpen && wheel) { wheel.classList.remove("closing"); slots.forEach(s => s.g.style.opacity = ""); } }, 420);
    later(() => {
      if (isOpen || ST.state !== "live") return;
      const b = topicsBtn();
      if (b) b.focus({ preventScroll: true });
    }, fromHandoff === true ? FLY_MS + 200 : 320);
  }

  /* ---------- Listeners (only while the wheel is open) ---------- */
  function onKey(e){ if (e.key === "Escape") close(); }
  function onScreenClick(e){
    if (!isOpen || spinning || !layer) return;
    if (e.target.closest(".tw-drop,.tw-close,.rfooter,.rheader,.sheet")) return;
    const r = layer.getBoundingClientRect(), s = r.width / (layer.offsetWidth || 1);
    const x = (e.clientX - r.left) / s, y = (e.clientY - r.top) / s;
    if (y < layer.offsetHeight / 2) return;                          // upper video never dismisses
    if (Math.hypot(x - layer.offsetWidth / 2, y - (wheel.offsetTop + C)) > R) close();
  }
  function listen(on){
    const host = hostEl();
    if (on === listening) return;
    listening = on;
    if (on) {
      document.addEventListener("keydown", onKey);
      if (host) host.addEventListener("click", onScreenClick);
    } else {
      document.removeEventListener("keydown", onKey);
      if (host) host.removeEventListener("click", onScreenClick);
    }
  }

  /* ---------- Lifecycle ---------- */
  // Called by render() after every screen paint. innerHTML wipes the layer out
  // of #screen, so on Live it is put back; off Live everything is released.
  function sync(host, state){
    if (state !== "live") { destroy(); return; }
    host.classList.add("tw-armed");
    if (!layer) return;
    host.appendChild(layer);
    host.classList.toggle("tw-open", isOpen);
    if (isOpen) {
      setExpanded(true);
      // another surface took over: a sheet or the chat composer
      if (ST.leaveSheet || ST.keepOnSheet || ST.partnerOffSheet || ST.textOpen) close();
    }
  }
  // Releases the DOM, listeners, timers, animation frames and Web Animations.
  function destroy(){
    gen++;
    cancelAnimationFrame(rafId);
    timers.forEach(clearTimeout); timers = [];
    clearTimeout(handoffTimer); clearTimeout(stripTimer);
    listen(false);
    if (layer) {
      try { layer.getAnimations({ subtree: true }).forEach(a => a.cancel()); } catch (e) {}
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    }
    const host = hostEl();
    if (host) host.classList.remove("tw-open", "tw-armed");
    layer = wheel = spinner = arcs = frost = drop = flap = closeBtn = live = fly = null;
    slots = []; queue = []; arcCache.clear();
    rot = 0; spinning = false; isOpen = false; selected = -1; strip = null;
    rafId = handoffTimer = stripTimer = 0; flapAngle = 0; lastTick = 0; pendingOpen = false;
  }

  /* ---------- Fonts: measure only once Assistant (Hebrew + Latin) is in ---------- */
  const fontsLoad = document.fonts && document.fonts.load ? Promise.race([
    Promise.all([document.fonts.load('600 15px "Assistant"', "אב"), document.fonts.load('400 10px "Assistant"', "Ab")]),
    new Promise(r => setTimeout(r, 1500))
  ]) : Promise.resolve();
  fontsLoad.then(() => {
    layoutCache.clear();
    fontsReady = true;
    if (pendingOpen) { pendingOpen = false; doOpen(); }
  }).catch(() => { fontsReady = true; });

  return {
    open: open, close: function(){ close(); }, spin: spin, sync: sync, reset: destroy,
    /* read-only inspection for review */
    get state(){
      return {
        rot: rot, spinning: spinning, selected: selected, isOpen: isOpen, strip: strip && strip.textContent,
        topicCount: TOPICS.length,
        slots: slots.map(s => ({ i: s.i, a: worldAngle(s), topic: TOPICS[s.topic][0] }))
      };
    }
  };
})();


/* =========================================================================
   6c · PRACTICE  —  CafePractice
   A compact shared exercise on the seam between the two videos, opened from
   the Practice button in the Live dock. Like the wheel it is an overlay layer,
   not a screen: it mounts once inside #screen and is re-attached after every
   Live render, so toggling Camera / Mic never rebuilds it or interrupts audio.

   Exercise types
     audio  Hebrew audio -> English answer   (front: player, no transcript)
     text   Hebrew text  -> English answer
     text   English text -> Hebrew answer

   CONTENT. Challenge Mode is only a Hub tile in this repo: it has no exercise
   data and no audio files. So PRACTICE_TEXT below is a small demo set written
   for this prototype. Every third exercise is an audio one: with no recordings
   available these are three DEMO entries whose Play button drives a silent
   timer-based progress bar (no sound, nothing generated). Real recordings
   registered with
     CafePractice.setAudioExercises([{id, src, answer}])
   play through a real audio element and take those slots over.

   SHARED STATE. Practice is one state object (S) changed only by actions:
     open · play · pause · reveal · back · prev · next · go · close
   Every action goes through dispatch(), which applies it locally and hands the
   same small event {type, exId, seq, at} to transport.send. Remote events enter
   through receive(). There is NO session-sync layer in this prototype (the
   partner is a scripted mock), so the transport is empty and nothing is sent
   anywhere. When a real channel exists it connects with
     CafePractice.connect({send: fn})  +  CafePractice.receive(evt)
   Camera / Mic toggles are personal and never touch this state.
   ========================================================================= */
var CafePractice = (function(){
  /* ---------- Content ---------- */
  var PRACTICE_TEXT = [
    {id:'demo-he-1', type:'text', from:'he', to:'en',
     prompt:'הוא לא הבין למה כולם צחקו.',
     answer:'He didn\u2019t understand why everyone was laughing.'},
    {id:'demo-en-1', type:'text', from:'en', to:'he',
     prompt:'Could you say that again, a little more slowly?',
     answer:'אפשר לחזור על זה עוד פעם, קצת יותר לאט?'},
    {id:'demo-he-2', type:'text', from:'he', to:'en',
     prompt:'אם היה לי יותר זמן, הייתי לומד לנגן בגיטרה.',
     answer:'If I had more time, I would learn to play the guitar.'},
    {id:'demo-en-2', type:'text', from:'en', to:'he',
     prompt:'She told me she had never been to Berlin.',
     answer:'היא סיפרה לי שהיא אף פעם לא הייתה בברלין.'},
    {id:'demo-he-3', type:'text', from:'he', to:'en',
     prompt:'איפה הכי כיף לשתות קפה בעיר הזאת?',
     answer:'Where is the nicest place to have coffee in this city?'},
    {id:'demo-en-3', type:'text', from:'en', to:'he',
     prompt:'It took me a while to get used to living far from my family.',
     answer:'לקח לי קצת זמן להתרגל לגור רחוק מהמשפחה שלי.'},
    {id:'demo-he-4', type:'text', from:'he', to:'en',
     prompt:'בשנה האחרונה עברתי דירה פעמיים, ועדיין לא הרגשתי שהמקום הזה הוא בית.',
     answer:'Last year I moved twice, and I still didn\u2019t feel that this place was home.'}
  ];
  var PRACTICE_AUDIO = [];   // {id, src, answer} — real Hebrew audio only; see header
  /* Demo recordings. There is no Hebrew audio in the repo, so these three have no
     `src`: their Play button drives a silent progress bar on a timer so the
     listening state can be reviewed in the flow. Nothing is ever heard. Real
     recordings passed to setAudioExercises() take these slots over. */
  var PRACTICE_AUDIO_DEMO = [
    {id:'demo-audio-1', type:'audio', from:'he', to:'en', src:null, simulated:true, dur:8,
     answer:'Could you tell me how to get to the station?'},
    {id:'demo-audio-2', type:'audio', from:'he', to:'en', src:null, simulated:true, dur:8,
     answer:'I haven\u2019t seen him since last summer.'},
    {id:'demo-audio-3', type:'audio', from:'he', to:'en', src:null, simulated:true, dur:8,
     answer:'We were going to leave early, but it started to rain.'}
  ];

  /* The deck: every third exercise is an audio one. */
  function deck(){
    var real = PRACTICE_AUDIO.filter(function(e){ return e && e.src && e.answer; })
      .map(function(e){ return {id:e.id, type:'audio', from:'he', to:'en', src:e.src, answer:e.answer}; });
    var audio = real.concat(PRACTICE_AUDIO_DEMO.slice(real.length));
    var out = [];
    PRACTICE_TEXT.forEach(function(t, i){ out.push(t); if(i % 2 === 1 && audio.length) out.push(audio.shift()); });
    return out.concat(audio);
  }
  function idxOf(id){ var d = deck(); for(var i = 0; i < d.length; i++) if(d[i].id === id) return i; return -1; }
  function findEx(id){ var i = idxOf(id); return i < 0 ? null : deck()[i]; }
  function cur(){ return findEx(S.exId) || deck()[0]; }
  function nextId(){ var d = deck(), i = idxOf(S.exId); return d[(i + 1) % d.length].id; }
  function prevId(){ var d = deck(), i = idxOf(S.exId); return d[i <= 0 ? d.length - 1 : i - 1].id; }

  /* ---------- The one shared state ---------- */
  var S = {open:false, exId:null, side:'q', playing:false, seq:0};

  /* ---------- Transport seam (empty on purpose) ---------- */
  var transport = null, queue = [];

  /* ---------- Local view state ---------- */
  var layer = null, group, labelEl, card, front, back, actsQ, actsA;
  var busy = false, gen = 0, needsEnter = false, listening = false, ro = null;
  var swipeId = null, swipeX = 0, swipeY = 0, justSwiped = false;
  var audio = null, audioId = null, playerError = false;
  var simTimer = 0, simPos = 0;      // silent progress for the design preview only
  var mqReduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : {matches:false};
  var reduced = function(){ return !!mqReduce.matches; };
  var hostEl = function(){ return document.getElementById('screen'); };
  var blocked = function(){ return ST.leaveSheet || ST.keepOnSheet || ST.partnerOffSheet; };
  var P = 'perspective(900px) ';

  /* ---------- Copy ---------- */
  function labelFor(ex, side){
    if(side === 'a') return 'Answer';
    if(ex.type === 'audio') return 'Listen and translate to English';
    return ex.to === 'en' ? 'Translate to English' : 'Translate to Hebrew';
  }
  function sizeClass(text){
    var n = String(text).length;
    return n <= 32 ? 'pr-len-s' : (n <= 70 ? 'pr-len-m' : 'pr-len-l');
  }
  function textHtml(text, lang){
    return '<p class="pr-text ' + sizeClass(text) + '" lang="' + lang + '" dir="' + (lang === 'he' ? 'rtl' : 'ltr') + '">'
      + GM.esc(text) + '</p>';
  }
  var CLOSE_SVG = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M2.6 2.6l6.8 6.8M9.4 2.6l-6.8 6.8"/></svg>';

  /* ---------- DOM ---------- */
  function build(){
    layer = document.createElement('div');
    layer.className = 'pr-layer';
    layer.innerHTML =
      '<div class="pr-group">'
        + '<p class="pr-label" aria-live="polite"></p>'
        + '<div class="pr-card" role="group" aria-label="Practice exercise">'
          + '<button class="pr-close" type="button" data-act="close" aria-label="Close practice">' + CLOSE_SVG + '</button>'
          + '<div class="pr-faces">'
            + '<div class="pr-face pr-front"></div>'
            + '<div class="pr-face pr-back"></div>'
          + '</div>'
        + '</div>'
        + '<div class="pr-acts">'
          + '<button class="pr-nav pr-prev" type="button" data-act="prev" aria-label="Previous exercise">' + GM.I.chevLt + '</button>'
          + '<div class="pr-acts-q"><button class="pr-btn primary" type="button" data-act="reveal">Reveal answer</button></div>'
          + '<div class="pr-acts-a"><button class="pr-btn" type="button" data-act="back">Back to question</button></div>'
          + '<button class="pr-nav pr-next" type="button" data-act="next" aria-label="Next exercise">' + GM.I.chevRt + '</button>'
        + '</div>'
      + '</div>';
    group = layer.querySelector('.pr-group');
    labelEl = layer.querySelector('.pr-label');
    card = layer.querySelector('.pr-card');
    front = layer.querySelector('.pr-front');
    back = layer.querySelector('.pr-back');
    actsQ = layer.querySelector('.pr-acts-q');
    actsA = layer.querySelector('.pr-acts-a');
    /* Only [data-act] controls act. The card body is inert to clicks: it never
       flips, and nothing here reaches the screen underneath. */
    layer.addEventListener('click', function(e){
      e.stopPropagation();
      if(justSwiped){ justSwiped = false; return; }   /* a horizontal swipe is next/prev, not a flip */
      var b = e.target.closest ? e.target.closest('[data-act]') : null;
      if(!b || !layer.contains(b)){
        /* the card itself flips from anywhere on its surface, except the player
           (which only controls audio); a text selection drag does not flip */
        if(e.target.closest && e.target.closest('.pr-card') && !e.target.closest('.pr-player')
           && !(window.getSelection && String(window.getSelection()).length))
          dispatch(S.side === 'q' ? 'reveal' : 'back');
        return;
      }
      var act = b.getAttribute('data-act');
      if(act === 'toggle') act = S.playing ? 'pause' : 'play';
      dispatch(act);
    });
    needsEnter = true;
    paint();
  }
  function fillContent(){
    var ex = cur();
    layer.setAttribute('data-type', ex.type);
    front.innerHTML = ex.type === 'audio' ? playerHtml() : textHtml(ex.prompt, ex.from);
    back.innerHTML = textHtml(ex.answer, ex.to);
    simStop();
    if(ex.type === 'audio' && ex.src) loadAudio(ex);
    paintPlayer();
  }
  function showSide(side){
    var ex = cur();
    card.classList.toggle('is-answer', side === 'a');
    front.toggleAttribute('inert', side === 'a');
    back.toggleAttribute('inert', side !== 'a');
    front.setAttribute('aria-hidden', side === 'a' ? 'true' : 'false');
    back.setAttribute('aria-hidden', side === 'a' ? 'false' : 'true');
    actsQ.hidden = side === 'a'; actsQ.toggleAttribute('inert', side === 'a');
    actsA.hidden = side !== 'a'; actsA.toggleAttribute('inert', side !== 'a');
    labelEl.textContent = labelFor(ex, side);
  }
  function paint(){ fillContent(); showSide(S.side); publish(); }
  function refocus(){
    if(!layer) return;
    var a = document.activeElement;
    if(a && a !== document.body && !layer.contains(a)) return;
    var b = layer.querySelector(S.side === 'a' ? '.pr-acts-a [data-act="back"]' : '.pr-acts-q [data-act="reveal"]');
    if(b) b.focus({preventScroll:true});
  }

  /* Attach (idempotent). Runs from open() and from every Live render. */
  function ensure(host){
    if(!host) return;
    if(!layer) build();
    if(layer.parentNode !== host) host.appendChild(layer);
    host.classList.add('pr-open');
    setBtn(true);
    listen(true);
    publish();
    if(!ro && window.ResizeObserver){ ro = new ResizeObserver(publish); ro.observe(card); ro.observe(host); }
    if(needsEnter){
      needsEnter = false;
      if(!reduced()) group.animate([{opacity:0, transform:'translateY(10px) scale(.98)'}, {opacity:1, transform:'none'}],
        {duration:260, easing:'cubic-bezier(.22,.8,.2,1)'});
      else group.animate([{opacity:0}, {opacity:1}], {duration:140});
      refocus();
    }
  }
  function setBtn(on){
    var b = document.querySelector('#screen .rc-btn[aria-label="Practice"]');
    if(!b) return;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  function onKey(e){
    if(e.key !== 'Escape' || !S.open || blocked()) return;
    var t = e.target && e.target.tagName;
    if(t === 'INPUT' || t === 'TEXTAREA') return;      // Escape in the chat field is not "close Practice"
    dispatch('close');
  }
  /* Layout hand-off, run whenever the card or screen changes size:
     1. cap the card so its actions always end above the chat input, even with
        chat open (Practice must not change when chat opens or the countdown starts);
     2. tell the chat list where the actions end (--pr-avoid on .screen). */
  function publish(){
    var host = hostEl();
    if(!host || !layer || !card) return;
    var hr = host.getBoundingClientRect();
    var dock = host.querySelector('.cafe-dock');
    var dockTop = dock ? dock.getBoundingClientRect().top - hr.top : host.clientHeight - 102;
    var acts = layer.querySelector('.pr-acts');
    // how far the actions reach below the card (they overlap its bottom edge by 14px)
    var extent = (acts.offsetHeight || 40) + (parseFloat(getComputedStyle(acts).marginTop) || 0);
    /* On a short screen the card also leaves room for the final countdown above
       the chat input (56px), and its floor drops to 84px; long sentences then
       scroll inside the card instead of the card growing into the countdown. */
    var short = host.clientHeight < 720;
    var max = Math.max(short ? 84 : 120, Math.min(300, 2 * (dockTop - 82 - (short ? 56 : 0) - host.clientHeight / 2 - extent)));
    layer.classList.toggle('is-short', short);
    layer.style.setProperty('--pr-card-max', Math.round(max) + 'px');
    host.style.setProperty('--pr-avoid', Math.round(acts.getBoundingClientRect().bottom - hr.top + 8) + 'px');
  }
  function swipeIgnore(t){
    return !!(t && t.closest && t.closest('.pr-player, .pr-nav, .pr-btn, .pr-close'));
  }
  function onPointerDown(e){
    if(!S.open || busy || e.pointerType === 'mouse' || swipeIgnore(e.target)) return;
    swipeId = e.pointerId; swipeX = e.clientX; swipeY = e.clientY;
  }
  function onPointerMove(e){
    if(swipeId !== e.pointerId) return;
    var dx = e.clientX - swipeX, dy = e.clientY - swipeY;
    if(Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) e.preventDefault();
  }
  function onPointerEnd(e){
    if(swipeId !== e.pointerId) return;
    var dx = e.clientX - swipeX, dy = e.clientY - swipeY;
    swipeId = null;
    if(Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    justSwiped = true;
    dispatch(dx < 0 ? 'next' : 'prev');   /* swipe left = next, swipe right = previous */
    setTimeout(function(){ justSwiped = false; }, 400);
  }
  function listen(on){
    if(on === listening) return;
    listening = on;
    if(on){
      document.addEventListener('keydown', onKey);
      layer.addEventListener('pointerdown', onPointerDown);
      layer.addEventListener('pointermove', onPointerMove, {passive:false});
      layer.addEventListener('pointerup', onPointerEnd);
      layer.addEventListener('pointercancel', onPointerEnd);
    } else {
      document.removeEventListener('keydown', onKey);
      if(layer){
        layer.removeEventListener('pointerdown', onPointerDown);
        layer.removeEventListener('pointermove', onPointerMove);
        layer.removeEventListener('pointerup', onPointerEnd);
        layer.removeEventListener('pointercancel', onPointerEnd);
      }
      swipeId = null;
    }
  }

  /* ---------- Audio (real HTMLAudioElement; nothing is simulated) ---------- */
  function playerHtml(){
    var ex = cur(), none = !ex.src && !ex.simulated;
    return '<div class="pr-player">'
      + '<button class="gm-playbtn pr-play" type="button" data-act="toggle" aria-label="Play Hebrew audio"'
      + (none ? ' aria-disabled="true"' : '') + '>' + GM.I.play + '</button>'
      + GM.wave(0, false)
      + '</div>';
  }
  function getAudio(){
    if(audio) return audio;
    audio = new Audio();
    audio.preload = 'metadata';
    audio.addEventListener('timeupdate', paintPlayer);
    audio.addEventListener('loadedmetadata', paintPlayer);
    audio.addEventListener('ended', function(){
      S.playing = false;
      try{ audio.currentTime = 0; }catch(e){}
      paintPlayer();
    });
    audio.addEventListener('error', function(){
      if(!audio.getAttribute('src')) return;
      playerError = true; S.playing = false; paintPlayer();
    });
    return audio;
  }
  function loadAudio(ex){
    var a = getAudio();
    if(audioId !== ex.id){
      audioId = ex.id; playerError = false;
      a.src = ex.src; a.load();
    } else {
      try{ a.currentTime = 0; }catch(e){}
    }
  }
  function simPause(){ clearInterval(simTimer); simTimer = 0; }
  function simStop(){ simPause(); simPos = 0; }
  function simStart(){
    var ex = cur(), t0 = performance.now() - simPos * 1000;
    simPause();
    simTimer = setInterval(function(){
      simPos = (performance.now() - t0) / 1000;
      if(simPos >= ex.dur){ simStop(); S.playing = false; }
      paintPlayer();
    }, 80);
  }
  function stopAudio(){
    if(audio){ audio.pause(); try{ audio.currentTime = 0; }catch(e){} }
    simStop();
    S.playing = false;
    paintPlayer();
  }
  function releaseAudio(){
    simStop();
    if(!audio) return;
    audio.pause();
    audio.removeAttribute('src'); audioId = null; playerError = false;
    try{ audio.load(); }catch(e){}
  }
  function paintPlayer(){
    if(!layer) return;
    var p = layer.querySelector('.pr-player');
    if(!p) return;
    var btn = p.querySelector('.pr-play'), wv = p.querySelector('.gm-wave');
    var ex = cur(), sim = !!ex.simulated, none = !ex.src && !sim;
    var dur = sim ? ex.dur : (!none && audio && isFinite(audio.duration) ? audio.duration : 0);
    var pos = sim ? simPos : (!none && audio ? audio.currentTime : 0);
    var ratio = dur ? Math.min(1, pos / dur) : 0;
    var want = S.playing ? 'pause' : 'play';
    if(btn.getAttribute('data-icon') !== want){
      btn.setAttribute('data-icon', want);
      btn.innerHTML = S.playing ? GM.I.pause : GM.I.play;
      btn.setAttribute('aria-label', S.playing ? 'Pause Hebrew audio' : 'Play Hebrew audio');
    }
    var bars = wv.children;
    for(var i = 0; i < bars.length; i++) bars[i].classList.toggle('on', (i / bars.length) < ratio);
    wv.classList.toggle('is-live', S.playing);
    p.classList.toggle('is-error', playerError);
    btn.disabled = playerError;
    btn.setAttribute('aria-disabled', none ? 'true' : 'false');
    if(!none) btn.removeAttribute('aria-disabled');
  }

  /* ---------- Transitions (one at a time) ---------- */
  function runSwap(kind, mid){
    if(!layer) return;
    busy = true; layer.classList.add('is-busy');
    var my = gen, flip = kind === 'flip';
    var end = function(){
      if(my !== gen) return;
      busy = false;
      if(layer) layer.classList.remove('is-busy');
      refocus();
      drain();
    };
    if(reduced()){ mid(); end(); return; }
    var a1 = card.animate(
      flip ? [{transform:P + 'rotateY(0deg)'}, {transform:P + 'rotateY(90deg)'}]
           : [{opacity:1, transform:'scale(1)'}, {opacity:0, transform:'scale(.97)'}],
      {duration: flip ? 180 : 130, easing:'cubic-bezier(.4,0,1,1)', fill:'forwards'});
    a1.onfinish = function(){
      if(my !== gen) return;
      mid();
      a1.cancel();
      var a2 = card.animate(
        flip ? [{transform:P + 'rotateY(-90deg)'}, {transform:P + 'rotateY(0deg)'}]
             : [{opacity:0, transform:'scale(.97)'}, {opacity:1, transform:'scale(1)'}],
        {duration: flip ? 240 : 190, easing:'cubic-bezier(0,0,.2,1)'});
      a2.onfinish = end;
    };
  }
  function drain(){ while(queue.length && !busy && layer) apply(queue.shift()); }

  /* ---------- Actions: the whole shared interaction ---------- */
  function apply(evt){
    var ex;
    switch(evt.type){
      case 'open':
        if(S.open) return false;
        S.exId = (evt.exId && findEx(evt.exId)) ? evt.exId : deck()[0].id;
        S.side = 'q'; S.playing = false; S.open = true;
        /* the wheel and any topic strip give way (existing cleanup); chat may stay */
        dismissForPractice();
        ensure(hostEl());
        return true;
      case 'play':
        ex = cur();
        if(!S.open || S.side !== 'q' || ex.type !== 'audio' || !(ex.src || ex.simulated) || S.playing || playerError) return false;
        S.playing = true;
        if(ex.simulated){ simStart(); }
        else {
          var pr = getAudio().play();
          if(pr && pr.catch) pr.catch(function(){ S.playing = false; paintPlayer(); });
        }
        paintPlayer();
        return true;
      case 'pause':
        if(!S.open || !S.playing) return false;
        S.playing = false; if(audio) audio.pause();
        simPause();
        paintPlayer();
        return true;
      case 'reveal':
        if(!S.open || S.side !== 'q') return false;
        stopAudio(); S.side = 'a';
        runSwap('flip', function(){ showSide('a'); });
        return true;
      case 'back':
        if(!S.open || S.side !== 'a') return false;
        S.side = 'q';
        runSwap('flip', function(){ showSide('q'); });
        return true;
      case 'next':
      case 'prev':
      case 'go':
        if(!S.open) return false;
        stopAudio();
        S.exId = (evt.exId && findEx(evt.exId)) ? evt.exId : (evt.type === 'prev' ? prevId() : nextId());
        S.side = 'q';
        runSwap('swap', paint);
        return true;
      case 'close':
        if(!S.open) return false;
        stopAudio();
        S.open = false; queue.length = 0; busy = false; gen++;
        retire(false);
        return true;
    }
    return false;
  }
  var TRANSITIONING = {reveal:1, back:1, next:1, prev:1, go:1};
  function dispatch(type, exId){
    if(type !== 'open' && !S.open) return;
    if(busy && TRANSITIONING[type]) return;          // no duplicate actions mid-flip
    var evt = {type:type, exId:S.exId, seq:S.seq + 1, at:Date.now()};
    if(type === 'open') evt.exId = exId || S.exId || deck()[0].id;
    if(type === 'go') evt.exId = exId;
    if(type === 'next') evt.exId = nextId();
    if(type === 'prev') evt.exId = prevId();
    if(!apply(evt)) return;
    S.seq = evt.seq;
    if(transport && transport.send){ try{ transport.send(evt); }catch(e){} }
  }
  function receive(evt){
    if(!evt || !evt.type) return;
    if(busy && TRANSITIONING[evt.type]){ queue.push(evt); return; }
    if(apply(evt)) S.seq = Math.max(S.seq, evt.seq || 0);
  }

  /* ---------- Leaving ---------- */
  // Fades the layer out (or drops it at once) and clears the host.
  function retire(immediate){
    listen(false);
    var l = layer, g = group;
    layer = group = labelEl = card = front = back = actsQ = actsA = null;
    if(ro){ ro.disconnect(); ro = null; }
    var host = hostEl();
    if(host){ host.classList.remove('pr-open'); host.style.removeProperty('--pr-avoid'); }
    setBtn(false);
    if(!l) return;
    var drop = function(){ if(l.parentNode) l.parentNode.removeChild(l); };
    if(immediate || reduced()){ drop(); return; }
    l.classList.add('is-closing');
    g.animate([{opacity:1, transform:'none'}, {opacity:0, transform:'translateY(6px) scale(.985)'}],
      {duration:160, easing:'ease-in', fill:'forwards'});
    setTimeout(drop, 190);
  }
  // Session left Live: release everything, including the audio element.
  function reset(){
    gen++;
    var l = layer;
    if(l){ try{ l.getAnimations({subtree:true}).forEach(function(a){ a.cancel(); }); }catch(e){} }
    retire(true);
    releaseAudio();
    S.open = false; S.exId = null; S.side = 'q'; S.playing = false;
    queue.length = 0; busy = false; needsEnter = false;
  }
  // Called by render() after every screen paint.
  function sync(host, state){
    if(state !== 'live'){ if(S.open || layer || audio) reset(); return; }
    if(!S.open) return;
    ensure(host);                                        // chat may be open alongside: Practice is unchanged
    var b = blocked();
    layer.classList.toggle('is-suspended', b);
    if(b && S.playing) dispatch('pause');
  }

  return {
    open: function(){ if(S.open){ refocus(); return; } dispatch('open'); },
    close: function(){ dispatch('close'); },
    dismiss: function(){ if(S.open) dispatch('close'); },
    previewAudio: function(){
      var a = deck().filter(function(e){ return e.type === 'audio'; })[0];
      if(!a) return;
      if(S.open) dispatch('go', a.id); else dispatch('open', a.id);
    },
    sync: sync, reset: reset,
    receive: receive,
    connect: function(t){ transport = t || null; },
    setAudioExercises: function(list){ PRACTICE_AUDIO = (list || []).filter(function(e){ return e && e.id && e.src && e.answer; }); },
    /* read-only inspection for review */
    get state(){ return {open:S.open, exId:S.exId, side:S.side, playing:S.playing, seq:S.seq, busy:busy, deck:deck().length}; }
  };
})();

/* Opening Practice reuses the existing cleanup: CafeTopicsWheel.reset() releases
   the wheel and any selected-topic strip. Chat is a separate, personal surface
   and is left alone. */
function dismissForPractice(){
  CafeTopicsWheel.reset();
  var tb = document.querySelector('#screen .rc-btn[aria-label="Topics"]');
  if(tb) tb.setAttribute('aria-expanded', 'false');
}
/* Prototype control: draw the audio exercise design without a recording. */
function previewPracticeAudio(){
  if(ST.state !== 'live') setState('live');
  dismissDockTip();
  CafePractice.previewAudio();
}


/* =========================================================================
   7 · ENDING
   Time flies, then Find me another partner, or Go back to homepage.
   ========================================================================= */
/* =========================================================================
   7 · ENDING
   Time flies, then Find me another partner, or Go back to homepage.
   ========================================================================= */
function endingConfetti(){
  var C = '#373230';
  var colors = ['#F9E24C','#FFE300','#F69700','#F9746B','#90C7FC','#449CFC','#DAEF81','#7EE07C','#6BBFC4','#CEB1FF'];
  function ink(fill){
    return 'fill="'+fill+'" stroke="'+C+'" stroke-width="0.5" vector-effect="non-scaling-stroke"';
  }
  function shape(kind, fill){
    var a = ink(fill);
    if(kind === 'stroke') return '<svg viewBox="0 0 16 6" aria-hidden="true"><rect x="1.2" y="1.9" width="13.6" height="2.2" rx="1.1" '+a+'/></svg>';
    if(kind === 'circ') return '<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3.55" '+a+'/></svg>';
    return '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.2 L8.8 5 L5 8.8 L1.2 5 Z" '+a+'/></svg>';
  }
  var kinds = ['stroke','circ','dia'];
  var html = '<span class="ending-confetti" aria-hidden="true">';
  var i, x, drift, rot0, rot, size, delay, dur, kind;
  for(i=0;i<28;i++){
    x = 4 + (i * 3.4) % 92;
    drift = (i % 2 ? 18 : -22) + (i % 5) * 4;
    rot0 = (i % 2 ? -18 : 14) + (i % 7);
    rot = rot0 + (i % 2 ? 120 : -140);
    size = 10 + (i % 6) * 2;
    delay = (i % 9) * 0.12;
    dur = 3.4 + (i % 5) * 0.38;
    kind = kinds[i % 3];
    html += '<span class="ending-cf" style="--x:'+x+'%;--drift:'+drift+'px;--rot0:'+rot0+'deg;--rot:'+rot+'deg;--s:'+size+'px;--d:'+delay+'s;--dur:'+dur+'s">'
      + shape(kind, colors[i % colors.length]) + '</span>';
  }
  return html + '</span>';
}
function screenEnding(){
  return '<div class="transition-shell"></div>'
    + cafeLockup()
    + '<main class="cafe-stage cafe-ending">'
      + endingConfetti()
      + '<h2 class="cafe-display">Time flies!</h2>'
      + '<p class="cafe-sub">You and ' + GM.esc(PARTNER.name) + ' just spoke Hebrew for 6 minutes.</p>'
      + '<div class="cafe-acts">'
        + '<button class="primary-cta" type="button" onclick="matchAgain()">Find me another partner</button>'
        + '<button class="text-cta" type="button" onclick="leaveCafeHome()">Go back to homepage</button>'
      + '</div>'
    + '</main>';
}


/* ------------------------------------------------------------ transitions */
function seedFor(state){
  if(state === 'entry'){
    ST.matching = false; ST.searchElapsed = 0; ST.closeSheet = false; ST.textOpen = false;
    ST.textLog = []; ST.textDraft = ''; ST.chatExpanded = true; ST.leaveSheet = false; ST.left = 0; ST.levelsSheet = false;
    restoreLevelsDraft();
    ST.agreed = false; ST.keepOnSheet = false;
    ST.dockTip = false; ST.dockTipSeen = false;
    ST.finalNote = false; ST.finalNoteSeen = false;
    ST.handleCuePlayed = false;
    ST.rangeHintSeen = false;
    clearPartnerOff();
    clearTimeout(dockTipT); dockTipT = null;
    clearTimeout(finalNoteT); finalNoteT = null;
  }
  /* every Café entry runs the check, so it always starts from scratch */
  if(state === 'avcheck'){ ST.left = 0; ST.devSheet = false; ST.devMenu = null; micReset(); }
  if(state === 'searching'){
    ST.matching = true; ST.left = DUR.searchTo; ST.levelsSheet = false;
    restoreLevelsDraft();
    ST.closeSheet = false;
    ST.agreed = false;
    clearPartnerOff();
  }
  if(state === 'hub'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'flashcards'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'matched'){
    ST.matching = true;
    ST.matchPhase = 'offer';
    ST.offerLeft = DUR.offer;
    ST.matchEnter = true;
    ST.levelsSheet = false;
    restoreLevelsDraft();
    ST.closeSheet = false;
    ST.agreed = false;
  }
  /* Leaving Live: release everything the session owns. The one heartbeat
     (setInterval at boot) keeps running but does nothing outside its states. */
  if(state !== 'live'){
    CafeTopicsWheel.reset();
    CafePractice.reset();
    centerClockShown = false;
    clearTimeout(dockTipT); dockTipT = null;
    clearTimeout(finalNoteT); finalNoteT = null;
  }
  if(state === 'live'){
    CafeTopicsWheel.reset();
    CafePractice.reset();
    centerClockShown = false;
    ST.left = DUR.session; ST.textLog = cafeChatSeed(); ST.textOpen = false; ST.textDraft = ''; ST.chatExpanded = true;
    ST.leaveSheet = false; ST.keepOnSheet = false;
    clearPartnerOff();
    ST.finalNote = false; ST.finalNoteSeen = false;
    clearTimeout(finalNoteT); finalNoteT = null;
    if(!ST.dockTipSeen) armDockTip();
    else ST.dockTip = false;
  }
  if(state === 'ending'){
    ST.left = DUR.ending; ST.textOpen = false; ST.leaveSheet = false;
    ST.keepOnSheet = false; clearPartnerOff();
    ST.finalNote = false;
    clearTimeout(finalNoteT); finalNoteT = null;
  }
}
function setState(state){
  if(ORDER.indexOf(state) === -1) state = 'entry';
  ST.state = state;
  seedFor(state);
  try{ history.replaceState(null, '', cafeLocation(state)); }catch(e){}
  render();
}

/* ------------------------------------------------------- product actions */
function toggleLevel(id){
  var index = LEVEL_DATA.eligible.indexOf(id);
  if(index === -1) return;
  tapSpectrumLevel(index);
}
function selectAllLevels(){ applyLevelRange(0, LEVEL_DATA.eligible.length - 1); }
function selectOnlyMine(){ var me = myLevelIndex(); applyLevelRange(me, me); }
function leaveCafeHome(){
  /* Entry and A/V check have not started matching. The same X closes Café
     and returns to the Hub placeholder. Later matching/live states keep
     their own leave. */
  ST.matching = false;
  ST.welcomePlayed = false;
  ST.state = 'hub';
  ST.left = 0;
  try{ history.replaceState(null, '', '#hub'); }catch(e){}
  render();
}
/* Editing mid-search does not pause the search. The sheet edits the same
   range as Entry; Keep searching commits it, X / Back / scrim restore it. */
function openLevels(){
  ST.levelsSaved = [ST.rangeLo, ST.rangeHi];
  ST.levelsSheet = true;
  render();
}
function applyLevels(){
  ST.levelsSaved = null;
  ST.levelsSheet = false;
  render();
}
function restoreLevelsDraft(){
  if(!ST.levelsSaved) return;
  ST.rangeLo = ST.levelsSaved[0];
  ST.rangeHi = ST.levelsSaved[1];
  ST.selected = selectedFromRange(ST.rangeLo, ST.rangeHi);
  ST.levelsSaved = null;
}
function dismissLevels(){
  if(!ST.levelsSheet) return;
  restoreLevelsDraft();
  ST.levelsSheet = false;
  render();
}
function closeLevels(){ applyLevels(); }

function goAvCheck(){ if(!ST.selected.length) return; setState('avcheck'); }
function goBackFromAvCheck(){
  if(ST.devSheet){ closeDevices(); return; }
  ST.welcomePlayed = true;
  ST.entryReturnToLevels = true;
  ST.state = 'entry';
  try{ history.replaceState(null, '', '#entry'); }catch(e){}
  render();
}
function goBackFromSearch(){
  if(ST.levelsSheet){ dismissLevels(); return; }
  ST.closeSheet = false;
  ST.matching = false;
  ST.searchElapsed = 0;
  setState('avcheck');
}
function startMatching(){
  if(!ST.selected.length || ST.perm !== 'granted') return;
  ST.searchElapsed = 0;
  ST.closeSheet = false;
  setState('searching');
}
/* Leaving the search screen does not stop the search. */
function keepExploring(){
  ST.closeSheet = false;
  ST.state = 'hub';
  try{ history.replaceState(null,'','#hub'); }catch(e){}
  render();
}
function keepMatchingExplore(){ keepExploring(); }
function openSearch(){
  ST.closeSheet = false;
  ST.state = 'searching';
  try{ history.replaceState(null,'','#searching'); }catch(e){}
  render();
}
function openCloseDecision(){
  if(ST.levelsSheet){ dismissLevels(); return; }
  if(ST.state !== 'searching') return;
  if(ST.closeSheet){ dismissCloseDecision(); return; }
  ST.closeSheet = true;
  if(document.getElementById('searchClosePop')) return;
  var host = document.getElementById('screen');
  if(!host) return;
  host.insertAdjacentHTML('beforeend', closeDecisionMarkup());
  var btn = document.getElementById('searchClose');
  if(btn) btn.setAttribute('aria-expanded', 'true');
  bindCloseDecisionFocus();
}
function dismissCloseDecision(){
  ST.closeSheet = false;
  var pop = document.getElementById('searchClosePop');
  if(pop){
    var prev = pop.previousElementSibling;
    if(prev && prev.classList.contains('sheet-scrim')) prev.remove();
    pop.remove();
  }
  var btn = document.getElementById('searchClose');
  if(btn){
    btn.setAttribute('aria-expanded', 'false');
    btn.focus();
  }
}
function bindCloseDecisionFocus(){
  var pop = document.getElementById('searchClosePop');
  if(!pop) return;
  var nodes = pop.querySelectorAll('button:not([disabled])');
  if(!nodes.length) return;
  var primary = pop.querySelector('.btn.primary');
  (primary || nodes[0]).focus();
  if(pop._trap) pop.removeEventListener('keydown', pop._trap);
  pop._trap = function(e){
    if(e.key !== 'Tab') return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  };
  pop.addEventListener('keydown', pop._trap);
}
function bindMatchTakeover(shouldFocus){
  var root = document.getElementById('matchTakeover');
  if(!root) return;
  var nodes = root.querySelectorAll('button:not([disabled])');
  if(!nodes.length) return;
  var primary = root.querySelector('.btn.primary');
  if(shouldFocus) (primary || nodes[0]).focus();
  if(root._trap) root.removeEventListener('keydown', root._trap);
  root._trap = function(e){
    if(e.key !== 'Tab') return;
    var list = root.querySelectorAll('button:not([disabled])');
    if(!list.length) return;
    var first = list[0], last = list[list.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  };
  root.addEventListener('keydown', root._trap);
}
/* The single exit. Matching ends here, or when the app closes. */
function stopMatching(){
  ST.closeSheet = false;
  setState('entry');
  GM.toast('Matching stopped.');
}

function offerMatch(){
  ST.bg = (ST.state === 'flashcards') ? 'flashcards'
        : (ST.state === 'searching') ? 'searching' : 'hub';
  setState('matched');
}
function acceptMatch(){
  ST.matchPhase = 'accepted';
  ST.left = DUR.partnerConfirm;
  render();
}
/* Declined by you, declined by the partner, or the window ran out: all three
   return to background matching. */
function declineMatch(){
  ST.agreed = false;
  ST.matching = true;
  ST.left = DUR.searchTo;
  ST.searchElapsed = 0;
  ST.closeSheet = false;
  /* back to whatever the interrupt landed on, mid-deck included */
  ST.state = ST.bg;
  try{ history.replaceState(null, '', '#' + ST.state); }catch(e){}
  render();
}
function partnerDeclines(){
  declineMatch();
  GM.toast(PARTNER.name + ' kept looking. Still matching\u2026');
}
function bothAccepted(){ setState('agreement'); }

/* Quiet back: return to the same partner offer. Never reject, never leave Café. */
function backFromAgreement(){
  if(ST.offerLeft <= 0){
    expirePartnerOffer();
    return;
  }
  ST.matchPhase = 'offer';
  ST.matchEnter = false;
  ST.state = 'matched';
  try{ history.replaceState(null, '', cafeLocation('matched')); }catch(e){}
  render();
}
function expirePartnerOffer(){
  ST.agreed = false;
  ST.matching = true;
  ST.matchPhase = 'offer';
  ST.matchEnter = false;
  ST.left = DUR.searchTo;
  ST.searchElapsed = 0;
  ST.closeSheet = false;
  ST.bg = 'searching';
  ST.state = 'searching';
  try{ history.replaceState(null, '', cafeLocation('searching')); }catch(e){}
  render();
  GM.toast('The window closed. Still matching\u2026');
}

function onAgreeAck(el){
  ST.agreed = !!(el && el.checked);
  var btn = document.getElementById('agreeCta');
  if(btn) btn.disabled = !ST.agreed;
  var row = el && el.closest('.agree-ack');
  if(row) row.classList.toggle('is-on', ST.agreed);
}
function enterCafe(){ if(!ST.agreed) return; setState('live'); }

function setPerm(p){ ST.perm = p; render(); }
function toggleCam(){
  dismissDockTip();
  ST.camOff = !ST.camOff;
  if(!syncLiveAV()) render();
}
function toggleMic(){
  dismissDockTip();
  ST.micOff = !ST.micOff;
  if(ST.micOff) micReset();
  if(!syncLiveAV()) render();
}
function toggleBlur(){ ST.blur = !ST.blur; render(); }

/* the mic test — record a few seconds, then hear it back */
var MIC_LEN = 4;
function micReset(){ ST.mic = {phase:'idle', left:0, pos:0}; }
function micRecord(){
  if(ST.micOff){ GM.toast('Turn your microphone on to test it'); return; }
  ST.mic = {phase:'recording', left:MIC_LEN, pos:0};
  render();
}
function micStop(){ ST.mic.phase = 'ready'; ST.mic.pos = 0; render(); }
function micPlay(){ ST.mic.phase = 'playing'; ST.mic.pos = 0; render(); }
function micPause(){ ST.mic.phase = 'ready'; render(); }

function openDevices(){ ST.devSheet = true; ST.devMenu = null; render(); }
function closeDevices(){ ST.devSheet = false; ST.devMenu = null; render(); }
function toggleDevMenu(key){
  ST.devMenu = ST.devMenu === key ? null : key;
  render();
}
function pickDevice(key, value){
  DEVICES[key].value = value;
  ST.devMenu = null;
  render();
}

/* optional practice while the queue runs. Not a room, and not a reason to stay. */
function openFlashcards(){ ST.closeSheet = false; setState('flashcards'); }
function closeFlashcards(){ ST.state = 'searching'; try{ history.replaceState(null,'','#searching'); }catch(e){} render(); }
function cardReveal(){ ST.cardRevealed = true; render(); }
function cardFlip(){ ST.cardRevealed = !ST.cardRevealed; ST.cardPlaying = false; render(); }
function cardMark(){ ST.cardMarked = !ST.cardMarked; render(); }
function cardPlay(){ ST.cardPlaying = !ST.cardPlaying; render(); }
function cardStep(d){ ST.card += d; ST.cardRevealed = false; ST.cardMarked = false; ST.cardPlaying = false; render(); }
function cardPrev(){ cardStep(-1); }
function cardNext(){ cardStep(1); }

/* Entry points only in this pass — the experiences themselves are not designed. */
/* The wheel replaces the chat, it never opens over it: an open chat closes
   first (its draft is kept), then the wheel comes up. */
function openWheel(){
  dismissDockTip();
  CafePractice.dismiss();
  if(ST.textOpen){ ST.textOpen = false; render(); }
  CafeTopicsWheel.open();
}
/* Practice: one shared exercise on the seam (see CafePractice). */
function openChallenge(){ dismissDockTip(); CafePractice.open(); }

function toggleText(){
  dismissDockTip();
  ST.textOpen = !ST.textOpen;
  if(ST.textOpen && !(ST.textLog && ST.textLog.length)) ST.textLog = cafeChatSeed();
  render();
}
function closeText(){ ST.textOpen = false; render(); }
function toggleChatExpand(){
  ST.chatExpanded = !ST.chatExpanded;
  render();
}
function cafeChatType(el){
  ST.textDraft = el.value;
  var sd = document.getElementById('cafeChatSend');
  if(sd) sd.classList.toggle('active', !!el.value.trim());
}
function cafeChatKey(ev){
  if(ev.key === 'Enter'){ ev.preventDefault(); sendText(); }
}
function syncCafeChatFade(){
  var feed = document.getElementById('cafeChatHistory');
  if(!feed || !ST.chatExpanded) return;
  feed.classList.toggle('fade-top', feed.scrollTop > 8);
  feed.classList.toggle('fade-bottom', (feed.scrollHeight - feed.scrollTop - feed.clientHeight) > 8);
}
function sendText(){
  var el = document.getElementById('cafeChatInput');
  var text = ((el && el.value) || ST.textDraft || '').trim();
  if(!text) return;
  ST.textLog.push({sender:'own', name:'You', text:text});
  ST.textDraft = '';
  if(el) el.value = '';
  render();
}
function openLeave(){ dismissDockTip(); dismissFinalNote(); ST.leaveSheet = true; ST.keepOnSheet = false; ST.partnerOffSheet = false; clearTimeout(partnerOffT); render(); }
function closeLeave(){ ST.leaveSheet = false; render(); }
function closeKeepOn(){ ST.keepOnSheet = false; render(); }
var partnerOffT = null;
var dockTipT = null;
function armDockTip(){
  ST.dockTip = true;
  clearTimeout(dockTipT);
  dockTipT = setTimeout(function(){
    dockTipT = null;
    dismissDockTip();
  }, 8000);
}
function dismissDockTip(){
  clearTimeout(dockTipT);
  dockTipT = null;
  if(!ST.dockTip) return;
  ST.dockTip = false;
  ST.dockTipSeen = true;
  var el = document.querySelector('.dock-tip:not(.final-note)');
  if(!el) return;
  el.classList.add('is-out');
  el.setAttribute('disabled','');
  setTimeout(function(){ if(el.parentNode) el.remove(); }, 220);
}
var finalNoteT = null;
/* The large countdown on the seam now says this. A second "20 seconds left"
   bubble over the footer would repeat it and crowd the controls. */
var FINAL_NOTE_ENABLED = false;
function armFinalNote(){
  if(!FINAL_NOTE_ENABLED) return;
  if(ST.finalNote || ST.finalNoteSeen) return;
  if(ST.state !== 'live' || ST.left > 20) return;
  dismissDockTip();
  ST.finalNote = true;
  clearTimeout(finalNoteT);
  finalNoteT = setTimeout(function(){
    finalNoteT = null;
    dismissFinalNote();
  }, 4500);
}
function mountFinalNote(){
  if(!ST.finalNote) return;
  if(ST.textOpen || ST.leaveSheet || ST.keepOnSheet || ST.partnerOffSheet) return;
  if(document.querySelector('.final-note')) return;
  var footer = document.querySelector('.rfooter');
  if(!footer) return;
  footer.insertAdjacentHTML('afterbegin', finalNoteHtml());
}
function dismissFinalNote(){
  clearTimeout(finalNoteT);
  finalNoteT = null;
  if(!ST.finalNote) return;
  ST.finalNote = false;
  ST.finalNoteSeen = true;
  var el = document.querySelector('.final-note');
  if(!el) return;
  el.classList.add('is-out');
  el.setAttribute('disabled','');
  setTimeout(function(){ if(el.parentNode) el.remove(); }, 220);
}
function replayDockTip(){
  ST.dockTipSeen = false;
  if(ST.state !== 'live'){ setState('live'); return; }
  armDockTip();
  render();
}
function clearPartnerOff(){
  clearTimeout(partnerOffT);
  partnerOffT = null;
  ST.partnerOffSheet = false;
  ST.partnerOffFind = false;
  ST.partnerCamOff = false;
  ST.partnerMicOff = false;
}
function schedulePartnerOffFind(){
  clearTimeout(partnerOffT);
  partnerOffT = setTimeout(function(){
    partnerOffT = null;
    if(!ST.partnerOffSheet) return;
    ST.partnerOffFind = true;
    var el = document.querySelector('.partner-off-sheet');
    if(el){
      el.classList.add('is-wait');
      var acts = el.querySelector('.po-acts');
      if(acts) acts.setAttribute('aria-hidden','false');
    }
  }, DUR.partnerOffWait * 1000);
}
function partnerDropped(){
  dismissDockTip();
  dismissFinalNote();
  if(ST.state !== 'live'){
    ST.state = 'live';
    seedFor('live');
    try{ history.replaceState(null, '', '#live'); }catch(e){}
  }
  ST.partnerCamOff = true;
  ST.partnerMicOff = true;
  ST.partnerOffSheet = true;
  ST.partnerOffFind = false;
  ST.leaveSheet = false;
  ST.keepOnSheet = false;
  schedulePartnerOffFind();
  render();
}
function partnerReconnected(){
  if(!ST.partnerOffSheet && !ST.partnerCamOff && !ST.partnerMicOff) return;
  clearPartnerOff();
  render();
}
function chatAgain(){ setState('live'); }
function matchAgain(){ startMatching(); }
function findNewPartner(){
  clearPartnerOff();
  setState('searching');
}
/* Ends this chat. Matching stays live and picks up again on its own. */
function endSession(){ ST.leaveSheet = false; ST.keepOnSheet = false; clearPartnerOff(); setState('ending'); }


/* --------------------------------------------------------------- the clock */
var TIMED = {avcheck:1, searching:1, hub:1, flashcards:1, matched:1, agreement:1, live:1};

function tick(){
  if(!ST.clockOn || !TIMED[ST.state]) return;
  var s = ST.state;

  if(s === 'avcheck'){
    if(ST.mic.phase === 'recording'){
      ST.mic.left--;
      if(ST.mic.left <= 0){ micStop(); return; }
      syncClock();
    } else if(ST.mic.phase === 'playing'){
      ST.mic.pos++;
      if(ST.mic.pos >= MIC_LEN){ micPause(); return; }
      render();
    }
    return;
  }
  if(s === 'searching' || s === 'hub' || s === 'flashcards'){
    if(!ST.matching) return;
    ST.searchElapsed++;
    ST.left--;
    if(ST.left <= 0){ offerMatch(); return; }
    syncClock();
    return;
  }
  if(s === 'matched'){
    if(ST.matchPhase === 'accepted'){
      ST.left--;
      if(ST.left <= 0){ bothAccepted(); }
      return;
    }
    ST.offerLeft--;
    if(ST.offerLeft <= 0){
      declineMatch();
      GM.toast('The window closed. Still matching\u2026');
      return;
    }
    syncClock();
    return;
  }
  if(s === 'agreement'){
    ST.offerLeft--;
    if(ST.offerLeft <= 0){
      expirePartnerOffer();
      return;
    }
    return;
  }
  if(s === 'live'){
    ST.left--;
    if(ST.left <= 0){ setState('ending'); return; }
    if(ST.left === 20){
      armFinalNote();
      mountFinalNote();
    }
    syncClock();
    return;
  }
}

/* Patch the clock in place so the live video shell, the text panel scroll and
   the input focus survive every tick. */
function syncClock(){
  if(ST.state === 'avcheck'){
    var mc = document.querySelector('.mic-test .mt-count');
    if(mc) mc.textContent = ST.mic.left + 's';
    return;
  }
  if(ST.state === 'searching'){
    updateNote();
    return;
  }
  if(ST.state === 'matched'){
    var n = document.getElementById('offerNum');
    if(n) n.textContent = ST.offerLeft + 's';
    var t = document.querySelector('.match-timer');
    if(t) t.classList.toggle('is-low', ST.offerLeft <= 10);
    updateNote();
    return;
  }
  if(ST.state === 'live'){
    var pill = document.querySelector('.room-time');
    if(pill){
      var t = pill.querySelector('.tval');
      if(t) t.textContent = GM.mmss(ST.left);
      pill.classList.toggle('final', ST.left <= DUR.sessionFinal);
    }
    var box = document.getElementById('cafeClock');
    if(box){
      var center = ST.left <= DUR.sessionCenter;
      if(center && !box.classList.contains('is-center')) centerClockShown = true;
      if(!center) centerClockShown = false;
      box.classList.toggle('is-center', center);
    }
  }
  updateNote();
}


/* ------------------------------------------------------------------ render */
function render(){
  var el = document.getElementById('screen');
  if(!el) return;
  var s = ST.state, html = '';
  if(s === 'entry')           html = screenEntry();
  else if(s === 'avcheck')    html = screenAvCheck();
  else if(s === 'searching')  html = screenSearching();
  else if(s === 'hub')        html = screenHub();
  else if(s === 'flashcards') html = screenFlashcards();
  else if(s === 'matched')    html = screenMatched();
  else if(s === 'agreement')  html = screenAgreement();
  else if(s === 'live')       html = screenLive();
  else if(s === 'ending')     html = screenEnding();

  var entryScroll = (s === 'entry' && el.classList.contains('is-entry')) ? el.scrollTop : 0;
  el.classList.toggle('is-entry', s === 'entry');
  el.innerHTML = GM.statusbar() + html;
  CafeTopicsWheel.sync(el, s);
  CafePractice.sync(el, s);
  if(s === 'live') armCenterClock(); else centerClockShown = false;
  el.classList.toggle('on-light', s === 'hub' || (s === 'matched' && ST.bg === 'hub'));
  if(s === 'entry'){
    sizeEntryWelcome(el);
    if(ST.entryReturnToLevels){
      ST.entryReturnToLevels = false;
      var levelsEl = document.getElementById('cafeLevels');
      el.scrollTop = levelsEl ? cafeLevelScrollTarget(el, levelsEl) : 0;
    } else {
      el.scrollTop = entryScroll;
    }
    bindEntryPage(el);
  } else {
    unbindEntryPage();
    el.style.removeProperty('--cafe-welcome-h');
    el.style.removeProperty('--cafe-levels-h');
    el.style.removeProperty('--cafe-stage-h');
    el.style.removeProperty('--cafe-peek');
    el.classList.remove('is-short');
    el.scrollTop = 0;
    if(document.getElementById('levelSpectrum')) bindSpectrum(el);
  }

  if(ST.textOpen){
    var history = document.getElementById('cafeChatHistory');
    if(history){
      history.scrollTop = history.scrollHeight;
      history.addEventListener('scroll', syncCafeChatFade);
      syncCafeChatFade();
    }
    var input = document.getElementById('cafeChatInput');
    if(input){
      input.focus();
      input.addEventListener('keydown', cafeChatKey);
    }
  }
  syncSwitcher();
  if(ST.closeSheet && ST.state === 'searching') bindCloseDecisionFocus();
  if(s === 'matched'){
    var entering = ST.matchEnter;
    bindMatchTakeover(entering);
    ST.matchEnter = false;
  }
  if(document.body.classList.contains('show-anim-debug')) renderAnimDebugGrid();
}


/* ---------------------------------------------------------------- switcher */
function syncSwitcher(){
  document.querySelectorAll('.sc').forEach(function(b){
    b.classList.toggle('on', b.dataset.sc === ST.state);
  });
  var clockBtn = document.getElementById('clockBtn');
  if(clockBtn){
    clockBtn.classList.toggle('on', ST.clockOn);
    clockBtn.textContent = ST.clockOn ? 'Clock: running' : 'Clock: paused';
  }
  updateNote();
  syncSpecPreviewButtons();
}
function updateNote(){
  var note = document.getElementById('stateNote');
  if(!note) return;
  note.textContent = (NOTES[ST.state] || '')
    + '  \u00b7  matching ' + (ST.matching ? 'live' : 'stopped')
    + ' \u00b7 you are ' + GM.levelMeta(LEVEL_DATA.myLevel).label
    + ' \u00b7 open to ' + ST.selected.length + '/' + LEVEL_DATA.eligible.length + ' levels'
    + ' \u00b7 level data: ' + LEVEL_DATA.source
    + ' \u00b7 cam ' + (ST.camOff?'off':'on')
    + ' \u00b7 mic ' + (ST.micOff?'off':'on')
    + (ST.state === 'matched' ? ' \u00b7 offer ' + ST.offerLeft + 's (' + ST.matchPhase + ')' : '')
    + (ST.state === 'live' ? ' \u00b7 ' + GM.mmss(ST.left) + ' left' : '');
}
function toggleClock(){ ST.clockOn = !ST.clockOn; syncSwitcher(); }
function jumpFinal(){
  if(ST.state !== 'live') setState('live');
  ST.left = DUR.sessionCenter;
  centerClockShown = false;
  ST.finalNote = false;
  ST.finalNoteSeen = false;
  armFinalNote();
  render();
}
function runPath(){
  ST.clockOn = true;
  setState('entry');
  setTimeout(goAvCheck, 900);
  setTimeout(startMatching, 2200);
}

function replayWelcomeEntrance(){
  if(INTERVIEW) return;
  ST.welcomePlayed = false;
  if(ST.state === 'entry') render();
  else setState('entry');
  var screen = document.getElementById('screen');
  if(screen){
    screen.scrollTop = 0;
    syncEntryChoreography(screen);
  }
}

function onCafeKey(ev){
  if(ev.key !== 'Escape') return;
  if(ST.levelsSheet){ dismissLevels(); return; }
  if(ST.closeSheet){ dismissCloseDecision(); return; }
}

function reviewSearchInitial(){
  ST.clockOn = false;
  ST.matching = true;
  ST.searchElapsed = 0;
  ST.closeSheet = false;
  setState('searching');
}
function reviewSearchClose(){
  ST.clockOn = false;
  ST.matching = true;
  setState('searching');
  openCloseDecision();
}
function reviewHubMatching(){
  ST.clockOn = false;
  ST.matching = true;
  ST.closeSheet = false;
  keepExploring();
}
function reviewMatchingStopped(){
  ST.clockOn = false;
  stopMatching();
}

/* -------------------------------------------------------------------- boot */
function applyHash(){
  if(INTERVIEW) return;
  var h = (location.hash || '').replace('#','');
  if(h && ORDER.indexOf(h) !== -1 && h !== ST.state) setState(h);
}
(function boot(){
  var p = new URLSearchParams(location.search);
  INTERVIEW = p.get('mode') === 'interview';
  if(INTERVIEW){
    document.body.classList.add('present', 'interview');
    ST.state = 'entry';
    try{ history.replaceState(null, '', location.pathname + '?mode=interview#entry'); }catch(e){}
  } else {
    var s = p.get('state') || (location.hash || '').replace('#','');
    if(s && ORDER.indexOf(s) !== -1) ST.state = s;
    if(p.get('mode') === 'presentation') document.body.classList.add('present');
  }
  if(p.get('animdebug') === '1' && !INTERVIEW) document.body.classList.add('show-anim-debug');
  if(!INTERVIEW){
    var phoneW = parseInt(p.get('w'), 10);
    if(phoneW >= 320 && phoneW <= 480){
      var phone = document.querySelector('.phone');
      if(phone) phone.style.width = phoneW + 'px';
    }
  }
  seedFor(ST.state);

  document.querySelectorAll('.sc[data-sc]').forEach(function(b){
    b.onclick = function(){
      if(INTERVIEW) return;
      var v = b.dataset.sc;
      /* the review switcher reaches every state directly, including the ones
         that are only ever entered from a background process */
      if(v === 'matched'){ ST.matching = true; ST.bg = 'searching'; ST.searchElapsed = 0; }
      if(v === 'hub' || v === 'flashcards') ST.matching = true;
      if(v === 'searching'){
        ST.matching = true;
        ST.searchElapsed = 0;
        ST.closeSheet = false;
      }
      setState(v);
    };
  });
  window.addEventListener('hashchange', applyHash);
  document.addEventListener('keydown', onCafeKey);

  render();
  if(!INTERVIEW){
    var review = p.get('review');
    if(review === 'search-initial') reviewSearchInitial();
    else if(review === 'search-close') reviewSearchClose();
    else if(review === 'hub-matching') reviewHubMatching();
    else if(review === 'stopped') reviewMatchingStopped();
  }
  setInterval(tick, 1000);
})();
