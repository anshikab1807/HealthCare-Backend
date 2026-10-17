# Healthcare Backend

A Node.js REST API for managing patients, doctors, and their relationships. The project demonstrates:
- Secure user registration and login with JWT access & refresh tokens.
- Password hashing with bcrypt.
- Ownership‑based CRUD for patients.
- Global CRUD for doctors.
- Patient‑Doctor mapping endpoints that enforce patient ownership.
- Input validation using express‑validator.
- Automated testing with Jest and Supertest.

## Features
- **User registration & login** – email/password with validation and duplicate‑email check. The optional `name` field is accepted but not persisted.
- **JWT authentication** – short‑lived access token (15 min) and long‑lived refresh token (7 days).
- **Secure password storage** – bcrypt hashing (salt rounds = 12).
- **Patient CRUD** – create, list, retrieve, update, delete; each patient is owned by a user (`userId`).
- **Doctor CRUD** – create, list, retrieve, update, delete; doctors are global resources for any authenticated user.
- **Patient‑Doctor mappings** – create, list, retrieve, delete mappings; only the owning patient’s user can manage its mappings.
- **Input validation & error handling** – consistent 400 responses for validation errors and appropriate 401/404/409 status codes.
- **Test suite** – 19 passing Jest/Supertest tests (auth, patient, doctor). No dedicated mapping tests are present.

## Technology Stack
- **Node.js (v24)** & **Express.js**
- **PostgreSQL** (any recent version supported by your environment)
- **Prisma ORM** – schema‑first data model & client generation
- **JWT (jsonwebtoken)** – stateless authentication
- **bcrypt** – password hashing
- **express‑validator** – request validation
- **Jest & Supertest** – unit & integration testing
- **dotenv** – environment variable management

## Project Folder Structure
```text
healthcare-backend/
├─ prisma/
│  ├─ schema.prisma             # Prisma data model
│  └─ migrations/               # SQL migration files (already applied)
├─ src/
│  ├─ app.js                    # Express app, routes & middleware registration
│  ├─ index.js                  # Server entry point (listen)
│  ├─ prisma.js                 # Prisma client singleton
│  ├─ middleware/
│  │  └─ auth.js                # verifyAccessToken JWT middleware
│  ├─ routes/
│  │  ├─ auth.js                # /api/auth endpoints
│  │  ├─ patients.js            # /api/patients CRUD
│  │  ├─ doctors.js             # /api/doctors CRUD
│  │  └─ patientDoctorMappings.js # /api/patients/:patientId/mappings
│  └─ tests/
│     ├─ auth.test.js
│     ├─ patients.test.js
│     └─ doctors.test.js
├─ .env.example                 # Template for environment variables
├─ .gitignore                   # .env is ignored
├─ package.json
└─ README.md                    # Project documentation
```

## Prerequisites
- Windows 10/11 (or any OS with Node.js and PostgreSQL support)
- Node.js (v24.x or compatible v20+) and npm – install from [https://nodejs.org/](https://nodejs.org/).
- PostgreSQL – install a version of your choice (the code works with any recent PostgreSQL release).
- Git (optional, for version control).

## Installation & Setup (PowerShell)

```powershell
# 1️⃣ Clone the repository (if you haven’t already)
git clone <repo-url>
cd healthcare-backend

# 2️⃣ Install project dependencies
npm install

# 3️⃣ Create the PostgreSQL database (run as a user with creation rights)
psql -U postgres -c "CREATE DATABASE healthcare_db;"
# Replace `postgres` with your superuser name if different.

# 4️⃣ Create a .env file from the example
copy .env.example .env
# Edit .env and replace the placeholders (see next section).
```

## Environment Variables (.env)

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://postgres:YOUR_PASSWORD@localhost:5432/healthcare_db` |
| `JWT_ACCESS_SECRET` | Random 32‑character (or longer) secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Random secret for signing refresh tokens |
| `PORT` | Port on which the Express server listens (default 3000) |

> Never commit `.env` or any real secrets to the repository. The file is listed in `.gitignore`.

## Database Migration & Prisma Client

```powershell
# Generate the Prisma client (reads the existing schema)
npx prisma generate

# Apply the existing migration(s) to your database
npx prisma migrate dev --name init
```
*Do not run `prisma init` – the project already contains a fully defined `schema.prisma` and migration files.*

## Running the Development Server

```powershell
npm run dev
```

The server starts on `http://localhost:{PORT}` (default 3000) and provides a simple health‑check endpoint:
- `GET /health` → `{ "status": "ok" }`

The `dev` script uses `nodemon` for hot‑reloading; you can also run `npm start` for a plain Node process.

## API Reference

All routes under `/api` require a valid JWT access token sent in the `Authorization` header as `Bearer <accessToken>` except the authentication routes themselves.

### Authentication

| Method | Path | Auth | Description | Request Body |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/auth/register` | ❌ | Register a new user. Duplicate e‑mail returns 409. The optional name field is accepted but not persisted. | `{ "name": "John Doe", "email": "john@example.com", "password": "Secret123" }` |
| `POST` | `/api/auth/login` | ❌ | Authenticate and receive tokens. | `{ "email": "john@example.com", "password": "Secret123" }` |
| `POST` | `/api/auth/refresh` | ❌ | Exchange a valid refresh token for a new access token. | `{ "refreshToken": "<refresh_token>" }` |

### Patients (owned by the authenticated user)

| Method | Path | Auth | Description | Request Body |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/patients` | ✅ | Create a patient record. | `{ "firstName": "Alice", "lastName": "Smith", "birthDate": "1990-01-01" }` |
| `GET` | `/api/patients` | ✅ | List all patients belonging to the user. | – |
| `GET` | `/api/patients/:id` | ✅ | Retrieve a patient owned by the user. | – |
| `PUT` | `/api/patients/:id` | ✅ | Replace patient data (all fields required). | `{ "firstName": "Alice", "lastName": "Smith", "birthDate": "1990-01-01" }` |
| `PATCH` | `/api/patients/:id` | ✅ | Partially update patient fields. | `{ "lastName": "Johnson" }` |
| `DELETE` | `/api/patients/:id` | ✅ | Delete a patient owned by the user. | – |

### Doctors (global resources)

| Method | Path | Auth | Description | Request Body |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/doctors` | ✅ | Create a doctor. | `{ "firstName": "Dr. Jane", "lastName": "Doe", "specialty": "Cardiology" }` |
| `GET` | `/api/doctors` | ✅ | List all doctors. | – |
| `GET` | `/api/doctors/:id` | ✅ | Retrieve a specific doctor. | – |
| `PUT` | `/api/doctors/:id` | ✅ | Replace doctor data. | `{ "firstName": "Dr. Jane", "lastName": "Doe", "specialty": "Neurology" }` |
| `PATCH` | `/api/doctors/:id` | ✅ | Partially update doctor fields. | `{ "specialty": "Oncology" }` |
| `DELETE` | `/api/doctors/:id` | ✅ | Delete a doctor. | – |

### Patient‑Doctor Mappings (ownership enforced)

| Method | Path | Auth | Description | Request Body |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/patients/:patientId/mappings` | ✅ | Map a patient to a doctor (creates a unique relation). | `{ "doctorId": 3 }` |
| `GET` | `/api/patients/:patientId/mappings` | ✅ | List all doctor mappings for the patient. | – |
| `GET` | `/api/patients/:patientId/mappings/:mappingId` | ✅ | Retrieve a specific mapping (only if owned). | – |
| `DELETE` | `/api/patients/:patientId/mappings/:mappingId` | ✅ | Remove a mapping. | – |

### Using JWT Access Tokens
Include the token in every protected request header:
```http
Authorization: Bearer <accessToken>
```
The server will respond with 401 if the token is missing, malformed, or expired.

## Testing

```powershell
npm test
```
The test suite runs 3 test suites (`auth.test.js`, `patients.test.js`, `doctors.test.js`) containing a total of 19 tests and should pass with a clean database.

### Manual API testing – you can use Postman or any HTTP client:
1. Register a user (`/api/auth/register`).
2. Log in (`/api/auth/login`) to obtain `accessToken` and `refreshToken`.
3. Add the `Authorization: Bearer <accessToken>` header to subsequent requests.
4. Exercise patient, doctor, and mapping endpoints.

## Common Setup Errors & Troubleshooting

| Symptom | Likely Cause | Fix |
| :--- | :--- | :--- |
| `password authentication failed when running the app` | Incorrect DATABASE_URL credentials | Verify the password, host, port, and database name in `.env`. |
| `PrismaClientInitializationError` | Migration not applied | Run `npx prisma migrate dev --name init` again. |
| `Duplicate email on registration during tests` | Test user not cleaned up between runs | The test suite deletes the user in `beforeAll`/`afterAll`; ensure the database is empty before first run. |
| `401 Access token missing on protected routes` | Missing or malformed Authorization header | Use the exact `Bearer <token>` format. |
| `401 Invalid or expired refresh token` | Refresh token expired or tampered | Obtain a fresh token via `/api/auth/login`. |
| `npm install warnings about vulnerabilities` | Transitive dependency issues | Run `npm audit fix` (optional) – not required for assignment. |

## Security Notes & GitHub Submission Checklist
- [x] Never commit `.env` or any secret values. The file is listed in `.gitignore`.
- [x] Store JWT secrets securely; use at least 32‑character random strings.
- [x] Passwords are hashed with bcrypt (12 salt rounds).
- [x] All mutable routes are protected by JWT middleware; patient routes verify ownership via `userId`.
- [x] Mappings enforce patient ownership before creation, listing, or deletion.
- [x] Run the full test suite (`npm test`) before submitting.
- [x] Ensure the Prisma migration has been applied (`npx prisma migrate dev`).
- [x] Include a clear `README.md` and a proper open‑source license.

## License
MIT © 2026
