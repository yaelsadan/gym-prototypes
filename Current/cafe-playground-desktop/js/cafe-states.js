/* ============================================================================
   CAFE — state machine + screens
   ----------------------------------------------------------------------------
   Follows the Gym playground contract: one global ST, one render() that rebuilds
   #frame, setState() for transitions, a 1s clockTick for timed states, hash
   routing for deep links, and a switcher that stays in sync with ST.

   Canonical path (settled on mobile, adapted here):
     entry -> avcheck -> searching -> (hub / flashcards, matching continues)
            -> matched -> agreement -> live -> ending -> hub

   A/V check sits before matching and runs on every Café entry. Its CTA is the
   actual "Start matching" action.

   Matching is a background process. It starts at the end of the A/V check and
   stops only on an explicit "Stop matching". One chat ending never stops it.

   Entry / Preferences uses the mobile continuous level spectrum,
   composed horizontally for desktop (Welcome left, preferences right).
   ========================================================================= */

/* -------------------------------------------------------------- constants */
var ORDER = ['entry','avcheck','searching','hub','flashcards','matched','agreement','live','ending'];

var IMG_PARTNER = '../student-main-classroom-desktop/assets/teacher-gai.png';
var IMG_YOU     = '../student-main-classroom-desktop/assets/pip-you.png';
var IMG_FACE_A  = '../student-main-classroom-desktop/assets/dana.png';
var IMG_FACE_B  = '../student-main-classroom-desktop/assets/teacher-yael.png';
var MAP_SRC     = '../cafe-playground-mobile/World%20map.svg';

/* Playground durations. The session is the real 6 minutes so the clock reads
   truthfully; search / offer / ending are shortened so a loop is reviewable. */
var DUR = {
  searchTo:22,
  exploreAfter:14,
  offer:30,
  partnerConfirm:4,
  session:360,
  sessionFinal:30,
  ending:7,
  partnerOffWait:9
};

var SEARCH_COPY = 'We\u2019ll tell you the moment someone\u2019s free.';

var INTERVIEW = false;

var NOTES = {
  entry:'1 · Cafe entry / matching preferences. Welcome + continuous level spectrum. All eligible levels selected by default. Nothing is matching yet.',
  avcheck:'2 · A/V check, before matching and mandatory on every entry. Its CTA is the real "Start matching".',
  searching:'3 · Active search. Matching is felt first. Flashcards stay optional; the first search line holds for the whole wait.',
  hub:'3b · Placeholder Hub carrying the persistent matching indicator. The Hub itself is not designed in this pass.',
  flashcards:'3c · Optional practice while waiting. Matching stays visible. A match interrupts it; declining returns here.',
  matched:'4 · Match found. A 30s interrupt over whatever you were doing. Accept keeps the same surface and waits for the partner.',
  agreement:'5 · Session agreement. Only after both accepted. Three principles to scan, one acknowledgement that enables the CTA. No decline.',
  live:'6 · Live Cafe. Two-person desktop tiles. Dock: Topics · Practice · Text, then Camera · Mic.',
  ending:'7 · Ending. Time flies, then Find me another partner, or Go back to homepage.'
};

/* ------------------------------------------------------- matching scope */
/* Searching "Edit levels" still uses these three scope chips. Entry uses the
   continuous spectrum (LEVEL_DATA + range). setScope maps onto the range. */
var SCOPES = [
  {id:'exact', label:'Exactly my level',    hint:'',                      lower:0, upper:0},
  {id:'below', label:'My level and below',  hint:'up to 3 levels lower',  lower:3, upper:0},
  {id:'above', label:'My level and above',  hint:'up to 3 levels higher', lower:0, upper:3}
];

/* ------------------------------------------- LEVEL DATA — from mobile Café */
/* Placeholder eligible ladder. Yellow is the mock learner so both sides of
   the range are visible. Replace wholesale when product data lands. */
var LEVEL_DATA = {
  source:'placeholder',
  myLevel:'yellow',
  eligible:['red','orange','pink','yellow','lightblue','blue','lime']
};

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
  ST.myLevel = LEVEL_DATA.myLevel;
  if(document.getElementById('levelSpectrum')){
    updateSpectrumDOM(opts || {});
    syncSwitcher();
    return;
  }
  render();
}
function ladderLabel(i){
  var ids = LEVEL_DATA.eligible;
  var id = ids[Math.max(0, Math.min(ids.length - 1, i))];
  return GP.esc(GP.levelMeta(id).label);
}

/* Eligible band for searching / partner draw — derived from the spectrum range. */
function eligibleBand(){
  var i = myLevelIndex();
  return {
    me:i,
    lo:ST.rangeLo,
    hi:ST.rangeHi,
    atBottomEdge:ST.rangeLo === 0 && i > 0 && ST.prefs.scope === 'below',
    beyondPlaceholder:false,
    renderableHi:ST.rangeHi
  };
}

/* -------------------------------------------------------------- partner */
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

var LEVEL_ICONS = {
  red:'assets/level-icons/level-red.svg',
  orange:'assets/level-icons/level-orange.svg',
  pink:'assets/level-icons/level-pink.svg',
  yellow:'assets/level-icons/level-yellow.svg',
  lightblue:'assets/level-icons/level-lightblue.svg',
  blue:'assets/level-icons/level-blue.svg',
  lime:'assets/level-icons/level-lime.svg'
};
var IMG_PIN = 'assets/location-pin.png';

/* Content of the agreement is product-specified. This is the only copy of it.
   Three principles to scan, then one acknowledgement. No per-item ticks. */
var AGREEMENT_TERMS = [
  {icon:'hebrew',  lead:'Give Hebrew your best shot', support:'Mistakes are welcome!'},
  {icon:'present', lead:'Stay present',               support:'The session is just 6 minutes'},
  {icon:'kind',    lead:'Be kind to your partner',    support:'This is a safe space'}
];

var ACTIVITY = {
  title:'Order a coffee, out loud',
  body:'Ask for what you would actually drink. Your partner is the barista.'
};

var DEVICES = {
  camera:{label:'Camera', icon:'cam', options:['FaceTime HD Camera','Continuity Camera'], value:'FaceTime HD Camera'},
  mic:{label:'Microphone', icon:'mic', options:['AirPods Pro','MacBook Pro Microphone'], value:'AirPods Pro'},
  output:{label:'Speaker', icon:'headphone', options:['AirPods Pro','MacBook Pro Speakers'], value:'AirPods Pro'}
};

var DECK = [
  {dir:'Translate to Hebrew', en:'Coffee',      he:'\u05e7\u05e4\u05d4'},
  {dir:'Translate to Hebrew', en:'Thank you',   he:'\u05ea\u05d5\u05d3\u05d4'},
  {dir:'Translate to Hebrew', en:'Good morning',he:'\u05d1\u05d5\u05e7\u05e8 \u05d8\u05d5\u05d1'},
  {dir:'Translate to Hebrew', en:'Friend',      he:'\u05d7\u05d1\u05e8'},
  {dir:'Translate to Hebrew', en:'Water',       he:'\u05de\u05d9\u05dd'}
];

/* Cafe-only icons. Shared GP.I stays product-neutral. */
var CI = {
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
  chevRt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2"/></svg>',
  skipPrev:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4.2" y="5" width="2.2" height="14" rx=".6"/><path d="M19.4 5.1v13.8L7.4 12z"/></svg>',
  skipNext:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.6 5.1L16.6 12 4.6 18.9V5.1z"/><rect x="17.6" y="5" width="2.2" height="14" rx=".6"/></svg>',
  bookmark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.8h10c.7 0 1.2.5 1.2 1.2V20l-6.2-3.3L5.8 20V5c0-.7.5-1.2 1.2-1.2z"/></svg>',
  wheel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13.4 2.5L4.8 13.4h6L10.6 21.5 19.2 10.6h-6z"/></svg>'
};

/* ------------------------------------------------------------------ state */
var ST = {
  state:'entry',
  myLevel:LEVEL_DATA.myLevel,
  prefs:{scope:'exact'},
  rangeLo:0,
  rangeHi:LEVEL_DATA.eligible.length - 1,
  selected:LEVEL_DATA.eligible.slice(),
  rangeHintSeen:false,
  specHot:-1,
  specActiveHandle:null,
  specInset:true,
  partner:{name:PARTNER.name, level:PARTNER.level},
  /* what the match interrupt is layered over */
  bg:'searching',
  /* True for as long as the Cafe matching session is live. It survives an
     individual chat ending; only an explicit stop or leaving Cafe clears it. */
  matching:false,
  matchPhase:'offer',
  matchLayout:'open',
  matchEnter:false,
  offerLeft:DUR.offer,
  clockOn:true,
  left:0,
  searchElapsed:0,
  exploreShown:false,
  closeSheet:false,
  camOff:false,
  micOff:false,
  blur:false,
  perm:'granted',
  mic:{phase:'idle', left:0, pos:0},
  devSheet:false,
  devMenu:null,
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
  welcomeEntranceSeen:false,
  softLoading:false
};

/* ---------------------------------------------------------------- helpers */
function scopeById(id){
  for(var i=0;i<SCOPES.length;i++) if(SCOPES[i].id === id) return SCOPES[i];
  return SCOPES[0];
}
function scopeLabel(){ return GP.esc(scopeById(ST.prefs.scope).label); }
function searchScopeLabel(){
  var n = ST.rangeHi - ST.rangeLo + 1;
  if(n <= 1) return 'My level only';
  return 'Across ' + n + ' levels';
}

/* Draw a partner from inside the eligible band. Middle of the band, so the
   bottom edge is visible rather than always landing on your own level.
   Bounded by renderableHi because of the placeholder data, not by a rule. */
function drawPartnerLevel(){
  if(ST.selected && ST.selected.length){
    if(ST.selected.indexOf(PARTNER.level) !== -1) return PARTNER.level;
    return ST.selected[Math.floor(ST.selected.length / 2)];
  }
  return LEVEL_DATA.myLevel;
}
function levelChip(id, cls){
  return '<span class="schip ' + (cls||'') + '">'
    + GP.levelDot(id) + GP.esc(GP.levelMeta(id).label) + '</span>';
}
function lockup(){
  return '<div class="lockup">'
    + '<span class="av-round"><img src="' + PARTNER.img + '" alt=""></span>'
    + '<span class="session-id"><span class="id-main">Cafe</span>'
    + '<span class="id-sub">with ' + GP.esc(PARTNER.name) + '</span></span>'
    + '</div>';
}
/* Two-cup Café mark. Same supplied artwork as the mobile lockup. */
var CAFE_MARK =
  '<img class="cafe-mark" src="../cafe-playground-mobile/cafe-mark.png" alt="" aria-hidden="true">';

function lockupSolo(){
  return '<div class="lockup">'
    + CAFE_MARK
    + '<span class="session-id"><span class="id-main">Cafe</span></span>'
    + '</div>';
}

function cafeDialog(opts){
  opts = opts || {};
  var overlayClick = opts.onScrim
    ? ' onclick="if(event.target===this)' + opts.onScrim + '"'
    : '';
  return '<div class="invite-overlay cafe-overlay"' + overlayClick + '>'
    + '<div class="invite milky ' + (opts.cls||'') + '" role="dialog" aria-modal="true">'
    + (opts.title ? '<h4>' + opts.title + '</h4>' : '')
    + (opts.body || '')
    + (opts.acts ? '<div class="acts">' + opts.acts + '</div>' : '')
    + (opts.footer || '')
    + (opts.resp ? '<div class="respline"><i style="animation-duration:' + opts.resp + 's"></i></div>' : '')
    + '</div></div>';
}

function cafeFooter(items, end){
  var html = '<div class="g-footer"><div class="footer-capsule">';
  (items||[]).forEach(function(it){
    if(it.divider){
      html += '<span class="rc-div" aria-hidden="true"></span>';
      return;
    }
    html += '<button class="rc-btn' + (it.active?' is-active':'') + (it.accent?' accent':'') + '" type="button" onclick="'
      + (it.onclick||'') + '"' + GP.hubTipAttrs(it.label) + '>' + it.icon
      + (it.slash ? '<span class="slash"></span>' : '') + '</button>';
  });
  html += '</div>';
  if(end){
    html += '<button class="footer-end" type="button" onclick="' + (end.onclick||'') + '">'
      + GP.I.leave + '<span>' + GP.esc(end.label) + '</span></button>';
  }
  return html + '</div>';
}

function cafeTile(name, opts){
  opts = opts || {};
  var cls = 'g-tile cafe-tile'
    + (opts.alt ? ' alt' : '')
    + (opts.camOff ? ' cam-off' : '');
  var inner = '';
  if(opts.img && !opts.camOff){
    inner += '<div class="vid" style="background-image:url(\'' + opts.img + '\')"></div>';
  }
  inner += '<span class="who">' + GP.esc(name) + '</span>';
  if(opts.camOff) inner += '<span class="av-big">' + GP.initial(name) + '</span>';
  if(opts.micOff) inner += '<span class="tile-flag">' + GP.I.mic + 'Mic off</span>';
  return '<div class="' + cls + '">' + inner + '</div>';
}

function cafePreview(){
  var html = GP.preview({camOff:ST.camOff, micOff:ST.micOff, blur:ST.blur, label:'You'});
  if(!ST.camOff){
    html = html.replace(
      '<div class="vid"></div>',
      '<div class="vid" style="background-image:url(\'' + IMG_YOU + '\')"></div>'
    );
  }
  return html;
}

function cafeAvTools(){
  var liveMic = (ST.perm === 'granted' && !ST.micOff);
  return '<div class="av-tools">'
    + '<button class="cbtn" type="button" onclick="toggleCam()"' + GP.hubTipAttrs('Camera') + '>'
      + GP.I.cam + (ST.camOff ? '<span class="slash"></span>' : '') + '</button>'
    + '<div class="av-mic-wrap">'
      + (liveMic
        ? '<span class="av-mic-echo" aria-hidden="true"><i class="av-echo-ring"></i>'
          + '<i class="av-echo-ring d2"></i><i class="av-echo-ring d3"></i></span>'
        : '')
      + '<button class="cbtn" type="button" onclick="toggleMic()"' + GP.hubTipAttrs('Microphone') + '>'
        + GP.I.mic + (ST.micOff ? '<span class="slash"></span>' : '') + '</button>'
    + '</div>'
    + '<button class="cbtn' + (ST.blur?' blur-on':'') + '" type="button" onclick="toggleBlur()"'
      + GP.hubTipAttrs('Blur background') + '>' + GP.I.blur + '</button>'
    + '</div>';
}

function cafeWave(live, rec){
  var h = [7,12,17,22,19,14,20,25,22,15,10,17,24,20,14,9,15,22,18,12,17,10,7,12,19];
  var out = '';
  for(var i=0;i<h.length;i++){
    out += '<i style="height:' + h[i] + 'px"></i>';
  }
  return '<div class="cafe-wave' + (live?' is-live':'') + (rec?' is-rec':'') + '">' + out + '</div>';
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

var toastT = null;
function cafeToast(text){
  var f = document.getElementById('frame');
  if(!f) return;
  var old = f.querySelector('.g-toast');
  if(old) old.remove();
  var el = document.createElement('div');
  el.className = 'g-toast';
  el.setAttribute('role','status');
  el.innerHTML = '<span class="d"></span>' + GP.esc(text);
  f.appendChild(el);
  clearTimeout(toastT);
  toastT = setTimeout(function(){ if(el.parentNode) el.remove(); }, 2400);
}

/* ------------------------------------------------------- 1. ENTRY / PREFS */

/* Static Café cups mark — same final artwork as mobile Welcome. */
var CAFE_ICON_YELLOW_D = 'M269.50 42.50 L270.50 42.50 L270.50 51.50 L269.50 52.50 L269.50 59.50 L268.50 60.50 L268.50 66.50 L267.50 67.50 L267.50 71.50 L266.50 72.50 L266.50 75.50 L265.50 76.50 L265.50 79.50 L264.50 80.50 L264.50 82.50 L263.50 83.50 L263.50 86.50 L262.50 87.50 L262.50 89.50 L261.50 90.50 L261.50 92.50 L259.50 95.50 L259.50 97.50 L258.50 98.50 L258.50 100.50 L257.50 101.50 L257.50 102.50 L256.50 103.50 L256.50 104.50 L255.50 105.50 L255.50 106.50 L254.50 107.50 L254.50 108.50 L253.50 109.50 L253.50 110.50 L252.50 111.50 L251.50 114.50 L249.50 116.50 L249.50 117.50 L248.50 118.50 L247.50 118.50 L243.50 114.50 L242.50 114.50 L233.50 105.50 L233.50 104.50 L228.50 99.50 L228.50 98.50 L225.50 95.50 L225.50 94.50 L221.50 89.50 L221.50 88.50 L220.50 87.50 L219.50 84.50 L217.50 82.50 L217.50 81.50 L216.50 80.50 L216.50 78.50 L215.50 77.50 L215.50 76.50 L213.50 73.50 L213.50 71.50 L211.50 68.50 L211.50 66.50 L210.50 65.50 L210.50 63.50 L209.50 62.50 L209.50 60.50 L208.50 59.50 L208.50 57.50 L207.50 56.50 L207.50 53.50 L206.50 52.50 L206.50 49.50 L205.50 48.50 L216.50 48.50 L217.50 47.50 L234.50 47.50 L235.50 46.50 L246.50 46.50 L247.50 45.50 L256.50 45.50 L257.50 44.50 L263.50 44.50 L264.50 43.50 L268.50 43.50 Z';
var CAFE_ICON_STROKE_D = 'M268.50 0.50 L367.50 0.50 L368.50 1.50 L389.50 1.50 L390.50 2.50 L404.50 2.50 L405.50 3.50 L415.50 3.50 L416.50 4.50 L423.50 4.50 L424.50 5.50 L429.50 5.50 L430.50 6.50 L433.50 6.50 L437.50 8.50 L438.50 10.50 L438.50 18.50 L437.50 19.50 L437.50 22.50 L438.50 23.50 L440.50 23.50 L441.50 22.50 L450.50 22.50 L451.50 23.50 L454.50 23.50 L458.50 25.50 L460.50 27.50 L461.50 27.50 L467.50 33.50 L470.50 39.50 L470.50 41.50 L471.50 42.50 L471.50 54.50 L466.50 64.50 L461.50 69.50 L460.50 69.50 L456.50 72.50 L454.50 72.50 L444.50 77.50 L442.50 77.50 L439.50 79.50 L437.50 79.50 L434.50 81.50 L432.50 81.50 L427.50 84.50 L425.50 84.50 L422.50 86.50 L420.50 86.50 L418.50 88.50 L418.50 89.50 L416.50 91.50 L416.50 92.50 L414.50 94.50 L414.50 95.50 L412.50 97.50 L410.50 101.50 L406.50 105.50 L406.50 106.50 L394.50 118.50 L393.50 118.50 L385.50 125.50 L384.50 125.50 L379.50 129.50 L376.50 130.50 L374.50 132.50 L364.50 137.50 L362.50 137.50 L359.50 139.50 L357.50 139.50 L356.50 140.50 L354.50 140.50 L350.50 142.50 L347.50 142.50 L346.50 143.50 L343.50 143.50 L342.50 144.50 L338.50 144.50 L337.50 145.50 L331.50 145.50 L330.50 146.50 L303.50 146.50 L302.50 145.50 L296.50 145.50 L295.50 144.50 L292.50 144.50 L291.50 143.50 L284.50 142.50 L283.50 141.50 L281.50 141.50 L280.50 140.50 L275.50 139.50 L272.50 137.50 L270.50 137.50 L260.50 132.50 L258.50 130.50 L255.50 129.50 L253.50 127.50 L249.50 125.50 L241.50 134.50 L241.50 135.50 L226.50 149.50 L225.50 149.50 L219.50 154.50 L216.50 155.50 L214.50 157.50 L198.50 165.50 L196.50 165.50 L195.50 166.50 L193.50 166.50 L192.50 167.50 L190.50 167.50 L189.50 168.50 L187.50 168.50 L183.50 170.50 L179.50 170.50 L178.50 171.50 L174.50 171.50 L173.50 172.50 L167.50 172.50 L166.50 173.50 L142.50 173.50 L141.50 172.50 L135.50 172.50 L134.50 171.50 L125.50 170.50 L124.50 169.50 L122.50 169.50 L121.50 168.50 L119.50 168.50 L118.50 167.50 L116.50 167.50 L115.50 166.50 L110.50 165.50 L94.50 157.50 L92.50 155.50 L91.50 155.50 L89.50 153.50 L85.50 151.50 L82.50 148.50 L81.50 148.50 L67.50 135.50 L67.50 134.50 L62.50 129.50 L62.50 128.50 L59.50 125.50 L59.50 124.50 L51.50 113.50 L47.50 111.50 L45.50 111.50 L42.50 109.50 L40.50 109.50 L37.50 107.50 L35.50 107.50 L25.50 102.50 L23.50 102.50 L20.50 100.50 L18.50 100.50 L12.50 97.50 L10.50 95.50 L9.50 95.50 L3.50 88.50 L1.50 84.50 L1.50 82.50 L0.50 81.50 L0.50 69.50 L1.50 68.50 L2.50 63.50 L4.50 61.50 L4.50 60.50 L11.50 53.50 L17.50 50.50 L19.50 50.50 L20.50 49.50 L31.50 49.50 L33.50 50.50 L34.50 49.50 L34.50 45.50 L33.50 44.50 L33.50 36.50 L35.50 34.50 L37.50 34.50 L38.50 33.50 L41.50 33.50 L42.50 32.50 L46.50 32.50 L47.50 31.50 L54.50 31.50 L55.50 30.50 L64.50 30.50 L65.50 29.50 L78.50 29.50 L79.50 28.50 L98.50 28.50 L99.50 27.50 L143.50 27.50 L144.50 26.50 L164.50 26.50 L165.50 27.50 L196.50 27.50 L197.50 26.50 L197.50 20.50 L196.50 19.50 L196.50 10.50 L197.50 8.50 L201.50 6.50 L205.50 6.50 L206.50 5.50 L211.50 5.50 L212.50 4.50 L219.50 4.50 L220.50 3.50 L230.50 3.50 L231.50 2.50 L244.50 2.50 L245.50 1.50 L267.50 1.50 Z M202.50 15.50 L202.50 14.50 L200.50 15.50 L200.50 23.50 L202.50 27.50 L210.50 27.50 L211.50 28.50 L230.50 28.50 L231.50 29.50 L243.50 29.50 L244.50 30.50 L254.50 30.50 L255.50 31.50 L261.50 31.50 L262.50 32.50 L267.50 32.50 L268.50 33.50 L273.50 34.50 L275.50 36.50 L275.50 46.50 L274.50 47.50 L274.50 56.50 L273.50 57.50 L273.50 63.50 L272.50 64.50 L272.50 69.50 L271.50 70.50 L271.50 73.50 L270.50 74.50 L270.50 77.50 L269.50 78.50 L268.50 85.50 L267.50 86.50 L267.50 88.50 L266.50 89.50 L266.50 91.50 L265.50 92.50 L264.50 97.50 L262.50 100.50 L262.50 102.50 L255.50 116.50 L251.50 121.50 L254.50 124.50 L260.50 127.50 L262.50 129.50 L270.50 133.50 L272.50 133.50 L275.50 135.50 L277.50 135.50 L278.50 136.50 L280.50 136.50 L281.50 137.50 L283.50 137.50 L287.50 139.50 L290.50 139.50 L291.50 140.50 L295.50 140.50 L296.50 141.50 L300.50 141.50 L301.50 142.50 L310.50 142.50 L311.50 143.50 L323.50 143.50 L324.50 142.50 L333.50 142.50 L334.50 141.50 L339.50 141.50 L340.50 140.50 L347.50 139.50 L348.50 138.50 L350.50 138.50 L351.50 137.50 L353.50 137.50 L354.50 136.50 L359.50 135.50 L364.50 132.50 L366.50 132.50 L370.50 130.50 L372.50 128.50 L380.50 124.50 L383.50 121.50 L384.50 121.50 L387.50 118.50 L388.50 118.50 L400.50 107.50 L400.50 106.50 L406.50 100.50 L406.50 99.50 L409.50 96.50 L409.50 95.50 L415.50 87.50 L421.50 75.50 L421.50 73.50 L423.50 70.50 L423.50 68.50 L424.50 67.50 L424.50 65.50 L425.50 64.50 L425.50 62.50 L426.50 61.50 L426.50 59.50 L428.50 55.50 L429.50 48.50 L430.50 47.50 L430.50 43.50 L431.50 42.50 L431.50 38.50 L432.50 37.50 L432.50 32.50 L433.50 31.50 L433.50 23.50 L434.50 22.50 L434.50 15.50 L433.50 14.50 L432.50 15.50 L429.50 15.50 L428.50 16.50 L422.50 16.50 L421.50 17.50 L414.50 17.50 L413.50 18.50 L403.50 18.50 L402.50 19.50 L387.50 19.50 L386.50 20.50 L363.50 20.50 L362.50 21.50 L272.50 21.50 L271.50 20.50 L248.50 20.50 L247.50 19.50 L232.50 19.50 L231.50 18.50 L221.50 18.50 L220.50 17.50 L212.50 17.50 L211.50 16.50 L206.50 16.50 L205.50 15.50 L203.50 15.50 Z M40.50 42.50 L40.50 41.50 L38.50 41.50 L37.50 42.50 L37.50 49.50 L38.50 50.50 L38.50 58.50 L39.50 59.50 L39.50 64.50 L40.50 65.50 L40.50 69.50 L41.50 70.50 L41.50 74.50 L42.50 75.50 L43.50 82.50 L44.50 83.50 L44.50 85.50 L45.50 86.50 L45.50 88.50 L46.50 89.50 L46.50 91.50 L47.50 92.50 L48.50 97.50 L51.50 102.50 L51.50 104.50 L55.50 112.50 L57.50 114.50 L58.50 117.50 L63.50 123.50 L63.50 124.50 L66.50 127.50 L66.50 128.50 L83.50 145.50 L84.50 145.50 L87.50 148.50 L88.50 148.50 L96.50 154.50 L110.50 161.50 L112.50 161.50 L115.50 163.50 L117.50 163.50 L121.50 165.50 L124.50 165.50 L125.50 166.50 L128.50 166.50 L129.50 167.50 L133.50 167.50 L134.50 168.50 L139.50 168.50 L140.50 169.50 L168.50 169.50 L169.50 168.50 L175.50 168.50 L176.50 167.50 L179.50 167.50 L180.50 166.50 L187.50 165.50 L188.50 164.50 L193.50 163.50 L196.50 161.50 L198.50 161.50 L212.50 154.50 L214.50 152.50 L215.50 152.50 L217.50 150.50 L221.50 148.50 L225.50 144.50 L226.50 144.50 L243.50 127.50 L243.50 126.50 L246.50 123.50 L241.50 118.50 L240.50 118.50 L228.50 106.50 L228.50 105.50 L224.50 101.50 L224.50 100.50 L221.50 97.50 L221.50 96.50 L217.50 91.50 L209.50 75.50 L209.50 73.50 L207.50 70.50 L207.50 68.50 L206.50 67.50 L206.50 65.50 L205.50 64.50 L205.50 62.50 L203.50 58.50 L203.50 55.50 L202.50 54.50 L202.50 51.50 L201.50 50.50 L201.50 48.50 L200.50 47.50 L192.50 47.50 L191.50 48.50 L116.50 48.50 L115.50 47.50 L89.50 47.50 L88.50 46.50 L72.50 46.50 L71.50 45.50 L60.50 45.50 L59.50 44.50 L51.50 44.50 L50.50 43.50 L44.50 43.50 L43.50 42.50 L41.50 42.50 Z M206.50 31.50 L206.50 30.50 L102.50 30.50 L101.50 31.50 L81.50 31.50 L80.50 32.50 L67.50 32.50 L66.50 33.50 L56.50 33.50 L55.50 34.50 L48.50 34.50 L47.50 35.50 L43.50 35.50 L42.50 36.50 L39.50 36.50 L38.50 37.50 L41.50 39.50 L45.50 39.50 L46.50 40.50 L52.50 40.50 L53.50 41.50 L61.50 41.50 L62.50 42.50 L74.50 42.50 L75.50 43.50 L92.50 43.50 L93.50 44.50 L122.50 44.50 L123.50 45.50 L185.50 45.50 L186.50 44.50 L216.50 44.50 L217.50 43.50 L234.50 43.50 L235.50 42.50 L246.50 42.50 L247.50 41.50 L255.50 41.50 L256.50 40.50 L262.50 40.50 L263.50 39.50 L267.50 39.50 L270.50 37.50 L269.50 36.50 L266.50 36.50 L265.50 35.50 L260.50 35.50 L259.50 34.50 L252.50 34.50 L251.50 33.50 L242.50 33.50 L241.50 32.50 L228.50 32.50 L227.50 31.50 L207.50 31.50 Z M341.50 4.50 L341.50 3.50 L293.50 3.50 L292.50 4.50 L258.50 4.50 L257.50 5.50 L240.50 5.50 L239.50 6.50 L226.50 6.50 L225.50 7.50 L217.50 7.50 L216.50 8.50 L210.50 8.50 L209.50 9.50 L204.50 9.50 L203.50 10.50 L205.50 12.50 L210.50 12.50 L211.50 13.50 L217.50 13.50 L218.50 14.50 L227.50 14.50 L228.50 15.50 L241.50 15.50 L242.50 16.50 L261.50 16.50 L262.50 17.50 L305.50 17.50 L306.50 18.50 L328.50 18.50 L329.50 17.50 L372.50 17.50 L373.50 16.50 L392.50 16.50 L393.50 15.50 L406.50 15.50 L407.50 14.50 L416.50 14.50 L417.50 13.50 L423.50 13.50 L424.50 12.50 L429.50 12.50 L430.50 11.50 L429.50 9.50 L425.50 9.50 L424.50 8.50 L418.50 8.50 L417.50 7.50 L408.50 7.50 L407.50 6.50 L395.50 6.50 L394.50 5.50 L376.50 5.50 L375.50 4.50 L342.50 4.50 Z M271.50 42.50 L271.50 41.50 L269.50 41.50 L268.50 42.50 L264.50 42.50 L263.50 43.50 L257.50 43.50 L256.50 44.50 L248.50 44.50 L247.50 45.50 L236.50 45.50 L235.50 46.50 L219.50 46.50 L218.50 47.50 L206.50 47.50 L205.50 48.50 L205.50 51.50 L206.50 52.50 L206.50 55.50 L208.50 59.50 L208.50 62.50 L210.50 65.50 L210.50 67.50 L213.50 73.50 L213.50 75.50 L219.50 87.50 L221.50 89.50 L221.50 90.50 L223.50 92.50 L225.50 96.50 L228.50 99.50 L228.50 100.50 L232.50 104.50 L232.50 105.50 L241.50 114.50 L242.50 114.50 L247.50 119.50 L248.50 119.50 L252.50 114.50 L258.50 102.50 L258.50 100.50 L260.50 97.50 L260.50 95.50 L261.50 94.50 L261.50 92.50 L262.50 91.50 L262.50 89.50 L263.50 88.50 L263.50 86.50 L265.50 82.50 L265.50 79.50 L266.50 78.50 L266.50 75.50 L267.50 74.50 L267.50 71.50 L268.50 70.50 L268.50 66.50 L269.50 65.50 L269.50 59.50 L270.50 58.50 L270.50 51.50 L271.50 50.50 L271.50 43.50 Z M452.50 27.50 L452.50 26.50 L440.50 26.50 L437.50 28.50 L436.50 30.50 L436.50 36.50 L435.50 37.50 L435.50 42.50 L434.50 43.50 L434.50 46.50 L433.50 47.50 L433.50 50.50 L432.50 51.50 L431.50 58.50 L430.50 59.50 L430.50 61.50 L429.50 62.50 L429.50 64.50 L428.50 65.50 L427.50 70.50 L425.50 73.50 L425.50 75.50 L422.50 80.50 L423.50 81.50 L427.50 79.50 L429.50 79.50 L432.50 77.50 L434.50 77.50 L437.50 75.50 L439.50 75.50 L444.50 72.50 L446.50 72.50 L449.50 70.50 L451.50 70.50 L457.50 67.50 L459.50 65.50 L460.50 65.50 L465.50 59.50 L467.50 55.50 L467.50 51.50 L468.50 50.50 L467.50 41.50 L465.50 37.50 L463.50 35.50 L463.50 34.50 L459.50 30.50 L453.50 27.50 Z M26.50 53.50 L26.50 52.50 L24.50 53.50 L19.50 53.50 L13.50 56.50 L7.50 62.50 L4.50 68.50 L4.50 72.50 L3.50 73.50 L3.50 77.50 L4.50 78.50 L4.50 81.50 L5.50 82.50 L5.50 84.50 L6.50 86.50 L14.50 94.50 L18.50 96.50 L20.50 96.50 L23.50 98.50 L25.50 98.50 L35.50 103.50 L37.50 103.50 L40.50 105.50 L42.50 105.50 L47.50 108.50 L49.50 107.50 L46.50 102.50 L46.50 100.50 L43.50 94.50 L43.50 92.50 L41.50 88.50 L41.50 85.50 L39.50 81.50 L39.50 78.50 L38.50 77.50 L38.50 74.50 L37.50 73.50 L37.50 69.50 L36.50 68.50 L36.50 63.50 L35.50 62.50 L35.50 56.50 L32.50 53.50 L27.50 53.50 Z';
function cafeIconFinalMarkup(){
  return '<g class="cafe-icon-final">'
    + '<path fill="#F9E24C" d="' + CAFE_ICON_YELLOW_D + '"/>'
    + '<path fill="#F7F6EF" fill-rule="evenodd" d="' + CAFE_ICON_STROKE_D + '"/>'
    + '</g>';
}
function cafeCupsSvg(cls){
  return '<svg class="cafe-cups' + (cls?' '+cls:'') + '" viewBox="0 0 472 174" fill="none" overflow="visible" aria-hidden="true">'
    + cafeIconFinalMarkup()
    + '</svg>';
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
  var lo = GP.levelMeta(ids[ST.rangeLo]).label;
  var hi = GP.levelMeta(ids[ST.rangeHi]).label;
  return 'Matching you from ' + lo + ' through ' + hi;
}

function specRingFor(color){
  var hex = String(color || '').replace('#','');
  if(hex.length !== 6) return 'rgba(55,50,48,.26)';
  var r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
  var l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.58 ? 'rgba(55,50,48,.28)' : 'rgba(247,246,239,.34)';
}

function spectrumNodeHtml(id, index){
  var meta = GP.levelMeta(id);
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
    + ' aria-label="' + GP.esc(label) + '"'
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
    var meta = GP.levelMeta(id);
    var mine = id === LEVEL_DATA.myLevel;
    tips += '<div class="spec-tip" data-idx="' + i + '" data-id="' + id + '">'
      + '<span class="spec-tip-card">'
        + '<span class="spec-tip-name">' + GP.esc(meta.label) + '</span>'
        + (mine ? '<span class="spec-tip-you">You</span>' : '')
      + '</span>'
      + '<span class="spec-tip-anchor" aria-hidden="true"></span>'
    + '</div>';
  });
  var loLabel = GP.esc(GP.levelMeta(ids[ST.rangeLo]).label);
  var hiLabel = GP.esc(GP.levelMeta(ids[ST.rangeHi]).label);
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
          + '<span class="spec-hint-arrow spec-hint-arrow-lo" aria-hidden="true">' + CI.chevRt + '</span>'
          + '<span class="spec-hint-copy">Drag the edges<br>to adjust your range</span>'
          + '<span class="spec-hint-arrow spec-hint-arrow-hi" aria-hidden="true">' + CI.chevRt + '</span>'
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

var specDrag = null;
var specSettle = 0;
var specDidDrag = false;
function prefersReducedMotion(){
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  var host = document.querySelector('.cafe-entry-prefs') || document.getElementById('frame');
  if(!board || !host) return;
  var boardBox = board.getBoundingClientRect();
  var hostBox = host.getBoundingClientRect();
  var pad = 12;
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
    if(r.left < hostBox.left + pad) shift += (hostBox.left + pad) - r.left;
    if(r.right > hostBox.right - pad) shift += (hostBox.right - pad) - r.right;
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
  syncHandleAria(loEl, ST.rangeLo, 0, me, GP.levelMeta(ids[ST.rangeLo]).label);
  syncHandleAria(hiEl, ST.rangeHi, me, n - 1, GP.levelMeta(ids[ST.rangeHi]).label);
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
  var screen = document.getElementById('frame');
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
    syncSwitcher();
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
var entryCleanup = [];
function unbindEntrySpectrum(){
  if(specSettle){ cancelAnimationFrame(specSettle); specSettle = 0; }
  specDrag = null;
  specDidDrag = false;
  entryCleanup.forEach(function(fn){ try{ fn(); }catch(e){} });
  entryCleanup = [];
  specLockScroll(false);
}
function bindSpectrum(host){
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
  function onResize(){ if(!specDrag) layoutSpectrum(); }
  window.addEventListener('resize', onResize);
  entryCleanup.push(function(){ window.removeEventListener('resize', onResize); });
  if(typeof ResizeObserver !== 'undefined'){
    var ro = new ResizeObserver(onResize);
    ro.observe(root);
    entryCleanup.push(function(){ ro.disconnect(); });
  }
}

var DESKTOP_WELCOME_HOLD_MS = 1600;
var DESKTOP_WELCOME_REVEAL_MS = 800;
var DESKTOP_WELCOME_SHORT_MS = 420;
var DESKTOP_WELCOME_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
var DESKTOP_WELCOME_SLIDE = {
  hero: {delay:0, duration:680},
  title:{delay:110, duration:660},
  copy: {delay:230, duration:580}
};
var DESKTOP_WELCOME_SLIDE_SHORT = {
  hero: {delay:0, duration:400},
  title:{delay:62, duration:358},
  copy: {delay:124, duration:296}
};
var desktopWelcomeAdvancing = false;

function welcomeFlyItems(main){
  return [
    {el: main.querySelector('.cafe-welcome-fly-hero'), key:'hero', scale:true},
    {el: main.querySelector('.cafe-welcome-fly-title'), key:'title', scale:false},
    {el: main.querySelector('.cafe-welcome-fly-copy'), key:'copy', scale:false}
  ];
}

function clearWelcomeSlide(main){
  if(!main) return;
  welcomeFlyItems(main).forEach(function(item){
    if(!item.el) return;
    item.el.style.transition = '';
    item.el.style.transform = '';
    item.el.style.transformOrigin = '';
    item.el.style.willChange = '';
  });
}

function welcomeRect(el){
  var r = el.getBoundingClientRect();
  return {left:r.left, top:r.top, width:r.width, height:r.height};
}

function playWelcomeSlide(main, shortened){
  var items = welcomeFlyItems(main).filter(function(item){ return item.el; });
  if(!items.length) return shortened ? DESKTOP_WELCOME_SHORT_MS : DESKTOP_WELCOME_REVEAL_MS;
  var first = items.map(function(item){ return welcomeRect(item.el); });
  main.classList.remove('is-intro');
  main.classList.add('is-revealing');
  if(shortened) main.classList.add('is-accelerated');
  if(typeof layoutSpectrum === 'function') layoutSpectrum();
  void main.offsetWidth;
  var times = shortened ? DESKTOP_WELCOME_SLIDE_SHORT : DESKTOP_WELCOME_SLIDE;
  var maxEnd = 0;
  items.forEach(function(item, i){
    var last = welcomeRect(item.el);
    var dx = first[i].left - last.left;
    var dy = first[i].top - last.top;
    var sx = item.scale && last.width ? first[i].width / last.width : 1;
    var sy = item.scale && last.height ? first[i].height / last.height : 1;
    var t = times[item.key];
    maxEnd = Math.max(maxEnd, t.delay + t.duration);
    item.el.style.transition = 'none';
    item.el.style.transformOrigin = '0 0';
    item.el.style.willChange = 'transform';
    item.el.style.transform = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
  });
  window.requestAnimationFrame(function(){
    window.requestAnimationFrame(function(){
      if(!main.isConnected || !desktopWelcomeAdvancing) return;
      items.forEach(function(item){
        var t = times[item.key];
        item.el.style.transition = 'transform ' + t.duration + 'ms ' + DESKTOP_WELCOME_EASE + ' ' + t.delay + 'ms';
        item.el.style.transform = 'translate(0,0) scale(1)';
      });
    });
  });
  return maxEnd || (shortened ? DESKTOP_WELCOME_SHORT_MS : DESKTOP_WELCOME_REVEAL_MS);
}

function finishDesktopWelcomeEntrance(main){
  if(!main || !main.isConnected) return;
  var prefs = main.querySelector('.cafe-entry-prefs');
  clearWelcomeSlide(main);
  main.classList.remove('is-intro','is-revealing','is-accelerated');
  main.classList.add('is-ready');
  if(prefs){
    prefs.removeAttribute('aria-hidden');
    prefs.inert = false;
  }
  desktopWelcomeAdvancing = false;
}

function advanceDesktopWelcomeEntrance(shortened){
  var main = document.querySelector('.cafe-entry.is-intro');
  if(!main || desktopWelcomeAdvancing) return;
  desktopWelcomeAdvancing = true;
  ST.welcomeEntranceSeen = true;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var duration;
  if(reduced){
    if(shortened) main.classList.add('is-accelerated');
    main.classList.remove('is-intro');
    main.classList.add('is-revealing');
    duration = 220;
  } else {
    duration = playWelcomeSlide(main, !!shortened);
  }
  var done = window.setTimeout(function(){ finishDesktopWelcomeEntrance(main); }, duration + 80);
  entryCleanup.push(function(){
    window.clearTimeout(done);
    clearWelcomeSlide(main);
    desktopWelcomeAdvancing = false;
  });
}

function bindDesktopWelcomeEntrance(){
  var main = document.querySelector('.cafe-entry');
  if(!main || ST.welcomeEntranceSeen){
    if(main) finishDesktopWelcomeEntrance(main);
    return;
  }
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var autoTimer = window.setTimeout(function(){
    advanceDesktopWelcomeEntrance(false);
  }, reduced ? 520 : DESKTOP_WELCOME_HOLD_MS);
  function interruptPointer(){
    window.clearTimeout(autoTimer);
    advanceDesktopWelcomeEntrance(true);
  }
  function interruptKeyboard(ev){
    if(ev.key !== 'Tab' || !main.classList.contains('is-intro')) return;
    ev.preventDefault();
    window.clearTimeout(autoTimer);
    advanceDesktopWelcomeEntrance(true);
  }
  main.addEventListener('pointerdown', interruptPointer, {once:true});
  document.addEventListener('keydown', interruptKeyboard, true);
  entryCleanup.push(function(){
    window.clearTimeout(autoTimer);
    main.removeEventListener('pointerdown', interruptPointer);
    document.removeEventListener('keydown', interruptKeyboard, true);
  });
}

function screenEntry(){
  var entranceClass = ST.welcomeEntranceSeen ? ' is-ready' : ' is-intro';
  return lockupSolo()
    + '<div class="cafe-shell cafe-shell-entry"></div>'
    + '<main class="cafe-entry' + entranceClass + '" aria-label="Caf\u00e9 entry">'
      + '<div class="cafe-entry-compose">'
        + '<section class="cafe-entry-welcome" aria-label="Welcome">'
          + '<div class="cafe-entry-welcome-lockup">'
            + '<div class="cafe-welcome-fly cafe-welcome-fly-hero">'
              + '<div class="cafe-entry-hero" aria-hidden="true">' + cafeCupsSvg('is-static') + '</div>'
            + '</div>'
            + '<div class="cafe-welcome-fly cafe-welcome-fly-title">'
              + '<h2 class="cafe-display cafe-welcome-title">Welcome<br><span class="cafe-welcome-line">to the <b>Caf\u00e9</b>!</span></h2>'
            + '</div>'
            + '<div class="cafe-welcome-fly cafe-welcome-fly-copy">'
              + '<p class="cafe-sub cafe-welcome-sub">Grab a coffee and chat with a Hebrew partner from anywhere in the world.</p>'
            + '</div>'
          + '</div>'
        + '</section>'
        + '<div class="cafe-entry-divider" aria-hidden="true"></div>'
        + '<section class="cafe-entry-prefs" aria-labelledby="cafeLevelsHeading"'
          + (ST.welcomeEntranceSeen ? '' : ' aria-hidden="true" inert') + '>'
          + '<div class="pref-copy">'
            + '<h2 class="pref-intro" id="cafeLevelsHeading">Choose partner levels</h2>'
            + '<p class="pref-lead">Wider range, better odds of finding someone.</p>'
          + '</div>'
          + levelSpectrum()
          + '<div class="cafe-entry-acts">'
            + '<button class="btn primary cafe-entry-cta" type="button" onclick="startSearch()"'
              + (ST.selected.length ? '' : ' disabled') + '>Continue</button>'
          + '</div>'
        + '</section>'
      + '</div>'
    + '</main>';
}

/* --------------------------------------------------------- 2. A/V CHECK */
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

function micTest(){
  var m = ST.mic, title, sub, btn, extra = '';
  if(m.phase === 'recording'){
    title = 'Listening\u2026';
    sub = cafeWave(true, true);
    btn = '<button class="cafe-playbtn" type="button" onclick="micStop()" aria-label="Stop">' + CI.pause + '</button>';
    extra = '<span class="mt-count">' + m.left + 's</span>';
  } else if(m.phase === 'playing'){
    title = 'Playing back\u2026';
    sub = cafeWave(true, false);
    btn = '<button class="cafe-playbtn" type="button" onclick="micPause()" aria-label="Pause">' + CI.pause + '</button>';
    extra = '<button class="mic-redo" type="button" onclick="micRecord()">Redo</button>';
  } else if(m.phase === 'ready'){
    title = 'Hear yourself';
    sub = '<span class="av-row-sub">Check the volume sounds right</span>';
    btn = '<button class="cafe-playbtn" type="button" onclick="micPlay()" aria-label="Play back">' + CI.play + '</button>';
    extra = '<button class="mic-redo" type="button" onclick="micRecord()">Redo</button>';
  } else {
    title = 'Test your mic';
    sub = '<span class="av-row-sub">Say something and hear it back</span>';
    btn = '<button class="cafe-playbtn" type="button" onclick="micRecord()" aria-label="Test your mic">' + GP.I.mic + '</button>';
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
    + '<span class="chev" aria-hidden="true">' + CI.chevRt + '</span>'
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
      + GP.esc(o) + '</button>';
  });
  return '<div class="dev-group">'
    + '<span class="dev-group-label" id="devLbl-' + key + '">' + GP.esc(d.label) + '</span>'
    + '<div class="dev-dd' + (open ? ' is-open' : '') + '">'
      + '<button type="button" class="dev-dd-btn" aria-haspopup="listbox"'
      + ' aria-expanded="' + (open ? 'true' : 'false') + '"'
      + ' aria-labelledby="devLbl-' + key + '"'
      + ' onclick="toggleDevMenu(\'' + key + '\')">'
      + '<span>' + GP.esc(d.value) + '</span>'
      + '<span class="chev" aria-hidden="true">' + CI.chevRt + '</span>'
      + '</button>'
      + (open ? '<div class="dev-dd-menu" role="listbox">' + opts + '</div>' : '')
    + '</div>'
  + '</div>';
}

function devicesSheet(){
  var body = '<div class="dev-grid">'
    + deviceDropdown('camera')
    + deviceDropdown('mic')
    + deviceDropdown('output')
    + '<div class="dev-group dev-test"><span class="dev-group-label">Microphone test</span>' + micTest() + '</div>'
    + '</div>';
  return cafeDialog({
    milky:true,
    cls:'dev-dialog',
    onScrim:'closeDevices()',
    title:'Audio &amp; camera settings',
    body:body,
    acts:'<button class="btn primary" type="button" onclick="closeDevices()">Done</button>'
  });
}

function screenAvCheck(){
  return lockupSolo()
    + '<div class="cafe-shell"></div>'
    + '<main class="av-canon cafe-av">'
      + '<header class="av-head"><h2>Check your setup</h2></header>'
      + '<section class="g-card av-card" aria-label="Camera and microphone check"><div class="av-stage">'
        + cafePreview()
        + cafeAvTools()
      + '</div></section>'
      + permHelper()
      + '<footer class="av-foot">'
        + avSettingsLink()
        + '<div class="acts"><button class="btn primary" type="button" onclick="startMatching()"'
          + (ST.perm === 'granted' ? '' : ' disabled') + '>Start matching</button></div>'
      + '</footer>'
    + '</main>'
    + (ST.devSheet ? devicesSheet() : '');
}

/* ---------------------------------------------------------- 3. SEARCHING */
function prefEdgeLine(){
  var band = eligibleBand();
  if(!band.atBottomEdge) return '';
  return '<p class="pref-edge">'
    + (band.lo === band.hi
      ? 'You\u2019re at the lowest level, so this matches you with ' + ladderLabel(band.lo) + '.'
      : 'There aren\u2019t three levels below you, so this matches you with '
        + ladderLabel(band.lo) + '\u2013' + ladderLabel(band.hi) + '.')
    + '</p>';
}

function levelsSheet(){
  var row = '';
  SCOPES.forEach(function(s){
    row += '<button class="g-choice stacked ink' + (ST.prefs.scope===s.id ? ' is-on' : '') + '" type="button"'
      + ' onclick="setScope(\'' + s.id + '\')">'
      + '<span class="ch-label">' + GP.esc(s.label) + '</span>'
      + (s.hint ? '<span class="ch-hint">' + GP.esc(s.hint) + '</span>' : '')
      + '</button>';
  });
  return cafeDialog({
    milky:true,
    cls:'levels-dialog',
    onScrim:'closeLevels()',
    title:'Choose partner levels',
    body:'<p class="pool-line">Adding more levels may help you match faster.</p>'
      + '<div class="pref-row">' + row + '</div>' + prefEdgeLine(),
    acts:'<button class="btn primary" type="button" onclick="closeLevels()">Keep searching</button>'
  });
}

function searchMap(uid){
  uid = uid || 'echoFade';
  var faces = {2:IMG_FACE_A, 5:IMG_FACE_B};
  var pins = [[18,48],[24,42],[36,70],[50,28],[48,42],[72,30]];
  var pinHtml = pins.map(function(p, i){
    var n = i + 1;
    var face = faces[n];
    return '<span class="search-pin p' + n + (face ? ' has-face' : '')
      + '" style="left:' + p[0] + '%;top:' + p[1] + '%">'
      + '<span class="pin-dot"></span>'
      + (face ? '<span class="pin-face"><img src="' + face + '" alt=""></span>' : '')
      + '</span>';
  }).join('');
  return '<div class="search-map" aria-hidden="true">'
    + '<img class="search-map-art" src="' + MAP_SRC + '" alt="">'
    + '<svg class="search-echoes" viewBox="0 0 616 275" focusable="false">'
      + '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="1" y2="0">'
        + '<stop offset="0" stop-color="#F7F6EF" stop-opacity="0"/>'
        + '<stop offset=".16" stop-color="#F7F6EF" stop-opacity=".5"/>'
        + '<stop offset=".5" stop-color="#F7F6EF" stop-opacity=".85"/>'
        + '<stop offset=".84" stop-color="#F7F6EF" stop-opacity=".5"/>'
        + '<stop offset="1" stop-color="#F7F6EF" stop-opacity="0"/>'
      + '</linearGradient></defs>'
      + '<path class="search-echo" d="M36 232 A 290 78 0 0 1 580 232" stroke="url(#' + uid + ')"/>'
      + '<path class="search-echo e2" d="M22 236 A 298 102 0 0 1 594 236" stroke="url(#' + uid + ')"/>'
      + '<path class="search-echo e3" d="M48 228 A 284 62 0 0 1 568 228" stroke="url(#' + uid + ')"/>'
      + '<path class="search-echo e4" d="M16 240 A 302 118 0 0 1 600 240" stroke="url(#' + uid + ')"/>'
      + '<path class="search-echo e5" d="M42 234 A 288 88 0 0 1 574 234" stroke="url(#' + uid + ')"/>'
    + '</svg>'
    + pinHtml
  + '</div>';
}

function searchScopeLine(){
  var b = eligibleBand();
  var n = b.renderableHi - b.lo + 1;
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
    + '<span class="chev" aria-hidden="true">' + CI.chevRt + '</span>'
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

function searchCloseBtn(icon){
  return '<button type="button" class="search-close" id="searchClose"'
    + ' aria-label="Close matching" aria-haspopup="dialog" aria-controls="searchClosePop"'
    + ' aria-expanded="' + (ST.closeSheet ? 'true' : 'false') + '"'
    + ' onclick="openCloseDecision()">' + icon + '</button>';
}

function closeDecisionMarkup(){
  return '<div class="search-close-scrim" id="searchCloseScrim" onclick="dismissCloseDecision()"></div>'
    + '<div class="search-close-pop" id="searchClosePop" role="dialog" aria-modal="true"'
      + ' aria-labelledby="searchCloseTitle" aria-describedby="searchCloseBody">'
      + '<button type="button" class="search-close-dismiss" onclick="dismissCloseDecision()" aria-label="Cancel">'
        + GP.I.x + '</button>'
      + '<h4 id="searchCloseTitle">What would you like to do?</h4>'
      + '<p id="searchCloseBody">We can keep looking while you explore the Hub, or stop matching altogether.</p>'
      + '<div class="acts">'
        + '<button class="btn primary" type="button" onclick="keepMatchingExplore()">Keep matching</button>'
        + '<button class="btn cream" type="button" onclick="stopMatching()">Stop matching</button>'
        + '<button class="btn ghost-ink search-close-cancel" type="button" onclick="dismissCloseDecision()">Cancel</button>'
      + '</div>'
    + '</div>';
}

function screenSearching(){
  return lockupSolo()
    + searchCloseBtn(GP.I.x)
    + '<div class="cafe-shell"></div>'
    + '<main class="cafe-stage searching-stage">'
      + '<div class="search-hero">'
        + '<div class="search-stack">'
          + searchMap('echoFade')
          + '<div class="search-status">'
            + '<h2 class="g-display">Looking for a partner\u2026</h2>'
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

function cafeFlashcard(card){
  var st = {revealed:ST.cardRevealed, marked:ST.cardMarked, playing:ST.cardPlaying};
  var mark = '<button class="fc-mark' + (st.marked?' on':'') + '" type="button"'
    + ' onclick="event.stopPropagation();cardMark()" aria-label="Bookmark">' + CI.bookmark + '</button>';
  var player = '<div class="fc-player" onclick="event.stopPropagation()">'
    + '<button class="cafe-playbtn" type="button" onclick="event.stopPropagation();cardPlay()"'
    + ' aria-label="' + (st.playing?'Pause':'Play') + '">' + (st.playing?CI.pause:CI.play) + '</button>'
    + cafeWave(st.playing, false)
    + '<span class="fc-speed">x1</span>'
    + '</div>';
  return '<div class="fc-wrap' + (st.revealed?' is-flip':'') + '">'
    + '<div class="fc-stage"><div class="fc-flip">'
      + '<div class="fc-face fc-q" onclick="cardFlip()">' + mark
        + '<div class="fc-body"><div class="fc-dir">' + GP.esc(card.dir) + '</div>'
        + '<div class="fc-en">' + GP.esc(card.en) + '</div></div>'
      + '</div>'
      + '<div class="fc-face fc-a" onclick="cardFlip()">' + mark
        + '<div class="fc-body"><div class="fc-ok">Correct answer</div>'
        + '<div class="fc-he" lang="he" dir="rtl">' + GP.esc(card.he) + '</div>' + player + '</div>'
      + '</div>'
    + '</div></div>'
    + '<div class="fc-nav">'
      + '<button class="fc-skip" type="button" onclick="cardPrev()" aria-label="Previous">' + CI.skipPrev + '</button>'
      + '<button class="fc-cta" type="button" onclick="' + (st.revealed?'cardNext()':'cardReveal()') + '">'
        + (st.revealed?'Next':'Show answer') + '</button>'
      + '<button class="fc-skip" type="button" onclick="cardNext()" aria-label="Next">' + CI.skipNext + '</button>'
    + '</div>'
    + '</div>';
}

function screenFlashcards(){
  var card = DECK[((ST.card % DECK.length) + DECK.length) % DECK.length];
  return '<div class="cafe-shell"></div>'
    + '<div class="fc-screen">'
      + '<div class="fc-top">'
        + '<button class="icon-btn" type="button" onclick="closeFlashcards()" aria-label="Back to searching">' + GP.I.x + '</button>'
        + '<span class="fc-status"><span class="mi-dot" aria-hidden="true"></span>Still looking for a partner\u2026</span>'
        + '<button class="btn ghost sm fc-close" type="button" onclick="closeFlashcards()">Close</button>'
      + '</div>'
      + cafeFlashcard(card)
    + '</div>';
}

function matchIndicator(){
  return '<button type="button" class="match-indicator" onclick="openSearch()">'
    + '<span class="mi-dot" aria-hidden="true"></span>'
    + '<span class="mi-copy">'
      + '<span class="mi-title">Caf\u00e9</span>'
      + '<span class="mi-line">Finding your Caf\u00e9 partner...</span>'
    + '</span>'
    + '<span class="mi-chev" aria-hidden="true">' + CI.chevRt + '</span>'
    + '</button>';
}

function screenHub(){
  return '<div class="hub-mock">'
      + '<aside class="hub-rail" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></aside>'
      + '<div class="hub-main">'
        + '<div class="hub-stamp">Hub \u2014 placeholder, not designed in this pass</div>'
        + '<div class="hub-grid"><i></i><i></i><i></i><i></i><i></i><i></i></div>'
        + (ST.matching ? matchIndicator() : '')
      + '</div>'
    + '</div>';
}

/* -------------------------------------------------------- 4. MATCH FOUND */
function matchCupIcon(){
  return '<img class="ice-cup" src="../cafe-playground-mobile/assets/cafe-cup-icon.png" alt="" aria-hidden="true">';
}
function matchLevelFact(id){
  var meta = GP.levelMeta(id);
  var icon = LEVEL_ICONS[id]
    ? '<img class="fact-ico" src="' + LEVEL_ICONS[id] + '" alt="" aria-hidden="true">'
    : GP.levelDot(id);
  return '<span class="fact fact-level">'
    + icon + GP.esc(meta.label) + '</span>';
}

function setMatchLayout(id){
  ST.matchLayout = id === 'framed' ? 'framed' : 'open';
  if(ST.state !== 'matched'){
    ST.matching = true;
    ST.bg = 'searching';
    setState('matched');
    return;
  }
  render();
}

/* Gym Ending confetti, same pieces and fall, originated around the partner card. */
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
    {ox:-28,oy:12},{ox:34,oy:-16},{ox:-10,oy:22},{ox:20,oy:8},
    {ox:-36,oy:-8},{ox:12,oy:28},{ox:40,oy:6},{ox:-18,oy:-22}
  ];
  var html = '<span class="match-confetti" aria-hidden="true">';
  var burst = 2.7;
  for(i=0;i<pieces.length;i++){
    b = pieces[i];
    var o = origins[i % origins.length];
    var jx = (i % 5) - 2;
    var jy = (i % 3) - 1;
    var ox = o.ox + jx * 9;
    var oy = o.oy + jy * 11;
    var dx = Math.round(b.dx*burst), dy = Math.round(b.dy*burst);
    var ex = Math.round(b.ex*burst), ey = Math.round(b.ey*burst);
    var mx = Math.round(dx+(ex-dx)*.62), my = Math.round(dy+(ey-dy)*.62);
    var vx = Math.round(dx+(ex-dx)*.84), vy = Math.round(dy+(ey-dy)*.84);
    var lx = Math.round(ex+(i%2?20:-28)), ly = Math.round(ey+(i%2?36:-16)+(i%5)*8);
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
  var framed = ST.matchLayout === 'framed';
  var enter = ST.matchEnter ? ' is-enter' : '';
  var card = '<div class="match-card' + (accepted?' is-waiting':'') + (framed?' is-framed':'') + '">'
    + '<img class="match-card-deco" src="../cafe-playground-mobile/assets/match-card-deco.png" alt="" aria-hidden="true">'
    + '<div class="match-intro">'
      + '<span class="match-photo"><img src="' + PARTNER.img + '" alt="' + GP.esc(PARTNER.name) + '"></span>'
      + '<div class="match-who">'
        + '<h4 class="match-name">' + GP.esc(PARTNER.name) + '</h4>'
        + '<div class="match-facts">'
          + matchLevelFact(PARTNER.level)
          + '<span class="fact fact-place"><img class="fact-pin" src="' + IMG_PIN + '" alt="" aria-hidden="true">' + GP.esc(PARTNER.location) + '</span>'
        + '</div>'
      + '</div>'
    + '</div>'
    + '<div class="ice">'
      + '<span class="ice-label">' + matchCupIcon() + '<span>' + GP.esc(PARTNER.ice.label) + '</span></span>'
      + '<span class="ice-text">' + GP.esc(PARTNER.ice.text) + '</span>'
    + '</div>'
    + (accepted
        ? '<div class="match-waiting">'
          + '<p class="mw-line">Waiting for ' + GP.esc(PARTNER.name) + ' to confirm\u2026</p>'
          + GP.loadLine()
          + '</div>'
        : '')
    + '</div>';

  var acts = accepted
    ? '<button class="btn match-keep" type="button" onclick="declineMatch()">Keep looking instead</button>'
    : '<button class="btn primary" type="button" onclick="acceptMatch()">Meet ' + GP.esc(PARTNER.name) + '</button>'
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

function screenMatched(){
  var behind = screenHub();
  if(ST.bg === 'searching') behind = screenSearching();
  else if(ST.bg === 'flashcards') behind = screenFlashcards();
  return '<div class="match-behind" inert aria-hidden="true">' + behind + '</div>' + matchSheet();
}

/* --------------------------------------------------- 5. SESSION AGREEMENT */
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
      + '<span class="agree-copy"><span class="agree-lead">' + GP.esc(t.lead) + '</span>'
      + '<span class="agree-support">' + GP.esc(t.support) + '</span></span>'
    + '</li>';
  });
  var ack = '<label class="agree-ack' + (ST.agreed?' is-on':'') + '">'
      + '<span class="agree-check">'
        + '<input id="agreeAck" type="checkbox"' + (ST.agreed?' checked':'') + ' onchange="onAgreeAck(this)">'
        + '<span class="agree-box" aria-hidden="true"></span>'
      + '</span>'
      + '<span class="agree-ack-copy">100% agree</span>'
    + '</label>';
  return lockup()
    + '<div class="cafe-shell"></div>'
    + cafeDialog({
        milky:true,
        cls:'agree-dialog',
        title:'Before jumping into the Caf\u00e9\u2026',
        body:'<p class="agree-intro">Here\u2019s what we\u2019re both agreeing to:</p>'
          + '<ul class="agree-list">' + list + '</ul>'
          + ack,
        acts:'<button class="btn primary" id="agreeCta" type="button" onclick="enterCafe()"'
          + (ST.agreed?'':' disabled') + '>Yalla, Caf\u00e9 time!</button>'
      });
}

/* ------------------------------------------------- 6. LIVE CAFE SESSION */
function textSheet(){
  var log = '';
  ST.textLog.forEach(function(m){
    log += '<div class="ts-msg' + (m.own?' own':'') + '">' + GP.esc(m.text) + '</div>';
  });
  return '<aside class="panel cafe-text-panel" aria-label="Activity and text">'
    + '<div class="panel-head"><span class="pt">Right now</span>'
      + '<button class="pclose" type="button" onclick="closeText()" aria-label="Close"'
      + GP.hubTipAttrs('Close') + '>' + GP.I.x + '</button></div>'
    + '<div class="ts-activity"><div class="ts-title">' + GP.esc(ACTIVITY.title) + '</div>'
    + '<div class="ts-body">' + GP.esc(ACTIVITY.body) + '</div></div>'
    + (log ? '<div class="ts-log" id="tsLog">' + log + '</div>' : '')
    + '<div class="composer">'
      + '<input id="tsInput" type="text" placeholder="Spell it, or type a short answer\u2026" autocomplete="off">'
      + '<button class="send" type="button" onclick="sendText()"' + GP.hubTipAttrs('Send') + '>' + GP.I.send + '</button>'
    + '</div>'
    + '<p class="ts-note">Nothing here is saved after this chat.</p>'
    + '</aside>';
}

function leaveSheet(){
  return cafeDialog({
    milky:true,
    cls:'leave-dialog',
    onScrim:'closeLeave()',
    title:'End this Caf\u00e9?',
    body:'<p>If something feels wrong or uncomfortable, you can leave right away \u2014 and let the team know what happened.</p>',
    acts:'<button class="btn danger-soft" type="button" onclick="endSession()">End session</button>'
      + '<button class="btn cream" type="button" onclick="endSession()">Report an issue</button>'
      + '<button class="btn cream" type="button" onclick="closeLeave()">Stay</button>'
  });
}

function keepOnSheet(){
  return cafeDialog({
    milky:true,
    cls:'keep-on-dialog',
    onScrim:'closeKeepOn()',
    title:'Caf\u00e9 needs the camera and mic on to keep going.',
    body:'<p class="keep-on-q">Want to leave the session?</p>',
    acts:'<button class="btn primary" type="button" onclick="closeKeepOn()">Stay</button>'
      + '<button class="btn cream" type="button" onclick="endSession()">Leave</button>'
  });
}

function partnerOffSheet(){
  return cafeDialog({
    milky:true,
    cls:'partner-off-dialog' + (ST.partnerOffFind?' is-wait':''),
    title:GP.esc(PARTNER.name) + '\u2019s camera or mic seems to be off.',
    body:'<p>We\u2019ll find you a new partner if they don\u2019t come back soon.</p>'
      + '<div class="po-status" role="status" aria-live="polite">'
        + '<span class="po-spin" aria-hidden="true"></span>'
        + '<span class="po-status-copy">Trying to reconnect\u2026</span>'
      + '</div>'
      + '<div class="po-acts" aria-hidden="' + (ST.partnerOffFind?'false':'true') + '">'
        + '<button class="btn cream po-find" type="button" onclick="findNewPartner()">Find me a new partner</button>'
      + '</div>'
  });
}

function dockTipHtml(){
  return '<button class="dock-tip" type="button" onclick="dismissDockTip()">'
    + '<span class="dock-tip-copy">Stuck? Lean on the toolbar for topics and exercises</span>'
    + '<span class="dock-tip-arrow" aria-hidden="true"></span>'
    + '</button>';
}

function screenLive(){
  var controls = [
    {icon:CI.wheel, label:'Topics', accent:true, onclick:'openWheel()'},
    {icon:CI.bolt,  label:'Practice', onclick:'openChallenge()'},
    {icon:GP.I.chat, label:'Text', active:ST.textOpen, onclick:'toggleText()'},
    {divider:true},
    {icon:GP.I.cam, label:ST.camOff?'Turn camera on':'Turn camera off', slash:ST.camOff, onclick:'toggleCam()'},
    {icon:GP.I.mic, label:ST.micOff?'Unmute':'Mute', slash:ST.micOff, onclick:'toggleMic()'}
  ];
  var dock = cafeFooter(controls, {label:'Leave & report', onclick:'openLeave()'});
  var sheetOpen = ST.textOpen || ST.leaveSheet || ST.keepOnSheet || ST.partnerOffSheet;
  if(ST.dockTip && !sheetOpen){
    dock = dock.replace('<div class="g-footer">', '<div class="g-footer">' + dockTipHtml());
  }

  return '<div class="cafe-shell deep"></div>'
    + '<div class="cafe-topbar">'
      + lockup()
      + '<div class="top-right">' + GP.timePill(ST.left, DUR.sessionFinal) + '</div>'
    + '</div>'
    + '<div class="cafe-tiles' + (ST.textOpen?' with-panel':'') + '">'
      + '<div class="g-split">'
        + cafeTile(PARTNER.name, {img:PARTNER.img, camOff:ST.partnerCamOff, micOff:ST.partnerMicOff})
        + cafeTile('You', {alt:true, img:IMG_YOU, camOff:ST.camOff, micOff:ST.micOff})
      + '</div>'
    + '</div>'
    + (ST.textOpen ? textSheet() : '')
    + dock
    + (ST.leaveSheet ? leaveSheet() : '')
    + (ST.keepOnSheet ? keepOnSheet() : '')
    + (ST.partnerOffSheet ? partnerOffSheet() : '');
}

/* ------------------------------ 7. SESSION ENDING / SEARCHING AGAIN */
function screenEnding(){
  return lockupSolo()
    + '<div class="cafe-shell"></div>'
    + '<main class="cafe-stage cafe-ending">'
      + '<div class="ending-copy">'
        + '<h2 class="g-display">Time flies!</h2>'
        + '<p class="g-sub">You and ' + GP.esc(PARTNER.name) + ' just spoke Hebrew for 6 minutes.</p>'
      + '</div>'
      + '<div class="cafe-acts ending-acts">'
        + '<button class="btn primary" type="button" onclick="matchAgain()">Find me another partner</button>'
        + '<button class="text-cta" type="button" onclick="leaveCafeHome()">Go back to homepage</button>'
      + '</div>'
    + '</main>';
}

/* ----------------------------------------------------------- transitions */
function seedFor(state){
  ST.softLoading = false;
  if(state === 'entry'){
    ST.matching = false;
    ST.searchElapsed = 0;
    ST.exploreShown = false;
    ST.closeSheet = false;
    ST.textOpen = false; ST.textLog = [];
    ST.leaveSheet = false; ST.keepOnSheet = false;
    ST.agreed = false; ST.left = 0;
    ST.levelsSheet = false; ST.devSheet = false; ST.devMenu = null;
    ST.dockTip = false; ST.dockTipSeen = false;
    ST.rangeHintSeen = false;
    ST.specHot = -1;
    ST.specActiveHandle = null;
    clearPartnerOff();
    clearTimeout(dockTipT); dockTipT = null;
  }
  if(state === 'avcheck'){ ST.left = 0; ST.devSheet = false; ST.devMenu = null; micReset(); }
  if(state === 'searching'){
    ST.matching = true; ST.left = DUR.searchTo; ST.levelsSheet = false;
    ST.closeSheet = false;
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
    ST.partner.name = PARTNER.name;
    ST.partner.level = PARTNER.level;
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

/* Product actions */
function setScope(id){
  ST.prefs.scope = id;
  var scope = scopeById(id);
  var me = myLevelIndex();
  var n = LEVEL_DATA.eligible.length;
  var lo = Math.max(0, me - (scope.lower || 0));
  var hi = Math.min(n - 1, me + (scope.upper || 0));
  applyLevelRange(lo, hi);
}
function setMyLevel(id){
  if(LEVEL_DATA.eligible.indexOf(id) === -1) return;
  LEVEL_DATA.myLevel = id;
  ST.myLevel = id;
  applyLevelRange(0, LEVEL_DATA.eligible.length - 1);
}
/* Entry CTA is unchanged. Destination is now A/V check — matching starts there. */
function startSearch(){ setState('avcheck'); }
function startMatching(){
  if(ST.perm !== 'granted') return;
  ST.searchElapsed = 0;
  ST.exploreShown = false;
  ST.closeSheet = false;
  setState('searching');
}
function stopMatching(){
  ST.closeSheet = false;
  ST.exploreShown = false;
  setState('entry');
  cafeToast('Matching stopped.');
}

function openLevels(){ ST.levelsSheet = true; render(); }
function closeLevels(){ ST.levelsSheet = false; render(); }

function keepExploring(){
  ST.closeSheet = false;
  ST.state = 'hub';
  if(ST.matching && ST.left <= 0) ST.left = DUR.searchTo;
  try{ history.replaceState(null,'','#hub'); }catch(e){}
  render();
}
function keepMatchingExplore(){ keepExploring(); }
function matchAgain(){ startMatching(); }
function leaveCafeHome(){
  ST.closeSheet = false;
  ST.exploreShown = false;
  setState('entry');
}
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
  var host = document.getElementById('frame');
  if(!host) return;
  host.insertAdjacentHTML('beforeend', closeDecisionMarkup());
  var btn = document.getElementById('searchClose');
  if(btn) btn.setAttribute('aria-expanded', 'true');
  bindCloseDecisionFocus();
}
function dismissCloseDecision(){
  ST.closeSheet = false;
  var pop = document.getElementById('searchClosePop');
  var scrim = document.getElementById('searchCloseScrim');
  if(pop) pop.remove();
  if(scrim) scrim.remove();
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

function revealExplore(){
  if(ST.searchElapsed < DUR.exploreAfter) return;
  ST.exploreShown = true;
}

function offerMatch(){
  ST.bg = (ST.state === 'flashcards') ? 'flashcards'
        : (ST.state === 'searching') ? 'searching' : 'hub';
  setState('matched');
}
function acceptMatch(){
  if(ST.state !== 'matched') return;
  ST.matchPhase = 'accepted';
  ST.left = DUR.partnerConfirm;
  render();
}
function declineMatch(){
  ST.matching = true;
  ST.left = DUR.searchTo;
  ST.searchElapsed = 0;
  ST.exploreShown = false;
  ST.closeSheet = false;
  ST.state = ST.bg;
  try{ history.replaceState(null, '', '#' + ST.state); }catch(e){}
  render();
}
function partnerDeclines(){
  declineMatch();
  cafeToast(PARTNER.name + ' kept looking. Still matching\u2026');
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

var MIC_LEN = 4;
function micReset(){ ST.mic = {phase:'idle', left:0, pos:0}; }
function micRecord(){
  if(ST.micOff){ cafeToast('Turn your microphone on to test it'); return; }
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

function openFlashcards(){ ST.closeSheet = false; setState('flashcards'); }
function closeFlashcards(){ ST.state = 'searching'; try{ history.replaceState(null,'','#searching'); }catch(e){} render(); }
function cardReveal(){ ST.cardRevealed = true; render(); }
function cardFlip(){ ST.cardRevealed = !ST.cardRevealed; ST.cardPlaying = false; render(); }
function cardMark(){ ST.cardMarked = !ST.cardMarked; render(); }
function cardPlay(){ ST.cardPlaying = !ST.cardPlaying; render(); }
function cardStep(d){ ST.card += d; ST.cardRevealed = false; ST.cardMarked = false; ST.cardPlaying = false; render(); }
function cardPrev(){ cardStep(-1); }
function cardNext(){ cardStep(1); }

function openWheel(){ dismissDockTip(); cafeToast('Topics \u2014 entry point only in this pass'); }
function openChallenge(){ dismissDockTip(); cafeToast('Practice \u2014 entry point only in this pass'); }

function toggleText(){ dismissDockTip(); ST.textOpen = !ST.textOpen; render(); }
function closeText(){ ST.textOpen = false; render(); }
function toggleChat(){ toggleText(); }
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
    var el = document.querySelector('.partner-off-dialog');
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
function endSession(){ ST.leaveSheet = false; ST.keepOnSheet = false; clearPartnerOff(); setState('ending'); }
function jumpFinal(){ if(ST.state !== 'live') setState('live'); ST.left = 20; render(); }

/* ------------------------------------------------------------- the clock */
var TIMED = {avcheck:1, searching:1, hub:1, flashcards:1, matched:1, live:1, ending:1};

function clockTick(){
  if(!ST.clockOn || !TIMED[ST.state]) return;
  var s = ST.state;

  if(s === 'avcheck'){
    if(ST.mic.phase === 'recording'){
      ST.mic.left--;
      if(ST.mic.left <= 0){ micStop(); return; }
      syncClockUI();
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
    syncClockUI();
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
      cafeToast('The window closed. Still matching\u2026');
      return;
    }
    syncClockUI();
    return;
  }
  if(s === 'live'){
    ST.left--;
    if(ST.left <= 0){ setState('ending'); return; }
    syncClockUI();
    return;
  }
  if(s === 'ending'){
    ST.left--;
  }
}

function syncClockUI(){
  if(ST.state === 'searching'){
    syncSwitcher();
    return;
  }
  if(ST.state === 'avcheck'){
    var mc = document.querySelector('.mic-test .mt-count');
    if(mc) mc.textContent = ST.mic.left + 's';
    return;
  }
  if(ST.state === 'matched'){
    var n = document.getElementById('offerNum');
    if(n) n.textContent = ST.offerLeft + 's';
    var t = document.querySelector('.match-timer');
    if(t) t.classList.toggle('is-low', ST.offerLeft <= 10);
    syncSwitcher();
    return;
  }
  if(ST.state === 'live'){
    var pill = document.querySelector('.g-timepill');
    if(pill){
      var t = pill.querySelector('.time');
      if(t) t.textContent = GP.mmss(ST.left);
      pill.classList.toggle('final', ST.left <= DUR.sessionFinal);
    }
  }
  syncSwitcher();
}

/* ----------------------------------------------------------------- render */
function render(){
  var f = document.getElementById('frame');
  if(!f) return;
  var s = ST.state, html = '';
  if(s === 'entry') html = screenEntry();
  else if(s === 'avcheck') html = screenAvCheck();
  else if(s === 'searching') html = screenSearching();
  else if(s === 'hub') html = screenHub();
  else if(s === 'flashcards') html = screenFlashcards();
  else if(s === 'matched') html = screenMatched();
  else if(s === 'agreement') html = screenAgreement();
  else if(s === 'live') html = screenLive();
  else if(s === 'ending') html = screenEnding();
  else html = screenEntry();

  f.innerHTML = html + GP.softLoading(ST.softLoading);
  f.classList.toggle('on-light', s === 'hub' || (s === 'matched' && ST.bg === 'hub'));
  f.classList.toggle('is-entry', s === 'entry');

  unbindEntrySpectrum();
  if(s === 'entry'){
    bindSpectrum(f);
    bindDesktopWelcomeEntrance();
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
  if(ST.closeSheet && ST.state === 'searching') bindCloseDecisionFocus();
  if(s === 'matched'){
    var entering = ST.matchEnter;
    bindMatchTakeover(entering);
    ST.matchEnter = false;
  }
  syncSwitcher();
}

/* ------------------------------------------------------------- switcher */
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
  var note = document.getElementById('stateNote');
  if(note){
    var b = eligibleBand();
    note.textContent = (NOTES[ST.state] || '')
      + '  ·  matching ' + (ST.matching?'live':'stopped')
      + ' · you are ' + GP.levelMeta(LEVEL_DATA.myLevel).label
      + ' · range ' + ladderLabel(b.lo) + '\u2013' + ladderLabel(b.renderableHi)
      + ' · cam ' + (ST.camOff?'off':'on')
      + ' · mic ' + (ST.micOff?'off':'on')
      + (ST.state === 'matched' ? ' · offer ' + ST.offerLeft + 's (' + ST.matchPhase + ')' : '')
      + (ST.state === 'live' ? ' · ' + GP.mmss(ST.left) + ' left' : '')
      + (TIMED[ST.state] && ST.state !== 'live' && ST.state !== 'matched' ? ' · t-' + ST.left + 's' : '');
  }
}

function toggleClock(){ ST.clockOn = !ST.clockOn; syncSwitcher(); }
function togglePresent(){
  var on = document.body.classList.toggle('present');
  document.getElementById('modeBtn').textContent = on ? 'Exit presentation' : 'Presentation mode';
}
function runHappyPath(){
  ST.clockOn = true;
  setState('entry');
  setTimeout(startSearch, 700);
  setTimeout(startMatching, 2200);
}

function replayWelcomeEntrance(){
  if(INTERVIEW) return;
  ST.welcomeEntranceSeen = false;
  if(ST.state === 'entry') render();
  else setState('entry');
}

function onCafeKey(ev){
  if(ev.key !== 'Escape') return;
  if(ST.closeSheet){ dismissCloseDecision(); return; }
  if(ST.devSheet){ closeDevices(); return; }
  if(ST.levelsSheet){ closeLevels(); return; }
  if(ST.textOpen && ST.state === 'live'){ closeText(); return; }
  if(ST.leaveSheet){ closeLeave(); return; }
  if(ST.keepOnSheet){ closeKeepOn(); return; }
  if(ST.state === 'flashcards'){ closeFlashcards(); }
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

/* ---------------------------------------------------------------- boot */
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
    if(s && ORDER.indexOf(s) === -1) s = '';
    if(s) ST.state = s;
    if(p.get('mode') === 'presentation') document.body.classList.add('present');
  }
  seedFor(ST.state);

  document.querySelectorAll('.sc').forEach(function(b){
    b.onclick = function(){
      if(INTERVIEW) return;
      var v = b.dataset.sc;
      if(v === 'matched'){ ST.matching = true; ST.bg = 'searching'; ST.searchElapsed = DUR.exploreAfter; ST.exploreShown = true; }
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

  GP.initHubTips();
  render();
  if(!INTERVIEW){
    var review = p.get('review');
    if(review === 'search-initial') reviewSearchInitial();
    else if(review === 'search-explore') reviewSearchExplore();
    else if(review === 'search-close') reviewSearchClose();
    else if(review === 'hub-matching') reviewHubMatching();
    else if(review === 'stopped') reviewMatchingStopped();
  }
  setInterval(clockTick, 1000);
})();
