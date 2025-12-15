# Backend API Server

Express.js backend API for the Selector & Applicant Simulation System.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Start development server:**
```bash
npm run dev
```

The server will run on `http://localhost:5000`

## API Endpoints

Base URL: `http://localhost:5000/api`

### Authentication
- `POST /api/auth/signup/applicant` - Register new applicant
- `POST /api/auth/login/:role` - Login (admin, author, selector, applicant)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Simulations
- `GET /api/simulations/mine` - Get author's simulations
- `GET /api/simulations/published` - Get published simulations
- `POST /api/simulations` - Create simulation
- `GET /api/simulations/:id` - Get simulation details
- `PATCH /api/simulations/:id` - Update simulation
- `GET /api/simulations/:id/steps` - Get steps
- `POST /api/simulations/:id/steps` - Add step
- `DELETE /api/simulations/:id/steps/:stepId` - Delete step

### Attempts
- `GET /api/attempts/simulation/:simulationId/current` - Get current attempt
- `POST /api/attempts/simulation/:simulationId/start` - Start attempt
- `POST /api/attempts/:attemptId/response` - Save response
- `POST /api/attempts/:attemptId/submit` - Submit attempt

### Scoring
- `GET /api/scoring/pending` - Get pending attempts
- `GET /api/scoring/attempt/:attemptId` - Get attempt details
- `POST /api/scoring/attempt/:attemptId` - Score attempt
- `GET /api/scoring/my-scores` - Get scored attempts

## Environment Variables

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint


