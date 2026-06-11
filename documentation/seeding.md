# Seeding

The application automatically seeds initial data into the database on startup via `SeederService`, which implements `onApplicationBootstrap`. Seeding only runs when `NODE_ENV` is not `production`. All seed methods are idempotent — they check for existing records before inserting, so restarting the server will never create duplicates.

## Sequence Diagram

```mermaid
sequenceDiagram
  autonumber
  participant App as App #1
  participant SS as SeederService #2
  participant DB as Database #3

  #1: App - The NestJS application that triggers seeding after all modules are initialized.
  #2: SeederService - Runs each seed method in order on application bootstrap.
  #3: Database - PostgreSQL database that stores the seeded records.

  #1: App->>+SS: onApplicationBootstrap()
  Note over SS: Skips entirely if NODE_ENV=production

  #2: SS->>+DB: findOne({ where: { email } }) — check owner exists
  alt Owner does not exist
    DB-->>SS: null
    SS->>DB: save(owner account)
    DB-->>SS: saved
  else Owner already exists
    DB-->>-SS: existing record — skip
  end

  #2: SS->>+DB: findOne per customer email — check each exists
  alt Customer does not exist
    DB-->>SS: null
    SS->>DB: save(customer)
    DB-->>SS: saved
  else Already exists
    DB-->>-SS: existing record — skip
  end

  #2: SS->>+DB: findOne per staff email — check each exists
  alt Staff does not exist
    DB-->>SS: null
    SS->>DB: save(staff)
    DB-->>SS: saved
  else Already exists
    DB-->>-SS: existing record — skip
  end

  #2: SS->>+DB: findOne per branch code — check each exists
  alt Branch does not exist
    DB-->>SS: null
    SS->>DB: save(branch)
    DB-->>SS: saved
  else Already exists
    DB-->>-SS: existing record — skip
  end

  #2: SS->>+DB: findOne per service code — check each exists
  alt Service does not exist
    DB-->>SS: null
    SS->>DB: save(service)
    DB-->>SS: saved
  else Already exists
    DB-->>-SS: existing record — skip
  end

  SS-->>-App: Seeding complete
```

## Seeded Data

### Owner Account

The owner account is the only admin user and must exist before any branch or service can be created via the API. Credentials are hardcoded in the seeder for development convenience.

| Field     | Value                  |
|-----------|------------------------|
| Full name | System Owner           |
| Email     | owner@gmail.com        |
| Password  | 12345678qwerty         |
| Role      | `owner`                |
| Status    | `active`               |

> ⚠️ Change these credentials before deploying to any shared or production environment.

---

### Customers

5 dummy customer accounts for testing booking flows and customer-facing features. All share the same password.

| Full Name       | Email                    | Phone       | Gender |
|-----------------|--------------------------|-------------|--------|
| Nguyen Thi Lan  | lan.nguyen@gmail.com     | 0901111001  | Female |
| Tran Van Minh   | minh.tran@gmail.com      | 0901111002  | Male   |
| Le Thi Hoa      | hoa.le@gmail.com         | 0901111003  | Female |
| Pham Quoc Bao   | bao.pham@gmail.com       | 0901111004  | Male   |
| Hoang Thi Mai   | mai.hoang@gmail.com      | 0901111005  | Female |

**Password:** `Customer123!`

---

### Staff

3 dummy staff accounts for testing staff assignment and scheduling features.

| Full Name       | Email                      | Phone       | Gender |
|-----------------|----------------------------|-------------|--------|
| Vo Thi Thu      | thu.vo@aura-spa.com        | 0902222001  | Female |
| Nguyen Van Duc  | duc.nguyen@aura-spa.com    | 0902222002  | Male   |
| Tran Thi Bich   | bich.tran@aura-spa.com     | 0902222003  | Female |

**Password:** `Staff123!`

---

### Branches

3 branches across Ho Chi Minh City and Hanoi.

| Code    | Name                   | City              | District   | Phone       |
|---------|------------------------|-------------------|------------|-------------|
| HCM-Q1  | Aura Spa – Quận 1      | Ho Chi Minh City  | Quan 1     | 0283001001  |
| HCM-Q7  | Aura Spa – Quận 7      | Ho Chi Minh City  | Quan 7     | 0283001002  |
| HAN-HK  | Aura Spa – Hoàn Kiếm   | Hanoi             | Hoan Kiem  | 0243001001  |

All branches are seeded with status `active`.

---

### Services

5 services across 3 categories.

| Code            | Name                      | Category | Duration | Price (VND) | Multi-session | Sessions |
|-----------------|---------------------------|----------|----------|-------------|---------------|----------|
| SVC-FACIAL-001  | Chăm sóc da mặt cơ bản   | Facial   | 60 min   | 350,000     | No            | —        |
| SVC-FACIAL-002  | Trị liệu da chuyên sâu   | Facial   | 90 min   | 650,000     | Yes           | 5        |
| SVC-BODY-001    | Massage body thư giãn    | Body     | 90 min   | 500,000     | No            | —        |
| SVC-BODY-002    | Tắm trắng toàn thân      | Body     | 120 min  | 800,000     | Yes           | 10       |
| SVC-NAIL-001    | Làm nail cơ bản          | Nail     | 45 min   | 200,000     | No            | —        |

All services are seeded with status `active`.
