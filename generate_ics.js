'use strict';

const fs   = require('fs');
const path = require('path');
const { TUITION, TESTS, EXAMS, SPECIAL_DAYS } = require('./schedule_data');

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// First Monday of the study schedule = Apr 6, 2026
const WEEK_STARTS = [
  '2026-04-06', // Mon Week 1
];

// The first occurrence of each tuition day relative to Apr 6
const FIRST_DAY_DATES = {
  0: '2026-04-06',  // Monday
  1: '2026-04-07',  // Tuesday
  2: '2026-04-08',  // Wednesday
  3: '2026-04-09',  // Thursday
  4: '2026-04-10',  // Friday
  5: '2026-04-11',  // Saturday
  6: '2026-04-12',  // Sunday
};

const RRULE_UNTIL = '20260520T235959';

function toICSDate(dateStr, timeStr) {
  // e.g. '2026-04-06', '16:30' → '20260406T163000'
  const d = dateStr.replace(/-/g, '');
  const t = timeStr.replace(':', '') + '00';
  return `${d}T${t}`;
}

// Add hours/minutes to a time string, returns new time string 'HH:MM'
function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total  = h * 60 + m + minutes;
  const nh     = Math.floor(total / 60);
  const nm     = total % 60;
  return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
}

function uid(prefix, date) {
  return `${prefix}-${date.replace(/-/g, '')}-alissa-study@igcse`;
}

function dtstamp() {
  return new Date().toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
}

function foldLine(line) {
  // ICS lines max 75 chars; fold longer lines
  const max = 75;
  if (line.length <= max) return line;
  let result = '';
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      result += line.substring(i, max);
      i = max;
    } else {
      result += '\r\n ' + line.substring(i, i + max - 1);
      i += max - 1;
    }
  }
  return result;
}

// ─── BUILD EVENTS ─────────────────────────────────────────────────────────────

const lines = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Alissa Study//IGCSE Planner 2026//EN',
  'X-WR-CALNAME:Alissa Study Planner',
  'X-WR-TIMEZONE:Asia/Kolkata',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
];

const stamp = dtstamp();

// ── Recurring Tuition ──────────────────────────────────────────────────────────
TUITION.forEach((t, i) => {
  if (t.subject === 'lunch') return;  // Skip lunch from calendar (it's visual only)
  const firstDate = FIRST_DAY_DATES[t.day];
  const dtStart   = toICSDate(firstDate, t.start);
  const dtEnd     = toICSDate(firstDate, t.end);
  lines.push(
    'BEGIN:VEVENT',
    foldLine(`UID:tuition-${i}-${firstDate.replace(/-/g,'')}@alissa-study`),
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldLine(`SUMMARY:${t.label}`),
    'DESCRIPTION:After-school tuition (includes 30 min travel each way)',
    `RRULE:FREQ=WEEKLY;UNTIL=${RRULE_UNTIL}`,
    'CATEGORIES:TUITION',
    'END:VEVENT',
  );
});

// ── School Tests ───────────────────────────────────────────────────────────────
TESTS.forEach(test => {
  const label = test.label.replace(/\n/g, ' ');
  lines.push(
    'BEGIN:VEVENT',
    foldLine(`UID:test-${uid('test', test.date)}`),
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${test.date.replace(/-/g,'')}`,  // All-day
    `DTEND;VALUE=DATE:${test.date.replace(/-/g,'')}`,
    foldLine(`SUMMARY:📝 ${label}`),
    'DESCRIPTION:School test - check study_timetable.md for revision plan',
    'CATEGORIES:TEST',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',       // 1 day before reminder
    'ACTION:DISPLAY',
    foldLine(`DESCRIPTION:Tomorrow: ${label}`),
    'END:VALARM',
    'END:VEVENT',
  );
});

// ── Final Exams ────────────────────────────────────────────────────────────────
EXAMS.forEach(exam => {
  const label   = exam.label.replace(/\n/g, ' / ');
  const dtStart = toICSDate(exam.date, exam.start);
  const dtEnd   = toICSDate(exam.date, exam.end);
  lines.push(
    'BEGIN:VEVENT',
    foldLine(`UID:exam-${uid('exam', exam.date)}`),
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldLine(`SUMMARY:🎓 EXAM: ${label}`),
    'DESCRIPTION:Final school exam — IGCSE Grade 9',
    'CATEGORIES:EXAM',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    foldLine(`DESCRIPTION:Exam tomorrow: ${label}`),
    'END:VALARM',
    'END:VEVENT',
  );
});

// ── Special Days ───────────────────────────────────────────────────────────────
Object.entries(SPECIAL_DAYS).forEach(([date, info]) => {
  const emoji = info.type === 'holiday' ? '🎉' : '📚';
  lines.push(
    'BEGIN:VEVENT',
    foldLine(`UID:special-${uid('special', date)}`),
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${date.replace(/-/g,'')}`,
    `DTEND;VALUE=DATE:${date.replace(/-/g,'')}`,
    foldLine(`SUMMARY:${emoji} ${info.label}`),
    'CATEGORIES:SPECIAL',
    'END:VEVENT',
  );
});

lines.push('END:VCALENDAR');

// ─── WRITE FILE ───────────────────────────────────────────────────────────────
const output  = lines.join('\r\n') + '\r\n';
const outPath = path.join(__dirname, 'study_planner.ics');
fs.writeFileSync(outPath, output, 'utf8');
console.log(`✓  Saved: ${outPath}`);
console.log('   → Double-click the .ics file to import into Apple Calendar');
console.log('   → Or drag it into the Calendar app');
