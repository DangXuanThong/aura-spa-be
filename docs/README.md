# Aura Spa Backend Documentation

Aura Spa Backend is a NestJS API for a multi-branch spa management system. It
supports customer registration and booking, branch and service catalog browsing,
staff scheduling, walk-in handling, payments, inventory, promotions, complaints,
health records, reviews, treatment tracking, and owner/manager reporting.

Swagger is available at:

```text
GET /api/docs
```

## Document Index

- [Configuration](./config.md): environment variables, local setup, Docker, database, mail, CORS, and migrations.
- [Authentication](./auth.md): register, login, OTP verification, password reset, Google OAuth, JWT usage, and logout.
- [API Reference](./api.md): route groups, roles, and high-level endpoint map.
- [Booking Flow](./booking.md): customer booking lifecycle, slot capacity, technician rules, discounts, transfer, cancel, and check-in.
- [Operations](./operations.md): owner, manager, staff, customer, and guest workflows.
- [Seeding](./seeding.md): development seed data, credentials, branch/service setup, and bootstrap order.

## Technology

| Area | Implementation |
| --- | --- |
| Runtime | Node.js 20+ |
| Framework | NestJS 11 |
| Database | PostgreSQL with TypeORM |
| Auth | Passport JWT, Google OAuth2, bcryptjs |
| Validation | `class-validator`, global Nest `ValidationPipe` |
| Scheduling | `@nestjs/schedule`, staff schedule entities |
| Mail | Resend or console OTP mode |
| API docs | `@nestjs/swagger` |
| Tests | Jest, Supertest |

## Roles

| Role | Purpose |
| --- | --- |
| `owner` | Global administration: branches, services, promotions, manager accounts, cross-branch reports. |
| `manager` | Branch operations: staff accounts, schedules, complaints, inventory, branch reports, technician reassignment. |
| `staff` | Day-to-day service work: schedule registration, check-in, walk-in bookings, health records, invoices/payments. |
| `customer` | Booking, profile, treatment tracking, reviews, discounts, booking history. |
| Guest | Public catalog browsing and guest conversation/inquiry submission. |

## Application Shape

The root module wires the application in `src/app.module.ts`:

- `AuthModule`, `UserModule`
- `BranchModule`, `ServiceModule`, `BranchServiceModule`
- `BookingModule`, `PromotionModule`, `PaymentModule`
- `ScheduleModule`, `InventoryModule`, `ReportModule`
- `HealthModule`, `TreatmentModule`, `ReviewModule`
- `CommunicationModule`
- `SeederModule`

Global behavior is configured in `src/main.ts`:

- request validation strips unknown DTO fields
- unknown DTO fields are rejected
- DTO transformation is enabled
- HTTP exceptions are normalized by `HttpExceptionFilter`
- CORS allows `http://localhost:3000` and `http://127.0.0.1:3000`
- Swagger is served at `/api/docs`

## Local Commands

```bash
npm install
npm run start:dev
npm run build
npm run lint
npm test
npm run test:e2e
npm run migration:run
```

Use `.env.example` as the source of environment variable names. Do not commit
real `.env` values.

## API Conventions

Protected routes use:

```http
Authorization: Bearer <accessToken>
```

Most module routes return DTO objects directly. Auth routes return the shared
`ApiResponse<T>` success shape through `buildSuccessResponse()`.

The app uses bigint database IDs as strings in TypeScript to avoid JavaScript
precision loss.

## Current Caveats

- Booking capacity checks are application-level checks. They are not protected by a database lock, so exact concurrent requests can still race.
- `branch_services.max_parallel_bookings` exists, but booking capacity currently uses branch slot config `maxBookings`.
- Discount codes are applied after a booking exists through `PATCH /bookings/:id/apply-discount`.
- The code reads `POSTGRES_NAME` for the database name, while `.env.example` currently shows `POSTGRES_DB`.
