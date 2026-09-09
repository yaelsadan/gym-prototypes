/* ============================================================================
   CAFE MOBILE — state machine + screens
   ----------------------------------------------------------------------------
   One global ST, one render() that rebuilds #screen, setState() for
   transitions, a 1s tick for timed states, hash routing, and a switcher that
   stays in sync.

   Canonical path:
     entry -> avcheck -> searching -> (hub / flashcards, matching continues)
           -> matched -> matched/accepted -> agreement -> live -> ending -> hub

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
var DUR = {
  searchTo:22,        // searching -> a match is offered. Long enough to see two avatar blooms.
  exploreAfter:14,    // delayed "Explore while we match" reveal
  offer:30,           // the response window. Product value.
  partnerConfirm:4,   // the partner answers this long after you accept
  session:360,        // 6:00
  sessionFinal:30,    // the clock warms to yellow below this
  ending:7,           // ending -> back to the Hub, still matching
  partnerOffWait:9    // connection-issue sheet, then "Find me a new partner"
};

var SEARCH_COPY = 'We\u2019ll tell you the moment someone\u2019s free.';
var SEARCH_COPY_LATE = 'Still looking. Practice or explore as we match.';

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
   Four principles to scan, then one acknowledgement. No per-item ticks. */
var AGREEMENT_TERMS = [
  {icon:'welcome', lead:'Mistakes are welcome',          support:'Everyone here is learning.'},
  {icon:'hebrew',  lead:'Give Hebrew your best shot',    support:'Even a few words count.'},
  {icon:'present', lead:'Stay present for six minutes',  support:'Keep your camera and mic on.'},
  {icon:'kind',    lead:'Be kind to your partner',       support:'Help make the conversation feel safe and supportive.'}
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
  searching:'3 \u00b7 Active search. Matching is felt first. After ~14s, Flashcards stays put and Explore joins beneath it.',
  hub:'3b \u00b7 Placeholder Hub carrying the persistent matching indicator. The Hub itself is not designed in this pass.',
  flashcards:'3c \u00b7 Optional practice while waiting. The Gym Solo deck. A match interrupts it; declining returns here.',
  matched:'4 \u00b7 Match found. A 30s interrupt over whatever you were doing. Accept keeps the same surface and waits for the partner.',
  agreement:'5 \u00b7 Session agreement. Only after both accepted. Four principles to scan, one acknowledgement that enables the CTA. No decline.',
  live:'6 \u00b7 Live Cafe. The Gym Practice Room shell. Dock: Wheel \u00b7 Challenge \u00b7 Text, then Camera \u00b7 Mic.',
  ending:'7 \u00b7 Ending. Matching never stopped, so there is no "find someone now" \u2014 it requeues on its own.'
};

/* ------------------------------------------------------------------ state */
var ST = {
  state:'entry',
  /* what the match interrupt is layered over */
  bg:'hub',
  /* the Cafe matching session. Survives a chat ending; only stopMatching clears it. */
  matching:false,
  /* Continuous matching range. Derived list stays in ST.selected so later
     Café states can keep reading the same field. Own level is always inside. */
  rangeLo:0,
  rangeHi:LEVEL_DATA.eligible.length - 1,
  selected:LEVEL_DATA.eligible.slice(),
  matchPhase:'offer',     // offer | accepted
  matchLayout:'open',
  offerLeft:DUR.offer,
  searchElapsed:0,
  exploreShown:false,
  closeSheet:false,
  left:0,
  clockOn:true,
  camOff:false, micOff:false, blur:false,
  perm:'granted',
  mic:{phase:'idle', left:0, pos:0},   // idle | recording | ready | playing
  devSheet:false,
  levelsSheet:false,
  card:0, cardRevealed:false, cardMarked:false, cardPlaying:false,
  textOpen:false,
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
  if(ST.state === 'entry' && document.getElementById('levelSpectrum')){
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
}
function playCafeWelcomeGesture(welcome){
  cancelWelcomeAnim();
}

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
/* Own level, then the optional extras. Reused by the searching edit sheet. */
function otherEligible(){
  return LEVEL_DATA.eligible.filter(function(id){ return id !== LEVEL_DATA.myLevel; });
}
function ownLevelChip(){
  var id = LEVEL_DATA.myLevel;
  return '<div class="pref-own">'
    + '<span class="lvl-chip is-on is-me is-fixed" aria-label="' + GM.esc(GM.levelMeta(id).label) + ', your level">'
      + GM.levelDot(id)
      + '<span>' + GM.esc(GM.levelMeta(id).label) + '</span>'
      + '<span class="me-tag">\u00b7 your level</span>'
    + '</span>'
    + '</div>';
}
function additionalLevelChips(){
  var chips = '';
  otherEligible().forEach(function(id){
    chips += '<button type="button" class="lvl-chip' + (isSelected(id)?' is-on':'') + '"'
      + ' aria-pressed="' + isSelected(id) + '"'
      + ' onclick="toggleLevel(\'' + id + '\')">'
      + GM.levelDot(id) + '<span>' + GM.esc(GM.levelMeta(id).label) + '</span>'
      + '</button>';
  });
  return '<div class="lvl-row">' + chips + '</div>';
}
function levelPicker(opts){
  opts = opts || {};
  var extras = otherEligible();
  var extraOn = extras.filter(isSelected).length;
  var allExtra = extras.length > 0 && extraOn === extras.length;
  var heading = (opts.heading === false)
    ? ''
    : '<p class="pref-intro" id="cafeLevelsHeading">Who would you like to meet?</p>';
  var addAll = allExtra
    ? ''
    : '<button type="button" class="pref-add-all" onclick="selectAllLevels()">Add all</button>';
  var helper = allExtra
    ? ''
    : '<p class="pool-line">Adding more levels may help you match faster.</p>';

  return heading
    + ownLevelChip()
    + '<div class="pref-more">'
      + '<div class="pref-more-head">'
        + '<span class="pref-more-label">Open to more levels?</span>'
        + addAll
      + '</div>'
      + additionalLevelChips()
    + '</div>'
    + helper;
}

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
        + '<span class="cafe-header-mark" id="cafeHeaderMark">' + cafeCupsSvg('is-static') + '</span>'
        + '<span class="cafe-header-title">Caf\u00e9</span>'
      + '</div>'
      + '<button type="button" class="cafe-entry-close" onclick="leaveCafeHome()"'
        + ' aria-label="Close Caf\u00e9 and return home">' + GM.I.x + '</button>'
    + '</div>'
    + '<main class="cafe-entry-page">'
      + '<section class="cafe-welcome' + (ST.welcomePlayed ? '' : ' is-enter') + '" aria-label="Welcome">'
        + '<div class="cafe-welcome-lockup">'
          + '<div class="cafe-hero-slot" id="cafeHeroSlot">'
            + '<div class="cafe-hero-fly" id="cafeHeroFly">'
              + cafeCupsSvg('is-static')
            + '</div>'
          + '</div>'
          + '<h2 class="cafe-display cafe-welcome-title">Welcome to the <b>Caf\u00e9</b>!</h2>'
          + '<p class="cafe-sub cafe-welcome-sub">Grab a coffee and chat with a Hebrew partner, wherever they are in the world. Mistakes are welcome, this is all about having fun.</p>'
        + '</div>'
        + '<button type="button" class="cafe-scroll-cue" id="cafeScrollCue"'
          + ' aria-label="Scroll to choose who you would like to meet">'
          + '<span class="cue-icon" aria-hidden="true">' + GM.I.chevUp + '</span>'
        + '</button>'
      + '</section>'
      + '<section class="cafe-levels" id="cafeLevels" aria-labelledby="cafeLevelsHeading">'
        + '<div class="cafe-levels-inner" id="cafeLevelsFocus">'
          + '<div class="pref-copy">'
            + '<h2 class="pref-intro" id="cafeLevelsHeading">Who would you like to meet?</h2>'
            + '<p class="pref-lead">Everyone is included to start. Drag the ends, or tap a level, to narrow who you meet.</p>'
          + '</div>'
          + levelSpectrum()
          + '<div class="spec-feedback-row">'
            + '<p class="spec-feedback" id="specFeedback" aria-live="polite">'
              + GM.esc(rangeFeedbackCopy()) + '</p>'
          + '</div>'
          + '<div class="cafe-acts">'
            + '<button class="primary-cta" type="button" onclick="goAvCheck()"'
              + (ST.selected.length?'':' disabled') + '>Find a partner</button>'
          + '</div>'
        + '</div>'
      + '</section>'
    + '</main>';
}

var entryIo = null;
var entryOnScroll = null;
var entryCleanup = [];
var specDrag = null;
var specSettle = 0;
var specDidDrag = false;
function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function unbindEntryPage(){
  cancelWelcomeAnim();
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
function sizeEntryWelcome(screen){
  var h = screen.clientHeight;
  var short = h < 680;
  var peek = short ? 44 : 56;
  screen.classList.toggle('is-short', short);
  screen.style.setProperty('--cafe-peek', peek + 'px');
  screen.style.setProperty('--cafe-welcome-h', (h - peek) + 'px');
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

function easeEntry(t){
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
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
  var start = 0.08, end = 0.40;
  var t = Math.max(0, Math.min(1, (raw - start) / (end - start)));
  var reduced = prefersReducedMotion();
  if(reduced) t = raw > 0.22 ? 1 : 0;
  else t = easeEntry(t);

  screen.style.setProperty('--entry-head', String(t));
  screen.style.setProperty('--entry-title', t > 0.45 ? String(Math.min(1, (t - 0.45) / 0.35)) : '0');
  screen.style.setProperty('--entry-mark', t > 0.5 ? String(Math.min(1, (t - 0.5) / 0.35)) : '0');
  screen.classList.toggle('is-entry-deep', t > 0.4);

  if(fly && slot && !reduced){
    var dest = document.getElementById('cafeHeaderMark');
    if(dest){
      var a = fly.getBoundingClientRect();
      var b = dest.getBoundingClientRect();
      var dx = (b.left + b.width / 2) - (a.left + a.width / 2);
      var dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      var s = b.width && a.width ? b.width / a.width : 0.36;
      var sc = 1 + (s - 1) * t;
      fly.style.transform = 'translate(' + (dx * t) + 'px,' + (dy * t) + 'px) scale(' + sc + ')';
      fly.style.opacity = t < 0.55 ? '1' : String(Math.max(0, 1 - (t - 0.55) / 0.35));
    }
  } else if(fly){
    fly.style.transform = '';
    fly.style.opacity = t > 0.5 ? '0' : '1';
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
      el.style.opacity = String(1 - t);
      el.style.transform = 'translateY(' + (-14 * t) + 'px)';
    }
  }
  if(t > 0.02){
    fadeCopy(title);
    fadeCopy(sub);
  } else if(!welcome.classList.contains('is-enter')){
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
  var hideCue = ratio >= 0.32 || raw > 0.42;
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
  ST.welcomePlayed = true;
  cue.addEventListener('click', function(){
    screen.scrollTo({
      top: levels.offsetTop,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });
  });

  bindSpectrum(screen);
  syncSpecInsetButton();
  syncEntryChoreography(screen);
  entryOnScroll = function(){ syncEntryChoreography(screen); };
  screen.addEventListener('scroll', entryOnScroll, {passive:true});
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
function devicesSheet(){
  var body = '<h4>Audio &amp; camera settings</h4>';
  ['camera','mic','output'].forEach(function(key){
    var d = DEVICES[key], opts = '';
    d.options.forEach(function(o){
      opts += '<button type="button" class="dev-opt' + (o === d.value ? ' is-on' : '') + '"'
        + ' onclick="pickDevice(\'' + key + '\',\'' + o.replace(/'/g,"\\'") + '\')">'
        + '<span>' + GM.esc(o) + '</span><span class="tick">' + GM.I.check + '</span></button>';
    });
    body += '<div class="dev-group"><span class="dev-group-label">' + GM.esc(d.label) + '</span>' + opts + '</div>';
  });
  body += '<div class="dev-group"><span class="dev-group-label">Microphone test</span>' + micTest() + '</div>';
  return GM.sheet({
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
    + '<button type="button" class="search-close" onclick="leaveCafeHome()"'
      + ' aria-label="Close Café and return home">' + GM.I.x + '</button>'
    + '<main class="av-canon cafe-av">'
      + '<header class="av-head"><h2>Ready to be seen?</h2></header>'
      + '<section class="av-card" aria-label="Camera and microphone check"><div class="av-stage">'
        + GM.preview({camOff:ST.camOff, blur:ST.blur, img:IMG_YOU, label:'You'})
        + GM.avTools(ST, {cam:'toggleCam()', mic:'toggleMic()', blur:'toggleBlur()',
                          echo:liveMic})
      + '</div></section>'
      + permHelper()
      + '<footer class="av-foot">'
        + avSettingsLink()
        /* No partner exists yet at this point in the flow, so this cannot name
           one the way the Gym A/V privacy line does. */
        + '<p class="av-privacy">Your partner will see and hear you for the whole chat. Nothing is recorded.</p>'
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
    onScrim:'closeLevels()',
    body:'<h4>Who would you like to meet?</h4>' + levelPicker({heading:false}),
    acts:'<button class="btn primary" type="button" onclick="closeLevels()"'
      + (ST.selected.length?'':' disabled') + '>Keep searching</button>'
  });
}
/* Ambient dotted globe — the Citizen Café map. Presence is yellow pins;
   a couple of them briefly bloom into a face, then recede. Scan is thin
   cream arcs that fade in and out as they travel, never a hard line. */
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
function searchExploreReady(){
  return !!(ST.exploreShown || ST.searchElapsed >= DUR.exploreAfter);
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
function searchSupportCopy(late){
  return '<div class="search-support" aria-live="polite">'
    + '<p class="search-support-msg' + (late ? '' : ' is-on') + '" id="searchSupportA">' + SEARCH_COPY + '</p>'
    + '<p class="search-support-msg' + (late ? ' is-on' : '') + '" id="searchSupportB">' + SEARCH_COPY_LATE + '</p>'
    + '</div>';
}
function searchExploreBtn(late){
  return '<button type="button" class="search-explore" id="searchExplore" onclick="keepExploring()"'
    + (late ? '' : ' tabindex="-1" aria-hidden="true"')
    + '>Explore while we match</button>';
}
function searchActionRail(){
  var late = searchExploreReady();
  return '<div class="search-actions" id="searchActions">'
    + searchPracticeBtn()
    + searchExploreBtn(late)
    + '</div>';
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
    acts:'<button class="btn primary" type="button" onclick="keepMatchingExplore()">Keep matching &amp; explore</button>'
      + '<button class="btn" type="button" onclick="stopMatching()">Stop matching</button>'
      + '<button class="btn search-close-cancel" type="button" onclick="dismissCloseDecision()">Cancel</button>'
  });
  return html.replace('role="dialog"', 'id="searchClosePop" role="dialog" aria-labelledby="searchCloseTitle" aria-describedby="searchCloseBody"');
}
function screenSearching(){
  var late = searchExploreReady();
  return '<div class="transition-shell"></div>'
    + cafeLockup()
    + searchCloseBtn()
    + '<main class="cafe-stage searching-stage' + (late ? ' is-late is-ready' : '') + '">'
      + '<div class="search-hero">'
        + '<div class="search-stack">'
          + searchMap()
          + '<div class="search-status">'
            + '<h2 class="cafe-display">Looking for a partner\u2026</h2>'
            + searchSupportCopy(late)
          + '</div>'
          + searchActionRail()
          + searchScopeLine()
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
   4 · MATCH FOUND  —  a centred interrupt, distinct from the Gym sheets
   ========================================================================= */
function matchLevelFact(id){
  var meta = GM.levelMeta(id);
  var icon = LEVEL_ICONS[id]
    ? '<img class="fact-ico" src="' + LEVEL_ICONS[id] + '" alt="" aria-hidden="true">'
    : GM.levelDot(id);
  return '<span class="fact fact-level">'
    + icon + GM.esc(meta.label) + '</span>';
}

function setMatchLayout(id){
  ST.matchLayout = id === 'framed' ? 'framed' : 'open';
  if(ST.state !== 'matched'){
    ST.matching = true;
    ST.bg = 'hub';
    setState('matched');
    return;
  }
  render();
}

function matchSheet(){
  var accepted = (ST.matchPhase === 'accepted');
  var low = ST.offerLeft <= 10;
  var framed = ST.matchLayout === 'framed';

  var card = '<div class="match-card' + (accepted?' is-waiting':'') + (framed?' is-framed':'') + '">'
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
      + '<span class="ice-label">' + GM.esc(PARTNER.ice.label) + '</span>'
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
    ? '<button class="btn" type="button" onclick="declineMatch()">Keep looking instead</button>'
    : '<button class="btn primary" type="button" onclick="acceptMatch()">Meet ' + GM.esc(PARTNER.name) + '</button>'
      + '<button class="btn" type="button" onclick="declineMatch()">Keep looking</button>';

  var footer = accepted ? ''
    : '<div class="match-timer' + (low?' is-low':'') + '">'
      + '<span class="match-timer-num" id="offerNum">' + ST.offerLeft + 's</span>'
      + '<div class="respline"><i style="animation-duration:' + ST.offerLeft + 's"></i></div>'
    + '</div>';

  return GM.sheet({
    milky:true,
    cls:'match-sheet',
    body:'<h4>We found you a Caf\u00e9 partner!</h4>' + card,
    acts:acts,
    footer:footer
  });
}
/* The match lands on top of whatever the student was doing — the Hub, the
   search screen, or a flashcard mid-deck. */
function screenMatched(){
  var behind = screenHub();
  if(ST.bg === 'searching') behind = screenSearching();
  else if(ST.bg === 'flashcards') behind = screenFlashcards();
  return behind + matchSheet();
}


/* =========================================================================
   5 · SESSION AGREEMENT  —  both sides accepted
   A/V was settled before matching, so this leads straight into the chat.
   Principles are statements, not tasks. One acknowledgement enables the CTA.
   ========================================================================= */
function agreeIcon(kind){
  var paths = {
    welcome:'<path d="M12 3.6v2.4M12 18v2.4M3.6 12h2.4M18 12h2.4M6.2 6.2l1.7 1.7M16.1 16.1l1.7 1.7M17.8 6.2l-1.7 1.7M7.9 16.1l-1.7 1.7"/><circle cx="12" cy="12" r="2.8"/>',
    hebrew:'<path d="M5.5 8.2h10a2.8 2.8 0 010 5.6h-4.2L7.2 17.2v-3.4H5.5a2.8 2.8 0 010-5.6z"/>',
    present:'<circle cx="12" cy="12" r="7.4"/><path d="M12 8.2v4.1l2.5 1.5"/>',
    kind:'<path d="M12 18.2S6 14.2 6 10.4A3.2 3.2 0 0112 8.6a3.2 3.2 0 016 1.8c0 3.8-6 7.8-6 7.8z"/>'
  };
  return '<span class="agree-mark" aria-hidden="true">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + (paths[kind] || '') + '</svg></span>';
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
      + '<span class="agree-check">'
        + '<input id="agreeAck" type="checkbox"' + (ST.agreed?' checked':'') + ' onchange="onAgreeAck(this)">'
        + '<span class="agree-box" aria-hidden="true"></span>'
      + '</span>'
      + '<span class="agree-ack-copy">I\u2019m ready to show up for my partner.</span>'
    + '</label>';
  return '<div class="transition-shell"></div>'
    + cafeLockup('with ' + PARTNER.name)
    + GM.sheet({
        milky:true,
        cls:'agree-sheet',
        body:'<h4>Before you sit down</h4>'
          + '<p class="agree-intro">Before jumping into the Caf\u00e9, here\u2019s what we\u2019re both agreeing to:</p>'
          + '<ul class="agree-list">' + list + '</ul>'
          + ack,
        acts:'<button class="btn primary" id="agreeCta" type="button" onclick="enterCafe()"'
          + (ST.agreed?'':' disabled') + '>Caf\u00e9 time!</button>'
      });
}


/* =========================================================================
   6 · LIVE CAFE  —  the Gym Practice Room mobile shell
   Conversation-support tools lead the dock; device controls follow the divider.
   Wheel and Challenge are entry points only in this pass.
   ========================================================================= */
function textSheet(){
  var log = '';
  ST.textLog.forEach(function(m){
    log += '<div class="ts-msg' + (m.own?' own':'') + '">' + GM.esc(m.text) + '</div>';
  });
  return GM.sheet({
    cls:'text-sheet',
    bare:true,
    body:'<div class="ts-head"><span class="ts-kicker">Right now</span>'
      + '<button class="ts-close" type="button" onclick="closeText()" aria-label="Close">' + GM.I.x + '</button></div>'
      + '<div class="ts-activity"><div class="ts-title">' + GM.esc(ACTIVITY.title) + '</div>'
      + '<div class="ts-body">' + GM.esc(ACTIVITY.body) + '</div></div>'
      + (log ? '<div class="ts-log" id="tsLog">' + log + '</div>' : '')
      + '<div class="ts-input">'
        + '<input id="tsInput" type="text" placeholder="Spell it, or type a short answer\u2026" autocomplete="off">'
        + '<button class="ts-send" type="button" onclick="sendText()" aria-label="Send">' + GM.I.send + '</button>'
      + '</div>'
      + '<p class="ts-note">Nothing here is saved after this chat.</p>'
  });
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
    + '<span class="dock-tip-copy">Stuck? Lean on the toolbar for topics and exercises.</span>'
    + '<span class="dock-tip-arrow" aria-hidden="true"></span>'
    + '</button>';
}
function screenLive(){
  var dock = GM.dock([
    {icon:GM.I.wheel, cap:'Wheel',     cls:' accent', onclick:'openWheel()',    aria:'Spin the Wheel'},
    {icon:GM.I.bolt,  cap:'Challenge', onclick:'openChallenge()', aria:'Challenge mode'},
    {icon:GM.I.chat,  cap:'Text',      on:ST.textOpen, onclick:'toggleText()',  aria:'Activity and text'},
    null,
    {icon:GM.I.cam,   cap:'Camera',    slash:ST.camOff, onclick:'toggleCam()',  aria:ST.camOff?'Turn camera on':'Turn camera off'},
    {icon:GM.I.mic,   cap:'Mic',       slash:ST.micOff, onclick:'toggleMic()',  aria:ST.micOff?'Unmute':'Mute'}
  ], {label:'Leave & report', onclick:'openLeave()'});
  var sheetOpen = ST.textOpen || ST.leaveSheet || ST.keepOnSheet || ST.partnerOffSheet;
  if(ST.dockTip && !sheetOpen){
    dock = dock.replace('<div class="rfooter">', '<div class="rfooter">' + dockTipHtml());
  }

  return GM.roomHeader(
      GM.roomTime(ST.left, {cap:'Chat', final:ST.left <= DUR.sessionFinal}),
      'openLeave()'
    )
    + '<div class="rstage">'
      + GM.half('top', PARTNER.name, {img:PARTNER.img, camOff:ST.partnerCamOff, micOff:ST.partnerMicOff})
      + GM.half('bottom', 'You', {img:IMG_YOU, camOff:ST.camOff, micOff:ST.micOff})
    + '</div>'
    + dock
    + (ST.textOpen ? textSheet() : '')
    + (ST.leaveSheet ? leaveSheet() : '')
    + (ST.keepOnSheet ? keepOnSheet() : '')
    + (ST.partnerOffSheet ? partnerOffSheet() : '');
}


/* =========================================================================
   7 · ENDING / AUTOMATIC REQUEUE
   Matching never stopped, so there is no "find someone now".
   ========================================================================= */
function screenEnding(){
  return '<div class="transition-shell"></div>'
    + cafeLockup()
    + '<main class="cafe-stage">'
      + '<h2 class="cafe-display">That was a good one</h2>'
      + '<p class="cafe-sub">Six minutes of Hebrew, out loud.</p>'
      + '<span class="end-partner"><span class="av-sm"><img src="' + PARTNER.img + '" alt=""></span>'
        + 'You talked with ' + GM.esc(PARTNER.name) + '</span>'
      + '<div class="end-again">' + GM.loadDots() + '<span>Looking for your next partner\u2026</span></div>'
      + '<div class="cafe-acts">'
        + '<button class="ghost-cta" type="button" onclick="stopMatching()">Stop matching</button>'
      + '</div>'
    + '</main>';
}


/* ------------------------------------------------------------ transitions */
function seedFor(state){
  if(state === 'entry'){
    ST.matching = false; ST.searchElapsed = 0; ST.exploreShown = false; ST.closeSheet = false; ST.textOpen = false;
    ST.textLog = []; ST.leaveSheet = false; ST.left = 0; ST.levelsSheet = false;
    ST.agreed = false; ST.keepOnSheet = false;
    ST.dockTip = false; ST.dockTipSeen = false;
    ST.welcomePlayed = false;
    ST.handleCuePlayed = false;
    ST.rangeHintSeen = false;
    clearPartnerOff();
    clearTimeout(dockTipT); dockTipT = null;
  }
  /* every Café entry runs the check, so it always starts from scratch */
  if(state === 'avcheck'){ ST.left = 0; ST.devSheet = false; micReset(); }
  if(state === 'searching'){
    ST.matching = true; ST.left = DUR.searchTo; ST.levelsSheet = false;
    ST.closeSheet = false;
    clearPartnerOff();
  }
  if(state === 'hub'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'flashcards'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'matched'){
    ST.matchPhase = 'offer';
    ST.offerLeft = DUR.offer;
  }
  if(state === 'agreement'){ ST.agreed = false; }
  if(state === 'live'){
    ST.left = DUR.session; ST.textLog = []; ST.textOpen = false;
    ST.leaveSheet = false; ST.keepOnSheet = false;
    clearPartnerOff();
    if(!ST.dockTipSeen) armDockTip();
    else ST.dockTip = false;
  }
  if(state === 'ending'){
    ST.left = DUR.ending; ST.textOpen = false; ST.leaveSheet = false;
    ST.keepOnSheet = false; clearPartnerOff();
  }
}
function setState(state){
  if(ORDER.indexOf(state) === -1) state = 'entry';
  ST.state = state;
  seedFor(state);
  try{ history.replaceState(null, '', '#' + state); }catch(e){}
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
/* Editing mid-search does not pause the search. */
function openLevels(){ ST.levelsSheet = true; render(); }
function closeLevels(){ if(!ST.selected.length) return; ST.levelsSheet = false; render(); }

function goAvCheck(){ if(!ST.selected.length) return; setState('avcheck'); }
function startMatching(){
  if(!ST.selected.length || ST.perm !== 'granted') return;
  ST.searchElapsed = 0;
  ST.exploreShown = false;
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
function revealExplore(){
  if(ST.searchElapsed < DUR.exploreAfter) return;
  ST.exploreShown = true;
  if(ST.state !== 'searching') return;
  var stage = document.querySelector('.searching-stage');
  if(!stage || stage.classList.contains('is-late')) return;
  stage.classList.add('is-late');
  var a = document.getElementById('searchSupportA');
  var b = document.getElementById('searchSupportB');
  if(a) a.classList.remove('is-on');
  if(b) b.classList.add('is-on');
  var explore = document.getElementById('searchExplore');
  if(explore){
    explore.removeAttribute('aria-hidden');
    explore.removeAttribute('tabindex');
  }
}
/* The single exit. Matching ends here, or when the app closes. */
function stopMatching(){
  ST.closeSheet = false;
  ST.exploreShown = false;
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
  ST.matching = true;
  ST.left = DUR.searchTo;
  ST.searchElapsed = 0;
  ST.exploreShown = false;
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
  if(ST.state === 'live' && !ST.camOff){
    ST.keepOnSheet = true;
    ST.leaveSheet = false;
    ST.partnerOffSheet = false;
    clearTimeout(partnerOffT);
    render();
    return;
  }
  ST.camOff = !ST.camOff;
  render();
}
function toggleMic(){
  dismissDockTip();
  ST.micOff = !ST.micOff;
  if(ST.micOff) micReset();
  render();
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

function openDevices(){ ST.devSheet = true; render(); }
function closeDevices(){ ST.devSheet = false; render(); }
function pickDevice(key, value){ DEVICES[key].value = value; render(); }

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
function openWheel(){ dismissDockTip(); GM.toast('Spin the Wheel \u2014 entry point only in this pass'); }
function openChallenge(){ dismissDockTip(); GM.toast('Challenge mode \u2014 entry point only in this pass'); }

function toggleText(){ dismissDockTip(); ST.textOpen = !ST.textOpen; render(); }
function closeText(){ ST.textOpen = false; render(); }
function sendText(){
  var el = document.getElementById('tsInput');
  if(!el) return;
  var text = el.value.trim();
  if(!text) return;
  ST.textLog.push({own:true, text:text});
  el.value = '';
  render();
}
function openLeave(){ dismissDockTip(); ST.leaveSheet = true; ST.keepOnSheet = false; ST.partnerOffSheet = false; clearTimeout(partnerOffT); render(); }
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
  var el = document.querySelector('.dock-tip');
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
function findNewPartner(){
  clearPartnerOff();
  setState('searching');
}
/* Ends this chat. Matching stays live and picks up again on its own. */
function endSession(){ ST.leaveSheet = false; ST.keepOnSheet = false; clearPartnerOff(); setState('ending'); }


/* --------------------------------------------------------------- the clock */
var TIMED = {avcheck:1, searching:1, hub:1, flashcards:1, matched:1, live:1, ending:1};

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
    if(s === 'searching') revealExplore();
    else if(ST.searchElapsed >= DUR.exploreAfter) ST.exploreShown = true;
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
  if(s === 'live'){
    ST.left--;
    if(ST.left <= 0){ setState('ending'); return; }
    syncClock();
    return;
  }
  if(s === 'ending'){
    ST.left--;
    if(ST.left <= 0){ keepExploring(); return; }
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
  el.classList.toggle('on-light', s === 'hub' || (s === 'matched' && ST.bg === 'hub'));
  if(s === 'entry'){
    sizeEntryWelcome(el);
    el.scrollTop = entryScroll;
    bindEntryPage(el);
  } else {
    unbindEntryPage();
    el.style.removeProperty('--cafe-welcome-h');
    el.style.removeProperty('--cafe-peek');
    el.classList.remove('is-short');
    el.scrollTop = 0;
  }

  if(ST.textOpen){
    var log = document.getElementById('tsLog');
    if(log) log.scrollTop = log.scrollHeight;
    var input = document.getElementById('tsInput');
    if(input){
      input.focus();
      input.addEventListener('keydown', function(ev){ if(ev.key === 'Enter') sendText(); });
    }
  }
  syncSwitcher();
  if(ST.closeSheet && ST.state === 'searching') bindCloseDecisionFocus();
  if(document.body.classList.contains('show-anim-debug')) renderAnimDebugGrid();
}


/* ---------------------------------------------------------------- switcher */
function syncSwitcher(){
  document.querySelectorAll('.sc').forEach(function(b){
    b.classList.toggle('on', b.dataset.sc === ST.state);
  });
  document.querySelectorAll('[data-match-layout]').forEach(function(b){
    b.classList.toggle('on', b.getAttribute('data-match-layout') === ST.matchLayout);
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
function jumpFinal(){ if(ST.state !== 'live') setState('live'); ST.left = 20; render(); }
function runPath(){
  ST.clockOn = true;
  setState('entry');
  setTimeout(goAvCheck, 900);
  setTimeout(startMatching, 2200);
}

function onCafeKey(ev){
  if(ev.key !== 'Escape') return;
  if(ST.closeSheet){ dismissCloseDecision(); return; }
}

function reviewSearchInitial(){
  ST.clockOn = false;
  ST.matching = true;
  ST.searchElapsed = 0;
  ST.exploreShown = false;
  ST.closeSheet = false;
  setState('searching');
}
function reviewSearchExplore(){
  ST.clockOn = false;
  ST.matching = true;
  ST.closeSheet = false;
  setState('searching');
  ST.searchElapsed = DUR.exploreAfter;
  ST.exploreShown = true;
  render();
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
  ST.searchElapsed = DUR.exploreAfter;
  ST.exploreShown = true;
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

  document.querySelectorAll('.sc').forEach(function(b){
    b.onclick = function(){
      if(INTERVIEW) return;
      var v = b.dataset.sc;
      /* the review switcher reaches every state directly, including the ones
         that are only ever entered from a background process */
      if(v === 'matched'){ ST.matching = true; ST.bg = 'hub'; }
      if(v === 'hub' || v === 'flashcards') ST.matching = true;
      if(v === 'searching'){
        ST.matching = true;
        ST.searchElapsed = 0;
        ST.exploreShown = false;
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
    else if(review === 'search-explore') reviewSearchExplore();
    else if(review === 'search-close') reviewSearchClose();
    else if(review === 'hub-matching') reviewHubMatching();
    else if(review === 'stopped') reviewMatchingStopped();
  }
  setInterval(tick, 1000);
})();
