# DevPulse — Backend (Assignment A2)

Simple issue tracker backend implementing assignment requirements.

## Technology
- Node.js, TypeScript, Express
- PostgreSQL (`pg`), raw SQL only
- `bcrypt` for password hashing
- `jsonwebtoken` for JWT auth

## Quick Start
1. Copy env example:

```bash
cp .env.example .env
```

2. Edit `.env` and set `DATABASE_URL` and `JWT_SECRET`.

3. Install and build:

```bash
npm install
npm run build
```

4. Run:

```bash
npm start
```

Server runs at `http://localhost:5000` by default.

## API Endpoints

Authentication
- `POST /api/auth/signup` — Register
- `POST /api/auth/login` — Login (returns `token`)

Issues
- `POST /api/issues` — Create issue (Auth required)
- `GET /api/issues` — List issues (public) supports `sort`, `type`, `status` query
- `GET /api/issues/:id` — Get single issue (public)
- `PATCH /api/issues/:id` — Update issue (Auth required)
- `DELETE /api/issues/:id` — Delete issue (Maintainer only)

## Example curl

Register:
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"pass123","role":"contributor"}'
```

Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'
```

Create issue:
```bash
curl -X POST http://localhost:5000/api/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Bug title","description":"Detailed description...","type":"bug"}'
```

List issues:
```bash
curl "http://localhost:5000/api/issues?sort=newest&status=open"
```

## Final Submission Checklist
- [ ] `npm run build` succeeds
- [ ] `.env` configured with a working `DATABASE_URL`
- [ ] Tested `signup` and `login` (token issuance)
- [ ] Tested issue create/list/get/update/delete flows
- [ ] Live deployment tested in incognito before submission

---

If you want, run these to commit and push:

```bash
git add README.md
git commit -m "Add README with usage, examples, and checklist"
git push origin main
```
