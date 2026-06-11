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

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/genAssessment.git
cd genAssessment

cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=3001
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
JWT_SECRET=any-random-secret-string
GEMINI_API_KEY=your-gemini-api-key
CLIENT_URL=http://localhost:5173
```

### 3. Run database migrations

```bash
cd server && npm run migrate
```

### 4. Start development servers

In two separate terminals:

```bash
# Terminal 1 — Backend (port 3001)
cd server && npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. **Register** as an instructor or student
2. **Instructor flow:** Upload syllabus → Generate questions → Create quiz session → Add questions → Activate → Share join code → Close → AI Grade → Release results
3. **Student flow:** Enter join code → Take quiz → View results (when released)
