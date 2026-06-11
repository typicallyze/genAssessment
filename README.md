# GenAssess — AI-Powered Quiz & Assessment Portal

A full-stack quiz platform where instructors upload syllabi, generate AI-powered questions (MCQ + subjective), and deploy timed assessments. Subjective answers are auto-graded by Gemini with score justifications. Instructors can review AI grades and override them.

## Tech Stack

- **Frontend:** React, Redux, Vite, Lucide Icons
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (Neon.tech compatible)
- **AI:** Google Gemini API

## Prerequisites

- Node.js ≥ 18
- PostgreSQL database (or a [Neon.tech](https://neon.tech) free-tier instance)
- [Gemini API key](https://aistudio.google.com/apikey)

## Local Setup

```bash
git clone https://github.com/your-username/genAssessment.git
cd genAssessment

# Install dependencies
cd server && npm install
cd ../client && npm install
```

Configure `server/.env` (copy from `.env.example`):

```env
PORT=3001
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
JWT_SECRET=any-random-secret-string
GEMINI_API_KEY=your-gemini-api-key
CLIENT_URL=http://localhost:5173
```

Run migrations and start:

```bash
cd server && npm run migrate    # one-time setup
cd server && npm run dev        # terminal 1
cd client && npm run dev        # terminal 2
```

Open [http://localhost:5173](http://localhost:5173).

---

## Deployment (Render + Vercel)

### Backend → Render (free)

1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo, set:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add environment variables:
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Your Neon.tech connection string |
   | `JWT_SECRET` | Any random secret |
   | `GEMINI_API_KEY` | Your Gemini API key |
   | `CLIENT_URL` | `https://your-app.vercel.app` (set after Vercel deploy) |
5. Deploy — note the URL (e.g. `https://genassess-api.onrender.com`)
6. Run migrations once: in Render shell, run `npm run migrate`

### Frontend → Vercel (free)

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
2. Configure:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add environment variable:
   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://genassess-api.onrender.com/api` |
4. Deploy
5. Go back to Render and update `CLIENT_URL` to your Vercel URL

## Usage

1. **Register** as an instructor or student
2. **Instructor:** Upload syllabus → Generate questions → Create session → Add questions → Activate → Share join code → Close → AI Grade → Release results
3. **Student:** Enter join code → Take quiz → View results (when released)
