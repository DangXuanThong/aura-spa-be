# Clean Demo Accounts

Run from `aura-spa-be`:

```bash
npm run seed:clean-accounts
```

To also suspend the old seeded demo users and deactivate their branch assignments:

```bash
npm run seed:clean-accounts -- --cleanup-legacy
```

The cleanup only targets known seed emails from `seed-data.ts`. Before suspending those users, it migrates seeded business references such as bookings, reviews, schedules, invoices, payments, health records, conversations, complaints, inventory transactions, and treatment data to the matching clean demo accounts. It does not touch registered test customers such as walk-in or manually created accounts.

## Passwords

| Role | Password |
| --- | --- |
| Owner | `Owner123!` |
| Manager | `Manager123!` |
| Staff | `Staff123!` |
| Customer | `Customer123!` |

## Owner

| Email | Notes |
| --- | --- |
| `owner@demo.auraspa.local` | System owner |

## Managers

Each manager is assigned to exactly one branch.

| Branch | Email |
| --- | --- |
| `HCM-Q1` | `manager.hcmq1@demo.auraspa.local` |
| `HCM-Q7` | `manager.hcmq7@demo.auraspa.local` |
| `HAN-HK` | `manager.hanhk@demo.auraspa.local` |
| `DAN-HC` | `manager.danhc@demo.auraspa.local` |
| `DAN-MK` | `manager.danmk@demo.auraspa.local` |
| `DAN-NHS` | `manager.dannhs@demo.auraspa.local` |

## Staff

| Branch | Email |
| --- | --- |
| `HCM-Q1` | `tech.hcmq1.a@demo.auraspa.local` |
| `HCM-Q1` | `tech.hcmq1.b@demo.auraspa.local` |
| `HCM-Q7` | `tech.hcmq7.a@demo.auraspa.local` |
| `HAN-HK` | `tech.hanhk.a@demo.auraspa.local` |
| `DAN-HC` | `tech.danhc.a@demo.auraspa.local` |
| `DAN-MK` | `tech.danmk.a@demo.auraspa.local` |
| `DAN-NHS` | `tech.dannhs.a@demo.auraspa.local` |

## Customers

| Email |
| --- |
| `customer.one@demo.auraspa.local` |
| `customer.two@demo.auraspa.local` |
| `customer.three@demo.auraspa.local` |
| `customer.four@demo.auraspa.local` |
| `customer.five@demo.auraspa.local` |
