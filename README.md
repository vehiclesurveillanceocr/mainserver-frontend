# Surveillance Main Server Frontend

Standalone Next.js frontend extracted from the original ANPR portal and rebuilt to run with mock data only.

## What is included

- Portal UI on `http://localhost:3000`
- Mock login/session flow
- Mock dashboard, devices, watchlist, alerts, analytics, settings
- Mock scanner flow that simulates detections without a backend

## What is not wired to a real backend

- Better Auth
- Central API
- WebSocket scanner service
- Workstation agent

## Run locally

```bash
pnpm install
pnpm dev
```

## Demo credentials

- Admin: `sibi@sibi.com` / `sibi`
- Scanner: `scanner@scanner.com` / `scanner`

## Project structure

- `src/app` - Next.js routes and layouts
- `src/components` - reusable UI primitives
- `src/lib` - mock API/auth adapters used by the pages
- `src/mocks` - in-memory store and seed data
- `src/types` - shared domain types

## Notes

- Default dev port is `3000`
- You can change the port later in `package.json`
- The mock store is in-memory, so data resets when the dev server restarts
