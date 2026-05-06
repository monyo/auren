# AUREN

**Anonymous, Unique, Real, Exchange, Network**

AI 時代的真人可信交流平台。當 AI 生成內容變得無限便宜，真人討論成為稀缺資產。

## 核心理念

後端實名、前端匿名。對平台：經過驗證的真實唯一身份。對其他用戶：完全匿名。

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL + Drizzle ORM
- **Cache / Rate limiting**: Redis
- **Auth**: Phone OTP + JWT (jose)
- **Styling**: Tailwind CSS v3

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis

### Setup

```bash
npm install
```

Copy the env template and fill in your values:

```bash
cp .env.example .env.local
```

Run database migrations:

```bash
npx drizzle-kit migrate
```

Start the dev server:

```bash
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing session tokens |
| `PHONE_HASH_SALT` | Salt for one-way phone number hashing |
| `TWILIO_ACCOUNT_SID` | Twilio SID (optional in dev — OTP logs to console) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender number |

## Privacy Architecture

Identity verification and forum content are separated by design:

```
[Verification service]        [Forum service]
Phone number                  Only knows Token ID
    ↓                               ↓
  Token ←―――――――――――――→  Posts, replies, boards
```

Tokens expire after 30 days. After expiry, even the platform cannot link content back to a real identity.

## License

MIT
