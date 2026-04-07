'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULING RULES — Always apply these when adding any new class or activity
// ═══════════════════════════════════════════════════════════════════════════════
//
//  WEEKDAYS (Mon–Fri)
//  ├─ Day starts:   4:00 PM  (after school)
//  ├─ Day ends:    10:30 PM
//  ├─ Travel:      15 min BEFORE every class + 15 min AFTER every class
//  │              → blocked time = (class start − 0:15) to (class end + 0:15)
//  ├─ Dinner:      ~45 min. Placed in the most natural gap each day.
//  │              Default slots (adjust if tuition changes):
//  │                Mon → 5:45–6:30 PM  (gap between Economics and Physics)
//  │                Tue → 7:00–7:45 PM
//  │                Wed → 6:30–7:15 PM
//  │                Thu → 7:30–8:15 PM
//  │                Fri → 7:00–7:45 PM  (just after returning from Phys/Chem)
//  └─ When a new weekday class is added:
//       1. Block (class start − 15 min) → (class end + 15 min)
//       2. Re-check if dinner slot still fits; shift if needed
//       3. Update TUITION array below + re-run `npm run update-calendar`
//
//  WEEKENDS (Sat–Sun)
//  ├─ Day starts:  10:00 AM
//  ├─ Travel:      15 min BEFORE + 15 min AFTER every class (same rule)
//  ├─ Lunch:       30 min — Saturday: 12:30–1:00 PM, Sunday: after Physics
//  └─ No fixed end time (Debate finishes ~9:30 PM on Sat)
//
// ═══════════════════════════════════════════════════════════════════════════════

// ─── COLORS ────────────────────────────────────────────────────────────────────
const COLORS = {
  school:    '#D5D5D5',
  physics:   '#4A90D9',
  chemistry: '#E8964A',
  biology:   '#5BAD6F',
  math:      '#8E7DC8',
  economics: '#F0C030',
  english:   '#3AADAD',
  french:    '#D96B8C',
  debate:    '#6EB5A0',
  exam:      '#C0392B',
  test:      '#E05C20',
  lunch:     '#EFEFEF',
  dinner:    '#F5E6C8',
  studyleave:'#D6EDD6',
  holiday:   '#FFF0CC',
};

// ─── TUITION + BREAKS (recurring weekly, Apr 6 → May 20) ──────────────────────
// day: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
//
// Times are TOTAL BLOCKED TIME = 15 min travel + class + 15 min travel back.
// Example: class 4:30–5:30 PM → blocked 4:15–5:45 PM
//
const TUITION = [
  // ── Monday ──────────────────────────────────────────────────────────────────
  { day: 0, start: '16:15', end: '17:45', label: 'Economics Tuition', subject: 'economics' },
  { day: 0, start: '17:45', end: '18:30', label: 'Dinner',            subject: 'dinner'    },
  { day: 0, start: '18:30', end: '21:00', label: 'Physics Tuition',   subject: 'physics'   },

  // ── Tuesday ─────────────────────────────────────────────────────────────────
  { day: 1, start: '19:00', end: '19:45', label: 'Dinner',            subject: 'dinner'    },
  { day: 1, start: '20:00', end: '21:00', label: 'Physics Tuition',   subject: 'physics'   },

  // ── Wednesday ───────────────────────────────────────────────────────────────
  { day: 2, start: '15:30', end: '17:30', label: 'English Tuition',   subject: 'english'   },
  { day: 2, start: '18:30', end: '19:15', label: 'Dinner',            subject: 'dinner'    },
  { day: 2, start: '20:00', end: '21:00', label: 'Math Tuition',      subject: 'math'      },

  // ── Thursday (no tuition) ───────────────────────────────────────────────────
  { day: 3, start: '19:30', end: '20:15', label: 'Dinner',            subject: 'dinner'    },

  // ── Friday ──────────────────────────────────────────────────────────────────
  { day: 4, start: '16:15', end: '19:00', label: 'Phys/Chem Tuition', subject: 'chemistry' },
  { day: 4, start: '19:00', end: '19:45', label: 'Dinner',            subject: 'dinner'    },

  // ── Saturday ────────────────────────────────────────────────────────────────
  { day: 5, start: '10:00', end: '11:30', label: 'Math Tuition',      subject: 'math'      },
  { day: 5, start: '12:30', end: '13:00', label: 'Lunch',             subject: 'lunch'     },
  { day: 5, start: '13:15', end: '14:45', label: 'English Tuition',   subject: 'english'   },
  { day: 5, start: '17:00', end: '19:00', label: 'French Tuition',    subject: 'french'    },
  { day: 5, start: '20:00', end: '21:30', label: 'Debate',            subject: 'debate'    },

  // ── Sunday ──────────────────────────────────────────────────────────────────
  { day: 6, start: '11:00', end: '13:30', label: 'Physics Tuition',   subject: 'physics'   },
  { day: 6, start: '13:30', end: '14:00', label: 'Lunch',             subject: 'lunch'     },
];

// ─── SCHOOL TESTS (before final exams) ────────────────────────────────────────
const TESTS = [
  { date: '2026-04-10', label: 'TEST\nInt Math\nMensuration'                       },
  { date: '2026-04-13', label: 'TEST\nChemistry\nSeparation + Redox'               },
  { date: '2026-04-15', label: 'TEST\nEco Ch20-21\n+ French R/W'                  },
  { date: '2026-04-16', label: 'TEST\nAdd Math'                                    },
  { date: '2026-04-17', label: 'TEST\nBiology'                                     },
  { date: '2026-04-21', label: 'TEST\nPhysics\nPracticals'                         },
  { date: '2026-04-23', label: 'TEST\nPhysics\nLight'                              },
  { date: '2026-04-24', label: 'TEST\nChemistry\nPeriodic table + Stoichiometry'   },
];

// ─── FINAL EXAMS ──────────────────────────────────────────────────────────────
const EXAMS = [
  { date: '2026-04-29', start: '08:45', end: '12:30', label: 'French\nSpeaking'                        },
  { date: '2026-04-30', start: '08:45', end: '12:30', label: 'French\nSpeaking'                        },
  { date: '2026-05-06', start: '08:45', end: '14:30', label: 'Eng Lang P1\nEng Lit Drama\nAdd Math P1'  },
  { date: '2026-05-07', start: '08:45', end: '10:15', label: 'Int Math P2\n(No Calc)'                  },
  { date: '2026-05-08', start: '08:45', end: '12:20', label: 'Economics\nP1 + P2'                      },
  { date: '2026-05-11', start: '08:45', end: '14:30', label: 'Eng Lit P1\nMarathi\nAdd Math P2'        },
  { date: '2026-05-12', start: '08:45', end: '12:20', label: 'Eng Lang P2\nFrench Listen'              },
  { date: '2026-05-13', start: '08:45', end: '12:15', label: 'Physics\nP4 + P6'                        },
  { date: '2026-05-14', start: '08:40', end: '12:20', label: 'Chemistry\nP4 + P2 + P6'                 },
  { date: '2026-05-15', start: '08:45', end: '12:25', label: 'French P2+P4\nPhysics MCQ'               },
  { date: '2026-05-18', start: '08:45', end: '12:25', label: 'Int Math\nP6 + P4'                       },
  { date: '2026-05-20', start: '08:40', end: '12:20', label: 'Biology\nP4 + P2 + P6'                   },
];

// ─── SPECIAL DAYS ─────────────────────────────────────────────────────────────
const SPECIAL_DAYS = {
  '2026-04-28': { type: 'studyleave', label: 'Study Leave' },
  '2026-05-01': { type: 'holiday',   label: 'Holiday'     },
};

// ─── SCHOOL PERIOD ────────────────────────────────────────────────────────────
const SCHOOL_START = '2026-04-06';
const SCHOOL_END   = '2026-04-27';

// ─── WEEKS TO GENERATE ────────────────────────────────────────────────────────
const WEEKS = [
  { start: '2026-04-06', label: 'Apr 6–12  ·  Focus: Int Math Mensuration + Begin Chemistry' },
  { start: '2026-04-13', label: 'Apr 13–19  ·  Tests: Chemistry → Eco/French → Add Math → Biology' },
  { start: '2026-04-20', label: 'Apr 20–26  ·  Tests: Physics Practicals + Light + Chemistry' },
  { start: '2026-04-27', label: 'Apr 27–May 3  ·  Study Leave & Exams Begin (French Speaking)' },
  { start: '2026-05-04', label: 'May 4–10  ·  Exams: Eng Lang/Lit, Add Math, Int Math, Economics' },
  { start: '2026-05-11', label: 'May 11–17  ·  Exams: Eng Lit, Marathi, Add Math P2, Physics, Chemistry, French' },
  { start: '2026-05-18', label: 'May 18–20  ·  Final Exams: Int Math + Biology' },
];

module.exports = { COLORS, TUITION, TESTS, EXAMS, SPECIAL_DAYS, SCHOOL_START, SCHOOL_END, WEEKS };
