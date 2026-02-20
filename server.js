"use strict";
/**
 * Clinic Booking API Server - Final
 * Express + better-sqlite3 backend
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'clinic-booking-secret-change-in-production';
const TOKEN_EXPIRY = '7d';
const DEFAULT_BUSINESS_HOURS = { start: 9, end: 17, slotDurationMinutes: 30 };
/* ═══════════ SQLite setup ═══════════ */
const db = new better_sqlite3_1.default(path_1.default.join(__dirname, 'clinic.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    email        TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role         TEXT NOT NULL CHECK(role IN ('client','doctor')),
    name         TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id           TEXT PRIMARY KEY,
    date         TEXT NOT NULL,
    time         TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    email        TEXT NOT NULL,
    phone        TEXT NOT NULL,
    doctor       TEXT DEFAULT 'Dr. Sarah Johnson',
    type         TEXT DEFAULT 'General Consultation',
    reason       TEXT DEFAULT '',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    user_id      TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS blocked_slots (
    id         TEXT PRIMARY KEY,
    date       TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time   TEXT NOT NULL,
    reason     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id        TEXT PRIMARY KEY,
    action    TEXT NOT NULL CHECK(action IN ('BOOK','CANCEL','BLOCK','UNBLOCK')),
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    details   TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);
const configDefaults = {
    businessHours: JSON.stringify(DEFAULT_BUSINESS_HOURS),
    notificationsEnabled: 'true',
};
const upsertConfig = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(configDefaults))
    upsertConfig.run(k, v);
/* ═══════════ Prepared statements ═══════════ */
const stmts = {
    getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE'),
    getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
    insertUser: db.prepare('INSERT INTO users (id, email, password_hash, role, name, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
    getAppointmentsByDate: db.prepare('SELECT * FROM appointments WHERE date = ? ORDER BY time'),
    getAppointmentById: db.prepare('SELECT * FROM appointments WHERE id = ?'),
    getAppointmentsByUser: db.prepare('SELECT * FROM appointments WHERE user_id = ? ORDER BY date DESC, time DESC'),
    getAppointmentsBeforeDate: db.prepare('SELECT * FROM appointments WHERE date < ? ORDER BY date DESC, time DESC LIMIT 50'),
    insertAppointment: db.prepare('INSERT INTO appointments (id, date, time, patient_name, email, phone, doctor, type, reason, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    deleteAppointment: db.prepare('DELETE FROM appointments WHERE id = ?'),
    getBlockedByDate: db.prepare('SELECT * FROM blocked_slots WHERE date = ?'),
    getAllBlocked: db.prepare('SELECT * FROM blocked_slots ORDER BY date DESC'),
    insertBlocked: db.prepare('INSERT INTO blocked_slots (id, date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)'),
    deleteBlocked: db.prepare('DELETE FROM blocked_slots WHERE id = ?'),
    getBlockedById: db.prepare('SELECT * FROM blocked_slots WHERE id = ?'),
    insertLog: db.prepare('INSERT INTO activity_logs (id, action, timestamp, details) VALUES (?, ?, ?, ?)'),
    getRecentLogs: db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100'),
    getConfig: db.prepare('SELECT * FROM config'),
    upsertConfigVal: db.prepare('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
};
function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = crypto_1.default.randomBytes(16).toString('hex');
        crypto_1.default.scrypt(password, salt, 64, (err, derived) => {
            if (err)
                reject(err);
            else
                resolve(salt + ':' + derived.toString('hex'));
        });
    });
}
function verifyPassword(password, stored) {
    return new Promise((resolve, reject) => {
        const [salt, key] = stored.split(':');
        if (!salt || !key)
            return resolve(false);
        crypto_1.default.scrypt(password, salt, 64, (err, derived) => {
            if (err)
                reject(err);
            else
                resolve(derived.toString('hex') === key);
        });
    });
}
function parseExpiry(exp) {
    const m = exp.match(/^(\d+)([dhms])$/);
    if (!m)
        return 7 * 86400000;
    const n = parseInt(m[1], 10);
    const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
    return n * (multipliers[m[2]] || 86400000);
}
function signToken(payload) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor((Date.now() + parseExpiry(TOKEN_EXPIRY)) / 1000) };
    const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const sig = crypto_1.default.createHmac('sha256', JWT_SECRET).update(b64(header) + '.' + b64(body)).digest('base64url');
    return b64(header) + '.' + b64(body) + '.' + sig;
}
function verifyToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const [hB64, bB64, sB64] = parts;
        const expected = crypto_1.default.createHmac('sha256', JWT_SECRET).update(hB64 + '.' + bB64).digest('base64url');
        if (expected !== sB64)
            return null;
        const body = JSON.parse(Buffer.from(bB64, 'base64url').toString());
        if (body.exp && body.exp < Math.floor(Date.now() / 1000))
            return null;
        return { userId: body.userId, role: body.role };
    }
    catch {
        return null;
    }
}
function requireAuth(role) {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token)
            return res.status(401).json({ error: 'Authentication required.' });
        const payload = verifyToken(token);
        if (!payload)
            return res.status(401).json({ error: 'Invalid or expired token.' });
        if (role && payload.role !== role)
            return res.status(403).json({ error: 'Insufficient permissions.' });
        req.auth = payload;
        next();
    };
}
/* ═══════════ Utility ═══════════ */
function isValidDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
        return false;
    const d = new Date(s);
    return !isNaN(d.getTime()) && d.toISOString().startsWith(s);
}
function parseTime(t) {
    const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!m)
        return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const p = (m[3] || '').toUpperCase();
    if (p === 'PM' && h < 12)
        h += 12;
    if (p === 'AM' && h === 12)
        h = 0;
    return h * 60 + min;
}
function loadConfig() {
    const rows = stmts.getConfig.all();
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return {
        businessHours: map.businessHours ? JSON.parse(map.businessHours) : DEFAULT_BUSINESS_HOURS,
        notificationsEnabled: map.notificationsEnabled !== 'false',
    };
}
function generateSlotsForDate(dateStr, config) {
    const { start, end, slotDurationMinutes } = config.businessHours;
    const slots = [];
    for (let h = start; h < end; h++) {
        for (let m = 0; m < 60; m += slotDurationMinutes) {
            const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
            const period = h >= 12 ? 'PM' : 'AM';
            slots.push(`${dh}:${m.toString().padStart(2, '0')} ${period}`);
        }
    }
    return slots;
}
function getSlotStatus(dateStr, timeStr, appointments, blocked) {
    const slot = parseTime(timeStr);
    if (slot === null)
        return 'blocked';
    for (const b of blocked) {
        const s = parseTime(b.start_time);
        const e = parseTime(b.end_time);
        if (s !== null && e !== null && slot >= s && slot < e)
            return 'blocked';
    }
    return appointments.some(a => a.date === dateStr && parseTime(a.time) === slot) ? 'booked' : 'available';
}
function genId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function generateBookingId() {
    return `BK-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
}
function toAppointmentResponse(r) {
    return { id: r.id, date: r.date, time: r.time, patientName: r.patient_name, email: r.email, phone: r.phone, doctor: r.doctor, type: r.type, reason: r.reason, createdAt: r.created_at, userId: r.user_id };
}
/* ═══════════ Middleware ═══════════ */
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(__dirname));
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`));
    next();
});
/* ═══════════ Auth routes ═══════════ */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        if (!email || !password || !name || !role)
            return res.status(400).json({ error: 'Missing fields: email, password, name, role.' });
        if (role !== 'client' && role !== 'doctor')
            return res.status(400).json({ error: 'Role must be client or doctor.' });
        const existing = stmts.getUserByEmail.get(String(email).trim());
        if (existing)
            return res.status(409).json({ error: 'An account with this email already exists.' });
        const pwHash = await hashPassword(String(password));
        const user = { id: genId('user'), email: String(email).trim().toLowerCase(), name: String(name).trim(), role: role, createdAt: new Date().toISOString() };
        stmts.insertUser.run(user.id, user.email, pwHash, user.role, user.name, user.createdAt);
        const token = signToken({ userId: user.id, role: user.role });
        res.status(201).json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    }
    catch (err) {
        res.status(500).json({ error: 'Registration failed.' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Missing email or password.' });
        const row = stmts.getUserByEmail.get(String(email).trim());
        if (!row)
            return res.status(401).json({ error: 'Invalid email or password.' });
        if (role && row.role !== role)
            return res.status(403).json({ error: `This account is not a ${role}. Use the correct login.` });
        const ok = await verifyPassword(String(password), row.password_hash);
        if (!ok)
            return res.status(401).json({ error: 'Invalid email or password.' });
        const token = signToken({ userId: row.id, role: row.role });
        res.json({ success: true, token, user: { id: row.id, email: row.email, name: row.name, role: row.role } });
    }
    catch (err) {
        res.status(500).json({ error: 'Login failed.' });
    }
});
/* ═══════════ Config ═══════════ */
app.get('/api/config', (_req, res) => {
    try {
        res.json(loadConfig());
    }
    catch {
        res.status(500).json({ error: 'Failed to load configuration' });
    }
});
app.patch('/api/config', requireAuth('doctor'), (req, res) => {
    try {
        const { businessHours, notificationsEnabled } = req.body;
        const current = loadConfig();
        if (businessHours) {
            const merged = { ...current.businessHours, ...businessHours };
            stmts.upsertConfigVal.run('businessHours', JSON.stringify(merged));
        }
        if (typeof notificationsEnabled === 'boolean') {
            stmts.upsertConfigVal.run('notificationsEnabled', String(notificationsEnabled));
        }
        res.json(loadConfig());
    }
    catch {
        res.status(500).json({ error: 'Failed to update config' });
    }
});
/* ═══════════ Slots ═══════════ */
app.get('/api/slots/:date', (req, res) => {
    try {
        const { date } = req.params;
        if (!isValidDate(date))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        const config = loadConfig();
        const slots = generateSlotsForDate(date, config);
        const appointments = stmts.getAppointmentsByDate.all(date);
        const blocked = stmts.getBlockedByDate.all(date);
        const slotsWithStatus = slots.map(time => ({ time, status: getSlotStatus(date, time, appointments, blocked) }));
        res.json({ date, slots: slotsWithStatus });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch slots' });
    }
});
/* ═══════════ Appointments ═══════════ */
app.post('/api/book', requireAuth('client'), (req, res) => {
    try {
        const auth = req.auth;
        const { date, time, patientName, email, phone, doctor, type, reason } = req.body;
        if (!date || !time || !patientName || !email || !phone)
            return res.status(400).json({ error: 'Missing required fields: date, time, patientName, email, phone' });
        if (!isValidDate(date))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        if (parseTime(time) === null)
            return res.status(400).json({ error: 'Invalid time format. Use format like 10:00 AM.' });
        const appointments = stmts.getAppointmentsByDate.all(date);
        const blocked = stmts.getBlockedByDate.all(date);
        const status = getSlotStatus(date, time, appointments, blocked);
        if (status === 'booked')
            return res.status(409).json({ error: 'This slot is already booked. Please select another.' });
        if (status === 'blocked')
            return res.status(409).json({ error: 'This slot is blocked and not available for booking.' });
        const id = generateBookingId();
        const now = new Date().toISOString();
        stmts.insertAppointment.run(id, date, time, String(patientName).trim(), String(email).trim(), String(phone).trim(), doctor || 'Dr. Sarah Johnson', type || 'General Consultation', reason || '', now, auth.userId);
        stmts.insertLog.run(genId('log'), 'BOOK', now, JSON.stringify({ appointmentId: id, date, time }));
        const row = stmts.getAppointmentById.get(id);
        res.status(201).json({ success: true, message: 'Appointment booked successfully.', appointmentId: id, appointment: toAppointmentResponse(row) });
    }
    catch {
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});
app.get('/api/appointments/me', requireAuth('client'), (req, res) => {
    try {
        const auth = req.auth;
        const rows = stmts.getAppointmentsByUser.all(auth.userId);
        res.json({ appointments: rows.map(toAppointmentResponse) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch appointments.' });
    }
});
app.post('/api/cancel', requireAuth('client'), (req, res) => {
    try {
        const auth = req.auth;
        const { appointmentId } = req.body;
        if (!appointmentId)
            return res.status(400).json({ error: 'Appointment ID is required.' });
        const row = stmts.getAppointmentById.get(appointmentId);
        if (!row)
            return res.status(404).json({ error: 'Appointment not found. Please check your booking ID.' });
        if (row.user_id && row.user_id !== auth.userId)
            return res.status(403).json({ error: 'You can only cancel your own appointments.' });
        stmts.deleteAppointment.run(appointmentId);
        stmts.insertLog.run(genId('log'), 'CANCEL', new Date().toISOString(), JSON.stringify({ appointmentId, date: row.date, time: row.time }));
        res.json({ success: true, message: 'Appointment cancelled successfully.' });
    }
    catch {
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
});
app.get('/api/appointments/:date', requireAuth('doctor'), (req, res) => {
    try {
        const { date } = req.params;
        if (!isValidDate(date))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        const rows = stmts.getAppointmentsByDate.all(date);
        res.json({ date, appointments: rows.map(toAppointmentResponse) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});
app.get('/api/appointments/history/:beforeDate', requireAuth('doctor'), (req, res) => {
    try {
        const { beforeDate } = req.params;
        if (!isValidDate(beforeDate))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        const rows = stmts.getAppointmentsBeforeDate.all(beforeDate);
        res.json({ appointments: rows.map(toAppointmentResponse) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});
/* ═══════════ Blocked slots ═══════════ */
app.get('/api/blocked/:date', requireAuth('doctor'), (req, res) => {
    try {
        const { date } = req.params;
        if (!isValidDate(date))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        const rows = stmts.getBlockedByDate.all(date);
        res.json({ date, blocked: rows.map(r => ({ id: r.id, date: r.date, startTime: r.start_time, endTime: r.end_time, reason: r.reason })) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch blocked slots' });
    }
});
app.get('/api/blocked', requireAuth('doctor'), (_req, res) => {
    try {
        const rows = stmts.getAllBlocked.all();
        res.json(rows.map(r => ({ id: r.id, date: r.date, startTime: r.start_time, endTime: r.end_time, reason: r.reason })));
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch blocked slots' });
    }
});
app.post('/api/block', requireAuth('doctor'), (req, res) => {
    try {
        const { date, startTime, endTime, reason } = req.body;
        if (!date || !startTime || !endTime || !reason)
            return res.status(400).json({ error: 'Missing required fields: date, startTime, endTime, reason' });
        if (!isValidDate(date))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        const id = genId('block');
        const now = new Date().toISOString();
        stmts.insertBlocked.run(id, date, startTime, endTime, reason);
        stmts.insertLog.run(genId('log'), 'BLOCK', now, JSON.stringify({ date, startTime, endTime }));
        res.status(201).json({ success: true, message: 'Time slot blocked successfully.', blockedSlot: { id, date, startTime, endTime, reason } });
    }
    catch {
        res.status(500).json({ error: 'Failed to block slot' });
    }
});
app.post('/api/unblock', requireAuth('doctor'), (req, res) => {
    try {
        const { slotId } = req.body;
        if (!slotId)
            return res.status(400).json({ error: 'Slot ID is required.' });
        const row = stmts.getBlockedById.get(slotId);
        if (!row)
            return res.status(404).json({ error: 'Blocked slot not found.' });
        stmts.deleteBlocked.run(slotId);
        stmts.insertLog.run(genId('log'), 'UNBLOCK', new Date().toISOString(), JSON.stringify({ slotId, date: row.date }));
        res.json({ success: true, message: 'Time slot unblocked successfully.' });
    }
    catch {
        res.status(500).json({ error: 'Failed to unblock slot' });
    }
});
/* ═══════════ Logs ═══════════ */
app.get('/api/logs', requireAuth('doctor'), (_req, res) => {
    try {
        const rows = stmts.getRecentLogs.all();
        res.json(rows.map(r => ({ ...r, details: JSON.parse(r.details) })));
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});
/* ═══════════ Static fallback ═══════════ */
app.get('/', (_req, res) => res.sendFile(path_1.default.join(__dirname, 'index.html')));
/* ═══════════ Start ═══════════ */
app.listen(PORT, () => {
    console.log(`Clinic Booking API running at http://localhost:${PORT}`);
    console.log(`Database: ${path_1.default.join(__dirname, 'clinic.db')}`);
});
