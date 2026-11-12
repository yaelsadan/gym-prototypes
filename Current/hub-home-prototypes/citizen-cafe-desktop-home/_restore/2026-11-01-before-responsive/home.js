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

  var COURSES = [
    { id: "lb-nov-2026", current: true, name: "Light Blue", color: "#90C7FC", term: "November semester 2026", schedule: "Sun & Wed 20:30 // with Noam", pod: "Light Blue Level" },
    { id: "lb-may-2026", name: "Light Blue", color: "#90C7FC", term: "May semester 2026", schedule: "Sun & Wed 20:30 // with Noam", pod: "Light Blue Level" },
    { id: "yellow-nov-2025", name: "Yellow", color: "#FFE300", term: "November semester 2025", schedule: "Mon & Thu 19:00 // with Noam", pod: "Yellow Level" },
    { id: "orange-may-2025", name: "Orange", color: "#F69700", term: "May semester 2025", schedule: "Tue & Thu 18:30 // with Noam", pod: "Orange Level" }
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
    countdown: "long",
    paused: false,
    labels: false
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

  /* Day mode hides seconds. Under 24 hours the third field is seconds.
     Both shapes are three digits, so the clock does not change width. */
  function fieldsFor(ms) {
    var t = split(ms);
    if (ms >= 86400000) {
      return [
        { key: "d", text: pad(t.d), label: "Days" },
        { key: "h", text: pad(t.h), label: "Hours" },
        { key: "m", text: pad(t.m), label: "Minutes" }
      ];
    }
    return [
      { key: "h", text: pad(t.h), label: "Hours" },
      { key: "m", text: pad(t.m), label: "Minutes" },
      { key: "s", text: pad(t.s), label: "Seconds" }
    ];
  }

  function spoken(ms) {
    var t = split(ms);
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

  function appendFace(parent, parts, ghost) {
    var face = document.createElement("span");
    face.className = "time__face" + (ghost ? " time__ghost " + ghost : "");
    if (ghost) face.setAttribute("aria-hidden", "true");
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
      var value = document.createElement("span");
      value.className = "time__value";
      value.setAttribute("aria-hidden", "true");
      group.appendChild(value);
      if (!ghost) {
        var label = document.createElement("span");
        label.className = "time__label";
        label.setAttribute("aria-hidden", "true");
        label.textContent = part.label;
        group.appendChild(label);
      }
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

  function paintClock(el, parts) {
    var compact = el.classList.contains("time--compact");
    var shape = (compact ? "c" : "f") + parts.map(function (part) { return part.key + part.label; }).join("|");
    if (el.dataset.shape !== shape) {
      el.dataset.shape = shape;
      el.replaceChildren();
      if (!compact) appendFace(el, parts, "time__ghost--before");
      appendFace(el, parts, "");
      if (!compact) appendFace(el, parts, "time__ghost--after");
    }
    var upcoming = neighbor(parts, -1);
    var passed = neighbor(parts, 1);
    el.querySelectorAll(".time__face").forEach(function (face) {
      var source = face.classList.contains("time__ghost--before") ? upcoming
        : face.classList.contains("time__ghost--after") ? passed
        : parts;
      var values = face.querySelectorAll(".time__value");
      source.forEach(function (part, index) {
        if (values[index].textContent !== part.text) values[index].textContent = part.text;
      });
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
  }

  function arm() {
    window.clearTimeout(timerId);
    if (state.paused) return;
    var left = remaining();
    if (left <= 0) return;
    var wait = left >= 86400000 ? (left % 60000 || 60000) : (1000 - (Date.now() % 1000));
    if (wait < 40) wait += left >= 86400000 ? 60000 : 1000;
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
    document.querySelector("[data-course-term]").textContent = course.term;
    document.querySelector("[data-course-schedule]").textContent = course.schedule;
    document.querySelector("[data-level-icon]").innerHTML = levelIcon(course.color);
    document.querySelector("[data-pod-title]").textContent = course.pod;
    currentStage.hidden = past;
    pastStage.hidden = !past;
    document.querySelector("[data-next-block]").hidden = past || open;
    document.querySelector("[data-next-line]").hidden = !open;
    document.querySelector("[data-reenroll]").hidden = !open;
    var note = "Demo certificate for " + course.name + ", " + course.term + ". This is not an official document.";
    document.querySelector("[data-cert-note]").textContent = note;
    document.querySelector("[data-cert-dialog]").textContent = "A certificate for " + course.name + ", " + course.term + " would open here. This demo does not include an official document.";
    document.documentElement.dataset.course = past ? "past" : "current";
    document.documentElement.dataset.reenrollment = state.reenrollment;
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
  if (params.get("review") === "1") review.hidden = false;

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

  review.querySelectorAll('input[name="reenroll"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      state.reenrollment = input.value;
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
  review.querySelector("[data-pause]").addEventListener("change", function (event) {
    setPaused(event.target.checked);
  });
  review.querySelector("[data-labels]").addEventListener("change", function (event) {
    state.labels = event.target.checked;
    document.documentElement.dataset.labels = state.labels ? "on" : "off";
  });

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

  document.querySelector("[data-choose]").addEventListener("click", function (event) {
    openModal("choose", event.currentTarget);
  });
  document.querySelector("[data-view-cert]").addEventListener("click", function (event) {
    openModal("cert", event.currentTarget);
  });
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
