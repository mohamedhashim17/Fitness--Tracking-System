# FITNEX – Smart Fitness Tracker

A full-stack commercial-grade dark-themed fitness tracking platform built with **React**, **Tailwind CSS**, **Recharts**, **Lucide React**, **Node.js**, **Express.js**, and **MongoDB**.

## Architecture & Folder Structure

```
FitNess/
├── package.json
├── README.md
├── server/
│   ├── .env / .env.example
│   ├── server.js               # Express entry point & middleware
│   ├── config/db.js            # MongoDB URI connector + dev embedded MongoDB fallback
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT Bearer verification
│   │   └── errorMiddleware.js  # Validation & centralized error handling
│   ├── models/                 # User, Workout, NutritionLog, DailyActivity, Goal, BodyMetric, Notification
│   ├── routes/                 # auth, dashboard, workouts, nutrition, goals, metrics, analytics, ai, leaderboard
│   ├── utils/                  # dateUtils, streakUtils, goalSync, aiEngine, seedData
│   └── tests/api.test.js       # Automated end-to-end REST API test suite
└── client/
    ├── vite.config.js          # Vite + Tailwind v4 + /api proxy
    └── src/
        ├── api/client.js       # Axios instance + JWT interceptor
        ├── context/            # AuthContext & ToastContext
        ├── components/         # Layout, StatCard, Modal, LoadingSpinner, ProtectedRoute
        └── pages/              # Auth, Dashboard, Workouts, Nutrition, Goals, Metrics, Analytics, AI Coach, Leaderboard, Profile
```

## Setup & Run Instructions

### 1. Configure Environment
Update `server/.env` if connecting to a local MongoDB instance or MongoDB Atlas cluster (`MONGODB_URI`).  
*(In development mode, if local `mongod` is not running, the backend automatically starts an embedded MongoDB server via `mongodb-memory-server` and seeds community leaderboard + demo athlete records so you can run immediately.)*

### 2. Start Backend & Frontend
Open two terminals in the project root:

**Terminal 1 — Backend API (`http://localhost:5000`):**
```bash
npm run dev:server
```

**Terminal 2 — Frontend App (`http://localhost:5173`):**
```bash
npm run dev:client
```

### 3. Demo Account or Sign Up
- Click **"Instant Demo Sign-In"** on the login screen (`alex@fitnex.app` / `Password123!`), or register your own account.

### 4. Run Tests & Production Build
```bash
npm run test:server
npm run build:client
```
