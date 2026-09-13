# AI Study Companion

An AI-powered full-stack web application for students. Upload study materials, ask questions, generate quizzes, and track learning progress.

## Tech Stack

**Backend:** Node.js · Express · MongoDB · Redis · Kafka · JWT · OpenAI  
**Frontend:** Next.js 14 · TypeScript · Tailwind CSS · React Query · Zustand

## Quick Start

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Backend
cd backend
cp .env.example .env        # Fill in OPENAI_API_KEY and JWT secrets
npm install
npm run dev

# 3. Frontend
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

## Features

- **Document Upload** — PDF, TXT, MD, DOCX with async text extraction
- **AI Q&A** — Context-aware answers via OpenAI GPT-4
- **Redis Caching** — Instant responses for repeated questions
- **Quiz Generation** — Auto-generated MCQs at 3 difficulty levels
- **Analytics** — Weak topic detection, score trends, daily streaks
- **JWT Auth** — Secure login with access + refresh tokens
- **Kafka Events** — Event-driven notifications between services
