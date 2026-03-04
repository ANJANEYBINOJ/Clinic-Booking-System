# Clinic Booking System
## A full-featured clinic booking prototype with patient and doctor views, dark theme, and high UX.

## Quick Start

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** in your browser.

## Deployment (Railway)

The app is deployed to Railway via the CLI.

- **Live URL:** https://clinic-booking-app-production.up.railway.app
- **Redeploy:** `railway up` (from project root; requires [Railway CLI](https://docs.railway.com/cli/install) and `railway login` + linked project)
- **Logs:** `railway logs`
- **Variables:** Set in [Railway dashboard](https://railway.com) (e.g. `JWT_SECRET`). `PORT` is set by Railway.
- **Note:** SQLite data is ephemeral on Railway (reset on redeploy). For persistence, add a Railway Volume and use `DATABASE_PATH`.
