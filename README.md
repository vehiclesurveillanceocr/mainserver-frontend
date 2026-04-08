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
- On pushes to `main`, it builds a Docker image, pushes it to Docker Hub, and restarts the container on your EC2 server
- The production container listens on port `3000`

### GitHub secrets to add

- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub access token or password
- `EC2_HOST`: public IP or DNS of your EC2 instance
- `EC2_USER`: SSH user, for example `ubuntu`
- `EC2_SSH_KEY`: private key content for the EC2 server
- `NEXT_PUBLIC_WS_URL`: websocket URL for runtime clients, if needed

### One-time EC2 preparation

Install Docker on the EC2 server and make sure your SSH user can run Docker via `sudo`:

```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl enable --now docker
```

### Local Docker run

```bash
docker compose up --build
```

After that, every push to `main` will build in GitHub Actions, push the image to Docker Hub, and deploy it on the EC2 machine.
