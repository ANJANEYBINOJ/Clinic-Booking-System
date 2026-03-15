"use strict";
/**
 * Clinic Booking API Server - Complete Implementation with Admin Dashboard
 * Features: Auth with rate limiting, admin panel, doctor/patient dashboards, notifications, timezone support
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
// ── Hardcoded single admin account ──────────────────────────────────────────
const HARDCODED_ADMIN_EMAIL = 'admin@clinic.com';
const HARDCODED_ADMIN_PASSWORD = 'Admin@1234';
const HARDCODED_ADMIN_NAME = 'Administrator';
const TOKEN_EXPIRY = '7d';
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5; // login attempts
const DEFAULT_BUSINESS_HOURS = { start: 9, end: 17, slotDurationMinutes: 30 };
const TIMEZONE_DEFAULT = 'UTC';
/* ═══════════ SQLite setup ═══════════ */
const db = new better_sqlite3_1.default(path_1.default.join(__dirname, 'clinic.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id               TEXT PRIMARY KEY,
    email            TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash    TEXT NOT NULL,
    role             TEXT NOT NULL CHECK(role IN ('client','doctor','admin')),
    name             TEXT NOT NULL,
    phone            TEXT,
    is_verified      INTEGER DEFAULT 0,
    verification_token TEXT,
    reset_token      TEXT,
    reset_expires_at TEXT,
    last_login       TEXT,
    login_attempts   INTEGER DEFAULT 0,
    locked_until     TEXT,
    timezone         TEXT DEFAULT 'UTC',
    preferences      TEXT DEFAULT '{}',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    token            TEXT NOT NULL UNIQUE,
    ip_address       TEXT,
    user_agent       TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at       TEXT NOT NULL,
    last_activity    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id               TEXT PRIMARY KEY,
    date             TEXT NOT NULL,
    time             TEXT NOT NULL,
    patient_name     TEXT NOT NULL,
    email            TEXT NOT NULL,
    phone            TEXT NOT NULL,
    doctor_id        TEXT,
    doctor           TEXT DEFAULT 'Dr. Sarah Johnson',
    type             TEXT DEFAULT 'General Consultation',
    reason           TEXT DEFAULT '',
    status           TEXT DEFAULT 'confirmed',
    notes            TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
    user_id          TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS blocked_slots (
    id               TEXT PRIMARY KEY,
    doctor_id        TEXT NOT NULL,
    date             TEXT NOT NULL,
    start_time       TEXT NOT NULL,
    end_time         TEXT NOT NULL,
    reason           TEXT NOT NULL,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id               TEXT PRIMARY KEY,
    user_id          TEXT,
    action           TEXT NOT NULL CHECK(action IN ('LOGIN','LOGOUT','BOOK','CANCEL','BLOCK','UNBLOCK','RESET_PASSWORD','UPDATE_SCHEDULE')),
    timestamp        TEXT NOT NULL DEFAULT (datetime('now')),
    details          TEXT NOT NULL DEFAULT '{}',
    ip_address       TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    appointment_id   TEXT,
    type             TEXT NOT NULL,
    subject          TEXT,
    message          TEXT NOT NULL,
    status           TEXT DEFAULT 'pending',
    sent_at          TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS config (
    key              TEXT PRIMARY KEY,
    value            TEXT NOT NULL,
    updated_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS doctor_schedules (
    id               TEXT PRIMARY KEY,
    doctor_id        TEXT NOT NULL,
    day_of_week      INTEGER NOT NULL,
    start_time       TEXT NOT NULL,
    end_time         TEXT NOT NULL,
    slot_duration    INTEGER DEFAULT 30,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
  CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
  CREATE INDEX IF NOT EXISTS idx_blocked_slots_doctor ON blocked_slots(doctor_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`);
/* ═══════════ Seed hardcoded admin ═══════════ */
async function seedAdmin() {
    const pwHash = await hashPassword(HARDCODED_ADMIN_PASSWORD);
    const now = new Date().toISOString();
    const existing = stmts.getUserByEmail.get(HARDCODED_ADMIN_EMAIL);
    if (!existing) {
        const adminId = genId('user');
        stmts.insertUser.run(adminId, HARDCODED_ADMIN_EMAIL, pwHash, 'admin', HARDCODED_ADMIN_NAME, TIMEZONE_DEFAULT, now, now);
        console.log('[Init] Hardcoded admin account created:', HARDCODED_ADMIN_EMAIL);
    } else {
        db.prepare("UPDATE users SET password_hash = ?, name = ?, role = 'admin', updated_at = ? WHERE email = ? COLLATE NOCASE").run(pwHash, HARDCODED_ADMIN_NAME, now, HARDCODED_ADMIN_EMAIL);
        console.log('[Init] Hardcoded admin credentials refreshed:', HARDCODED_ADMIN_EMAIL);
    }
}
const configDefaults = {
    businessHours: JSON.stringify(DEFAULT_BUSINESS_HOURS),
    notificationsEnabled: 'true',
    timezoneDefault: TIMEZONE_DEFAULT,
    emailProvider: 'console',
    minBookingNoticeHours: '2',
    maxBookingAdvanceDays: '90',
};
const upsertConfig = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
for (const [k, v] of Object.entries(configDefaults))
    upsertConfig.run(k, v);
/* ═══════════ Prepared statements ═══════════ */
const stmts = {
    // Users
    getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE'),
    getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
    getUsersByRole: db.prepare('SELECT * FROM users WHERE role = ? ORDER BY created_at DESC'),
    getAllUsers: db.prepare('SELECT * FROM users ORDER BY created_at DESC'),
    insertUser: db.prepare('INSERT INTO users (id, email, password_hash, role, name, timezone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    updateUser: db.prepare('UPDATE users SET email = ?, name = ?, phone = ?, timezone = ?, updated_at = ? WHERE id = ?'),
    updateUserPassword: db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL, updated_at = ? WHERE id = ?'),
    updateLoginAttempts: db.prepare('UPDATE users SET login_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?'),
    recordLastLogin: db.prepare('UPDATE users SET last_login = ?, login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?'),
    setResetToken: db.prepare('UPDATE users SET reset_token = ?, reset_expires_at = ?, updated_at = ? WHERE id = ?'),
    deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
    // Sessions
    insertSession: db.prepare('INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)'),
    getSessionByToken: db.prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
    deleteUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
    updateSessionActivity: db.prepare('UPDATE sessions SET last_activity = ? WHERE token = ?'),
    // Appointments
    getAppointmentsByDate: db.prepare('SELECT * FROM appointments WHERE date = ? ORDER BY time'),
    getAppointmentsByDateAndDoctor: db.prepare('SELECT * FROM appointments WHERE date = ? AND doctor_id = ? ORDER BY time'),
    getAppointmentById: db.prepare('SELECT * FROM appointments WHERE id = ?'),
    getAppointmentsByUser: db.prepare('SELECT * FROM appointments WHERE user_id = ? ORDER BY date DESC, time DESC'),
    getAppointmentsByDoctor: db.prepare('SELECT * FROM appointments WHERE doctor_id = ? ORDER BY date DESC, time DESC LIMIT 100'),
    getAllAppointments: db.prepare('SELECT * FROM appointments ORDER BY date DESC, time DESC LIMIT 200'),
    getAppointmentsByDoctorBeforeDate: db.prepare('SELECT * FROM appointments WHERE doctor_id = ? AND date < ? ORDER BY date DESC, time DESC LIMIT 100'),
    getUpcomingByDoctor: db.prepare("SELECT * FROM appointments WHERE doctor_id = ? AND date >= date('now') ORDER BY date ASC, time ASC LIMIT 20"),
    getUpcomingByUser: db.prepare("SELECT * FROM appointments WHERE user_id = ? AND date >= date('now') ORDER BY date ASC, time ASC LIMIT 20"),
    getPastByUser: db.prepare("SELECT * FROM appointments WHERE user_id = ? AND date < date('now') ORDER BY date DESC, time DESC LIMIT 20"),
    insertAppointment: db.prepare('INSERT INTO appointments (id, date, time, patient_name, email, phone, doctor_id, doctor, type, reason, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    updateAppointmentNotes: db.prepare('UPDATE appointments SET notes = ?, updated_at = ? WHERE id = ?'),
    updateAppointmentStatus: db.prepare('UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?'),
    cancelAppointment: db.prepare("UPDATE appointments SET status = 'cancelled', updated_at = ? WHERE id = ?"),
    deleteAppointment: db.prepare('DELETE FROM appointments WHERE id = ?'),
    // Blocked slots
    getBlockedByDate: db.prepare('SELECT * FROM blocked_slots WHERE date = ? AND doctor_id = ?'),
    getBlockedByDateGeneral: db.prepare('SELECT * FROM blocked_slots WHERE date = ?'),
    getAllBlockedByDoctor: db.prepare('SELECT * FROM blocked_slots WHERE doctor_id = ? ORDER BY date DESC, start_time ASC'),
    insertBlocked: db.prepare('INSERT INTO blocked_slots (id, doctor_id, date, start_time, end_time, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    deleteBlocked: db.prepare('DELETE FROM blocked_slots WHERE id = ?'),
    getBlockedById: db.prepare('SELECT * FROM blocked_slots WHERE id = ?'),
    // Doctor schedules
    getDoctorSchedule: db.prepare('SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY day_of_week'),
    getScheduleByDoctorAndDay: db.prepare('SELECT * FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ?'),
    insertDoctorSchedule: db.prepare('INSERT INTO doctor_schedules (id, doctor_id, day_of_week, start_time, end_time, slot_duration, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    updateDoctorSchedule: db.prepare('UPDATE doctor_schedules SET start_time = ?, end_time = ?, slot_duration = ?, created_at = ? WHERE doctor_id = ? AND day_of_week = ?'),
    deleteDoctorSchedule: db.prepare('DELETE FROM doctor_schedules WHERE id = ?'),
    deleteDoctorScheduleByDay: db.prepare('DELETE FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ?'),
    // Activity logs
    insertLog: db.prepare('INSERT INTO activity_logs (id, user_id, action, timestamp, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)'),
    getRecentLogs: db.prepare('SELECT al.*, u.name as user_name, u.role as user_role FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.timestamp DESC LIMIT 200'),
    getUserLogs: db.prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100'),
    // Notifications
    insertNotification: db.prepare('INSERT INTO notifications (id, user_id, appointment_id, type, subject, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    getNotifications: db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'),
    markNotificationRead: db.prepare("UPDATE notifications SET status = 'read', sent_at = ? WHERE id = ?"),
    // Config
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
        return { userId: body.userId, role: body.role, sessionId: body.sessionId };
    }
    catch {
        return null;
    }
}
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
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
        const session = stmts.getSessionByToken.get(token);
        if (!session)
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        stmts.updateSessionActivity.run(new Date().toISOString(), token);
        if (role && payload.role !== role)
            return res.status(403).json({ error: 'Insufficient permissions.' });
        req.auth = payload;
        req.clientIp = getClientIp(req);
        req.jwtToken = token;
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
function isDateInPast(dateStr) {
    const today = new Date();
    const date = new Date(dateStr);
    return date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
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
        minBookingNoticeHours: parseInt(map.minBookingNoticeHours || '2', 10),
        maxBookingAdvanceDays: parseInt(map.maxBookingAdvanceDays || '90', 10),
    };
}
function generateSlotsForWindow(start, end, slotDurationMinutes) {
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
function generateSlotsForDate(dateStr, config) {
    const { start, end, slotDurationMinutes } = config.businessHours;
    return generateSlotsForWindow(start, end, slotDurationMinutes);
}
function generateSlotsForDoctor(dateStr, doctorId, config) {
    if (!doctorId)
        return generateSlotsForDate(dateStr, config);
    const dayOfWeek = new Date(`${dateStr}T12:00:00`).getDay();
    const schedule = stmts.getScheduleByDoctorAndDay.get(doctorId, dayOfWeek);
    if (!schedule)
        return generateSlotsForDate(dateStr, config);
    const startMinutes = parseTime(schedule.start_time);
    const endMinutes = parseTime(schedule.end_time);
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        return generateSlotsForDate(dateStr, config);
    }
    return generateSlotsForWindow(Math.floor(startMinutes / 60), Math.ceil(endMinutes / 60), schedule.slot_duration || config.businessHours.slotDurationMinutes).filter((time) => {
        const minutes = parseTime(time);
        return minutes !== null && minutes >= startMinutes && minutes < endMinutes;
    });
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
    return appointments.some(a => a.date === dateStr && parseTime(a.time) === slot && a.status === 'confirmed') ? 'booked' : 'available';
}
function genId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function generateBookingId() {
    // Keep trying until unique
    for (let i = 0; i < 10; i++) {
        const id = `BK-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
        const existing = stmts.getAppointmentById.get(id);
        if (!existing)
            return id;
    }
    return `BK-${new Date().getFullYear()}-${Date.now()}`;
}
function toAppointmentResponse(r) {
    return {
        id: r.id,
        date: r.date,
        time: r.time,
        patientName: r.patient_name,
        email: r.email,
        phone: r.phone,
        doctor: r.doctor,
        doctorId: r.doctor_id,
        type: r.type,
        reason: r.reason,
        status: r.status,
        notes: r.notes,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        userId: r.user_id,
    };
}
function sendNotification(userId, appointmentId, type, subject, message) {
    try {
        const id = genId('notif');
        stmts.insertNotification.run(id, userId, appointmentId, type, subject, message, new Date().toISOString());
        console.log(`[Notification] User: ${userId}, Type: ${type}, Subject: ${subject}`);
    }
    catch (err) {
        console.error('Failed to store notification:', err);
    }
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
/* ═══════════ Rate limit middleware ═══════════ */
const loginAttempts = new Map();
function checkRateLimit(identifier) {
    const now = Date.now();
    const record = loginAttempts.get(identifier);
    if (!record) {
        loginAttempts.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }
    if (now > record.resetTime) {
        loginAttempts.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }
    if (record.count >= RATE_LIMIT_MAX_ATTEMPTS)
        return false;
    record.count++;
    return true;
}
/* ═══════════ Auth routes ═══════════ */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        if (!email || !password || !name || !role)
            return res.status(400).json({ error: 'Missing fields: email, password, name, role.' });
        if (role === 'admin')
            return res.status(403).json({ error: 'Admin registration is not allowed.' });
        if (!['client', 'doctor'].includes(role))
            return res.status(400).json({ error: 'Role must be client or doctor.' });
        if (password.length < 6)
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        const existing = stmts.getUserByEmail.get(String(email).trim());
        if (existing)
            return res.status(409).json({ error: 'An account with this email already exists.' });
        const pwHash = await hashPassword(String(password));
        const userId = genId('user');
        const now = new Date().toISOString();
        stmts.insertUser.run(userId, String(email).trim().toLowerCase(), pwHash, role, String(name).trim(), TIMEZONE_DEFAULT, now, now);
        // Sign token first, then store it in session (fixes critical auth bug)
        const sessionId = genId('sess');
        const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
        const token = signToken({ userId, role: role, sessionId });
        stmts.insertSession.run(sessionId, userId, token, getClientIp(req), req.headers['user-agent'] || '', expiresAt);
        stmts.insertLog.run(genId('log'), userId, 'LOGIN', now, JSON.stringify({ action: 'register' }), getClientIp(req));
        res.status(201).json({ success: true, token, user: { id: userId, email: String(email).trim().toLowerCase(), name: String(name).trim(), role } });
    }
    catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed.' });
    }
});
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const clientIp = getClientIp(req);
        if (!email || !password)
            return res.status(400).json({ error: 'Missing email or password.' });
        if (!checkRateLimit(clientIp)) {
            return res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
        }
        const row = stmts.getUserByEmail.get(String(email).trim());
        if (!row)
            return res.status(401).json({ error: 'Invalid email or password.' });
        if (row.locked_until && new Date(row.locked_until) > new Date()) {
            const unlockTime = new Date(row.locked_until).toLocaleTimeString();
            return res.status(429).json({ error: `Account temporarily locked. Try again after ${unlockTime}.` });
        }
        if (role && row.role !== role)
            return res.status(403).json({ error: `This account is not a ${role}. Please use the correct login form.` });
        const ok = await verifyPassword(String(password), row.password_hash);
        if (!ok) {
            const attempts = (row.login_attempts || 0) + 1;
            const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60000).toISOString() : null;
            stmts.updateLoginAttempts.run(attempts, lockedUntil, new Date().toISOString(), row.id);
            const remaining = 5 - attempts;
            return res.status(401).json({ error: remaining > 0 ? `Invalid email or password. ${remaining} attempt(s) remaining.` : 'Invalid email or password. Account locked for 15 minutes.' });
        }
        const now = new Date().toISOString();
        stmts.recordLastLogin.run(now, now, row.id);
        // Sign token first, then store in session (fixes critical auth bug)
        const sessionId = genId('sess');
        const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
        const token = signToken({ userId: row.id, role: row.role, sessionId });
        stmts.insertSession.run(sessionId, row.id, token, clientIp, req.headers['user-agent'] || '', expiresAt);
        stmts.insertLog.run(genId('log'), row.id, 'LOGIN', now, JSON.stringify({ ip: clientIp }), clientIp);
        res.json({ success: true, token, user: { id: row.id, email: row.email, name: row.name, role: row.role } });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed.' });
    }
});
app.post('/api/auth/logout', requireAuth(), (req, res) => {
    try {
        const auth = req.auth;
        const token = req.jwtToken;
        stmts.deleteSession.run(token);
        stmts.insertLog.run(genId('log'), auth.userId, 'LOGOUT', new Date().toISOString(), JSON.stringify({}), req.clientIp);
        res.json({ success: true, message: 'Logged out successfully.' });
    }
    catch {
        res.status(500).json({ error: 'Logout failed.' });
    }
});
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ error: 'Email is required.' });
        const user = stmts.getUserByEmail.get(String(email).trim());
        // Always return success to prevent email enumeration
        if (!user)
            return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetExpiresAt = new Date(Date.now() + 60 * 60000).toISOString();
        stmts.setResetToken.run(resetToken, resetExpiresAt, new Date().toISOString(), user.id);
        sendNotification(user.id, null, 'password_reset', 'Password Reset Request', `Your reset token: ${resetToken}. Valid for 1 hour.`);
        stmts.insertLog.run(genId('log'), user.id, 'RESET_PASSWORD', new Date().toISOString(), JSON.stringify({ action: 'request' }), 'system');
        // In production, send via email. For dev, include token in response for testing.
        const isDev = process.env.NODE_ENV !== 'production';
        res.json({ success: true, message: 'If that email exists, a reset link has been sent.', ...(isDev ? { resetToken } : {}) });
    }
    catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to process password reset.' });
    }
});
app.post('/api/auth/confirm-reset', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword)
            return res.status(400).json({ error: 'Token and new password are required.' });
        if (newPassword.length < 6)
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        const rows = db.prepare("SELECT * FROM users WHERE reset_token = ? AND reset_expires_at > datetime('now')").all(token);
        if (!rows.length)
            return res.status(400).json({ error: 'Invalid or expired reset token.' });
        const pwHash = await hashPassword(newPassword);
        const now = new Date().toISOString();
        stmts.updateUserPassword.run(pwHash, now, rows[0].id);
        // Invalidate all sessions for security
        stmts.deleteUserSessions.run(rows[0].id);
        stmts.insertLog.run(genId('log'), rows[0].id, 'RESET_PASSWORD', now, JSON.stringify({ action: 'confirm' }), 'system');
        res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
    }
    catch (err) {
        console.error('Confirm reset error:', err);
        res.status(500).json({ error: 'Failed to confirm password reset.' });
    }
});
/* ═══════════ Profile routes ═══════════ */
app.get('/api/profile', requireAuth(), (req, res) => {
    try {
        const auth = req.auth;
        const user = stmts.getUserById.get(auth.userId);
        if (!user)
            return res.status(404).json({ error: 'User not found.' });
        const preferences = user.preferences ? JSON.parse(user.preferences) : {};
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            timezone: user.timezone,
            preferences,
            isVerified: user.is_verified,
            createdAt: user.created_at,
        });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});
app.patch('/api/profile', requireAuth(), (req, res) => {
    try {
        const auth = req.auth;
        const { name, phone, timezone } = req.body;
        const user = stmts.getUserById.get(auth.userId);
        if (!user)
            return res.status(404).json({ error: 'User not found.' });
        const newName = name || user.name;
        const newPhone = phone !== undefined ? phone : user.phone;
        const newTz = timezone || user.timezone;
        stmts.updateUser.run(user.email, newName, newPhone, newTz, new Date().toISOString(), auth.userId);
        res.json({ success: true, message: 'Profile updated.' });
    }
    catch {
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});
/* ═══════════ Config routes ═══════════ */
app.get('/api/doctors', (_req, res) => {
    try {
        const doctors = stmts.getUsersByRole.all('doctor').map((doctor) => ({
            id: doctor.id,
            name: doctor.name,
            email: doctor.email,
            phone: doctor.phone,
        }));
        res.json({ doctors });
    }
    catch {
        res.status(500).json({ error: 'Failed to load doctors.' });
    }
});
app.get('/api/config', (_req, res) => {
    try {
        res.json(loadConfig());
    }
    catch {
        res.status(500).json({ error: 'Failed to load configuration.' });
    }
});
app.patch('/api/config', requireAuth('admin'), (req, res) => {
    try {
        const { businessHours, notificationsEnabled, minBookingNoticeHours, maxBookingAdvanceDays } = req.body;
        const current = loadConfig();
        if (businessHours) {
            const merged = { ...current.businessHours, ...businessHours };
            if (merged.start >= merged.end)
                return res.status(400).json({ error: 'Start hour must be before end hour.' });
            stmts.upsertConfigVal.run('businessHours', JSON.stringify(merged));
        }
        if (typeof notificationsEnabled === 'boolean') {
            stmts.upsertConfigVal.run('notificationsEnabled', String(notificationsEnabled));
        }
        if (minBookingNoticeHours !== undefined)
            stmts.upsertConfigVal.run('minBookingNoticeHours', String(minBookingNoticeHours));
        if (maxBookingAdvanceDays !== undefined)
            stmts.upsertConfigVal.run('maxBookingAdvanceDays', String(maxBookingAdvanceDays));
        res.json(loadConfig());
    }
    catch {
        res.status(500).json({ error: 'Failed to update config.' });
    }
});
/* ═══════════ Slots routes ═══════════ */
app.get('/api/slots/:date', (req, res) => {
    try {
        const { date } = req.params;
        const doctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId : null;
        if (!isValidDate(date))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        if (isDateInPast(date))
            return res.status(400).json({ error: 'Cannot view slots for past dates.' });
        const config = loadConfig();
        const slots = generateSlotsForDoctor(date, doctorId, config);
        const appointments = doctorId
            ? stmts.getAppointmentsByDateAndDoctor.all(date, doctorId)
            : stmts.getAppointmentsByDate.all(date);
        const blocked = doctorId
            ? stmts.getBlockedByDate.all(date, doctorId)
            : stmts.getBlockedByDateGeneral.all(date);
        // Apply minimum booking notice time
        const now = new Date();
        const minNoticeMs = config.minBookingNoticeHours * 60 * 60 * 1000;
        const slotsWithStatus = slots.map(time => {
            let status = getSlotStatus(date, time, appointments, blocked);
            // Block slots within minimum notice window
            if (status === 'available') {
                const slotDate = new Date(`${date}T00:00:00`);
                const slotMinutes = parseTime(time);
                if (slotMinutes !== null) {
                    slotDate.setMinutes(slotMinutes);
                    if (slotDate.getTime() - now.getTime() < minNoticeMs) {
                        status = 'blocked';
                    }
                }
            }
            return { time, status };
        });
        res.json({ date, slots: slotsWithStatus });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch slots.' });
    }
});
/* ═══════════ Appointments routes ═══════════ */
app.post('/api/book', requireAuth('client'), (req, res) => {
    try {
        const auth = req.auth;
        const { date, time, patientName, email, phone, doctor, doctorId, type, reason } = req.body;
        const config = loadConfig();
        if (!date || !time || !patientName || !email || !phone)
            return res.status(400).json({ error: 'Missing required fields: date, time, patientName, email, phone.' });
        if (!isValidDate(date))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        if (isDateInPast(date))
            return res.status(400).json({ error: 'Cannot book appointments in the past.' });
        if (parseTime(time) === null)
            return res.status(400).json({ error: 'Invalid time format.' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return res.status(400).json({ error: 'Invalid email address.' });
        // Check advance booking limit
        const maxAdvance = new Date();
        maxAdvance.setDate(maxAdvance.getDate() + config.maxBookingAdvanceDays);
        if (new Date(date) > maxAdvance)
            return res.status(400).json({ error: `Cannot book more than ${config.maxBookingAdvanceDays} days in advance.` });
        // Check minimum notice time
        const slotMinutes = parseTime(time);
        const slotDateTime = new Date(`${date}T00:00:00`);
        slotDateTime.setMinutes(slotDateTime.getMinutes() + slotMinutes);
        const noticeMs = config.minBookingNoticeHours * 60 * 60 * 1000;
        if (slotDateTime.getTime() - Date.now() < noticeMs) {
            return res.status(400).json({ error: `Bookings require at least ${config.minBookingNoticeHours} hour(s) notice.` });
        }
        // Lookup doctor if doctorId provided
        let resolvedDoctorName = doctor || 'Dr. Sarah Johnson';
        let resolvedDoctorId = doctorId || null;
        if (doctorId) {
            const doctorUser = stmts.getUserById.get(doctorId);
            if (!doctorUser || doctorUser.role !== 'doctor')
                return res.status(400).json({ error: 'Selected doctor not found.' });
            resolvedDoctorName = doctorUser.name;
        }
        const appointments = resolvedDoctorId
            ? stmts.getAppointmentsByDateAndDoctor.all(date, resolvedDoctorId)
            : stmts.getAppointmentsByDate.all(date);
        const blocked = resolvedDoctorId
            ? stmts.getBlockedByDate.all(date, resolvedDoctorId)
            : stmts.getBlockedByDateGeneral.all(date);
        const allowedSlots = generateSlotsForDoctor(date, resolvedDoctorId, config);
        if (!allowedSlots.includes(time)) {
            return res.status(409).json({ error: 'This doctor is not available at the selected time.' });
        }
        const status = getSlotStatus(date, time, appointments, blocked);
        if (status === 'booked')
            return res.status(409).json({ error: 'This slot is already booked. Please choose another time.' });
        if (status === 'blocked')
            return res.status(409).json({ error: 'This slot is not available.' });
        const id = generateBookingId();
        const now = new Date().toISOString();
        stmts.insertAppointment.run(id, date, time, String(patientName).trim(), String(email).trim().toLowerCase(), String(phone).trim(), resolvedDoctorId, resolvedDoctorName, type || 'General Consultation', reason || '', auth.userId, now, now);
        stmts.insertLog.run(genId('log'), auth.userId, 'BOOK', now, JSON.stringify({ appointmentId: id, date, time }), req.clientIp);
        sendNotification(auth.userId, id, 'appointment_booked', 'Appointment Confirmed', `Your appointment on ${date} at ${time} with ${resolvedDoctorName} has been confirmed. Booking ID: ${id}`);
        const row = stmts.getAppointmentById.get(id);
        res.status(201).json({ success: true, message: 'Appointment booked successfully.', appointmentId: id, appointment: toAppointmentResponse(row) });
    }
    catch (err) {
        console.error('Booking error:', err);
        res.status(500).json({ error: 'Failed to book appointment.' });
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
            return res.status(404).json({ error: 'Appointment not found.' });
        if (row.user_id && row.user_id !== auth.userId)
            return res.status(403).json({ error: 'You can only cancel your own appointments.' });
        if (row.status === 'cancelled')
            return res.status(400).json({ error: 'This appointment is already cancelled.' });
        const now = new Date().toISOString();
        stmts.cancelAppointment.run(now, appointmentId);
        stmts.insertLog.run(genId('log'), auth.userId, 'CANCEL', now, JSON.stringify({ appointmentId, date: row.date, time: row.time }), req.clientIp);
        sendNotification(auth.userId, appointmentId, 'appointment_cancelled', 'Appointment Cancelled', `Your appointment on ${row.date} at ${row.time} has been cancelled.`);
        res.json({ success: true, message: 'Appointment cancelled successfully.' });
    }
    catch {
        res.status(500).json({ error: 'Failed to cancel appointment.' });
    }
});
/* ═══════════ Doctor Dashboard routes ═══════════ */
app.get('/api/doctor/dashboard', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const doctor = stmts.getUserById.get(auth.userId);
        const allAppointments = stmts.getAppointmentsByDoctor.all(auth.userId);
        const upcomingAppointments = stmts.getUpcomingByDoctor.all(auth.userId);
        const schedule = stmts.getDoctorSchedule.all(auth.userId);
        const blockedSlots = stmts.getAllBlockedByDoctor.all(auth.userId);
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = allAppointments.filter(a => a.date === today && a.status !== 'cancelled');
        const stats = {
            totalAppointments: allAppointments.filter(a => a.status !== 'cancelled').length,
            upcomingAppointments: upcomingAppointments.filter(a => a.status !== 'cancelled').length,
            completedAppointments: allAppointments.filter(a => new Date(a.date) < new Date() && a.status !== 'cancelled').length,
            todayAppointments: todayAppointments.length,
            cancelledAppointments: allAppointments.filter(a => a.status === 'cancelled').length,
        };
        res.json({
            doctor: { id: doctor.id, name: doctor.name, email: doctor.email, phone: doctor.phone, role: doctor.role },
            stats,
            schedule,
            todayAppointments: todayAppointments.map(toAppointmentResponse),
            upcomingAppointments: upcomingAppointments.slice(0, 10).map(toAppointmentResponse),
            blockedSlots: blockedSlots.slice(0, 20).map(b => ({ id: b.id, date: b.date, startTime: b.start_time, endTime: b.end_time, reason: b.reason })),
            recentAppointments: allAppointments.slice(0, 20).map(toAppointmentResponse),
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch doctor dashboard.' });
    }
});
app.get('/api/doctor/appointments/:date', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const { date } = req.params;
        if (!isValidDate(date))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        const rows = stmts.getAppointmentsByDateAndDoctor.all(date, auth.userId);
        res.json({ date, appointments: rows.map(toAppointmentResponse) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch appointments.' });
    }
});
app.get('/api/doctor/history/:date', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const { date } = req.params;
        if (!isValidDate(date))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        const rows = stmts.getAppointmentsByDoctorBeforeDate.all(auth.userId, date);
        res.json({ appointments: rows.map(toAppointmentResponse) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch appointment history.' });
    }
});
app.get('/api/doctor/blocked', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const rows = stmts.getAllBlockedByDoctor.all(auth.userId);
        res.json({ blocked: rows.map(r => ({ id: r.id, date: r.date, startTime: r.start_time, endTime: r.end_time, reason: r.reason })) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch blocked slots.' });
    }
});
app.patch('/api/doctor/appointment/:id/notes', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const { id } = req.params;
        const { notes } = req.body;
        const appt = stmts.getAppointmentById.get(id);
        if (!appt)
            return res.status(404).json({ error: 'Appointment not found.' });
        if (appt.doctor_id && appt.doctor_id !== auth.userId)
            return res.status(403).json({ error: 'Unauthorized.' });
        stmts.updateAppointmentNotes.run(notes || '', new Date().toISOString(), id);
        res.json({ success: true, message: 'Notes updated.' });
    }
    catch {
        res.status(500).json({ error: 'Failed to update notes.' });
    }
});
app.patch('/api/doctor/appointment/:id/status', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const { id } = req.params;
        const { status } = req.body;
        if (!['confirmed', 'completed', 'cancelled', 'no-show'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use: confirmed, completed, cancelled, no-show.' });
        }
        const appt = stmts.getAppointmentById.get(id);
        if (!appt)
            return res.status(404).json({ error: 'Appointment not found.' });
        if (appt.doctor_id && appt.doctor_id !== auth.userId)
            return res.status(403).json({ error: 'Unauthorized.' });
        stmts.updateAppointmentStatus.run(status, new Date().toISOString(), id);
        res.json({ success: true, message: `Appointment marked as ${status}.` });
    }
    catch {
        res.status(500).json({ error: 'Failed to update appointment status.' });
    }
});
/* Doctor schedule management */
app.get('/api/doctor/schedule', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const schedule = stmts.getDoctorSchedule.all(auth.userId);
        res.json({ schedule: schedule.map(s => ({
                id: s.id,
                dayOfWeek: s.day_of_week,
                startTime: s.start_time,
                endTime: s.end_time,
                slotDuration: s.slot_duration,
            })) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch schedule.' });
    }
});
app.post('/api/doctor/schedule', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const { dayOfWeek, startTime, endTime, slotDuration } = req.body;
        if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6)
            return res.status(400).json({ error: 'dayOfWeek must be 0-6 (0=Sunday).' });
        if (!startTime || !endTime)
            return res.status(400).json({ error: 'startTime and endTime are required.' });
        const now = new Date().toISOString();
        // Upsert: if entry exists for this day, update it; otherwise insert
        const existing = stmts.getScheduleByDoctorAndDay.get(auth.userId, dayOfWeek);
        if (existing) {
            stmts.updateDoctorSchedule.run(startTime, endTime, slotDuration || 30, now, auth.userId, dayOfWeek);
            stmts.insertLog.run(genId('log'), auth.userId, 'UPDATE_SCHEDULE', now, JSON.stringify({ dayOfWeek, startTime, endTime }), req.clientIp);
            res.json({ success: true, message: 'Schedule updated.', scheduleId: existing.id });
        }
        else {
            const id = genId('sched');
            stmts.insertDoctorSchedule.run(id, auth.userId, dayOfWeek, startTime, endTime, slotDuration || 30, now);
            stmts.insertLog.run(genId('log'), auth.userId, 'UPDATE_SCHEDULE', now, JSON.stringify({ dayOfWeek, startTime, endTime }), req.clientIp);
            res.status(201).json({ success: true, message: 'Schedule created.', scheduleId: id });
        }
    }
    catch {
        res.status(500).json({ error: 'Failed to save schedule.' });
    }
});
app.delete('/api/doctor/schedule/:dayOfWeek', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const dayOfWeek = parseInt(req.params.dayOfWeek, 10);
        if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6)
            return res.status(400).json({ error: 'Invalid day of week.' });
        stmts.deleteDoctorScheduleByDay.run(auth.userId, dayOfWeek);
        res.json({ success: true, message: 'Schedule entry removed.' });
    }
    catch {
        res.status(500).json({ error: 'Failed to remove schedule.' });
    }
});
/* ═══════════ Block/Unblock slots ═══════════ */
app.get('/api/blocked/:date', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const { date } = req.params;
        if (!isValidDate(date))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        const rows = stmts.getBlockedByDate.all(date, auth.userId);
        res.json({ date, blocked: rows.map(r => ({ id: r.id, date: r.date, startTime: r.start_time, endTime: r.end_time, reason: r.reason })) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch blocked slots.' });
    }
});
app.post('/api/block', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const { date, startTime, endTime, reason } = req.body;
        if (!date || !startTime || !endTime || !reason)
            return res.status(400).json({ error: 'Missing required fields: date, startTime, endTime, reason.' });
        if (!isValidDate(date))
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
        if (parseTime(startTime) === null)
            return res.status(400).json({ error: 'Invalid startTime format.' });
        if (parseTime(endTime) === null)
            return res.status(400).json({ error: 'Invalid endTime format.' });
        if (parseTime(startTime) >= parseTime(endTime))
            return res.status(400).json({ error: 'startTime must be before endTime.' });
        const id = genId('block');
        const now = new Date().toISOString();
        stmts.insertBlocked.run(id, auth.userId, date, startTime, endTime, reason, now);
        stmts.insertLog.run(genId('log'), auth.userId, 'BLOCK', now, JSON.stringify({ date, startTime, endTime, reason }), req.clientIp);
        res.status(201).json({ success: true, message: 'Time slot blocked successfully.', blockedSlot: { id, date, startTime, endTime, reason } });
    }
    catch {
        res.status(500).json({ error: 'Failed to block slot.' });
    }
});
app.post('/api/unblock', requireAuth('doctor'), (req, res) => {
    try {
        const auth = req.auth;
        const { slotId } = req.body;
        if (!slotId)
            return res.status(400).json({ error: 'Slot ID is required.' });
        const row = stmts.getBlockedById.get(slotId);
        if (!row)
            return res.status(404).json({ error: 'Blocked slot not found.' });
        if (row.doctor_id !== auth.userId)
            return res.status(403).json({ error: 'Unauthorized.' });
        stmts.deleteBlocked.run(slotId);
        stmts.insertLog.run(genId('log'), auth.userId, 'UNBLOCK', new Date().toISOString(), JSON.stringify({ slotId, date: row.date }), req.clientIp);
        res.json({ success: true, message: 'Time slot unblocked successfully.' });
    }
    catch {
        res.status(500).json({ error: 'Failed to unblock slot.' });
    }
});
/* ═══════════ Admin Dashboard routes ═══════════ */
app.get('/api/admin/dashboard', requireAuth('admin'), (_req, res) => {
    try {
        const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
        const appointmentsCount = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status != 'cancelled'").get();
        const totalApptCount = db.prepare('SELECT COUNT(*) as count FROM appointments').get();
        const cancelledCount = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'cancelled'").get();
        const logsCount = db.prepare('SELECT COUNT(*) as count FROM activity_logs').get();
        const todayCount = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE date = date('now') AND status = 'confirmed'").get();
        const doctors = stmts.getUsersByRole.all('doctor');
        const clients = stmts.getUsersByRole.all('client');
        const recentActivities = stmts.getRecentLogs.all().slice(0, 20);
        const recentAppointments = stmts.getAllAppointments.all().slice(0, 10);
        res.json({
            stats: {
                totalUsers: usersCount?.count || 0,
                totalDoctors: doctors.length,
                totalClients: clients.length,
                totalAppointments: totalApptCount?.count || 0,
                confirmedAppointments: appointmentsCount?.count || 0,
                cancelledAppointments: cancelledCount?.count || 0,
                todayAppointments: todayCount?.count || 0,
                totalActivityLogs: logsCount?.count || 0,
            },
            doctors: doctors.slice(0, 10).map(d => ({ id: d.id, name: d.name, email: d.email, phone: d.phone, createdAt: d.created_at })),
            recentActivities: recentActivities.map(r => ({ ...r, details: (() => { try {
                    return JSON.parse(r.details);
                }
                catch {
                    return {};
                } })() })),
            recentAppointments: recentAppointments.map(toAppointmentResponse),
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch admin dashboard.' });
    }
});
app.get('/api/admin/users', requireAuth('admin'), (req, res) => {
    try {
        const { role } = req.query;
        const rows = role ? stmts.getUsersByRole.all(String(role)) : stmts.getAllUsers.all();
        const safeRows = rows.map(r => ({
            id: r.id,
            email: r.email,
            name: r.name,
            role: r.role,
            phone: r.phone,
            isVerified: !!r.is_verified,
            lastLogin: r.last_login,
            createdAt: r.created_at,
        }));
        res.json({ users: safeRows });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});
app.delete('/api/admin/users/:id', requireAuth('admin'), (req, res) => {
    try {
        const { id } = req.params;
        const auth = req.auth;
        if (id === auth.userId)
            return res.status(400).json({ error: 'Cannot delete your own account.' });
        const user = stmts.getUserById.get(id);
        if (!user)
            return res.status(404).json({ error: 'User not found.' });
        stmts.deleteUser.run(id);
        stmts.insertLog.run(genId('log'), auth.userId, 'LOGOUT', new Date().toISOString(), JSON.stringify({ action: 'delete_user', deletedUserId: id, deletedEmail: user.email }), req.clientIp);
        res.json({ success: true, message: `User ${user.email} deleted.` });
    }
    catch {
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});
app.get('/api/admin/appointments', requireAuth('admin'), (req, res) => {
    try {
        const { date, status } = req.query;
        let rows;
        if (date && isValidDate(String(date))) {
            rows = stmts.getAppointmentsByDate.all(String(date));
        }
        else {
            rows = stmts.getAllAppointments.all();
        }
        if (status)
            rows = rows.filter(r => r.status === String(status));
        res.json({ appointments: rows.map(toAppointmentResponse) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch appointments.' });
    }
});
app.patch('/api/admin/appointments/:id/cancel', requireAuth('admin'), (req, res) => {
    try {
        const { id } = req.params;
        const auth = req.auth;
        const row = stmts.getAppointmentById.get(id);
        if (!row)
            return res.status(404).json({ error: 'Appointment not found.' });
        if (row.status === 'cancelled')
            return res.status(400).json({ error: 'Already cancelled.' });
        const now = new Date().toISOString();
        stmts.cancelAppointment.run(now, id);
        stmts.insertLog.run(genId('log'), auth.userId, 'CANCEL', now, JSON.stringify({ appointmentId: id, admin: true }), req.clientIp);
        res.json({ success: true, message: 'Appointment cancelled.' });
    }
    catch {
        res.status(500).json({ error: 'Failed to cancel appointment.' });
    }
});
app.get('/api/admin/logs', requireAuth('admin'), (req, res) => {
    try {
        const rows = stmts.getRecentLogs.all();
        res.json({ logs: rows.map(r => ({ ...r, details: (() => { try {
                    return JSON.parse(r.details);
                }
                catch {
                    return {};
                } })() })) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch logs.' });
    }
});
app.get('/api/admin/activities/:userId', requireAuth('admin'), (req, res) => {
    try {
        const { userId } = req.params;
        const rows = stmts.getUserLogs.all(userId);
        res.json({ activities: rows.map(r => ({ ...r, details: (() => { try {
                    return JSON.parse(r.details);
                }
                catch {
                    return {};
                } })() })) });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch activities.' });
    }
});
/* ═══════════ Patient Dashboard routes ═══════════ */
app.get('/api/patient/dashboard', requireAuth('client'), (req, res) => {
    try {
        const auth = req.auth;
        const user = stmts.getUserById.get(auth.userId);
        const allAppointments = stmts.getAppointmentsByUser.all(auth.userId);
        const upcomingAppointments = stmts.getUpcomingByUser.all(auth.userId);
        const pastAppointments = stmts.getPastByUser.all(auth.userId);
        const stats = {
            totalAppointments: allAppointments.length,
            upcomingAppointments: upcomingAppointments.filter(a => a.status !== 'cancelled').length,
            completedAppointments: pastAppointments.filter(a => a.status !== 'cancelled').length,
            cancelledAppointments: allAppointments.filter(a => a.status === 'cancelled').length,
        };
        res.json({
            user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
            stats,
            upcomingAppointments: upcomingAppointments.map(toAppointmentResponse),
            pastAppointments: pastAppointments.map(toAppointmentResponse),
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch patient dashboard.' });
    }
});
/* ═══════════ Notifications ═══════════ */
app.get('/api/notifications', requireAuth(), (req, res) => {
    try {
        const auth = req.auth;
        const rows = stmts.getNotifications.all(auth.userId);
        res.json({ notifications: rows });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});
app.patch('/api/notifications/:id/read', requireAuth(), (req, res) => {
    try {
        stmts.markNotificationRead.run(new Date().toISOString(), req.params.id);
        res.json({ success: true });
    }
    catch {
        res.status(500).json({ error: 'Failed to mark notification.' });
    }
});
/* ═══════════ Static fallback ═══════════ */
app.get('/', (_req, res) => res.sendFile(path_1.default.join(__dirname, 'index.html')));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.get('*', (_req, res) => res.sendFile(path_1.default.join(__dirname, 'index.html')));
/* ═══════════ Start ═══════════ */
seedAdmin().then(() => {
    app.listen(PORT, () => {
        console.log(`\u2705 Clinic Booking API running at http://localhost:${PORT}`);
        console.log(`\uD83D\uDCC1 Database: ${path_1.default.join(__dirname, 'clinic.db')}`);
        console.log(`\uD83D\uDD10 Auth: JWT sessions, rate limiting, account locking`);
        console.log(`\uD83D\uDCCB Roles: client, doctor (admin is hardcoded)`);
    });
});
exports.default = app;
