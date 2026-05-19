# Peer Tutoring Marketplace (PTM) 🎓

A full-stack, production-grade marketplace where college students can offer, find, and book tutoring sessions. The platform integrates a credit-based wallet system, real-time video sessions, an AI-powered tutor matching recommendation engine, and robust role-based access control.

---

## 🚀 Key Features

*   **AI-Powered Tutor Matching**: Hybrid recommendation matcher (Cosine Similarity + Collaborative Filtering) built using FastAPI and Python scikit-learn, matching tutors to students based on learning styles, ratings, and course history.
*   **Escrow & Wallet System**: Secure credit-based transactions with MongoDB sessions for complete atomicity and failure safety. Includes automatic welcome credits and billing histories.
*   **Real-time Collaboration**: Built-in video call rooms powered by Jitsi Meet, real-time notifications, and persistent WebSockets-based messaging.
*   **Asymmetric Auth**: High-security, role-based access control (Student, Tutor, Admin) using RS256 asymmetric private/public key JWT tokens.
*   **Modern Premium Frontend**: Fast and beautiful user interface built with React 18, Vite, Tailwind CSS, Zustand, and React Query.

---

## 🏗️ Monorepo Directory Architecture

The repository is structured as a modular monorepo to manage frontend, backend, and auxiliary services cleanly under the root directory:

```bash
PeerTutor/
├── backend/            # Express.js API Gateway & core services (auth, wallet, bookings)
├── frontend/           # React 18 + Vite SPA Client Dashboard
├── ai-engine/          # FastAPI Python microservice (recommendation engine & learning styles)
├── infra/              # Core infrastructure (Nginx configurations, MongoDB scripts)
├── .github/            # CI/CD Workflows (GitHub Actions for linting, testing, and deploys)
├── docker-compose.yml  # Local Docker Dev orchestration configuration
└── package.json        # Main entry orchestrating workspace operations
```

---

## 🛠️ Tech Stack & Services

| Service | Technology / Framework | Port | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS | `5173` | Dashboard, Tutors list, Wallet & Session booking |
| **Backend API** | Node.js 20, Express, Mongoose | `3000` | Core authentication, wallets, bookings, and socket events |
| **AI Engine** | Python 3.11, FastAPI, Scikit-learn | `8000` | Content matching recommendation engine |
| **Queue Worker**| Node.js 20, BullMQ, Redis | — | Asynchronous background worker for reminders & email |
| **Database** | MongoDB 7.0 (Replica Set) | `27017` | Escrow transactions & persistent platform storage |
| **Caching/Queue**| Redis 7.0 (Alpine) | `6379` | Background jobs and session management |

---

## 🚦 Getting Started (Local Development)

### Prerequisites

Make sure you have the following installed on your machine:
*   [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/)
*   [Node.js (v20+)](https://nodejs.org/)

---

### Step-by-Step Launch Instructions

#### 1. Setup Environment Variables
Clone the `.env.example` file to `.env` in the root directory:
```bash
cp .env.example .env
```
Ensure your `MONGODB_URI` and API keys are set correctly. The `.env` file automatically distributes variables to all Docker containers.

#### 2. Start all platform services
Launch the orchestrator to build and run all services in the background:
```bash
npm run docker:dev
```
This automatically spins up MongoDB (replica set), Redis, Node API, React Frontend, Queue Worker, and the AI Engine in an isolated virtual network.

#### 3. Seed the Database
Populate your database with a complete set of sample data (1 Admin, 15 Subjects, 10 Tutors, 5 Students, and 20 Sessions) by running:
```bash
npm run seed
```
*(This seed script automatically drops the database and cleanly builds new collections to prevent schema mismatch/duplicate index errors).*

---

### 🔑 Default Credentials (for testing)

You can log in to `http://localhost:5173` using any of these seeded testing accounts:

*   **Administrator**:
    *   **Email**: `admin@vardhaman.org`
    *   **Password**: `Admin@123`
*   **Student (Search & book sessions)**:
    *   **Email**: `aditya1@vardhaman.org`
    *   **Password**: `Student@123`
*   **Tutor (Accept & manage tutoring sessions)**:
    *   **Email**: `arjun1@vardhaman.org`
    *   **Password**: `Tutor@123`

---

## 🔄 CI/CD Git Pipeline Setup

This repository has a built-in continuous integration and deployment pipeline powered by **GitHub Actions** located under `.github/workflows/`:

1.  **Continuous Integration (`ci.yml`)**:
    *   Fires automatically on every **Pull Request** or **Push** to `develop` or `main`.
    *   Sets up Node.js 20 and runs security audits, ESLint code formatting checks, and backend unit/integration tests using isolated MongoDB and Redis test databases.
    *   Configures Python 3.11 to install `ai-engine` dependencies and run matching model verifications.
    *   Verifies that the backend Docker images build cleanly without breaking.
2.  **Continuous Deployment (`cd-staging.yml` / `cd-production.yml`)**:
    *   Fires on successful merges to `develop` (Staging) or on release tags `v*.*.*` (Production).
    *   Builds production-ready Docker containers and deploys them to target VPS hosting setups via secure SSH scripts.

### To Enable in GitHub:
1.  Push this workspace to your GitHub Repository.
2.  Go to **Settings** > **Secrets and Variables** > **Actions** on your GitHub Repo.
3.  Add the following secrets to enable CI/CD testing:
    *   `JWT_PRIVATE_KEY` (Your RS256 Private Key)
    *   `JWT_PUBLIC_KEY` (Your RS256 Public Key)
4.  Add these additional secrets if you plan on enabling SSH-based deployment triggers:
    *   `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`
    *   `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
