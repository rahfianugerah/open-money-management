![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red?)
![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?)
![License](https://img.shields.io/badge/License-MIT-blue.svg?)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-43853D?&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-v5.x-000000?&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-336791?&logo=postgresql&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-v6.x-FF5D01?&logo=astro&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-v4.x-FF6384?&logo=chartdotjs&logoColor=white)

<div align=center>

<h3><b><a href="https://github.com/rahfianugerah/open-money-management">$_</a></b>Open Money Management
</h3>

</div>

### Project Overview

A self-hosted, offline-first personal finance application for tracking balances, recording transactions, managing multi-currency accounts, and analyzing spending patterns through visual charts and an AI-powered chatbot.


### Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Configure the Backend](#2-configure-the-backend)
  - [3. Run Database Migrations](#3-run-database-migrations)
  - [4. Start the Backend](#4-start-the-backend)
  - [5. Configure the Frontend](#5-configure-the-frontend)
  - [6. Start the Frontend](#6-start-the-frontend)
- [Environment Variables](#environment-variables)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [API Reference](#api-reference)
- [Database Migrations](#database-migrations)
- [License](#license)

### Overview

Open Money Management is a full-stack web application designed for individuals who want full control over their financial data without relying on third-party cloud services. All data is stored in a local PostgreSQL database. Currency exchange rates can be entered manually or optionally synced from an external provider. The built-in AI chatbot connects to a locally running language model, keeping every interaction private.

### Features

| Feature | Description |
|---|---|
| Authentication | Session-based login and registration with bcrypt password hashing and configurable session TTL |
| Dashboard | Consolidated financial snapshot showing totals in USD and IDR, tracked balances, and a six-month income vs. expense chart |
| Balance Management | Create, update, and delete balance entries grouped by bank or wallet and currency |
| Transaction Ledger | Record deposits, withdrawals, transfers (in/out), and currency conversions against any tracked balance |
| Multi-Currency Support | Define custom currencies, manage manual exchange rates, and perform currency conversions |
| Exchange Rate Sync | Optional integration with an external exchange rate provider (disabled by default for fully offline use) |
| Analytics | Dedicated chart page with vertical bar, pie, and line charts for income/expense trends and transaction mix |
| AI Chatbot | Conversational assistant powered by a locally hosted LLM (default: Ollama with `llama3.1:8b`) |
| Self-Hosted | No external accounts required; all data stays on your own infrastructure |

### Back-End

| Layer | Technology |
|---|---|
| Runtime | Node.js (CommonJS) |
| Framework | Express 5 |
| Database | PostgreSQL (via `pg`) |
| Authentication | Session tokens stored in the database, passwords hashed with bcrypt |
| LLM Integration | HTTP calls to a local Ollama-compatible endpoint |

### Front-End

| Layer | Technology |
|---|---|
| Framework | Astro 6 |
| Charts | Chart.js 4 |
| Language | JavaScript (client-side modules) |
| Styling | Custom CSS (`global.css`) |

---

### Project Structure

```
open-money-management/
├── backend/
│   ├── migrations/          # Ordered SQL migration files
│   └── src/
│       ├── config/          # Environment and constants
│       ├── controllers/     # Request handlers
│       ├── db/              # Database pool and migration runner
│       ├── middlewares/     # Auth and error handling
│       ├── repositories/    # Database query layer
│       ├── routes/          # Express route definitions
│       ├── services/        # Business logic
│       └── utils/           # Shared helpers and error classes
└── frontend/
    ├── public/lib/          # Client-side API module (static)
    └── src/
        ├── components/      # Astro components
        ├── layouts/         # Page layout wrappers
        ├── lib/             # Client-side API module (source)
        └── pages/           # Application pages and routes
```

### Prerequisites

- **Node.js** 22.12.0 or later
- **PostgreSQL** 14 or later
- **Ollama** (optional) — required only if you want to use the AI chatbot feature. Install from [ollama.com](https://ollama.com) and pull the desired model:
  ```bash
  ollama pull llama3.1:8b
  ```

### Getting Started

#### 1. Clone the Repository

```bash
git clone https://github.com/rahfianugerah/open-money-management.git
cd open-money-management
```

#### 2. Configure the Backend

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in your database credentials and any other settings. See [Environment Variables](#environment-variables) for a full reference.

#### 3. Run Database Migrations

The migration runner applies all SQL files in `backend/migrations/` in order. Run this once on initial setup and again whenever new migrations are added.

```bash
cd backend
npm install
npm run migrate
```

#### 4. Start the Backend

```bash
# Development (auto-reloads on file changes)
npm run dev

# Production
npm start
```

The API server listens on `http://localhost:3000` by default.

#### 5. Configure the Frontend

```bash
cd ../frontend
cp .env.example .env
```

Set `PUBLIC_API_BASE_URL` to point to your running backend (e.g. `http://localhost:3000`).

#### 6. Start the Frontend

```bash
npm install
npm run dev
```

The frontend is available at `http://localhost:4321` by default. Open it in a browser to access the application.

### Environment Variables

### Back-End

Create `backend/.env` based on `backend/.env.example`.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment (`development` or `production`) |
| `PORT` | `3000` | Port the API server listens on |
| `AUTH_SESSION_TTL_DAYS` | `90` | Number of days before a session token expires |
| `DB_URL` | — | Full PostgreSQL connection string (overrides individual DB\_\* variables when set) |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `password` | Database password |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `open-money-management` | Database name |
| `FRONTEND_ORIGIN` | `http://localhost:4321` | Allowed CORS origin for the frontend |
| `EXCHANGE_API_ENABLED` | `false` | Set to `true` to enable external exchange rate sync |
| `EXCHANGE_API_PROVIDER` | `exchangerate.host` | Exchange rate provider name |
| `EXCHANGE_API_BASE_URL` | `https://api.exchangerate.host` | Base URL of the exchange rate provider |
| `EXCHANGE_API_KEY` | — | API key for the exchange rate provider (leave empty if not required) |
| `LLM_API_URL` | `http://localhost:11434/api/generate` | URL of the local LLM inference endpoint |
| `LLM_MODEL` | `llama3.1:8b` | Model identifier passed to the LLM endpoint |
| `LLM_TIMEOUT_MS` | `20000` | Request timeout for LLM calls in milliseconds |

### Front-End

Create `frontend/.env` based on `frontend/.env.example`.

| Variable | Default | Description |
|---|---|---|
| `PUBLIC_API_BASE_URL` | `http://localhost:3000` | Base URL of the backend API |

---

### API Reference

All endpoints under `/api/*` require a valid `Authorization: Bearer <token>` header unless noted otherwise.

#### Authentication (`/api/auth`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create a new user account |
| `POST` | `/api/auth/login` | No | Authenticate and receive a session token |
| `GET` | `/api/auth/session` | Yes | Verify the current session |
| `POST` | `/api/auth/logout` | Yes | Invalidate the current session token |

#### Dashboard (`/api/dashboard`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary` | Aggregated financial snapshot (totals, balance count, income/expense chart data) |

#### Balances (`/api/balances`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/balances` | List all balances for the authenticated user |
| `POST` | `/api/balances` | Create or update a balance entry |
| `PUT` | `/api/balances/:id` | Update a specific balance |
| `DELETE` | `/api/balances/:id` | Delete a balance entry |

#### Transactions (`/api/transactions`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/transactions` | List transactions (up to 5,000 results) |
| `POST` | `/api/transactions` | Record a new transaction |
| `PUT` | `/api/transactions/:id` | Update an existing transaction |
| `DELETE` | `/api/transactions/:id` | Delete a transaction |

Supported transaction types: `deposit`, `withdrawal`, `transfer_in`, `transfer_out`, `conversion`.

#### Currencies (`/api/currencies`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/currencies` | List all currencies |
| `POST` | `/api/currencies` | Create or update a currency |
| `PUT` | `/api/currencies/:id` | Update a specific currency |
| `GET` | `/api/currencies/rates/list` | List all exchange rates |
| `POST` | `/api/currencies/rates/upsert` | Create or update an exchange rate |
| `PUT` | `/api/currencies/rates/:id` | Update a specific rate |
| `POST` | `/api/currencies/convert` | Convert an amount between two currencies |
| `GET` | `/api/currencies/provider-config` | Get the current exchange API configuration |

#### Chatbot (`/api/chatbot`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chatbot` | Send a prompt to the local LLM and receive a response |

#### Health (`/health`)

| Method | Path | Auth Required | Description |
|---|---|---|---|
| `GET` | `/health` | No | Returns API health status |

---

### Database Migrations

Migrations live in `backend/migrations/` and are named with a numeric prefix to enforce execution order. The migration runner tracks applied migrations in a `schema_migrations` table.

| File | Description |
|---|---|
| `001_initial_schema.sql` | Core tables: users, currencies, balances, transactions |
| `002_sessions_and_settings.sql` | Session storage and user settings |
| `003_seed_base_currencies.sql` | Seed data for common currencies |
| `004_remove_sessions_artifacts.sql` | Removes deprecated session columns |
| `005_update_usd_idr_rates.sql` | Updates default USD/IDR exchange rates |
| `006_auth_sessions.sql` | Dedicated auth session table |
| `007_bank_category_dimensions.sql` | Bank name and category dimensions on balances and transactions |

To add a new migration, create a file following the `NNN_description.sql` naming convention and run `npm run migrate` again.