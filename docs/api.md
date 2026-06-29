# API Reference

This page lists the route surface by feature area. For request and response DTO
schemas, use Swagger at `/api/docs`.

Protected routes require:

```http
Authorization: Bearer <accessToken>
```

## Auth

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Register customer account and send OTP. |
| `POST` | `/auth/login` | Public | Login and receive JWT. |
| `POST` | `/auth/logout` | Authenticated | Stateless logout. |
| `GET` | `/auth/me` | Authenticated | Current profile. |
| `PATCH` | `/auth/me` | Authenticated | Update profile. |
| `POST` | `/auth/verify-email` | Public | Activate account with OTP. |
| `POST` | `/auth/resend-otp` | Public | Resend register OTP. |
| `POST` | `/auth/forgot-password` | Public | Send password reset OTP. |
| `POST` | `/auth/reset-password` | Public | Reset password with OTP. |
| `GET` | `/auth/google` | Public | Start Google OAuth. |
| `GET` | `/auth/google/callback` | Public | Complete Google OAuth. |

## Public Catalog

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/branches` | Active branches, optional `status` and `search`. |
| `GET` | `/branches/by-code/:code` | Branch by code. |
| `GET` | `/branches/by-city/:city` | Branches by city. |
| `GET` | `/branches/nearby` | Branches near `latitude`, `longitude`, optional `radius`. |
| `GET` | `/branches/:id` | Branch detail. |
| `GET` | `/branches/:id/opening-hours` | Opening hours. |
| `GET` | `/branches/:id/services` | Enabled services at branch with effective price and duration. |
| `GET` | `/branches/:id/technicians` | Active technicians assigned to branch. |
| `GET` | `/services` | Active services, optional status. |
| `GET` | `/services/by-code/:code` | Service by code. |
| `GET` | `/services/by-slug/:slug` | Service by slug. |
| `GET` | `/services/category/:category` | Services by category. |
| `GET` | `/services/:id` | Service detail. |
| `GET` | `/promotions` | Active/current promotions, optional status and branch filter. |
| `GET` | `/promotions/:id` | Promotion detail. |
| `GET` | `/bookings/availability` | Available slots for `branchId`, `serviceId`, and `date`. |

## Branch-Service Mapping

The `branch-services` controller currently has no guard at controller level.
Treat these routes carefully if exposing the API publicly.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/branch-services` | Create branch-service mapping. |
| `GET` | `/branch-services` | List mappings, optional `branchId` and `serviceId`. |
| `GET` | `/branch-services/branch/:branchId` | Services for branch. |
| `GET` | `/branch-services/service/:serviceId` | Branches offering service. |
| `GET` | `/branch-services/:id` | Mapping detail. |
| `GET` | `/branch-services/branch/:branchId/service/:serviceId` | Specific branch-service mapping. |
| `PATCH` | `/branch-services/:id` | Update mapping. |
| `DELETE` | `/branch-services/:id` | Delete mapping. |
| `DELETE` | `/branch-services/branch/:branchId/service/:serviceId` | Delete specific mapping. |

## Customer

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/bookings` | Create online booking. |
| `GET` | `/bookings/my` | Customer booking history. |
| `GET` | `/bookings/:id` | Booking detail for owner or internal roles. |
| `PATCH` | `/bookings/:id/reschedule` | Reschedule booking. |
| `PATCH` | `/bookings/:id/transfer` | Transfer booking to another branch. |
| `PATCH` | `/bookings/:id/cancel` | Cancel booking. |
| `PATCH` | `/bookings/:id/apply-discount` | Apply discount code after booking exists. |
| `GET` | `/treatment-courses/my` | Customer treatment progress. |
| `GET` | `/treatment-courses/:id` | Treatment course detail. |
| `POST` | `/reviews` | Submit review for completed booking. |
| `GET` | `/reviews/my` | Customer reviews. |

## Staff

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/bookings/walk-in` | Create same-day walk-in booking. |
| `PATCH` | `/bookings/:id/check-in` | Check in confirmed customer. |
| `GET` | `/health-records/customer/:customerId` | View customer health records. |
| `PUT` | `/health-records/customer/:customerId` | Create/update health record for branch. |
| `POST` | `/schedule-requests` | Submit work schedule, day-off, or leave request. |
| `GET` | `/schedule-requests/timetable` | Staff timetable with assigned appointments. |
| `GET` | `/schedule-requests/my` | Staff schedule requests. |
| `POST` | `/invoices` | Generate invoice for checked-in/in-service/completed booking. |
| `POST` | `/invoices/:id/pay` | Record counter payment. |
| `GET` | `/invoices/:id` | Invoice detail. |
| `GET` | `/conversations` | Staff/owner inbox. |
| `PATCH` | `/conversations/:id` | Update conversation. |
| `POST` | `/conversations/:id/reply` | Staff/owner reply. |

## Manager

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/branches/:branchId/staff` | List branch staff. |
| `GET` | `/branches/:branchId/staff/:userId` | Staff detail. |
| `POST` | `/branches/:branchId/staff` | Create staff account. |
| `PATCH` | `/branches/:branchId/staff/:userId` | Update staff account or position. |
| `PATCH` | `/branches/:branchId/staff/:userId/deactivate` | Deactivate branch staff. |
| `GET` | `/branches/:branchId/slot-configs` | List booking slot configs. |
| `PATCH` | `/branches/:branchId/slot-configs/:id` | Update slot config. |
| `GET` | `/schedule-requests/branch/:branchId` | List branch schedule requests. |
| `PATCH` | `/schedule-requests/:id/approve` | Approve schedule request and create schedule. |
| `PATCH` | `/schedule-requests/:id/reject` | Reject schedule request. |
| `PATCH` | `/bookings/:id/reassign-technician` | Reassign booking technician. |
| `GET` | `/inventory/branch/:branchId` | View branch inventory. |
| `POST` | `/inventory/branch/:branchId/import` | Import stock. |
| `POST` | `/inventory/branch/:branchId/consume` | Consume stock. |
| `POST` | `/inventory/branch/:branchId/stock-check` | Stock check adjustment. |
| `GET` | `/complaints/branch/:branchId` | List branch complaints. |
| `GET` | `/complaints/:id` | Complaint detail. |
| `PATCH` | `/complaints/:id/resolve` | Resolve complaint. |
| `PATCH` | `/complaints/:id/reject` | Reject complaint. |
| `GET` | `/reports/branch/:branchId` | Branch performance report. |

## Owner

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/branches` | Create branch. |
| `GET` | `/branches/all` | List all branches, including inactive and maintenance. |
| `PATCH` | `/branches/:id` | Update branch. |
| `DELETE` | `/branches/:id` | Delete branch. |
| `POST` | `/services` | Create service. |
| `GET` | `/services/all` | List all services. |
| `PATCH` | `/services/:id` | Update service. |
| `DELETE` | `/services/:id` | Delete service. |
| `POST` | `/promotions` | Create promotion. |
| `GET` | `/promotions/all` | List all promotions. |
| `PATCH` | `/promotions/:id` | Update promotion. |
| `DELETE` | `/promotions/:id` | Delete promotion. |
| `GET` | `/promotions/:id/discount-codes` | List promotion discount codes. |
| `POST` | `/promotions/:id/discount-codes` | Create discount code. |
| `PATCH` | `/promotions/:id/discount-codes/:codeId` | Update discount code. |
| `DELETE` | `/promotions/:id/discount-codes/:codeId` | Delete discount code. |
| `GET` | `/branches/:branchId/managers` | List branch managers. |
| `POST` | `/branches/:branchId/managers` | Create manager. |
| `PATCH` | `/branches/:branchId/managers/:userId` | Update manager. |
| `PATCH` | `/branches/:branchId/managers/:userId/deactivate` | Deactivate manager. |
| `GET` | `/reports/revenue-dashboard` | Cross-branch revenue dashboard. |
| `GET` | `/reports/rankings/staff` | Top staff rankings. |
| `GET` | `/reports/rankings/services` | Service rankings. |
| `GET` | `/reports/rankings/branches` | Branch rankings. |

## Guest Communication

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/conversations` | Start guest inquiry. |
| `GET` | `/conversations/:id` | Conversation detail by ID. |
| `GET` | `/conversations/:id/messages` | Messages in conversation. |
| `POST` | `/conversations/:id/messages` | Send guest message. |
