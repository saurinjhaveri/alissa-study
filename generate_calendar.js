'use strict';

const React = require('react');
const { Document, Page, Text, View, renderToBuffer } = require('@react-pdf/renderer');
const fs   = require('fs');
const path = require('path');
const { COLORS, TUITION, TESTS, EXAMS, SPECIAL_DAYS, SCHOOL_START, SCHOOL_END, WEEKS } = require('./schedule_data');

// ─── PAGE DIMENSIONS (A4 Landscape, points) ───────────────────────────────────
const W = 841.89, H = 595.28;
const M = 14;              // margin
const TIME_COL = 40;       // left time-label column width
const HDR_H    = 28;       // top page header height
const DAY_HDR  = 22;       // day-name row height
const LEG_H    = 14;       // legend strip height at bottom
const GRID_X   = M + TIME_COL;
const GRID_Y   = M + HDR_H + DAY_HDR;
const GRID_W   = W - GRID_X - M;
const GRID_H   = H - GRID_Y - M - LEG_H - 4;
const COL_W    = GRID_W / 7;

// ─── TIME GRID (8 AM – 10:30 PM) ──────────────────────────────────────────────
const T_START = 8;       // 8 AM
const T_END   = 22.5;    // 10:30 PM
const T_SPAN  = T_END - T_START;
const PX_HR   = GRID_H / T_SPAN;
const PX_MIN  = PX_HR / 60;

const DAYS_LONG  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const el = React.createElement;

function parseTime(s) {
  const [h, m] = s.split(':').map(Number);
  return { h, m };
}

function timeToGridY(s) {
  const { h, m } = parseTime(s);
  return (h - T_START + m / 60) * PX_HR;
}

function durationPx(start, end) {
  const s = parseTime(start), e = parseTime(end);
  return ((e.h - s.h) * 60 + (e.m - s.m)) * PX_MIN;
}

function weekDates(weekStartStr) {
  const base = new Date(weekStartStr + 'T00:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isoDate(d)   {
  // Use local date parts (not UTC) to avoid timezone day-shift
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fmtDate(d)   { return `${d.getDate()}/${d.getMonth() + 1}`; }
function inSchool(ds) { return ds >= SCHOOL_START && ds <= SCHOOL_END; }

// ─── EVENT BLOCK COMPONENT ────────────────────────────────────────────────────
function Block({ absX, absY, w, h, bg, label, textColor, fontSize }) {
  const minH  = 6;
  const rectH = Math.max(h, minH);
  const showText = h >= 10;
  return el(View, {
    style: {
      position: 'absolute',
      left: absX + 1,
      top:  absY + 0.5,
      width:  w - 2,
      height: rectH - 1,
      backgroundColor: bg,
      borderRadius: 2,
      padding: 2.5,
      overflow: 'hidden',
    }
  },
    showText
      ? el(Text, { style: { fontSize: fontSize || 6.5, color: textColor || '#FFF', fontFamily: 'Helvetica', lineHeight: 1.3 } }, label)
      : null
  );
}

// ─── WEEK PAGE ────────────────────────────────────────────────────────────────
function WeekPage({ weekStart, weekLabel }) {
  const dates  = weekDates(weekStart);
  const nodes  = [];
  let   key    = 0;
  const K      = () => `k${key++}`;

  // Helper: push a Block
  const pushBlock = (dayIdx, startStr, endStr, bg, label, textColor, fontSize) => {
    const absX = GRID_X + dayIdx * COL_W;
    const absY = GRID_Y + timeToGridY(startStr);
    const h    = durationPx(startStr, endStr);
    nodes.push(el(Block, { key: K(), absX, absY, w: COL_W, h, bg, label, textColor, fontSize }));
  };

  // ── 1. Background hour stripes ──────────────────────────────────────────────
  for (let i = 0; i < Math.ceil(T_SPAN); i++) {
    nodes.push(el(View, { key: K(), style: {
      position: 'absolute',
      left: GRID_X, top: GRID_Y + i * PX_HR,
      width: GRID_W, height: PX_HR,
      backgroundColor: i % 2 === 0 ? '#F9F9F9' : '#F3F3F3',
    }}));
  }

  // ── 2. Hour & half-hour grid lines ─────────────────────────────────────────
  for (let h = T_START; h <= T_END; h += 0.5) {
    const isHour = (h % 1 === 0);
    const y = GRID_Y + (h - T_START) * PX_HR;
    nodes.push(el(View, { key: K(), style: {
      position: 'absolute',
      left: GRID_X, top: y,
      width: GRID_W, height: isHour ? 0.5 : 0.3,
      backgroundColor: isHour ? '#C8C8C8' : '#E4E4E4',
    }}));
    // Time label (whole hours only)
    if (isHour && h <= T_END) {
      const disp = h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`;
      nodes.push(el(Text, { key: K(), style: {
        position: 'absolute',
        left: M, top: y - 4,
        width: TIME_COL - 4,
        fontSize: 6, color: '#777',
        textAlign: 'right', fontFamily: 'Helvetica',
      }}, disp));
    }
  }

  // ── 3. Column separators ───────────────────────────────────────────────────
  for (let d = 0; d <= 7; d++) {
    nodes.push(el(View, { key: K(), style: {
      position: 'absolute',
      left: GRID_X + d * COL_W, top: GRID_Y,
      width: d === 0 || d === 7 ? 1 : 0.5,
      height: GRID_H,
      backgroundColor: '#BBBBBB',
    }}));
  }

  // ── 4. Day header cells ────────────────────────────────────────────────────
  dates.forEach((date, d) => {
    const isWeekend = d >= 5;
    nodes.push(el(View, { key: K(), style: {
      position: 'absolute',
      left: GRID_X + d * COL_W, top: M + HDR_H,
      width: COL_W, height: DAY_HDR,
      backgroundColor: isWeekend ? '#3A4F66' : '#2C3E50',
      justifyContent: 'center', alignItems: 'center',
      borderRightWidth: 0.5, borderRightColor: '#445',
    }},
      el(Text, { style: { fontSize: 7.5, color: '#FFF', fontFamily: 'Helvetica-Bold', textAlign: 'center' }}, DAYS_LONG[d]),
      el(Text, { style: { fontSize: 6.5, color: '#9DB', fontFamily: 'Helvetica', textAlign: 'center' }}, fmtDate(date))
    ));
  });

  // ── 5. Time column background ──────────────────────────────────────────────
  nodes.push(el(View, { key: K(), style: {
    position: 'absolute',
    left: M, top: GRID_Y, width: TIME_COL, height: GRID_H,
    backgroundColor: '#F8F8F8',
  }}));

  // ── 6. School blocks (Mon–Fri, Apr 6–27) ──────────────────────────────────
  dates.forEach((date, d) => {
    if (d >= 5) return; // weekends
    const ds = isoDate(date);
    const special = SPECIAL_DAYS[ds];
    if (inSchool(ds) && !special) {
      pushBlock(d, '08:00', '16:00', COLORS.school, 'School  (until 4 PM)', '#555', 7);
    }
    if (special?.type === 'studyleave') {
      pushBlock(d, '10:00', '22:00', COLORS.studyleave, 'Study Leave', '#2E7D32', 7.5);
    }
    if (special?.type === 'holiday') {
      pushBlock(d, '08:00', '22:00', COLORS.holiday, 'Holiday', '#8B6900', 7.5);
    }
  });

  // ── 7. Tuition (recurring every week) ─────────────────────────────────────
  TUITION.forEach(t => {
    const isLight = t.subject === 'lunch' || t.subject === 'dinner';
    pushBlock(
      t.day, t.start, t.end,
      COLORS[t.subject] || '#EEE',
      t.label,
      isLight ? '#888' : (t.subject === 'economics' ? '#444' : '#FFF'),
      isLight ? 5.5 : 6.5
    );
  });

  // ── 8. Tests ───────────────────────────────────────────────────────────────
  dates.forEach((date, d) => {
    const ds = isoDate(date);
    const test = TESTS.find(t => t.date === ds);
    if (test) {
      // Small tag at top of the day (1.5 hrs block)
      const absX = GRID_X + d * COL_W;
      const absY = GRID_Y + timeToGridY('08:00');
      const h    = PX_HR * 1.5;
      nodes.push(el(Block, { key: K(), absX, absY, w: COL_W, h, bg: COLORS.test, label: test.label, textColor: '#FFF', fontSize: 6 }));
    }
  });

  // ── 9. Exams ───────────────────────────────────────────────────────────────
  dates.forEach((date, d) => {
    const ds   = isoDate(date);
    const exam = EXAMS.find(e => e.date === ds);
    if (exam) {
      pushBlock(d, exam.start, exam.end, COLORS.exam, exam.label, '#FFF', 6.5);
    }
  });

  // ── 10. Grid border ────────────────────────────────────────────────────────
  nodes.push(el(View, { key: K(), style: {
    position: 'absolute',
    left: GRID_X, top: GRID_Y, width: GRID_W, height: GRID_H,
    borderWidth: 1, borderColor: '#999',
  }}));

  // ── 11. Page header ────────────────────────────────────────────────────────
  nodes.push(el(View, { key: K(), style: {
    position: 'absolute',
    left: M, top: M, width: W - 2 * M, height: HDR_H,
    backgroundColor: '#1A2535', borderRadius: 3,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, justifyContent: 'space-between',
  }},
    el(Text, { style: { fontSize: 9.5, color: '#FFF', fontFamily: 'Helvetica-Bold' }},
      `Alissa's Weekly Study Planner  —  ${weekLabel}`),
    el(Text, { style: { fontSize: 6.5, color: '#8DB', fontFamily: 'Helvetica' }}, 'IGCSE Grade 9  |  2025–26')
  ));

  // ── 12. Legend ─────────────────────────────────────────────────────────────
  const legendItems = [
    { label: 'School',      color: COLORS.school,    tc: '#444' },
    { label: 'Physics',     color: COLORS.physics             },
    { label: 'Chemistry',   color: COLORS.chemistry           },
    { label: 'Biology',     color: COLORS.biology             },
    { label: 'Math',        color: COLORS.math                },
    { label: 'English',     color: COLORS.english             },
    { label: 'French',      color: COLORS.french              },
    { label: 'Economics',   color: COLORS.economics, tc: '#444' },
    { label: 'Debate',      color: COLORS.debate              },
    { label: 'Dinner',      color: COLORS.dinner,  tc: '#888' },
    { label: 'School Test', color: COLORS.test                },
    { label: 'EXAM',        color: COLORS.exam                },
  ];
  const legW = GRID_W / legendItems.length;
  const legY = H - M - LEG_H;
  legendItems.forEach((item, i) => {
    nodes.push(el(View, { key: K(), style: {
      position: 'absolute',
      left: GRID_X + i * legW, top: legY + 2,
      width: legW - 1, height: LEG_H - 2,
      backgroundColor: item.color,
      borderRadius: 1.5,
      justifyContent: 'center', alignItems: 'center',
    }},
      el(Text, { style: { fontSize: 5.5, color: item.tc || '#FFF', fontFamily: 'Helvetica-Bold' }}, item.label)
    ));
  });

  return el(Page, { size: 'A4', orientation: 'landscape', style: { backgroundColor: 'white' } },
    ...nodes
  );
}

// ─── DOCUMENT ─────────────────────────────────────────────────────────────────
function CalendarDoc() {
  return el(Document, { title: "Alissa's Weekly Study Planner" },
    ...WEEKS.map(w => el(WeekPage, { key: w.start, weekStart: w.start, weekLabel: w.label }))
  );
}

// ─── GENERATE ─────────────────────────────────────────────────────────────────
async function generate() {
  console.log('Generating weekly_planner.pdf …');
  const buffer  = await renderToBuffer(el(CalendarDoc));
  const outPath = path.join(__dirname, 'weekly_planner.pdf');
  fs.writeFileSync(outPath, buffer);
  console.log(`✓  Saved: ${outPath}`);
}

generate().catch(err => { console.error(err); process.exit(1); });
