# Happy Pet Handbook — Backend API

Node.js + Express + TypeScript + MongoDB Atlas.

## Setup

```bash
cp .env.example .env
# Fill in MONGODB_URI and JWT_SECRET in .env

npm install
npm run dev
```

Server runs at `http://localhost:3001` by default.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Register (`user` role) |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user profile |
| POST | `/api/contact` | — | Submit contact form |

## Roles

- **Guest** — unauthenticated visitor (landing page, contact form)
- **user** — registered account (adopt/give pets — coming later)

## Environment

See `.env.example` for all variables.
