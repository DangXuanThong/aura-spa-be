# Operations

This page groups the non-auth and non-basic booking workflows by role.

## Owner Workflows

Owner is the global administrator.

### Branch Management

Owner routes:

- `POST /branches`
- `GET /branches/all`
- `PATCH /branches/:id`
- `DELETE /branches/:id`

Public branch routes only show normal catalog data. `GET /branches/all` is the
owner route for all statuses such as `active`, `inactive`, `maintenance`, and
`closed`.

### Service Management

Owner routes:

- `POST /services`
- `GET /services/all`
- `PATCH /services/:id`
- `DELETE /services/:id`

Service statuses include:

```text
draft
active
inactive
archived
```

### Promotion And Discount Code Management

Owner routes:

- `POST /promotions`
- `GET /promotions/all`
- `PATCH /promotions/:id`
- `DELETE /promotions/:id`
- `GET /promotions/:id/discount-codes`
- `POST /promotions/:id/discount-codes`
- `PATCH /promotions/:id/discount-codes/:codeId`
- `DELETE /promotions/:id/discount-codes/:codeId`

Promotion validation is used later by customer discount application.

### Manager Accounts

Owner routes:

- `GET /branches/:branchId/managers`
- `POST /branches/:branchId/managers`
- `PATCH /branches/:branchId/managers/:userId`
- `PATCH /branches/:branchId/managers/:userId/deactivate`

Created managers are assigned to a branch through `branch_staff`.

### Reports

Owner-only reports:

- `GET /reports/revenue-dashboard`
- `GET /reports/rankings/staff`
- `GET /reports/rankings/services`
- `GET /reports/rankings/branches`

Common query parameters:

- `from`: ISO date
- `to`: ISO date
- `limit`: ranking max result count, 1 to 50
- `granularity`: revenue trend bucket for dashboard

## Manager Workflows

Managers operate within their assigned branch.

### Staff Management

Manager routes:

- `GET /branches/:branchId/staff`
- `GET /branches/:branchId/staff/:userId`
- `POST /branches/:branchId/staff`
- `PATCH /branches/:branchId/staff/:userId`
- `PATCH /branches/:branchId/staff/:userId/deactivate`

New staff accounts use `DEFAULT_STAFF_PASSWORD` from environment config.

Staff positions:

```text
technician
receptionist
manager
```

### Slot Configs

Manager routes:

- `GET /branches/:branchId/slot-configs`
- `PATCH /branches/:branchId/slot-configs/:id`

Slot configs define:

- day of week
- opening booking time range
- slot step minutes
- maximum parallel bookings
- effective date range

### Schedule Approval

Staff submit schedule requests. Managers approve or reject.

Manager routes:

- `GET /schedule-requests/branch/:branchId`
- `PATCH /schedule-requests/:id/approve`
- `PATCH /schedule-requests/:id/reject`

Approval creates an active `StaffSchedule` based on the request type:

- work shift -> working schedule
- day off -> day-off schedule
- leave -> leave schedule

### Technician Reassignment

Manager route:

```http
PATCH /bookings/:id/reassign-technician
```

Rules:

- manager must be active at the booking branch
- booking must be pending payment, confirmed, checked in, or in service
- new technician must be active at the branch
- new technician must have a working shift covering the appointment
- new technician must not have overlapping active bookings

### Complaints

Manager routes:

- `GET /complaints/branch/:branchId`
- `GET /complaints/:id`
- `PATCH /complaints/:id/resolve`
- `PATCH /complaints/:id/reject`

Managers can filter branch complaints by status.

### Inventory

Manager routes:

- `GET /inventory/branch/:branchId`
- `POST /inventory/branch/:branchId/import`
- `POST /inventory/branch/:branchId/consume`
- `POST /inventory/branch/:branchId/stock-check`

Inventory transactions are linked to branch, item, optional service, optional
booking, staff, and creator where applicable.

### Branch Reports

Manager route:

```http
GET /reports/branch/:branchId
```

The caller must be active at the branch. The report includes revenue summary and
staff performance for the selected period.

## Staff Workflows

### Work Schedule

Staff routes:

- `POST /schedule-requests`
- `GET /schedule-requests/my`
- `GET /schedule-requests/timetable`
- `PATCH /schedule-requests/:id/cancel`

Timetable returns shifts and assigned bookings over a date range.

### Customer Check-In And Walk-In

Staff routes:

- `PATCH /bookings/:id/check-in`
- `POST /bookings/walk-in`

Walk-ins start as checked in. Online bookings must be confirmed before check-in.

### Health Records

Staff routes:

- `GET /health-records/customer/:customerId`
- `PUT /health-records/customer/:customerId`

Upsert requires staff to be active at the branch in the request body.

### Invoices And Payments

Staff routes:

- `POST /invoices`
- `POST /invoices/:id/pay`
- `GET /invoices/:id`

Invoice generation creates invoice items from booked services and marks the
booking completed when needed. Payment recording updates invoice and booking
paid/remaining amounts.

## Customer Workflows

Customer routes:

- profile: `/auth/me`
- booking: `/bookings`, `/bookings/my`, `/bookings/:id/...`
- treatment progress: `/treatment-courses/my`, `/treatment-courses/:id`
- reviews: `/reviews`, `/reviews/my`

See [Booking Flow](./booking.md) for the full booking lifecycle.

## Guest Workflows

Guests can browse branches, services, promotions, branch services, availability,
and conversations.

Guest conversation routes:

- `POST /conversations`
- `GET /conversations/:id`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages`

The conversation ID is the guest tracking handle.
