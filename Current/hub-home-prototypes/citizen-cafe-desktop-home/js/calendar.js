/* Weekly calendar modal. Sample data lives in calendar-data.js.
   Choices stay in memory while the page is open, including when the modal closes. */
(function () {
  var data = window.CitizenCalendarData;
  if (!data) return;

  var DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  var NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var byId = {};
  data.activities.forEach(function (activity) { byId[activity.id] = activity; });

  var state = {
    planOnly: false,
    filters: { class: true, gym: true, circle: true },
    sessions: {},
    singles: {},
    rsvp: {},
    selected: null,
    weekOffset: 0,
    view: "week",
    monthOffset: 0,
    monthDay: "2027-03-24",
    datesOpen: false
  };
  data.initialSessions.forEach(function (id) { state.sessions[id] = true; });

  var modal = document.getElementById("calendar-modal");
  var stage = modal.querySelector("[data-cal-stage]");
  var body = modal.querySelector("[data-cal-body]");
  var rangeEl = modal.querySelector("[data-cal-range]");
  var open = false;
  var lastFocus = null;
  var focusKey = null;
  var pageScroll = 0;
  var contentScroll = 0;

  function contentEl() {
    return document.querySelector(".content");
  }
  function rememberScroll() {
    pageScroll = window.scrollY || 0;
    var content = contentEl();
    contentScroll = content ? content.scrollTop : 0;
  }
  function restoreScroll() {
    var content = contentEl();
    if (content) content.scrollTop = contentScroll;
    if (pageScroll) window.scrollTo(0, pageScroll);
  }
  function markTriggers(on) {
    document.querySelectorAll("[data-calendar-open]").forEach(function (el) {
      el.setAttribute("aria-expanded", on ? "true" : "false");
      if (el.classList.contains("nav__item")) el.classList.toggle("is-open", on);
    });
  }

  function parseISO(iso) {
    var parts = iso.split("-");
    return new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  }
  function toISO(date) {
    var month = date.getUTCMonth() + 1;
    var day = date.getUTCDate();
    return date.getUTCFullYear() + "-" + (month < 10 ? "0" : "") + month + "-" + (day < 10 ? "0" : "") + day;
  }
  function addDays(date, count) {
    var next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + count);
    return next;
  }
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function fmtMin(mins) { return pad(Math.floor(mins / 60)) + ":" + pad(mins % 60); }
  function span(start, end) { return fmtMin(start) + " – " + fmtMin(end); }
  function sunday() { return addDays(parseISO(data.anchorSunday), state.weekOffset * 7); }
  function monthStart() {
    var anchor = parseISO(data.anchorSunday);
    return new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + state.monthOffset, 1));
  }
  function sameMonth(date, start) {
    return date.getUTCFullYear() === start.getUTCFullYear() && date.getUTCMonth() === start.getUTCMonth();
  }
  function weekOffsetFor(iso) {
    var date = parseISO(iso);
    var start = addDays(date, -date.getUTCDay());
    var anchor = parseISO(data.anchorSunday);
    return Math.round((start.getTime() - anchor.getTime()) / 86400000 / 7);
  }
  function weekDates() {
    var start = sunday();
    return [0, 1, 2, 3, 4, 5, 6].map(function (offset) { return toISO(addDays(start, offset)); });
  }
  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }
  function sessionId(activity, index) { return activity.id + ":" + index; }
  function sessionCount(activity) {
    var count = 0;
    var index;
    for (index = 0; index < activity.count; index += 1) {
      if (state.sessions[sessionId(activity, index)]) count += 1;
    }
    return count;
  }
  function markIsPlus(activity) {
    if (activity.kind === "gym") return sessionCount(activity) === 0;
    return !inPlan(activity);
  }
  function setInPlan(activity, on) {
    var index;
    if (activity.kind === "gym") {
      for (index = 0; index < activity.count; index += 1) {
        var id = sessionId(activity, index);
        if (on) state.sessions[id] = true;
        else delete state.sessions[id];
      }
    } else if (activity.kind === "circle") {
      if (on) state.rsvp[activity.id] = true;
      else delete state.rsvp[activity.id];
    } else if (activity.kind === "practice") {
      if (on) state.singles[activity.id] = true;
      else delete state.singles[activity.id];
    }
  }
  function inPlan(activity) {
    if (activity.kind === "class") return true;
    if (activity.kind === "circle") return !!state.rsvp[activity.id];
    if (activity.kind === "practice") return !!state.singles[activity.id];
    if (activity.kind === "gym") return sessionCount(activity) > 0;
    return false;
  }
  function typeOn(activity) {
    if (activity.kind === "class") return state.filters.class;
    if (activity.kind === "circle") return state.filters.circle;
    return state.filters.gym;
  }
  function visible(activity) {
    return typeOn(activity) && (!state.planOnly || inPlan(activity));
  }
  function activitiesOn(date) {
    return data.activities.filter(function (activity) { return activity.date === date; });
  }
  function planRanges(date) {
    var ranges = [];
    activitiesOn(date).forEach(function (activity) {
      if (activity.kind === "class") {
        ranges.push({ start: activity.startMin, end: activity.endMin, label: "Lesson " + activity.number, time: span(activity.startMin, activity.endMin), gym: false });
      } else if (activity.kind === "circle" && state.rsvp[activity.id]) {
        ranges.push({ start: activity.startMin, end: activity.endMin, label: "Circle", time: fmtMin(activity.startMin), gym: false });
      } else if (activity.kind === "practice" && state.singles[activity.id]) {
        ranges.push({ start: activity.startMin, end: activity.endMin, label: "Practice session", time: span(activity.startMin, activity.endMin), gym: false });
      } else if (activity.kind === "gym") {
        var index;
        for (index = 0; index < activity.count; index += 1) {
          if (!state.sessions[sessionId(activity, index)]) continue;
          var start = activity.startMin + index * activity.sessionMin;
          ranges.push({
            start: start,
            end: start + activity.sessionMin,
            label: "a Gym session",
            time: span(start, start + activity.sessionMin),
            gym: true
          });
        }
      }
    });
    return ranges;
  }
  function clash(date, start, end, wantGym) {
    return planRanges(date).filter(function (item) {
      return item.gym === wantGym && item.start < end && start < item.end;
    });
  }

  function checkIcon() {
    var wrap = el("span", "cal-check");
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", "In my plan");
    wrap.innerHTML = '<svg width="13" height="13" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8" stroke="#373230" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return wrap;
  }
  function plusIcon() {
    var wrap = el("span", "cal-plus");
    wrap.setAttribute("aria-hidden", "true");
    var img = document.createElement("img");
    img.src = "assets/icons/hub/agenda-plus.svg";
    img.alt = "";
    img.width = 13;
    img.height = 13;
    wrap.appendChild(img);
    return wrap;
  }
  function pill(on, label, key) {
    var button = el("button", "cal-pill");
    button.type = "button";
    button.setAttribute("aria-pressed", on ? "true" : "false");
    button.dataset.focus = key;
    button.innerHTML = on
      ? '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>In my plan</span>'
      : '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M9 3v12M3 9h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span>' + label + "</span>";
    return button;
  }

  function appendRuns(parent, text) {
    text.split(/(\d+)/).forEach(function (part) {
      if (!part) return;
      if (/^\d+$/.test(part)) {
        var num = el("span", "cal-range__num");
        num.textContent = part;
        parent.appendChild(num);
      } else parent.appendChild(document.createTextNode(part));
    });
  }
  function renderRange() {
    rangeEl.replaceChildren();
    var month = el("span", "cal-range__month");
    var rest = el("span", "cal-range__rest");
    if (state.view === "month") {
      var start = monthStart();
      month.textContent = MONTHS[start.getUTCMonth()];
      appendRuns(rest, " " + start.getUTCFullYear());
    } else {
      var weekStart = sunday();
      var end = addDays(weekStart, 6);
      month.textContent = MONTHS[weekStart.getUTCMonth()];
      var restText = " " + weekStart.getUTCDate() + " – ";
      if (weekStart.getUTCMonth() !== end.getUTCMonth()) restText += MONTHS[end.getUTCMonth()] + " ";
      restText += end.getUTCDate() + ", " + end.getUTCFullYear();
      appendRuns(rest, restText);
    }
    rangeEl.append(month, rest);
  }

  function syncControls() {
    modal.querySelector('[data-cal-scope="all"]').setAttribute("aria-pressed", state.planOnly ? "false" : "true");
    modal.querySelector('[data-cal-scope="plan"]').setAttribute("aria-pressed", state.planOnly ? "true" : "false");
    ["class", "gym", "circle"].forEach(function (key) {
      modal.querySelector('[data-cal-filter="' + key + '"]').setAttribute("aria-pressed", state.filters[key] ? "true" : "false");
    });
    modal.querySelector('[data-cal-view="week"]').setAttribute("aria-pressed", state.view === "week" ? "true" : "false");
    modal.querySelector('[data-cal-view="month"]').setAttribute("aria-pressed", state.view === "month" ? "true" : "false");
    modal.querySelector("[data-cal-prev]").setAttribute("aria-label", state.view === "month" ? "Previous month" : "Previous week");
    modal.querySelector("[data-cal-next]").setAttribute("aria-label", state.view === "month" ? "Next month" : "Next week");
  }

  function itemButton(activity) {
    var button = el("button", "cal-item");
    button.type = "button";
    button.dataset.focus = "item:" + activity.id;
    if (activity.accent) button.classList.add("cal-item--" + activity.accent);
    if (activity.kind === "circle") button.classList.add("cal-item--circle");
    if (state.selected === activity.id) button.classList.add("is-selected");

    if (activity.accent) {
      var accent = el("i", "cal-item__accent");
      accent.setAttribute("aria-hidden", "true");
      button.appendChild(accent);
    }

    var top = el("span", "cal-item__top");
    var time = el("span", "cal-item__time");
    time.textContent = activity.kind === "circle" ? fmtMin(activity.startMin) : span(activity.startMin, activity.endMin);
    top.appendChild(time);
    if (activity.duration) {
      var dur = el("span", "cal-item__dur");
      dur.textContent = activity.duration;
      top.appendChild(dur);
    }
    button.appendChild(top);

    var row = el("span", "cal-item__row");
    if (activity.kind === "class") {
      var cloud = document.createElement("img");
      cloud.src = "assets/icons/hub/agenda-lesson-cloud.svg";
      cloud.alt = "";
      cloud.width = 20;
      cloud.height = 20;
      row.appendChild(cloud);
    }
    var name = el("span", "cal-item__name");
    name.textContent = activity.kind === "class" ? activity.name + " " : activity.name;
    if (activity.number) {
      name.textContent = activity.name + " ";
      var num = el("span", "cal-item__num");
      num.textContent = activity.number;
      name.appendChild(num);
    }
    row.appendChild(name);
    button.appendChild(row);
    if (activity.level) {
      var level = el("span", "cal-item__level");
      level.textContent = activity.level;
      button.appendChild(level);
    }

    var mark = activity.kind === "class" ? el("span", "cal-item__mark") : el("button", "cal-item__mark");
    var adding = markIsPlus(activity);
    if (mark.tagName === "BUTTON") {
      mark.type = "button";
      mark.setAttribute("aria-label", adding ? "Add to my plan" : "Remove from my plan");
    }
    if (activity.kind === "gym") {
      var count = sessionCount(activity);
      if (count === activity.count) mark.appendChild(checkIcon());
      else if (count > 0) {
        var badge = el("span", "cal-count");
        badge.textContent = count + "/" + activity.count;
        mark.appendChild(badge);
      } else mark.appendChild(plusIcon());
    } else if (activity.kind === "circle" && !state.rsvp[activity.id]) {
      var rsvp = el("span", "cal-rsvp");
      rsvp.textContent = "RSVP";
      mark.appendChild(rsvp);
      var deco = document.createElement("img");
      deco.className = "cal-item__deco";
      deco.src = "assets/icons/hub/agenda-circle-figma.svg";
      deco.alt = "";
      button.appendChild(deco);
    } else if (inPlan(activity)) {
      mark.appendChild(checkIcon());
    } else {
      mark.appendChild(plusIcon());
    }
    button.appendChild(mark);
    if (mark.tagName === "BUTTON") {
      mark.addEventListener("click", function (event) {
        event.stopPropagation();
        setInPlan(activity, markIsPlus(activity));
        render();
      });
    }

    var when = NAMES[parseISO(activity.date).getUTCDay()] + " " + (activity.kind === "circle" ? fmtMin(activity.startMin) : span(activity.startMin, activity.endMin));
    var label = (activity.kind === "class" ? "Lesson " + activity.number : activity.name) + ", " + when;
    if (activity.kind === "gym") label += ", " + activity.count + " sessions of " + activity.sessionMin + " minutes. Show sessions";
    else if (inPlan(activity)) label += ", in my plan";
    else if (activity.kind === "circle") label += ", registration required";
    else label += ". Show details";
    button.setAttribute("aria-label", label);
    button.addEventListener("click", function (event) {
      if (event.target.closest(".cal-item__mark") && activity.kind !== "class") return;
      state.selected = state.selected === activity.id ? null : activity.id;
      focusKey = state.selected ? "item:" + activity.id : null;
      render();
    });
    return button;
  }

  function renderPanel(activity) {
    var panel = el("aside", "cal-panel");
    panel.setAttribute("aria-label", "Activity details");
    var card = el("div", "cal-panel__card");
    var top = el("div", "cal-panel__top");
    var mark = el("div", "cal-panel__mark");
    if (activity.kind === "class") {
      mark.classList.add("cal-panel__mark--class");
      var cloud = document.createElement("img");
      cloud.src = "assets/icons/hub/agenda-lesson-cloud.svg";
      cloud.alt = "";
      cloud.width = 28;
      cloud.height = 28;
      mark.appendChild(cloud);
    } else if (activity.kind === "circle") {
      var circles = document.createElement("img");
      circles.src = "assets/icons/hub/agenda-circle-figma.svg";
      circles.alt = "";
      circles.width = 36;
      circles.height = 36;
      mark.appendChild(circles);
    } else if (activity.kind === "practice") {
      mark.classList.add("cal-panel__mark--class");
      mark.style.background = activity.accent === "pink" ? "#f7aaf3" : "#f69700";
    } else {
      var gym = document.createElement("img");
      gym.src = "assets/icons/hub/agenda-gym-figma.svg";
      gym.alt = "";
      gym.width = 32;
      gym.height = 30;
      mark.appendChild(gym);
    }
    var copy = el("div", "cal-panel__copy");
    var title = el("span", "cal-panel__title");
    title.textContent = activity.name;
    if (activity.number) {
      title.appendChild(document.createTextNode(" "));
      var titleNum = el("span", "cal-panel__num");
      titleNum.textContent = activity.number;
      title.appendChild(titleNum);
    }
    var when = el("span", "cal-panel__when");
    var date = parseISO(activity.date);
    when.textContent = NAMES[date.getUTCDay()] + ", " + MONTHS[date.getUTCMonth()] + " " + date.getUTCDate();
    var time = el("span", "cal-panel__time");
    if (activity.kind === "gym") time.textContent = span(activity.startMin, activity.endMin) + " · " + activity.count + " × " + activity.sessionMin + " min";
    else if (activity.kind === "circle") time.textContent = fmtMin(activity.startMin);
    else time.textContent = span(activity.startMin, activity.endMin) + (activity.level ? " · " + activity.level : "");
    copy.append(title, when, time);
    var close = el("button", "cal-panel__x");
    close.type = "button";
    close.setAttribute("aria-label", "Close details");
    close.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="#373230" stroke-width="1.2" stroke-linecap="round"/></svg>';
    close.addEventListener("click", function () {
      state.selected = null;
      focusKey = "item:" + activity.id;
      render();
    });
    top.append(mark, copy, close);
    card.appendChild(top);

    if (activity.kind === "gym") {
      var block = el("div", "cal-panel__block");
      var allOn = sessionCount(activity) === activity.count;
      var hits = clash(activity.date, activity.startMin, activity.endMin, false);
      var line = el("div", "cal-panel__line");
      var text = el("span");
      var heading = document.createElement("b");
      heading.textContent = "Whole block";
      text.appendChild(heading);
      if (hits.length) {
        var note = document.createElement("small");
        note.textContent = "Partly overlaps " + hits[0].label;
        text.appendChild(note);
      }
      var allButton = pill(allOn, "Add to plan", "whole:" + activity.id);
      allButton.setAttribute("aria-label", (allOn ? "Remove the whole block from" : "Add the whole block to") + " my plan");
      allButton.addEventListener("click", function () {
        var index;
        for (index = 0; index < activity.count; index += 1) {
          var id = sessionId(activity, index);
          if (allOn) delete state.sessions[id];
          else state.sessions[id] = true;
        }
        focusKey = "whole:" + activity.id;
        render();
      });
      line.append(text, allButton);
      block.appendChild(line);
      var kicker = el("div", "cal-panel__kicker");
      kicker.textContent = "Or pick single sessions";
      block.appendChild(kicker);
      var index;
      for (index = 0; index < activity.count; index += 1) {
        (function (sessionIndex) {
          var id = sessionId(activity, sessionIndex);
          var on = !!state.sessions[id];
          var start = activity.startMin + sessionIndex * activity.sessionMin;
          var end = start + activity.sessionMin;
          var sessionHits = clash(activity.date, start, end, false).filter(function (item) {
            return item.label !== "a Gym session";
          });
          var row = el("div", "cal-panel__line");
          var label = el("span");
          var strong = document.createElement("b");
          strong.textContent = span(start, end);
          label.appendChild(strong);
          if (sessionHits.length) {
            var hint = document.createElement("small");
            hint.textContent = "Overlaps " + sessionHits[0].label;
            label.appendChild(hint);
          }
          var toggle = pill(on, "Add to plan", "session:" + id);
          toggle.setAttribute("aria-label", (on ? "Remove the " : "Add the ") + span(start, end) + " session " + (on ? "from" : "to") + " my plan");
          toggle.addEventListener("click", function () {
            if (on) delete state.sessions[id];
            else state.sessions[id] = true;
            focusKey = "session:" + id;
            render();
          });
          row.append(label, toggle);
          block.appendChild(row);
        })(index);
      }
      card.appendChild(block);
    }

    if (activity.kind === "class") {
      var gymHits = clash(activity.date, activity.startMin, activity.endMin, true);
      if (gymHits.length) card.appendChild(noteEl("Overlaps a Gym session in your plan (" + gymHits[0].time + ")."));
      var detail = el("p", "cal-panel__meta");
      detail.textContent = activity.detail;
      var always = el("div", "cal-note");
      always.innerHTML = '<span class="cal-check" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 18 18" fill="none"><path d="M3.5 9.5l3.5 3.5 7.5-8" stroke="#373230" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>Your class lessons are always in your plan.</span>';
      card.append(detail, always);
    }

    if (activity.kind === "practice") {
      var onPlan = !!state.singles[activity.id];
      var practiceLine = el("div", "cal-panel__line");
      var practiceText = el("span");
      var practiceName = document.createElement("b");
      practiceName.textContent = activity.level;
      practiceText.appendChild(practiceName);
      var practiceButton = pill(onPlan, "Add to plan", "single:" + activity.id);
      practiceButton.addEventListener("click", function () {
        if (onPlan) delete state.singles[activity.id];
        else state.singles[activity.id] = true;
        focusKey = "single:" + activity.id;
        render();
      });
      practiceLine.append(practiceText, practiceButton);
      card.appendChild(practiceLine);
    }

    if (activity.kind === "circle") {
      var circleHits = clash(activity.date, activity.startMin, activity.endMin, true);
      if (circleHits.length) card.appendChild(noteEl("Overlaps a Gym session in your plan (" + circleHits[0].time + ")."));
      var story = el("p", "cal-panel__story");
      story.textContent = activity.title;
      var host = el("p", "cal-panel__meta");
      host.textContent = "Host: " + activity.host;
      var help = el("p", "cal-panel__meta");
      help.textContent = "Circles need registration. Your RSVP saves your place.";
      var rsvpButton = el("button", "cal-panel__rsvp");
      rsvpButton.type = "button";
      rsvpButton.dataset.focus = "rsvp:" + activity.id;
      if (state.rsvp[activity.id]) {
        rsvpButton.classList.add("is-on");
        rsvpButton.textContent = "You're going · Cancel RSVP";
      } else rsvpButton.textContent = "RSVP";
      rsvpButton.addEventListener("click", function () {
        if (state.rsvp[activity.id]) delete state.rsvp[activity.id];
        else state.rsvp[activity.id] = true;
        focusKey = "rsvp:" + activity.id;
        render();
      });
      card.append(story, host, help, rsvpButton);
    }

    var google = el("button", "cal-panel__google");
    google.type = "button";
    google.dataset.calLater = "event";
    google.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="3" y="4" width="12" height="11" rx="1.5" stroke="#373230" stroke-width="1.2"/><path d="M3 7.5h12M6.5 2.8v3M11.5 2.8v3" stroke="#373230" stroke-width="1.2" stroke-linecap="round"/></svg><span>Add to Google Calendar</span>';
    card.appendChild(google);
    panel.appendChild(card);
    return panel;
  }

  function noteEl(text) {
    var note = el("div", "cal-note");
    note.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1"/><path d="M9 8v5M9 5.2v.6" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>';
    var spanNode = el("span");
    spanNode.textContent = text;
    note.appendChild(spanNode);
    return note;
  }

  function markersOn(iso) {
    return (data.markers || []).filter(function (item) { return item.date === iso; });
  }
  function gymInPlan(iso) {
    var count = 0;
    activitiesOn(iso).forEach(function (activity) {
      if (activity.kind === "gym") count += sessionCount(activity);
    });
    return count;
  }
  function monthCells(start) {
    var first = addDays(start, -start.getUTCDay());
    var cells = [];
    var index;
    for (index = 0; index < 42; index += 1) cells.push(addDays(first, index));
    if (!sameMonth(cells[35], start)) cells = cells.slice(0, 35);
    return cells;
  }
  function dayRows(iso) {
    var rows = [];
    var seen = {};
    [12, 18, 20].forEach(function (hour) {
      var start = hour * 60;
      var match = activitiesOn(iso).filter(function (activity) {
        return (activity.kind === "gym" || activity.kind === "practice") && activity.startMin < start + 60 && start < activity.endMin;
      })[0];
      if (match) {
        seen[match.id] = true;
        if (match.kind === "practice") {
          if (state.filters.gym && (!state.planOnly || inPlan(match))) {
            rows.push({ sort: match.startMin, time: span(match.startMin, match.endMin), name: match.name, inPlan: inPlan(match) });
          }
        } else if (state.filters.gym && (!state.planOnly || sessionCount(match) > 0)) {
          rows.push({ sort: match.startMin, time: span(match.startMin, match.endMin), name: "Gym", inPlan: sessionCount(match) > 0 });
        }
      } else if (state.filters.gym && !state.planOnly) {
        rows.push({ sort: start, time: span(start, start + 60), name: "Gym", inPlan: false });
      }
    });
    activitiesOn(iso).forEach(function (activity) {
      if (seen[activity.id]) return;
      if (activity.kind === "class" && state.filters.class) {
        rows.push({
          sort: activity.startMin,
          time: span(activity.startMin, activity.endMin),
          name: activity.number ? "Lesson " + activity.number : "Lesson",
          inPlan: true,
          lesson: true
        });
      } else if (activity.kind === "circle" && state.filters.circle && (!state.planOnly || state.rsvp[activity.id])) {
        rows.push({
          sort: activity.startMin,
          time: fmtMin(activity.startMin),
          name: "Circle",
          inPlan: !!state.rsvp[activity.id],
          rsvp: !state.rsvp[activity.id]
        });
      }
    });
    var date = parseISO(iso);
    if (state.filters.class && data.classWeekdays.indexOf(date.getUTCDay()) !== -1 && !rows.some(function (row) { return row.lesson; })) {
      rows.push({
        sort: data.classTime.startMin,
        time: span(data.classTime.startMin, data.classTime.endMin),
        name: "Lesson",
        inPlan: true,
        lesson: true
      });
    }
    markersOn(iso).forEach(function (marker) {
      if (marker.kind !== "circle" || !state.filters.circle) return;
      if (state.planOnly && !state.rsvp[marker.id]) return;
      rows.push({
        sort: marker.startMin,
        time: fmtMin(marker.startMin),
        name: "Circle",
        inPlan: !!state.rsvp[marker.id],
        rsvp: !state.rsvp[marker.id]
      });
    });
    rows.sort(function (a, b) { return a.sort - b.sort; });
    return rows;
  }
  function renderMonth() {
    var start = monthStart();
    if (!sameMonth(parseISO(state.monthDay), start)) state.monthDay = toISO(start);
    var wrap = el("div", "cal-month");
    var main = el("div", "cal-month__main");
    var dow = el("div", "cal-mdow");
    DOW.forEach(function (name) {
      var label = el("span");
      label.textContent = name;
      dow.appendChild(label);
    });
    var grid = el("div", "cal-mgrid");
    monthCells(start).forEach(function (date) {
      var iso = toISO(date);
      var inside = sameMonth(date, start);
      var cell = el(inside ? "button" : "div", "cal-mcell" + (inside ? "" : " is-out"));
      if (inside) {
        cell.type = "button";
        cell.dataset.focus = "day:" + iso;
        cell.setAttribute("aria-label", NAMES[date.getUTCDay()] + ", " + MONTHS[date.getUTCMonth()] + " " + date.getUTCDate());
        if (iso === state.monthDay) cell.setAttribute("aria-current", "date");
        cell.addEventListener("click", function () {
          state.monthDay = iso;
          focusKey = "day:" + iso;
          render();
        });
      }
      var num = el("span", "cal-mnum");
      if (iso === data.anchorSunday) num.classList.add("is-today");
      if (inside && iso === state.monthDay) num.classList.add("is-selected");
      num.textContent = String(date.getUTCDate());
      cell.appendChild(num);
      if (!inside) {
        grid.appendChild(cell);
        return;
      }
      var breakNote = data.breaks.filter(function (item) { return item.date === iso; })[0];
      if (breakNote) {
        var band = el("span", "cal-mband");
        var bandLabel = breakNote.text;
        if (breakNote.time && /from/i.test(breakNote.text)) bandLabel = "Purim from";
        else if (breakNote.time && /until/i.test(breakNote.text)) bandLabel = "until";
        else if (!breakNote.time) bandLabel = "";
        if (bandLabel) band.appendChild(document.createTextNode(bandLabel));
        if (breakNote.time) {
          if (bandLabel) band.appendChild(document.createTextNode(" "));
          var bandTime = document.createElement("b");
          bandTime.textContent = breakNote.time;
          band.appendChild(bandTime);
        }
        cell.appendChild(band);
      }
      markersOn(iso).forEach(function (marker) {
        if (marker.kind !== "note") return;
        var note = el("span", "cal-mnote");
        note.textContent = marker.text;
        cell.appendChild(note);
      });
      if (state.filters.class && data.classWeekdays.indexOf(date.getUTCDay()) !== -1) {
        var lesson = el("span", "cal-mlesson");
        lesson.textContent = "Lesson · " + fmtMin(data.classTime.startMin);
        cell.appendChild(lesson);
      }
      var circle = activitiesOn(iso).filter(function (activity) { return activity.kind === "circle"; })[0];
      var markerCircle = markersOn(iso).filter(function (marker) { return marker.kind === "circle"; })[0];
      var circleOn = circle ? !!state.rsvp[circle.id] : markerCircle ? !!state.rsvp[markerCircle.id] : false;
      var circleStart = circle ? circle.startMin : markerCircle ? markerCircle.startMin : null;
      if (state.filters.circle && circleStart !== null && (!state.planOnly || circleOn)) {
        var circleRow = el("span", "cal-mrow");
        var icon = document.createElement("img");
        icon.src = "assets/icons/hub/agenda-circle-figma.svg?v=20261112f";
        icon.alt = "";
        icon.width = 22;
        icon.height = 22;
        circleRow.appendChild(icon);
        circleRow.appendChild(document.createTextNode("Circle · " + fmtMin(circleStart)));
        cell.appendChild(circleRow);
      }
      var planned = gymInPlan(iso);
      if (state.filters.gym && planned > 0) {
        var gymRow = el("span", "cal-mgym");
        var mark = el("span", "cal-check");
        mark.setAttribute("aria-hidden", "true");
        mark.innerHTML = '<svg width="10" height="10" viewBox="0 0 18 18" fill="none"><path d="M3.5 9.5l3.5 3.5 7.5-8" stroke="#373230" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        gymRow.appendChild(mark);
        gymRow.appendChild(document.createTextNode("Gym · " + planned + (planned === 1 ? " session" : " sessions")));
        cell.appendChild(gymRow);
      }
      grid.appendChild(cell);
    });
    main.append(dow, grid);

    var side = el("aside", "cal-month__side");
    side.setAttribute("aria-label", "Selected day");
    var picked = parseISO(state.monthDay);
    var card = el("div", "cal-daycard");
    var title = el("span", "cal-daycard__title");
    title.appendChild(document.createTextNode(NAMES[picked.getUTCDay()] + ", " + MONTHS[picked.getUTCMonth()] + " "));
    var titleNum = document.createElement("b");
    titleNum.textContent = String(picked.getUTCDate());
    title.appendChild(titleNum);
    card.appendChild(title);
    var dayBreak = data.breaks.filter(function (item) { return item.date === state.monthDay; })[0];
    var dayNote = markersOn(state.monthDay).filter(function (marker) { return marker.kind === "note"; })[0];
    if (dayBreak || dayNote) {
      var noteLine = el("div", "cal-daycard__note");
      noteLine.innerHTML = '<svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4 15.5V3.2M4 3.6h8.2L10 6.2l2.2 2.6H4" stroke="#373230" stroke-width="1.2" stroke-linejoin="round"/></svg>';
      var noteText = el("span");
      noteText.textContent = dayBreak ? dayBreak.text : dayNote.text;
      noteLine.appendChild(noteText);
      if (dayBreak && dayBreak.time) {
        var noteTime = document.createElement("b");
        noteTime.textContent = dayBreak.time;
        noteLine.appendChild(noteTime);
      }
      card.appendChild(noteLine);
    }
    var list = el("div", "cal-daylist");
    dayRows(state.monthDay).forEach(function (row) {
      var line = el("div", "cal-dayrow");
      var time = el("span", "cal-dayrow__time");
      time.textContent = row.time;
      var name = el("span", "cal-dayrow__name" + (row.lesson ? " cal-dayrow__name--lesson" : ""));
      name.textContent = row.name;
      line.append(time, name);
      if (row.inPlan) line.appendChild(checkIcon());
      else if (row.rsvp) {
        var pillMark = el("span", "cal-rsvp");
        pillMark.textContent = "RSVP";
        line.appendChild(pillMark);
      }
      list.appendChild(line);
    });
    card.appendChild(list);
    var openWeek = el("button", "cal-daylink");
    openWeek.type = "button";
    openWeek.innerHTML = "<span>Open this week to choose</span>" +
      '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M7 4l5 5-5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    openWeek.addEventListener("click", function () {
      state.view = "week";
      state.weekOffset = weekOffsetFor(state.monthDay);
      state.selected = null;
      focusKey = null;
      render();
    });
    card.appendChild(openWeek);

    var coming = el("div", "cal-coming");
    var comingTitle = document.createElement("h3");
    comingTitle.textContent = "Coming up";
    coming.appendChild(comingTitle);
    (data.comingUp || []).forEach(function (item) {
      var block = el("div");
      var name = el("span", "cal-coming__title");
      name.textContent = item.title;
      var when = el("span", "cal-coming__when");
      when.textContent = item.when;
      block.append(name, when);
      coming.appendChild(block);
    });
    var datesButton = el("button", "cal-coming__link");
    datesButton.type = "button";
    datesButton.textContent = "All semester & break dates";
    datesButton.addEventListener("click", function () {
      state.datesOpen = true;
      render();
    });
    coming.appendChild(datesButton);
    side.append(card, coming);
    wrap.append(main, side);
    stage.replaceChildren(wrap);
    stage.style.minHeight = "";
    if (focusKey) {
      var node = stage.querySelector('[data-focus="' + focusKey + '"]');
      if (node) node.focus();
    }
  }
  function renderDates() {
    var sheet = el("aside", "cal-dates");
    sheet.setAttribute("aria-label", "Semester and break dates");
    var top = el("div", "cal-dates__top");
    var title = document.createElement("h3");
    title.className = "cal-dates__title";
    title.textContent = "Semester & break dates";
    var close = el("button", "cal-panel__x");
    close.type = "button";
    close.setAttribute("aria-label", "Close dates");
    close.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="#373230" stroke-width="1.2" stroke-linecap="round"/></svg>';
    close.addEventListener("click", function () {
      state.datesOpen = false;
      render();
    });
    top.append(title, close);
    sheet.appendChild(top);
    function rangesOverlap(aStart, aEnd, bStart, bEnd) {
      return aStart <= bEnd && bStart <= aEnd;
    }
    (data.semesters || []).forEach(function (semester, index) {
      var block = el("section", "cal-dates__semester");
      var heading = document.createElement("h4");
      heading.textContent = semester.title;
      var range = el("p", "cal-dates__range");
      range.textContent = semester.when;
      var panelId = "cal-breaks-" + index;
      var toggle = el("button", "cal-dates__breaks");
      toggle.type = "button";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", panelId);
      toggle.appendChild(document.createTextNode("Breaks"));
      var chev = el("span", "cal-dates__chev");
      chev.setAttribute("aria-hidden", "true");
      toggle.appendChild(chev);
      var panel = el("div", "cal-dates__panel");
      panel.id = panelId;
      panel.hidden = true;
      var breaks = (data.breakList || []).filter(function (item) {
        return item.start && semester.start && rangesOverlap(item.start, item.end, semester.start, semester.end);
      });
      if (!breaks.length) {
        var empty = el("p", "cal-dates__empty");
        empty.textContent = "No breaks this semester";
        panel.appendChild(empty);
      } else {
        breaks.forEach(function (item) {
          var row = el("div", "cal-dates__row");
          var name = document.createElement("strong");
          name.textContent = item.title;
          var when = el("span");
          when.textContent = item.when;
          row.append(name, when);
          panel.appendChild(row);
        });
      }
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", open ? "false" : "true");
        panel.hidden = open;
      });
      block.append(heading, range, toggle, panel);
      sheet.appendChild(block);
    });
    var foot = el("p", "cal-dates__foot");
    foot.textContent = "All times shown in Israel Time.";
    sheet.appendChild(foot);
    return sheet;
  }

  function renderWeek() {
    var dates = weekDates();
    var breaks = data.breaks.filter(function (item) { return dates.indexOf(item.date) !== -1; });
    var board = el("div", "cal-board");
    if (breaks.length) board.classList.add("has-break");
    dates.forEach(function (date, index) {
      var head = el("div", "cal-dayhead");
      head.style.gridColumn = String(index + 1);
      head.style.gridRow = "1";
      head.append(document.createTextNode(DOW[index]));
      var num = document.createElement("b");
      num.textContent = String(parseISO(date).getUTCDate());
      head.appendChild(num);
      board.appendChild(head);

      var card = el("div", "cal-card");
      card.style.gridColumn = String(index + 1);
      card.style.gridRow = "2";
      activitiesOn(date).filter(visible).forEach(function (activity) {
        card.appendChild(itemButton(activity));
      });
      board.appendChild(card);
    });
    if (breaks.length) {
      var first = dates.indexOf(breaks[0].date);
      var last = dates.indexOf(breaks[breaks.length - 1].date);
      var bar = el("div", "cal-breakbar");
      bar.style.gridColumn = (first + 1) + " / " + (last + 2);
      bar.style.gridRow = "1";
      breaks.forEach(function (item) {
        var line = document.createElement("p");
        line.append(document.createTextNode(item.text));
        if (item.time) {
          line.append(document.createTextNode(" "));
          var time = document.createElement("b");
          time.textContent = item.time;
          line.appendChild(time);
        }
        bar.appendChild(line);
      });
      board.appendChild(bar);
    }

    var selected = state.selected ? byId[state.selected] : null;
    var showPanel = selected && dates.indexOf(selected.date) !== -1 && visible(selected);
    stage.replaceChildren(board);
    stage.style.minHeight = "";
    if (showPanel) stage.appendChild(renderPanel(selected));
    if (focusKey) {
      var node = stage.querySelector('[data-focus="' + focusKey + '"]');
      if (node) node.focus();
    }
    if (showPanel) schedulePanel();
  }

  function render() {
    renderRange();
    syncControls();
    if (state.view === "month") renderMonth();
    else renderWeek();
    var sheet = modal.querySelector(".cal-dates");
    if (sheet) sheet.remove();
    if (state.datesOpen) modal.querySelector(".cal-modal__card").appendChild(renderDates());
  }

  function placePanel() {
    var panel = stage.querySelector(".cal-panel");
    var card = stage.querySelector(".cal-item.is-selected");
    if (!panel || !card) return;
    var stageBox = stage.getBoundingClientRect();
    var cardBox = card.getBoundingClientRect();
    var width = panel.offsetWidth;
    var left = cardBox.right - stageBox.left + 8;
    if (left + width > stage.clientWidth - 4) left = cardBox.left - stageBox.left - width - 8;
    if (left < 0) left = 0;
    var top = Math.max(0, cardBox.top - stageBox.top);
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    var board = stage.querySelector(".cal-board");
    var needed = top + panel.offsetHeight + 8;
    stage.style.minHeight = Math.max(board ? board.offsetHeight : 0, needed) + "px";
    var panelBox = panel.getBoundingClientRect();
    var bodyBox = body.getBoundingClientRect();
    var fits = panel.offsetHeight < body.clientHeight - 16;
    if (panelBox.top < bodyBox.top + 8) body.scrollTop -= bodyBox.top - panelBox.top + 12;
    else if (fits && panelBox.bottom > bodyBox.bottom - 8) body.scrollTop += panelBox.bottom - bodyBox.bottom + 12;
  }
  function schedulePanel() {
    placePanel();
    requestAnimationFrame(placePanel);
  }

  function openModal(trigger) {
    lastFocus = trigger || document.activeElement;
    rememberScroll();
    open = true;
    document.documentElement.classList.add("cal-open");
    markTriggers(true);
    modal.hidden = false;
    render();
    modal.querySelector("[data-cal-close]").focus();
  }
  function closeModal() {
    open = false;
    modal.hidden = true;
    document.documentElement.classList.remove("cal-open");
    markTriggers(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    restoreScroll();
  }

  document.querySelectorAll("[data-calendar-open]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      openModal(link);
    });
  });
  modal.querySelector("[data-cal-close]").addEventListener("click", closeModal);
  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeModal();
  });
  modal.querySelector("[data-cal-prev]").addEventListener("click", function () {
    if (state.view === "month") state.monthOffset -= 1;
    else state.weekOffset -= 1;
    focusKey = null;
    render();
  });
  modal.querySelector("[data-cal-next]").addEventListener("click", function () {
    if (state.view === "month") state.monthOffset += 1;
    else state.weekOffset += 1;
    focusKey = null;
    render();
  });
  modal.querySelector("[data-cal-today]").addEventListener("click", function () {
    if (state.view === "month") {
      state.monthOffset = 0;
      state.monthDay = data.anchorSunday;
    } else state.weekOffset = 0;
    focusKey = null;
    render();
  });
  modal.querySelectorAll("[data-cal-view]").forEach(function (button) {
    button.addEventListener("click", function () {
      var next = button.getAttribute("data-cal-view");
      if (next === "month" && state.selected && byId[state.selected]) state.monthDay = byId[state.selected].date;
      state.view = next;
      focusKey = null;
      render();
    });
  });
  modal.querySelector("[data-cal-later='semester']").addEventListener("click", function () {
    state.datesOpen = !state.datesOpen;
    render();
  });
  modal.querySelectorAll("[data-cal-scope]").forEach(function (button) {
    button.addEventListener("click", function () {
      state.planOnly = button.getAttribute("data-cal-scope") === "plan";
      render();
    });
  });
  modal.querySelectorAll("[data-cal-filter]").forEach(function (button) {
    button.addEventListener("click", function () {
      var key = button.getAttribute("data-cal-filter");
      state.filters[key] = !state.filters[key];
      render();
    });
  });
  document.addEventListener("keydown", function (event) {
    if (!open || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    if (state.datesOpen) {
      state.datesOpen = false;
      render();
      return;
    }
    if (state.view === "week" && state.selected) {
      var returnId = state.selected;
      state.selected = null;
      focusKey = "item:" + returnId;
      render();
      return;
    }
    closeModal();
  }, true);
  window.addEventListener("resize", function () {
    if (open && state.view === "week") placePanel();
  });
  if (document.fonts) document.fonts.ready.then(function () { if (open) placePanel(); });
})();
