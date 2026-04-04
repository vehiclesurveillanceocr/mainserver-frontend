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
- On pushes to `main`, it SSHes into your EC2 server, pulls the latest code, and runs `./deploy_nohup.sh`
- This setup does not use Docker

### GitHub secrets to add

- `EC2_HOST`: public IP or DNS of your EC2 instance
- `EC2_USER`: SSH user, for example `ubuntu`
- `EC2_SSH_KEY`: private key content for the EC2 server
- `EC2_APP_DIR`: absolute path where the repo should live on EC2, for example `/home/ubuntu/surveillance-main-server-frontend`

### One-time EC2 preparation

You can clone this repo on the EC2 server once and keep it on the branch you deploy from:

```bash
git clone https://github.com/Indominus-labs-org/surveillance-main-server-frontend.git
cd surveillance-main-server-frontend
git checkout main
chmod +x deploy_nohup.sh
```

After that, every push to `main` will build in GitHub Actions and deploy on the EC2 machine through SSH.

If `EC2_APP_DIR` does not contain the repo yet, the workflow will clone it there automatically on the first deploy.
