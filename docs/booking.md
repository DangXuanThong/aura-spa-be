# Booking Flow

The booking module covers slot search, online booking, discount application,
rescheduling, transfer, cancellation, walk-ins, check-in, technician
reassignment, and booking history.

## Customer Flow

1. Guest or customer selects a branch from public branch APIs.
2. Client loads services available at the selected branch:

```http
GET /branches/:id/services
```

3. Client loads available slots:

```http
GET /bookings/availability?branchId=1&serviceId=2&date=2026-06-25
```

4. Client optionally loads branch technicians:

```http
GET /branches/:id/technicians
```

5. Authenticated customer creates the booking:

```http
POST /bookings
Authorization: Bearer <customer-token>
```

Example payload:

```json
{
  "branchId": "1",
  "serviceId": "2",
  "technicianId": "7",
  "startTime": "2026-06-25T10:00:00+07:00",
  "notes": "Please use fragrance-free products."
}
```

6. Booking is created with:

```text
status = confirmed
source = online
paidAmount = 0
remainingAmount = effective service price
```

7. Customer can apply a discount after the booking exists:

```http
PATCH /bookings/:id/apply-discount
```

Example payload:

```json
{
  "code": "WELCOME2026"
}
```

## Booking Validation

`BookingService.create()` checks:

- branch exists and has status `active`
- service is enabled at the branch through `branch_services`
- effective duration and price from branch-service override or default service
- optional technician is active at the branch
- optional technician has an active working schedule covering the booking time
- optional technician is not already assigned to overlapping active bookings
- branch slot capacity is not full

Active statuses for capacity and technician conflicts:

```text
pending_payment
confirmed
checked_in
in_service
```

Cancelled, transferred, rescheduled, no-show, and completed bookings do not block
future slot or technician availability.

## Slot Capacity

Slot capacity comes from `booking_slot_configs.max_bookings` for the branch and
day of week. Seeded defaults:

- Monday to Saturday: 09:00 to 20:00, 60 minute step, max 3 bookings
- Sunday: 10:00 to 17:00, 60 minute step, max 2 bookings

Current caveats:

- Capacity is branch/time based, not service-specific.
- `branch_services.max_parallel_bookings` exists but is not used by booking creation.
- Capacity checks are not protected by a database lock, so exact simultaneous requests can race.

## Technician Selection

Technician selection is optional. If provided, the technician must:

- be assigned to the booking branch
- have `staff_status = active`
- have a working `StaffSchedule` covering the whole booking time
- have no overlapping active booking

`GET /branches/:id/technicians` lists active technicians at a branch. It does
not currently filter by requested booking time; final enforcement happens during
booking creation, transfer, reschedule, walk-in creation, and reassignment.

## Discount Rules

Discount application validates:

- booking belongs to the customer
- booking is `pending_payment` or `confirmed`
- no discount has already been applied
- discount code exists and is active
- promotion exists, is active, and current date is inside promotion range
- branch restriction matches when present
- total and per-customer usage limits are not exceeded
- minimum order amount is satisfied

The booking `discountAmount` and `remainingAmount` are recalculated after a
successful discount.

## Reschedule

Endpoint:

```http
PATCH /bookings/:id/reschedule
```

Allowed statuses:

```text
pending_payment
confirmed
```

Rules:

- booking must belong to the customer
- new start time must be in the future
- existing service duration and price are reused
- existing technician is retained unless a new technician is provided
- retained or new technician is revalidated for shift and conflicts
- old booking is marked `rescheduled`
- new booking is created as `confirmed`

## Transfer

Endpoint:

```http
PATCH /bookings/:id/transfer
```

Rules:

- booking must belong to the customer
- only `confirmed` bookings can be transferred
- target branch must be different and active
- original service must be available at target branch
- target branch price and duration are recalculated
- optional target technician is validated
- old booking is marked `transferred`
- new booking is created as `confirmed`

The original technician is free after transfer because `transferred` is not an
active blocking status.

## Cancel

Endpoint:

```http
PATCH /bookings/:id/cancel
```

Allowed statuses:

```text
pending_payment
confirmed
```

The booking must belong to the customer and must not have started yet. The
booking is updated to `cancelled` with optional `cancelReason` and `cancelledAt`.

## Staff Walk-In Flow

Endpoint:

```http
POST /bookings/walk-in
```

Rules:

- caller must be staff
- staff must be active at the requested branch
- branch must be active
- service must be enabled at branch
- booking date must be today
- optional technician is validated
- branch capacity is checked

Walk-in bookings start as:

```text
status = checked_in
source = walk_in
```

## Check-In And Payment

Staff can check in a confirmed booking:

```http
PATCH /bookings/:id/check-in
```

Payment is handled through invoices:

```http
POST /invoices
POST /invoices/:id/pay
```

Invoice generation is allowed for checked-in, in-service, or completed bookings.
When an invoice is generated for a non-completed booking, the booking is marked
`completed`.

## Status Lifecycle

Common paths:

```text
online booking: confirmed -> checked_in -> completed
walk-in: checked_in -> completed
cancel: confirmed -> cancelled
reschedule: confirmed -> rescheduled + new confirmed booking
transfer: confirmed -> transferred + new confirmed booking
```
