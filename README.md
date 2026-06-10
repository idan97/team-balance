# TeamBalance ⚽

Fair matches, every time. A web app for organising balanced football games — manage players, generate teams by skill rating and position, and share match lineups.

**Live app:** https://team-balance-ashy.vercel.app

## Features

- **Player roster** — add players with positions (GK, CB, DEF, MID, STR) and skill ratings (1–7)
- **CSV import** — bulk-upload players from a spreadsheet
- **Smart team balancing** — multi-phase algorithm balances skill ratings and positions (formation-aware, handles pre-assignments and friend groups)
- **Match management** — create, view, edit, and delete matches; manually swap players between teams
- **WhatsApp share** — one-tap share of the final lineups
- **Game management** — multiple games/squads, shareable with other Google accounts
- **Google sign-in** — free, no passwords

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| Backend/DB | Supabase (PostgreSQL + Auth) |
| Auth | Google OAuth via Supabase |
| Hosting | Vercel (free Hobby tier) |

## Local development

### Prerequisites
- Node.js 20+
- A Supabase project (free tier works)

### Setup

```bash
git clone https://github.com/idan97/team-balance
cd team-balance
npm install
cp .env.example .env
```

Fill in `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Apply the database schema:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

Run locally:
```bash
npm run dev
```

## Deployment

The app auto-deploys to Vercel on every push to `main`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project settings.
