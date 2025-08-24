import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- DB setup ---
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');
const db = new Database(dbPath);

// create table
db.exec(`
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL,             -- YYYY-MM-DD
  hours REAL NOT NULL,
  attendance REAL NOT NULL,
  sleep REAL NOT NULL,
  assign REAL NOT NULL,
  extra TEXT NOT NULL,
  mobile INTEGER NOT NULL,
  workout INTEGER NOT NULL,
  score INTEGER NOT NULL,
  UNIQUE(student_id, date)
);
CREATE INDEX IF NOT EXISTS idx_scores_student_date ON scores(student_id, date);
`);

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// --- Utils ---
function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }
function computeScore({ hours, attendance, sleep, assign, extra, mobile, workout }) {
  let score = 0;
  score += hours * 5;            // effort
  score += attendance * 0.5;     // consistency
  score += sleep * 3;            // recovery
  score += assign * 0.3;         // progress
  if (extra === 'moderate') score += 5;
  if (extra === 'heavy') score += 10;
  if (extra === 'none') score -= 5;
  score -= (mobile || 0) * 0.15; // distractions
  score += Math.min(workout || 0, 120) * 0.05; // wellness
  return Math.round(clamp(score, 0, 100));
}

function daysInMonth(year, month) {
  // month: 1..12
  return new Date(year, month, 0).getDate();
}

// --- API ---
// Ingest or update a daily entry (server computes score)
app.post('/api/entries', (req, res) => {
  try {
    const {
      studentId,
      date, // YYYY-MM-DD
      hours,
      attendance,
      sleep,
      assign,
      extra,
      mobile,
      workout
    } = req.body || {};

    if (!studentId || !date) return res.status(400).json({ error: 'studentId and date are required' });

    const payload = {
      hours: Number(hours),
      attendance: Number(attendance),
      sleep: Number(sleep),
      assign: Number(assign),
      extra: String(extra || 'light'),
      mobile: Number(mobile || 0),
      workout: Number(workout || 0)
    };

    // basic validation
    if ([payload.hours, payload.attendance, payload.sleep, payload.assign].some(v => Number.isNaN(v))) {
      return res.status(400).json({ error: 'Invalid numeric fields' });
    }

    const score = computeScore(payload);

    const stmt = db.prepare(`
      INSERT INTO scores (student_id, date, hours, attendance, sleep, assign, extra, mobile, workout, score)
      VALUES (@studentId, @date, @hours, @attendance, @sleep, @assign, @extra, @mobile, @workout, @score)
      ON CONFLICT(student_id, date) DO UPDATE SET
        hours=excluded.hours,
        attendance=excluded.attendance,
        sleep=excluded.sleep,
        assign=excluded.assign,
        extra=excluded.extra,
        mobile=excluded.mobile,
        workout=excluded.workout,
        score=excluded.score
    `);

    stmt.run({ studentId, date, ...payload, score });

    res.json({ ok: true, score });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Get monthly scores as an array of days 1..N (fill 0 when missing)
app.get('/api/scores', (req, res) => {
  try {
    const studentId = String(req.query.studentId || '');
    const year = Number(req.query.year);
    const month = Number(req.query.month); // 1..12

    if (!studentId || !year || !month) return res.status(400).json({ error: 'studentId, year, month are required' });

    const dim = daysInMonth(year, month);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`;

    const rows = db.prepare(`
      SELECT date, score
      FROM scores
      WHERE student_id = ? AND date BETWEEN ? AND ?
    `).all(studentId, start, end);

    const map = new Map();
    for (const r of rows) {
      const day = Number(r.date.slice(-2));
      map.set(day, r.score);
    }

    const days = Array.from({ length: dim }, (_, i) => ({
      day: i + 1,
      score: map.get(i + 1) ?? 0
    }));

    res.json({ year, month, days, monthLength: dim });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// List months that have any data (optional, by current year unless specified)
app.get('/api/months', (req, res) => {
  try {
    const studentId = String(req.query.studentId || '');
    const year = Number(req.query.year || new Date().getFullYear());
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const rows = db.prepare(`
      SELECT substr(date, 6, 2) AS month, COUNT(*) as cnt
      FROM scores
      WHERE student_id = ? AND date BETWEEN ? AND ?
      GROUP BY month
      ORDER BY month
    `).all(studentId, start, end);

    res.json({ year, months: rows.map(r => Number(r.month)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Fallback to index (SPA-ish)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
