(function () {
  "use strict";

  /* One demo origin. Review switches change the class moment, not this clock,
     so a mode change does not restart the countdown. */
  var DEMO_NOW = "2026-10-14T18:11:45+03:00";
  var ZONE = "Asia/Jerusalem";
  var OFFSET = {
    long: (2 * 86400 + 18 * 3600 + 15 * 60 + 50) * 1000,
    short: (2 * 3600 + 18 * 60 + 15) * 1000
  };
  var NEXT_LEVEL = { name: "Blue Level", color: "#449CFC" };
  var LEVEL_MARKS = {
    Yellow: "assets/icons/hub/level-yellow.png?v=20261115p",
    Pink: "assets/icons/hub/level-pink.png?v=20261115p",
    Orange: "assets/icons/hub/level-orange.png?v=20261115p"
  };
  var LIGHT_BLUE_MARK = "assets/icons/hub/level.svg";

  var COURSES = [
    { id: "lb-nov-2026", current: true, name: "Light Blue", color: "#90C7FC", term: "November semester 2026", schedule: "Sun & Wed 20:30 // with Noam", pod: "Light Blue Level", issued: "28 Feb 2027", certNo: "CC-LB-2611-0104" },
    { id: "lb-may-2026", name: "Light Blue", color: "#90C7FC", term: "May semester 2026", schedule: "Sun & Wed 20:30 // with Noam", pod: "Light Blue Level", issued: "30 Sep 2026", certNo: "CC-LB-2605-0184" },
    { id: "yellow-nov-2025", name: "Yellow", color: "#FFE300", term: "November semester 2025", schedule: "Mon & Thu 19:00 // with Noam", pod: "Yellow Level", issued: "28 Feb 2026", certNo: "CC-YL-2511-0271" },
    { id: "orange-may-2025", name: "Orange", color: "#F69700", term: "May semester 2025", schedule: "Tue & Thu 18:30 // with Noam", pod: "Orange Level", issued: "30 Sep 2025", certNo: "CC-OR-2505-0338" },
    { id: "pink-nov-2024", name: "Pink", color: "#F7AAF3", term: "November semester 2024", schedule: "Sun & Wed 19:00 // with Noam", pod: "Pink Level", issued: "30 Jun 2025", certNo: "CC-PK-2505-0412" }
  ];

  var SQUARE = "M29.5222 0H6.47776C2.90019 0 0 2.9002 0 6.47778V29.5222C0 33.0998 2.90019 36 6.47776 36H29.5222C33.0998 36 36 33.0998 36 29.5222V6.47778C36 2.9002 33.0998 0 29.5222 0Z";
  var CLOUD = [
    "M5.60221 18.1977C5.60221 15.7959 7.55165 13.8531 9.94683 13.8531C10.2779 13.8531 10.5966 13.8903 10.9039 13.9605C11.9976 11.6766 14.3298 10.0977 17.0302 10.0977C20.5563 10.0977 23.4512 12.781 23.7874 16.2191C25.9708 16.4352 27.6801 18.2802 27.6801 20.5197C27.6801 22.9043 25.7424 24.8421 23.3577 24.8421H7.32476C5.6355 24.8421 4.25796 23.4721 4.25781 21.7757C4.25781 20.6668 4.84153 19.705 5.71452 19.1645C5.6422 18.8544 5.60222 18.532 5.60221 18.1977ZM6.71333 18.1977C6.71333 18.5696 6.7789 18.9241 6.89833 19.2632L7.07357 19.7602L6.58637 19.9615C5.86924 20.257 5.36892 20.9543 5.36892 21.7757C5.36907 22.8569 6.24754 23.731 7.32476 23.731H23.3577C25.1287 23.731 26.569 22.2907 26.569 20.5197C26.5689 18.8041 25.2172 17.3989 23.5227 17.3128L23.3577 17.309H22.7197L22.7078 16.7649C22.6419 13.6831 20.1271 11.2088 17.0302 11.2088C14.6228 11.2088 12.5621 12.7106 11.7367 14.8324L11.5403 15.3375L11.0303 15.1535C10.6894 15.0305 10.331 14.9642 9.94683 14.9642C8.16424 14.9642 6.71333 16.4106 6.71333 18.1977Z",
    "M30.6382 18.6686C30.6382 16.1664 28.6362 14.1339 26.1482 14.0793L25.6046 14.0674V13.4462C25.6046 12.0364 24.4645 10.8963 23.0547 10.8963V9.78516C24.9284 9.78516 26.4699 11.1895 26.688 13.004C29.5342 13.3232 31.7494 15.7348 31.7494 18.6686C31.7493 19.7074 31.472 20.6811 30.9849 21.5196L30.0241 20.9619C30.4147 20.2894 30.6382 19.5075 30.6382 18.6686Z",
    "M25.5881 20.5195C25.5881 21.7502 24.5879 22.7499 23.3572 22.7499H10.3906V22.0554H23.3572C24.2043 22.0554 24.8937 21.3667 24.8937 20.5195H25.5881Z",
    "M17.0293 12.8819C15.3612 12.882 13.8959 13.8834 13.2923 15.4384L12.6445 15.1866C13.3521 13.364 15.0754 12.1876 17.0293 12.1875V12.8819Z"
  ];

  /* Product state, the selected course, and the countdown demo are independent. */
  var state = {
    courseId: "lb-nov-2026",
    reenrollment: "closed",
    reenrollStage: "open",
    countdown: "long",
    paused: false,
    labels: false,
    joinWindow: "waiting"
  };

  var params = new URLSearchParams(location.search);
  var nowParam = params.get("now");
  var demoNow = new Date(nowParam && !isNaN(Date.parse(nowParam)) ? nowParam : DEMO_NOW).getTime();
  var clock = { origin: Date.now(), held: 0 };
  var timerId = 0;

  function levelIcon(color) {
    var clouds = CLOUD.map(function (d) {
      return '<path fill="#373230" d="' + d + '"/>';
    }).join("");
    return '<svg viewBox="0 0 36 36" aria-hidden="true"><path fill="' + color + '" d="' + SQUARE + '"/>' + clouds + "</svg>";
  }

  function courseById(id) {
    return COURSES.filter(function (course) { return course.id === id; })[0] || COURSES[0];
  }

  function elapsed() {
    return state.paused ? clock.held : (Date.now() - clock.origin);
  }

  function target() {
    return demoNow + OFFSET[state.countdown];
  }

  function remaining() {
    if (state.joinWindow === "open") {
      var cycle = 15 * 60 * 1000;
      return cycle - (elapsed() % cycle);
    }
    return Math.max(0, OFFSET[state.countdown] - elapsed());
  }

  function split(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return { d: d, h: h, m: m, s: s };
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  /* A day or more shows four units, matching the class card.
     Under 24 hours the days field drops off. */
  function fieldsFor(ms) {
    var t = split(ms);
    if (state.joinWindow === "open") {
      return [
        { key: "m", text: pad(t.h * 60 + t.m), label: "Min" },
        { key: "s", text: pad(t.s), label: "Sec" }
      ];
    }
    if (ms >= 86400000) {
      return [
        { key: "d", text: pad(t.d), label: "Days" },
        { key: "h", text: pad(t.h), label: "Hrs" },
        { key: "m", text: pad(t.m), label: "Min" },
        { key: "s", text: pad(t.s), label: "Sec" }
      ];
    }
    return [
      { key: "h", text: pad(t.h), label: "Hrs" },
      { key: "m", text: pad(t.m), label: "Min" },
      { key: "s", text: pad(t.s), label: "Sec" }
    ];
  }

  function spoken(ms) {
    var t = split(ms);
    if (state.joinWindow === "open") {
      var mins = t.h * 60 + t.m;
      return mins + (mins === 1 ? " minute" : " minutes") + ", " + t.s + (t.s === 1 ? " second" : " seconds") + " until class";
    }
    var parts = [];
    if (ms >= 86400000) parts.push(t.d + (t.d === 1 ? " day" : " days"));
    parts.push(t.h + (t.h === 1 ? " hour" : " hours"));
    parts.push(t.m + (t.m === 1 ? " minute" : " minutes"));
    if (ms < 86400000) parts.push(t.s + (t.s === 1 ? " second" : " seconds"));
    return parts.join(", ") + " until class" + (state.paused ? ", paused" : "");
  }

  function formatWhen(ms) {
    var date = new Date(ms);
    var opts = { timeZone: ZONE };
    var wd = date.toLocaleDateString("en-US", Object.assign({ weekday: "short" }, opts));
    var md = date.toLocaleDateString("en-US", Object.assign({ month: "short", day: "numeric" }, opts));
    var hm = date.toLocaleTimeString("en-GB", Object.assign({ hour: "2-digit", minute: "2-digit" }, opts));
    return wd + ", " + md + " · " + hm;
  }

  function makeCell() {
    var value = document.createElement("span");
    value.className = "time__value";
    value.setAttribute("aria-hidden", "true");
    return value;
  }

  /* One vertical strip per unit. Top is the number just passed, the middle
     is now, and the bottom is the number about to arrive. A change slides
     the strip up by one row, then the texts snap back with no visual jump. */
  function appendFace(parent, parts) {
    var face = document.createElement("span");
    face.className = "time__face";
    parts.forEach(function (part, index) {
      if (index > 0) {
        var sep = document.createElement("span");
        sep.className = "time__sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = ":";
        face.appendChild(sep);
      }
      var group = document.createElement("span");
      group.className = "time__group";
      var frame = document.createElement("span");
      frame.className = "time__frame";
      var sizer = document.createElement("span");
      sizer.className = "time__sizer";
      sizer.setAttribute("aria-hidden", "true");
      sizer.textContent = part.text;
      var mask = document.createElement("span");
      mask.className = "time__mask";
      var reel = document.createElement("span");
      reel.className = "time__reel";
      reel.appendChild(makeCell());
      reel.appendChild(makeCell());
      reel.appendChild(makeCell());
      mask.appendChild(reel);
      frame.appendChild(sizer);
      frame.appendChild(mask);
      group.appendChild(frame);
      var label = document.createElement("span");
      label.className = "time__label";
      label.setAttribute("aria-hidden", "true");
      label.textContent = part.label;
      group.appendChild(label);
      face.appendChild(group);
    });
    parent.appendChild(face);
  }

  /* The row above is the value about to arrive. The middle row is now.
     Counting down, that means one minute (or one second) less above,
     and one more on the faint row below. */
  function neighbor(parts, dir) {
    var values = parts.map(function (part) { return parseInt(part.text, 10); });
    var caps = parts.map(function (part) {
      return part.key === "d" ? 100 : 60;
    });
    if (parts[0] && parts[0].key === "d") caps[1] = 24;
    var i = values.length - 1;
    values[i] += dir;
    while (i > 0 && (values[i] < 0 || values[i] >= caps[i])) {
      if (values[i] < 0) {
        values[i] += caps[i];
        values[i - 1] -= 1;
      } else {
        values[i] -= caps[i];
        values[i - 1] += 1;
      }
      i -= 1;
    }
    if (values[0] < 0) values[0] = 0;
    return parts.map(function (part, index) {
      return { key: part.key, text: pad(values[index]), label: part.label };
    });
  }

  function paintReel(reel, prev, now, next) {
    var cells = reel.querySelectorAll(".time__value");
    var sizer = reel.parentNode.parentNode.querySelector(".time__sizer");
    function snap() {
      cells[0].textContent = prev;
      cells[1].textContent = now;
      cells[2].textContent = next;
      if (sizer) sizer.textContent = now;
      reel.dataset.now = now;
      reel.dataset.busy = "";
    }
    if (!reel.dataset.now) {
      snap();
      return;
    }
    if (reel.dataset.busy === "1") {
      reel.dataset.pending = prev + "\n" + now + "\n" + next;
      return;
    }
    if (reel.dataset.now === now) {
      if (cells[0].textContent !== prev) cells[0].textContent = prev;
      if (cells[2].textContent !== next) cells[2].textContent = next;
      return;
    }
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var shift = cells[1].offsetHeight;
    if (reduce || shift < 1 || cells[2].textContent !== now || typeof reel.animate !== "function") {
      snap();
      return;
    }
    var computed = getComputedStyle(reel).transform;
    var startY = computed && computed !== "none" ? new DOMMatrix(computed).m42 : 0;
    reel.dataset.busy = "1";
    var anim = reel.animate(
      [
        { transform: "translateY(" + startY + "px)" },
        { transform: "translateY(" + (startY - shift) + "px)" }
      ],
      { duration: 620, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" }
    );
    var settled = false;
    function settle() {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallback);
      var pending = reel.dataset.pending;
      delete reel.dataset.pending;
      if (pending) {
        var queued = pending.split("\n");
        prev = queued[0];
        now = queued[1];
        next = queued[2];
      }
      cells[0].textContent = prev;
      cells[1].textContent = now;
      if (sizer) sizer.textContent = now;
      anim.cancel();
      cells[2].textContent = next;
      reel.dataset.now = now;
      reel.dataset.busy = "";
    }
    var fallback = window.setTimeout(settle, 780);
    anim.onfinish = settle;
  }

  function paintClock(el, parts) {
    var compact = el.classList.contains("time--compact");
    var shape = (compact ? "c" : "f") + parts.map(function (part) { return part.key + part.label; }).join("|");
    if (el.dataset.shape !== shape) {
      el.dataset.shape = shape;
      el.replaceChildren();
      appendFace(el, parts);
    }
    var upcoming = neighbor(parts, -1);
    var passed = neighbor(parts, 1);
    var reels = el.querySelectorAll(".time__reel");
    parts.forEach(function (part, index) {
      paintReel(reels[index], passed[index].text, part.text, upcoming[index].text);
    });
  }

  function paintTime() {
    var left = remaining();
    var parts = fieldsFor(left);
    var when = formatWhen(target());
    var description = spoken(left);
    document.querySelectorAll("[data-next-class], [data-next-inline]").forEach(function (node) {
      node.textContent = when;
    });
    document.querySelectorAll("[data-timer]").forEach(function (el) {
      paintClock(el, parts);
      el.setAttribute("aria-label", description);
    });
    paintBar(left, parts, description);
  }

  function paintBar(left, parts, description) {
    var bar = document.querySelector("[data-time-bar]");
    if (!bar) return;
    var clock = bar.querySelector("[data-time-bar-clock]");
    if (clock) clock.textContent = parts.map(function (part) { return part.text; }).join(":");
    var span = state.joinWindow === "open" ? 15 * 60 * 1000 : OFFSET[state.countdown] / 0.805;
    var ratio = span > 0 ? Math.max(0, Math.min(1, left / span)) : 0;
    bar.style.setProperty("--remain", ratio.toFixed(4));
    bar.setAttribute("aria-label", description);
  }

  function arm() {
    window.clearTimeout(timerId);
    if (state.paused) return;
    var left = remaining();
    if (left <= 0) return;
    var wait = 1000 - (Date.now() % 1000);
    if (wait < 40) wait += 1000;
    timerId = window.setTimeout(function () {
      paintTime();
      arm();
    }, wait);
  }

  function setPaused(on) {
    if (on === state.paused) return;
    if (on) clock.held = Date.now() - clock.origin;
    else clock.origin = Date.now() - clock.held;
    state.paused = on;
    paintTime();
    arm();
  }

  var card = document.querySelector("[data-class-card]");
  var menu = document.getElementById("past-menu");
  var pastBtn = document.querySelector(".past__btn");
  var currentStage = document.querySelector('[data-stage="current"]');
  var pastStage = document.querySelector('[data-stage="past"]');

  function renderMenu() {
    var course = courseById(state.courseId);
    menu.replaceChildren();
    COURSES.filter(function (item) { return !item.current; }).forEach(function (item) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "past__item" + (item.id === course.id ? " is-selected" : "");
      button.setAttribute("role", "menuitem");
      button.innerHTML = levelIcon(item.color) + '<span><span class="past__name"></span><span class="past__term"></span></span>';
      button.querySelector("svg").classList.add("lvl");
      button.querySelector(".past__name").textContent = item.name;
      button.querySelector(".past__term").textContent = item.term;
      button.addEventListener("click", function () {
        state.courseId = item.id;
        setMenu(false);
        render();
      });
      menu.appendChild(button);
    });
  }

  function render() {
    var course = courseById(state.courseId);
    var past = !course.current;
    var open = state.reenrollment === "open" && !past;
    card.style.setProperty("--level", course.color);
    card.setAttribute("aria-label", (past ? "Past course: " : "My Class: ") + course.name + ", " + course.term);
    document.querySelector("[data-course-name]").textContent = course.name;
    var levelLabel = document.querySelector("[data-level-label]");
    if (levelLabel) levelLabel.textContent = course.name.replace(/\s+/g, "-");
    var mark = document.querySelector(".class-mark");
    if (mark) {
      var markSrc = LEVEL_MARKS[course.name];
      mark.src = markSrc || LIGHT_BLUE_MARK;
      mark.classList.toggle("is-level", !!markSrc);
    }
    document.querySelector("[data-past-tag]").hidden = !past;
    document.querySelector("[data-back]").hidden = !past;
    document.querySelector("[data-course-term]").textContent = past ? course.term.replace(" semester", "") : course.term;
    var schedule = document.querySelector("[data-course-schedule]");
    var teacherName = document.querySelector("[data-teacher-name]");
    var teacher = (course.schedule.split("with ")[1] || "Noam").trim();
    if (teacherName) teacherName.textContent = "With " + teacher;
    if (past) {
      schedule.replaceChildren();
      var done = document.createElement("span");
      done.className = "class-meta__done";
      done.textContent = "Completed";
      var dot = document.createElement("span");
      dot.className = "class-meta__dot";
      dot.textContent = " · ";
      var withTeacher = document.createElement("span");
      withTeacher.className = "class-meta__with";
      withTeacher.textContent = "with " + teacher;
      schedule.append(done, dot, withTeacher);
    } else {
      schedule.textContent = course.schedule.split(" // ")[0].trim();
    }
    document.querySelector("[data-level-icon]").innerHTML = levelIcon(course.color);
    document.querySelector("[data-pod-title]").textContent = course.pod;
    currentStage.hidden = past;
    pastStage.hidden = !past;
    document.querySelector("[data-next-block]").hidden = past || (open && document.documentElement.dataset.classCard !== "figma");
    document.querySelector("[data-next-line]").hidden = !open;
    document.querySelector("[data-reenroll]").hidden = !open;
    document.querySelector("[data-cert-level]").textContent = course.name + " Level";
    document.querySelector("[data-cert-issued]").textContent = "Issued " + course.issued + "·No. " + course.certNo;
    document.querySelector("[data-cert-dialog]").textContent = "A certificate for " + course.name + ", " + course.term + " would open here. This demo does not include an official document.";
    document.documentElement.dataset.course = past ? "past" : "current";
    document.documentElement.dataset.reenrollment = state.reenrollment;
    if (state.reenrollment === "open") document.documentElement.dataset.reenrollStage = state.reenrollStage || "open";
    else delete document.documentElement.dataset.reenrollStage;
    document.documentElement.dataset.countdown = state.countdown;
    document.documentElement.dataset.labels = state.labels ? "on" : "off";
    renderMenu();
    paintTime();
  }

  function setMenu(open) {
    menu.hidden = !open;
    pastBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  pastBtn.addEventListener("click", function () {
    setMenu(menu.hidden);
  });

  document.addEventListener("pointerdown", function (event) {
    if (!menu.hidden && !event.target.closest("[data-past]")) setMenu(false);
  });

  var review = document.getElementById("review");
  var reviewCard = document.getElementById("review-card");
  var reviewTab = review.querySelector(".review__tab");
  var viewportReadout = review.querySelector("[data-viewport]");
  function paintViewport() {
    viewportReadout.textContent = "Viewport " + window.innerWidth + " × " + window.innerHeight;
  }
  paintViewport();
  window.addEventListener("resize", paintViewport);
  if (params.get("cardlab") === "1") {
    document.documentElement.dataset.cardLab = "1";
    document.documentElement.dataset.classCard = "figma";
    var figmaCard = review.querySelector('input[name="classcard"][value="figma"]');
    if (figmaCard) figmaCard.checked = true;
  }
  if (params.get("review") === "1" || params.get("cardlab") === "1") {
    review.hidden = false;
    setReviewOpen(true);
  }

  function setReviewOpen(open) {
    review.classList.remove("is-concealed");
    reviewCard.hidden = !open;
    reviewTab.setAttribute("aria-expanded", open ? "true" : "false");
  }

  reviewTab.addEventListener("click", function () {
    setReviewOpen(reviewCard.hidden || review.classList.contains("is-concealed"));
  });
  review.querySelector("[data-review-hide]").addEventListener("click", function () {
    review.classList.add("is-concealed");
    reviewCard.hidden = true;
    reviewTab.setAttribute("aria-expanded", "false");
  });

  review.querySelectorAll('input[name="gym"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      document.documentElement.dataset.gym = input.value;
    });
  });
  review.querySelectorAll('input[name="method"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      document.documentElement.dataset.method = input.value;
    });
  });
  review.querySelectorAll('input[name="cafe"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      document.documentElement.dataset.cafe = input.value;
      paintCafe();
    });
  });
  review.querySelectorAll('input[name="lesson"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      document.documentElement.dataset.lesson = input.value;
    });
  });
  review.querySelectorAll('input[name="classcard"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      document.documentElement.dataset.classCard = input.value;
      var shown = courseById(state.courseId);
      var shownPast = !shown.current;
      document.querySelector("[data-next-block]").hidden = shownPast || (state.reenrollment === "open" && !shownPast && input.value !== "figma");
    });
  });
  review.querySelectorAll('input[name="reenroll"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      state.reenrollment = input.value === "closed" ? "closed" : "open";
      state.reenrollStage = input.getAttribute("data-stage") || "open";
      render();
    });
  });
  review.querySelectorAll('input[name="countdown"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      state.countdown = input.value;
      render();
      arm();
    });
  });
  review.querySelector("[data-date]").addEventListener("change", function (event) {
    document.documentElement.dataset.date = event.target.checked ? "off" : "on";
  });
  review.querySelector("[data-date-all]").addEventListener("change", function (event) {
    document.documentElement.dataset.dateAll = event.target.checked ? "on" : "off";
  });
  review.querySelector("[data-corners]").addEventListener("change", function (event) {
    document.documentElement.dataset.corners = event.target.checked ? "even" : "swept";
  });
  review.querySelectorAll('input[name="agenda"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      document.documentElement.dataset.agenda = input.value;
    });
  });
  review.querySelectorAll('input[name="timer"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      document.documentElement.dataset.timerLook = input.value;
    });
  });
  review.querySelectorAll('input[name="join"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      document.documentElement.dataset.joinWindow = input.value;
      state.joinWindow = input.value;
      paintTime();
      arm();
    });
  });
  review.querySelectorAll('input[name="circles"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      document.documentElement.dataset.circles = input.value;
      paintCircle();
    });
  });

  document.querySelectorAll("[data-gym]").forEach(function (gym) {
    var toggle = gym.querySelector(".agenda-row__expand");
    var blocks = gym.querySelector(".gym-blocks");
    var count = gym.querySelector("[data-gym-count]");
    var addAll = gym.querySelector("[data-gym-add]");

    function paint() {
      var added = gym.querySelectorAll("[data-block].is-added").length;
      if (count) count.hidden = true;
      if (addAll) {
        addAll.hidden = false;
        setBlock(addAll, added > 0);
      }
      applyAgendaFilter();
    }

    function setBlock(button, on) {
      button.classList.toggle("is-added", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.setAttribute("aria-label", on ? "Remove from my plan" : "Add to my plan");
    }

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", open ? "false" : "true");
      blocks.hidden = open;
    });
    gym.querySelectorAll("[data-block]").forEach(function (button) {
      button.addEventListener("click", function () {
        setBlock(button, !button.classList.contains("is-added"));
        paint();
      });
    });
    if (addAll) {
      addAll.addEventListener("click", function () {
        var on = !addAll.classList.contains("is-added");
        gym.querySelectorAll("[data-block]").forEach(function (button) {
          setBlock(button, on);
        });
        paint();
      });
    }
    paint();
  });

  var agendaFilter = document.querySelector(".agenda-filter");
  var agendaFilterBtn = document.querySelector(".agenda-filter__btn");
  var agendaFilterMenu = document.getElementById("agenda-filter-menu");
  var agendaFilterLabel = document.querySelector("[data-agenda-filter-label]");
  var AGENDA_FILTERS = { all: "All", plan: "My plan", lesson: "My lessons", gym: "Gym", circle: "Circles", cafe: "Café" };

  function agendaItemInPlan(item) {
    if (item.querySelector(".plan-added:not([hidden])")) return true;
    return !!item.querySelector(".plan-btn.is-added");
  }

  function applyAgendaFilter() {
    var filter = document.documentElement.dataset.agendaFilter || "all";
    var shown = 0;
    document.querySelectorAll(".agenda-day").forEach(function (day) {
      var visible = 0;
      day.querySelectorAll("[data-kind]").forEach(function (item) {
        var keep = filter === "all" || (filter === "plan" ? agendaItemInPlan(item) : item.getAttribute("data-kind") === filter);
        item.hidden = !keep;
        if (keep) visible += 1;
      });
      day.hidden = visible === 0;
      shown += visible;
    });
    var empty = document.querySelector("[data-agenda-empty]");
    if (empty) empty.hidden = shown > 0;
  }

  function setAgendaFilter(value) {
    document.documentElement.dataset.agendaFilter = value;
    agendaFilterLabel.textContent = AGENDA_FILTERS[value] || "All";
    agendaFilterMenu.querySelectorAll("[data-agenda-filter]").forEach(function (option) {
      option.setAttribute("aria-selected", option.getAttribute("data-agenda-filter") === value ? "true" : "false");
    });
    applyAgendaFilter();
  }

  function setAgendaFilterOpen(open) {
    agendaFilterBtn.setAttribute("aria-expanded", open ? "true" : "false");
    agendaFilterMenu.hidden = !open;
  }

  agendaFilterBtn.addEventListener("click", function () {
    setAgendaFilterOpen(agendaFilterBtn.getAttribute("aria-expanded") !== "true");
  });
  agendaFilterMenu.querySelectorAll("[data-agenda-filter]").forEach(function (option) {
    option.addEventListener("click", function () {
      setAgendaFilter(option.getAttribute("data-agenda-filter"));
      setAgendaFilterOpen(false);
      agendaFilterBtn.focus();
    });
  });
  document.addEventListener("click", function (event) {
    if (!agendaFilter.contains(event.target)) setAgendaFilterOpen(false);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !agendaFilterMenu.hidden) {
      setAgendaFilterOpen(false);
      agendaFilterBtn.focus();
    }
  });
  document.querySelectorAll(".agenda-day__list > .agenda-row > .plan-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      var on = !button.classList.contains("is-added");
      button.classList.toggle("is-added", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.setAttribute("aria-label", on ? "Remove from my plan" : "Add to my plan");
      applyAgendaFilter();
    });
  });
  applyAgendaFilter();

  var lastFocus = null;
  function openModal(name, trigger) {
    lastFocus = trigger || document.activeElement;
    var modal = document.querySelector('[data-modal="' + name + '"]');
    modal.hidden = false;
    modal.querySelector("[data-modal-close]").focus();
  }
  function closeModal(modal) {
    modal.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.querySelector("[data-cafe-hours-open]").addEventListener("click", function (event) {
    openModal("cafe-hours", event.currentTarget);
  });
  document.querySelector("[data-choose]").addEventListener("click", function (event) {
    openModal("choose", event.currentTarget);
  });
  document.querySelector("[data-view-cert]").addEventListener("click", function (event) {
    openModal("cert", event.currentTarget);
  });

  var CIRCLES = [
    {
      title: "As short History of the word Yalla",
      blurb: "Place-holder text, explains about the circle, gives a little background...",
      when: "Live event · Jan 15 · 20:30 IL",
      whenLong: "Live event · January 15 · 20:30 IL",
      host: "Nitzan Wittler",
      count: "+55",
      enrolled: "57 enrolled",
      month: "JAN",
      day: "15",
      avatar: "assets/img/avatar-3.jpg",
      face: "assets/circles/host-portrait.jpg",
      photo: "assets/img/hub/circle.jpg",
      hostpic: "assets/img/hub/circle-host.png",
      detail: "A live Circle on Jan 15 at 20:30 Israel time, with Yael. 57 people are enrolled. The hour is about sounding sure in Hebrew while the words are still catching up. Nothing is booked from this demo."
    },
    {
      title: "Friday Songs from the Kitchen",
      blurb: "Place-holder text, explains about the circle, gives a little background...",
      when: "Live event · Jan 22 · 19:00 IL",
      whenLong: "Live event · January 22 · 19:00 IL",
      host: "With Noam",
      count: "+38",
      enrolled: "40 enrolled",
      month: "JAN",
      day: "22",
      avatar: "assets/img/avatar-1.jpg",
      photo: "assets/img/circles-event-clean.jpg",
      hostpic: "assets/img/hub/circle-host.png",
      detail: "A live Circle on Jan 22 at 19:00 Israel time, with Noam. 40 people are enrolled. Songs, the words around them, and the Friday kitchen. Nothing is booked from this demo."
    },
    {
      title: "A Short History of the Word Yalla",
      blurb: "Place-holder text, explains about the circle, gives a little background...",
      when: "Live event · Feb 2 · 20:30 IL",
      whenLong: "Live event · February 2 · 20:30 IL",
      host: "With Yael",
      count: "+41",
      enrolled: "43 enrolled",
      month: "FEB",
      day: "2",
      avatar: "assets/img/avatar-3.jpg",
      photo: "assets/img/hub/magazine.jpg",
      hostpic: "assets/img/hub/circle-host.png",
      detail: "A live Circle on Feb 2 at 20:30 Israel time, with Yael. 43 people are enrolled. Where yalla came from, and how it moves through a sentence. Nothing is booked from this demo."
    }
  ];
  function circleEventId(title) {
    var name = (title || "").toLowerCase();
    if (name.indexOf("yalla") !== -1) return "yalla";
    if (name.indexOf("deep") !== -1) return "deep";
    if (name.indexOf("work") !== -1) return "work";
    return "";
  }
  var circleIndex = 0;
  var circleCard = document.querySelector("[data-circle]");
  var circleDots = document.querySelectorAll(".dots__dot");

  function paintCircle() {
    var item = CIRCLES[circleIndex];
    var date = circleCard.querySelector("[data-circle-date]");
    var line = document.createElement("br");
    circleCard.setAttribute("aria-label", item.title);
    var circlesLook = document.documentElement.dataset.circles;
    var longWhen = circlesLook === "photo" || circlesLook === "mark";
    circleCard.querySelector("[data-circle-title]").textContent = item.title;
    var blurb = circleCard.querySelector("[data-circle-blurb]");
    if (blurb && item.blurb) blurb.textContent = item.blurb;
    var when = longWhen ? item.whenLong : item.when;
    var cut = when.indexOf(" · ");
    var kind = document.createElement("b");
    kind.textContent = when.slice(0, cut);
    circleCard.querySelector("[data-circle-when]").replaceChildren(kind, when.slice(cut));
    circleCard.querySelectorAll("[data-circle-host]").forEach(function (host) {
      host.textContent = item.host;
    });
    circleCard.querySelector("[data-circle-count]").textContent = item.count;
    circleCard.querySelector("[data-circle-enrolled]").setAttribute("aria-label", item.enrolled);
    circleCard.querySelector("[data-circle-avatar]").setAttribute("src", item.avatar);
    circleCard.querySelectorAll("[data-circle-face]").forEach(function (face) {
      face.setAttribute("src", item.face || item.avatar);
    });
    if (item.photo) circleCard.querySelector(".circle-card__img").setAttribute("src", item.photo);
    if (item.hostpic) circleCard.querySelector(".circle-card__hostpic").setAttribute("src", item.hostpic);
    var scene = circleCard.querySelector(".circle-card__scene");
    if (scene && item.photo) scene.setAttribute("src", item.photo);
    circleCard.querySelector("[data-circle-open]").setAttribute("aria-label", "Open details: " + item.title);
    circleCard.setAttribute("data-circle-event", circleEventId(item.title));
    date.replaceChildren(document.createTextNode(item.month), line, document.createTextNode(item.day));
    circleDots.forEach(function (dot, index) {
      var on = index === circleIndex;
      dot.classList.toggle("is-active", on);
      if (on) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  function stepCircle(delta) {
    circleIndex = (circleIndex + delta + CIRCLES.length) % CIRCLES.length;
    paintCircle();
  }

  function openCircleFromHome(trigger) {
    var eventId = circleCard.getAttribute("data-circle-event");
    if (window.CitizenCircles) {
      window.CitizenCircles.open({
        view: eventId ? "event" : "overview",
        eventId: eventId || undefined
      }, trigger);
      return;
    }
    var item = CIRCLES[circleIndex];
    document.querySelector("[data-circle-dialog-title]").textContent = item.title;
    document.querySelector("[data-circle-dialog-copy]").textContent = item.detail;
    openModal("circle", trigger);
  }
  circleCard.querySelector("[data-circle-next]").addEventListener("click", function (event) {
    openCircleFromHome(event.currentTarget);
  });
  circleCard.querySelector("[data-circle-open]").addEventListener("click", function (event) {
    openCircleFromHome(event.currentTarget);
  });
  document.querySelectorAll('[data-open="magazine"]').forEach(function (button) {
    button.addEventListener("click", function (event) {
      openModal("magazine", event.currentTarget);
    });
  });
  var circlePrev = document.querySelector("[data-circle-prev]");
  if (circlePrev) {
    circlePrev.addEventListener("click", function () {
      stepCircle(-1);
    });
  }
  document.querySelector("[data-circle-after]").addEventListener("click", function () {
    stepCircle(1);
  });
  circleDots.forEach(function (dot, index) {
    dot.addEventListener("click", function () {
      circleIndex = index;
      paintCircle();
    });
  });
  paintCircle();
  document.querySelector("[data-back]").addEventListener("click", function () {
    state.courseId = COURSES[0].id;
    render();
  });
  document.querySelectorAll("[data-modal]").forEach(function (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal(modal);
    });
    modal.querySelector("[data-modal-close]").addEventListener("click", function () {
      closeModal(modal);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var openModalEl = document.querySelector(".modal:not([hidden])");
    if (openModalEl) {
      closeModal(openModalEl);
      return;
    }
    if (!menu.hidden) {
      setMenu(false);
      pastBtn.focus();
    }
  });

  document.querySelector("[data-next-icon]").innerHTML = levelIcon(NEXT_LEVEL.color);
  render();
  arm();

  function zonedParts(date, zone) {
    var options = {
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    };
    if (zone) options.timeZone = zone;
    var out = {};
    new Intl.DateTimeFormat("en-US", options).formatToParts(date).forEach(function (part) {
      if (part.type !== "literal") out[part.type] = part.value;
    });
    if (out.hour === "24") out.hour = "00";
    return out;
  }

  function zonedInstant(zone, year, month, day, hour, minute) {
    var utc = Date.UTC(year, month - 1, day, hour, minute);
    for (var i = 0; i < 3; i++) {
      var got = zonedParts(new Date(utc), zone);
      utc += Date.UTC(year, month - 1, day, hour, minute) - Date.UTC(+got.year, +got.month - 1, +got.day, +got.hour, +got.minute);
    }
    return new Date(utc);
  }

  function clockLabel(date) {
    var parts = zonedParts(date);
    return parts.hour + ":" + parts.minute;
  }

  function zoneLabel(date) {
    var name = "";
    new Intl.DateTimeFormat("en-US", { hour: "2-digit", timeZoneName: "short" }).formatToParts(date).forEach(function (part) {
      if (part.type === "timeZoneName") name = part.value;
    });
    return name;
  }

  function sameDay(a, b) {
    return a.year === b.year && a.month === b.month && a.day === b.day;
  }

  function paintCafe() {
    var now = new Date();
    var there = zonedParts(now, "Asia/Jerusalem");
    var openAt = zonedInstant("Asia/Jerusalem", +there.year, +there.month, +there.day, 18, 0);
    var closeAt = zonedInstant("Asia/Jerusalem", +there.year, +there.month, +there.day, 20, 0);
    if (now >= openAt) openAt = zonedInstant("Asia/Jerusalem", +there.year, +there.month, +there.day + 1, 18, 0);
    if (now >= closeAt) closeAt = zonedInstant("Asia/Jerusalem", +there.year, +there.month, +there.day + 1, 20, 0);
    var tz = zoneLabel(now);
    var openDay = zonedParts(openAt);
    var here = zonedParts(now);
    var tomorrow = new Date(now.getTime());
    tomorrow.setDate(tomorrow.getDate() + 1);
    var when = sameDay(openDay, here) ? "today" : sameDay(openDay, zonedParts(tomorrow)) ? "tomorrow" : "";
    var mode = document.documentElement.dataset.cafe || "hours";
    var label = document.querySelector("[data-cafe-badge-label]");
    var hours = document.querySelector("[data-cafe-hours]");
    var list = document.querySelector("[data-cafe-hours-list]");
    label.textContent = mode === "closed" ? "Closed now" : mode === "always" ? "Open 24/7" : "Live now";
    hours.replaceChildren(document.createTextNode(
      mode === "closed"
        ? "Opens " + (when || "at") + (when ? " at " : " ") + clockLabel(openAt)
        : "Open until " + clockLabel(closeAt)
    ));
    var tzEl = document.createElement("span");
    tzEl.className = "cafe-tz";
    tzEl.textContent = " " + tz;
    hours.append(tzEl);
    list.textContent = "Every day · " + clockLabel(zonedInstant("Asia/Jerusalem", +there.year, +there.month, +there.day, 18, 0)) + "–" + clockLabel(zonedInstant("Asia/Jerusalem", +there.year, +there.month, +there.day, 20, 0)) + " " + tz;
    renderCafePeople();
  }

  var CAFE_ROSTER = [
    ["assets/img/avatar-1.jpg", "#449CFC"],
    ["assets/img/avatar-2.jpg", "#F7AAF3"],
    ["assets/img/avatar-3.jpg", "#F69700"],
    ["assets/img/avatar-4.jpg", "#DAEF81"],
    ["assets/img/avatar-2.jpg", "#90C7FC"],
    ["assets/img/avatar-4.jpg", "#FFE300"],
    ["assets/img/avatar-1.jpg", "#F69700"],
    ["assets/img/avatar-3.jpg", "#449CFC"]
  ];
  var CAFE_FACE_CAP = 5;
  var cafePeople = [];
  var cafeRosterAt = 0;
  var cafeStep = 0;
  var cafeShown = [];

  function cafeOpen() {
    return (document.documentElement.dataset.cafe || "hours") !== "closed";
  }

  function takeCafePerson() {
    var item = CAFE_ROSTER[cafeRosterAt % CAFE_ROSTER.length];
    cafeRosterAt += 1;
    return { id: cafeRosterAt, src: item[0], ring: item[1] };
  }

  function seedCafePeople() {
    cafePeople = [];
    var i;
    for (i = 0; i < 3; i += 1) cafePeople.push(takeCafePerson());
  }

  function stepCafePeople() {
    if (!cafeOpen()) return;
    var delta = [1, -1, 2][cafeStep % 3];
    cafeStep += 1;
    var i;
    if (delta > 0) {
      for (i = 0; i < delta; i += 1) cafePeople.push(takeCafePerson());
    } else if (cafePeople.length > 1) {
      cafePeople.pop();
    }
    renderCafePeople();
  }

  function renderCafePeople() {
    var host = document.querySelector("[data-cafe-people]");
    if (!host) return;
    var open = cafeOpen();
    host.hidden = !open;
    if (!open) return;
    var previous = Array.prototype.slice.call(host.querySelectorAll("[data-person]"));
    var leaving = previous.filter(function (node) {
      return cafePeople.every(function (person) {
        return String(person.id) !== node.getAttribute("data-person");
      });
    });
    if (leaving.length && !host.dataset.leaving) {
      leaving.forEach(function (node) { node.classList.add("is-out"); });
      host.dataset.leaving = "1";
      window.setTimeout(function () {
        delete host.dataset.leaving;
        renderCafePeople();
      }, 280);
      return;
    }
    var faces = cafePeople.slice(-CAFE_FACE_CAP);
    var extra = cafePeople.length - faces.length;
    host.replaceChildren();
    faces.forEach(function (person) {
      var el = document.createElement("span");
      el.className = "av" + (cafeShown.length && cafeShown.indexOf(person.id) === -1 ? " is-in" : "");
      el.setAttribute("data-person", String(person.id));
      el.style.setProperty("--ring", person.ring);
      var img = document.createElement("img");
      img.src = person.src;
      img.alt = "";
      el.append(img);
      host.append(el);
    });
    if (extra > 0) {
      var more = document.createElement("span");
      more.className = "av av--more" + (cafeShown.length ? " is-in" : "");
      more.style.setProperty("--ring", "#FFE300");
      more.textContent = "+" + extra;
      host.append(more);
    }
    host.setAttribute("aria-label", cafePeople.length + (cafePeople.length === 1 ? " person in Café" : " people in Café"));
    cafeShown = cafePeople.map(function (person) { return person.id; });
  }

  seedCafePeople();
  paintCafe();
  window.setInterval(stepCafePeople, 30000);

  var agenda = document.querySelector(".agenda");
  var agendaWrap = document.querySelector(".agenda-wrap");
  if (agenda && agendaWrap) {
    var syncAgenda = function () {
      var overflow = agenda.scrollHeight - agenda.clientHeight > 2;
      var atEnd = !overflow || agenda.scrollTop + agenda.clientHeight >= agenda.scrollHeight - 2;
      agendaWrap.classList.toggle("is-overflowing", overflow);
      agendaWrap.classList.toggle("is-at-end", atEnd);
    };
    agenda.addEventListener("scroll", syncAgenda, { passive: true });
    window.addEventListener("resize", syncAgenda);
    syncAgenda();
  }
})();
