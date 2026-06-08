# WorkWell Return — example backend (Express + SQLite + WS + JWT)

A reference backend that implements the contract the frontend's `js/api.js` /
`js/realtime.js` expect, so you can run the prototype against a real database
with authentication and live sync instead of `localStorage`.

- **Express** routing, **SQLite** via Node's built-in `node:sqlite` (no native build).
- **WebSocket** (`ws`) broadcasts changes for live multi-client sync.
- **JWT** (`jsonwebtoken`) auth, enabled when `WW_JWT_SECRET` is set.
- Requires **Node 22.5+** (tested on Node 24).

## Run (standalone)

```bash
cd server
npm install
npm start                       # http://localhost:8787  (data.db next to server.js)
# with auth + SPA hosting:
WW_JWT_SECRET=secret STATIC_DIR=.. npm start
```

| Env | Default | Meaning |
|---|---|---|
| `PORT` | `8787` | listen port |
| `WW_JWT_SECRET` | *(empty)* | set → JWT auth required on data routes |
| `WW_RESEARCHER_PW` | `research` | password for the `researcher` account |
| `WW_PARTICIPANT_PW` | `demo` | password for `P-xxx` participant logins |
| `STATIC_DIR` | *(empty)* | set → also serve the SPA from this folder |
| `DB_PATH` | `./data.db` | SQLite file path |

## Run the whole stack with Docker

From the **project root** (one command):

```bash
docker compose up --build       # SPA + API + WebSocket on http://localhost:8787 (JWT on)
```

## Auth

`POST /auth/login  { username, password }` → `{ token, role, participantId? }`
- `researcher` / `WW_RESEARCHER_PW` → researcher token
- `P-001` (any `P-\d{3,}`) / `WW_PARTICIPANT_PW` → participant token

Send `Authorization: Bearer <token>` on data routes. (Demo-grade credential check; real
deployments should back this with a proper user store.)

## Realtime

Connect to `ws(s)://<host>/ws`. After every write the server broadcasts
`{ type:"state-updated", by:<clientId> }`. Clients send `X-Client-Id` on writes and ignore
their own echo, then re-pull `/state`.

## API

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | no | `{ ok, auth, realtime, participants }` |
| POST | `/auth/login` | no | returns a JWT |
| GET / PUT | `/state` | yes* | full state (`{}` if empty) / replace all (transaction) |
| GET / POST | `/participants` | yes* | list / upsert |
| GET / POST / DELETE | `/entries` `/goals` `/surveys` `/activities` | yes* | `?participantId=` filter on GET |
| GET / PUT | `/plans/:pid` | yes* | per-participant plan |

\* auth enforced only when `WW_JWT_SECRET` is set. CORS is open (`*`).

## Storage

`data.db` (SQLite). Entities are `(id, data-json)` tables; `plans/graded/coping/resourcesRead`
and meta live in a `kv` table. Delete `data.db` (or the Docker volume) to reset.
