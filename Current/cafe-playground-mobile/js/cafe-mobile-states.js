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
  searchTo:12,        // searching -> a match is offered
  offer:30,           // the response window. Product value.
  partnerConfirm:4,   // the partner answers this long after you accept
  session:360,        // 6:00
  sessionFinal:30,    // the clock warms to yellow below this
  ending:7            // ending -> back to the Hub, still matching
};

/* =========================================================================
   LEVEL DATA — CONFIGURABLE, NOT CANONICAL
   -------------------------------------------------------------------------
   No authoritative level ladder exists in this repo, so none is asserted here.
   `eligible` is the set of levels this student may choose to match with; it is
   an unordered set, and nothing in the UI implies a count, an ordering, a
   "levels above/below" relationship or a top and bottom edge.

   Replace this object wholesale when real product data lands. It is the only
   place level data is declared.
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
  level:'lightblue',
  location:'Berlin, Germany',
  img:IMG_PARTNER,
  ice:{label:'How they drink coffee', text:'Double espresso with almond milk'}
};

/* Content of the agreement is product-specified. This is the only copy of it. */
var AGREEMENT_TERMS = [
  'Be respectful and welcoming.',
  'Keep your camera on throughout the session.',
  'Make your best effort to speak in Hebrew.',
  'Create a safe and supportive environment for your partner.'
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
  entry:'1 \u00b7 Entry. An invitation. Own level selected by default; more can be added. Nothing is matching yet.',
  avcheck:'2 \u00b7 A/V check, now before matching and mandatory on every entry. Its CTA is the real "Start matching".',
  searching:'3 \u00b7 Active search. Not a waiting room \u2014 "Keep exploring" leaves and matching continues. Flashcards are optional.',
  hub:'3b \u00b7 Placeholder Hub carrying the persistent matching indicator. The Hub itself is not designed in this pass.',
  flashcards:'3c \u00b7 Optional practice while waiting. The Gym Solo deck. A match interrupts it; declining returns here.',
  matched:'4 \u00b7 Match found. A 30s interrupt over whatever you were doing. Accept keeps the same surface and waits for the partner.',
  agreement:'5 \u00b7 Session agreement. Only after both accepted. Four principles, one acknowledgement, no decline.',
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
  /* Own level is selected and fixed. Additional eligible levels may be added
     to widen the search; they cannot replace the student's own level. */
  selected:[LEVEL_DATA.myLevel],
  matchPhase:'offer',     // offer | accepted
  offerLeft:DUR.offer,
  searchElapsed:0,
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
  leaveSheet:false
};

/* ---------------------------------------------------------------- helpers */
function isSelected(id){ return ST.selected.indexOf(id) !== -1; }
function cafeLockup(sub){
  var mark = '<img class="cafe-mark" src="cafe-mark.png" alt="" aria-hidden="true">';
  return GM.lockup(mark, 'Caf\u00e9', sub);
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
    : '<p class="pref-intro">Who would you like to meet?</p>';
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

function screenEntry(){
  return '<div class="transition-shell"></div>'
    + cafeLockup()
    + '<main class="cafe-entry">'
      + '<h2 class="cafe-display">Fancy a <b>coffee chat</b>?</h2>'
      + '<p class="cafe-sub">Six minutes of Hebrew with someone new.</p>'
      + levelPicker()
      + '<div class="cafe-acts">'
        + '<button class="primary-cta" type="button" onclick="goAvCheck()"'
          + (ST.selected.length?'':' disabled') + '>Continue</button>'
      + '</div>'
    + '</main>';
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
function screenSearching(){
  var n = ST.selected.length;
  return '<div class="transition-shell"></div>'
    + cafeLockup()
    + '<main class="cafe-stage">'
      + '<div class="search-orb" aria-hidden="true">'
        + '<span class="ring"></span><span class="ring"></span><span class="ring"></span>'
        + '<span class="core">' + GM.I.search + '</span>'
      + '</div>'
      + '<h2 class="cafe-display">Looking for a partner\u2026</h2>'
      + '<p class="cafe-sub">We\u2019ll tell you the moment someone\u2019s free. You don\u2019t have to wait here.</p>'
      + '<p class="search-summary"><span>Searching across ' + n + (n === 1 ? ' level' : ' levels') + '</span>'
        + '<span class="sep">\u00b7</span>'
        + '<button type="button" class="edit" onclick="openLevels()">Edit</button></p>'
      + '<div class="search-meta">' + GM.loadDots() + '</div>'
      + '<button type="button" class="wait-practice" onclick="openFlashcards()">'
        + '<span class="wp-icon">' + GM.I.cards + '</span>'
        + '<span class="wp-copy"><span class="wp-kicker">While you wait</span>'
        + '<span class="wp-title">Practice a few flashcards</span></span>'
        + '<span class="chev" aria-hidden="true">' + GM.I.chevRt + '</span>'
      + '</button>'
      + '<div class="cafe-acts">'
        + '<button class="primary-cta" type="button" onclick="keepExploring()">Keep exploring</button>'
        + '<button class="ghost-cta" type="button" onclick="stopMatching()">Stop matching</button>'
      + '</div>'
    + '</main>'
    + (ST.levelsSheet ? levelsSheet() : '');
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
      + '<span class="mi-line">Looking for a partner\u2026</span>'
    + '</span>'
    + '<span class="mi-chev" aria-hidden="true">' + GM.I.chevUp + '</span>'
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
   4 · MATCH FOUND  —  a time-sensitive interrupt, on the Gym milky sheet
   ========================================================================= */
function matchSheet(){
  var accepted = (ST.matchPhase === 'accepted');
  var low = ST.offerLeft <= 10;

  var card = '<div class="match-card' + (accepted?' is-waiting':'') + '">'
    + '<span class="match-photo"><img src="' + PARTNER.img + '" alt="' + GM.esc(PARTNER.name) + '"></span>'
    + '<h4 class="match-name">' + GM.esc(PARTNER.name) + '</h4>'
    + '<div class="match-facts">'
      + '<span class="fact">' + GM.levelDot(PARTNER.level) + GM.esc(GM.levelMeta(PARTNER.level).label) + '</span>'
      + '<span class="fact">' + GM.I.pin + GM.esc(PARTNER.location) + '</span>'
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
        : '<div class="match-count' + (low?' is-low':'') + '"><span class="num" id="offerNum">'
          + ST.offerLeft + 's</span><span>to answer</span></div>')
    + '</div>';

  var acts = accepted
    ? '<button class="btn" type="button" onclick="declineMatch()">Keep looking instead</button>'
    : '<button class="btn primary" type="button" onclick="acceptMatch()">Meet ' + GM.esc(PARTNER.name) + '</button>'
      + '<button class="btn" type="button" onclick="declineMatch()">Keep looking</button>';

  return GM.sheet({
    milky:true,
    cls:'match-sheet',
    body:'<h4>Someone\u2019s free to talk</h4>' + card,
    acts:acts,
    resp:ST.offerLeft
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
   ========================================================================= */
function screenAgreement(){
  var list = '';
  AGREEMENT_TERMS.forEach(function(t){
    list += '<li><span class="bullet" aria-hidden="true"></span><span>' + GM.esc(t) + '</span></li>';
  });
  return '<div class="transition-shell"></div>'
    + cafeLockup('with ' + PARTNER.name)
    + GM.sheet({
        milky:true,
        cls:'agree-sheet',
        body:'<h4>Before you sit down</h4>'
          + '<p class="agree-intro">You\u2019re about to talk with ' + GM.esc(PARTNER.name) + '. In Caf\u00e9 we all agree to:</p>'
          + '<ul class="agree-list">' + list + '</ul>',
        acts:'<button class="btn primary" type="button" onclick="enterCafe()">Got it \u2014 let\u2019s talk</button>'
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
    body:'<h4>Leave this chat?</h4>'
      + '<p>If something feels wrong or uncomfortable, you can leave right away \u2014 and let the team know what happened.</p>',
    acts:'<button class="btn danger-soft" type="button" onclick="endSession()">Leave chat</button>'
      + '<button class="btn" type="button" onclick="endSession()">Report an issue</button>'
      + '<button class="btn" type="button" onclick="closeLeave()">Cancel \u2014 stay in the chat</button>'
  });
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

  return GM.roomHeader(
      GM.roomTime(ST.left, {cap:'Chat', final:ST.left <= DUR.sessionFinal}),
      'openLeave()'
    )
    + '<div class="rstage">'
      + GM.half('top', PARTNER.name, {img:PARTNER.img})
      + GM.half('bottom', 'You', {img:IMG_YOU, camOff:ST.camOff, micOff:ST.micOff})
    + '</div>'
    + dock
    + (ST.textOpen ? textSheet() : '')
    + (ST.leaveSheet ? leaveSheet() : '');
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
    ST.matching = false; ST.searchElapsed = 0; ST.textOpen = false;
    ST.textLog = []; ST.leaveSheet = false; ST.left = 0; ST.levelsSheet = false;
  }
  /* every Café entry runs the check, so it always starts from scratch */
  if(state === 'avcheck'){ ST.left = 0; ST.devSheet = false; micReset(); }
  if(state === 'searching'){ ST.matching = true; ST.left = DUR.searchTo; ST.levelsSheet = false; }
  if(state === 'hub'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'flashcards'){ if(!ST.matching){ ST.matching = true; ST.left = DUR.searchTo; } }
  if(state === 'matched'){
    ST.matchPhase = 'offer';
    ST.offerLeft = DUR.offer;
    PARTNER.level = drawPartnerLevel();
  }
  if(state === 'live'){ ST.left = DUR.session; ST.textLog = []; ST.textOpen = false; ST.leaveSheet = false; }
  if(state === 'ending'){ ST.left = DUR.ending; ST.textOpen = false; ST.leaveSheet = false; }
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
  if(id === LEVEL_DATA.myLevel) return;
  var i = ST.selected.indexOf(id);
  if(i === -1) ST.selected.push(id); else ST.selected.splice(i, 1);
  if(ST.selected.indexOf(LEVEL_DATA.myLevel) === -1) ST.selected.unshift(LEVEL_DATA.myLevel);
  render();
}
function selectAllLevels(){ ST.selected = LEVEL_DATA.eligible.slice(); render(); }
function selectOnlyMine(){ ST.selected = [LEVEL_DATA.myLevel]; render(); }
/* Editing mid-search does not pause the search. */
function openLevels(){ ST.levelsSheet = true; render(); }
function closeLevels(){ if(!ST.selected.length) return; ST.levelsSheet = false; render(); }

function goAvCheck(){ if(!ST.selected.length) return; setState('avcheck'); }
function startMatching(){ if(!ST.selected.length || ST.perm !== 'granted') return; setState('searching'); }
/* Leaving the search screen does not stop the search. */
function keepExploring(){ ST.state = 'hub'; try{ history.replaceState(null,'','#hub'); }catch(e){} render(); }
function openSearch(){ ST.state = 'searching'; try{ history.replaceState(null,'','#searching'); }catch(e){} render(); }
/* The single exit. Matching ends here, or when the app closes. */
function stopMatching(){ setState('entry'); }

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

function setPerm(p){ ST.perm = p; render(); }
function toggleCam(){ ST.camOff = !ST.camOff; render(); }
function toggleMic(){
  ST.micOff = !ST.micOff;
  if(ST.micOff) micReset();
  render();
}
function toggleBlur(){ ST.blur = !ST.blur; render(); }
function enterCafe(){ setState('live'); }

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
function openFlashcards(){ setState('flashcards'); }
function closeFlashcards(){ ST.state = 'searching'; try{ history.replaceState(null,'','#searching'); }catch(e){} render(); }
function cardReveal(){ ST.cardRevealed = true; render(); }
function cardFlip(){ ST.cardRevealed = !ST.cardRevealed; ST.cardPlaying = false; render(); }
function cardMark(){ ST.cardMarked = !ST.cardMarked; render(); }
function cardPlay(){ ST.cardPlaying = !ST.cardPlaying; render(); }
function cardStep(d){ ST.card += d; ST.cardRevealed = false; ST.cardMarked = false; ST.cardPlaying = false; render(); }
function cardPrev(){ cardStep(-1); }
function cardNext(){ cardStep(1); }

/* Entry points only in this pass — the experiences themselves are not designed. */
function openWheel(){ GM.toast('Spin the Wheel \u2014 entry point only in this pass'); }
function openChallenge(){ GM.toast('Challenge mode \u2014 entry point only in this pass'); }

function toggleText(){ ST.textOpen = !ST.textOpen; render(); }
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
function openLeave(){ ST.leaveSheet = true; render(); }
function closeLeave(){ ST.leaveSheet = false; render(); }
/* Ends this chat. Matching stays live and picks up again on its own. */
function endSession(){ ST.leaveSheet = false; setState('ending'); }


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
    var c = document.querySelector('.match-count');
    if(c) c.classList.toggle('is-low', ST.offerLeft <= 10);
    var r = document.querySelector('.match-sheet .respline');
    if(r) r.classList.toggle('is-low', ST.offerLeft <= 10);
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

  el.innerHTML = GM.statusbar() + html;
  el.classList.toggle('on-light', s === 'hub' || (s === 'matched' && ST.bg === 'hub'));

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


/* -------------------------------------------------------------------- boot */
function applyHash(){
  var h = (location.hash || '').replace('#','');
  if(h && ORDER.indexOf(h) !== -1 && h !== ST.state) setState(h);
}
(function boot(){
  var p = new URLSearchParams(location.search);
  var s = p.get('state') || (location.hash || '').replace('#','');
  if(s && ORDER.indexOf(s) !== -1) ST.state = s;
  seedFor(ST.state);

  document.querySelectorAll('.sc').forEach(function(b){
    b.onclick = function(){
      var v = b.dataset.sc;
      /* the review switcher reaches every state directly, including the ones
         that are only ever entered from a background process */
      if(v === 'matched'){ ST.matching = true; ST.bg = 'hub'; }
      if(v === 'hub' || v === 'searching' || v === 'flashcards') ST.matching = true;
      setState(v);
    };
  });
  window.addEventListener('hashchange', applyHash);

  render();
  setInterval(tick, 1000);
})();
