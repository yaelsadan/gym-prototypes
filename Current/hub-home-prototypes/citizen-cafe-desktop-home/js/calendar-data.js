/* Sample week for the desktop calendar. The view reads this and does not own it. */
(function () {
  var dates = [
    "2027-03-21",
    "2027-03-22",
    "2027-03-23",
    "2027-03-24",
    "2027-03-25",
    "2027-03-26",
    "2027-03-27"
  ];

  function gym(date, hour) {
    return {
      id: date + "-gym-" + hour,
      kind: "gym",
      date: date,
      name: "Gym",
      startMin: hour * 60,
      endMin: (hour + 1) * 60,
      sessionMin: 17,
      count: 3,
      duration: "17 min"
    };
  }

  var activities = [];
  dates.forEach(function (date) {
    [12, 18, 20].forEach(function (hour) {
      activities.push(gym(date, hour));
    });
  });

  activities = activities.filter(function (item) {
    return item.id !== "2027-03-21-gym-18" && item.id !== "2027-03-23-gym-18";
  });

  activities.push(
    {
      id: "2027-03-21-practice-18",
      kind: "practice",
      date: "2027-03-21",
      name: "Practice session",
      level: "Orange level",
      accent: "orange",
      startMin: 18 * 60,
      endMin: 19 * 60,
      duration: "17 min"
    },
    {
      id: "2027-03-23-practice-18",
      kind: "practice",
      date: "2027-03-23",
      name: "Practice session",
      level: "Pink level",
      accent: "pink",
      startMin: 18 * 60,
      endMin: 19 * 60,
      duration: "17 min"
    },
    {
      id: "2027-03-21-class",
      kind: "class",
      date: "2027-03-21",
      name: "Lesson",
      number: "12",
      accent: "class",
      startMin: 20 * 60 + 30,
      endMin: 22 * 60,
      duration: "90 min",
      detail: "My class · Light Blue · with Noam"
    },
    {
      id: "2027-03-24-class",
      kind: "class",
      date: "2027-03-24",
      name: "Lesson",
      number: "12",
      accent: "class",
      startMin: 20 * 60 + 30,
      endMin: 22 * 60,
      duration: "90 min",
      detail: "My class · Light Blue · with Noam"
    },
    {
      id: "2027-03-25-circle",
      kind: "circle",
      date: "2027-03-25",
      name: "Circle",
      title: "A short history of the word Yalla",
      host: "Nitzan Wittler",
      startMin: 20 * 60,
      endMin: 20 * 60 + 1
    }
  );

  activities.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.startMin - b.startMin;
  });

  window.CitizenCalendarData = {
    anchorSunday: "2027-03-21",
    zoneName: "Israel Time",
    activities: activities,
    breaks: [
      { date: "2027-03-22", text: "Purim break from", time: "17:00" },
      { date: "2027-03-23", text: "Purim break", time: "" },
      { date: "2027-03-24", text: "Purim break until", time: "08:00" }
    ],
    /* One Wednesday evening session is already in the plan. Class lessons are always in the plan. */
    initialSessions: ["2027-03-24-gym-18:1"],
    /* Class meets Sunday and Wednesday. The month grid uses this outside the sample week. */
    classWeekdays: [0, 3],
    classTime: { startMin: 20 * 60 + 30, endMin: 22 * 60 },
    markers: [
      { date: "2027-03-11", kind: "note", text: "Jan semester ends", tone: "dark" },
      { date: "2027-03-11", kind: "circle", id: "2027-03-11-circle", startMin: 20 * 60 }
    ],
    comingUp: [
      { title: "Passover break", when: "Apr 21, 08:00 → Apr 30, 08:00" },
      { title: "February 2027 semester ends", when: "May 19" }
    ],
    semesters: [
      { title: "November semester", when: "Sun, Nov 22, 2026 → Thu, Feb 18, 2027", start: "2026-11-22", end: "2027-02-18" },
      { title: "January semester", when: "Sun, Jan 3, 2027 → Thu, Mar 11, 2027", start: "2027-01-03", end: "2027-03-11" },
      { title: "February semester", when: "Sun, Feb 14, 2027 → Wed, May 19, 2027", start: "2027-02-14", end: "2027-05-19" }
    ],
    breakList: [
      { title: "Hanukkah", when: "Fri, Dec 4, 2026, 17:00 → Sat, Dec 12, 2026, 08:00", start: "2026-12-04", end: "2026-12-12" },
      { title: "Purim", when: "Mon, Mar 22, 2027, 17:00 → Wed, Mar 24, 08:00", start: "2027-03-22", end: "2027-03-24" },
      { title: "Passover / Passover Yom Tov", when: "Wed, Apr 21, 2027, 08:00 → Fri, Apr 30, 08:00", start: "2027-04-21", end: "2027-04-30" },
      { title: "Yom Hashoah", when: "Mon, May 3, 2027, 17:00 → 23:59", start: "2027-05-03", end: "2027-05-03" },
      { title: "Yom Hazikaron + Atzmaut", when: "Mon, May 10, 2027, 17:00 → Thu, May 13, 08:00", start: "2027-05-10", end: "2027-05-13" }
    ]
  };
})();
