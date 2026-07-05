# Configuration

Configuration is loaded globally through `ConfigModule.forRoot()` in
`src/app.module.ts`. Database settings are produced by
`src/config/database.config.ts`.

Use `.env.example` as the reference for local environment variables. Do not
commit real `.env` values.

## Required Runtime Variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `PORT` | HTTP port for Nest app | `3100` |
| `NODE_ENV` | Runtime environment | `development` |
| `JWT_SECRET` | JWT signing secret | `your-secret-here` |
| `JWT_EXPIRES_IN` | JWT lifetime | `7d` |
| `POSTGRES_HOST` | PostgreSQL host | `localhost`, `0.0.0.0`, `database` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_USER` | PostgreSQL user | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgres` |
| `POSTGRES_DB` | PostgreSQL database name | `aura_spa` |
| `POSTGRES_SSL` | Enable database SSL when `true`; Neon hosts enable SSL automatically | `false` |

## Mail Variables

| Variable | Purpose |
| --- | --- |
| `MAIL_DRIVER` | `console` for log-only OTP, `resend` for real email. |
| `RESEND_API_KEY` | Resend API key when `MAIL_DRIVER=resend`. |
| `MAIL_FROM` | Sender email address. |
| `MAIL_FROM_NAME` | Sender display name. |

Recommended development setting:

```env
MAIL_DRIVER=console
```

This logs OTP codes in the backend logs and avoids requiring a verified email
domain during local development.

## Google OAuth Variables

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret. |
| `GOOGLE_CALLBACK_URL` | Backend callback URL, normally `http://localhost:3100/auth/google/callback`. |
| `FRONTEND_URL` | Frontend URL used after OAuth callback. |

## Staff Defaults

| Variable | Purpose |
| --- | --- |
| `DEFAULT_STAFF_PASSWORD` | Initial password assigned to staff and manager accounts created by branch managers or owner flows. |

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create local env file from example and set real values:

```bash
cp .env.example .env
```

3. Start PostgreSQL locally or through Docker.

4. Run migrations:

```bash
npm run migration:run
```

5. Start API:

```bash
npm run start:dev
```

6. Open Swagger:

```text
http://localhost:3100/api/docs
```

## Docker

The project includes `Dockerfile` and `docker-compose.yml`.

Useful commands:

```bash
npm run docker:build
npm run docker:up
npm run docker:down
```

The compose file reads database settings from `.env`. Use
`POSTGRES_HOST=database` when the app container should connect to the compose
PostgreSQL service, or set a remote host such as Neon when the app should use
that database instead.

Port mappings:

```text
127.0.0.1:3100 -> app
127.0.0.1:5432 -> postgres
```

## Database

TypeORM options:

- database type: `postgres`
- entities: `dist/**/*.entity.js`
- migrations: `dist/database/migrations/*.js`
- `synchronize: false`
- `migrationsRun: false`

Schema changes should be done with migrations, not automatic synchronization.

Migration commands:

```bash
npm run migration:generate -- src/database/migrations/<MigrationName>
npm run migration:run
npm run migration:revert
```

## CORS

The app allows browser requests from:

```text
http://localhost:3000
http://127.0.0.1:3000
```

Credentials are enabled. Allowed methods are:

```text
GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS
```

Allowed request headers:

```text
Content-Type, Authorization
```

## Validation

Global `ValidationPipe` settings:

| Setting | Behavior |
| --- | --- |
| `whitelist: true` | Removes DTO fields not declared in the DTO class. |
| `forbidNonWhitelisted: true` | Rejects requests containing unknown DTO fields. |
| `transform: true` | Converts request payloads into DTO instances where possible. |

## Swagger

Swagger is configured in `src/main.ts` with:

- title: `AURA SPA API`
- version: `1.0.0`
- bearer auth scheme name: `access-token`

Open:

```text
GET /api/docs
```

## Verification Commands

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

Known test caveat: the existing E2E test file may be stale if it still imports
removed starter files such as `src/app.controller.ts`.
