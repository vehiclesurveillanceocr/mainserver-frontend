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

## CI/CD for EC2

This repo now includes a GitHub Actions workflow at `.github/workflows/ci-cd.yml`.

- On every push and pull request, it runs `npm ci`, `npm run typecheck`, and `npm run build`
- On pushes to `main`, it sends the latest app files to your EC2 server over SSH and runs `./deploy_nohup.sh`
- This setup does not use Docker

### GitHub secrets to add

- `EC2_HOST`: public IP or DNS of your EC2 instance
- `EC2_USER`: SSH user, for example `ubuntu`
- `EC2_SSH_KEY`: private key content for the EC2 server
- `EC2_APP_DIR`: absolute path where the app files should live on EC2, for example `/home/ubuntu/surveillance-main-server-frontend`

### One-time EC2 preparation

Create the target directory on the EC2 server and make sure your SSH user can write to it:

```bash
mkdir -p /home/ubuntu/surveillance-main-server-frontend
cd /home/ubuntu/surveillance-main-server-frontend
```

Install Node.js `20.9+` on the EC2 instance before running `./deploy_nohup.sh`. This project is built with Next.js 16 and will not build on older Node versions such as Node 12.

After that, every push to `main` will build in GitHub Actions and deploy on the EC2 machine through SSH.
