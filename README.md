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

## API Docs (Swagger)

Protected with **HTTP Basic Auth** (browser login popup).

| Variable | Default |
|----------|---------|
| `SWAGGER_USER` | `admin` |
| `SWAGGER_PASSWORD` | `ok` |

- **Local:** `http://localhost:3001/api/docs`
- **Render:** `https://happy-pet-hanhbook-be.onrender.com/api/docs`

On Render, `RENDER_EXTERNAL_URL` is set automatically — startup logs print the deploy Swagger URL.

Use **Authorize** in Swagger UI and paste `Bearer <your-jwt>` to test `/api/auth/me`.

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
