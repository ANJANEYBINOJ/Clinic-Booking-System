# Clinic Booking System
## A full-featured clinic booking prototype with patient and doctor views, dark theme, and high UX.

## Quick Start

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** in your browser.

## Features

### Patient View
- **M1** Select a date to see available appointment slots
- **M2** View time slots with clear status labels (Available, Booked, Blocked)
- **M3–M5** Book with name, email, and phone
- **M6** Receive a unique appointment ID (e.g. BK-2026-1234)
- **M7** Cancel appointments using the booking ID
- **M8** Confirmation toasts after booking or cancelling
- **M9** Clear error messages for invalid input
- **M10** Double booking prevented by the system

### Authentication
- **Client (patient):** Register and log in to book and cancel appointments. Name/email prefilled when logged in.
- **Doctor:** Register and log in to access the doctor dashboard (schedule, block/unblock, settings, logs).

### Doctor View
- **M11** View all appointments for a selected day
- **M12** See patient contact details (name, email, phone)
- **M13–M14** Block and unblock time slots
- **M15** Blocked slots clearly shown in the schedule
- **S3** View past appointment history
- **N1** Role-based login (doctor access)
- **N2** Configurable clinic working hours

### System
- **M16** Slots generated from business hours (9 AM–5 PM, 30-min slots)
- **M17–M18** Date and time validation
- **M19–M20** Secure storage, minimal patient data
- **M21** Separate patient and doctor views
- **M22** REST API for booking, cancellation, slots, block/unblock
- **M23** Consistent availability logic
- **M24** Graceful error handling
- **M25** Fast UI with smooth interactions

### Should Have
- **S1–S2** Email/SMS confirmation (mock; shown when notifications enabled)
- **S4** Activity logging (server-side)
- **S5** Optional notifications (app works when disabled)

### Nice to Have
- **N3** Reminder messages (mentioned in confirmation)

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|--------------|
| POST | `/api/auth/register` | — | Register (body: email, password, name, role: client \| doctor) |
| POST | `/api/auth/login` | — | Login (body: email, password, role); returns token |
| GET | `/api/config` | — | Get clinic config |
| GET | `/api/slots/:date` | — | Get slots with status for a date |
| GET | `/api/appointments/me` | client | Get current user's appointments |
| POST | `/api/book` | client | Book an appointment |
| POST | `/api/cancel` | client | Cancel own appointment by ID |
| GET | `/api/appointments/:date` | doctor | Get appointments for a date |
| GET | `/api/appointments/history/:beforeDate` | doctor | Get past appointments |
| GET | `/api/blocked` | doctor | Get all blocked slots |
| GET | `/api/blocked/:date` | doctor | Get blocked slots for a date |
| POST | `/api/block` | doctor | Block a time slot |
| POST | `/api/unblock` | doctor | Unblock a slot |
| PATCH | `/api/config` | doctor | Update business hours |
| GET | `/api/logs` | doctor | Get activity logs |

Send `Authorization: Bearer <token>` for protected routes.

## Tech Stack

- **Frontend:** TypeScript, vanilla DOM, dark theme CSS
- **Backend:** Node.js, Express
- **Storage:** JSON file (`data.json`)
