(function () {
  "use strict";

  /* Class pods: lesson list, lesson details, and one shared player.
     There is no audio in this prototype. Playback is a clock that moves
     through the track lengths below, at the chosen speed.
     ?pods=reset clears saved progress. ?pods=open opens the modal on load. */

  var STORE = "cc-class-pods-v1";
  var TOPICS = "מעניין + מילת שאלה · לחכות · לקוות";
  var TITLES = ["מעניין + מילת שאלה", "חזרות", "לחכות- שם פועל והווה", "לקוות, הווה ושם פועל- תזכורת", "דרילינג", "לאו דווקא", "דרילינג"];
  var SPEEDS = [0.8, 1, 1.3, 1.5, 1.8, 2];
  var TICK_MS = 250;
  var SAVE_MS = 2000;
  var RESTART_AFTER = 3;

  /* Track lengths in seconds are the only source for durations. Lesson
     length, "min left", the list capsules and the player bar all come from them. */
  function lesson(number, lengths, options) {
    options = options || {};
    return {
      id: (options.prefix || "") + "lesson-" + number,
      number: number,
      topics: TOPICS,
      isNew: !!options.isNew,
      seed: options.seed || null,
      tracks: lengths.map(function (dur, index) {
        return { title: TITLES[index % TITLES.length], dur: dur, kind: "Content" };
      })
    };
  }
  function finished(count) {
    var played = [];
    for (var i = 0; i < count; i += 1) played.push(i);
    return { completed: true, played: played };
  }

  var LESSONS = [
    lesson(12, [190, 190, 200, 180, 190, 180, 190], { isNew: true }),
    lesson(11, [150, 150, 241, 60, 96, 155, 155]),
    lesson(10, [50, 40, 50, 40, 60], { seed: { pos: { track: 4, t: 0 }, played: [0, 1, 2, 3] } }),
    lesson(9, [120, 90, 120, 90], { seed: finished(4) }),
    lesson(8, [120, 90, 120, 90], { seed: finished(4) }),
    lesson(7, [120, 150, 90, 120]),
    lesson(6, [90, 60, 120]),
    lesson(5, [90, 60, 120]),
    lesson(4, [120, 90, 120, 90], { seed: finished(4) }),
    lesson(3, [120, 90, 120, 90], { seed: finished(4) }),
    lesson(2, [120, 90, 120, 90], { seed: finished(4) }),
    lesson(1, [120, 90, 120, 90], { seed: finished(4) })
  ];

  /* Levels match the Hub's course list. Past courses reuse the same lesson
     shapes, all completed, with their own ids so progress never mixes. */
  var COURSES = [
    { id: "lb-nov-2026", name: "Light-Blue", term: "November 2026", current: true, color: "#90C7FC", mark: null },
    { id: "lb-may-2026", name: "Light-Blue", term: "May 2026", color: "#90C7FC", mark: null },
    { id: "yellow-nov-2025", name: "Yellow", term: "November 2025", color: "#FFE300", mark: "assets/icons/hub/level-yellow.png" },
    { id: "orange-may-2025", name: "Orange", term: "May 2025", color: "#F69700", mark: "assets/icons/hub/level-orange.png" },
    { id: "pink-nov-2024", name: "Pink", term: "November 2024", color: "#F7AAF3", mark: "assets/icons/hub/level-pink.png" }
  ];
  var courseById = {};
  var byId = {};
  COURSES.forEach(function (course) {
    courseById[course.id] = course;
    course.lessons = course.current ? LESSONS : LESSONS.map(function (item) {
      var lengths = item.tracks.map(function (track) { return track.dur; });
      return lesson(item.number, lengths, { prefix: course.id + "/", seed: finished(lengths.length) });
    });
    course.defaultId = course.current ? "lesson-11" : course.lessons[0].id;
    course.lessons.forEach(function (item) {
      item.course = course;
      byId[item.id] = item;
    });
  });
  var ALL_LESSONS = Object.keys(byId).map(function (id) { return byId[id]; });

  var params = new URLSearchParams(location.search);
  if (params.get("pods") === "reset") {
    try { localStorage.removeItem(STORE); } catch (error) { /* storage unavailable */ }
  }

  var progress = {};
  var prefs = { speed: 1, volume: 0.8, muted: false };
  var ui = { open: false, courseId: COURSES[0].id, selectedId: COURSES[0].defaultId, trackListFor: null, listFor: null };
  var player = { id: null, playing: false, finished: false };

  function freshProgress(item) {
    var seed = item.seed || {};
    var played = item.tracks.map(function (track, index) {
      return (seed.played || []).indexOf(index) !== -1;
    });
    return {
      pos: seed.pos ? { track: seed.pos.track, t: seed.pos.t } : null,
      played: played,
      completed: !!seed.completed
    };
  }

  function load() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch (error) { saved = null; }
    ALL_LESSONS.forEach(function (item) {
      var base = freshProgress(item);
      var stored = saved && saved.lessons && saved.lessons[item.id];
      if (stored) {
        if (stored.pos && stored.pos.track >= 0 && stored.pos.track < item.tracks.length) {
          base.pos = { track: stored.pos.track, t: Math.max(0, Math.min(+stored.pos.t || 0, item.tracks[stored.pos.track].dur)) };
        } else {
          base.pos = null;
        }
        if (Array.isArray(stored.played)) base.played = item.tracks.map(function (track, index) { return !!stored.played[index]; });
        base.completed = !!stored.completed;
      }
      progress[item.id] = base;
    });
    if (saved && saved.prefs) {
      if (SPEEDS.indexOf(saved.prefs.speed) !== -1) prefs.speed = saved.prefs.speed;
      var volume = +saved.prefs.volume;
      if (volume >= 0 && volume <= 1) prefs.volume = volume;
      prefs.muted = !!saved.prefs.muted;
    }
  }

  function save() {
    var data = { lessons: progress, prefs: prefs };
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (error) { /* storage unavailable */ }
  }

  /* ------------------------------------------------------------- Derived */
  function total(item) {
    return item.tracks.reduce(function (sum, track) { return sum + track.dur; }, 0);
  }
  function elapsed(item) {
    var pos = progress[item.id].pos;
    if (!pos) return 0;
    var sum = pos.t;
    for (var i = 0; i < pos.track; i += 1) sum += item.tracks[i].dur;
    return sum;
  }
  function left(item) {
    return Math.max(0, total(item) - elapsed(item));
  }
  function untouched(item) {
    var p = progress[item.id];
    return !p.completed && !p.pos && p.played.every(function (on) { return !on; });
  }
  function isPlaying(item) {
    return player.id === item.id && player.playing;
  }
  /* play: never started · resume: has a saved place · replay: completed, no place · playing */
  function stateOf(item) {
    var p = progress[item.id];
    if (isPlaying(item)) return "playing";
    if (p.pos) return "resume";
    if (p.completed) return "replay";
    return "play";
  }
  function activeTrack(item) {
    if (player.id !== item.id || player.finished) return -1;
    var pos = progress[item.id].pos;
    return pos ? pos.track : -1;
  }

  function clock(sec) {
    var s = Math.round(sec);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  function lengthLabel(sec) {
    if (sec % 60 === 0) return sec / 60 + " min";
    if (sec < 600) return clock(sec) + " min";
    return Math.round(sec / 60) + " min";
  }
  function leftLabel(sec) {
    return Math.max(1, Math.ceil(sec / 60)) + " min";
  }
  function speedLabel() {
    return "x" + prefs.speed;
  }

  /* ------------------------------------------------------------ Playback */
  var tickId = 0;
  var lastTick = 0;
  var lastSave = 0;

  function startClock() {
    if (tickId) return;
    lastTick = performance.now();
    tickId = window.setInterval(tick, TICK_MS);
  }
  function stopClock() {
    window.clearInterval(tickId);
    tickId = 0;
  }

  function tick() {
    var now = performance.now();
    var dt = (now - lastTick) / 1000;
    lastTick = now;
    if (!player.playing || !player.id) return;
    var item = byId[player.id];
    var p = progress[item.id];
    p.pos.t += dt * prefs.speed;
    while (p.pos && p.pos.t >= item.tracks[p.pos.track].dur) {
      var over = p.pos.t - item.tracks[p.pos.track].dur;
      p.played[p.pos.track] = true;
      if (p.pos.track < item.tracks.length - 1) {
        p.pos = { track: p.pos.track + 1, t: over };
      } else {
        finishLesson(item);
      }
    }
    if (now - lastSave > SAVE_MS) {
      lastSave = now;
      save();
    }
    render();
  }

  function finishLesson(item) {
    var p = progress[item.id];
    p.completed = true;
    p.pos = null;
    player.playing = false;
    player.finished = true;
    stopClock();
    save();
  }

  function play(id, trackIndex) {
    var item = byId[id];
    var p = progress[id];
    if (typeof trackIndex === "number") p.pos = { track: trackIndex, t: 0 };
    else if (!p.pos) p.pos = { track: 0, t: 0 };
    player.id = id;
    player.playing = true;
    player.finished = false;
    if (item) startClock();
    save();
    render();
  }

  function pause() {
    player.playing = false;
    stopClock();
    save();
    render();
  }

  function togglePlayer() {
    if (!player.id) return;
    if (player.playing) pause();
    else play(player.id);
  }

  /* Lesson capsule and the main button share this: pause what is playing,
     otherwise play, resume, or replay that lesson. */
  function primary(id) {
    if (player.id === id && player.playing) pause();
    else play(id);
  }

  function trackPressed(id, index) {
    var item = byId[id];
    if (activeTrack(item) === index) primary(id);
    else play(id, index);
  }

  function stepTrack(delta) {
    if (!player.id) return;
    var item = byId[player.id];
    var p = progress[item.id];
    var last = item.tracks.length - 1;
    if (player.finished) {
      if (delta > 0) return;
      p.pos = { track: last, t: 0 };
      player.finished = false;
    } else if (delta < 0) {
      if (p.pos.t > RESTART_AFTER || p.pos.track === 0) p.pos = { track: p.pos.track, t: 0 };
      else p.pos = { track: p.pos.track - 1, t: 0 };
    } else {
      if (p.pos.track >= last) return;
      p.pos = { track: p.pos.track + 1, t: 0 };
    }
    lastTick = performance.now();
    save();
    render();
  }

  /* Step back across tracks. From the end of a finished lesson, start at the last second. */
  function seekBy(seconds) {
    if (!player.id || seconds >= 0) return;
    var item = byId[player.id];
    var p = progress[item.id];
    var i;
    var t;
    if (player.finished || !p.pos) {
      i = item.tracks.length - 1;
      t = item.tracks[i].dur;
      player.finished = false;
    } else {
      i = p.pos.track;
      t = p.pos.t;
    }
    var left = -seconds;
    while (left > 0) {
      if (t > left) {
        t -= left;
        left = 0;
      } else if (i === 0) {
        t = 0;
        left = 0;
      } else {
        left -= t;
        i -= 1;
        t = item.tracks[i].dur;
      }
    }
    p.pos = { track: i, t: t };
    lastTick = performance.now();
    save();
    render();
  }

  /* ----------------------------------------------------------------- DOM */
  var root = document.querySelector("[data-pods]");
  if (!root) return;
  var lessonList = root.querySelector("[data-pods-lessons]");
  var trackList = root.querySelector("[data-pods-tracks]");
  var numEl = root.querySelector("[data-pods-num]");
  var titleEl = root.querySelector("[data-pods-title]");
  var metaEl = root.querySelector("[data-pods-meta]");
  var cta = root.querySelector("[data-pods-cta]");
  var ctaLabel = root.querySelector("[data-pods-cta-label]");
  var playerEl = root.querySelector("[data-pods-player]");
  var openPlayingBtns = root.querySelectorAll("[data-pods-open-playing]");
  var dismissBtn = root.querySelector("[data-pods-dismiss]");
  var bar = root.querySelector("[data-pods-bar]");
  var nowEl = root.querySelector("[data-pods-now]");
  var kindEl = root.querySelector("[data-pods-kind]");
  var levelEl = root.querySelector("[data-pods-level]");
  var speedBtn = root.querySelector("[data-pods-speed]");
  var speedText = root.querySelector("[data-pods-speed-label]");
  var volumeBtn = root.querySelector("[data-pods-volume]");
  var volumePop = root.querySelector("[data-pods-volume-pop]");
  var volumeRange = root.querySelector("[data-pods-volume-range]");
  var muteBtn = root.querySelector("[data-pods-mute]");
  var speedMenu = root.querySelector("[data-pods-speed-menu]");
  var courseBtn = root.querySelector("[data-pods-course]");
  var courseMenu = root.querySelector("[data-pods-course-menu]");
  var courseMark = root.querySelector("[data-pods-course-mark]");
  var courseName = root.querySelector("[data-pods-course-name]");
  var courseTerm = root.querySelector("[data-pods-course-term]");
  var speedItems = [];
  var courseItems = [];
  var fasterBtn = null;
  var slowerBtn = null;
  var toggleBtn = root.querySelector("[data-pods-toggle]");
  var backBtn = root.querySelector("[data-pods-back]");
  var prevBtn = root.querySelector("[data-pods-prev]");
  var nextBtn = root.querySelector("[data-pods-next]");
  var rows = {};
  var trackRows = [];
  var barFor = null;
  var lastFocus = null;

  /* White quarter outside a circle, so the selected band rounds into the field. */
  function joinCorner(which) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    node.setAttribute("class", "pods-lesson__join pods-lesson__join--" + which);
    node.setAttribute("viewBox", "0 0 20 20");
    node.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "#fff");
    path.setAttribute("d", which === "top"
      ? "M20 0V20H0A20 20 0 0 0 20 0Z"
      : "M0 0A20 20 0 0 1 20 20H20V0Z");
    node.append(path);
    return node;
  }

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }
  function icon(file, width, height, className) {
    return el("img", className || "", { src: "assets/icons/class-pods/" + file, alt: "", width: width, height: height });
  }
  /* Now-playing mark: three bars drawn in CSS so they can move. */
  function wave(className) {
    var node = el("span", "pods-wave " + className, { "aria-hidden": "true" });
    node.append(el("i"), el("i"), el("i"));
    return node;
  }

  function buildLessons(course) {
    lessonList.replaceChildren();
    rows = {};
    course.lessons.forEach(function (item) {
      var li = el("li", "pods-lesson");
      var joinTop = joinCorner("top");
      var joinBot = joinCorner("bot");
      var show = el("button", "pods-lesson__show", { type: "button" });
      var text = el("span", "pods-lesson__text");
      var name = el("span", "pods-lesson__name");
      var label = el("span", "pods-lesson__label");
      label.textContent = "Lesson " + item.number;
      var badge = el("span", "pods-lesson__new");
      badge.textContent = "New";
      var check = icon("check-15.svg", 15, 15, "pods-lesson__check");
      name.append(label, badge, check);
      text.append(name);
      show.append(text);

      var actions = el("div", "pods-lesson__actions");
      var cap = el("button", "pods-cap", { type: "button" });
      var time = el("span", "pods-cap__time");
      var track = el("span", "pods-cap__track", { "aria-hidden": "true" });
      track.append(el("span", "pods-cap__fill"));
      cap.append(
        time,
        track,
        icon("play-cta.svg", 11.1456, 12.2936, "pods-cap__play"),
        icon("replay.svg", 20, 20, "pods-cap__replay"),
        wave("pods-cap__wave")
      );
      actions.append(cap);
      li.append(joinTop, joinBot, show, actions);
      lessonList.append(li);

      show.addEventListener("click", function () { select(item.id); });
      cap.addEventListener("click", function () {
        select(item.id);
        primary(item.id);
      });
      rows[item.id] = { li: li, show: show, name: name, badge: badge, check: check, cap: cap, time: time, track: track };
    });
  }

  function buildTracks(item) {
    trackList.replaceChildren();
    trackRows = item.tracks.map(function (track, index) {
      var li = el("li", "pods-track");
      var num = el("span", "pods-track__num");
      num.textContent = index + 1 + ".";
      var title = el("span", "pods-track__title", { dir: "auto" });
      title.textContent = track.title;
      var check = el("span", "pods-track__check");
      check.append(icon("check-16.svg", 16, 16));
      var time = el("span", "pods-track__time");
      time.textContent = clock(track.dur);
      var btn = el("button", "pods-track__btn", { type: "button" });
      btn.append(icon("play-track.svg", 14, 14, "pods-track__play"), icon("replay.svg", 18, 18, "pods-track__replay"), wave("pods-track__wave"));
      btn.addEventListener("click", function () { trackPressed(item.id, index); });
      check.setAttribute("aria-label", "Completed");
      li.append(num, check, title, time, btn);
      trackList.append(li);
      return { li: li, btn: btn, check: check };
    });
    ui.trackListFor = item.id;
  }

  function buildBar(item) {
    bar.replaceChildren();
    item.tracks.forEach(function (track) {
      var seg = el("span", "pods-player__seg");
      seg.style.setProperty("--w", String(track.dur));
      bar.append(seg);
    });
    barFor = item.id;
  }

  /* Native-style menus: speed and level are radio menus, Faster/Slower step through the speeds. */
  function menuItem(label, attrs, trailing) {
    var item = el("button", "pods-menu__item", Object.assign({ type: "button" }, attrs));
    var check = icon("check-16.svg", 16, 16, "pods-menu__check");
    var text = el("span", "pods-menu__label");
    if (typeof label === "string") text.textContent = label;
    else text.append.apply(text, label);
    item.append(check, text);
    if (trailing) item.append(trailing);
    return item;
  }

  function buildSpeedMenu() {
    SPEEDS.slice().reverse().forEach(function (speed) {
      var item = menuItem(speed + "×", { role: "menuitemradio", "aria-checked": "false", "data-speed": String(speed) });
      item.addEventListener("click", function () { setSpeed(speed); });
      speedItems.push(item);
      speedMenu.append(item);
    });
    speedMenu.append(el("div", "pods-menu__gap", { role: "separator" }));
    fasterBtn = menuItem("Faster", { role: "menuitem" }, icon("hare.svg", 22, 16, "pods-menu__icon"));
    slowerBtn = menuItem("Slower", { role: "menuitem" }, icon("tortoise.svg", 22, 16, "pods-menu__icon"));
    fasterBtn.addEventListener("click", function () { setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(prefs.speed) + 1)]); });
    slowerBtn.addEventListener("click", function () { setSpeed(SPEEDS[Math.max(0, SPEEDS.indexOf(prefs.speed) - 1)]); });
    speedMenu.append(fasterBtn, slowerBtn);
  }

  function buildCourseMenu() {
    COURSES.forEach(function (course) {
      var name = el("span", "pods-menu__name");
      name.textContent = course.name;
      var term = el("span", "pods-menu__term");
      term.textContent = courseLabel(course);
      var mark = el("span", "pods-menu__mark", { "aria-hidden": "true" });
      paintMark(mark, course);
      var item = menuItem([name, term], { role: "menuitemradio", "aria-checked": "false", "data-course": course.id }, mark);
      item.addEventListener("click", function () { setCourse(course.id); });
      courseItems.push(item);
      courseMenu.append(item);
    });
  }

  var pop = null;
  var popDismissed = false;

  function placeAbovePlayer(panel, trigger) {
    var dock = playerEl.getBoundingClientRect();
    var spot = trigger.getBoundingClientRect();
    var left = Math.min(spot.left - 6, window.innerWidth - panel.offsetWidth - 8);
    panel.style.left = Math.max(8, left) + "px";
    panel.style.bottom = window.innerHeight - dock.top + 8 + "px";
  }

  function openPop(panel, trigger) {
    closePop(false);
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    pop = { panel: panel, trigger: trigger };
    if (panel !== courseMenu) placeAbovePlayer(panel, trigger);
    var target = panel.querySelector("[aria-checked='true']") || panel.querySelector("input, button:not(:disabled)");
    if (target) target.focus();
  }

  function closePop(restoreFocus) {
    if (!pop) return;
    pop.panel.hidden = true;
    pop.trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) pop.trigger.focus();
    pop = null;
  }

  function togglePop(panel, trigger) {
    if (pop && pop.panel === panel) closePop(true);
    else openPop(panel, trigger);
  }

  function setSpeed(speed) {
    prefs.speed = speed;
    save();
    closePop(true);
    render();
  }

  function setCourse(id) {
    closePop(true);
    if (ui.courseId === id) return;
    ui.courseId = id;
    var playingHere = player.id && byId[player.id].course.id === id;
    ui.selectedId = playingHere ? player.id : courseById[id].defaultId;
    lessonList.scrollTop = 0;
    trackList.scrollTop = 0;
    render();
  }

  function select(id) {
    if (ui.selectedId === id) return;
    ui.selectedId = id;
    trackList.scrollTop = 0;
    render();
  }

  /* --------------------------------------------------------------- Paint */
  function courseLabel(course) {
    return course.term + (course.current ? " · Current class" : "");
  }

  function paintMark(slot, course) {
    slot.replaceChildren(course.mark
      ? el("img", "pods-course__png", { src: course.mark, alt: "", width: 36, height: 36 })
      : icon("level-cloud.svg", 22, 12.0488));
    slot.style.background = course.color;
  }

  function paintCourse() {
    var course = courseById[ui.courseId];
    if (ui.listFor !== course.id) {
      buildLessons(course);
      ui.listFor = course.id;
    }
    root.style.setProperty("--pods-level", course.color);
    paintMark(courseMark, course);
    courseName.textContent = course.name;
    courseTerm.textContent = courseLabel(course);
    courseBtn.setAttribute("aria-label", "Choose level or course, current: " + course.name + ", " + course.term);
    courseItems.forEach(function (item) {
      item.setAttribute("aria-checked", item.dataset.course === course.id ? "true" : "false");
    });
  }

  function paintLessons() {
    courseById[ui.courseId].lessons.forEach(function (item) {
      var row = rows[item.id];
      var p = progress[item.id];
      var state = stateOf(item);
      var fresh = item.isNew && untouched(item);
      var selected = item.id === ui.selectedId;
      row.li.classList.toggle("is-selected", selected);
      row.li.classList.toggle("is-new", fresh);
      row.li.classList.toggle("is-done", p.completed);
      row.badge.hidden = !fresh;
      row.check.hidden = !p.completed;
      if (selected) row.show.setAttribute("aria-current", "true");
      else row.show.removeAttribute("aria-current");
      row.show.setAttribute("aria-label", "Show Lesson " + item.number + (p.completed ? ", completed" : "") + (fresh ? ", new" : ""));
      row.cap.dataset.state = state;
      row.time.textContent = state === "resume" ? leftLabel(left(item)) : lengthLabel(total(item));
      row.track.style.setProperty("--done", (elapsed(item) / total(item)).toFixed(3));
      var capLabel = {
        play: "Play Lesson " + item.number + ", " + lengthLabel(total(item)),
        resume: "Resume Lesson " + item.number + ", " + leftLabel(left(item)) + " left",
        replay: "Replay Lesson " + item.number + ", " + lengthLabel(total(item)),
        playing: "Pause Lesson " + item.number
      }[state];
      row.cap.setAttribute("aria-label", capLabel);
    });
  }

  function paintDetail() {
    var item = byId[ui.selectedId];
    if (ui.trackListFor !== item.id) buildTracks(item);
    var p = progress[item.id];
    var state = stateOf(item);
    var count = item.tracks.length;
    numEl.textContent = String(item.number);
    titleEl.textContent = "Lesson " + item.number;
    metaEl.textContent = lengthLabel(total(item)) + " · " + count + (count === 1 ? " track" : " tracks") + (p.pos ? " · " + leftLabel(left(item)) + " left" : "");
    var ctaState = { play: "play", resume: "resume", replay: "replay", playing: "pause" }[state];
    var ctaText = { play: "Play", resume: "Resume", replay: "Replay", pause: "Pause" }[ctaState];
    cta.dataset.state = ctaState;
    ctaLabel.textContent = ctaText;
    cta.setAttribute("aria-label", ctaText + " Lesson " + item.number + (state === "resume" ? ", " + leftLabel(left(item)) + " left" : ""));

    var active = activeTrack(item);
    var playing = isPlaying(item);
    trackRows.forEach(function (row, index) {
      var on = index === active;
      row.li.classList.toggle("is-done", p.played[index]);
      row.li.classList.toggle("is-active", on);
      row.li.classList.toggle("is-playing", on && playing);
      var verb = on && playing ? "Pause track " : p.played[index] && !(on && playing) ? "Replay track " : on ? "Resume track " : "Play track ";
      row.btn.setAttribute("aria-label", verb + (index + 1) + ": " + item.tracks[index].title);
      if (on) row.li.setAttribute("aria-current", "true");
      else row.li.removeAttribute("aria-current");
    });
  }

  function paintPlayer() {
    var shown = !!player.id;
    playerEl.hidden = !shown;
    root.classList.toggle("has-player", shown);
    document.documentElement.classList.toggle("pods-docked", shown && !ui.open);
    speedText.textContent = speedLabel();
    speedBtn.setAttribute("aria-label", "Playback speed " + prefs.speed + "x");
    speedItems.forEach(function (item) {
      if (item.dataset.speed) item.setAttribute("aria-checked", +item.dataset.speed === prefs.speed ? "true" : "false");
    });
    var at = SPEEDS.indexOf(prefs.speed);
    fasterBtn.disabled = at >= SPEEDS.length - 1;
    slowerBtn.disabled = at <= 0;
    var silent = prefs.muted || prefs.volume === 0;
    volumeBtn.classList.toggle("is-muted", silent);
    volumeBtn.setAttribute("aria-label", "Volume, " + (silent ? "muted" : Math.round(prefs.volume * 100) + "%"));
    muteBtn.classList.toggle("is-muted", silent);
    muteBtn.setAttribute("aria-pressed", prefs.muted ? "true" : "false");
    muteBtn.setAttribute("aria-label", prefs.muted ? "Unmute" : "Mute");
    volumeRange.value = String(Math.round((prefs.muted ? 0 : prefs.volume) * 100));
    volumeRange.style.setProperty("--v", prefs.muted ? "0" : String(prefs.volume));
    if (!shown) return;
    var item = byId[player.id];
    playerEl.style.setProperty("--pods-level", item.course.color);
    var p = progress[item.id];
    if (barFor !== item.id) buildBar(item);
    var current = player.finished ? item.tracks.length - 1 : p.pos.track;
    var segs = bar.children;
    for (var i = 0; i < segs.length; i += 1) {
      var done = player.finished || i < current ? 1 : i > current ? 0 : p.pos.t / item.tracks[i].dur;
      segs[i].style.setProperty("--done", done.toFixed(3));
    }
    var ratio = player.finished ? 1 : elapsed(item) / total(item);
    bar.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    bar.setAttribute("aria-valuetext", player.finished ? "Lesson finished" : leftLabel(left(item)) + " left");
    var track = item.tracks[current];
    var heb = document.createElement("bdi");
    heb.textContent = track.title;
    nowEl.replaceChildren(document.createTextNode("Lesson " + item.number + ": "), heb);
    kindEl.textContent = track.kind;
    paintMark(levelEl, item.course);
    var docked = !ui.open;
    var openLabel = "Open Lesson " + item.number + ": " + track.title;
    openPlayingBtns.forEach(function (button) {
      if (docked) {
        button.removeAttribute("tabindex");
        button.setAttribute("aria-label", button === levelEl ? "Open Lesson " + item.number : openLabel);
      } else {
        button.setAttribute("tabindex", "-1");
        button.removeAttribute("aria-label");
      }
    });
    levelEl.setAttribute("aria-hidden", docked ? "false" : "true");
    playerEl.classList.toggle("is-paused", !player.playing);
    toggleBtn.setAttribute("aria-label", player.playing ? "Pause" : "Play");
    nextBtn.disabled = player.finished || current >= item.tracks.length - 1;
    backBtn.disabled = !player.finished && !!p.pos && p.pos.track === 0 && p.pos.t < 0.4;
  }

  function render() {
    paintCourse();
    paintLessons();
    paintDetail();
    paintPlayer();
  }

  /* -------------------------------------------------------------- Modal */
  function focusables() {
    return Array.prototype.filter.call(
      root.querySelectorAll("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"),
      function (node) { return node.offsetParent !== null && node.tabIndex !== -1; }
    );
  }

  function openModal(trigger) {
    lastFocus = trigger || document.activeElement;
    ui.open = true;
    root.hidden = false;
    root.classList.remove("is-docked");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "pods-title");
    document.documentElement.classList.add("pods-open");
    document.documentElement.classList.remove("pods-docked");
    render();
    root.querySelector("[data-pods-close]").focus();
  }

  /* Closing the dialog only hides it. The same player keeps its place, paused or playing. */
  function closeModal() {
    closePop(false);
    ui.open = false;
    root.removeAttribute("role");
    root.removeAttribute("aria-modal");
    root.removeAttribute("aria-labelledby");
    document.documentElement.classList.remove("pods-open");
    if (player.id) {
      root.hidden = false;
      root.classList.add("is-docked");
      document.documentElement.classList.add("pods-docked");
    } else {
      root.classList.remove("is-docked");
      document.documentElement.classList.remove("pods-docked");
      root.hidden = true;
    }
    render();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function reveal(container, node) {
    if (!node) return;
    var box = container.getBoundingClientRect();
    var row = node.getBoundingClientRect();
    container.scrollTop += row.top - box.top - (box.height - row.height) / 2;
  }

  /* Title or lesson tile: return to the lesson and track already in the player. */
  function openPlaying(trigger) {
    if (!player.id || ui.open) return;
    var item = byId[player.id];
    if (ui.courseId !== item.course.id) {
      ui.courseId = item.course.id;
      lessonList.scrollTop = 0;
    }
    ui.selectedId = item.id;
    openModal(trigger);
    reveal(lessonList, rows[item.id] && rows[item.id].li);
    var index = activeTrack(item);
    if (index < 0) {
      var pos = progress[item.id].pos;
      index = pos ? pos.track : item.tracks.length - 1;
    }
    reveal(trackList, trackRows[index] && trackRows[index].li);
  }

  /* Hide the floating player and stop the clock. Saved progress stays put. */
  function stopAndClose() {
    closePop(false);
    player.playing = false;
    player.finished = false;
    stopClock();
    player.id = null;
    save();
    if (ui.open) render();
    else closeModal();
  }

  document.querySelectorAll("[data-pods-open]").forEach(function (trigger) {
    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      openModal(trigger);
    });
  });
  root.querySelector("[data-pods-close]").addEventListener("click", closeModal);
  root.addEventListener("click", function (event) {
    if (popDismissed) {
      popDismissed = false;
      return;
    }
    if (ui.open && event.target === root) closeModal();
  });

  /* Popovers close on an outside press, Escape, or Tab; arrows move through menu items. */
  document.addEventListener("pointerdown", function (event) {
    popDismissed = false;
    if (!pop || pop.panel.contains(event.target) || pop.trigger.contains(event.target)) return;
    closePop(false);
    popDismissed = true;
  }, true);
  document.addEventListener("keydown", function (event) {
    if (!pop) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closePop(true);
      return;
    }
    if (event.key === "Tab") {
      closePop(true);
      return;
    }
    if (pop.panel.getAttribute("role") !== "menu") return;
    var items = Array.prototype.filter.call(pop.panel.querySelectorAll(".pods-menu__item"), function (item) { return !item.disabled; });
    var at = items.indexOf(document.activeElement);
    var next = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    items[(next + items.length) % items.length].focus();
  }, true);
  window.addEventListener("resize", function () { closePop(false); });

  document.addEventListener("keydown", function (event) {
    if (!ui.open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
      return;
    }
    if (event.key !== "Tab") return;
    var list = focusables();
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (!root.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, true);

  cta.addEventListener("click", function () { primary(ui.selectedId); });
  toggleBtn.addEventListener("click", togglePlayer);
  dismissBtn.addEventListener("click", stopAndClose);
  openPlayingBtns.forEach(function (button) {
    button.addEventListener("click", function () { openPlaying(button); });
  });
  backBtn.addEventListener("click", function () { seekBy(-10); });
  prevBtn.addEventListener("click", function () { stepTrack(-1); });
  nextBtn.addEventListener("click", function () { stepTrack(1); });
  speedBtn.addEventListener("click", function () { togglePop(speedMenu, speedBtn); });
  volumeBtn.addEventListener("click", function () { togglePop(volumePop, volumeBtn); });
  courseBtn.addEventListener("click", function () { togglePop(courseMenu, courseBtn); });
  muteBtn.addEventListener("click", function () {
    prefs.muted = !prefs.muted;
    if (!prefs.muted && prefs.volume === 0) prefs.volume = 0.5;
    save();
    render();
  });
  volumeRange.addEventListener("input", function () {
    prefs.volume = +volumeRange.value / 100;
    prefs.muted = false;
    render();
  });
  volumeRange.addEventListener("change", save);
  window.addEventListener("pagehide", save);

  load();
  buildSpeedMenu();
  buildCourseMenu();
  render();
  if (params.get("pods") === "open") openModal(document.querySelector("[data-pods-open]"));
})();
