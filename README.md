# SudaFarm (Sudan Farmers)

SudaFarm is a platform connecting **Sudanese farmers (المزارعون)** with **agricultural traders (التجار)**.

- **Farmers** can browse traders, see offerings/prices, and contact traders directly.
- **Traders** can offer agricultural supplies (seeds/grains, sacks, fertilizers, etc.) and buy crops from farmers.
- Every farmer and trader account includes direct **WhatsApp**, **phone call**, or **both** contact options.

## Tech Stack

- **Monorepo**: Turborepo + pnpm
- **Backend**: Django + django-ninja (`apps/api`, managed with `uv`)
- **Frontend**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui (`apps/web`)

## Step 1: Farmer & Trader Accounts

### Account Types

Each user account has an `account_type`:

| Type | Arabic Label | Role |
| --- | --- | --- |
| `farmer` | مزارع | Browse traders and their offerings, and be reachable by traders for crop purchases |
| `trader` | تاجر | Offer supplies (grains, sacks, etc.) and connect with farmers to buy crops |

### Communication Channels

Every account configures how others can reach them:

- `allow_whatsapp` + `whatsapp_number`: Enables a direct WhatsApp link (`https://wa.me/...`).
- `allow_call` + `call_phone`: Enables a direct phone call link (`tel:...`).
- Users can enable **WhatsApp only**, **Call only**, or **both** (at least one must be enabled).

### API Endpoints

- `GET /api/auth/csrf` — Get CSRF token
- `POST /api/auth/register` — Register a new `farmer` or `trader` account
- `POST /api/auth/login` — Log in with `username` or `phone`
- `POST /api/auth/logout` — Log out
- `GET /api/auth/me` — Get current authenticated user profile
- `PUT /api/auth/profile` — Update current user's profile and contact channels
- `GET /api/auth/directory?account_type=farmer|trader` — List active farmers and traders with their contact channels

## Demo Data & Demo Accounts

Run migrations and seed the demo Sudan locations, farmers, and traders:

```bash
cd apps/api
uv run manage.py migrate
uv run manage.py seed_demo
```

The `seed_demo` command is idempotent and creates the following demo accounts for testing:

| Role | Username | Phone | Password | Name | Location | Contact Channels |
| --- | --- | --- | --- | --- | --- | --- |
| Farmer | `farmer1` | `+249911111111` | `demo1234` | أحمد محمد إبراهيم | الجزيرة - ود مدني | WhatsApp + Call |
| Farmer | `farmer2` | `+249922222222` | `demo1234` | عثمان عبد الله حسن | القضارف - القضارف | Call only |
| Trader | `trader1` | `+249933333333` | `demo1234` | شركة النيل للمستلزمات الزراعية | الخرطوم - أمدرمان | WhatsApp + Call |
| Trader | `trader2` | `+249944444444` | `demo1234` | سوق البركة للتجارة الزراعية | البحر الأحمر - بورتسودان | WhatsApp only |

You can also click any of the demo account buttons on the `/login` page to auto-fill credentials during testing.

## Running Locally

1. **Backend (`apps/api`)**:

   ```bash
   cd apps/api
   uv run manage.py migrate
   uv run manage.py seed_demo
   uv run manage.py runserver
   ```

2. **Frontend (`apps/web`)**:

   ```bash
   pnpm install
   pnpm dev
   ```

## Adding UI Components

To add shadcn/ui components to the `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```
