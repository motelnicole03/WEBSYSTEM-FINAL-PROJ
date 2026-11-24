# StudentConnect: Student Job and Internship Portal

PostgreSQL + Express/Node (TypeScript) backend, with a plain HTML, CSS and JavaScript website served by the same server.

```
student-job-portal/
└── server/
    ├── src/      Express API + PostgreSQL
    └── public/   the website (HTML, CSS, JS), served at http://localhost:4000
```

## 1. Install these first

| Tool | Version | Check |
|---|---|---|
| Node.js | 22 or newer | `node -v` |
| PostgreSQL | 16 or newer | `psql --version` |
| Git | any | `git --version` |

## 2. Clone

```bash
git clone <repo-url>
cd <repo-folder>/student-job-portal
```

## 3. Database

Create an empty database. Use the Postgres user and password from your own machine.

```bash
createdb -U postgres student_job_portal
```

(Or create `student_job_portal` in pgAdmin / DBeaver.)

## 4. Server

```bash
cd server
npm install
cp .env.example .env
```

Open `server/.env` and set:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | `postgres://USER:PASSWORD@localhost:5432/student_job_portal` with YOUR Postgres user and password |
| `JWT_SECRET` | any random string, 32+ characters. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the first admin account (created by the seed step). Pick your own password. |

Then create the tables and starter data, and start the API:

```bash
npm run migrate     # creates all tables
npm run seed        # programs, skills, and the admin account
npm run dev         # leave this running
```

Check it: open http://localhost:4000/api/health. You should see `{"status":"ok"}`.

## 5. Open the website

There is no separate client. The website lives in `server/public/` and the same `npm run dev` serves it.

Open **http://localhost:4000**.

Optional: put a campus photo at `server/public/img/hero.jpg` for the landing page background.

(If an old `client/` folder is still in your copy, it is not used any more and can be deleted.)

## 6. Log in

- **Admin:** the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`.
- **Student / employer:** sign up from the website. New employers must be verified by the admin before they can post
  (`POST /api/admin/employers/:id/verify`, shown in the test scripts).

## Daily workflow

```bash
git pull
cd server && npm install && npm run migrate   # picks up new packages and new migrations
```

Always run `npm run migrate` after pulling. Each teammate has their own local database, and schema changes
arrive as new files in `server/src/db/migrations/`. Never edit a migration that is already committed: add a new file
(`005_something.sql`).

## Testing the API from the terminal

With the server running, from `server/`:

```bash
bash test-applications.sh      # apply, status flow, notifications
bash test-interviews.sh
bash test-messages.sh
bash test-analytics.sh
# If you changed the admin password:  ADMIN_PASSWORD='yourpass' bash test-applications.sh
```

## Rules for the team

- **Never commit `.env`** (it holds passwords and the JWT secret) or `node_modules/`. Only `.env.example` is committed.
- Uploaded resumes go to `server/uploads/` (created automatically, not committed).
- Do not commit real student data.

## Common problems

| Problem | Fix |
|---|---|
| `password authentication failed` | The password in `DATABASE_URL` is wrong. |
| `database "student_job_portal" does not exist` | Run the `createdb` step. |
| `JWT_SECRET` or env validation error on start | Fill in `server/.env` (copy it from `.env.example`). |
| Page is blank or "Cannot reach the server" | The server is not running. Start `npm run dev` in `server/`, then open http://localhost:4000 (not a file:// path). |
| Test script prints `Unexpected end of JSON input` | Same cause: the API is not running. |
| Port 4000 already in use | Stop the other process, or change `PORT` in `server/.env`. |
| Windows: `psql` or `createdb` is not recognized | Postgres is installed but not on PATH. Use the full path, e.g. `& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres student_job_portal`, or create the database in pgAdmin. |
| Migrate fails halfway | Drop and recreate the local database, then run `migrate` and `seed` again. |
