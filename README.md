# 🎫 Event Ticket Booking System

A cloud-native, scalable microservice-based platform for creating, managing, and booking event tickets. Designed to handle high-concurrency scenarios such as concerts, conferences, and more.

## 🧰 Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js (Express.js)
- **Database:** Firestore (Firebase)
- **Authentication:** Firebase Auth (or OAuth 2.0)
- **Containerization:** Docker, Docker Compose
- **Orchestration:** Kubernetes (K8s)
- **Deployment:** Google Cloud Platform (GCP)
- **CI/CD:** GitHub Actions
- **Testing:** Jest, Supertest
- **Linting & Formatting:** ESLint, Prettier

## 🧱 System Modules

### 👥 User

- Register / Login / Forgot Password
- Browse, filter, and search events
- Book and pay for tickets
- View booked and attended events
- Receive notifications

### 🧑‍💼 Event Organizer

- Create and manage events
- Configure ticket types, quantities, and prices
- Monitor ticket sales and attendee statistics
- Send updates to ticket buyers

### 🛡️ Admin

- Approve or reject submitted events
- Manage system users and services
- Analyze system-wide performance and revenue

## 📁 Project Structure

```bash
event-ticket-booking-system/
├── auth/
├── event/
├── ticket/
├── payment/
├── notification/
├── admin/
├── analysis/
├── frontend/ # React client
├── k8s/ # Kubernetes manifests
├── docker-compose.yml # Local dev orchestration
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js v18+
- Firebase Project + Firestore
- Google Cloud Project (for deployment)

### 1. Clone the repo

```bash
git clone https://github.com/truongchanbuu/event-ticket-booking-system.git
cd event-ticket-booking-system
```

### 2. Setup environment variables

Create `.env` files for each service (see `**/.env.example`)

### 3. Run locally with Docker Compose

```bash
docker-compose up --build
```

Access services via:

- **Frontend:** <http://localhost:4000>
- **Backend:** <http://localhost:3000>, 3001, etc.

### 4. Run in Kubernetes (Unimplemented)

```bash
kubectl apply -f k8s/
```

## 🧪 Testing

Each service includes its own test suite using Jest.

```bash
# Example (inside a service)
cd auth
npm install
npm test
```

## 📦 Common Scripts (package.json)

```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "node --watch src/app.js",
    "test": "jest --detectOpenHandles",
    "test:watch": "jest --watch",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "docker:build": "docker build -t auth .",
    "docker:run": "docker run -p 3000:3000 auth"
  }
}

# Frontend scripts
"scripts": {
  "dev": "next dev -p 4000 --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
},
```

## 💻 Development Workflow

- **Feature branches:** `feature/<name>`
- **Base branch:** `develop`
- **Staging:** `staging`
- **Production:** `main`

**CI/CD via GitHub Actions:**

- Auto build & test on PRs
- Deploy on `main` and `staging` branches

## 🔐 Security

- Firebase Auth
- Secure secrets via `.env` or GCP Secret Manager
- HTTPS enforced

## 📊 Scalability & Performance

- Horizontal scaling via Kubernetes
- Load balancing & health checks
- Optimized Firestore usage
- Target response time: < 200ms

## 📮 Contact

Maintained by: BuuTruong & Mai Le Phu Tien  
For support or contribution, open an issue or pull request.
